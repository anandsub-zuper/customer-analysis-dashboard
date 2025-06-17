const conversationalAI = require('../services/conversationalAIService');
const analysisService = require('../services/analysisService');
const { v4: uuidv4 } = require('uuid');

/**
 * Process conversational query with enhanced error handling
 */
exports.processQuery = async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { query, analysisId, conversationId } = req.body;
    
    // Enhanced logging for production debugging
    console.log('🔍 Conversation Query Debug:', {
      query: query?.substring(0, 100) + (query?.length > 100 ? '...' : ''),
      queryLength: query?.length,
      analysisId,
      conversationId,
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] || 'unknown'
    });
    
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Query is required and must be a non-empty string'
      });
    }

    // Generate conversation ID if not provided
    const currentConversationId = conversationId || uuidv4();
    
    console.log(`🚀 Processing conversational query: "${query.substring(0, 100)}${query.length > 100 ? '...' : ''}"`);
    
    // Add timeout handling for the entire process
    const queryTimeout = 30000; // 30 seconds total timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Query processing timed out')), queryTimeout);
    });
    
    const queryPromise = conversationalAI.processQuery(query, {
      analysisId,
      conversationId: currentConversationId,
      userId: req.user?.id
    });
    
    // Race between the query and timeout
    const result = await Promise.race([queryPromise, timeoutPromise]);
    
    const duration = Date.now() - startTime;
    console.log(`✅ Query processed successfully in ${duration}ms`);
    
    res.json({
      success: result.success,
      response: result.response,
      intent: result.intent,
      context: result.context,
      conversationId: currentConversationId,
      timestamp: new Date().toISOString(),
      processingTime: duration
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Enhanced error logging with more context
    console.error('❌ Conversation Error Details:', {
      error: error.message,
      stack: error.stack?.split('\n').slice(0, 3).join('\n'), // First 3 lines of stack
      query: req.body.query?.substring(0, 100),
      analysisId: req.body.analysisId,
      duration: duration,
      timestamp: new Date().toISOString(),
      requestHeaders: {
        userAgent: req.headers['user-agent'],
        contentType: req.headers['content-type'],
        origin: req.headers.origin
      }
    });
    
    // Determine error type and provide appropriate response
    let errorMessage = 'Error processing conversational query';
    let errorCode = 'PROCESSING_ERROR';
    
    if (error.message.includes('timeout') || error.message.includes('timed out')) {
      errorMessage = 'The request timed out. Please try a shorter message or try again.';
      errorCode = 'TIMEOUT_ERROR';
    } else if (error.message.includes('OpenAI')) {
      errorMessage = 'AI service is temporarily unavailable. Please try again in a moment.';
      errorCode = 'AI_SERVICE_ERROR';
    } else if (error.message.includes('rate limit')) {
      errorMessage = 'Service is busy. Please wait a moment and try again.';
      errorCode = 'RATE_LIMIT_ERROR';
    } else if (error.message.includes('API key')) {
      errorMessage = 'AI service configuration error. Please contact support.';
      errorCode = 'CONFIGURATION_ERROR';
    }
    
    res.status(500).json({
      success: false,
      message: errorMessage,
      errorCode: errorCode,
      processingTime: duration,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get contextual suggestions for an analysis
 */
exports.getSuggestions = async (req, res) => {
  try {
    const { analysisId } = req.params;
    
    console.log('📋 Getting suggestions for analysis:', analysisId);
    
    if (!analysisId) {
      return res.status(400).json({
        success: false,
        message: 'Analysis ID is required'
      });
    }
    
    // Get analysis data with timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Analysis retrieval timed out')), 10000);
    });
    
    const analysisPromise = analysisService.getAnalysisById(analysisId);
    const analysis = await Promise.race([analysisPromise, timeoutPromise]);
    
    // Generate contextual suggestions
    const suggestions = generateContextualSuggestions(analysis);
    
    console.log(`✅ Generated ${suggestions.length} suggestions for analysis ${analysisId}`);
    
    res.json({
      success: true,
      suggestions,
      analysisId
    });
    
  } catch (error) {
    console.error('❌ Error getting suggestions:', {
      error: error.message,
      analysisId: req.params.analysisId
    });
    
    res.status(500).json({
      success: false,
      message: 'Error generating suggestions',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Generate email based on analysis with enhanced error handling
 */
exports.generateEmail = async (req, res) => {
  try {
    const { analysisId, emailType = 'follow-up', customInstructions = '' } = req.body;
    
    console.log('📧 Generating email:', {
      analysisId,
      emailType,
      hasCustomInstructions: !!customInstructions
    });
    
    if (!analysisId) {
      return res.status(400).json({
        success: false,
        message: 'Analysis ID is required'
      });
    }
    
    const query = `Generate a ${emailType} email for this prospect. ${customInstructions}`.trim();
    
    // Add timeout for email generation
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Email generation timed out')), 25000);
    });
    
    const emailPromise = conversationalAI.processQuery(query, {
      analysisId,
      conversationId: uuidv4()
    });
    
    const result = await Promise.race([emailPromise, timeoutPromise]);
    
    if (result.success) {
      const emailContent = parseEmailFromResponse(result.response);
      
      console.log('✅ Email generated successfully');
      
      res.json({
        success: true,
        email: emailContent,
        rawResponse: result.response
      });
    } else {
      throw new Error(result.error || 'Failed to generate email');
    }
    
  } catch (error) {
    console.error('❌ Email generation error:', {
      error: error.message,
      analysisId: req.body.analysisId,
      emailType: req.body.emailType
    });
    
    let errorMessage = 'Error generating email';
    if (error.message.includes('timeout')) {
      errorMessage = 'Email generation timed out. Please try again.';
    }
    
    res.status(500).json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Generate meeting agenda
 */
exports.generateAgenda = async (req, res) => {
  try {
    const { analysisId, meetingType = 'discovery', duration = 30 } = req.body;
    
    if (!analysisId) {
      return res.status(400).json({
        success: false,
        message: 'Analysis ID is required'
      });
    }
    
    console.log(`📅 Generating ${meetingType} agenda for analysis ${analysisId}`);
    
    const query = `Create a ${duration}-minute ${meetingType} meeting agenda based on this customer analysis. Include time allocations and key discussion points.`;
    
    // Add timeout for agenda generation
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Agenda generation timed out')), 25000);
    });
    
    const agendaPromise = conversationalAI.processQuery(query, {
      analysisId,
      conversationId: uuidv4()
    });
    
    const result = await Promise.race([agendaPromise, timeoutPromise]);
    
    if (result.success) {
      const agenda = parseAgendaFromResponse(result.response);
      
      console.log('✅ Agenda generated successfully');
      
      res.json({
        success: true,
        agenda,
        rawResponse: result.response
      });
    } else {
      throw new Error(result.error || 'Failed to generate agenda');
    }
    
  } catch (error) {
    console.error('❌ Agenda generation error:', {
      error: error.message,
      analysisId: req.body.analysisId,
      meetingType: req.body.meetingType
    });
    
    let errorMessage = 'Error generating agenda';
    if (error.message.includes('timeout')) {
      errorMessage = 'Agenda generation timed out. Please try again.';
    }
    
    res.status(500).json({
      success: false,
      message: errorMessage, 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Generate contextual suggestions based on analysis
 */
function generateContextualSuggestions(analysis) {
  const suggestions = [];
  
  // Fit score based suggestions
  if (analysis.fitScore < 40) {
    suggestions.push({
      type: 'warning',
      icon: 'AlertTriangle',
      text: 'Why is the fit score low?',
      query: 'Explain why this customer received a low fit score and what the main risk factors are.'
    });
    
    suggestions.push({
      type: 'action',
      icon: 'MessageCircle', 
      text: 'How to address concerns?',
      query: 'What are specific strategies to address the fit concerns and improve our chances?'
    });
  } else if (analysis.fitScore > 70) {
    suggestions.push({
      type: 'success',
      icon: 'TrendingUp',
      text: 'How to accelerate this deal?',
      query: 'What are the best strategies to accelerate this high-fit prospect through the sales process?'
    });
    
    suggestions.push({
      type: 'action',
      icon: 'Users',
      text: 'Find decision makers',
      query: 'Based on this analysis, who are likely key decision makers and what would motivate them?'
    });
  } else {
    suggestions.push({
      type: 'info',
      icon: 'CheckCircle',
      text: 'Qualification strategy',
      query: 'What additional qualification questions should I ask to improve our understanding?'
    });
  }
  
  // Challenge-based suggestions
  if (analysis.challenges && analysis.challenges.length > 0) {
    suggestions.push({
      type: 'warning',
      icon: 'AlertCircle',
      text: 'Address implementation risks',
      query: 'How can we mitigate the identified implementation challenges and set proper expectations?'
    });
  }
  
  // Similar customers suggestions
  if (analysis.similarCustomers && analysis.similarCustomers.length > 0) {
    suggestions.push({
      type: 'info',
      icon: 'Users',
      text: 'Learn from similar customers',
      query: 'What key lessons and success factors can we share from similar customer implementations?'
    });
  }
  
  // Integration complexity
  const integrationCount = analysis.requirements?.integrations?.length || 0;
  if (integrationCount > 3) {
    suggestions.push({
      type: 'warning',
      icon: 'Settings',
      text: 'Plan complex integrations',
      query: 'How should we approach the integration complexity and what timeline should we propose?'
    });
  }
  
  // Communication suggestions
  suggestions.push({
    type: 'action',
    icon: 'Mail',
    text: 'Generate follow-up email',
    query: 'Create a personalized follow-up email that addresses their specific needs and concerns.'
  });
  
  suggestions.push({
    type: 'action',
    icon: 'Calendar',
    text: 'Create meeting agenda',
    query: 'Generate a meeting agenda for the next call that covers their priorities and our solutions.'
  });
  
  return suggestions;
}

/**
 * Parse email content from AI response
 */
function parseEmailFromResponse(response) {
  const lines = response.split('\n');
  let subject = '';
  let body = '';
  let isBody = false;
  
  for (const line of lines) {
    if (line.toLowerCase().includes('subject:')) {
      subject = line.replace(/.*subject:\s*/i, '').trim();
    } else if (isBody || (!subject && !line.toLowerCase().includes('subject:'))) {
      if (!isBody && line.trim()) {
        isBody = true;
      }
      if (isBody) {
        body += line + '\n';
      }
    }
  }
  
  return {
    subject: subject || 'Follow-up regarding your field service management needs',
    body: body.trim() || response
  };
}

/**
 * Parse agenda content from AI response
 */
function parseAgendaFromResponse(response) {
  const lines = response.split('\n');
  const agenda = {
    title: 'Meeting Agenda',
    items: []
  };
  
  let currentItem = null;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    if (!trimmedLine) continue;
    
    // Look for time allocations (e.g., "5 min", "10 minutes", etc.)
    const timeMatch = trimmedLine.match(/(\d+)\s*(min|minute|minutes)/i);
    
    if (timeMatch || trimmedLine.match(/^\d+\./)) {
      // New agenda item
      if (currentItem) {
        agenda.items.push(currentItem);
      }
      
      currentItem = {
        duration: timeMatch ? parseInt(timeMatch[1]) : 5,
        title: trimmedLine.replace(/^\d+\.\s*/, '').replace(/\(\d+\s*(min|minute|minutes)\)/i, '').trim(),
        description: ''
      };
    } else if (currentItem && trimmedLine.startsWith('-')) {
      // Sub-item or description
      currentItem.description += (currentItem.description ? '\n' : '') + trimmedLine;
    } else if (trimmedLine.toLowerCase().includes('agenda')) {
      agenda.title = trimmedLine;
    }
  }
  
  // Add the last item
  if (currentItem) {
    agenda.items.push(currentItem);
  }
  
  // If no structured agenda found, create a simple one
  if (agenda.items.length === 0) {
    agenda.items = [
      {
        duration: 30,
        title: 'Discussion',
        description: response
      }
    ];
  }
  
  return agenda;
}

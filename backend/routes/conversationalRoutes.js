// backend/routes/conversationalRoutes.js
const express = require('express');
const router = express.Router();
const conversationalController = require('../controllers/conversationalController');

// @route   POST api/conversation/query
// @desc    Process conversational query
// @access  Public
router.post('/query', conversationalController.processQuery);

// @route   GET api/conversation/suggestions/:analysisId
// @desc    Get contextual suggestions for an analysis
// @access  Public  
router.get('/suggestions/:analysisId', conversationalController.getSuggestions);

// @route   POST api/conversation/email
// @desc    Generate email based on analysis
// @access  Public
router.post('/email', conversationalController.generateEmail);

// @route   POST api/conversation/agenda
// @desc    Generate meeting agenda
// @access  Public
router.post('/agenda', conversationalController.generateAgenda);

module.exports = router;

// backend/controllers/conversationalController.js
const conversationalAI = require('../services/conversationalAIService');
const analysisService = require('../services/analysisService');
const { v4: uuidv4 } = require('uuid');

/**
 * Process conversational query
 */
exports.processQuery = async (req, res) => {
  try {
    const { query, analysisId, conversationId } = req.body;
    
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Query is required and must be a non-empty string'
      });
    }

    // Generate conversation ID if not provided
    const currentConversationId = conversationId || uuidv4();
    
    console.log(`Processing conversational query: "${query.substring(0, 100)}${query.length > 100 ? '...' : ''}"`);
    
    const result = await conversationalAI.processQuery(query, {
      analysisId,
      conversationId: currentConversationId,
      userId: req.user?.id // If you have user authentication
    });
    
    res.json({
      success: result.success,
      response: result.response,
      intent: result.intent,
      context: result.context,
      conversationId: currentConversationId,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error in processQuery:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing conversational query',
      error: error.message
    });
  }
};

/**
 * Get contextual suggestions for an analysis
 */
exports.getSuggestions = async (req, res) => {
  try {
    const { analysisId } = req.params;
    
    if (!analysisId) {
      return res.status(400).json({
        success: false,
        message: 'Analysis ID is required'
      });
    }
    
    // Get analysis data
    const analysis = await analysisService.getAnalysisById(analysisId);
    
    // Generate contextual suggestions
    const suggestions = generateContextualSuggestions(analysis);
    
    res.json({
      success: true,
      suggestions,
      analysisId
    });
    
  } catch (error) {
    console.error('Error getting suggestions:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating suggestions',
      error: error.message
    });
  }
};

/**
 * Generate email based on analysis
 */
exports.generateEmail = async (req, res) => {
  try {
    const { analysisId, emailType = 'follow-up', customInstructions = '' } = req.body;
    
    if (!analysisId) {
      return res.status(400).json({
        success: false,
        message: 'Analysis ID is required'
      });
    }
    
    console.log(`Generating ${emailType} email for analysis ${analysisId}`);
    
    const query = `Generate a ${emailType} email for this prospect. ${customInstructions}`.trim();
    
    const result = await conversationalAI.processQuery(query, {
      analysisId,
      conversationId: uuidv4()
    });
    
    if (result.success) {
      // Parse email from response (subject and body)
      const emailContent = parseEmailFromResponse(result.response);
      
      res.json({
        success: true,
        email: emailContent,
        rawResponse: result.response
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to generate email',
        error: result.error
      });
    }
    
  } catch (error) {
    console.error('Error generating email:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating email',
      error: error.message
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
    
    console.log(`Generating ${meetingType} agenda for analysis ${analysisId}`);
    
    const query = `Create a ${duration}-minute ${meetingType} meeting agenda based on this customer analysis. Include time allocations and key discussion points.`;
    
    const result = await conversationalAI.processQuery(query, {
      analysisId,
      conversationId: uuidv4()
    });
    
    if (result.success) {
      const agenda = parseAgendaFromResponse(result.response);
      
      res.json({
        success: true,
        agenda,
        rawResponse: result.response
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to generate agenda',
        error: result.error
      });
    }
    
  } catch (error) {
    console.error('Error generating agenda:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating agenda', 
      error: error.message
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
    } else if (line.toLowerCase().includes('hi ') || line.toLowerCase().includes('dear ') || isBody) {
      isBody = true;
      body += line + '\n';
    }
  }
  
  // Fallback parsing if structured format not found
  if (!subject) {
    const subjectMatch = response.match(/\*\*Subject\*\*:?\s*(.+)/i);
    if (subjectMatch) {
      subject = subjectMatch[1].trim();
    }
  }
  
  if (!body) {
    // Use the whole response as body if we can't parse it
    body = response.replace(/\*\*Subject\*\*:?\s*.+/i, '').trim();
  }
  
  return {
    subject: subject || `Follow-up: Field Service Solution Discussion`,
    body: body.trim() || response,
    timestamp: new Date().toISOString()
  };
}

/**
 * Parse agenda from AI response
 */
function parseAgendaFromResponse(response) {
  const lines = response.split('\n').filter(line => line.trim());
  const agenda = {
    title: 'Meeting Agenda',
    duration: '30 minutes',
    items: []
  };
  
  let currentItem = null;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Look for time allocations (e.g., "10 minutes" or "(5 min)")
    const timeMatch = trimmed.match(/(\d+)\s*(?:min|minutes?)/i);
    
    // Look for numbered items or bullet points
    if (trimmed.match(/^\d+[\.\)]\s*/) || trimmed.match(/^[\-\*]\s*/)) {
      if (currentItem) {
        agenda.items.push(currentItem);
      }
      
      currentItem = {
        title: trimmed.replace(/^[\d\.\)\-\*\s]+/, ''),
        duration: timeMatch ? `${timeMatch[1]} minutes` : '5 minutes',
        details: []
      };
    } else if (currentItem && trimmed && !trimmed.includes('Agenda') && !trimmed.includes('Meeting')) {
      // Add as detail to current item
      currentItem.details.push(trimmed);
    }
  }
  
  // Add the last item
  if (currentItem) {
    agenda.items.push(currentItem);
  }
  
  // If no structured items found, create a simple agenda
  if (agenda.items.length === 0) {
    agenda.items = [
      {
        title: 'Introduction and Agenda Review',
        duration: '5 minutes',
        details: ['Welcome and introductions', 'Review meeting objectives']
      },
      {
        title: 'Discovery and Requirements',
        duration: '15 minutes', 
        details: ['Discuss current challenges', 'Review specific requirements', 'Understand timeline and priorities']
      },
      {
        title: 'Solution Overview',
        duration: '8 minutes',
        details: ['Present relevant capabilities', 'Address specific use cases', 'Highlight key benefits']
      },
      {
        title: 'Next Steps',
        duration: '2 minutes',
        details: ['Agree on follow-up actions', 'Schedule next meeting', 'Share relevant resources']
      }
    ];
  }
  
  return agenda;
}

module.exports = exports;

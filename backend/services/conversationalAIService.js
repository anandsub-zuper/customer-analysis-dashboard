// backend/services/conversationalAIService.js - COMPLETE FILE WITH FIX
const axios = require('axios');
const analysisService = require('./analysisService');
const historicalDataService = require('./historicalDataService');
const { getDb } = require('./mongoDbService');

/**
 * Conversational AI Service for intelligent query processing
 */
class ConversationalAIService {
  constructor() {
    this.conversationContexts = new Map(); // In-memory storage for demo
  }

  /**
   * Process user query with context awareness
   */
  async processQuery(query, options = {}) {
    try {
      const { analysisId, conversationId, userId } = options;
      
      // Get conversation context
      const context = await this.getContext(conversationId, analysisId);
      
      // Classify user intent
      const intent = await this.classifyIntent(query, context);
      
      // Route to appropriate handler
      const response = await this.routeQuery(intent, query, context);
      
      // Update conversation context
      await this.updateContext(conversationId, {
        userQuery: query,
        botResponse: response,
        intent: intent.type,
        timestamp: new Date()
      });
      
      return {
        success: true,
        response: response,
        intent: intent.type,
        context: context.analysisId ? 'analysis-aware' : 'general'
      };
      
    } catch (error) {
      console.error('Error processing conversational query:', error);
      return {
        success: false,
        response: "I'm sorry, I encountered an error processing your request. Please try again.",
        error: error.message
      };
    }
  }

  /**
   * Get conversation context
   */
  async getContext(conversationId, analysisId) {
    const context = {
      conversationId,
      analysisId,
      analysisData: null,
      conversationHistory: []
    };

    // Get analysis data if analysisId provided
    if (analysisId) {
      try {
        console.log('Retrieving analysis for context:', analysisId);
        const analysis = await analysisService.getAnalysisById(analysisId);
        
        if (analysis) {
          context.analysisData = analysis;
          console.log('Retrieved analysis with fields:', Object.keys(analysis));
          console.log('Strengths count:', analysis.strengths?.length || 0);
          console.log('Challenges count:', analysis.challenges?.length || 0);
        }
      } catch (error) {
        console.error('Error loading analysis for context:', error);
      }
    }

    // Get conversation history if conversationId provided
    if (conversationId && this.conversationContexts.has(conversationId)) {
      context.conversationHistory = this.conversationContexts.get(conversationId);
    }

    return context;
  }

  /**
   * Update conversation context
   */
  async updateContext(conversationId, update) {
    if (!conversationId) return;

    if (!this.conversationContexts.has(conversationId)) {
      this.conversationContexts.set(conversationId, []);
    }

    const history = this.conversationContexts.get(conversationId);
    history.push(update);

    // Keep only last 10 exchanges
    if (history.length > 10) {
      history.shift();
    }
  }

  /**
   * Classify user intent using OpenAI
   */
   async classifyIntent(query, context) {
    const prompt = `
Classify this user query into one of these categories:

CATEGORIES:
- ANALYSIS_QUESTION: Questions about specific analysis results, scores, recommendations, fit scores, scoring breakdown, why certain scores, what factors contributed
- SIMILAR_CUSTOMERS: Questions about similar customers or historical comparisons  
- NEXT_STEPS: Questions about what to do next, sales strategies, follow-up actions
- EMAIL_GENERATION: Requests to generate emails, proposals, or communications
- DATA_LOOKUP: Questions requiring lookup of specific data or customers
- EXPLANATION: Requests to explain general concepts, processes, or methodology (NOT about this specific customer)
- GENERAL: General questions or conversation

CONTEXT:
${context.analysisId ? 
  `User is viewing analysis for: ${context.analysisData?.customerName} (${context.analysisData?.industry})` : 'No specific analysis context'}

USER QUERY: "${query}"

CRITICAL CLASSIFICATION RULES:
- If query asks "why" about a score/fit/result AND user is viewing a specific analysis → ANALYSIS_QUESTION
- If query asks about "this customer's" anything → ANALYSIS_QUESTION  
- If query asks about general concepts without referencing specific data → EXPLANATION
- If query asks "how does X work" in general → EXPLANATION
- If query asks "why is this score X" or "what factors" → ANALYSIS_QUESTION

Respond with JSON only:
{
  "type": "ANALYSIS_QUESTION", 
  "confidence": 0.9,
  "entities": ["fit", "score", "100%"],
  "requiresAnalysisData": true,
  "reasoning": "User asking why specific customer has 100% fit score"
}`;

    try {
      const response = await this.callOpenAI(prompt, { maxTokens: 250 });
      const intent = JSON.parse(response);
      
      // LOG THE INTENT CLASSIFICATION FOR DEBUGGING
      console.log('🎯 Intent Classification Result:', {
        query: query.substring(0, 50),
        classifiedAs: intent.type,
        confidence: intent.confidence,
        reasoning: intent.reasoning
      });
      
      return intent;
    } catch (error) {
      console.error('Error classifying intent:', error);
      
      // ENHANCED FALLBACK: If parsing fails, use rules-based classification
      const fallbackIntent = this.classifyIntentFallback(query, context);
      console.log('🔄 Using fallback classification:', fallbackIntent);
      return fallbackIntent;
    }
  }

  /**
   * Fallback intent classification using rules
   */
  classifyIntentFallback(query, context) {
    const queryLower = query.toLowerCase();
    
    // If user is viewing analysis and asking about scores/fit/results
    if (context.analysisId && (
      queryLower.includes('fit') || 
      queryLower.includes('score') || 
      queryLower.includes('why') ||
      queryLower.includes('100%') ||
      queryLower.includes('factors') ||
      queryLower.includes('breakdown')
    )) {
      return { 
        type: 'ANALYSIS_QUESTION', 
        confidence: 0.8, 
        entities: [], 
        requiresAnalysisData: true,
        source: 'fallback-rules'
      };
    }
    
    // Other fallback rules...
    if (queryLower.includes('similar customer')) {
      return { type: 'SIMILAR_CUSTOMERS', confidence: 0.8, entities: [], requiresAnalysisData: true };
    }
    
    if (queryLower.includes('next step') || queryLower.includes('strategy')) {
      return { type: 'NEXT_STEPS', confidence: 0.8, entities: [], requiresAnalysisData: true };
    }
    
    if (queryLower.includes('email') || queryLower.includes('generate')) {
      return { type: 'EMAIL_GENERATION', confidence: 0.8, entities: [], requiresAnalysisData: true };
    }
    
    // Default to ANALYSIS_QUESTION if user is viewing analysis
    if (context.analysisId) {
      return { 
        type: 'ANALYSIS_QUESTION', 
        confidence: 0.7, 
        entities: [], 
        requiresAnalysisData: true,
        source: 'fallback-default'
      };
    }
    
    return { type: 'GENERAL', confidence: 0.5, entities: [], requiresAnalysisData: false };
  }

  /**
   * Route query to appropriate handler
   */
  async routeQuery(intent, query, context) {
    switch (intent.type) {
      case 'ANALYSIS_QUESTION':
        return await this.handleAnalysisQuestion(query, context);
      
      case 'SIMILAR_CUSTOMERS':
        return await this.handleSimilarCustomersQuery(query, context);
      
      case 'NEXT_STEPS':
        return await this.handleNextStepsQuery(query, context);
      
      case 'EMAIL_GENERATION':
        return await this.handleEmailGeneration(query, context);
      
      case 'DATA_LOOKUP':
        return await this.handleDataLookup(query, context);
      
      case 'EXPLANATION':
        return await this.handleExplanation(query, context);
      
      default:
        return await this.handleGeneralQuery(query, context);
    }
  }

  /**
   * Handle analysis-specific questions - FIXED VERSION
   */
  async handleAnalysisQuestion(query, context) {
    if (!context.analysisData) {
      return "I need analysis data to answer that question. Please make sure you're viewing a specific customer analysis.";
    }

    const analysisData = context.analysisData;

    // ENHANCED: Much more comprehensive data access
    const prompt = `
You are analyzing a SPECIFIC customer's situation. Use their ACTUAL data to give precise, factual answers.

CUSTOMER: ${analysisData.customerName}
INDUSTRY: ${analysisData.industry}
FIT SCORE: ${analysisData.fitScore}%
USERS: ${analysisData.userCount?.total || 'Not specified'} total (${analysisData.userCount?.field || 'Not specified'} field workers)

CURRENT STATE & SYSTEMS:
${JSON.stringify(analysisData.currentState, null, 2)}

CURRENT SYSTEMS SUMMARY: ${analysisData.currentState?.summary || 'Not specified'}
CURRENT SYSTEMS LIST: ${analysisData.currentState?.currentSystems?.map(sys => `• ${sys.name}: ${sys.description || ''}`).join('\n') || 'Not specified'}

SERVICES THEY PROVIDE:
${analysisData.services ? JSON.stringify(analysisData.services, null, 2) : 'Not specified'}

REQUIREMENTS & NEEDS:
${JSON.stringify(analysisData.requirements, null, 2)}

TIMELINE: ${analysisData.timeline?.desiredGoLive || 'Not specified'}
URGENCY: ${analysisData.timeline?.urgency || 'Not specified'}

BUDGET INFORMATION:
${JSON.stringify(analysisData.budget, null, 2)}

ACTUAL SCORING BREAKDOWN:
${JSON.stringify(analysisData.scoreBreakdown, null, 2)}

ACTUAL STRENGTHS:
${analysisData.strengths?.map(s => `• ${s.title}: ${s.description}`).join('\n') || 'None listed'}

ACTUAL CHALLENGES:
${analysisData.challenges?.map(c => `• ${c.title}: ${c.description} (Severity: ${c.severity})`).join('\n') || 'None listed'}

SALES RECOMMENDATION: ${analysisData.recommendations?.salesStrategy?.recommendation || 'Not specified'}

REASONING: ${analysisData.recommendations?.fitScoreRationale?.summary || 'Not specified'}

POSITIVE FACTORS: ${analysisData.recommendations?.fitScoreRationale?.positiveFactors?.join(', ') || 'Not specified'}

NEGATIVE FACTORS: ${analysisData.recommendations?.fitScoreRationale?.negativeFactors?.join(', ') || 'Not specified'}

USER QUESTION: "${query}"

CRITICAL INSTRUCTIONS:
1. Use ONLY the actual data provided above - never say data is "not available" if it exists
2. If asked about replacement reasons, look in currentState, challenges, requirements, and services data
3. If asked about current systems, reference the currentState and currentSystems data specifically
4. Be specific and factual - quote their actual systems, challenges, and requirements
5. Reference their actual company name, industry, and specific numbers
6. If the data truly isn't present, say so clearly, but check ALL relevant fields first

If asked about fit score, explain using the scoring breakdown.
If asked about replacement reasons, use currentState, challenges, and requirements data.
If asked about current systems, reference currentSystems and currentState.
If asked about timeline, use the timeline data.
If asked about budget, use the budget data.

Be specific, factual, and data-driven. Use their actual company details and real information.`;

    return await this.callOpenAI(prompt);
  }

  /**
   * Handle similar customers queries
   */
  async handleSimilarCustomersQuery(query, context) {
    if (!context.analysisData?.similarCustomers) {
      return "No similar customers data is available for this analysis.";
    }

    const prompt = `
Analyze and explain similar customers for this prospect.

CURRENT PROSPECT:
${context.analysisData.customerName} - ${context.analysisData.industry}
${context.analysisData.userCount?.total} users (${context.analysisData.userCount?.field} field workers)

SIMILAR CUSTOMERS:
${JSON.stringify(context.analysisData.similarCustomers, null, 2)}

USER QUESTION: "${query}"

Provide insights about the similar customers, what we can learn from them, and how it applies to the current prospect.
Include specific success stories, implementation lessons, or risk factors based on the question.

Be conversational and actionable.`;

    return await this.callOpenAI(prompt);
  }

  /**
   * Handle next steps and strategy questions
   */
  async handleNextStepsQuery(query, context) {
    const analysisData = context.analysisData;
    if (!analysisData) {
      return "I need specific analysis data to provide strategic recommendations. Please view a customer analysis first.";
    }

    const prompt = `
You are a sales strategy AI assistant. Provide specific, actionable next steps.

PROSPECT ANALYSIS:
Customer: ${analysisData.customerName}
Industry: ${analysisData.industry}  
Fit Score: ${analysisData.fitScore}%
Recommendation: ${analysisData.recommendations?.salesStrategy?.recommendation}
Timeline: ${analysisData.timeline?.desiredGoLive}

CURRENT SALES STRATEGY:
${JSON.stringify(analysisData.recommendations?.salesStrategy, null, 2)}

IMPLEMENTATION APPROACH:
${JSON.stringify(analysisData.recommendations?.implementationApproach, null, 2)}

USER QUESTION: "${query}"

Provide specific, actionable next steps. Include:
- Immediate actions (next 1-2 days)
- Short-term strategy (next 1-2 weeks) 
- Key talking points for next conversation
- Potential objections and how to handle them
- Timeline recommendations

Be practical and sales-focused.`;

    return await this.callOpenAI(prompt);
  }

  /**
   * Handle email generation requests
   */
  async handleEmailGeneration(query, context) {
    const analysisData = context.analysisData;
    if (!analysisData) {
      return "I need customer analysis data to generate a personalized email. Please view a specific analysis first.";
    }

    const emailType = this.detectEmailType(query);
    
    const prompt = `
Generate a professional, personalized ${emailType} email.

CUSTOMER CONTEXT:
Name: ${analysisData.customerName}
Industry: ${analysisData.industry}
Users: ${analysisData.userCount?.total}
Fit Score: ${analysisData.fitScore}%
Key Requirements: ${analysisData.requirements?.keyFeatures?.join(', ') || 'Not specified'}
Main Challenges: ${analysisData.challenges?.map(c => c.title).join(', ') || 'None'}
Recommendation: ${analysisData.recommendations?.salesStrategy?.recommendation}

USER REQUEST: "${query}"

Generate a professional email with:
- Appropriate subject line
- Personalized content based on their specific situation
- Clear next steps
- Professional tone

Format as:
Subject: [subject line]

[email body]`;

    return await this.callOpenAI(prompt);
  }

  /**
   * Detect email type from query
   */
  detectEmailType(query) {
    const queryLower = query.toLowerCase();
    if (queryLower.includes('follow-up') || queryLower.includes('follow up')) return 'follow-up';
    if (queryLower.includes('introduction') || queryLower.includes('intro')) return 'introduction';
    if (queryLower.includes('proposal')) return 'proposal';
    if (queryLower.includes('meeting') || queryLower.includes('call')) return 'meeting request';
    if (queryLower.includes('demo')) return 'demo invitation';
    return 'follow-up';
  }

  /**
   * Handle data lookup requests
   */
  async handleDataLookup(query, context) {
    try {
      // Extract search terms
      const searchTerms = this.extractSearchTerms(query);
      
      // Search historical data
      const historicalData = await historicalDataService.getAllHistoricalData();
      const results = this.searchHistoricalData(historicalData, searchTerms);
      
      const prompt = `
You are a data lookup assistant. Answer the user's question based on the search results.

USER QUERY: "${query}"

SEARCH RESULTS:
${JSON.stringify(results.slice(0, 5), null, 2)}

Provide a helpful summary of the findings. If no relevant results found, suggest alternative search terms.
Be conversational and suggest follow-up questions.`;

      return await this.callOpenAI(prompt);
      
    } catch (error) {
      return "I encountered an error searching our data. Please try rephrasing your question or contact support if the issue persists.";
    }
  }

  /**
   * Extract search terms from query
   */
  extractSearchTerms(query) {
    const terms = query.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(term => term.length > 2)
      .filter(term => !['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'].includes(term));
    
    return [...new Set(terms)]; // Remove duplicates
  }

  /**
   * Search historical data
   */
  searchHistoricalData(data, searchTerms) {
    return data.filter(customer => {
      const searchText = `${customer.customerName} ${customer.industry} ${customer.services?.join(' ')} ${customer.requirements?.keyFeatures?.join(' ')}`.toLowerCase();
      return searchTerms.some(term => searchText.includes(term));
    });
  }

  /**
   * Handle explanation requests
   */
  async handleExplanation(query, context) {
    const prompt = `
You are an expert on field service management software and customer analysis.
Explain concepts clearly and provide practical insights.

USER QUESTION: "${query}"

Provide a clear, helpful explanation. Include:
- Main concept definition
- Why it matters in field service software sales
- Practical examples
- How it relates to customer success

Be educational but conversational.`;

    return await this.callOpenAI(prompt);
  }

  /**
   * Handle general conversation
   */
  async handleGeneralQuery(query, context) {
    const prompt = `
You are a helpful AI assistant for a field service management software company.
You help sales teams analyze customer fit and make better decisions.

${context.analysisData ? 
  `Current context: User is viewing analysis for ${context.analysisData.customerName} (${context.analysisData.industry})` : 
  'No specific analysis context.'}

USER QUERY: "${query}"

Provide a helpful response and suggest how you can assist with customer analysis tasks.
Be conversational and suggest follow-up questions.`;

    return await this.callOpenAI(prompt);
  }

  // FIXED: Complete callOpenAI method with axios and timeout
  async callOpenAI(prompt, options = {}) {
    try {
      console.log('🤖 ConversationalAI: Starting OpenAI call...');
      console.log('Query length:', prompt.length);
      
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OpenAI API key is not configured');
      }

      const model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
      const maxTokens = options.maxTokens || 800;

      console.log('Using model:', model, 'with max tokens:', maxTokens);

      // FIXED: Use axios instead of fetch with proper timeout
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: model,
          messages: [
            {
              role: 'system',
              content: 'You are a helpful AI assistant for field service management software sales. Be conversational, specific, and actionable.'
            },
            {
              role: 'user', 
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: maxTokens
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 25000 // 25 second timeout for Heroku (under 30s limit)
        }
      );

      console.log('✅ ConversationalAI: OpenAI call successful');
      
      if (!response.data || !response.data.choices || !response.data.choices[0]) {
        throw new Error('Invalid OpenAI response structure');
      }

      const result = response.data.choices[0].message.content;
      console.log('Response length:', result.length, 'characters');
      
      return result;
      
    } catch (error) {
      console.error('❌ ConversationalAI: OpenAI call failed:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });

      // Enhanced error handling for different scenarios
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        throw new Error('OpenAI request timed out. Please try again with a shorter message.');
      } else if (error.response?.status === 401) {
        throw new Error('OpenAI API key is invalid. Please check configuration.');
      } else if (error.response?.status === 429) {
        throw new Error('OpenAI rate limit exceeded. Please wait a moment and try again.');
      } else if (error.response?.status === 500) {
        throw new Error('OpenAI service is temporarily unavailable. Please try again.');
      } else {
        throw new Error(`OpenAI error: ${error.message}`);
      }
    }
  }
}

module.exports = new ConversationalAIService();

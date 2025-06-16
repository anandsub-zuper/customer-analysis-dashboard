// backend/services/conversationalAIService.js
const openaiService = require('./openaiService');
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
   * Classify user intent using OpenAI
   */
  async classifyIntent(query, context) {
    const prompt = `
Classify this user query into one of these categories:

CATEGORIES:
- ANALYSIS_QUESTION: Questions about specific analysis results, scores, recommendations
- SIMILAR_CUSTOMERS: Questions about similar customers or historical comparisons  
- NEXT_STEPS: Questions about what to do next, sales strategies, follow-up actions
- EMAIL_GENERATION: Requests to generate emails, proposals, or communications
- DATA_LOOKUP: Questions requiring lookup of specific data or customers
- EXPLANATION: Requests to explain concepts, processes, or methodology
- GENERAL: General questions or conversation

CONTEXT:
${context.analysisId ? `User is viewing analysis for: ${context.customerName} (${context.industry})` : 'No specific analysis context'}

USER QUERY: "${query}"

Respond with JSON only:
{
  "type": "CATEGORY_NAME", 
  "confidence": 0.8,
  "entities": ["extracted", "key", "terms"],
  "requiresAnalysisData": true/false
}`;

    try {
      const response = await this.callOpenAI(prompt, { maxTokens: 200 });
      return JSON.parse(response);
    } catch (error) {
      console.error('Error classifying intent:', error);
      return { type: 'GENERAL', confidence: 0.5, entities: [], requiresAnalysisData: false };
    }
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
   * Handle analysis-specific questions
   */
  async handleAnalysisQuestion(query, context) {
    if (!context.analysisData) {
      return "I need analysis data to answer that question. Please make sure you're viewing a specific customer analysis.";
    }

    const prompt = `
You are an AI assistant helping sales teams understand customer analysis results.

CUSTOMER ANALYSIS DATA:
Customer: ${context.analysisData.customerName}
Industry: ${context.analysisData.industry}
Fit Score: ${context.analysisData.fitScore}%
Users: ${context.analysisData.userCount?.total} (${context.analysisData.userCount?.field} field workers)
Recommendation: ${context.analysisData.recommendations?.salesStrategy?.recommendation}

SCORING BREAKDOWN:
${JSON.stringify(context.analysisData.scoreBreakdown, null, 2)}

STRENGTHS:
${context.analysisData.strengths?.map(s => `• ${s.title}: ${s.description}`).join('\n') || 'None listed'}

CHALLENGES:
${context.analysisData.challenges?.map(c => `• ${c.title}: ${c.description} (${c.severity})`).join('\n') || 'None listed'}

USER QUESTION: "${query}"

Provide a helpful, specific answer based on the analysis data. Be conversational but informative.
Focus on actionable insights and explain the reasoning behind scores or recommendations.

Response format: Conversational explanation (2-3 paragraphs max)`;

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

CUSTOMER ANALYSIS:
Customer: ${analysisData.customerName}
Industry: ${analysisData.industry}
Fit Score: ${analysisData.fitScore}%
Key Requirements: ${analysisData.requirements?.keyFeatures?.slice(0, 3).join(', ')}
Main Challenges: ${analysisData.challenges?.map(c => c.title).slice(0, 2).join(', ')}
Recommendation: ${analysisData.recommendations?.salesStrategy?.recommendation}

SIMILAR CUSTOMERS SUCCESS:
${analysisData.similarCustomers?.length > 0 ? 
  `Similar ${analysisData.similarCustomers[0]?.customers?.[0]?.industry} company achieved ${analysisData.similarCustomers[0]?.customers?.[0]?.implementation?.health} results` : 
  'Standard implementation success stories available'}

USER REQUEST: "${query}"

Generate a professional email that:
- References their specific industry and needs
- Highlights relevant value proposition
- Addresses their main challenges
- Includes next steps
- Uses appropriate tone for fit score level

Format as a complete email with subject line.`;

    return await this.callOpenAI(prompt);
  }

  /**
   * Handle data lookup queries
   */
  async handleDataLookup(query, context) {
    // Extract what they're looking for
    const searchTerms = this.extractSearchTerms(query);
    
    try {
      // Search in historical data
      const historicalData = await historicalDataService.getHistoricalData();
      const searchResults = this.searchHistoricalData(historicalData, searchTerms);
      
      if (searchResults.length === 0) {
        return `I couldn't find any customers matching "${searchTerms.join(', ')}" in our historical data. Try different search terms or ask me to explain our data structure.`;
      }

      const prompt = `
Format search results for the user query.

USER QUERY: "${query}"
SEARCH TERMS: ${searchTerms.join(', ')}

FOUND CUSTOMERS:
${searchResults.slice(0, 5).map(customer => 
  `• ${customer.customerName} (${customer.industry}) - Fit Score: ${customer.fitScore}%, Users: ${customer.userCount?.total}`
).join('\n')}

Provide a helpful summary of the search results and offer to dive deeper into specific customers.
Be conversational and suggest follow-up questions.`;

      return await this.callOpenAI(prompt);
      
    } catch (error) {
      return "I encountered an error searching our data. Please try rephrasing your question or contact support if the issue persists.";
    }
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
Be friendly and offer specific ways you can help.`;

    return await this.callOpenAI(prompt);
  }

  /**
   * Get conversation context
   */
  async getContext(conversationId, analysisId) {
    const context = {
      conversationId,
      analysisId,
      analysisData: null,
      customerName: null,
      industry: null,
      conversationHistory: []
    };

    // Get analysis data if provided
    if (analysisId) {
      try {
        context.analysisData = await analysisService.getAnalysisById(analysisId);
        context.customerName = context.analysisData.customerName;
        context.industry = context.analysisData.industry;
      } catch (error) {
        console.error('Error loading analysis for context:', error);
      }
    }

    // Get conversation history (simplified for demo)
    if (conversationId && this.conversationContexts.has(conversationId)) {
      context.conversationHistory = this.conversationContexts.get(conversationId);
    }

    return context;
  }

  /**
   * Update conversation context
   */
  async updateContext(conversationId, interaction) {
    if (!conversationId) return;

    const history = this.conversationContexts.get(conversationId) || [];
    history.push(interaction);
    
    // Keep only last 10 interactions
    if (history.length > 10) {
      history.shift();
    }
    
    this.conversationContexts.set(conversationId, history);
  }

  /**
   * Helper methods
   */
  detectEmailType(query) {
    const queryLower = query.toLowerCase();
    if (queryLower.includes('follow') || queryLower.includes('follow-up')) return 'follow-up';
    if (queryLower.includes('intro') || queryLower.includes('introduction')) return 'introduction';
    if (queryLower.includes('proposal')) return 'proposal';
    if (queryLower.includes('demo')) return 'demo invitation';
    if (queryLower.includes('thank')) return 'thank you';
    return 'follow-up';
  }

  extractSearchTerms(query) {
    // Simple term extraction - in production, use NLP
    const terms = query.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(term => term.length > 2 && !['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'].includes(term));
    
    return [...new Set(terms)]; // Remove duplicates
  }

  searchHistoricalData(data, searchTerms) {
    return data.filter(customer => {
      const searchText = `${customer.customerName} ${customer.industry} ${customer.services?.join(' ')} ${customer.requirements?.keyFeatures?.join(' ')}`.toLowerCase();
      return searchTerms.some(term => searchText.includes(term));
    });
  }

  async callOpenAI(prompt, options = {}) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
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
          max_tokens: options.maxTokens || 800
        })
      });

      const data = await response.json();
      
      if (!data.choices || !data.choices[0]) {
        throw new Error('Invalid OpenAI response');
      }

      return data.choices[0].message.content;
      
    } catch (error) {
      console.error('Error calling OpenAI for conversation:', error);
      throw error;
    }
  }
}

module.exports = new ConversationalAIService();

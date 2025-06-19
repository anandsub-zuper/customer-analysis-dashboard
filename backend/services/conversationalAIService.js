// backend/services/conversationalAIService.js - COMPLETE FIXED VERSION
const axios = require('axios');
const analysisService = require('./analysisService');
const historicalDataService = require('./historicalDataService');
const { getDb } = require('./mongoDbService');

/**
 * FIXED: Complete OpenAI Intent Classifier with all missing methods
 */
class OpenAIIntentClassifier {
  constructor() {
    this.intentCategories = {
      'ANALYSIS_QUESTION': { requiresAnalysisData: true },
      'BUSINESS_MODEL': { requiresAnalysisData: true },
      'COMPANY_RESEARCH': { requiresAnalysisData: false },
      'SIMILAR_CUSTOMERS': { requiresAnalysisData: true },
      'NEXT_STEPS': { requiresAnalysisData: true },
      'EMAIL_GENERATION': { requiresAnalysisData: true },
      'DATA_LOOKUP': { requiresAnalysisData: false },
      'EXPLANATION': { requiresAnalysisData: false },
      'GENERAL': { requiresAnalysisData: false }
    };

    // Initialize company indicators for name extraction
    this.companyIndicators = [
      'inc', 'corp', 'llc', 'ltd', 'company', 'co.', 'corporation',
      'enterprises', 'group', 'holdings', 'solutions', 'services',
      'systems', 'technologies', 'tech'
    ];

    this.businessKeywords = [
      'heating', 'hvac', 'plumbing', 'electrical', 'construction',
      'cleaning', 'maintenance', 'repair', 'pest', 'security',
      'landscaping', 'roofing', 'flooring'
    ];
  }

  // FIXED: Missing method definition
  isSimilarCustomersQuery(queryLower) {
    const similarCustomerIndicators = [
      'similar customer',
      'similar customers', 
      'comparable customer',
      'comparable customers',
      'like this customer',
      'customers like',
      'similar to this',
      'similar companies',
      'customers similar',
      'comparable companies',
      'other customers like',
      'customers that are similar',
      'customers with similar',
      'find similar',
      'show similar',
      'who are similar',
      'companies similar',
      'others like',
      'similar businesses',
      'comparable businesses',
      'like them',
      'similar to them'
    ];
    
    return similarCustomerIndicators.some(indicator => queryLower.includes(indicator));
  }

  // FIXED: Missing method definition
  isTimelineQuestion(query) {
    const timelineIndicators = [
      'timeline', 'implementation timeline', 'go live', 'go-live',
      'when do they', 'when does', 'target date', 'launch date',
      'urgency', 'how soon', 'when', 'schedule'
    ];
    
    const queryLower = query.toLowerCase();
    return timelineIndicators.some(indicator => queryLower.includes(indicator));
  }

  // FIXED: Missing method definition
  refersToCurrentCustomer(query) {
    const currentCustomerIndicators = [
      'did the customer', 'did they', 'does the customer', 'do they',
      'the customer mentioned', 'they mentioned', 'customer said', 'they said',
      'their timeline', 'their requirements', 'their budget', 'their needs',
      'this customer', 'this company'
    ];
    
    const queryLower = query.toLowerCase();
    return currentCustomerIndicators.some(indicator => queryLower.includes(indicator));
  }

  // FIXED: Enhanced quickRuleBasedCheck with error boundaries
  enhancedQuickRuleBasedCheck(query, context) {
    try {
      const queryLower = query.toLowerCase();
      
      // Rule 1: Similar customers override
      if (this.isSimilarCustomersQuery(queryLower)) {
        return {
          type: 'SIMILAR_CUSTOMERS',
          confidence: 0.95,
          entities: ['similar', 'customers'],
          requiresAnalysisData: true,
          reasoning: 'Query explicitly about similar customers',
          source: 'rule-based-override'
        };
      }

      // Rule 2: Current customer context questions
      if (context.analysisId && this.refersToCurrentCustomer(query)) {
        return {
          type: 'ANALYSIS_QUESTION',
          confidence: 0.9,
          entities: [],
          requiresAnalysisData: true,
          reasoning: 'Query about current customer being analyzed',
          source: 'rule-based-current-customer'
        };
      }

      // Rule 3: Timeline questions
      if (this.isTimelineQuestion(query)) {
        return {
          type: 'ANALYSIS_QUESTION',
          confidence: 0.85,
          entities: ['timeline'],
          requiresAnalysisData: true,
          reasoning: 'Query about timeline information',
          source: 'rule-based-timeline'
        };
      }

      return null; // No rule matched
    } catch (error) {
      console.error('Error in enhancedQuickRuleBasedCheck:', error);
      return null;
    }
  }

  // FIXED: strictValidateAndCorrect with comprehensive error boundaries
  strictValidateAndCorrect(intent, query, context) {
    try {
      const originalIntent = { ...intent };
      let wasCorrected = false;
      const corrections = [];

      // CORRECTION 1: Similar customers query misclassified
      try {
        if (this.isSimilarCustomersQuery(query.toLowerCase()) && intent.type !== 'SIMILAR_CUSTOMERS') {
          corrections.push({
            rule: 'similar_customers_override',
            original: intent.type,
            corrected: 'SIMILAR_CUSTOMERS',
            reason: 'Query explicitly mentions similar customers'
          });
          intent.type = 'SIMILAR_CUSTOMERS';
          intent.confidence = 0.95;
          intent.reasoning = 'Corrected: Query about similar customers';
          wasCorrected = true;
        }
      } catch (error) {
        console.warn('Error in similar customers correction:', error);
      }

      // CORRECTION 2: Timeline question with wrong context
      try {
        if (intent.reasoning && intent.reasoning.includes('timeline') && 
            !this.isTimelineQuestion(query)) {
          corrections.push({
            rule: 'invalid_timeline_reasoning',
            reason: 'Reasoning mentions timeline but query is not about timeline'
          });
          
          if (this.isSimilarCustomersQuery(query.toLowerCase())) {
            intent.type = 'SIMILAR_CUSTOMERS';
            intent.reasoning = 'Corrected: Query about similar customers, not timeline';
            wasCorrected = true;
          }
        }
      } catch (error) {
        console.warn('Error in timeline correction:', error);
      }

      // CORRECTION 3: Current customer override
      try {
        if (context.analysisId && this.refersToCurrentCustomer(query) && 
            intent.type !== 'ANALYSIS_QUESTION' && !this.isSimilarCustomersQuery(query.toLowerCase())) {
          corrections.push({
            rule: 'current_customer_override',
            original: intent.type,
            corrected: 'ANALYSIS_QUESTION'
          });
          intent.type = 'ANALYSIS_QUESTION';
          intent.confidence = 0.95;
          wasCorrected = true;
        }
      } catch (error) {
        console.warn('Error in current customer correction:', error);
      }

      if (wasCorrected) {
        console.log('🔧 Intent classification corrected:', {
          original: originalIntent,
          corrected: intent,
          corrections: corrections
        });
      }

      const enhancedIntent = {
        type: intent.type,
        confidence: intent.confidence || 0.7,
        entities: intent.entities || [],
        requiresAnalysisData: this.intentCategories[intent.type]?.requiresAnalysisData || false,
        reasoning: intent.reasoning || 'OpenAI classification',
        source: 'openai',
        wasCorrected: wasCorrected,
        corrections: corrections
      };

      return enhancedIntent;
    } catch (error) {
      console.error('Error in strictValidateAndCorrect:', error);
      // Return a safe fallback intent
      return {
        type: 'GENERAL',
        confidence: 0.5,
        entities: [],
        requiresAnalysisData: false,
        reasoning: 'Fallback due to validation error',
        source: 'error-fallback'
      };
    }
  }

  async classifyIntent(query, context) {
    try {
      // Quick rule-based check first
      const ruleBasedResult = this.enhancedQuickRuleBasedCheck(query, context);
      if (ruleBasedResult) {
        return ruleBasedResult;
      }

      // Build context info for OpenAI
      const contextInfo = this.buildContextInfo(context);
      
      const prompt = `
Classify this user query into one of these categories:

CATEGORIES:
- ANALYSIS_QUESTION: Questions about specific analysis results, scores, recommendations, fit scores, scoring breakdown
- BUSINESS_MODEL: Questions about B2B/B2C, business model, customer types, revenue model
- COMPANY_RESEARCH: Questions about company information, characteristics, industry position
- SIMILAR_CUSTOMERS: Questions about similar customers or historical comparisons  
- NEXT_STEPS: Questions about what to do next, sales strategies, follow-up actions
- EMAIL_GENERATION: Requests to generate emails, proposals, or communications
- DATA_LOOKUP: Questions requiring lookup of specific data or customers
- EXPLANATION: Requests to explain general concepts, processes, or methodology
- GENERAL: General questions or conversation

CONTEXT:
${contextInfo}

CRITICAL CLASSIFICATION RULES:
1. If asking "why" about fit score/percentage while viewing analysis → ANALYSIS_QUESTION
2. If query mentions "similar customers", "similar customer", "comparable" → SIMILAR_CUSTOMERS  
3. If viewing analysis AND asking about "the customer"/"they"/"their" → ANALYSIS_QUESTION
4. If asking about external company names → EXTERNAL_COMPANY_RESEARCH
5. If asking about general concepts WITHOUT customer context → EXPLANATION

USER QUERY: "${query}"

Respond with valid JSON only:
{
  "type": "ANALYSIS_QUESTION",
  "confidence": 0.95,
  "entities": ["fit", "score"],
  "reasoning": "User asking about current customer's specific fit score"
}`;

      const response = await this.callOpenAI(prompt, { maxTokens: 250 });
      const intent = JSON.parse(response);
      
      console.log('🎯 Intent Classification Result:', {
        query: query.substring(0, 50),
        classifiedAs: intent.type,
        confidence: intent.confidence,
        reasoning: intent.reasoning
      });
      
      return this.strictValidateAndCorrect(intent, query, context);
    } catch (error) {
      console.error('Error classifying intent:', error);
      return this.fallbackIntentClassification(query, context);
    }
  }

  buildContextInfo(context) {
    let contextInfo = '';
    
    if (context.analysisId && context.analysisData) {
      contextInfo += `VIEWING CUSTOMER ANALYSIS:
- Customer: ${context.analysisData.customerName}
- Industry: ${context.analysisData.industry}
- Analysis ID: ${context.analysisId}
- Has Timeline Data: ${!!context.analysisData.timeline}
- Has Requirements: ${!!context.analysisData.requirements}

This means questions about "the customer", "they", "their" refer to ${context.analysisData.customerName}.`;
    } else {
      contextInfo += `NO CURRENT ANALYSIS CONTEXT:
- User is not viewing a specific customer analysis
- Questions about "customers" likely refer to general database searches`;
    }
    
    return contextInfo;
  }

  fallbackIntentClassification(query, context) {
    try {
      const queryLower = query.toLowerCase();
      
      // Enhanced fallback with similar customers priority
      if (this.isSimilarCustomersQuery(queryLower)) {
        return {
          type: 'SIMILAR_CUSTOMERS',
          confidence: 0.9,
          entities: ['similar', 'customers'],
          requiresAnalysisData: true,
          source: 'fallback-similar-customers',
          reasoning: 'Fallback: Query about similar customers'
        };
      }
      
      if (context.analysisId && this.refersToCurrentCustomer(query)) {
        return {
          type: 'ANALYSIS_QUESTION',
          confidence: 0.85,
          entities: [],
          requiresAnalysisData: true,
          source: 'fallback-customer-context'
        };
      }
      
      if (queryLower.includes('business model')) {
        return { type: 'BUSINESS_MODEL', confidence: 0.7, entities: [], requiresAnalysisData: false, source: 'fallback' };
      }
      
      return { type: 'GENERAL', confidence: 0.5, entities: [], requiresAnalysisData: false, source: 'fallback' };
    } catch (error) {
      console.error('Error in fallback classification:', error);
      return { type: 'GENERAL', confidence: 0.3, entities: [], requiresAnalysisData: false, source: 'error-fallback' };
    }
  }

  async callOpenAI(prompt, options = {}) {
    try {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OpenAI API key is not configured');
      }

      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are an expert intent classifier for field service software sales. Always respond with valid JSON only. Be precise and context-aware.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1,
          max_tokens: options.maxTokens || 300
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      
      return response.data.choices[0].message.content.trim();
    } catch (error) {
      console.error('OpenAI call failed:', error);
      throw error;
    }
  }
}

/**
 * FIXED: Complete Conversational AI Service with Memory Management
 */
class ConversationalAIService {
  constructor() {
    // FIXED: Memory-managed context storage with TTL
    this.conversationContexts = new Map();
    this.contextTTL = 30 * 60 * 1000; // 30 minutes
    this.maxContexts = 1000; // Limit total contexts
    
    // Cache for web data and responses
    this.webCache = new Map();
    this.responseCache = new Map();
    
    // Initialize classifier and cleanup
    this.intentClassifier = new OpenAIIntentClassifier();
    this.initializeCleanup();
  }

  // FIXED: Memory management - cleanup expired contexts
  initializeCleanup() {
    setInterval(() => {
      this.cleanupExpiredContexts();
    }, 5 * 60 * 1000); // Cleanup every 5 minutes
  }

  cleanupExpiredContexts() {
    try {
      const now = Date.now();
      let cleaned = 0;
      
      for (const [key, context] of this.conversationContexts.entries()) {
        if (now - context.lastAccessed > this.contextTTL) {
          this.conversationContexts.delete(key);
          cleaned++;
        }
      }
      
      // If still too many, remove oldest
      if (this.conversationContexts.size > this.maxContexts) {
        const entries = Array.from(this.conversationContexts.entries())
          .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
        
        const toRemove = entries.slice(0, entries.length - this.maxContexts);
        toRemove.forEach(([key]) => this.conversationContexts.delete(key));
        cleaned += toRemove.length;
      }
      
      if (cleaned > 0) {
        console.log(`🧹 Cleaned up ${cleaned} expired conversation contexts`);
      }
    } catch (error) {
      console.error('Error during context cleanup:', error);
    }
  }

  async processQuery(query, options = {}) {
    try {
      const { analysisId, conversationId, userId } = options;
      
      // Validate input
      const validation = this.validateQuery(query, options);
      if (!validation.isValid) {
        return {
          success: false,
          response: `Invalid query: ${validation.errors.join(', ')}`,
          error: 'VALIDATION_ERROR'
        };
      }
      
      // Get conversation context
      const context = await this.getContext(conversationId, analysisId);
      
      // Classify user intent
      const intent = await this.classifyIntent(query, context);
      
      // Check cache for similar responses
      const cachedResponse = await this.getCachedResponse(query, context, intent);
      if (cachedResponse) {
        console.log('📦 Returning cached response');
        return cachedResponse;
      }
      
      // Gather web enhancement if needed
      let enhancementData = null;
      if (this.shouldEnhanceWithWebData(query, intent, context)) {
        try {
          enhancementData = await this.gatherWebEnhancement(context.analysisData);
        } catch (error) {
          console.log('Web enhancement failed, continuing without it:', error.message);
        }
      }
      
      // Route to appropriate handler
      const response = await this.routeQuery(intent, query, context, enhancementData);
      
      // Update conversation context
      await this.updateContext(conversationId, {
        userQuery: query,
        botResponse: response,
        intent: intent.type,
        timestamp: new Date()
      });
      
      // Cache the response
      this.cacheResponse(query, context, intent, response);
      
      return {
        success: true,
        response: response,
        intent: intent.type,
        context: context.analysisId ? 'analysis-aware' : 'general',
        webEnhanced: !!enhancementData
      };
      
    } catch (error) {
      console.error('Error processing conversational query:', error);
      return {
        success: false,
        response: this.getEmergencyResponse(error),
        error: error.message
      };
    }
  }

  validateQuery(query, options) {
    const errors = [];
    
    if (!query || query.trim().length === 0) {
      errors.push('Query cannot be empty');
    }
    if (query && query.length > 2000) {
      errors.push('Query too long (max 2000 characters)');
    }
    
    return { isValid: errors.length === 0, errors };
  }

  async getCachedResponse(query, context, intent) {
    try {
      const cacheKey = this.generateCacheKey(query, context, intent);
      const cached = this.responseCache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < 300000) { // 5 min TTL
        return {
          success: true,
          response: cached.response,
          intent: intent.type,
          context: context.analysisId ? 'analysis-aware' : 'general',
          cached: true
        };
      }
      
      return null;
    } catch (error) {
      console.warn('Cache lookup failed:', error);
      return null;
    }
  }

  cacheResponse(query, context, intent, response) {
    try {
      const cacheKey = this.generateCacheKey(query, context, intent);
      this.responseCache.set(cacheKey, {
        response,
        timestamp: Date.now()
      });
      
      // Limit cache size
      if (this.responseCache.size > 500) {
        const oldest = Array.from(this.responseCache.entries())
          .sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
        this.responseCache.delete(oldest[0]);
      }
    } catch (error) {
      console.warn('Response caching failed:', error);
    }
  }

  generateCacheKey(query, context, intent) {
    const contextHash = context.analysisId || 'general';
    const queryHash = query.toLowerCase().substring(0, 50);
    return `${contextHash}-${intent.type}-${queryHash}`;
  }

  getEmergencyResponse(error) {
    const emergencyResponses = [
      "I apologize, but I encountered a technical issue. Please try rephrasing your question.",
      "I'm experiencing some difficulties right now. Could you try asking your question differently?",
      "There seems to be a temporary issue. Please try again in a moment.",
      "I'm having trouble processing that request. Can you provide more specific details?"
    ];
    
    return emergencyResponses[Math.floor(Math.random() * emergencyResponses.length)];
  }

  async getContext(conversationId, analysisId) {
    try {
      const context = {
        conversationId,
        analysisId,
        analysisData: null,
        conversationHistory: [],
        lastAccessed: Date.now()
      };

      // Get analysis data if analysisId provided
      if (analysisId) {
        try {
          console.log('Retrieving analysis for context:', analysisId);
          const analysis = await analysisService.getAnalysisById(analysisId);
          
          if (analysis) {
            context.analysisData = analysis;
            console.log('Retrieved analysis with fields:', Object.keys(analysis));
          }
        } catch (error) {
          console.error('Error loading analysis for context:', error);
        }
      }

      // Get conversation history if conversationId provided
      if (conversationId && this.conversationContexts.has(conversationId)) {
        const existingContext = this.conversationContexts.get(conversationId);
        context.conversationHistory = existingContext.conversationHistory || [];
        existingContext.lastAccessed = Date.now();
      }

      return context;
    } catch (error) {
      console.error('Error getting context:', error);
      return {
        conversationId,
        analysisId,
        analysisData: null,
        conversationHistory: [],
        lastAccessed: Date.now()
      };
    }
  }

  async updateContext(conversationId, update) {
    try {
      if (!conversationId) return;

      if (!this.conversationContexts.has(conversationId)) {
        this.conversationContexts.set(conversationId, {
          conversationHistory: [],
          lastAccessed: Date.now()
        });
      }

      const context = this.conversationContexts.get(conversationId);
      context.conversationHistory = context.conversationHistory || [];
      context.conversationHistory.push(update);
      context.lastAccessed = Date.now();

      // Keep only last 10 exchanges
      if (context.conversationHistory.length > 10) {
        context.conversationHistory.shift();
      }
    } catch (error) {
      console.error('Error updating context:', error);
    }
  }

  async classifyIntent(query, context) {
    return await this.intentClassifier.classifyIntent(query, context);
  }

  shouldEnhanceWithWebData(query, intent, context) {
    const webEnhancedIntents = ['BUSINESS_MODEL', 'COMPANY_RESEARCH'];
    return webEnhancedIntents.includes(intent.type) && context.analysisData?.customerName;
  }

  async gatherWebEnhancement(analysisData) {
    try {
      if (!analysisData?.customerName) return null;
      
      // Simple web scraping placeholder - implement as needed
      const cacheKey = `web-${analysisData.customerName}`;
      if (this.webCache.has(cacheKey)) {
        return this.webCache.get(cacheKey);
      }
      
      // Placeholder for actual web scraping implementation
      const webData = {
        companySize: 'Medium',
        publiclyListed: false,
        recentNews: [],
        socialMedia: [],
        enhanced: true
      };
      
      this.webCache.set(cacheKey, webData);
      return webData;
    } catch (error) {
      console.error('Web enhancement failed:', error);
      return null;
    }
  }

  async routeQuery(intent, query, context, enhancementData = null) {
    try {
      console.log(`🎯 Routing query to ${intent.type} handler`);
      
      switch (intent.type) {
        case 'ANALYSIS_QUESTION':
          return await this.handleAnalysisQuestion(query, context);
        case 'SIMILAR_CUSTOMERS':
          return await this.handleSimilarCustomersQuery(query, context);
        case 'BUSINESS_MODEL':
          return await this.handleBusinessModel(query, context, enhancementData);
        case 'EMAIL_GENERATION':
          return await this.handleEmailGeneration(query, context);
        case 'DATA_LOOKUP':
          return await this.handleDataLookup(query, context);
        case 'EXPLANATION':
          return await this.handleExplanation(query, context);
        case 'NEXT_STEPS':
          return await this.handleNextSteps(query, context);
        default:
          return await this.handleGeneralQuery(query, context);
      }
    } catch (error) {
      console.error(`Error in ${intent.type} handler:`, error);
      return this.getEmergencyResponse(error);
    }
  }

  async handleAnalysisQuestion(query, context) {
    if (!context.analysisData) {
      return "I don't have access to any analysis data to answer your question. Please ensure you're viewing a customer analysis.";
    }

    const analysisData = context.analysisData;
    
    const prompt = `
You are a field service software sales expert providing detailed analysis insights for ${analysisData.customerName}.

## COMPLETE CUSTOMER PROFILE
**Company:** ${analysisData.customerName}
**Industry:** ${analysisData.industry}
**Fit Score:** ${analysisData.fitScore}%
**Team Size:** ${analysisData.userCount?.total || 'Unknown'} total users (${analysisData.userCount?.field || 0} field workers)

### Current Challenges & Pain Points
${analysisData.challenges?.map(c => `• **${c.title}** (${c.severity} severity): ${c.description}`).join('\n') || '• No specific challenges identified'}

### Key Requirements & Needs
${analysisData.requirements?.keyFeatures?.map(req => `• ${req}`).join('\n') || '• No specific requirements listed'}

### Current Systems & Issues
${analysisData.currentState?.currentSystems?.map(sys => 
  `• **${sys.name}**: ${sys.usage || 'Usage not specified'}${sys.painPoints?.length ? ' | Issues: ' + sys.painPoints.join(', ') : ''}`
).join('\n') || '• No current systems data available'}

### Budget & Timeline
**Budget:** ${analysisData.budget?.mentioned ? (analysisData.budget.range || 'Budget discussed') : 'Budget not discussed'}
**Timeline:** ${analysisData.timeline?.desiredGoLive || 'Not specified'} | **Urgency:** ${analysisData.timeline?.urgency || 'Not specified'}

### Score Breakdown & Rationale
${JSON.stringify(analysisData.scoreBreakdown, null, 2)}

**Positive Factors:** ${analysisData.recommendations?.fitScoreRationale?.positiveFactors?.join(', ') || 'Not specified'}
**Negative Factors:** ${analysisData.recommendations?.fitScoreRationale?.negativeFactors?.join(', ') || 'Not specified'}

USER QUESTION: "${query}"

## INSTRUCTIONS:
1. Use ONLY the actual data provided above
2. Be specific and reference their exact company name, numbers, and details
3. Provide actionable insights based on their specific situation
4. If data is missing, clearly state what information would be helpful to gather
5. Connect your answer to their business context and specific needs

Provide a comprehensive, well-formatted response that directly addresses their question using their specific data.`;

    return await this.callOpenAI(prompt, { maxTokens: 1200 });
  }

  async handleSimilarCustomersQuery(query, context) {
    if (!context.analysisData?.similarCustomers) {
      return "No similar customers data is available for this analysis.";
    }

    const analysisData = context.analysisData;
    
    const prompt = `
You are a field service software sales expert providing strategic insights about similar customers for ${analysisData.customerName}.

## CURRENT PROSPECT PROFILE
**Company:** ${analysisData.customerName}
**Industry:** ${analysisData.industry}
**Size:** ${analysisData.userCount?.total || 'Unknown'} total users (${analysisData.userCount?.field || 0} field workers)
**Fit Score:** ${analysisData.fitScore}%

### Current Challenges
${analysisData.challenges?.map(c => `• **${c.title}** (${c.severity} severity): ${c.description}`).join('\n') || '• No specific challenges identified'}

## SIMILAR CUSTOMERS DATA
${JSON.stringify(analysisData.similarCustomers, null, 2)}

USER QUESTION: "${query}"

## PROVIDE STRATEGIC SIMILAR CUSTOMER ANALYSIS

Generate a comprehensive, well-formatted response that includes:

### 🎯 **Most Relevant Similar Customer Matches**
Identify the TOP 2-3 most relevant customers for ${analysisData.customerName} and explain SPECIFICALLY why they're relevant.

### 📊 **Key Strategic Insights**
What worked well for similar customers that applies to ${analysisData.customerName}?

### 🚀 **Actionable Lessons**
Based on their specific challenges, what lessons can we apply?

### 💼 **Sales Strategy Application**
How should these insights influence our sales approach?

### ⚠️ **Implementation Risk Assessment**
What are the likely implementation risks based on similar customers?

Use specific data points, metrics, and customer examples.`;

    return await this.callOpenAI(prompt, { maxTokens: 1200 });
  }

  async handleBusinessModel(query, context, enhancementData = null) {
    if (!context.analysisData) {
      return "I need customer analysis data to provide business model insights. Please ensure you're viewing a customer analysis.";
    }

    const analysisData = context.analysisData;
    
    const prompt = `
You are a field service software sales expert analyzing business models for ${analysisData.customerName}.

## CUSTOMER ANALYSIS DATA
${JSON.stringify({
      customerName: analysisData.customerName,
      industry: analysisData.industry,
      services: analysisData.services,
      requirements: analysisData.requirements,
      userCount: analysisData.userCount,
      currentState: analysisData.currentState
    }, null, 2)}

${enhancementData ? `
## WEB INTELLIGENCE
${JSON.stringify(enhancementData, null, 2)}
` : 'No web intelligence available.'}

USER QUESTION: "${query}"

Provide comprehensive business model analysis:

### 📊 **Business Model Classification**
Primary model (B2B/B2C/Mixed) with confidence level and supporting evidence.

### 👥 **Customer Segments**
Specific customer types they serve and market segments.

### 💰 **Revenue Model Implications**
Estimated revenue range and pricing model implications.

### 🛠️ **Field Service Software Implications**
How business model affects software requirements and implementation.

### 🎯 **Sales Strategy Recommendations**
Approach based on business model and market position.

Reference specific data points from the analysis.`;

    return await this.callOpenAI(prompt, { maxTokens: 1200 });
  }

  async handleEmailGeneration(query, context) {
    if (!context.analysisData) {
      return "I need customer analysis data to generate personalized emails. Please ensure you're viewing a customer analysis.";
    }

    const analysisData = context.analysisData;
    
    const prompt = `
Generate a professional email for ${analysisData.customerName} based on their analysis.

## CUSTOMER DETAILS
**Company:** ${analysisData.customerName}
**Industry:** ${analysisData.industry}
**Fit Score:** ${analysisData.fitScore}%
**Key Challenges:** ${analysisData.challenges?.map(c => c.title).join(', ') || 'None identified'}
**Timeline:** ${analysisData.timeline?.desiredGoLive || 'Not specified'}

USER REQUEST: "${query}"

Generate a well-formatted, professional email that:
1. References their specific industry and challenges
2. Highlights relevant solutions
3. Includes a clear call-to-action
4. Maintains a consultative tone

Format as a complete email with subject line.`;

    return await this.callOpenAI(prompt, { maxTokens: 800 });
  }

  async handleDataLookup(query, context) {
    try {
      const searchTerms = this.extractSearchTerms(query);
      const historicalData = await historicalDataService.getAllAnalyses();
      const results = this.searchHistoricalData(historicalData, searchTerms);
      
      const prompt = `
Based on the search results, provide insights about the data lookup query.

USER QUERY: "${query}"
SEARCH RESULTS: ${JSON.stringify(results.slice(0, 5), null, 2)}

Provide:
1. **Key Insights** from the search results
2. **Patterns or Trends** if applicable  
3. **Recommendations** for follow-up actions
4. **Alternative search suggestions** if results are limited

Be conversational and actionable.`;

      return await this.callOpenAI(prompt);
    } catch (error) {
      return "I encountered an error searching our data. Please try rephrasing your question or contact support if the issue persists.";
    }
  }

  async handleExplanation(query, context) {
    const prompt = `
You are an expert on field service management software and customer analysis.
Explain concepts clearly with practical insights.

USER QUESTION: "${query}"

Provide a clear, helpful explanation including:

### 📚 **Concept Definition**
Clear explanation of the main concept.

### 🎯 **Why It Matters in Field Service Software Sales**
Business relevance and importance.

### 💡 **Practical Examples**
Real-world examples and use cases.

### 🔗 **How It Relates to Customer Success**
Connection to successful implementations.

Be educational but conversational, with actionable insights.`;

    return await this.callOpenAI(prompt);
  }

  async handleNextSteps(query, context) {
    if (!context.analysisData) {
      return "I need customer analysis data to provide specific next steps recommendations. Please ensure you're viewing a customer analysis.";
    }

    const analysisData = context.analysisData;
    
    const prompt = `
Provide strategic next steps recommendations for ${analysisData.customerName}.

## CURRENT SITUATION
**Company:** ${analysisData.customerName}
**Industry:** ${analysisData.industry}
**Fit Score:** ${analysisData.fitScore}%
**Current Recommendation:** ${analysisData.recommendations?.salesStrategy?.recommendation || 'Not specified'}

USER QUESTION: "${query}"

Provide specific, actionable next steps based on their analysis data.`;

    return await this.callOpenAI(prompt);
  }

  async handleGeneralQuery(query, context) {
    const prompt = `
You are a helpful AI assistant for a field service management software company.
You help sales teams analyze customer fit and make better decisions.

${context.analysisData ? 
  `## CURRENT CONTEXT
You're currently viewing analysis for **${context.analysisData.customerName}** (${context.analysisData.industry})
Fit Score: ${context.analysisData.fitScore}% | Users: ${context.analysisData.userCount?.total || 'Unknown'}` : 
  '## CONTEXT\nNo specific customer analysis currently loaded.'}

USER QUERY: "${query}"

Provide a helpful response and suggest specific ways you can assist with customer analysis tasks.

Format your response clearly with relevant suggestions for how to leverage the customer analysis platform.`;

    return await this.callOpenAI(prompt);
  }

  extractSearchTerms(query) {
    const terms = query.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(term => term.length > 2)
      .filter(term => !['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'].includes(term));
    
    return [...new Set(terms)];
  }

  searchHistoricalData(data, searchTerms) {
    return data.filter(customer => {
      const searchText = `${customer.customerName} ${customer.industry} ${customer.services?.join(' ')} ${customer.requirements?.keyFeatures?.join(' ')}`.toLowerCase();
      return searchTerms.some(term => searchText.includes(term));
    });
  }

  async callOpenAI(prompt, options = {}) {
    try {
      console.log('🤖 ConversationalAI: Starting OpenAI call...');
      
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OpenAI API key is not configured');
      }

      const model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
      const maxTokens = options.maxTokens || 800;

      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: model,
          messages: [
            {
              role: 'system',
              content: 'You are a helpful AI assistant for field service management software sales. Be conversational, specific, and actionable. Format responses with clear headers and bullet points for readability.'
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
          timeout: 25000
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
        statusText: error.response?.statusText
      });

      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        throw new Error('OpenAI request timed out. Please try again with a shorter message.');
      } else if (error.response?.status === 401) {
        throw new Error('OpenAI API key is invalid. Please check configuration.');
      } else if (error.response?.status === 429) {
        throw new Error('OpenAI rate limit exceeded. Please wait a moment and try again.');
      } else {
        throw new Error(`OpenAI service error: ${error.message}`);
      }
    }
  }
}

module.exports = ConversationalAIService;

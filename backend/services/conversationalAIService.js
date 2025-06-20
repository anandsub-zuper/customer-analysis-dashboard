// =====================================
// FIXED CONVERSATIONAL AI SERVICE
// All formatting issues resolved
// =====================================

const axios = require('axios');
const analysisService = require('./analysisService');

class ConversationalAIService {
  constructor() {
    this.conversationContexts = new Map();
    this.maxContexts = 1000;
    this.contextTTL = 24 * 60 * 60 * 1000; // 24 hours
    
    // Cleanup expired contexts every hour
    setInterval(() => this.cleanupExpiredContexts(), 60 * 60 * 1000);
  }

  // =====================================
  // EXISTING METHODS - UNCHANGED
  // =====================================

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
      
      // Get conversation context
      const context = await this.getContext(conversationId, analysisId);
      
      // Classify user intent
      const intent = await this.classifyIntent(query, context);
      
      // Determine target company for web enhancement
      let targetCompany = null;
      if (intent.externalCompany) {
        targetCompany = intent.externalCompany;
      } else if (context.analysisData?.customerName) {
        targetCompany = context.analysisData.customerName;
      }
      
      // Gather web enhancement if needed
      let enhancementData = null;
      if (this.shouldEnhanceWithWebData(query, intent, context)) {
        try {
          enhancementData = await this.gatherWebEnhancement(targetCompany, context.analysisData);
        } catch (error) {
          console.log('Web enhancement failed, continuing without it:', error.message);
        }
      }
      
      // Route to appropriate handler
      const response = await this.routeQuery(intent, query, context, enhancementData);
      
      // 🎯 FIXED: Enhanced formatting with better logic
      const formattedResponse = this.enhanceResponseFormatting(response, intent.type, context.analysisData, query);
      
      // Update conversation context
      await this.updateContext(conversationId, {
        userQuery: query,
        botResponse: formattedResponse,
        intent: intent.type,
        timestamp: new Date()
      });
      
      return {
        success: true,
        response: formattedResponse,
        intent: intent.type,
        context: context.analysisId ? 'analysis-aware' : 'general',
        webEnhanced: !!enhancementData,
        externalCompany: intent.externalCompany || null
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

  async getContext(conversationId, analysisId) {
    try {
      const context = {
        conversationId,
        analysisId,
        analysisData: null,
        conversationHistory: [],
        lastAccessed: Date.now()
      };

      if (analysisId) {
        try {
          console.log('Retrieving analysis for context:', analysisId);
          const analysis = await analysisService.getAnalysisById(analysisId);
          
          if (analysis) {
            context.analysisData = analysis;
            console.log('Retrieved analysis with fields:', Object.keys(analysis));
            console.log(`✅ Analysis loaded: ${analysis.customerName} (${analysis.industry})`);
          }
        } catch (error) {
          console.error('Error loading analysis for context:', error);
        }
      }

      if (conversationId && this.conversationContexts.has(conversationId)) {
        const existingContext = this.conversationContexts.get(conversationId);
        context.conversationHistory = existingContext.conversationHistory || [];
        existingContext.lastAccessed = Date.now();
      }

      return context;
    } catch (error) {
      console.error('Error getting context:', error);
      return {
        conversationId, analysisId, analysisData: null,
        conversationHistory: [], lastAccessed: Date.now()
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
      context.conversationHistory.push(update);
      context.lastAccessed = Date.now();

      if (context.conversationHistory.length > 10) {
        context.conversationHistory.shift();
      }
    } catch (error) {
      console.error('Error updating context:', error);
    }
  }

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

  async classifyIntent(query, context) {
    try {
      const ruleBasedResult = this.enhancedQuickRuleBasedCheck(query, context);
      if (ruleBasedResult) {
        console.log(`🚀 Rule-based classification: ${ruleBasedResult.type} (${ruleBasedResult.confidence})`);
        return ruleBasedResult;
      }

      const contextInfo = this.buildContextInfo(context);
      const prompt = `
Classify this user query into one of these categories:

CATEGORIES:
- ANALYSIS_QUESTION: Questions about specific analysis results, scores, recommendations, fit scores, scoring breakdown
- BUSINESS_MODEL: Questions about B2B/B2C, business model, customer types, revenue model
- COMPANY_RESEARCH: Questions about company information, characteristics, industry position
- SIMILAR_CUSTOMERS: Questions about similar customers or historical comparisons  
- EXTERNAL_COMPANY_RESEARCH: Questions about companies not in current analysis
- EXTERNAL_COMPANY_BUSINESS_MODEL: Business model questions about external companies
- NEXT_STEPS: Questions about what to do next, sales strategies, follow-up actions
- EMAIL_GENERATION: Requests to generate emails, proposals, or communications
- DATA_LOOKUP: Questions requiring lookup of specific data or customers
- EXPLANATION: Requests to explain general concepts, processes, or methodology
- GENERAL: General questions or conversation

CONTEXT: ${contextInfo}

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
      
      return this.strictValidateAndCorrect(intent, query, context);
    } catch (error) {
      console.error('Error classifying intent:', error);
      return this.fallbackIntentClassification(query, context);
    }
  }

  enhancedQuickRuleBasedCheck(query, context) {
    const queryLower = query.toLowerCase().trim();
    
    // External company detection
    const externalCompany = this.extractExternalCompanyName(query, context);
    if (externalCompany && !this.refersToCurrentCustomer(query)) {
      const isWebsiteQuery = queryLower.includes('website') || queryLower.includes('web');
      return {
        type: isWebsiteQuery ? 'EXTERNAL_COMPANY_RESEARCH' : 'EXTERNAL_COMPANY_BUSINESS_MODEL',
        confidence: 0.95,
        entities: [externalCompany],
        externalCompany: externalCompany,
        reasoning: `External company query detected: ${externalCompany}`
      };
    }
    
    // High-confidence rules for current customer analysis
    if (context.analysisId && context.analysisData) {
      // Fit score questions
      if ((queryLower.includes('fit') && queryLower.includes('score')) || 
          queryLower.includes('100%') || 
          queryLower.includes('getting a') && queryLower.includes('score')) {
        return {
          type: 'ANALYSIS_QUESTION',
          confidence: 0.95,
          entities: ['fit', 'score'],
          reasoning: 'Direct fit score question about current customer'
        };
      }
      
      // Replacement reasons - FIXED detection
      if (queryLower.includes('replacement reason') || 
          queryLower.includes('replacing') ||
          queryLower.includes('replace') ||
          queryLower.includes('current system') ||
          (queryLower.includes('what') && queryLower.includes('reason'))) {
        return {
          type: 'ANALYSIS_QUESTION',
          confidence: 0.95,
          entities: ['replacement', 'reasons'],
          reasoning: 'Question about system replacement reasons',
          subType: 'REPLACEMENT_REASONS' // Add subType for better routing
        };
      }
      
      // Similar customers - FIXED detection
      if (queryLower.includes('similar customer') || 
          queryLower.includes('who are the similar') ||
          queryLower.includes('similar companies')) {
        return {
          type: 'SIMILAR_CUSTOMERS',
          confidence: 0.95,
          entities: ['similar', 'customers'],
          reasoning: 'Question about similar customers'
        };
      }
      
      // Business model questions about current customer
      if (queryLower.includes('business model')) {
        return {
          type: 'BUSINESS_MODEL',
          confidence: 0.9,
          entities: ['business', 'model'],
          reasoning: 'Business model question about current customer'
        };
      }
    }
    
    // General patterns
    if (queryLower.includes('next step') || queryLower.includes('what should')) {
      return {
        type: 'NEXT_STEPS',
        confidence: 0.8,
        entities: ['next', 'steps'],
        reasoning: 'Next steps or strategy question'
      };
    }
    
    if (queryLower.includes('email') || queryLower.includes('write') || queryLower.includes('generate')) {
      return {
        type: 'EMAIL_GENERATION',
        confidence: 0.8,
        entities: ['email'],
        reasoning: 'Email generation request'
      };
    }
    
    return null;
  }

  extractExternalCompanyName(query, context) {
    const queryLower = query.toLowerCase();
    const currentCustomer = context.analysisData?.customerName?.toLowerCase();
    
    if (currentCustomer && queryLower.includes(currentCustomer)) {
      return null;
    }
    
    const companyPatterns = [
      /(?:what about|tell me about|analyze|research)\s+([A-Z][a-zA-Z\s&.-]+(?:Inc|LLC|Corp|Company|Ltd)?)/i,
      /([A-Z][a-zA-Z\s&.-]+(?:Inc|LLC|Corp|Company|Ltd))\s+(?:business model|website|company)/i,
      /([A-Z][a-zA-Z]{2,}(?:\s+[A-Z][a-zA-Z]{2,})*)\s+(?:vs|versus|compared to)/i
    ];
    
    for (const pattern of companyPatterns) {
      const match = query.match(pattern);
      if (match && match[1]) {
        const company = match[1].trim();
        if (company.length > 2 && company.length < 50 && 
            /^[A-Z]/.test(company) && 
            !['What', 'How', 'When', 'Where', 'Why', 'Can', 'Could', 'Should'].includes(company)) {
          return company;
        }
      }
    }
    
    return null;
  }

  buildContextInfo(context) {
    if (context.analysisData) {
      return `User is viewing analysis for: ${context.analysisData.customerName} (${context.analysisData.industry}, ${context.analysisData.fitScore}% fit score)`;
    }
    return 'No specific customer analysis loaded';
  }

  strictValidateAndCorrect(intent, query, context) {
    try {
      const externalCompany = this.extractExternalCompanyName(query, context);
      if (externalCompany && !['EXTERNAL_COMPANY_RESEARCH', 'EXTERNAL_COMPANY_BUSINESS_MODEL'].includes(intent.type)) {
        const isWebsiteQuery = query.toLowerCase().includes('website');
        intent.type = isWebsiteQuery ? 'EXTERNAL_COMPANY_RESEARCH' : 'EXTERNAL_COMPANY_BUSINESS_MODEL';
        intent.externalCompany = externalCompany;
        intent.confidence = Math.max(0.8, intent.confidence);
      }
      
      if (!intent.type || typeof intent.confidence !== 'number') {
        throw new Error('Invalid intent structure');
      }
      
      return intent;
    } catch (error) {
      console.error('Error validating intent:', error);
      return this.fallbackIntentClassification(query, context);
    }
  }

  fallbackIntentClassification(query, context) {
    const queryLower = query.toLowerCase();
    
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
    
    if (queryLower.includes('similar customer')) {
      return { type: 'SIMILAR_CUSTOMERS', confidence: 0.8, entities: [], requiresAnalysisData: true };
    }
    
    if (queryLower.includes('next step') || queryLower.includes('strategy')) {
      return { type: 'NEXT_STEPS', confidence: 0.8, entities: [], requiresAnalysisData: true };
    }
    
    if (queryLower.includes('email') || queryLower.includes('generate')) {
      return { type: 'EMAIL_GENERATION', confidence: 0.8, entities: [], requiresAnalysisData: true };
    }
    
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

  shouldEnhanceWithWebData(query, intent, context) {
    const WEB_ENHANCEMENT_ENABLED = process.env.WEB_ENHANCEMENT_ENABLED !== 'false';
    if (!WEB_ENHANCEMENT_ENABLED) return false;
    
    const enhanceableTypes = [
      'EXTERNAL_COMPANY_RESEARCH', 
      'EXTERNAL_COMPANY_BUSINESS_MODEL',
      'BUSINESS_MODEL',
      'COMPANY_RESEARCH'
    ];
    
    return enhanceableTypes.includes(intent.type);
  }

  async gatherWebEnhancement(targetCompany, analysisData) {
    return null;
  }

  async routeQuery(intent, query, context, enhancementData = null) {
    switch (intent.type) {
      case 'ANALYSIS_QUESTION':
        return await this.handleAnalysisQuestion(query, context);
      
      case 'BUSINESS_MODEL':
        return await this.handleBusinessModel(query, context, enhancementData);
      
      case 'COMPANY_RESEARCH':
        return await this.handleCompanyResearch(query, context, enhancementData);
      
      case 'EXTERNAL_COMPANY_RESEARCH':
        return await this.handleExternalCompanyResearch(query, context, intent.externalCompany, enhancementData);
      
      case 'EXTERNAL_COMPANY_BUSINESS_MODEL':
        return await this.handleExternalCompanyBusinessModel(query, context, intent.externalCompany, enhancementData);
      
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

  async handleAnalysisQuestion(query, context) {
    if (!context.analysisData) {
      return "I need analysis data to answer that question. Please make sure you're viewing a specific customer analysis.";
    }

    const analysisData = context.analysisData;

    const prompt = `
You are analyzing a SPECIFIC customer's situation. Use their ACTUAL data to give precise, factual answers.

CUSTOMER: ${analysisData.customerName}
INDUSTRY: ${analysisData.industry}
FIT SCORE: ${analysisData.fitScore}%
USERS: ${analysisData.userCount?.total || 'Not specified'} total (${analysisData.userCount?.field || 'Not specified'} field workers)

CURRENT STATE & SYSTEMS:
${JSON.stringify(analysisData.currentState, null, 2)}

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

Focus ONLY on answering their specific question. Do not include unrelated information.

If asked about fit score, explain using the scoring breakdown.
If asked about replacement reasons, use currentState, challenges, and requirements data.
If asked about current systems, reference currentSystems and currentState.
If asked about timeline, use the timeline data.
If asked about budget, use the budget data.

Be specific, factual, and data-driven. Use their actual company details and real information.`;

    return await this.callOpenAI(prompt);
  }

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

Focus ONLY on similar customers analysis. Do not include fit score or other unrelated information.

Be conversational and actionable.`;

    return await this.callOpenAI(prompt);
  }

  // [Other handler methods remain the same - handleBusinessModel, handleCompanyResearch, etc.]

  async handleBusinessModel(query, context, enhancementData = null) {
    const analysisData = context.analysisData;
    
    const prompt = `
Provide comprehensive business model analysis for ${analysisData.customerName}.

INTERNAL ANALYSIS:
${JSON.stringify({
      customerName: analysisData.customerName,
      industry: analysisData.industry,
      services: analysisData.services,
      requirements: analysisData.requirements,
      userCount: analysisData.userCount,
      currentState: analysisData.currentState
    }, null, 2)}

${enhancementData ? `
WEB INTELLIGENCE:
${JSON.stringify(enhancementData, null, 2)}
` : 'No web intelligence available.'}

USER QUESTION: "${query}"

Focus ONLY on business model analysis. Do not include unrelated information.

Provide comprehensive business model analysis using available data.`;

    return await this.callOpenAI(prompt, { maxTokens: 1200 });
  }

  async handleCompanyResearch(query, context, enhancementData = null) {
    const analysisData = context.analysisData;
    
    const prompt = `
Provide comprehensive company intelligence for ${analysisData.customerName}.

INTERNAL ANALYSIS:
${JSON.stringify({
      customerName: analysisData.customerName,
      industry: analysisData.industry,
      userCount: analysisData.userCount,
      currentState: analysisData.currentState,
      fitScore: analysisData.fitScore
    }, null, 2)}

${enhancementData ? `
WEB INTELLIGENCE:
${JSON.stringify(enhancementData, null, 2)}
` : 'No web intelligence available.'}

USER QUESTION: "${query}"

Focus ONLY on company research. Do not include unrelated information.

Provide detailed company profile combining internal analysis with available web intelligence.`;

    return await this.callOpenAI(prompt, { maxTokens: 1000 });
  }

  async handleExternalCompanyResearch(query, context, externalCompany, enhancementData = null) {
    const prompt = `
Research and analyze ${externalCompany} as requested.

${enhancementData ? `WEB INTELLIGENCE:
${JSON.stringify(enhancementData, null, 2)}` : 'Limited research data available.'}

USER QUESTION: "${query}"

Focus ONLY on ${externalCompany} research. Do not include unrelated information.

Provide company research and analysis for ${externalCompany}.`;

    return await this.callOpenAI(prompt, { maxTokens: 1000 });
  }

  async handleExternalCompanyBusinessModel(query, context, externalCompany, enhancementData = null) {
    const prompt = `
Analyze the business model for ${externalCompany}.

${enhancementData ? `WEB INTELLIGENCE:
${JSON.stringify(enhancementData, null, 2)}` : 'Limited business model data available.'}

USER QUESTION: "${query}"

Focus ONLY on ${externalCompany} business model. Do not include unrelated information.

Provide business model analysis for ${externalCompany}.`;

    return await this.callOpenAI(prompt, { maxTokens: 1000 });
  }

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

Focus ONLY on next steps and strategy. Do not include unrelated information.

Provide specific, actionable next steps. Include:
- Immediate actions (next 1-2 days)
- Short-term strategy (next 1-2 weeks) 
- Key talking points for next conversation
- Potential objections and how to handle them
- Timeline recommendations

Be practical and sales-focused.`;

    return await this.callOpenAI(prompt);
  }

  async handleEmailGeneration(query, context) {
    const analysisData = context.analysisData;
    if (!analysisData) {
      return "I need customer analysis data to generate a personalized email. Please view a specific analysis first.";
    }

    const emailType = this.detectEmailType(query);
    
    const prompt = `
Generate a professional, personalized ${emailType} email.

CUSTOMER ANALYSIS:
${JSON.stringify({
      customerName: analysisData.customerName,
      industry: analysisData.industry,
      fitScore: analysisData.fitScore,
      currentSystems: analysisData.currentState?.currentSystems,
      keyRequirements: analysisData.requirements?.keyFeatures,
      timeline: analysisData.timeline
    }, null, 2)}

USER REQUEST: "${query}"

Focus ONLY on email generation. Do not include unrelated information.

Generate a complete email including subject line and body. Make it specific to their situation.`;

    return await this.callOpenAI(prompt);
  }

  detectEmailType(query) {
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('follow') || queryLower.includes('follow-up')) {
      return 'Follow-up';
    }
    if (queryLower.includes('intro') || queryLower.includes('introduction')) {
      return 'Introduction';
    }
    if (queryLower.includes('demo') || queryLower.includes('meeting')) {
      return 'Demo Request';
    }
    if (queryLower.includes('proposal')) {
      return 'Proposal';
    }
    
    return 'Follow-up';
  }

  async handleDataLookup(query, context) {
    const prompt = `
Handle data lookup request using available information.

${context.analysisData ? `
CURRENT ANALYSIS:
Customer: ${context.analysisData.customerName}
Industry: ${context.analysisData.industry}
Fit Score: ${context.analysisData.fitScore}%
` : 'No specific analysis loaded.'}

USER QUESTION: "${query}"

Focus ONLY on data lookup. Do not include unrelated information.

Provide specific data lookup results.`;

    return await this.callOpenAI(prompt);
  }

  async handleExplanation(query, context) {
    const prompt = `
You are an expert in field service management software and sales processes.
Explain concepts clearly with practical insights.

USER QUESTION: "${query}"

Focus ONLY on explaining the requested concept. Do not include unrelated information.

Provide a comprehensive explanation including definition, importance, examples, and practical applications.`;

    return await this.callOpenAI(prompt);
  }

  async handleGeneralQuery(query, context) {
    const prompt = `
You are a helpful AI assistant for a field service management software company.

${context.analysisData ? 
  `You're currently viewing analysis for **${context.analysisData.customerName}** (${context.analysisData.industry})` : 
  'No specific customer analysis is currently loaded.'}

USER QUERY: "${query}"

Provide a helpful response and suggest specific ways you can assist with customer analysis tasks.`;

    return await this.callOpenAI(prompt);
  }

  // =====================================
  // 🔧 FIXED FORMATTING ENHANCEMENT METHODS
  // =====================================

  enhanceResponseFormatting(response, intentType, analysisData, originalQuery) {
    const ENABLE_ENHANCED_FORMATTING = process.env.ENABLE_ENHANCED_FORMATTING !== 'false';
    
    if (!ENABLE_ENHANCED_FORMATTING || !response || typeof response !== 'string') {
      return response;
    }
    
    try {
      // Clean up the response first
      const cleanedResponse = this.cleanResponse(response);
      
      // Apply specific formatting based on question type and query
      switch (intentType) {
        case 'ANALYSIS_QUESTION':
          return this.formatAnalysisResponseFixed(cleanedResponse, analysisData, originalQuery);
        case 'BUSINESS_MODEL':
          return this.formatBusinessModelResponseFixed(cleanedResponse, analysisData);
        case 'SIMILAR_CUSTOMERS':
          return this.formatSimilarCustomersResponseFixed(cleanedResponse, analysisData);
        case 'NEXT_STEPS':
          return this.formatNextStepsResponseFixed(cleanedResponse, analysisData);
        case 'EMAIL_GENERATION':
          return this.formatEmailResponseFixed(cleanedResponse, analysisData);
        case 'COMPANY_RESEARCH':
        case 'EXTERNAL_COMPANY_RESEARCH':
          return this.formatCompanyResearchResponseFixed(cleanedResponse, analysisData);
        default:
          return this.formatGenericResponseFixed(cleanedResponse);
      }
    } catch (error) {
      console.error('Error enhancing response formatting:', error);
      return response;
    }
  }

  // FIXED: Clean response to remove duplicates and broken formatting
  cleanResponse(response) {
    if (!response) return response;
    
    // Remove duplicate sentences
    const sentences = response.split(/[.!?]\s+/);
    const uniqueSentences = [...new Set(sentences)];
    
    return uniqueSentences
      .join('. ')
      .replace(/\.\s*\./g, '.') // Fix double periods
      .replace(/\n\n+/g, '\n\n') // Clean up excessive line breaks
      .replace(/\*\*\s*\*\*/g, '') // Remove empty bold tags
      .replace(/^\s+|\s+$/g, '') // Trim whitespace
      .replace(/([A-Z][a-z]+)\n([A-Z][a-z]+)/g, '$1 $2') // Fix broken company names
      .trim();
  }

  // FIXED: Analysis response formatting with proper sub-type detection
  formatAnalysisResponseFixed(response, analysisData, originalQuery) {
    if (!response) return response;
    
    const queryLower = originalQuery.toLowerCase();
    
    // Detect specific sub-type based on original query
    if (queryLower.includes('replacement reason') || 
        queryLower.includes('replacing') ||
        queryLower.includes('replace')) {
      return this.formatReplacementReasonsResponseFixed(response, analysisData);
    }
    
    if (queryLower.includes('fit score') || 
        queryLower.includes('100%') || 
        queryLower.includes('score')) {
      return this.formatFitScoreResponseFixed(response, analysisData);
    }
    
    // Default analysis formatting
    return `## 🎯 Analysis Insight\n\n${this.addStructuredContent(response, analysisData)}`;
  }

  // FIXED: Fit score response formatting - no duplicates
  formatFitScoreResponseFixed(response, analysisData) {
    const fitScore = analysisData?.fitScore || 'Unknown';
    const company = analysisData?.customerName || 'Customer';
    
    // Extract key components from response
    const components = this.extractScoreComponents(response, analysisData);
    
    return `## 🎯 Fit Score Analysis: ${fitScore}%

### Score Breakdown
${this.getScoreAssessment(fitScore)} **${this.getScoreCategory(fitScore)} Fit**

${components.scoreBreakdown}

### Key Factors
${components.keyFactors}

${components.scoreContext}`;
  }

  // FIXED: Replacement reasons response formatting - focused content
  formatReplacementReasonsResponseFixed(response, analysisData) {
    const company = analysisData?.customerName || 'Customer';
    
    // Extract replacement-specific content
    const replacementInfo = this.extractReplacementInfo(response, analysisData);
    
    return `## 🔄 Current System Analysis

### ${company}'s Current Situation
${replacementInfo.currentSystems}

### 🎯 Replacement Drivers
${replacementInfo.replacementReasons}

### 💰 Business Impact
${replacementInfo.businessImpact}

### ✅ Success Criteria for New Solution
${replacementInfo.successCriteria}`;
  }

  // FIXED: Similar customers formatting with proper data extraction
  formatSimilarCustomersResponseFixed(response, analysisData) {
    const similarCustomers = analysisData?.similarCustomers || [];
    
    if (similarCustomers.length === 0) {
      return `## 👥 Similar Customer Analysis

No similar customers data is available for this analysis.`;
    }
    
    // Format each customer properly
    const formattedCustomers = this.formatCustomerCards(similarCustomers);
    const summary = this.generateSimilarCustomersSummary(similarCustomers);
    
    return `## 👥 Similar Customer Analysis

${formattedCustomers}

## 🎯 Strategic Implications

${summary}`;
  }

  // FIXED: Helper methods for data extraction

  extractScoreComponents(response, analysisData) {
    const scoreBreakdown = this.buildScoreBreakdown(analysisData);
    const keyFactors = this.extractKeyFactorsFromResponse(response);
    const scoreContext = this.buildScoreContext(analysisData);
    
    return { scoreBreakdown, keyFactors, scoreContext };
  }

  buildScoreBreakdown(analysisData) {
    if (!analysisData?.scoreBreakdown) {
      return '**Score Components:**\n• Industry alignment and operational fit assessment applied';
    }
    
    const breakdown = [];
    const sb = analysisData.scoreBreakdown;
    
    if (sb.baseScore) breakdown.push(`• **Base Score:** ${sb.baseScore}`);
    if (sb.industryBonus) breakdown.push(`• **Industry Bonus:** +${sb.industryBonus} (${analysisData.industry} preferred)`);
    if (sb.fieldWorkerBonus) breakdown.push(`• **Field Worker Bonus:** +${sb.fieldWorkerBonus} (${analysisData.userCount?.field || 'High'} field workers)`);
    if (sb.requirementsBonus) breakdown.push(`• **Requirements Bonus:** +${sb.requirementsBonus} (core features aligned)`);
    if (sb.finalScore) breakdown.push(`• **Final Score:** ${sb.finalScore}%`);
    
    return `**Score Components:**\n${breakdown.join('\n')}`;
  }

  extractKeyFactorsFromResponse(response) {
    // Extract bullet points or create from key phrases
    const bullets = response.match(/[•\-*]\s*(.+)/g);
    if (bullets && bullets.length > 0) {
      return bullets.slice(0, 5).join('\n'); // Limit to 5 key factors
    }
    
    // If no bullets, extract key phrases
    const keyPhrases = [
      'Industry alignment',
      'Field worker ratio',
      'Requirements match',
      'Platform strengths'
    ];
    
    return keyPhrases.map(phrase => `• ${phrase} assessment applied`).join('\n');
  }

  buildScoreContext(analysisData) {
    if (!analysisData) return '';
    
    const context = [];
    context.push(`**Industry:** ${analysisData.industry || 'Not specified'}`);
    context.push(`**Team:** ${analysisData.userCount?.total || 'Not specified'} total (${analysisData.userCount?.field || 'Unknown'} field workers)`);
    
    if (analysisData.userCount?.field && analysisData.userCount?.total) {
      const ratio = Math.round((analysisData.userCount.field / analysisData.userCount.total) * 100);
      context.push(`**Field Ratio:** ${ratio}% (${ratio >= 70 ? 'Excellent' : ratio >= 50 ? 'Good' : 'Moderate'} for field service)`);
    }
    
    return `\n### Customer Profile\n${context.join('\n')}`;
  }

  extractReplacementInfo(response, analysisData) {
    const currentSystems = this.buildCurrentSystemsList(analysisData);
    const replacementReasons = this.extractReplacementReasons(response, analysisData);
    const businessImpact = this.buildBusinessImpactList(analysisData);
    const successCriteria = this.buildSuccessCriteria(analysisData);
    
    return { currentSystems, replacementReasons, businessImpact, successCriteria };
  }

  buildCurrentSystemsList(analysisData) {
    if (!analysisData?.currentState?.currentSystems) {
      return 'Current systems information not available in analysis.';
    }
    
    const systems = analysisData.currentState.currentSystems.map(sys => {
      const issues = sys.replacementReasons?.length > 0 ? 
        `\n  **Issues:** ${sys.replacementReasons.join(', ')}` : '';
      const description = sys.description ? `\n  **Usage:** ${sys.description}` : '';
      
      return `**${sys.name}**${description}${issues}`;
    });
    
    return systems.join('\n\n');
  }

  extractReplacementReasons(response, analysisData) {
    // Try to get from analysis data first
    if (analysisData?.currentState?.currentSystems) {
      const allReasons = analysisData.currentState.currentSystems
        .flatMap(sys => sys.replacementReasons || [])
        .filter(Boolean);
      
      if (allReasons.length > 0) {
        return allReasons.map(reason => `• ${reason}`).join('\n');
      }
    }
    
    // Fallback to extracting from response
    const reasonPattern = /reason[s]?[:\-]\s*(.+?)(?:\n|$)/gi;
    const matches = [...response.matchAll(reasonPattern)];
    
    if (matches.length > 0) {
      return matches.map(match => `• ${match[1].trim()}`).join('\n');
    }
    
    return '• Unmanageable processes\n• Lack of field management capabilities\n• Need for better real-time tracking';
  }

  buildBusinessImpactList(analysisData) {
    const impacts = [
      'Manual processes reducing operational efficiency',
      'Limited visibility into field operations',
      'Difficulty coordinating field technicians',
      'Time-consuming administrative tasks'
    ];
    
    return impacts.map(impact => `• ${impact}`).join('\n');
  }

  buildSuccessCriteria(analysisData) {
    const criteria = [
      'Real-time technician tracking and job status',
      'Automated work order management',
      'Mobile app for field technicians',
      'Integrated reporting and analytics'
    ];
    
    if (analysisData?.requirements?.keyFeatures) {
      // Use actual requirements if available
      return analysisData.requirements.keyFeatures.map(req => `• ${req}`).join('\n');
    }
    
    return criteria.map(criterion => `• ${criterion}`).join('\n');
  }

  formatCustomerCards(similarCustomers) {
    // Filter out invalid entries
    const validCustomers = similarCustomers.filter(customer => 
      customer.name && 
      customer.name.length > 1 && 
      customer.name !== 'Yes' &&
      !customer.name.includes('\n')
    );
    
    if (validCustomers.length === 0) {
      return 'No valid similar customers found in the analysis data.';
    }
    
    return validCustomers.map((customer, index) => {
      const cleanName = customer.name.replace(/\n/g, ' ').trim();
      const matchPercentage = customer.matchPercentage || customer.match || 0;
      const industry = customer.industry || 'Not specified';
      
      const whySimilar = customer.matchReasons?.length > 0 ? 
        customer.matchReasons.map(reason => `• ${reason}`).join('\n') :
        `• Similar industry or operational model\n• Comparable business characteristics`;
      
      const keyLearnings = customer.keyLearnings?.length > 0 ?
        customer.keyLearnings.map(learning => `💡 ${learning}`).join('\n') :
        `💡 Standard implementation approach\n💡 Typical field service requirements`;
      
      const implementationInfo = this.buildImplementationInfo(customer);
      
      return `### ${index + 1}. ${cleanName}
**Industry:** ${industry} | **Match:** ${matchPercentage}%

**Why Similar:**
${whySimilar}

${implementationInfo}

**Key Learnings:**
${keyLearnings}

---`;
    }).join('\n');
  }

  buildImplementationInfo(customer) {
    const info = [];
    
    if (customer.implementation?.arr) {
      info.push(`**ARR:** ${customer.implementation.arr}`);
    }
    
    if (customer.implementation?.health) {
      info.push(`**Health:** ${customer.implementation.health}`);
    }
    
    if (customer.implementation?.timeline) {
      info.push(`**Timeline:** ${customer.implementation.timeline}`);
    }
    
    return info.length > 0 ? `**Implementation Insights:**\n• ${info.join('\n• ')}\n` : '';
  }

  generateSimilarCustomersSummary(similarCustomers) {
    const validCustomers = similarCustomers.filter(c => c.name && c.name !== 'Yes');
    const count = validCustomers.length;
    
    if (count === 0) return 'No similar customers available for analysis.';
    
    const avgMatch = Math.round(
      validCustomers.reduce((sum, c) => sum + (c.matchPercentage || c.match || 0), 0) / count
    );
    
    const industries = [...new Set(validCustomers.map(c => c.industry).filter(Boolean))];
    
    return `### Analysis Summary
Found **${count}** similar customers with **${avgMatch}%** average match rate.

**Industry Distribution:** ${industries.join(', ') || 'Various industries'}

### Key Recommendations
• Reference success stories from similar implementations
• Apply lessons learned from comparable customer experiences  
• Focus on proven value propositions for similar business models
• Leverage implementation best practices from this customer segment`;
  }

  getScoreAssessment(fitScore) {
    if (fitScore >= 80) return '✅';
    if (fitScore >= 60) return '🟢';
    if (fitScore >= 40) return '🟡';
    return '🔴';
  }

  getScoreCategory(fitScore) {
    if (fitScore >= 80) return 'Excellent';
    if (fitScore >= 60) return 'Good';
    if (fitScore >= 40) return 'Moderate';
    return 'Poor';
  }

  // FIXED: Other formatting methods
  formatBusinessModelResponseFixed(response, analysisData) {
    const company = analysisData?.customerName || 'Company';
    
    return `## 🏢 Business Model Analysis

### ${company} Profile
${this.addStructuredContent(response, analysisData)}`;
  }

  formatNextStepsResponseFixed(response, analysisData) {
    const company = analysisData?.customerName || 'Customer';
    
    return `## 🎯 Strategic Next Steps

### ${company} Action Plan
${this.addStructuredContent(response, analysisData)}`;
  }

  formatEmailResponseFixed(response, analysisData) {
    if (response.includes('Subject:') || response.includes('Dear ')) {
      return `## 📧 Generated Email

${response}`;
    }
    
    return `## 📧 Email Content

${this.addStructuredContent(response, analysisData)}`;
  }

  formatCompanyResearchResponseFixed(response, analysisData) {
    return `## 🏢 Company Intelligence

${this.addStructuredContent(response, analysisData)}`;
  }

  formatGenericResponseFixed(response) {
    return `## 💬 Response

${this.addStructuredContent(response)}`;
  }

  addStructuredContent(response, analysisData = null) {
    return response
      .replace(/\n\n+/g, '\n\n')
      .replace(/([.!?])\s+([A-Z])/g, '$1\n\n$2')
      .trim();
  }

  // =====================================
  // EXISTING OPENAI METHOD - UNCHANGED
  // =====================================

  async callOpenAI(prompt, options = {}) {
    try {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) throw new Error('OpenAI API key is not configured');

      const model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
      const maxTokens = options.maxTokens || 800;

      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: model,
          messages: [
            {
              role: 'system',
              content: 'You are a helpful AI assistant for field service management software sales. Be conversational, specific, and actionable. Focus only on answering the specific question asked. Use the specific customer data provided in prompts.'
            },
            { role: 'user', content: prompt }
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

      if (!response.data || !response.data.choices || !response.data.choices[0]) {
        throw new Error('Invalid OpenAI response structure');
      }

      return response.data.choices[0].message.content;
      
    } catch (error) {
      console.error('❌ ConversationalAI: OpenAI call failed:', {
        message: error.message,
        status: error.response?.status
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

module.exports = new ConversationalAIService();

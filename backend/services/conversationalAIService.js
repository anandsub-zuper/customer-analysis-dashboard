// =====================================
// COMPLETE CONVERSATIONAL AI SERVICE
// Enhanced formatting with zero regressions
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
      
      // Get conversation context (UNCHANGED)
      const context = await this.getContext(conversationId, analysisId);
      
      // Classify user intent (UNCHANGED)
      const intent = await this.classifyIntent(query, context);
      
      // Determine target company for web enhancement (UNCHANGED)
      let targetCompany = null;
      if (intent.externalCompany) {
        targetCompany = intent.externalCompany;
      } else if (context.analysisData?.customerName) {
        targetCompany = context.analysisData.customerName;
      }
      
      // Gather web enhancement if needed (UNCHANGED)
      let enhancementData = null;
      if (this.shouldEnhanceWithWebData(query, intent, context)) {
        try {
          enhancementData = await this.gatherWebEnhancement(targetCompany, context.analysisData);
        } catch (error) {
          console.log('Web enhancement failed, continuing without it:', error.message);
        }
      }
      
      // Route to appropriate handler (UNCHANGED)
      const response = await this.routeQuery(intent, query, context, enhancementData);
      
      // 🎯 NEW: Enhance formatting (SAFE - with fallback)
      const formattedResponse = this.enhanceResponseFormatting(response, intent.type, context.analysisData);
      
      // Update conversation context (UNCHANGED)
      await this.updateContext(conversationId, {
        userQuery: query,
        botResponse: formattedResponse,
        intent: intent.type,
        timestamp: new Date()
      });
      
      // Return same structure (UNCHANGED)
      return {
        success: true,
        response: formattedResponse, // Only change: enhanced formatting
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

      // Get analysis data if analysisId provided
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

      // Get conversation history
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

      // Keep only last 10 exchanges
      if (context.conversationHistory.length > 10) {
        context.conversationHistory.shift();
      }
    } catch (error) {
      console.error('Error updating context:', error);
    }
  }

  // Current customer reference detection
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
      // Quick rule-based check first
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
      
      // Replacement reasons
      if (queryLower.includes('replacement reason') || 
          (queryLower.includes('why') && (queryLower.includes('replacing') || queryLower.includes('replace')))) {
        return {
          type: 'ANALYSIS_QUESTION',
          confidence: 0.9,
          entities: ['replacement', 'reasons'],
          reasoning: 'Question about system replacement reasons'
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
      
      // Similar customers
      if (queryLower.includes('similar customer')) {
        return {
          type: 'SIMILAR_CUSTOMERS',
          confidence: 0.9,
          entities: ['similar', 'customers'],
          reasoning: 'Question about similar customers'
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
    
    return null; // No rule-based match found
  }

  extractExternalCompanyName(query, context) {
    const queryLower = query.toLowerCase();
    const currentCustomer = context.analysisData?.customerName?.toLowerCase();
    
    // Skip if clearly referring to current customer
    if (currentCustomer && queryLower.includes(currentCustomer)) {
      return null;
    }
    
    // Look for company name patterns
    const companyPatterns = [
      /(?:what about|tell me about|analyze|research)\s+([A-Z][a-zA-Z\s&.-]+(?:Inc|LLC|Corp|Company|Ltd)?)/i,
      /([A-Z][a-zA-Z\s&.-]+(?:Inc|LLC|Corp|Company|Ltd))\s+(?:business model|website|company)/i,
      /([A-Z][a-zA-Z]{2,}(?:\s+[A-Z][a-zA-Z]{2,})*)\s+(?:vs|versus|compared to)/i
    ];
    
    for (const pattern of companyPatterns) {
      const match = query.match(pattern);
      if (match && match[1]) {
        const company = match[1].trim();
        // Validate it looks like a company name
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
      // Check for external company that wasn't caught by rules
      const externalCompany = this.extractExternalCompanyName(query, context);
      if (externalCompany && !['EXTERNAL_COMPANY_RESEARCH', 'EXTERNAL_COMPANY_BUSINESS_MODEL'].includes(intent.type)) {
        const isWebsiteQuery = query.toLowerCase().includes('website');
        intent.type = isWebsiteQuery ? 'EXTERNAL_COMPANY_RESEARCH' : 'EXTERNAL_COMPANY_BUSINESS_MODEL';
        intent.externalCompany = externalCompany;
        intent.confidence = Math.max(0.8, intent.confidence);
      }
      
      // Validate required fields
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

  shouldEnhanceWithWebData(query, intent, context) {
    // Check if web enhancement is enabled
    const WEB_ENHANCEMENT_ENABLED = process.env.WEB_ENHANCEMENT_ENABLED !== 'false';
    if (!WEB_ENHANCEMENT_ENABLED) return false;
    
    // Types that benefit from web enhancement
    const enhanceableTypes = [
      'EXTERNAL_COMPANY_RESEARCH', 
      'EXTERNAL_COMPANY_BUSINESS_MODEL',
      'BUSINESS_MODEL',
      'COMPANY_RESEARCH'
    ];
    
    return enhanceableTypes.includes(intent.type);
  }

  async gatherWebEnhancement(targetCompany, analysisData) {
    // Web enhancement logic would go here
    // For now, return null to avoid external dependencies
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

If asked about fit score, explain using the scoring breakdown.
If asked about replacement reasons, use currentState, challenges, and requirements data.
If asked about current systems, reference currentSystems and currentState.
If asked about timeline, use the timeline data.
If asked about budget, use the budget data.

Be specific, factual, and data-driven. Use their actual company details and real information.`;

    return await this.callOpenAI(prompt);
  }

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

Provide detailed company profile combining internal analysis with available web intelligence.`;

    return await this.callOpenAI(prompt, { maxTokens: 1000 });
  }

  async handleExternalCompanyResearch(query, context, externalCompany, enhancementData = null) {
    const prompt = `
Research and analyze ${externalCompany} as requested.

${enhancementData ? `WEB INTELLIGENCE:
${JSON.stringify(enhancementData, null, 2)}` : 'Limited research data available.'}

USER QUESTION: "${query}"

Provide company research and analysis for ${externalCompany}.`;

    return await this.callOpenAI(prompt, { maxTokens: 1000 });
  }

  async handleExternalCompanyBusinessModel(query, context, externalCompany, enhancementData = null) {
    const prompt = `
Analyze the business model for ${externalCompany}.

${enhancementData ? `WEB INTELLIGENCE:
${JSON.stringify(enhancementData, null, 2)}` : 'Limited business model data available.'}

USER QUESTION: "${query}"

Provide business model analysis for ${externalCompany}.`;

    return await this.callOpenAI(prompt, { maxTokens: 1000 });
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

Be conversational and actionable.`;

    return await this.callOpenAI(prompt);
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

Provide specific data lookup results.`;

    return await this.callOpenAI(prompt);
  }

  async handleExplanation(query, context) {
    const prompt = `
You are an expert in field service management software and sales processes.
Explain concepts clearly with practical insights.

USER QUESTION: "${query}"

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
  // 🆕 NEW FORMATTING ENHANCEMENT METHODS
  // =====================================

  enhanceResponseFormatting(response, intentType, analysisData) {
    // Feature flag for safe rollout
    const ENABLE_ENHANCED_FORMATTING = process.env.ENABLE_ENHANCED_FORMATTING !== 'false';
    
    if (!ENABLE_ENHANCED_FORMATTING || !response || typeof response !== 'string') {
      return response; // Return original if disabled or invalid
    }
    
    try {
      // Apply specific formatting based on question type
      switch (intentType) {
        case 'ANALYSIS_QUESTION':
          return this.formatAnalysisResponse(response, analysisData);
        case 'BUSINESS_MODEL':
          return this.formatBusinessModelResponse(response, analysisData);
        case 'SIMILAR_CUSTOMERS':
          return this.formatSimilarCustomersResponse(response, analysisData);
        case 'NEXT_STEPS':
          return this.formatNextStepsResponse(response, analysisData);
        case 'EMAIL_GENERATION':
          return this.formatEmailResponse(response, analysisData);
        case 'COMPANY_RESEARCH':
        case 'EXTERNAL_COMPANY_RESEARCH':
          return this.formatCompanyResearchResponse(response, analysisData);
        default:
          return this.formatGenericResponse(response);
      }
    } catch (error) {
      console.error('Error enhancing response formatting:', error);
      return response; // Fallback to original on any error
    }
  }

  formatAnalysisResponse(response, analysisData) {
    if (!response) return response;
    
    const responseLower = response.toLowerCase();
    
    if (responseLower.includes('fit score') || responseLower.includes('100%')) {
      return this.formatFitScoreResponse(response, analysisData);
    }
    
    if (responseLower.includes('replacement reason') || responseLower.includes('current system')) {
      return this.formatReplacementReasonsResponse(response, analysisData);
    }
    
    // Default analysis formatting
    return `## 🎯 Analysis Insight\n\n${this.addBasicStructure(response)}`;
  }

  formatFitScoreResponse(response, analysisData) {
    const fitScore = analysisData?.fitScore || 'Unknown';
    const company = analysisData?.customerName || 'Customer';
    
    return `## 🎯 Fit Score Analysis: ${fitScore}%

### Overview
${this.extractMainContent(response)}

${analysisData ? this.addScoreContext(analysisData) : ''}

### Key Factors
${this.extractBulletPoints(response)}`;
  }

  formatReplacementReasonsResponse(response, analysisData) {
    const company = analysisData?.customerName || 'Customer';
    
    return `## 🔄 Current System Analysis

### ${company}'s Current Situation
${this.extractMainContent(response)}

${analysisData ? this.addSystemsContext(analysisData) : ''}

### Replacement Drivers
${this.extractBulletPoints(response)}`;
  }

  formatBusinessModelResponse(response, analysisData) {
    const company = analysisData?.customerName || 'Company';
    
    return `## 🏢 Business Model Analysis

### ${company} Profile
${this.extractMainContent(response)}

${analysisData ? this.addBusinessContext(analysisData) : ''}`;
  }

  formatSimilarCustomersResponse(response, analysisData) {
    return `## 👥 Similar Customer Analysis

${this.addBasicStructure(response)}

${analysisData?.similarCustomers ? this.addSimilarCustomersContext(analysisData.similarCustomers) : ''}`;
  }

  formatNextStepsResponse(response, analysisData) {
    const company = analysisData?.customerName || 'Customer';
    
    return `## 🎯 Strategic Next Steps

### ${company} Action Plan
${this.addBasicStructure(response)}`;
  }

  formatEmailResponse(response, analysisData) {
    if (response.includes('Subject:') || response.includes('Dear ')) {
      return `## 📧 Generated Email

${response}`;
    }
    
    return `## 📧 Email Content

${this.addBasicStructure(response)}`;
  }

  formatCompanyResearchResponse(response, analysisData) {
    return `## 🏢 Company Intelligence

${this.addBasicStructure(response)}`;
  }

  formatGenericResponse(response) {
    return `## 💬 Response

${this.addBasicStructure(response)}`;
  }

  // Helper methods for formatting
  extractMainContent(response) {
    return response
      .replace(/^#+\s*/gm, '') // Remove existing headers
      .replace(/^\*\*(.*?)\*\*$/gm, '**$1**') // Clean up bold formatting
      .trim();
  }

  extractBulletPoints(response) {
    const bullets = response.match(/[•\-*]\s*(.+)/g);
    if (bullets && bullets.length > 0) {
      return bullets.join('\n');
    }
    
    const sentences = response.split(/[.!?]\s+/).filter(s => s.trim().length > 20);
    if (sentences.length > 1) {
      return sentences.slice(0, 3).map(s => `• ${s.trim()}.`).join('\n');
    }
    
    return response;
  }

  addBasicStructure(response) {
    return response
      .replace(/\n\n+/g, '\n\n') // Clean up excessive line breaks
      .replace(/([.!?])\s+([A-Z])/g, '$1\n\n$2') // Add paragraph breaks
      .trim();
  }

  addScoreContext(analysisData) {
    if (!analysisData.fitScore) return '';
    
    const assessment = analysisData.fitScore >= 70 ? 'Excellent' : 
                      analysisData.fitScore >= 40 ? 'Good' : 'Needs Review';
    
    return `\n### Score Context
**Assessment:** ${assessment} fit for field service management
**Industry:** ${analysisData.industry || 'Not specified'}
**Team Size:** ${analysisData.userCount?.total || 'Not specified'} (${analysisData.userCount?.field || 'Unknown'} field workers)\n`;
  }

  addSystemsContext(analysisData) {
    if (!analysisData.currentState?.currentSystems) return '';
    
    const systems = analysisData.currentState.currentSystems
      .map(sys => `**${sys.name}:** ${sys.description || 'Current system'}`)
      .join('\n• ');
    
    return `\n### Current Systems
• ${systems}\n`;
  }

  addBusinessContext(analysisData) {
    const context = [];
    
    if (analysisData.industry) {
      context.push(`**Industry:** ${analysisData.industry}`);
    }
    
    if (analysisData.userCount?.total) {
      context.push(`**Team:** ${analysisData.userCount.total} employees`);
    }
    
    if (analysisData.services?.types) {
      context.push(`**Services:** ${analysisData.services.types.join(', ')}`);
    }
    
    return context.length > 0 ? `\n### Key Details\n${context.join('\n')}\n` : '';
  }

  addSimilarCustomersContext(similarCustomers) {
    if (!similarCustomers || similarCustomers.length === 0) return '';
    
    const count = similarCustomers.length;
    const avgMatch = Math.round(similarCustomers.reduce((sum, c) => sum + (c.matchPercentage || 0), 0) / count);
    
    return `\n### Analysis Summary
Found **${count}** similar customers with **${avgMatch}%** average match rate.\n`;
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
              content: 'You are a helpful AI assistant for field service management software sales. Be conversational, specific, and actionable. Format responses with clear headers and bullet points for readability. Always use the specific customer data provided in prompts.'
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

// Export an instance, not the class - this is what the controller expects
module.exports = new ConversationalAIService();

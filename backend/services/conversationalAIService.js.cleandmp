// backend/services/conversationalAIService.js - FIXED: Original Functionality + Web Intelligence
const axios = require('axios');
const cheerio = require('cheerio');
const analysisService = require('./analysisService');
const historicalDataService = require('./historicalDataService');
const { getDb } = require('./mongoDbService');

/**
 * Smart Web Enhancement for Business Intelligence
 */
class BusinessIntelligenceExtractor {
  constructor() {
    this.successCache = new Map();
    this.failureCache = new Map();
    this.userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    ];
  }

  /**
   * Extract business intelligence from web sources
   */
  async extractBusinessIntelligence(customerName, analysisData) {
    const maxTimeout = 12000; // 12 second max
    
    console.log(`🔍 Extracting business intelligence for: ${customerName}`);
    
    try {
      // Check caches first
      if (this.shouldSkipScraping(customerName)) {
        return this.getCachedResult(customerName);
      }

      // Try multiple data extraction strategies
      const businessData = await this.attemptBusinessDataExtraction(customerName, analysisData, { timeout: maxTimeout });
      
      if (businessData && businessData.hasBusinessData) {
        this.successCache.set(customerName, {
          data: businessData,
          timestamp: Date.now()
        });
        console.log(`✅ Business intelligence extracted for: ${customerName}`);
        return businessData;
      } else {
        this.failureCache.set(customerName, Date.now());
        return { available: false, reason: 'no_business_data_found' };
      }

    } catch (error) {
      console.log(`⚠️ Business intelligence extraction failed for ${customerName}:`, error.message);
      this.failureCache.set(customerName, Date.now());
      return { available: false, reason: 'extraction_error', error: error.message };
    }
  }

  /**
   * Attempt business data extraction using multiple strategies
   */
  async attemptBusinessDataExtraction(customerName, analysisData, options) {
    const strategies = [
      () => this.extractFromCompanyWebsite(customerName, options),
      () => this.generateBusinessIntelligence(customerName, analysisData)
    ];

    for (const strategy of strategies) {
      try {
        const result = await strategy();
        if (result && result.hasBusinessData) {
          return result;
        }
      } catch (error) {
        console.log(`Business extraction strategy failed:`, error.message);
        continue;
      }
    }

    // Fallback to analysis-based intelligence
    return this.generateBusinessIntelligence(customerName, analysisData);
  }

  /**
   * Extract business data from company website
   */
  async extractFromCompanyWebsite(customerName, options) {
    const possibleDomains = this.generateBusinessDomains(customerName);
    
    for (const domain of possibleDomains.slice(0, 3)) {
      try {
        console.log(`🌐 Checking business site: ${domain}`);
        const websiteData = await this.scrapeBusinessWebsite(`https://${domain}`, options);
        if (websiteData && websiteData.hasBusinessData) {
          return {
            source: 'company_website',
            domain: domain,
            extractedAt: new Date().toISOString(),
            ...websiteData
          };
        }
      } catch (error) {
        continue;
      }
    }
    
    return null;
  }

  /**
   * Generate possible business domains
   */
  generateBusinessDomains(customerName) {
    const cleanName = customerName
      .toLowerCase()
      .replace(/\b(inc|llc|corp|ltd|company|co|services|service|solutions|group)\b/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .trim();

    const words = cleanName.split(/\s+/).filter(w => w.length > 2);
    const domains = [];

    if (words.length > 0) {
      const primaryName = words[0];
      const fullName = words.join('');
      const hyphenName = words.join('-');

      domains.push(`${fullName}.com`);
      domains.push(`${primaryName}.com`);
      domains.push(`${hyphenName}.com`);
      domains.push(`${primaryName}services.com`);
    }

    return [...new Set(domains)];
  }

  /**
   * Scrape website with focus on business intelligence
   */
  async scrapeBusinessWebsite(url, options) {
    try {
      const response = await axios.get(url, {
        headers: { 'User-Agent': this.getRandomUserAgent() },
        timeout: options.timeout || 10000,
        maxRedirects: 3,
        validateStatus: (status) => status < 400
      });

      if (!response.data) return null;
      const $ = cheerio.load(response.data);
      return this.extractBusinessIntelligence($, url);

    } catch (error) {
      return null;
    }
  }

  /**
   * Extract business intelligence from HTML content
   */
  extractBusinessIntelligence($, url) {
    const businessData = {
      url: url,
      extractedAt: new Date().toISOString(),
      hasBusinessData: false
    };

    try {
      const fullText = $('body').text().toLowerCase();
      const title = $('title').text().toLowerCase();
      const metaDescription = $('meta[name="description"]').attr('content') || '';
      const allContent = `${title} ${metaDescription} ${fullText}`.toLowerCase();

      // Business model detection
      const businessModel = this.detectBusinessModel(allContent);
      if (businessModel.confidence > 0.3) {
        businessData.businessModel = businessModel;
        businessData.hasBusinessData = true;
      }

      // Revenue and size indicators
      const revenueData = this.extractRevenueIndicators(allContent);
      if (revenueData.hasIndicators) {
        businessData.revenueIndicators = revenueData;
        businessData.hasBusinessData = true;
      }

    } catch (error) {
      console.log('Error extracting business intelligence:', error.message);
    }

    return businessData;
  }

  /**
   * Detect business model (B2B vs B2C)
   */
  detectBusinessModel(content) {
    const b2bIndicators = ['b2b', 'business to business', 'commercial', 'corporate', 'businesses', 'companies'];
    const b2cIndicators = ['b2c', 'residential', 'homeowner', 'customers', 'families', 'home'];

    let b2bScore = 0;
    let b2cScore = 0;

    b2bIndicators.forEach(indicator => {
      const matches = (content.match(new RegExp(indicator, 'g')) || []).length;
      b2bScore += matches;
    });

    b2cIndicators.forEach(indicator => {
      const matches = (content.match(new RegExp(indicator, 'g')) || []).length;
      b2cScore += matches;
    });

    let model = 'Unknown';
    let confidence = 0;
    const totalScore = b2bScore + b2cScore;

    if (totalScore > 0) {
      if (b2bScore > b2cScore * 1.5) {
        model = 'B2B';
        confidence = Math.min(b2bScore / totalScore, 0.9);
      } else if (b2cScore > b2bScore * 1.5) {
        model = 'B2C';
        confidence = Math.min(b2cScore / totalScore, 0.9);
      } else {
        model = 'Mixed B2B/B2C';
        confidence = 0.6;
      }
    }

    return { model, confidence, b2bScore, b2cScore };
  }

  /**
   * Extract revenue indicators
   */
  extractRevenueIndicators(content) {
    const indicators = { hasIndicators: false, indicators: [] };

    const patterns = [
      /(\d+)\s*employees?/gi,
      /(\d+)\s*locations?/gi,
      /(\d+)\s*years? in business/gi
    ];

    patterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          indicators.indicators.push({ text: match, confidence: 0.6 });
          indicators.hasIndicators = true;
        });
      }
    });

    return indicators;
  }

  /**
   * Generate business intelligence from analysis data (fallback)
   */
  async generateBusinessIntelligence(customerName, analysisData) {
    return {
      source: 'analysis_inference',
      hasBusinessData: true,
      businessModel: this.inferBusinessModelFromAnalysis(analysisData),
      confidence: 'medium'
    };
  }

  /**
   * Infer business model from analysis data
   */
  inferBusinessModelFromAnalysis(analysisData) {
    const industry = (analysisData.industry || '').toLowerCase();

    if (industry.includes('cleaning')) {
      return { model: 'Mixed B2B/B2C', confidence: 0.8 };
    } else if (industry.includes('hvac') || industry.includes('plumbing')) {
      return { model: 'Mixed B2B/B2C', confidence: 0.8 };
    }

    return { model: 'Unknown', confidence: 0.5 };
  }

  shouldSkipScraping(customerName) {
    if (this.failureCache.has(customerName)) {
      const lastFailure = this.failureCache.get(customerName);
      return Date.now() - lastFailure < 24 * 60 * 60 * 1000;
    }
    return false;
  }

  getCachedResult(customerName) {
    if (this.successCache.has(customerName)) {
      const cached = this.successCache.get(customerName);
      if (Date.now() - cached.timestamp < 7 * 24 * 60 * 60 * 1000) {
        return { ...cached.data, fromCache: true };
      }
    }
    return { available: false, reason: 'recent_failure' };
  }

  getRandomUserAgent() {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }
}

/**
 * FIXED: Conversational AI Service - Restored Original Functionality + Added Web Intelligence
 */
class ConversationalAIService {
  constructor() {
    this.conversationContexts = new Map();
    this.webCache = new Map(); // Keep for compatibility
    this.socialCache = new Map(); // Keep for compatibility
    this.companyDataCache = new Map(); // Keep for compatibility
    
    // NEW: Business intelligence extractor
    this.businessIntelligence = new BusinessIntelligenceExtractor();
    this.industryKnowledgeBase = this.initializeIndustryKnowledge();
  }

  /**
   * Initialize industry knowledge base
   */
  initializeIndustryKnowledge() {
    return {
      'HVAC': {
        commonBusinessModels: ['B2B', 'B2C', 'Mixed'],
        typicalCustomers: ['Residential homeowners', 'Commercial buildings', 'Property management'],
        seasonality: 'High demand in summer/winter',
        keyTechnologies: ['Scheduling software', 'GPS tracking', 'Inventory management'],
        averageTeamSize: { small: '10-50', medium: '50-200', large: '200+' },
        fieldWorkerRatio: '60-80%'
      },
      'Plumbing': {
        commonBusinessModels: ['B2C', 'B2B'],
        typicalCustomers: ['Residential', 'Commercial', 'Emergency services'],
        seasonality: 'Year-round with winter spikes',
        keyTechnologies: ['Emergency dispatch', 'Parts tracking', 'Customer history'],
        averageTeamSize: { small: '5-25', medium: '25-100', large: '100+' },
        fieldWorkerRatio: '70-85%'
      }
    };
  }

  /**
   * FIXED: Process user query (restored original logic)
   */
  async processQuery(query, options = {}) {
    try {
      const { analysisId, conversationId, userId } = options;
      
      // Get conversation context (ORIGINAL METHOD)
      const context = await this.getContext(conversationId, analysisId);
      
      // Classify user intent (ORIGINAL METHOD)
      const intent = await this.classifyIntent(query, context);
      
      // ENHANCED: Optionally add web intelligence for specific intents
      let enhancementData = null;
      if (this.shouldEnhanceWithWebData(query, intent, context)) {
        try {
          enhancementData = await this.gatherWebEnhancement(context.analysisData);
        } catch (error) {
          console.log('Web enhancement failed, continuing without it:', error.message);
        }
      }
      
      // Route to appropriate handler (ORIGINAL METHOD)
      const response = await this.routeQuery(intent, query, context, enhancementData);
      
      // Update conversation context (ORIGINAL METHOD)
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
        context: context.analysisId ? 'analysis-aware' : 'general',
        webEnhanced: !!enhancementData
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
   * ORIGINAL: Get conversation context (UNCHANGED)
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
   * ORIGINAL: Update conversation context (UNCHANGED)
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
   * ORIGINAL: Classify user intent (UNCHANGED)
   */
   async classifyIntent(query, context) {
    const prompt = `
Classify this user query into one of these categories:

CATEGORIES:
- ANALYSIS_QUESTION: Questions about specific analysis results, scores, recommendations, fit scores, scoring breakdown, why certain scores, what factors contributed
- BUSINESS_MODEL: Questions about B2B/B2C, business model, customer types, revenue model
- COMPANY_RESEARCH: Questions about company information, characteristics, industry position
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
- If query asks about "business model" or "B2B/B2C" → BUSINESS_MODEL

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
   * ORIGINAL: Fallback intent classification (UNCHANGED)
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

    // Business model questions
    if (queryLower.includes('business model') || queryLower.includes('b2b') || queryLower.includes('b2c')) {
      return { type: 'BUSINESS_MODEL', confidence: 0.8, entities: [], requiresAnalysisData: true };
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
   * NEW: Check if web enhancement should be attempted
   */
  shouldEnhanceWithWebData(query, intent, context) {
    const webEnhancementIntents = ['BUSINESS_MODEL', 'COMPANY_RESEARCH'];
    const webKeywords = ['business model', 'b2b', 'b2c', 'website', 'company information'];
    
    const hasWebIntent = webEnhancementIntents.includes(intent.type);
    const hasWebKeywords = webKeywords.some(keyword => query.toLowerCase().includes(keyword));
    const isEnabled = process.env.ENABLE_WEB_ENHANCEMENT === 'true';
    
    return (hasWebIntent || hasWebKeywords) && isEnabled && context.analysisData;
  }

  /**
   * NEW: Gather web enhancement data
   */
  async gatherWebEnhancement(analysisData) {
    if (!analysisData) return null;
    
    console.log('🌐 Attempting web enhancement...');
    const webIntelligence = await this.businessIntelligence.extractBusinessIntelligence(
      analysisData.customerName, 
      analysisData
    );
    
    if (webIntelligence && webIntelligence.hasBusinessData) {
      console.log('✅ Web enhancement successful');
      return { webIntelligence };
    }
    
    return null;
  }

  /**
   * MODIFIED: Route query to appropriate handler (added enhancement data parameter)
   */
  async routeQuery(intent, query, context, enhancementData = null) {
    switch (intent.type) {
      case 'ANALYSIS_QUESTION':
        return await this.handleAnalysisQuestion(query, context);
      
      case 'BUSINESS_MODEL':
        return await this.handleBusinessModelQuestion(query, context, enhancementData);
      
      case 'COMPANY_RESEARCH':
        return await this.handleCompanyResearch(query, context, enhancementData);
      
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
   * ORIGINAL: Handle analysis-specific questions (RESTORED ORIGINAL VERSION)
   */
  async handleAnalysisQuestion(query, context) {
    if (!context.analysisData) {
      return "I need analysis data to answer that question. Please make sure you're viewing a specific customer analysis.";
    }

    const analysisData = context.analysisData;

    // ORIGINAL: Much more comprehensive data access (RESTORED)
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
   * NEW: Enhanced business model question handler with web intelligence
   */
  async handleBusinessModelQuestion(query, context, enhancementData = null) {
    const analysisData = context.analysisData;
    
    const prompt = `
Analyze the business model for ${analysisData.customerName} using all available intelligence.

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

Provide comprehensive business model analysis:

1. **Business Model Classification:**
   - Primary model (B2B/B2C/Mixed) with confidence level
   - Supporting evidence from internal analysis and web intelligence
   - Industry benchmarks and typical patterns

2. **Customer Segments:**
   - Specific customer types they serve
   - Market segments and target demographics
   - Service delivery approach

3. **Revenue Model Implications:**
   - Estimated revenue range based on size and industry
   - Pricing model implications (contract vs. transactional)
   - Growth indicators and market position

4. **Field Service Software Implications:**
   - How business model affects software requirements
   - B2B vs B2C feature needs (scheduling, billing, customer management)
   - Implementation complexity and approach

5. **Sales Strategy Recommendations:**
   - Approach based on business model and market position
   - Key decision makers and stakeholders
   - Value proposition alignment

Reference specific data points from both internal analysis and web intelligence when available.`;

    return await this.callOpenAI(prompt, { maxTokens: 1200 });
  }

  /**
   * NEW: Enhanced company research handler with web intelligence
   */
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

  /**
   * ORIGINAL: Handle similar customers queries (UNCHANGED)
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
   * ORIGINAL: Handle next steps and strategy questions (UNCHANGED)
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
   * ORIGINAL: Handle email generation requests (UNCHANGED)
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
   * ORIGINAL: Detect email type from query (UNCHANGED)
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
   * ORIGINAL: Handle data lookup requests (UNCHANGED)
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
   * ORIGINAL: Extract search terms from query (UNCHANGED)
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
   * ORIGINAL: Search historical data (UNCHANGED)
   */
  searchHistoricalData(data, searchTerms) {
    return data.filter(customer => {
      const searchText = `${customer.customerName} ${customer.industry} ${customer.services?.join(' ')} ${customer.requirements?.keyFeatures?.join(' ')}`.toLowerCase();
      return searchTerms.some(term => searchText.includes(term));
    });
  }

  /**
   * ORIGINAL: Handle explanation requests (UNCHANGED)
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
   * ORIGINAL: Handle general conversation (UNCHANGED)
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

  /**
   * ORIGINAL: OpenAI call method (UNCHANGED)
   */
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

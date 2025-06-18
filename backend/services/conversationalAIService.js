// backend/services/conversationalAIService.js - ENHANCED: Complete External Company Research
const axios = require('axios');
const cheerio = require('cheerio');
const analysisService = require('./analysisService');
const historicalDataService = require('./historicalDataService');
const { getDb } = require('./mongoDbService');

/**
 * NEW: Company Name Extractor - Detects any company mentioned in queries
 */
class CompanyNameExtractor {
  constructor() {
    this.companyIndicators = [
      'inc', 'llc', 'corp', 'ltd', 'company', 'co', 'services', 'service', 
      'solutions', 'group', 'enterprises', 'systems', 'technologies'
    ];
    this.businessKeywords = [
      'heating', 'air', 'hvac', 'plumbing', 'electrical', 'construction', 
      'cleaning', 'maintenance', 'repair', 'pest', 'security', 'landscaping',
      'roofing', 'painting', 'flooring', 'appliance', 'locksmith'
    ];
  }

  /**
   * Extract company name from query - NEW FUNCTIONALITY
   */
  extractCompanyFromQuery(query) {
    // Method 1: Proper noun patterns with business indicators
    const properNounPattern = /\b([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*)*)\s+(?:Inc\.?|LLC\.?|Corp\.?|Ltd\.?|Company|Co\.?|Services?|Solutions?|Group|Enterprises?)\b/gi;
    const properNounMatch = query.match(properNounPattern);
    
    if (properNounMatch) {
      return {
        found: true,
        companyName: properNounMatch[0].trim(),
        confidence: 0.9,
        method: 'proper_noun_with_suffix'
      };
    }

    // Method 2: Business name patterns (Mr./Mrs./Dr. + Business keywords)
    const businessNamePattern = /\b(?:Mr\.?|Mrs\.?|Dr\.?)\s+([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*)*)\s+(?:Heating|Air|HVAC|Plumbing|Electrical|Construction|Cleaning|Maintenance|Repair|Pest|Security|Landscaping)/gi;
    const businessNameMatch = query.match(businessNamePattern);
    
    if (businessNameMatch) {
      return {
        found: true,
        companyName: businessNameMatch[0].trim(),
        confidence: 0.8,
        method: 'business_name_pattern'
      };
    }

    // Method 3: Quoted company names
    const quotedPattern = /"([^"]+)"/g;
    const quotedMatch = query.match(quotedPattern);
    
    if (quotedMatch) {
      const quotedName = quotedMatch[0].replace(/"/g, '').trim();
      if (this.looksLikeCompanyName(quotedName)) {
        return {
          found: true,
          companyName: quotedName,
          confidence: 0.7,
          method: 'quoted_name'
        };
      }
    }

    return { found: false };
  }

  /**
   * Heuristic to determine if a string looks like a company name
   */
  looksLikeCompanyName(name) {
    const nameLower = name.toLowerCase();
    
    // Has business suffix
    if (this.companyIndicators.some(indicator => nameLower.includes(indicator))) {
      return true;
    }
    
    // Has business keywords
    if (this.businessKeywords.some(keyword => nameLower.includes(keyword))) {
      return true;
    }
    
    // Contains multiple capitalized words (likely proper nouns)
    const capitalizedWords = name.match(/\b[A-Z][a-z]+/g);
    return capitalizedWords && capitalizedWords.length >= 2;
  }

  /**
   * Check if extracted company is the main customer being analyzed
   */
  isMainCustomer(companyName, context) {
    if (!context.analysisData?.customerName) return false;
    
    const mainCustomer = context.analysisData.customerName.toLowerCase();
    const extracted = companyName.toLowerCase();
    
    return mainCustomer === extracted || 
           mainCustomer.includes(extracted) || 
           extracted.includes(mainCustomer);
  }

  /**
   * Check if extracted company is a similar customer
   */
  findInSimilarCustomers(companyName, context) {
    if (!context.analysisData?.similarCustomers) return null;
    
    const queryLower = companyName.toLowerCase();
    
    // Get all similar customers from all sections
    const allSimilarCustomers = [];
    context.analysisData.similarCustomers.forEach(section => {
      if (section.customers && Array.isArray(section.customers)) {
        allSimilarCustomers.push(...section.customers);
      }
    });
    
    // Look for company name matches
    for (const customer of allSimilarCustomers) {
      const customerNameLower = customer.customerName.toLowerCase();
      const variations = [
        customerNameLower,
        customerNameLower.replace(/\b(inc|llc|corp|ltd|company|co)\b/g, '').trim(),
        customerNameLower.split(' ')[0] // First word
      ];
      
      for (const variation of variations) {
        if (variation && (queryLower.includes(variation) || variation.includes(queryLower))) {
          return customer;
        }
      }
    }
    
    return null;
  }
}

/**
 * ENHANCED: Business Intelligence Extractor - Now supports any company
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
   * ENHANCED: Extract business intelligence from web sources for ANY company
   */
  async extractBusinessIntelligence(customerName, analysisData = null) {
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
   * PRESERVED: All original extraction methods
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

  extractRevenueIndicators(content) {
    const indicators = { hasIndicators: false, indicators: [] };

    const patterns = [
      /(\d+)\s*employees?/gi,
      /(\d+)\s*locations?/gi,
      /(\d+)\s*years?\s*(?:in\s*business|experience)/gi
    ];

    patterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        indicators.hasIndicators = true;
        indicators.indicators.push(...matches);
      }
    });

    return indicators;
  }

  generateBusinessIntelligence(customerName, analysisData) {
    return {
      source: 'analysis_based',
      hasBusinessData: true,
      businessModel: {
        model: 'Unknown',
        confidence: 0.3,
        note: 'Based on analysis data only'
      }
    };
  }

  shouldSkipScraping(customerName) {
    // Check failure cache (6 hours)
    if (this.failureCache.has(customerName)) {
      const failureTime = this.failureCache.get(customerName);
      if (Date.now() - failureTime < 6 * 60 * 60 * 1000) {
        return true;
      }
    }
    return false;
  }

  getCachedResult(customerName) {
    const cached = this.successCache.get(customerName);
    if (cached && Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) {
      return { ...cached.data, fromCache: true };
    }
    return { available: false, reason: 'recent_failure' };
  }

  getRandomUserAgent() {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }
}

/**
 * ENHANCED: Conversational AI Service - All Original Functionality + External Company Research
 */
class ConversationalAIService {
  constructor() {
    this.conversationContexts = new Map();
    this.webCache = new Map();
    this.socialCache = new Map();
    this.companyDataCache = new Map();
    
    // ORIGINAL: Business intelligence extractor
    this.businessIntelligence = new BusinessIntelligenceExtractor();
    this.industryKnowledgeBase = this.initializeIndustryKnowledge();
    
    // NEW: Company name extractor
    this.companyExtractor = new CompanyNameExtractor();
  }

  /**
   * PRESERVED: Initialize industry knowledge base
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
   * PRESERVED: Process user query (enhanced with external company support)
   */
  async processQuery(query, options = {}) {
    try {
      const { analysisId, conversationId, userId } = options;
      
      // ORIGINAL: Get conversation context
      const context = await this.getContext(conversationId, analysisId);
      
      // ENHANCED: Classify user intent (now detects external companies)
      const intent = await this.classifyIntent(query, context);
      
      // ENHANCED: Web enhancement for any company (not just main customer)
      let enhancementData = null;
      if (this.shouldEnhanceWithWebData(query, intent, context)) {
        try {
          const targetCompany = intent.externalCompany || context.analysisData?.customerName;
          enhancementData = await this.gatherWebEnhancement(targetCompany, context.analysisData);
        } catch (error) {
          console.log('Web enhancement failed, continuing without it:', error.message);
        }
      }
      
      // ENHANCED: Route to appropriate handler (supports external companies)
      const response = await this.routeQuery(intent, query, context, enhancementData);
      
      // ORIGINAL: Update conversation context
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

  /**
   * PRESERVED: Get conversation context (unchanged)
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
   * PRESERVED: Update conversation context (unchanged)
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
   * ENHANCED: Classify user intent (now detects external companies)
   */
  async classifyIntent(query, context) {
    const queryLower = query.toLowerCase().trim();
    
    // NEW: Check for external company mentions
    const externalCompany = this.companyExtractor.extractCompanyFromQuery(query);
    
    if (externalCompany.found) {
      // Check if it's the main customer
      if (this.companyExtractor.isMainCustomer(externalCompany.companyName, context)) {
        // Fall through to normal intent classification for main customer
      } 
      // Check if it's a similar customer
      else {
        const similarCustomer = this.companyExtractor.findInSimilarCustomers(externalCompany.companyName, context);
        
        if (similarCustomer) {
          // Questions about similar customers
          if (queryLower.includes('business model') || queryLower.includes('b2b') || queryLower.includes('b2c')) {
            return { 
              type: 'SIMILAR_CUSTOMER_BUSINESS_MODEL', 
              confidence: 0.9, 
              entities: [externalCompany.companyName],
              requiresAnalysisData: true,
              similarCustomer: similarCustomer
            };
          }
          
          return { 
            type: 'SPECIFIC_SIMILAR_CUSTOMER', 
            confidence: 0.8, 
            entities: [externalCompany.companyName],
            requiresAnalysisData: true,
            similarCustomer: similarCustomer
          };
        } 
        // External company not in our data - research from web
        else {
          if (queryLower.includes('business model') || queryLower.includes('b2b') || queryLower.includes('b2c')) {
            return { 
              type: 'EXTERNAL_COMPANY_BUSINESS_MODEL', 
              confidence: 0.8, 
              entities: [externalCompany.companyName],
              requiresAnalysisData: false,
              externalCompany: externalCompany.companyName
            };
          }
          
          return { 
            type: 'EXTERNAL_COMPANY_RESEARCH', 
            confidence: 0.7, 
            entities: [externalCompany.companyName],
            requiresAnalysisData: false,
            externalCompany: externalCompany.companyName
          };
        }
      }
    }

    // ORIGINAL: Intent classification for main customer/general queries
    if (queryLower.includes('fit score') || queryLower.includes('score') || queryLower.includes('rating') || 
        queryLower.includes('analysis') || queryLower.includes('assessment') || queryLower.includes('recommendation')) {
      return { type: 'ANALYSIS_QUESTION', confidence: 0.9, entities: [], requiresAnalysisData: true };
    }
    
    if (queryLower.includes('business model') || queryLower.includes('b2b') || queryLower.includes('b2c')) {
      return { type: 'BUSINESS_MODEL', confidence: 0.8, entities: [], requiresAnalysisData: true };
    }
    
    if (queryLower.includes('company information') || queryLower.includes('company research') || 
        queryLower.includes('tell me about')) {
      return { type: 'COMPANY_RESEARCH', confidence: 0.8, entities: [], requiresAnalysisData: true };
    }
    
    if (queryLower.includes('similar') || queryLower.includes('comparable') || queryLower.includes('like them')) {
      return { type: 'SIMILAR_CUSTOMERS', confidence: 0.8, entities: [], requiresAnalysisData: true };
    }
    
    if (queryLower.includes('next step') || queryLower.includes('what should') || queryLower.includes('recommend') || 
        queryLower.includes('strategy') || queryLower.includes('approach')) {
      return { type: 'NEXT_STEPS', confidence: 0.8, entities: [], requiresAnalysisData: true };
    }
    
    if (queryLower.includes('email') || queryLower.includes('message') || queryLower.includes('write') || 
        queryLower.includes('draft') || queryLower.includes('compose') || queryLower.includes('generate')) {
      return { type: 'EMAIL_GENERATION', confidence: 0.8, entities: [], requiresAnalysisData: true };
    }
    
    if (queryLower.includes('search') || queryLower.includes('find') || queryLower.includes('lookup') || 
        queryLower.includes('customer') || queryLower.includes('data')) {
      return { type: 'DATA_LOOKUP', confidence: 0.7, entities: [], requiresAnalysisData: false };
    }
    
    if (queryLower.includes('explain') || queryLower.includes('what is') || queryLower.includes('how does') || 
        queryLower.includes('tell me about') || queryLower.includes('define')) {
      return { type: 'EXPLANATION', confidence: 0.7, entities: [], requiresAnalysisData: false };
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
   * ENHANCED: Check if web enhancement should be attempted (supports external companies)
   */
  shouldEnhanceWithWebData(query, intent, context) {
    const webEnhancementIntents = [
      'BUSINESS_MODEL', 'COMPANY_RESEARCH', 
      'EXTERNAL_COMPANY_BUSINESS_MODEL', 'EXTERNAL_COMPANY_RESEARCH'
    ];
    const webKeywords = ['business model', 'b2b', 'b2c', 'website', 'company information'];
    
    const hasWebIntent = webEnhancementIntents.includes(intent.type);
    const hasWebKeywords = webKeywords.some(keyword => query.toLowerCase().includes(keyword));
    const isEnabled = process.env.ENABLE_WEB_ENHANCEMENT === 'true';
    
    return (hasWebIntent || hasWebKeywords) && isEnabled;
  }

  /**
   * ENHANCED: Gather web enhancement data (supports any company)
   */
  async gatherWebEnhancement(targetCompany, analysisData = null) {
    if (!targetCompany) return null;
    
    console.log(`🌐 Attempting web enhancement for: ${targetCompany}`);
    const webIntelligence = await this.businessIntelligence.extractBusinessIntelligence(
      targetCompany, 
      analysisData
    );
    
    if (webIntelligence && webIntelligence.hasBusinessData) {
      console.log('✅ Web enhancement successful');
      return { webIntelligence };
    }
    
    return null;
  }

  /**
   * ENHANCED: Route query to appropriate handler (supports external companies)
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
      
      case 'SIMILAR_CUSTOMER_BUSINESS_MODEL':
        return await this.handleSimilarCustomerBusinessModel(query, context, intent.similarCustomer, enhancementData);
      
      case 'SPECIFIC_SIMILAR_CUSTOMER':
        return await this.handleSpecificSimilarCustomer(query, context, intent.similarCustomer);
      
      case 'EXTERNAL_COMPANY_BUSINESS_MODEL':
        return await this.handleExternalCompanyBusinessModel(query, context, intent.externalCompany, enhancementData);
      
      case 'EXTERNAL_COMPANY_RESEARCH':
        return await this.handleExternalCompanyResearch(query, context, intent.externalCompany, enhancementData);
      
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
   * NEW: Handle business model questions about external companies
   */
  async handleExternalCompanyBusinessModel(query, context, externalCompany, enhancementData = null) {
    const prompt = `
Analyze the business model for the external company: ${externalCompany}

${enhancementData ? `
WEB INTELLIGENCE FOR ${externalCompany}:
${JSON.stringify(enhancementData, null, 2)}
` : 'No web intelligence available - provide analysis based on company name and industry patterns.'}

${context.analysisData ? `
CURRENT ANALYSIS CONTEXT:
Main Customer: ${context.analysisData.customerName}
Industry: ${context.analysisData.industry}

Compare/contrast with the main customer where relevant.
` : 'No current analysis context.'}

USER QUESTION: "${query}"

Provide comprehensive business model analysis for ${externalCompany}:

1. **Business Model Classification:**
   - Primary model (B2B/B2C/Mixed) based on available data
   - Supporting evidence from web intelligence or industry patterns
   - Confidence level in assessment

2. **Company Profile:**
   - Industry and market position
   - Likely customer segments served
   - Service delivery approach

3. **Revenue Model Implications:**
   - Estimated size and market position
   - Pricing model implications
   - Growth indicators from web presence

4. **Field Service Software Implications:**
   - Software needs based on business model
   - Implementation complexity expectations
   - Competitive positioning insights

${context.analysisData ? `
5. **Comparison with ${context.analysisData.customerName}:**
   - Similarities and differences
   - Competitive insights
   - Market positioning comparison
` : ''}

Focus specifically on ${externalCompany} and provide actionable business intelligence.`;

    return await this.callOpenAI(prompt, { maxTokens: 1200 });
  }

  /**
   * NEW: Handle general research questions about external companies
   */
  async handleExternalCompanyResearch(query, context, externalCompany, enhancementData = null) {
    const prompt = `
Provide comprehensive company intelligence for the external company: ${externalCompany}

${enhancementData ? `
WEB INTELLIGENCE FOR ${externalCompany}:
${JSON.stringify(enhancementData, null, 2)}
` : 'No web intelligence available - provide analysis based on company name and industry patterns.'}

${context.analysisData ? `
CURRENT ANALYSIS CONTEXT:
Main Customer: ${context.analysisData.customerName}
Industry: ${context.analysisData.industry}
` : 'No current analysis context.'}

USER QUESTION: "${query}"

Provide detailed company profile for ${externalCompany} addressing the specific question asked.
Include business intelligence, market position, and any competitive insights available.

${context.analysisData ? `
Compare or contrast with ${context.analysisData.customerName} where relevant.
` : ''}`;

    return await this.callOpenAI(prompt, { maxTokens: 1000 });
  }

  /**
   * NEW: Handle business model questions about specific similar customers
   */
  async handleSimilarCustomerBusinessModel(query, context, similarCustomer, enhancementData = null) {
    if (!similarCustomer) {
      return "I couldn't find the specific similar customer you're asking about.";
    }
    
    const prompt = `
Analyze the business model for the similar customer: ${similarCustomer.customerName}

SIMILAR CUSTOMER DATA:
${JSON.stringify(similarCustomer, null, 2)}

CURRENT PROSPECT CONTEXT:
Main Customer: ${context.analysisData.customerName}
Industry: ${context.analysisData.industry}

${enhancementData ? `
WEB INTELLIGENCE FOR ${similarCustomer.customerName}:
${JSON.stringify(enhancementData, null, 2)}
` : 'No web intelligence available for this similar customer.'}

USER QUESTION: "${query}"

Provide comprehensive business model analysis for ${similarCustomer.customerName}:

1. **Business Model Classification:**
   - Primary model (B2B/B2C/Mixed) based on available data
   - Supporting evidence from similar customer data
   - Industry context and typical patterns

2. **Customer Profile:**
   - Industry: ${similarCustomer.industry || 'Not specified'}
   - Size: ${similarCustomer.implementation?.userCount || 'Not specified'} users
   - Field workers: ${similarCustomer.implementation?.fieldWorkers || 'Not specified'}

3. **Implementation Success:**
   - Health: ${similarCustomer.implementation?.health || 'Not specified'}
   - Timeline: ${similarCustomer.implementation?.duration || 'Not specified'}
   - Key learnings: ${similarCustomer.keyLearnings ? similarCustomer.keyLearnings.join(', ') : 'No specific learnings available'}

4. **Strategic Insights:**
   ${similarCustomer.strategicInsight || 'No strategic insight available'}

5. **Relevance to ${context.analysisData.customerName}:**
   - Similarities and differences
   - Applicable lessons learned
   - Risk factors or success patterns

Focus specifically on ${similarCustomer.customerName} and provide actionable insights.`;

    return await this.callOpenAI(prompt, { maxTokens: 1000 });
  }

  /**
   * NEW: Handle other questions about specific similar customers
   */
  async handleSpecificSimilarCustomer(query, context, similarCustomer) {
    if (!similarCustomer) {
      return "I couldn't find the specific similar customer you're asking about.";
    }
    
    const prompt = `
Answer questions about the specific similar customer: ${similarCustomer.customerName}

SIMILAR CUSTOMER DATA:
${JSON.stringify(similarCustomer, null, 2)}

CURRENT PROSPECT CONTEXT:
Main Customer: ${context.analysisData.customerName}
Industry: ${context.analysisData.industry}

USER QUESTION: "${query}"

Provide specific information about ${similarCustomer.customerName} based on the question asked.
Reference their actual data points and implementation experience.
Compare/contrast with the main prospect ${context.analysisData.customerName} when relevant.`;

    return await this.callOpenAI(prompt, { maxTokens: 800 });
  }

  /**
   * PRESERVED: All original handlers (unchanged)
   */
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

USER QUESTION: "${query}"

Use ONLY the actual data provided above. Be specific, factual, and data-driven.`;

    return await this.callOpenAI(prompt);
  }

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

Provide comprehensive business model analysis with supporting evidence.`;

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

  async handleSimilarCustomersQuery(query, context) {
    if (!context.analysisData?.similarCustomers) {
      return "No similar customers data is available for this analysis.";
    }

    // Check if asking about a specific similar customer
    const externalCompany = this.companyExtractor.extractCompanyFromQuery(query);
    if (externalCompany.found) {
      const similarCustomer = this.companyExtractor.findInSimilarCustomers(externalCompany.companyName, context);
      if (similarCustomer) {
        return await this.handleSpecificSimilarCustomer(query, context, similarCustomer);
      }
    }

    const prompt = `
Analyze and explain similar customers for this prospect.

CURRENT PROSPECT:
${context.analysisData.customerName} - ${context.analysisData.industry}
${context.analysisData.userCount?.total} users (${context.analysisData.userCount?.field} field workers)

SIMILAR CUSTOMERS:
${JSON.stringify(context.analysisData.similarCustomers, null, 2)}

USER QUESTION: "${query}"

Provide insights about the similar customers, what we can learn from them, and how it applies to the current prospect.`;

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

USER QUESTION: "${query}"

Provide specific, actionable next steps and strategic recommendations.`;

    return await this.callOpenAI(prompt);
  }

  async handleEmailGeneration(query, context) {
    const analysisData = context.analysisData;
    if (!analysisData) {
      return "I need customer analysis data to generate a personalized email. Please view a specific analysis first.";
    }

    const emailType = this.detectEmailType(query);
    
    const prompt = `
Generate a professional, personalized ${emailType} email for ${analysisData.customerName}.

CUSTOMER CONTEXT:
${JSON.stringify({
      customerName: analysisData.customerName,
      industry: analysisData.industry,
      fitScore: analysisData.fitScore,
      requirements: analysisData.requirements,
      challenges: analysisData.challenges
    }, null, 2)}

USER REQUEST: "${query}"

Generate appropriate email content.`;

    return await this.callOpenAI(prompt);
  }

  async handleDataLookup(query, context) {
    try {
      const searchTerms = this.extractSearchTerms(query);
      const db = await getDb();
      const analysesCollection = db.collection('analyses');
      
      const results = await analysesCollection
        .find({
          $or: [
            { customerName: { $regex: searchTerms.join('|'), $options: 'i' } },
            { industry: { $regex: searchTerms.join('|'), $options: 'i' } }
          ]
        })
        .limit(5)
        .toArray();

      const prompt = `
Search results for customer data lookup:

SEARCH TERMS: ${searchTerms.join(', ')}
RESULTS FOUND: ${results.length}

${results.map(r => `- ${r.customerName} (${r.industry}): ${r.fitScore}% fit`).join('\n')}

USER QUESTION: "${query}"

Summarize the search results and provide insights.`;

      return await this.callOpenAI(prompt);
      
    } catch (error) {
      return "I encountered an error searching our data. Please try rephrasing your question.";
    }
  }

  async handleExplanation(query, context) {
    const prompt = `
You are an expert on field service management software and customer analysis.
Explain concepts clearly and provide practical insights.

USER QUESTION: "${query}"

Provide a clear, helpful explanation with practical examples.`;

    return await this.callOpenAI(prompt);
  }

  async handleGeneralQuery(query, context) {
    const prompt = `
You are a helpful AI assistant for a field service management software company.

${context.analysisData ? 
  `Current context: User is viewing analysis for ${context.analysisData.customerName} (${context.analysisData.industry})` : 
  'No specific analysis context.'}

USER QUERY: "${query}"

Provide a helpful response and suggest how you can assist with customer analysis tasks.`;

    return await this.callOpenAI(prompt);
  }

  /**
   * PRESERVED: Helper methods (unchanged)
   */
  detectEmailType(query) {
    const queryLower = query.toLowerCase();
    if (queryLower.includes('follow') || queryLower.includes('follow-up')) return 'follow-up';
    if (queryLower.includes('intro') || queryLower.includes('introduction')) return 'introduction';
    if (queryLower.includes('proposal') || queryLower.includes('quote')) return 'proposal';
    if (queryLower.includes('thank')) return 'thank you';
    return 'professional';
  }

  extractSearchTerms(query) {
    const terms = query.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(term => term.length > 2)
      .filter(term => !['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'].includes(term));
    
    return [...new Set(terms)];
  }

  async callOpenAI(prompt, options = {}) {
    try {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OpenAI API key is not configured.');
      }
      
      const model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
      
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: model,
          messages: [
            {
              role: 'system',
              content: 'You are an expert AI assistant for field service management software sales. Provide accurate, helpful, and actionable responses.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: options.maxTokens || 800
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );
      
      return response.data.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error calling OpenAI API:', error.response?.data || error.message);
      throw new Error(`AI processing error: ${error.message}`);
    }
  }
}

module.exports = new ConversationalAIService();

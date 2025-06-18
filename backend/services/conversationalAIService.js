// backend/services/conversationalAIService.js - COMPLETE ENHANCED VERSION
const axios = require('axios');
const cheerio = require('cheerio');
const analysisService = require('./analysisService');
const historicalDataService = require('./historicalDataService');
const { getDb } = require('./mongoDbService');

/**
 * ENHANCED: Company Name Extractor - Detects any company mentioned in queries
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

  looksLikeCompanyName(name) {
    const nameLower = name.toLowerCase();
    
    if (this.companyIndicators.some(indicator => nameLower.includes(indicator))) {
      return true;
    }
    
    if (this.businessKeywords.some(keyword => nameLower.includes(keyword))) {
      return true;
    }
    
    const capitalizedWords = name.match(/\b[A-Z][a-z]+/g);
    return capitalizedWords && capitalizedWords.length >= 2;
  }

  isMainCustomer(companyName, context) {
    if (!context.analysisData?.customerName) return false;
    
    const mainCustomer = context.analysisData.customerName.toLowerCase();
    const extracted = companyName.toLowerCase();
    
    return mainCustomer === extracted || 
           mainCustomer.includes(extracted) || 
           extracted.includes(mainCustomer);
  }

  findInSimilarCustomers(companyName, context) {
    if (!context.analysisData?.similarCustomers) return null;
    
    const queryLower = companyName.toLowerCase();
    
    const allSimilarCustomers = [];
    context.analysisData.similarCustomers.forEach(section => {
      if (section.customers && Array.isArray(section.customers)) {
        allSimilarCustomers.push(...section.customers);
      }
    });
    
    for (const customer of allSimilarCustomers) {
      const customerNameLower = customer.customerName.toLowerCase();
      const variations = [
        customerNameLower,
        customerNameLower.replace(/\b(inc|llc|corp|ltd|company|co)\b/g, '').trim(),
        customerNameLower.split(' ')[0]
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
 * ENHANCED: Business Intelligence Extractor - Web scraping for any company
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

  async extractBusinessIntelligence(customerName, analysisData = null) {
    const maxTimeout = 12000;
    
    console.log(`🔍 Extracting business intelligence for: ${customerName}`);
    
    try {
      if (this.shouldSkipScraping(customerName)) {
        return this.getCachedResult(customerName);
      }

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

      const businessModel = this.detectBusinessModel(allContent);
      if (businessModel.confidence > 0.3) {
        businessData.businessModel = businessModel;
        businessData.hasBusinessData = true;
      }

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
 * FIXED: OpenAI Intent Classifier with Robust Similar Customer Detection
 */
class OpenAIIntentClassifier {
  constructor() {
    this.intentCategories = {
      'ANALYSIS_QUESTION': {
        description: 'Questions about the current customer analysis being viewed',
        requiresAnalysisData: true
      },
      'BUSINESS_MODEL': {
        description: 'Questions about business models (B2B/B2C) for any company',
        requiresAnalysisData: false
      },
      'SIMILAR_CUSTOMERS': {
        description: 'Questions about similar customers or historical comparisons',
        requiresAnalysisData: true
      },
      'EXTERNAL_COMPANY_RESEARCH': {
        description: 'Research about companies not in the current analysis',
        requiresAnalysisData: false
      },
      'NEXT_STEPS': {
        description: 'Questions about sales strategy and next actions',
        requiresAnalysisData: true
      },
      'EMAIL_GENERATION': {
        description: 'Requests to generate emails or communications',
        requiresAnalysisData: true
      },
      'DATA_LOOKUP': {
        description: 'Database searches for customers or historical data',
        requiresAnalysisData: false
      },
      'EXPLANATION': {
        description: 'General explanations of concepts or processes',
        requiresAnalysisData: false
      },
      'GENERAL': {
        description: 'General conversation or greetings',
        requiresAnalysisData: false
      }
    };
  }

  async classifyIntent(query, context) {
    // ENHANCED: Robust quick checks for high-confidence cases
    const quickCheck = this.enhancedQuickRuleBasedCheck(query, context);
    if (quickCheck.confidence > 0.85) {
      console.log('🚀 Quick classification:', quickCheck.type, 'confidence:', quickCheck.confidence);
      return quickCheck;
    }

    try {
      const prompt = this.buildEnhancedClassificationPrompt(query, context);
      console.log('🤖 Using OpenAI for intent classification...');
      
      const response = await this.callOpenAI(prompt, { maxTokens: 300 });
      const intent = JSON.parse(response);
      
      // ENHANCED: Strict validation with automatic correction
      const validatedIntent = this.strictValidateAndCorrect(intent, query, context);
      
      console.log('✅ OpenAI Intent Classification:', {
        query: query.substring(0, 50),
        intent: validatedIntent.type,
        confidence: validatedIntent.confidence,
        reasoning: validatedIntent.reasoning,
        corrected: validatedIntent.wasCorrected || false
      });
      
      return validatedIntent;
      
    } catch (error) {
      console.error('❌ OpenAI intent classification failed:', error);
      return this.fallbackIntentClassification(query, context);
    }
  }

  enhancedQuickRuleBasedCheck(query, context) {
    const queryLower = query.toLowerCase();
    
    // HIGH CONFIDENCE: Similar customers queries
    if (this.isSimilarCustomersQuery(queryLower)) {
      return {
        type: 'SIMILAR_CUSTOMERS',
        confidence: 0.95,
        entities: ['similar', 'customers'],
        requiresAnalysisData: true,
        source: 'quick-similar-customers',
        reasoning: 'Query explicitly about similar customers'
      };
    }

    // HIGH CONFIDENCE: Timeline questions with analysis context
    if (context.analysisId && this.refersToCurrentCustomer(query) && this.isTimelineQuestion(query)) {
      return {
        type: 'ANALYSIS_QUESTION',
        confidence: 0.95,
        entities: ['timeline'],
        requiresAnalysisData: true,
        source: 'quick-timeline-check',
        reasoning: 'Timeline question about current customer'
      };
    }

    // HIGH CONFIDENCE: Clear current customer questions
    if (context.analysisId && this.refersToCurrentCustomer(query)) {
      return {
        type: 'ANALYSIS_QUESTION',
        confidence: 0.9,
        entities: [],
        requiresAnalysisData: true,
        source: 'quick-customer-check',
        reasoning: 'Question about current customer while viewing analysis'
      };
    }

    return { confidence: 0.5 };
  }

  isSimilarCustomersQuery(queryLower) {
    const similarCustomerIndicators = [
      'similar customers', 'similar customer', 'comparable customers',
      'like them', 'who are similar', 'reference customers',
      'similar companies', 'customers like', 'historical customers',
      'past customers', 'other customers', 'relevant customers'
    ];
    
    const explainSimilarIndicators = [
      'explain similar', 'tell me about similar', 'show me similar',
      'describe similar', 'analyze similar', 'most relevant similar'
    ];
    
    const hasSimilarIndicator = similarCustomerIndicators.some(indicator => 
      queryLower.includes(indicator)
    );
    
    const hasExplainSimilar = explainSimilarIndicators.some(indicator => 
      queryLower.includes(indicator)
    );
    
    return hasSimilarIndicator || hasExplainSimilar;
  }

  buildEnhancedClassificationPrompt(query, context) {
    const contextInfo = this.buildContextInfo(context);
    
    return `You are an expert intent classifier. Classify this query into ONE category with high accuracy.

CONTEXT:
${contextInfo}

CRITICAL CLASSIFICATION RULES:
1. If query mentions "similar customers", "similar customer", "comparable", "like them" → SIMILAR_CUSTOMERS
2. If viewing analysis AND asking about "the customer"/"they"/"their" → ANALYSIS_QUESTION  
3. If asking about external company names → EXTERNAL_COMPANY_RESEARCH
4. If asking for database searches → DATA_LOOKUP
5. If asking about general concepts → EXPLANATION

USER QUERY: "${query}"

EXAMPLES FOR ACCURACY:
- "Explain the most relevant similar customers" → SIMILAR_CUSTOMERS
- "Who are similar customers to this one?" → SIMILAR_CUSTOMERS
- "Did the customer mention timeline?" → ANALYSIS_QUESTION (when viewing analysis)
- "What is Mr. Chill's business model?" → EXTERNAL_COMPANY_RESEARCH
- "Search for HVAC companies" → DATA_LOOKUP
- "How does fit scoring work?" → EXPLANATION

RESPOND WITH VALID JSON ONLY:
{
  "type": "SIMILAR_CUSTOMERS",
  "confidence": 0.95,
  "entities": ["similar", "customers"],
  "reasoning": "User asking about similar customers analysis"
}`;
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

  strictValidateAndCorrect(intent, query, context) {
    const originalIntent = { ...intent };
    let wasCorrected = false;
    const corrections = [];

    // CORRECTION 1: Similar customers query misclassified
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

    // CORRECTION 2: Timeline question with wrong context
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

    // CORRECTION 3: Current customer override
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

  isTimelineQuestion(query) {
    const timelineIndicators = [
      'timeline', 'implementation timeline', 'go live', 'go-live',
      'when do they', 'when does', 'target date', 'launch date',
      'urgency', 'how soon', 'when', 'schedule'
    ];
    
    const queryLower = query.toLowerCase();
    return timelineIndicators.some(indicator => queryLower.includes(indicator));
  }

  fallbackIntentClassification(query, context) {
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
    
    if (queryLower.includes('email') || queryLower.includes('generate')) {
      return { type: 'EMAIL_GENERATION', confidence: 0.7, entities: [], requiresAnalysisData: true, source: 'fallback' };
    }
    
    if (queryLower.includes('search') || queryLower.includes('find') || queryLower.includes('lookup')) {
      return { type: 'DATA_LOOKUP', confidence: 0.7, entities: [], requiresAnalysisData: false, source: 'fallback' };
    }
    
    if (queryLower.includes('explain') || queryLower.includes('what is') || queryLower.includes('how does')) {
      return { type: 'EXPLANATION', confidence: 0.7, entities: [], requiresAnalysisData: false, source: 'fallback' };
    }
    
    if (context.analysisId) {
      return {
        type: 'ANALYSIS_QUESTION',
        confidence: 0.6,
        entities: [],
        requiresAnalysisData: true,
        source: 'fallback-default-analysis'
      };
    }
    
    return {
      type: 'GENERAL',
      confidence: 0.5,
      entities: [],
      requiresAnalysisData: false,
      source: 'fallback-default-general'
    };
  }

  async callOpenAI(prompt, options = {}) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }
    
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert intent classifier. Always respond with valid JSON only. Be precise and context-aware. Pay special attention to similar customer queries.'
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
  }
}

/**
 * COMPLETE: Enhanced Conversational AI Service - All Features & Context-Rich Responses
 */
class ConversationalAIService {
  constructor() {
    this.conversationContexts = new Map();
    this.webCache = new Map();
    this.socialCache = new Map();
    this.companyDataCache = new Map();
    
    this.businessIntelligence = new BusinessIntelligenceExtractor();
    this.industryKnowledgeBase = this.initializeIndustryKnowledge();
    this.companyExtractor = new CompanyNameExtractor();
    this.intentClassifier = new OpenAIIntentClassifier();
  }

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

  async processQuery(query, options = {}) {
    try {
      const { analysisId, conversationId, userId } = options;
      
      const context = await this.getContext(conversationId, analysisId);
      const intent = await this.classifyIntent(query, context);
      
      let enhancementData = null;
      if (this.shouldEnhanceWithWebData(query, intent, context)) {
        try {
          const targetCompany = intent.externalCompany || context.analysisData?.customerName;
          enhancementData = await this.gatherWebEnhancement(targetCompany, context.analysisData);
        } catch (error) {
          console.log('Web enhancement failed, continuing without it:', error.message);
        }
      }
      
      const response = await this.routeQuery(intent, query, context, enhancementData);
      
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

  async getContext(conversationId, analysisId) {
    const context = {
      conversationId,
      analysisId,
      analysisData: null,
      conversationHistory: []
    };

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

    if (conversationId && this.conversationContexts.has(conversationId)) {
      context.conversationHistory = this.conversationContexts.get(conversationId);
    }

    return context;
  }

  async updateContext(conversationId, update) {
    if (!conversationId) return;

    if (!this.conversationContexts.has(conversationId)) {
      this.conversationContexts.set(conversationId, []);
    }

    const history = this.conversationContexts.get(conversationId);
    history.push(update);

    if (history.length > 10) {
      history.shift();
    }
  }

  async classifyIntent(query, context) {
    return await this.intentClassifier.classifyIntent(query, context);
  }

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
   * ENHANCED: Context-Rich Analysis Question Handler
   */
  async handleAnalysisQuestion(query, context) {
    if (!context.analysisData) {
      return "I need analysis data to answer that question. Please make sure you're viewing a specific customer analysis.";
    }

    const analysisData = context.analysisData;
    const queryLower = query.toLowerCase();

    // ENHANCED: Specific timeline handling with full context
    if (queryLower.includes('timeline') || queryLower.includes('implementation') || 
        queryLower.includes('go live') || queryLower.includes('when') ||
        queryLower.includes('urgency') || queryLower.includes('target date')) {
      
      return this.generateTimelineResponse(analysisData);
    }

    // ENHANCED: Comprehensive analysis questions with rich context
    const prompt = `
You are analyzing ${analysisData.customerName}'s specific situation. Use their ACTUAL data to give precise, actionable answers.

## CUSTOMER PROFILE
**Company:** ${analysisData.customerName}
**Industry:** ${analysisData.industry}
**Fit Score:** ${analysisData.fitScore}% (${this.getFitScoreLevel(analysisData.fitScore)})
**Team Size:** ${analysisData.userCount?.total || 'Unknown'} total users (${analysisData.userCount?.field || 0} field workers, ${analysisData.userCount?.backOffice || 0} office staff)

## CURRENT CHALLENGES & PAIN POINTS
${analysisData.challenges?.map(c => `• **${c.title}** (${c.severity} severity): ${c.description}`).join('\n') || '• No specific challenges identified'}

## KEY REQUIREMENTS
${analysisData.requirements?.keyFeatures?.map(req => `• ${req}`).join('\n') || '• No specific requirements listed'}

## CURRENT SYSTEMS & PAIN POINTS
${analysisData.currentState?.currentSystems?.map(sys => 
  `• **${sys.name}**: ${sys.usage || 'Usage not specified'}${sys.painPoints?.length ? '\n  - Issues: ' + sys.painPoints.join(', ') : ''}`
).join('\n') || '• No current systems data available'}

## INTEGRATION REQUIREMENTS
${analysisData.requirements?.integrations?.map(int => 
  `• **${int.system}** (${int.priority} priority): ${int.purpose}`
).join('\n') || '• No integration requirements specified'}

## IMPLEMENTATION CONTEXT
**Timeline:** ${analysisData.timeline?.desiredGoLive || 'Not specified'} | **Urgency:** ${analysisData.timeline?.urgency || 'Not specified'}
**Budget:** ${analysisData.budget?.mentioned ? (analysisData.budget.range || 'Budget discussed but range not detailed') : 'Budget not discussed'}

## SALES RECOMMENDATION
**Strategy:** ${analysisData.recommendations?.salesStrategy?.recommendation || 'No specific recommendation available'}
**Reasoning:** ${analysisData.recommendations?.fitScoreRationale?.summary || 'No detailed reasoning provided'}

**Positive Factors:** ${analysisData.recommendations?.fitScoreRationale?.positiveFactors?.join(', ') || 'None specified'}
**Challenges:** ${analysisData.recommendations?.fitScoreRationale?.negativeFactors?.join(', ') || 'None specified'}

USER QUESTION: "${query}"

INSTRUCTIONS:
1. Use ONLY the actual data provided above
2. Be specific and reference their exact company name, numbers, and details
3. Provide actionable insights based on their specific situation
4. If data is missing, clearly state what information would be helpful to gather
5. Connect your answer to their business context and specific needs

Provide a comprehensive, well-formatted response that directly addresses their question using their specific data.`;

    return await this.callOpenAI(prompt, { maxTokens: 1200 });
  }

  /**
   * ENHANCED: Context-Rich Similar Customers Handler
   */
  async handleSimilarCustomersQuery(query, context) {
    if (!context.analysisData?.similarCustomers) {
      return "No similar customers data is available for this analysis.";
    }

    const analysisData = context.analysisData;
    
    const prompt = `
You are a field service software sales expert providing strategic insights about similar customers for ${analysisData.customerName}.

## CURRENT PROSPECT COMPLETE PROFILE
**Company:** ${analysisData.customerName}
**Industry:** ${analysisData.industry}
**Size:** ${analysisData.userCount?.total || 'Unknown'} total users (${analysisData.userCount?.field || 0} field workers)
**Fit Score:** ${analysisData.fitScore}% (${this.getFitScoreLevel(analysisData.fitScore)})

### Current Challenges & Pain Points
${analysisData.challenges?.map(c => `• **${c.title}** (${c.severity} severity): ${c.description}`).join('\n') || '• No specific challenges identified'}

### Key Requirements
${analysisData.requirements?.keyFeatures?.map(req => `• ${req}`).join('\n') || '• No specific requirements listed'}

### Current Systems & Issues
${analysisData.currentState?.currentSystems?.map(sys => 
  `• **${sys.name}**: ${sys.usage || 'Usage not specified'}${sys.painPoints?.length ? ' | Issues: ' + sys.painPoints.join(', ') : ''}`
).join('\n') || '• No current systems data available'}

### Integration Needs
${analysisData.requirements?.integrations?.map(int => 
  `• **${int.system}** (${int.priority} priority): ${int.purpose}`
).join('\n') || '• No integration requirements specified'}

### Implementation Context
**Timeline:** ${analysisData.timeline?.desiredGoLive || 'Not specified'} | **Urgency:** ${analysisData.timeline?.urgency || 'Not specified'}
**Budget:** ${analysisData.budget?.mentioned ? (analysisData.budget.range || 'Budget discussed') : 'Budget not discussed'}

### Current Sales Recommendation
**Strategy:** ${analysisData.recommendations?.salesStrategy?.recommendation || 'No specific recommendation'}

## SIMILAR CUSTOMERS DATA
${JSON.stringify(analysisData.similarCustomers, null, 2)}

USER QUESTION: "${query}"

## PROVIDE STRATEGIC SIMILAR CUSTOMER ANALYSIS

Generate a comprehensive, well-formatted response that includes:

### 🎯 **Most Relevant Similar Customer Matches**
Identify the TOP 2-3 most relevant customers for ${analysisData.customerName} and explain SPECIFICALLY why they're relevant:
- Size/industry alignment
- Similar challenges or use cases
- Comparable implementation complexity
- Reference their actual success metrics

### 📊 **Key Strategic Insights**
- What worked well for similar customers that applies to ${analysisData.customerName}?
- What challenges did similar customers face that we should watch for?
- How do implementation timelines and outcomes compare?
- What patterns emerge across successful implementations?

### 🚀 **Actionable Lessons for ${analysisData.customerName}**
Based on their specific challenges (${analysisData.challenges?.map(c => c.title).join(', ') || 'none identified'}):
- What specific lessons can we apply?
- How do similar customer outcomes inform our ${analysisData.fitScore}% fit score approach?
- What proven strategies should we emphasize?

### 💼 **Sales Strategy Application**
- How should these insights influence our sales approach?
- What success stories can we reference in conversations?
- What potential objections can we preemptively address?
- Which similar customers would make good references?

### ⚠️ **Implementation Risk Assessment**
- What are the likely implementation risks based on similar customers?
- What factors contributed to successful vs. challenging implementations?
- How can we position ourselves for success with ${analysisData.customerName}?

Use specific data points, metrics, and customer examples. Make it actionable and directly relevant to ${analysisData.customerName}'s situation.`;

    return await this.callOpenAI(prompt, { maxTokens: 1800 });
  }

  /**
   * ENHANCED: Timeline Response Generator
   */
  generateTimelineResponse(analysisData) {
    const timelineInfo = analysisData.timeline;
    let response = `# 📅 Implementation Timeline Analysis for ${analysisData.customerName}\n\n`;
    
    // Timeline specifics with context
    if (timelineInfo?.desiredGoLive) {
      response += `## 🎯 **Desired Go-Live Date**\n${timelineInfo.desiredGoLive}\n\n`;
    } else {
      response += `## 🎯 **Desired Go-Live Date**\n❌ Not specified during discovery call\n*Recommendation: Follow up to understand their timeline requirements*\n\n`;
    }
    
    if (timelineInfo?.urgency) {
      response += `## ⚡ **Urgency Level**\n**${timelineInfo.urgency}**\n`;
      
      if (timelineInfo.urgency === 'High') {
        response += `*⚠️ High urgency may require accelerated implementation approach and dedicated resources*\n\n`;
      } else if (timelineInfo.urgency === 'Low') {
        response += `*✅ Flexible timeline allows for thorough planning and phased implementation*\n\n`;
      } else {
        response += `*📋 Standard implementation timeline approach recommended*\n\n`;
      }
    }
    
    // Timeline constraints with business impact
    if (timelineInfo?.constraints && timelineInfo.constraints.length > 0) {
      response += `## 🚫 **Timeline Constraints**\n`;
      timelineInfo.constraints.forEach(constraint => {
        response += `• ${constraint}\n`;
      });
      response += `\n`;
    }
    
    // Implementation recommendation with phases
    if (analysisData.recommendations?.implementationApproach?.phases) {
      const phases = analysisData.recommendations.implementationApproach.phases;
      const totalDuration = phases.reduce((total, phase) => {
        const weeks = parseInt(phase.duration) || 0;
        return total + weeks;
      }, 0);
      
      response += `## 🗓️ **Recommended Implementation Timeline**\n`;
      response += `**Total Duration:** ${totalDuration} weeks across ${phases.length} phases\n\n`;
      
      phases.forEach((phase, index) => {
        response += `### Phase ${phase.phase}: ${phase.name}\n`;
        response += `**Duration:** ${phase.duration}\n`;
        if (phase.activities && phase.activities.length > 0) {
          response += `**Key Activities:**\n`;
          phase.activities.forEach(activity => {
            response += `• ${activity}\n`;
          });
        }
        response += `\n`;
      });
    }
    
    // Strategic timeline insights
    response += `## 💡 **Strategic Timeline Insights**\n`;
    
    if (analysisData.fitScore >= 80) {
      response += `• **High Fit Score (${analysisData.fitScore}%)** suggests smooth implementation timeline\n`;
    } else if (analysisData.fitScore < 60) {
      response += `• **Lower Fit Score (${analysisData.fitScore}%)** may require extended timeline for customization\n`;
    }
    
    if (analysisData.requirements?.integrations?.length > 3) {
      response += `• **Multiple Integrations (${analysisData.requirements.integrations.length})** may extend implementation timeline\n`;
    }
    
    if (analysisData.userCount?.total > 100) {
      response += `• **Large User Base (${analysisData.userCount.total} users)** requires phased rollout approach\n`;
    }
    
    if (!timelineInfo?.desiredGoLive && !timelineInfo?.urgency) {
      response += `\n## 🎯 **Next Steps**\n`;
      response += `• Schedule follow-up to discuss specific timeline requirements\n`;
      response += `• Understand any business deadlines or seasonal considerations\n`;
      response += `• Clarify decision-making timeline and approval process\n`;
    }
    
    return response;
  }

  /**
   * UTILITY: Get fit score level description
   */
  getFitScoreLevel(score) {
    if (score >= 80) return 'Excellent Fit';
    if (score >= 60) return 'Good Fit';
    if (score >= 40) return 'Moderate Fit';
    return 'Challenging Fit';
  }

  /**
   * PRESERVED: Business Model Question Handler
   */
  async handleBusinessModelQuestion(query, context, enhancementData = null) {
    const analysisData = context.analysisData;
    
    const prompt = `
Analyze the business model for ${analysisData.customerName} using comprehensive intelligence.

## INTERNAL ANALYSIS
**Company:** ${analysisData.customerName}
**Industry:** ${analysisData.industry}
**Size:** ${analysisData.userCount?.total || 'Unknown'} users (${analysisData.userCount?.field || 0} field workers)

**Services:** ${analysisData.services?.types?.join(', ') || 'Not specified'}
**Customer Base Indicators:** ${analysisData.services?.details || 'Not detailed'}

**Current Systems:** ${analysisData.currentState?.currentSystems?.map(sys => sys.name).join(', ') || 'None specified'}

${enhancementData ? `
## WEB INTELLIGENCE
${JSON.stringify(enhancementData, null, 2)}
` : '## WEB INTELLIGENCE\nNo web intelligence available.'}

USER QUESTION: "${query}"

Provide comprehensive business model analysis with specific evidence and actionable insights for field service software sales.`;

    return await this.callOpenAI(prompt, { maxTokens: 1200 });
  }

  /**
   * NEW: External Company Business Model Handler
   */
  async handleExternalCompanyBusinessModel(query, context, externalCompany, enhancementData = null) {
    const prompt = `
Analyze the business model for external company: **${externalCompany}**

${enhancementData ? `
## WEB INTELLIGENCE FOR ${externalCompany}
${JSON.stringify(enhancementData, null, 2)}
` : `## WEB INTELLIGENCE
No web intelligence available - providing analysis based on company name and industry patterns.`}

${context.analysisData ? `
## CURRENT ANALYSIS CONTEXT
**Main Customer:** ${context.analysisData.customerName} (${context.analysisData.industry})
**For Comparison/Reference**
` : '## CONTEXT\nNo current analysis context.'}

USER QUESTION: "${query}"

Provide comprehensive business model analysis for ${externalCompany}:

### 🏢 **Business Model Classification**
- Primary model (B2B/B2C/Mixed) with confidence level
- Supporting evidence from available data
- Industry context and typical patterns

### 👥 **Target Customer Analysis** 
- Likely customer segments served
- Market positioning and approach
- Service delivery model

### 💰 **Revenue Model Implications**
- Estimated business size and scope
- Pricing model insights
- Market positioning indicators

### 🔧 **Field Service Software Implications**
- Software needs based on business model
- Implementation complexity expectations
- Competitive positioning insights

${context.analysisData ? `
### 📊 **Comparison with ${context.analysisData.customerName}**
- Similarities and differences in business approach
- Competitive insights and market positioning
- Strategic implications for our sales approach
` : ''}

Focus specifically on ${externalCompany} and provide actionable business intelligence.`;

    return await this.callOpenAI(prompt, { maxTokens: 1200 });
  }

  /**
   * NEW: External Company Research Handler
   */
  async handleExternalCompanyResearch(query, context, externalCompany, enhancementData = null) {
    const prompt = `
Provide comprehensive company intelligence for: **${externalCompany}**

${enhancementData ? `
## WEB INTELLIGENCE FOR ${externalCompany}
${JSON.stringify(enhancementData, null, 2)}
` : `## WEB INTELLIGENCE
No web intelligence available - providing analysis based on company name and industry patterns.`}

${context.analysisData ? `
## CURRENT ANALYSIS CONTEXT
**Main Customer:** ${context.analysisData.customerName} (${context.analysisData.industry})
` : ''}

USER QUESTION: "${query}"

Provide detailed company profile for ${externalCompany} addressing the specific question asked.
Include business intelligence, market position, and competitive insights when available.

${context.analysisData ? `
Reference comparisons with ${context.analysisData.customerName} where relevant.
` : ''}`;

    return await this.callOpenAI(prompt, { maxTokens: 1000 });
  }

  /**
   * PRESERVED: Enhanced Next Steps Handler
   */
  async handleNextStepsQuery(query, context) {
    const analysisData = context.analysisData;
    if (!analysisData) {
      return "I need specific analysis data to provide strategic recommendations. Please view a customer analysis first.";
    }

    const prompt = `
You are a sales strategy AI assistant for ${analysisData.customerName}. Provide specific, actionable next steps.

## PROSPECT ANALYSIS
**Customer:** ${analysisData.customerName} (${analysisData.industry})
**Fit Score:** ${analysisData.fitScore}% (${this.getFitScoreLevel(analysisData.fitScore)})
**Team Size:** ${analysisData.userCount?.total || 'Unknown'} users
**Timeline:** ${analysisData.timeline?.desiredGoLive || 'TBD'} | **Urgency:** ${analysisData.timeline?.urgency || 'Unknown'}

## CURRENT CHALLENGES
${analysisData.challenges?.map(c => `• ${c.title} (${c.severity}): ${c.description}`).join('\n') || '• No specific challenges identified'}

## KEY REQUIREMENTS
${analysisData.requirements?.keyFeatures?.join('\n• ') || '• No specific requirements listed'}

## SALES STRATEGY & RECOMMENDATIONS
**Recommendation:** ${analysisData.recommendations?.salesStrategy?.recommendation || 'No specific recommendation'}
**Approach:** ${analysisData.recommendations?.salesStrategy?.approach || 'Standard approach recommended'}

USER QUESTION: "${query}"

Provide specific, actionable next steps formatted as:

### 🎯 **Immediate Actions (Next 1-2 Days)**
• [Specific action items based on their situation]

### 📋 **Short-term Strategy (Next 1-2 Weeks)**  
• [Strategic initiatives to advance the sale]

### 💬 **Key Talking Points for Next Conversation**
• [Specific points to address based on their challenges/requirements]

### 🛡️ **Potential Objections & Responses**
• [Likely objections based on their fit score and how to handle them]

### ⏰ **Timeline Recommendations**
• [Specific timing advice based on their urgency and requirements]

Be practical, sales-focused, and specific to ${analysisData.customerName}'s situation.`;

    return await this.callOpenAI(prompt, { maxTokens: 1200 });
  }

  /**
   * PRESERVED: Enhanced Email Generation Handler
   */
  async handleEmailGeneration(query, context) {
    const analysisData = context.analysisData;
    if (!analysisData) {
      return "I need customer analysis data to generate a personalized email. Please view a specific analysis first.";
    }

    const emailType = this.detectEmailType(query);
    
    const prompt = `
Generate a professional, personalized ${emailType} email for ${analysisData.customerName}.

## CUSTOMER CONTEXT
**Company:** ${analysisData.customerName} (${analysisData.industry})
**Contact:** [Name to be filled in]
**Team Size:** ${analysisData.userCount?.total || 'Unknown'} users
**Fit Score:** ${analysisData.fitScore}%

## KEY INSIGHTS TO REFERENCE
**Main Challenges:** ${analysisData.challenges?.map(c => c.title).join(', ') || 'General efficiency improvements'}
**Key Requirements:** ${analysisData.requirements?.keyFeatures?.slice(0, 3).join(', ') || 'Field service management capabilities'}
**Timeline:** ${analysisData.timeline?.desiredGoLive || 'To be determined'}
**Current Systems:** ${analysisData.currentState?.currentSystems?.map(sys => sys.name).join(', ') || 'Legacy systems'}

## SALES RECOMMENDATION
**Strategy:** ${analysisData.recommendations?.salesStrategy?.recommendation || 'Standard approach'}

USER REQUEST: "${query}"

Generate a professional email with:

### Subject Line
[Compelling, personalized subject line]

### Email Body
- Professional greeting
- Personalized content referencing their specific situation
- Value proposition aligned to their challenges
- Clear next steps
- Professional closing

**Important:** Reference their actual challenges, requirements, and business context to make it highly personalized and relevant.`;

    return await this.callOpenAI(prompt, { maxTokens: 800 });
  }

  /**
   * PRESERVED: Data Lookup Handler
   */
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
        .limit(10)
        .toArray();

      const prompt = `
You are a data lookup assistant. Answer the user's question based on search results.

USER QUERY: "${query}"

SEARCH RESULTS (${results.length} found):
${results.map(r => 
  `• **${r.customerName}** (${r.industry}) - Fit Score: ${r.fitScore}% - ${r.userCount?.total || 'Unknown'} users`
).join('\n')}

Provide a helpful summary of findings with:
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

  /**
   * PRESERVED: Explanation Handler
   */
  async handleExplanation(query, context) {
    const prompt = `
You are an expert on field service management software and customer analysis.
Explain concepts clearly with practical insights.

USER QUESTION: "${query}"

Provide a clear, helpful explanation including:

### 📚 **Concept Definition**
[Clear explanation of the main concept]

### 🎯 **Why It Matters in Field Service Software Sales**
[Business relevance and importance]

### 💡 **Practical Examples**
[Real-world examples and use cases]

### 🔗 **How It Relates to Customer Success**
[Connection to successful implementations]

Be educational but conversational, with actionable insights.`;

    return await this.callOpenAI(prompt);
  }

  /**
   * PRESERVED: General Query Handler
   */
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

  /**
   * PRESERVED: Helper Methods
   */
  detectEmailType(query) {
    const queryLower = query.toLowerCase();
    if (queryLower.includes('follow') || queryLower.includes('follow-up')) return 'follow-up';
    if (queryLower.includes('intro') || queryLower.includes('introduction')) return 'introduction';
    if (queryLower.includes('proposal') || queryLower.includes('quote')) return 'proposal';
    if (queryLower.includes('thank')) return 'thank you';
    if (queryLower.includes('meeting') || queryLower.includes('demo')) return 'meeting invitation';
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
              content: 'You are an expert AI assistant for field service management software sales. Provide accurate, helpful, and well-formatted responses using markdown. Be specific and actionable.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: options.maxTokens || 1000
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

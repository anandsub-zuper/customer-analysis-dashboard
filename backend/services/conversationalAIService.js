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
 * ENHANCED: OpenAI Intent Classifier - Context-aware classification
 */
class OpenAIIntentClassifier {
  constructor() {
    this.intentCategories = {
      'ANALYSIS_QUESTION': {
        description: 'Questions about the current customer analysis being viewed',
        examples: [
          'What is their fit score?',
          'Did the customer mention timeline?',
          'Why is the score 85%?',
          'What are their requirements?',
          'What challenges do they have?'
        ],
        requiresAnalysisData: true
      },
      'BUSINESS_MODEL': {
        description: 'Questions about business models (B2B/B2C) for any company',
        examples: [
          'What is their business model?',
          'Are they B2B or B2C?',
          'What type of customers do they serve?'
        ],
        requiresAnalysisData: false
      },
      'SIMILAR_CUSTOMERS': {
        description: 'Questions about similar customers or historical comparisons',
        examples: [
          'Who are similar customers?',
          'What can we learn from similar companies?',
          'How did similar customers implement?'
        ],
        requiresAnalysisData: true
      },
      'EXTERNAL_COMPANY_RESEARCH': {
        description: 'Research about companies not in the current analysis',
        examples: [
          'What is Mr. Chill\'s business model?',
          'Tell me about ABC Company',
          'Research XYZ Corporation'
        ],
        requiresAnalysisData: false
      },
      'NEXT_STEPS': {
        description: 'Questions about sales strategy and next actions',
        examples: [
          'What should I do next?',
          'What\'s the recommended approach?',
          'How should I follow up?'
        ],
        requiresAnalysisData: true
      },
      'EMAIL_GENERATION': {
        description: 'Requests to generate emails or communications',
        examples: [
          'Generate a follow-up email',
          'Write a proposal email',
          'Draft a meeting request'
        ],
        requiresAnalysisData: true
      },
      'DATA_LOOKUP': {
        description: 'Database searches for customers or historical data',
        examples: [
          'Find customers in HVAC industry',
          'Search for companies with 50+ users',
          'Lookup customers from 2023'
        ],
        requiresAnalysisData: false
      },
      'EXPLANATION': {
        description: 'General explanations of concepts or processes',
        examples: [
          'How does fit scoring work?',
          'What is field service management?',
          'Explain the analysis process'
        ],
        requiresAnalysisData: false
      },
      'GENERAL': {
        description: 'General conversation or greetings',
        examples: [
          'Hello',
          'How are you?',
          'Thank you'
        ],
        requiresAnalysisData: false
      }
    };
  }

  async classifyIntent(query, context) {
    // Quick rule-based checks for obvious cases first
    const quickCheck = this.quickRuleBasedCheck(query, context);
    if (quickCheck.confidence > 0.9) {
      console.log('🚀 Quick classification:', quickCheck.type);
      return quickCheck;
    }

    // Use OpenAI for complex cases
    try {
      const prompt = this.buildClassificationPrompt(query, context);
      console.log('🤖 Using OpenAI for intent classification...');
      
      const response = await this.callOpenAI(prompt, { maxTokens: 300 });
      const intent = JSON.parse(response);
      
      // Validate and enhance the response
      const validatedIntent = this.validateAndEnhanceIntent(intent, query, context);
      
      console.log('✅ OpenAI Intent Classification:', {
        query: query.substring(0, 50),
        intent: validatedIntent.type,
        confidence: validatedIntent.confidence,
        reasoning: validatedIntent.reasoning
      });
      
      return validatedIntent;
      
    } catch (error) {
      console.error('❌ OpenAI intent classification failed:', error);
      
      // Fallback to enhanced rule-based classification
      console.log('🔄 Falling back to rule-based classification...');
      return this.fallbackIntentClassification(query, context);
    }
  }

  quickRuleBasedCheck(query, context) {
    const queryLower = query.toLowerCase();
    
    // High-confidence timeline questions with analysis context
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

    // Clear current customer questions
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

    return { confidence: 0.5 }; // Not confident enough for quick classification
  }

  buildClassificationPrompt(query, context) {
    const contextInfo = this.buildContextInfo(context);
    const categoryDescriptions = this.buildCategoryDescriptions();
    
    return `You are an expert intent classifier for a field service management software sales assistant.

CONTEXT INFORMATION:
${contextInfo}

INTENT CATEGORIES:
${categoryDescriptions}

CLASSIFICATION RULES:
1. If user is viewing a customer analysis (analysisId exists) and asks about "the customer", "they", "their" → ANALYSIS_QUESTION
2. If asking about timeline, requirements, budget, systems of current customer → ANALYSIS_QUESTION  
3. If mentioning specific external company names → EXTERNAL_COMPANY_RESEARCH
4. If asking for database searches without current customer context → DATA_LOOKUP
5. If asking about general concepts/processes → EXPLANATION

USER QUERY: "${query}"

CRITICAL DECISION POINTS:
- Does "customer" refer to the current analysis customer or general customers?
- Is this about current analysis data or external research?
- Is this a question about loaded data or requiring new data lookup?

Respond with JSON only:
{
  "type": "ANALYSIS_QUESTION",
  "confidence": 0.95,
  "entities": ["timeline", "implementation"],
  "requiresAnalysisData": true,
  "reasoning": "User asking about current customer's timeline while viewing analysis",
  "contextClues": ["did the customer", "viewing analysis", "specific data request"]
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
- Has Budget Info: ${!!context.analysisData.budget}

This means questions about "the customer", "they", "their" refer to ${context.analysisData.customerName}.`;
    } else {
      contextInfo += `NO CURRENT ANALYSIS CONTEXT:
- User is not viewing a specific customer analysis
- Questions about "customers" likely refer to general database searches
- No loaded customer data available`;
    }
    
    if (context.conversationHistory && context.conversationHistory.length > 0) {
      const recentQueries = context.conversationHistory.slice(-3).map(h => h.userQuery);
      contextInfo += `\n\nRECENT CONVERSATION:
${recentQueries.map(q => `- "${q}"`).join('\n')}`;
    }
    
    return contextInfo;
  }

  buildCategoryDescriptions() {
    return Object.entries(this.intentCategories)
      .map(([type, info]) => {
        return `${type}: ${info.description}
Examples: ${info.examples.slice(0, 3).join(', ')}
Requires Analysis Data: ${info.requiresAnalysisData}`;
      })
      .join('\n\n');
  }

  validateAndEnhanceIntent(intent, query, context) {
    // Ensure required fields exist
    if (!intent.type || !this.intentCategories[intent.type]) {
      console.warn('Invalid intent type, using fallback');
      return this.fallbackIntentClassification(query, context);
    }
    
    // Set default values
    const enhancedIntent = {
      type: intent.type,
      confidence: intent.confidence || 0.7,
      entities: intent.entities || [],
      requiresAnalysisData: this.intentCategories[intent.type].requiresAnalysisData,
      reasoning: intent.reasoning || 'OpenAI classification',
      contextClues: intent.contextClues || [],
      source: 'openai'
    };
    
    // Apply validation rules
    enhancedIntent.validated = this.applyValidationRules(enhancedIntent, query, context);
    
    return enhancedIntent;
  }

  applyValidationRules(intent, query, context) {
    const rules = [];
    
    // Rule 1: If viewing analysis and asking about "the customer" → must be ANALYSIS_QUESTION
    if (context.analysisId && this.refersToCurrentCustomer(query) && intent.type !== 'ANALYSIS_QUESTION') {
      rules.push({
        rule: 'current_customer_override',
        original: intent.type,
        corrected: 'ANALYSIS_QUESTION',
        reason: 'Query refers to current customer while viewing analysis'
      });
      intent.type = 'ANALYSIS_QUESTION';
      intent.confidence = 0.95;
    }
    
    // Rule 2: Timeline questions with analysis context → ANALYSIS_QUESTION
    if (context.analysisId && this.isTimelineQuestion(query) && intent.type === 'DATA_LOOKUP') {
      rules.push({
        rule: 'timeline_context_override',
        original: intent.type,
        corrected: 'ANALYSIS_QUESTION',
        reason: 'Timeline question with analysis context should use loaded data'
      });
      intent.type = 'ANALYSIS_QUESTION';
      intent.confidence = 0.9;
    }
    
    return rules;
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
      'urgency', 'how soon', 'when', 'timeline'
    ];
    
    const queryLower = query.toLowerCase();
    return timelineIndicators.some(indicator => queryLower.includes(indicator));
  }

  fallbackIntentClassification(query, context) {
    const queryLower = query.toLowerCase();
    
    // High-confidence rule-based classification for critical cases
    if (context.analysisId && this.refersToCurrentCustomer(query)) {
      return {
        type: 'ANALYSIS_QUESTION',
        confidence: 0.85,
        entities: [],
        requiresAnalysisData: true,
        source: 'fallback-customer-context',
        reasoning: 'Fallback: User asking about current customer while viewing analysis'
      };
    }
    
    if (context.analysisId && this.isTimelineQuestion(query)) {
      return {
        type: 'ANALYSIS_QUESTION',
        confidence: 0.8,
        entities: ['timeline'],
        requiresAnalysisData: true,
        source: 'fallback-timeline-context',
        reasoning: 'Fallback: Timeline question with analysis context'
      };
    }
    
    // Other fallback rules...
    if (queryLower.includes('business model')) {
      return { type: 'BUSINESS_MODEL', confidence: 0.7, entities: [], requiresAnalysisData: false, source: 'fallback' };
    }
    
    if (queryLower.includes('similar')) {
      return { type: 'SIMILAR_CUSTOMERS', confidence: 0.7, entities: [], requiresAnalysisData: true, source: 'fallback' };
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
    
    // Default based on context
    if (context.analysisId) {
      return {
        type: 'ANALYSIS_QUESTION',
        confidence: 0.6,
        entities: [],
        requiresAnalysisData: true,
        source: 'fallback-default-analysis',
        reasoning: 'Fallback: Default to analysis question when viewing analysis'
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
            content: 'You are an expert intent classifier. Always respond with valid JSON only. Be precise and context-aware.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1, // Low temperature for consistent classification
        max_tokens: options.maxTokens || 300
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 second timeout
      }
    );
    
    return response.data.choices[0].message.content.trim();
  }
}

/**
 * COMPLETE: Enhanced Conversational AI Service - All Features Preserved & Enhanced
 */
class ConversationalAIService {
  constructor() {
    this.conversationContexts = new Map();
    this.webCache = new Map(); // PRESERVED: Original cache
    this.socialCache = new Map(); // PRESERVED: Original cache
    this.companyDataCache = new Map(); // PRESERVED: Original cache
    
    // PRESERVED: Original business intelligence extractor (now enhanced)
    this.businessIntelligence = new BusinessIntelligenceExtractor();
    this.industryKnowledgeBase = this.initializeIndustryKnowledge();
    
    // ENHANCED: New capabilities
    this.companyExtractor = new CompanyNameExtractor();
    this.intentClassifier = new OpenAIIntentClassifier();
  }

  /**
   * PRESERVED: Initialize industry knowledge base (unchanged)
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
   * PRESERVED: Process user query (enhanced with better intent classification)
   */
  async processQuery(query, options = {}) {
    try {
      const { analysisId, conversationId, userId } = options;
      
      // PRESERVED: Get conversation context
      const context = await this.getContext(conversationId, analysisId);
      
      // ENHANCED: Classify user intent (now uses OpenAI + fallbacks)
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
      
      // ENHANCED: Route to appropriate handler (supports all new intents)
      const response = await this.routeQuery(intent, query, context, enhancementData);
      
      // PRESERVED: Update conversation context
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
   * ENHANCED: Use OpenAI-powered intent classification
   */
  async classifyIntent(query, context) {
    return await this.intentClassifier.classifyIntent(query, context);
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
   * ENHANCED: Route query to appropriate handler (supports all intent types)
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
   * ENHANCED: Handle analysis questions with improved timeline handling
   */
  async handleAnalysisQuestion(query, context) {
    if (!context.analysisData) {
      return "I need analysis data to answer that question. Please make sure you're viewing a specific customer analysis.";
    }

    const analysisData = context.analysisData;
    const queryLower = query.toLowerCase();

    // ENHANCED: Specific timeline handling
    if (queryLower.includes('timeline') || queryLower.includes('implementation') || 
        queryLower.includes('go live') || queryLower.includes('when') ||
        queryLower.includes('urgency') || queryLower.includes('target date')) {
      
      const timelineInfo = analysisData.timeline;
      let timelineResponse = `## Implementation Timeline for ${analysisData.customerName}\n\n`;
      
      if (timelineInfo?.desiredGoLive) {
        timelineResponse += `**Desired Go-Live Date:** ${timelineInfo.desiredGoLive}\n`;
      } else {
        timelineResponse += `**Desired Go-Live Date:** Not specified in the analysis\n`;
      }
      
      if (timelineInfo?.urgency) {
        timelineResponse += `**Urgency Level:** ${timelineInfo.urgency}\n`;
      }
      
      if (timelineInfo?.constraints && timelineInfo.constraints.length > 0) {
        timelineResponse += `**Timeline Constraints:**\n`;
        timelineInfo.constraints.forEach(constraint => {
          timelineResponse += `• ${constraint}\n`;
        });
      }
      
      // Add implementation recommendation if available
      if (analysisData.recommendations?.implementationApproach?.phases) {
        const phases = analysisData.recommendations.implementationApproach.phases;
        const totalDuration = phases.reduce((total, phase) => {
          const weeks = parseInt(phase.duration) || 0;
          return total + weeks;
        }, 0);
        
        timelineResponse += `\n**Recommended Implementation Timeline:** ${totalDuration} weeks across ${phases.length} phases\n`;
      }
      
      if (!timelineInfo?.desiredGoLive && !timelineInfo?.urgency && !timelineInfo?.constraints) {
        timelineResponse += `\nThe customer did not specify a specific implementation timeline during the discovery call. You may want to follow up to understand their timeline requirements and any deadlines they're working towards.`;
      }
      
      return timelineResponse;
    }

    // PRESERVED: General analysis questions with comprehensive data
    const prompt = `
You are analyzing a SPECIFIC customer's situation. Use their ACTUAL data to give precise, factual answers.

CUSTOMER: ${analysisData.customerName}
INDUSTRY: ${analysisData.industry}
FIT SCORE: ${analysisData.fitScore}%
USERS: ${analysisData.userCount?.total || 'Not specified'} total (${analysisData.userCount?.field || 'Not specified'} field workers)

TIMELINE INFORMATION:
Desired Go-Live: ${analysisData.timeline?.desiredGoLive || 'Not specified'}
Urgency: ${analysisData.timeline?.urgency || 'Not specified'}
Constraints: ${analysisData.timeline?.constraints?.join(', ') || 'None specified'}

BUDGET INFORMATION:
${JSON.stringify(analysisData.budget, null, 2)}

CURRENT STATE & SYSTEMS:
${JSON.stringify(analysisData.currentState, null, 2)}

SERVICES THEY PROVIDE:
${analysisData.services ? JSON.stringify(analysisData.services, null, 2) : 'Not specified'}

REQUIREMENTS & NEEDS:
${JSON.stringify(analysisData.requirements, null, 2)}

ACTUAL STRENGTHS:
${analysisData.strengths?.map(s => `• ${s.title}: ${s.description}`).join('\n') || 'None listed'}

ACTUAL CHALLENGES:
${analysisData.challenges?.map(c => `• ${c.title}: ${c.description} (Severity: ${c.severity})`).join('\n') || 'None listed'}

SALES RECOMMENDATION: ${analysisData.recommendations?.salesStrategy?.recommendation || 'Not specified'}

USER QUESTION: "${query}"

CRITICAL INSTRUCTIONS:
1. Use ONLY the actual data provided above - never say data is "not available" if it exists
2. If asked about timeline, reference the specific timeline information shown above
3. If asked about budget, use the budget data above
4. Be specific and factual - quote their actual information
5. Reference their actual company name, industry, and specific numbers

Be specific, factual, and data-driven. Use their actual company details and real information.`;

    return await this.callOpenAI(prompt);
  }

  /**
   * PRESERVED: Handle business model questions (enhanced for main customer)
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
   * PRESERVED: Handle company research (enhanced)
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
   * ENHANCED: Handle similar customers queries with specific customer detection
   */
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

    // PRESERVED: General similar customers logic
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

Provide comprehensive business model analysis for ${similarCustomer.customerName} with specific insights about their implementation success and relevance to the current prospect.`;

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

Provide comprehensive business model analysis for ${externalCompany} and actionable business intelligence.`;

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
   * PRESERVED: Handle next steps and strategy questions (unchanged)
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
   * PRESERVED: Handle email generation requests (unchanged)
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
   * PRESERVED: Handle data lookup requests (unchanged)
   */
  async handleDataLookup(query, context) {
    try {
      // Extract search terms
      const searchTerms = this.extractSearchTerms(query);
      
      // Search historical data using existing service
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
   * PRESERVED: Handle explanation requests (unchanged)
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
   * PRESERVED: Handle general conversation (unchanged)
   */
  async handleGeneralQuery(query, context) {
    const prompt = `
You are a helpful AI assistant for a field service management software company.
You help sales teams analyze customer fit and make better decisions.

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

  /**
   * PRESERVED: Call OpenAI API (unchanged)
   */
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

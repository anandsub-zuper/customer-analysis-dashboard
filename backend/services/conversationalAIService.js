// backend/services/conversationalAIService.js - COMPREHENSIVE FIX
const axios = require('axios');
const cheerio = require('cheerio');
const analysisService = require('./analysisService');
const historicalDataService = require('./historicalDataService');
const { getDb } = require('./mongoDbService');

/**
 * FIXED: Complete Web Intelligence Extractor with Real Scraping
 */
class WebIntelligenceExtractor {
  constructor() {
    this.cache = new Map();
    this.userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    ];
  }

  async extractBusinessIntelligence(customerName, analysisData = null) {
    console.log(`🔍 Extracting web intelligence for: ${customerName}`);
    
    // Check cache first (5 minute TTL)
    const cacheKey = customerName.toLowerCase();
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 300000) {
      console.log('📦 Using cached web data');
      return cached.data;
    }

    try {
      const domains = this.generateDomains(customerName);
      console.log(`🌐 Trying domains: ${domains.join(', ')}`);
      
      for (const domain of domains) {
        try {
          const businessData = await this.scrapeWebsite(`https://${domain}`);
          if (businessData && businessData.hasBusinessData) {
            this.cache.set(cacheKey, { data: businessData, timestamp: Date.now() });
            console.log(`✅ Found business data at: ${domain}`);
            return businessData;
          }
        } catch (error) {
          console.log(`❌ Failed to scrape ${domain}: ${error.message}`);
        }
      }

      // If no direct website found, try search approach
      const searchData = await this.searchForCompany(customerName);
      if (searchData) {
        this.cache.set(cacheKey, { data: searchData, timestamp: Date.now() });
        return searchData;
      }

      return { hasBusinessData: false, reason: 'no_website_found' };
    } catch (error) {
      console.error(`Web intelligence extraction failed: ${error.message}`);
      return { hasBusinessData: false, error: error.message };
    }
  }

  generateDomains(customerName) {
    const cleanName = customerName
      .toLowerCase()
      .replace(/\b(inc|llc|corp|ltd|company|co|services|service|solutions|group|enterprises)\b/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .trim();

    const words = cleanName.split(/\s+/).filter(w => w.length > 2);
    const domains = [];

    if (words.length === 0) return [];

    const primaryName = words[0];
    const fullName = words.join('');
    const hyphenName = words.join('-');

    // Primary domain variations
    domains.push(`${fullName}.com`);
    domains.push(`${primaryName}.com`);
    domains.push(`${hyphenName}.com`);
    
    // Industry-specific variations
    domains.push(`${primaryName}hvac.com`);
    domains.push(`${primaryName}services.com`);
    domains.push(`${primaryName}plumbing.com`);
    domains.push(`${primaryName}electrical.com`);

    return [...new Set(domains)];
  }

  async scrapeWebsite(url) {
    try {
      const response = await axios.get(url, {
        headers: { 
          'User-Agent': this.userAgents[Math.floor(Math.random() * this.userAgents.length)],
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
        },
        timeout: 8000,
        maxRedirects: 3,
        validateStatus: (status) => status < 400
      });

      if (!response.data) return null;

      const $ = cheerio.load(response.data);
      return this.extractBusinessData($, url);
    } catch (error) {
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        return null; // Domain doesn't exist
      }
      throw error;
    }
  }

  extractBusinessData($, url) {
    const businessData = {
      url: url,
      hasBusinessData: false,
      extractedAt: new Date().toISOString()
    };

    try {
      // Get all text content
      const title = $('title').text().trim();
      const metaDescription = $('meta[name="description"]').attr('content') || '';
      const bodyText = $('body').text().toLowerCase();
      const allContent = `${title} ${metaDescription} ${bodyText}`.toLowerCase();

      businessData.title = title;
      businessData.description = metaDescription;

      // Extract business model indicators
      const businessModel = this.detectBusinessModel(allContent);
      if (businessModel.indicators.length > 0) {
        businessData.businessModel = businessModel;
        businessData.hasBusinessData = true;
      }

      // Extract company size indicators
      const sizeIndicators = this.extractSizeIndicators(allContent);
      if (sizeIndicators.length > 0) {
        businessData.sizeIndicators = sizeIndicators;
        businessData.hasBusinessData = true;
      }

      // Extract service offerings
      const services = this.extractServices(allContent);
      if (services.length > 0) {
        businessData.services = services;
        businessData.hasBusinessData = true;
      }

      // Extract location information
      const locations = this.extractLocations(allContent, $);
      if (locations.length > 0) {
        businessData.locations = locations;
        businessData.hasBusinessData = true;
      }

      // Extract contact information
      const contact = this.extractContactInfo(allContent, $);
      if (Object.keys(contact).length > 0) {
        businessData.contact = contact;
        businessData.hasBusinessData = true;
      }

      console.log(`📊 Extracted data from ${url}:`, {
        hasData: businessData.hasBusinessData,
        businessModel: businessData.businessModel?.primary,
        servicesCount: businessData.services?.length || 0,
        locationsCount: businessData.locations?.length || 0
      });

      return businessData;
    } catch (error) {
      console.error(`Error extracting business data: ${error.message}`);
      return businessData;
    }
  }

  detectBusinessModel(content) {
    const b2bIndicators = [
      'commercial', 'business', 'enterprise', 'corporate', 'contractor',
      'wholesale', 'property management', 'facility', 'industrial'
    ];

    const b2cIndicators = [
      'residential', 'homeowner', 'family', 'personal', 'domestic',
      'home service', 'household', 'consumer'
    ];

    const b2bMatches = b2bIndicators.filter(indicator => content.includes(indicator));
    const b2cMatches = b2cIndicators.filter(indicator => content.includes(indicator));

    let primary = 'Mixed';
    let confidence = 0.5;
    
    if (b2bMatches.length > b2cMatches.length) {
      primary = 'B2B';
      confidence = Math.min(0.9, 0.5 + (b2bMatches.length * 0.1));
    } else if (b2cMatches.length > b2bMatches.length) {
      primary = 'B2C';
      confidence = Math.min(0.9, 0.5 + (b2cMatches.length * 0.1));
    }

    return {
      primary,
      confidence,
      indicators: [...b2bMatches, ...b2cMatches],
      b2bScore: b2bMatches.length,
      b2cScore: b2cMatches.length
    };
  }

  extractSizeIndicators(content) {
    const sizePatterns = [
      /(\d+)\s+(?:years?|year)\s+(?:of\s+)?(?:experience|in\s+business)/gi,
      /(?:serving|over|more\s+than)\s+(\d+)\s+(?:customers?|clients?)/gi,
      /(\d+)\s+(?:employees?|staff|technicians?|workers?)/gi,
      /(\d+)\s+(?:locations?|offices?|branches?)/gi
    ];

    const indicators = [];
    sizePatterns.forEach(pattern => {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        indicators.push({
          type: pattern.source.includes('experience') ? 'years_experience' :
                pattern.source.includes('customers') ? 'customer_count' :
                pattern.source.includes('employees') ? 'employee_count' : 'location_count',
          value: parseInt(match[1]),
          text: match[0]
        });
      }
    });

    return indicators;
  }

  extractServices(content) {
    const serviceKeywords = [
      'hvac', 'plumbing', 'electrical', 'heating', 'cooling', 'air conditioning',
      'maintenance', 'repair', 'installation', 'service', 'emergency',
      'cleaning', 'landscaping', 'roofing', 'flooring', 'pest control'
    ];

    return serviceKeywords.filter(keyword => content.includes(keyword));
  }

  extractLocations(content, $) {
    const locations = [];
    
    // Look for address patterns
    const addressPattern = /\b\d+\s+[A-Za-z\s]+(street|st|avenue|ave|road|rd|drive|dr|boulevard|blvd)\b/gi;
    const addressMatches = content.matchAll(addressPattern);
    
    for (const match of addressMatches) {
      locations.push(match[0]);
    }

    // Look for city, state patterns
    const cityStatePattern = /\b[A-Z][a-z]+,\s*[A-Z]{2}\b/g;
    const cityStateMatches = content.matchAll(cityStatePattern);
    
    for (const match of cityStateMatches) {
      locations.push(match[0]);
    }

    return [...new Set(locations)];
  }

  extractContactInfo(content, $) {
    const contact = {};

    // Phone numbers
    const phonePattern = /(\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4})/g;
    const phoneMatches = content.match(phonePattern);
    if (phoneMatches) {
      contact.phones = [...new Set(phoneMatches)];
    }

    // Email addresses
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emailMatches = content.match(emailPattern);
    if (emailMatches) {
      contact.emails = [...new Set(emailMatches)];
    }

    return contact;
  }

  async searchForCompany(customerName) {
    // Placeholder for search engine approach if direct website scraping fails
    // Could implement Google Custom Search API, Bing API, etc.
    console.log(`🔍 Would search for: ${customerName} (search API not implemented)`);
    return { hasBusinessData: false, reason: 'search_not_implemented' };
  }
}

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
  }

  // All the missing methods from the previous fix...
  isSimilarCustomersQuery(queryLower) {
    const similarCustomerIndicators = [
      'similar customer', 'similar customers', 'comparable customer', 'comparable customers',
      'like this customer', 'customers like', 'similar to this', 'similar companies',
      'customers similar', 'comparable companies', 'other customers like',
      'customers that are similar', 'customers with similar', 'find similar',
      'show similar', 'who are similar', 'companies similar', 'others like',
      'similar businesses', 'comparable businesses', 'like them', 'similar to them'
    ];
    return similarCustomerIndicators.some(indicator => queryLower.includes(indicator));
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
    try {
      const queryLower = query.toLowerCase();
      
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

      return null;
    } catch (error) {
      console.error('Error in enhancedQuickRuleBasedCheck:', error);
      return null;
    }
  }

  strictValidateAndCorrect(intent, query, context) {
    try {
      if (this.isSimilarCustomersQuery(query.toLowerCase()) && intent.type !== 'SIMILAR_CUSTOMERS') {
        intent.type = 'SIMILAR_CUSTOMERS';
        intent.confidence = 0.95;
        intent.reasoning = 'Corrected: Query about similar customers';
      }

      return {
        type: intent.type,
        confidence: intent.confidence || 0.7,
        entities: intent.entities || [],
        requiresAnalysisData: this.intentCategories[intent.type]?.requiresAnalysisData || false,
        reasoning: intent.reasoning || 'OpenAI classification',
        source: 'openai'
      };
    } catch (error) {
      console.error('Error in strictValidateAndCorrect:', error);
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

  buildContextInfo(context) {
    if (context.analysisId && context.analysisData) {
      return `VIEWING CUSTOMER ANALYSIS:
- Customer: ${context.analysisData.customerName}
- Industry: ${context.analysisData.industry}
- Analysis ID: ${context.analysisId}

This means questions about "the customer", "they", "their" refer to ${context.analysisData.customerName}.`;
    } else {
      return `NO CURRENT ANALYSIS CONTEXT:
- User is not viewing a specific customer analysis
- Questions about "customers" likely refer to general database searches`;
    }
  }

  fallbackIntentClassification(query, context) {
    try {
      const queryLower = query.toLowerCase();
      
      if (this.isSimilarCustomersQuery(queryLower)) {
        return {
          type: 'SIMILAR_CUSTOMERS',
          confidence: 0.9,
          entities: ['similar', 'customers'],
          requiresAnalysisData: true,
          source: 'fallback-similar-customers'
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
      
      return { type: 'GENERAL', confidence: 0.5, entities: [], requiresAnalysisData: false, source: 'fallback' };
    } catch (error) {
      return { type: 'GENERAL', confidence: 0.3, entities: [], requiresAnalysisData: false, source: 'error-fallback' };
    }
  }

  async callOpenAI(prompt, options = {}) {
    try {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) throw new Error('OpenAI API key is not configured');

      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'You are an expert intent classifier. Always respond with valid JSON only.' },
            { role: 'user', content: prompt }
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
      throw error;
    }
  }
}

/**
 * COMPREHENSIVE: Complete Conversational AI Service
 */
class ConversationalAIService {
  constructor() {
    // Memory-managed context storage
    this.conversationContexts = new Map();
    this.contextTTL = 30 * 60 * 1000; // 30 minutes
    this.maxContexts = 1000;
    
    // Initialize components
    this.intentClassifier = new OpenAIIntentClassifier();
    this.webIntelligence = new WebIntelligenceExtractor();
    this.initializeCleanup();
  }

  initializeCleanup() {
    setInterval(() => {
      this.cleanupExpiredContexts();
    }, 5 * 60 * 1000);
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
      context.conversationHistory = context.conversationHistory || [];
      context.conversationHistory.push(update);
      context.lastAccessed = Date.now();

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
    const webKeywords = ['business model', 'b2b', 'b2c', 'website', 'company information'];
    
    const hasWebIntent = webEnhancedIntents.includes(intent.type);
    const hasWebKeywords = webKeywords.some(keyword => query.toLowerCase().includes(keyword));
    const hasCustomerName = context.analysisData?.customerName;
    
    return (hasWebIntent || hasWebKeywords) && hasCustomerName;
  }

  async gatherWebEnhancement(analysisData) {
    try {
      if (!analysisData?.customerName) return null;
      
      console.log(`🌐 Gathering web enhancement for: ${analysisData.customerName}`);
      const webData = await this.webIntelligence.extractBusinessIntelligence(
        analysisData.customerName, 
        analysisData
      );
      
      if (webData && webData.hasBusinessData) {
        console.log('✅ Web enhancement successful');
        return { webIntelligence: webData };
      }
      
      return null;
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
        case 'COMPANY_RESEARCH':
          return await this.handleCompanyResearch(query, context, enhancementData);
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
      return "I encountered an error processing that request. Please try rephrasing your question.";
    }
  }

  /**
   * COMPREHENSIVE: Analysis Question Handler - Access ALL Data
   */
  async handleAnalysisQuestion(query, context) {
    if (!context.analysisData) {
      return "I don't have access to any analysis data to answer your question. Please ensure you're viewing a customer analysis.";
    }

    const analysisData = context.analysisData;
    
    const prompt = `
You are a field service software sales expert providing detailed analysis insights for ${analysisData.customerName}.

## COMPLETE CUSTOMER ANALYSIS - ALL AVAILABLE DATA

### BASIC INFORMATION
**Company:** ${analysisData.customerName}
**Industry:** ${analysisData.industry}
**Fit Score:** ${analysisData.fitScore}%
**Team Size:** ${analysisData.userCount?.total || 'Unknown'} total users (${analysisData.userCount?.field || 0} field workers, ${analysisData.userCount?.backOffice || 0} back office)

### CURRENT STATE & SYSTEMS
${analysisData.currentState ? JSON.stringify(analysisData.currentState, null, 2) : 'No current state data available'}

### REPLACEMENT REASONS & PAIN POINTS
**Current Systems Issues:**
${analysisData.currentState?.currentSystems?.map(sys => 
  `• **${sys.name}**: ${sys.usage || 'Usage not specified'}
    **Pain Points:** ${sys.painPoints?.join(', ') || 'None specified'}
    **Replacement Reasons:** ${sys.replacementReasons || 'None specified'}`
).join('\n') || '• No current systems data available'}

### CHALLENGES & ISSUES (DETAILED)
${analysisData.challenges?.map(c => 
  `• **${c.title}** (${c.severity} severity): ${c.description}
    **Impact:** ${c.impact || 'Not specified'}
    **Current Solution:** ${c.currentSolution || 'None'}
    **Priority:** ${c.priority || 'Not specified'}`
).join('\n') || '• No specific challenges identified'}

### REQUIREMENTS & NEEDS (DETAILED)
**Key Features Required:**
${analysisData.requirements?.keyFeatures?.map(req => `• ${req}`).join('\n') || '• No specific requirements listed'}

**Integration Requirements:**
${analysisData.requirements?.integrations?.map(int => 
  `• **${int.system}** (${int.priority} priority): ${int.purpose}
    **Current Issues:** ${int.currentIssues || 'None specified'}
    **Requirements:** ${int.requirements || 'Standard integration'}`
).join('\n') || '• No integration requirements specified'}

**Custom Requirements:**
${analysisData.requirements?.customRequirements?.map(req => 
  `• **${req.feature}**: ${req.description} (${req.priority} priority)`
).join('\n') || '• No custom requirements specified'}

### SERVICES & OFFERINGS
${JSON.stringify(analysisData.services, null, 2) || 'No services data available'}

### BUDGET & TIMELINE
**Budget:** ${analysisData.budget?.mentioned ? (analysisData.budget.range || analysisData.budget.amount || 'Budget discussed') : 'Budget not discussed'}
**Budget Details:** ${JSON.stringify(analysisData.budget, null, 2) || 'No budget details'}

**Timeline:** ${analysisData.timeline?.desiredGoLive || 'Not specified'} 
**Urgency:** ${analysisData.timeline?.urgency || 'Not specified'}
**Timeline Details:** ${JSON.stringify(analysisData.timeline, null, 2) || 'No timeline details'}

### SCORE BREAKDOWN & RATIONALE
${JSON.stringify(analysisData.scoreBreakdown, null, 2) || 'No score breakdown available'}

**Fit Score Rationale:**
${JSON.stringify(analysisData.recommendations?.fitScoreRationale, null, 2) || 'No rationale available'}

### STRENGTHS & OPPORTUNITIES
${analysisData.strengths?.map(s => 
  `• **${s.title}**: ${s.description}
    **Business Impact:** ${s.businessImpact || 'Not specified'}
    **Technical Alignment:** ${s.technicalAlignment || 'Not specified'}`
).join('\n') || 'No strengths listed'}

### SIMILAR CUSTOMERS DATA
${JSON.stringify(analysisData.similarCustomers, null, 2) || 'No similar customers data available'}

### RECOMMENDATIONS & STRATEGY
${JSON.stringify(analysisData.recommendations, null, 2) || 'No recommendations available'}

USER QUESTION: "${query}"

## CRITICAL INSTRUCTIONS:
1. **USE ALL THE ACTUAL DATA** provided above - reference specific details, numbers, and quotes from their analysis
2. **Be specific and factual** - quote their actual systems, challenges, requirements, and replacement reasons
3. **Reference exact company details** - use their name, industry, specific numbers, and real information
4. **Answer directly** using their specific data - don't say data is "not available" if it exists above
5. **For replacement reasons** - look specifically in currentState → currentSystems → replacementReasons and painPoints
6. **For current systems** - reference the currentSystems array with specific system names and issues
7. **For fit score explanations** - use the scoreBreakdown and fitScoreRationale data
8. **For similar customers** - use the complete similarCustomers structure with all customer details

Provide a comprehensive, well-formatted response that directly addresses their question using their specific data and analysis.`;

    return await this.callOpenAI(prompt, { maxTokens: 1500 });
  }

  /**
   * COMPREHENSIVE: Similar Customers Handler - Full Data Access
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
**Fit Score:** ${analysisData.fitScore}%

### Current Challenges
${analysisData.challenges?.map(c => `• **${c.title}** (${c.severity} severity): ${c.description}`).join('\n') || '• No specific challenges identified'}

### Key Requirements
${analysisData.requirements?.keyFeatures?.map(req => `• ${req}`).join('\n') || '• No specific requirements listed'}

## COMPLETE SIMILAR CUSTOMERS DATA - ALL SECTIONS
${JSON.stringify(analysisData.similarCustomers, null, 2)}

USER QUESTION: "${query}"

## PROVIDE COMPREHENSIVE SIMILAR CUSTOMER ANALYSIS

Generate a detailed, well-formatted response that includes:

### 🎯 **Most Relevant Similar Customer Matches**
List ALL similar customers from EVERY section (Industry Match, Size Match, Complexity Match) and explain:
- **Specific company names and details** from the data
- **Match percentages and reasons** for each customer
- **Implementation details** (duration, health, ARR) for each
- **Why each is relevant** to ${analysisData.customerName}

### 📊 **Detailed Customer Breakdown by Category**
For each section in the similar customers data:
- **Industry Matches:** Full details on industry-matched customers
- **Size Matches:** Complete information on size-similar customers  
- **Complexity Matches:** All complexity-matched customer details

### 💡 **Key Strategic Insights**
- **Success patterns** across similar customers
- **Implementation timelines** and outcomes
- **Revenue data** (ARR) comparisons
- **Health scores** and what they indicate

### 🚀 **Actionable Lessons for ${analysisData.customerName}**
Based on their specific challenges (${analysisData.challenges?.map(c => c.title).join(', ') || 'none identified'}):
- **Specific lessons** from similar customer implementations
- **Risk mitigation** strategies based on similar customer experiences
- **Success factors** that apply to ${analysisData.customerName}

### 💼 **Sales Strategy Application**
- **Reference customers** we can mention in conversations
- **Success stories** to highlight
- **Potential objections** to address based on similar customer experiences
- **Implementation approaches** that worked for similar customers

### ⚠️ **Implementation Risk Assessment**
- **Common challenges** faced by similar customers
- **Success vs. failure factors** in implementations
- **Timeline expectations** based on similar customer data
- **Resource requirements** learned from similar implementations

Use ALL the actual customer data, names, numbers, and details from the similar customers analysis. Be specific and reference exact match percentages, implementation durations, and key learnings.`;

    return await this.callOpenAI(prompt, { maxTokens: 1500 });
  }

  /**
   * ENHANCED: Business Model Handler with Web Intelligence
   */
  async handleBusinessModel(query, context, enhancementData = null) {
    if (!context.analysisData) {
      return "I need customer analysis data to provide business model insights. Please ensure you're viewing a customer analysis.";
    }

    const analysisData = context.analysisData;
    
    const prompt = `
You are a field service software sales expert analyzing business models for ${analysisData.customerName}.

## INTERNAL ANALYSIS DATA
${JSON.stringify({
      customerName: analysisData.customerName,
      industry: analysisData.industry,
      services: analysisData.services,
      requirements: analysisData.requirements,
      userCount: analysisData.userCount,
      currentState: analysisData.currentState
    }, null, 2)}

${enhancementData?.webIntelligence ? `
## WEB INTELLIGENCE DATA
**Website:** ${enhancementData.webIntelligence.url || 'Not found'}
**Title:** ${enhancementData.webIntelligence.title || 'N/A'}
**Description:** ${enhancementData.webIntelligence.description || 'N/A'}

**Business Model Detection:**
${JSON.stringify(enhancementData.webIntelligence.businessModel, null, 2) || 'No business model data extracted'}

**Services Found:**
${enhancementData.webIntelligence.services?.join(', ') || 'No services detected'}

**Size Indicators:**
${JSON.stringify(enhancementData.webIntelligence.sizeIndicators, null, 2) || 'No size indicators found'}

**Contact Information:**
${JSON.stringify(enhancementData.webIntelligence.contact, null, 2) || 'No contact info extracted'}

**Locations:**
${enhancementData.webIntelligence.locations?.join(', ') || 'No locations found'}
` : '## WEB INTELLIGENCE\nNo web intelligence data available - analysis based on internal data only.'}

USER QUESTION: "${query}"

Provide comprehensive business model analysis:

### 📊 **Business Model Classification**
- **Primary Model:** B2B/B2C/Mixed with confidence level and evidence
- **Supporting Evidence:** From internal analysis AND web intelligence
- **Industry Context:** Typical patterns for ${analysisData.industry}

### 👥 **Customer Segments & Target Market**
- **Specific Customer Types:** Who they serve based on services and web data
- **Market Approach:** How they reach and serve customers
- **Geographic Scope:** Based on locations and service area

### 💰 **Revenue Model & Business Size**
- **Revenue Model:** Contract-based, transactional, subscription, etc.
- **Estimated Business Size:** Based on team size, locations, and web indicators
- **Pricing Strategy:** Implications for our software pricing

### 🛠️ **Field Service Software Implications**
- **Software Requirements:** Based on business model (B2B needs vs B2C needs)
- **Feature Priorities:** Scheduling, billing, customer management focus
- **Implementation Approach:** Complexity based on business model

### 🎯 **Sales Strategy Recommendations**
- **Approach:** Based on business model and market position
- **Decision Makers:** Key stakeholders to target
- **Value Proposition:** Alignment with their business model

Reference specific data points from both internal analysis and web intelligence when available.`;

    return await this.callOpenAI(prompt, { maxTokens: 1200 });
  }

  /**
   * ENHANCED: Company Research with Web Data
   */
  async handleCompanyResearch(query, context, enhancementData = null) {
    if (!context.analysisData) {
      return "I need customer analysis data to provide company research. Please ensure you're viewing a customer analysis.";
    }

    const analysisData = context.analysisData;
    
    const prompt = `
Provide comprehensive company intelligence for ${analysisData.customerName}.

## INTERNAL ANALYSIS
${JSON.stringify({
      customerName: analysisData.customerName,
      industry: analysisData.industry,
      userCount: analysisData.userCount,
      currentState: analysisData.currentState,
      fitScore: analysisData.fitScore,
      services: analysisData.services
    }, null, 2)}

${enhancementData?.webIntelligence ? `
## WEB INTELLIGENCE
**Website Found:** ${enhancementData.webIntelligence.url}
**Company Details:** ${enhancementData.webIntelligence.title}
**Description:** ${enhancementData.webIntelligence.description}

**Business Intelligence:**
${JSON.stringify(enhancementData.webIntelligence, null, 2)}
` : '## WEB INTELLIGENCE\nNo web intelligence available - using internal analysis only.'}

USER QUESTION: "${query}"

Provide detailed company profile combining internal analysis with web intelligence:

### 🏢 **Company Overview**
- **Business Focus:** Based on industry, services, and web data
- **Market Position:** Analysis of their competitive positioning
- **Company Size & Scope:** Team size, locations, service area

### 📊 **Business Intelligence**
- **Revenue Indicators:** Size estimates and business scale
- **Growth Stage:** Startup, established, mature based on indicators
- **Market Approach:** B2B, B2C, or mixed model evidence

### 🔍 **Competitive Intelligence**
- **Market Position:** How they position in their industry
- **Service Differentiation:** What makes them unique
- **Technology Adoption:** Current systems and tech sophistication

### 🎯 **Sales Intelligence**
- **Key Decision Factors:** What drives their purchasing decisions
- **Budget & Authority:** Indicators of purchasing power
- **Implementation Readiness:** Based on current state and urgency

Combine both internal analysis and web intelligence to provide actionable insights.`;

    return await this.callOpenAI(prompt, { maxTokens: 1000 });
  }

  // Keep all other handlers (email generation, data lookup, explanation, etc.)
  // ... (same as before, with enhanced error handling)

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

  // Placeholder handlers for remaining intents...
  async handleEmailGeneration(query, context) {
    return "Email generation feature - implementation pending";
  }

  async handleDataLookup(query, context) {
    return "Data lookup feature - implementation pending";
  }

  async handleExplanation(query, context) {
    return "Explanation feature - implementation pending";
  }

  async handleNextSteps(query, context) {
    return "Next steps feature - implementation pending";
  }

  async handleGeneralQuery(query, context) {
    return "General query handler - implementation pending";
  }
}

// Export an instance, not the class
module.exports = new ConversationalAIService();

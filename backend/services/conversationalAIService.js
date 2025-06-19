// backend/services/conversationalAIService.js - COMPLETE ENHANCED VERSION
const axios = require('axios');
const cheerio = require('cheerio');
const analysisService = require('./analysisService');
const historicalDataService = require('./historicalDataService');
const { getDb } = require('./mongoDbService');

/**
 * ENHANCED: OpenAI-Powered Web Intelligence Extractor
 */
class WebIntelligenceExtractor {
  constructor() {
    this.cache = new Map();
    this.domainCache = new Map();
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
      // ENHANCED: Use OpenAI for intelligent domain generation
      const domains = await this.generateDomainsWithAI(customerName, analysisData);
      console.log(`🤖 AI-generated domains: ${domains.join(', ')}`);
      
      // Try each domain in order of likelihood
      for (const domain of domains) {
        try {
          const businessData = await this.scrapeWebsite(`https://${domain}`);
          if (businessData && businessData.hasBusinessData) {
            // ENHANCED: Use OpenAI to enhance the extracted data
            const enhancedData = await this.enhanceDataWithAI(businessData, customerName);
            
            this.cache.set(cacheKey, { data: enhancedData, timestamp: Date.now() });
            console.log(`✅ Found business data at: ${domain}`);
            return enhancedData;
          }
        } catch (error) {
          console.log(`❌ Failed to scrape ${domain}: ${error.message}`);
        }
      }

      // If no direct website found, try AI-powered search approach
      const searchData = await this.aiPoweredCompanySearch(customerName, analysisData);
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

  /**
   * ENHANCED: AI-Powered Domain Generation
   */
  async generateDomainsWithAI(customerName, analysisData = null) {
    // Check domain cache first (24 hour cache)
    const cacheKey = `domains-${customerName.toLowerCase()}`;
    const cached = this.domainCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 86400000) {
      console.log('📦 Using cached domain suggestions');
      return cached.domains;
    }

    try {
      const industry = analysisData?.industry || 'Unknown';
      const location = analysisData?.location || 'Unknown';
      
      const prompt = `
You are an expert at predicting company website domains. Generate the most likely website domains for this company.

## COMPANY INFORMATION
**Company Name:** ${customerName}
**Industry:** ${industry}
**Location:** ${location}

## DOMAIN GENERATION RULES
1. **Most Likely First:** Order domains by probability of being correct
2. **Industry Patterns:** Consider industry-specific domain patterns (HVAC companies often use "hvac", "heating", "cooling")
3. **Geographic Considerations:** Include location-based variations if relevant
4. **Brand Variations:** Consider how companies typically shorten their names
5. **Extension Priorities:** .com first, then .net, .org if appropriate

## DOMAIN PATTERNS TO CONSIDER
- Remove legal suffixes (Inc, LLC, Corp, Ltd)
- Company abbreviations and acronyms
- Industry-specific suffixes (services, solutions, group, hvac, plumbing, electrical)
- Geographic modifiers if location is known
- Common business prefixes/suffixes (call, pro, best, top)

## EXAMPLES
"Johnson Plumbing Services Inc" → ["johnsonplumbing.com", "johnson-plumbing.com", "jpsservices.com", "johnsonplumbingservices.com"]
"Mr. Chill Heating & Air LLC" → ["mrchillhvac.com", "mr-chill.com", "mrchillheating.com", "chillhvac.com"]

Generate 8-12 most likely domains for "${customerName}" in JSON format:

{
  "domains": [
    "mostlikely.com",
    "secondchoice.com",
    "alternative.com"
  ],
  "confidence": "high|medium|low",
  "reasoning": "Brief explanation of domain selection strategy"
}`;

      const response = await this.callOpenAI(prompt, { maxTokens: 500 });
      const aiResponse = JSON.parse(response);
      
      console.log(`🤖 AI domain generation confidence: ${aiResponse.confidence}`);
      console.log(`🎯 AI reasoning: ${aiResponse.reasoning}`);
      
      // Cache the results
      this.domainCache.set(cacheKey, {
        domains: aiResponse.domains,
        timestamp: Date.now()
      });
      
      return aiResponse.domains;
      
    } catch (error) {
      console.error('AI domain generation failed, falling back to pattern-based:', error);
      // Fallback to original pattern-based method
      return this.generateDomainsPattern(customerName);
    }
  }

  /**
   * ENHANCED: AI-Powered Data Enhancement
   */
  async enhanceDataWithAI(rawBusinessData, customerName) {
    try {
      const prompt = `
You are a business intelligence analyst. Enhance and interpret this scraped website data for ${customerName}.

## RAW WEBSITE DATA
${JSON.stringify(rawBusinessData, null, 2)}

## ENHANCEMENT TASKS
1. **Business Model Classification:** Improve B2B/B2C detection with higher confidence
2. **Company Size Estimation:** Analyze all indicators to estimate company size range
3. **Service Categorization:** Categorize and standardize service offerings
4. **Market Position:** Assess market positioning and competitive factors
5. **Target Customer Analysis:** Identify target customer segments
6. **Technology Sophistication:** Assess tech adoption level from website quality

## OUTPUT FORMAT
{
  "enhancedBusinessModel": {
    "primary": "B2B|B2C|Mixed",
    "confidence": 0.0-1.0,
    "evidence": ["list of supporting evidence"],
    "targetCustomers": ["customer segment descriptions"]
  },
  "companySizeEstimate": {
    "range": "1-10|11-50|51-200|201-500|500+",
    "confidence": 0.0-1.0,
    "indicators": ["indicators used for estimation"]
  },
  "serviceAnalysis": {
    "primaryServices": ["standardized service names"],
    "serviceModel": "Emergency|Scheduled|Contract|Mixed",
    "specializationLevel": "Generalist|Specialist|Niche"
  },
  "marketIntelligence": {
    "marketPosition": "Local|Regional|National",
    "competitiveFactors": ["key differentiators"],
    "technologyAdoption": "Low|Medium|High"
  },
  "keyInsights": ["actionable insights for sales teams"]
}

Provide comprehensive business intelligence enhancement.`;

      const response = await this.callOpenAI(prompt, { maxTokens: 800 });
      const enhancedData = JSON.parse(response);
      
      // Merge enhanced data with original
      return {
        ...rawBusinessData,
        aiEnhanced: true,
        enhancement: enhancedData,
        enhancedAt: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('AI data enhancement failed:', error);
      // Return original data if enhancement fails
      return {
        ...rawBusinessData,
        aiEnhanced: false,
        enhancementError: error.message
      };
    }
  }

  /**
   * NEW: AI-Powered Company Search (when no website found)
   */
  async aiPoweredCompanySearch(customerName, analysisData = null) {
    try {
      const prompt = `
You are a business research expert. Provide comprehensive analysis for this company even without direct website access.

## COMPANY TO RESEARCH
**Name:** ${customerName}
**Industry:** ${analysisData?.industry || 'Unknown'}
**Context:** ${analysisData ? 'Company from field service software prospect analysis' : 'External company research'}

## RESEARCH TASKS
Based on the company name and industry, provide intelligent analysis:

1. **Likely Business Model:** B2B/B2C prediction with reasoning
2. **Industry Analysis:** Typical business patterns for this industry
3. **Service Predictions:** Likely services offered based on name/industry
4. **Size Estimation:** Probable company size range
5. **Market Characteristics:** Typical market positioning
6. **Technology Needs:** Field service software requirements prediction

## OUTPUT FORMAT
{
  "hasBusinessData": true,
  "source": "ai_analysis",
  "companyName": "${customerName}",
  "businessModel": {
    "primary": "B2B|B2C|Mixed",
    "confidence": 0.0-1.0,
    "reasoning": "explanation of prediction"
  },
  "industryAnalysis": {
    "typicalServices": ["predicted services"],
    "marketCharacteristics": ["industry characteristics"],
    "customerTypes": ["typical customer segments"]
  },
  "sizeEstimate": {
    "range": "estimated size range",
    "reasoning": "basis for estimation"
  },
  "fieldServicePredictions": {
    "softwareNeeds": ["predicted software requirements"],
    "implementationComplexity": "Low|Medium|High",
    "typicalChallenges": ["predicted challenges"]
  },
  "searchRecommendations": {
    "alternativeSearchTerms": ["alternative ways to search"],
    "platformsToCheck": ["LinkedIn", "industry directories", "etc."],
    "additionalResearch": ["recommended next steps"]
  },
  "confidence": "overall confidence in analysis"
}

Provide intelligent business analysis even without direct website data.`;

      const response = await this.callOpenAI(prompt, { maxTokens: 1000 });
      const searchData = JSON.parse(response);
      
      console.log(`🤖 AI-powered company analysis completed with ${searchData.confidence} confidence`);
      return searchData;
      
    } catch (error) {
      console.error('AI-powered company search failed:', error);
      return null;
    }
  }

  /**
   * FALLBACK: Pattern-based domain generation (preserved for reliability)
   */
  generateDomainsPattern(customerName) {
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

  /**
   * OpenAI API call for domain generation and data enhancement
   */
  async callOpenAI(prompt, options = {}) {
    try {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) throw new Error('OpenAI API key is not configured');

      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are an expert business intelligence analyst specializing in web research and company analysis. Always respond with valid JSON when requested.'
            },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3, // Lower temperature for more consistent results
          max_tokens: options.maxTokens || 600
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );
      
      return response.data.choices[0].message.content.trim();
    } catch (error) {
      console.error('OpenAI call failed for web intelligence:', error);
      throw error;
    }
  }
}

/**
 * COMPLETE: OpenAI Intent Classifier with External Company Detection
 */
class OpenAIIntentClassifier {
  constructor() {
    this.intentCategories = {
      'ANALYSIS_QUESTION': { requiresAnalysisData: true },
      'BUSINESS_MODEL': { requiresAnalysisData: true },
      'COMPANY_RESEARCH': { requiresAnalysisData: false },
      'SIMILAR_CUSTOMERS': { requiresAnalysisData: true },
      'EXTERNAL_COMPANY_RESEARCH': { requiresAnalysisData: false },
      'EXTERNAL_COMPANY_BUSINESS_MODEL': { requiresAnalysisData: false },
      'NEXT_STEPS': { requiresAnalysisData: true },
      'EMAIL_GENERATION': { requiresAnalysisData: true },
      'DATA_LOOKUP': { requiresAnalysisData: false },
      'EXPLANATION': { requiresAnalysisData: false },
      'GENERAL': { requiresAnalysisData: false }
    };
  }

  // ENHANCED: External company detection
  enhancedQuickRuleBasedCheck(query, context) {
    try {
      const queryLower = query.toLowerCase();
      
      // RULE 1: External company website/research detection
      const externalCompany = this.extractExternalCompanyName(query, context);
      if (externalCompany) {
        const isWebsiteQuery = queryLower.includes('website') || queryLower.includes('web') || queryLower.includes('url') || queryLower.includes('site');
        const isBusinessQuery = queryLower.includes('business model') || queryLower.includes('b2b') || queryLower.includes('b2c');
        
        if (isWebsiteQuery) {
          return {
            type: 'EXTERNAL_COMPANY_RESEARCH',
            confidence: 0.95,
            entities: ['website', 'external', 'company'],
            requiresAnalysisData: false,
            reasoning: `Query about external company ${externalCompany} website`,
            source: 'rule-based-external-website',
            externalCompany: externalCompany
          };
        }
        
        if (isBusinessQuery) {
          return {
            type: 'EXTERNAL_COMPANY_BUSINESS_MODEL',
            confidence: 0.9,
            entities: ['business', 'model', 'external'],
            requiresAnalysisData: false,
            reasoning: `Query about external company ${externalCompany} business model`,
            source: 'rule-based-external-business',
            externalCompany: externalCompany
          };
        }
        
        // General external company research
        return {
          type: 'EXTERNAL_COMPANY_RESEARCH',
          confidence: 0.85,
          entities: ['external', 'company'],
          requiresAnalysisData: false,
          reasoning: `Query about external company ${externalCompany}`,
          source: 'rule-based-external',
          externalCompany: externalCompany
        };
      }
      
      // RULE 2: Similar customers query
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

      // RULE 3: Current customer context questions
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

  // NEW: Extract external company names from queries
  extractExternalCompanyName(query, context) {
    // Common company name patterns
    const companyPatterns = [
      // Full company names with legal suffixes
      /\b([A-Z][a-zA-Z\s&]+(?:Inc|LLC|Corp|Ltd|Company|Co|Solutions|Services|Group|Enterprises|Corporation)\.?)\b/g,
      // Mr./Mrs./Dr. business names  
      /\b(Mr\.\s+[A-Z][a-zA-Z\s]+(?:Heating|Air|HVAC|Plumbing|Electrical|Cleaning|Services?))\b/g,
      // Business names with industry keywords
      /\b([A-Z][a-zA-Z\s]+(?:Heating|Air|HVAC|Plumbing|Electrical|Cleaning|Services?|Solutions|Systems))\b/g,
      // Simple proper nouns that could be companies
      /\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)+)\b/g
    ];

    const extractedNames = [];
    
    for (const pattern of companyPatterns) {
      const matches = query.matchAll(pattern);
      for (const match of matches) {
        const companyName = match[1].trim();
        
        // Skip if it's the current customer
        if (context.analysisData?.customerName && 
            companyName.toLowerCase().includes(context.analysisData.customerName.toLowerCase())) {
          continue;
        }
        
        // Skip common words that aren't companies
        if (this.isLikelyCompanyName(companyName)) {
          extractedNames.push(companyName);
        }
      }
    }

    // Return the first valid company name found
    return extractedNames.length > 0 ? extractedNames[0] : null;
  }

  isLikelyCompanyName(name) {
    const excludeWords = ['What', 'Where', 'When', 'How', 'Why', 'The', 'This', 'That', 'Analysis', 'Customer'];
    const nameLower = name.toLowerCase();
    
    // Exclude common question words
    if (excludeWords.some(word => nameLower.includes(word.toLowerCase()))) {
      return false;
    }

    // Include if it has business indicators
    const businessIndicators = [
      'inc', 'llc', 'corp', 'ltd', 'company', 'co', 'solutions', 'services',
      'heating', 'air', 'hvac', 'plumbing', 'electrical', 'cleaning',
      'mr.', 'mrs.', 'dr.', 'group', 'enterprises'
    ];
    
    return businessIndicators.some(indicator => nameLower.includes(indicator)) || 
           (name.split(' ').length >= 2 && name.match(/^[A-Z]/)); // Multi-word, capitalized
  }

  // EXISTING: Similar customers detection
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

  // EXISTING: Timeline question detection
  isTimelineQuestion(query) {
    const timelineIndicators = [
      'timeline', 'implementation timeline', 'go live', 'go-live',
      'when do they', 'when does', 'target date', 'launch date',
      'urgency', 'how soon', 'when', 'schedule'
    ];
    const queryLower = query.toLowerCase();
    return timelineIndicators.some(indicator => queryLower.includes(indicator));
  }

  // EXISTING: Current customer reference detection
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

  strictValidateAndCorrect(intent, query, context) {
    try {
      // Check for external company that wasn't caught by rules
      const externalCompany = this.extractExternalCompanyName(query, context);
      if (externalCompany && !['EXTERNAL_COMPANY_RESEARCH', 'EXTERNAL_COMPANY_BUSINESS_MODEL'].includes(intent.type)) {
        const isWebsiteQuery = query.toLowerCase().includes('website');
        intent.type = isWebsiteQuery ? 'EXTERNAL_COMPANY_RESEARCH' : 'EXTERNAL_COMPANY_BUSINESS_MODEL';
        intent.externalCompany = externalCompany;
        intent.confidence = 0.9;
      }

      // Similar customers correction
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
        source: 'openai',
        externalCompany: intent.externalCompany || null
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
      
      // Check for external company first
      const externalCompany = this.extractExternalCompanyName(query, context);
      if (externalCompany) {
        return {
          type: 'EXTERNAL_COMPANY_RESEARCH',
          confidence: 0.8,
          entities: ['external', 'company'],
          requiresAnalysisData: false,
          source: 'fallback-external',
          externalCompany: externalCompany
        };
      }
      
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
 * COMPLETE: Enhanced Conversational AI Service
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
    const webEnhancedIntents = [
      'BUSINESS_MODEL', 
      'COMPANY_RESEARCH',
      'EXTERNAL_COMPANY_RESEARCH', 
      'EXTERNAL_COMPANY_BUSINESS_MODEL'
    ];
    
    const webKeywords = [
      'business model', 'b2b', 'b2c', 'website', 'web', 'site', 'url',
      'company information', 'company research', 'business information'
    ];
    
    const hasWebIntent = webEnhancedIntents.includes(intent.type);
    const hasWebKeywords = webKeywords.some(keyword => query.toLowerCase().includes(keyword));
    const hasExternalCompany = intent.externalCompany;
    
    // Enable web enhancement if any condition is met
    return hasWebIntent || hasWebKeywords || hasExternalCompany;
  }

  async gatherWebEnhancement(targetCompany, analysisData = null) {
    try {
      if (!targetCompany) return null;
      
      console.log(`🌐 Gathering web enhancement for: ${targetCompany}`);
      const webData = await this.webIntelligence.extractBusinessIntelligence(
        targetCompany, 
        analysisData
      );
      
      if (webData && webData.hasBusinessData) {
        console.log('✅ Web enhancement successful');
        return { webIntelligence: webData };
      }
      
      console.log('❌ No web data found');
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
        case 'EXTERNAL_COMPANY_RESEARCH':
          return await this.handleExternalCompanyResearch(query, context, intent.externalCompany, enhancementData);
        case 'EXTERNAL_COMPANY_BUSINESS_MODEL':
          return await this.handleExternalCompanyBusinessModel(query, context, intent.externalCompany, enhancementData);
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

### SERVICES & OFFERINGS
${JSON.stringify(analysisData.services, null, 2) || 'No services data available'}

### BUDGET & TIMELINE
**Budget:** ${analysisData.budget?.mentioned ? (analysisData.budget.range || analysisData.budget.amount || 'Budget discussed') : 'Budget not discussed'}
**Timeline:** ${analysisData.timeline?.desiredGoLive || 'Not specified'} 
**Urgency:** ${analysisData.timeline?.urgency || 'Not specified'}

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
${analysisData.requirements?.keyFeatures?.slice(0, 5).map(req => `• ${req}`).join('\n') || '• Standard field service requirements'}

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

Use ALL the actual customer data, names, numbers, and details from the similar customers analysis. Be specific and reference exact match percentages, implementation durations, and key learnings.`;

    return await this.callOpenAI(prompt, { maxTokens: 1500 });
  }

  /**
   * ENHANCED: External Company Research Handler
   */
  async handleExternalCompanyResearch(query, context, externalCompany, enhancementData = null) {
    if (!externalCompany) {
      return "I couldn't identify which external company you're asking about. Please specify the company name clearly.";
    }

    const prompt = `
Provide comprehensive company research for: **${externalCompany}**

${enhancementData?.webIntelligence ? `
## WEB INTELLIGENCE ${enhancementData.webIntelligence.aiEnhanced ? '(AI-ENHANCED)' : '(BASIC)'}

### 🌐 Website Information
**Website:** ${enhancementData.webIntelligence.url || 'Not found'}
**Title:** ${enhancementData.webIntelligence.title || 'N/A'}
**Description:** ${enhancementData.webIntelligence.description || 'N/A'}

${enhancementData.webIntelligence.aiEnhanced ? `
### 🤖 AI-Enhanced Business Intelligence
**Business Model:** ${enhancementData.webIntelligence.enhancement.enhancedBusinessModel.primary} (${Math.round(enhancementData.webIntelligence.enhancement.enhancedBusinessModel.confidence * 100)}% confidence)
**Target Customers:** ${enhancementData.webIntelligence.enhancement.enhancedBusinessModel.targetCustomers.join(', ')}
**Company Size:** ${enhancementData.webIntelligence.enhancement.companySizeEstimate.range} (${Math.round(enhancementData.webIntelligence.enhancement.companySizeEstimate.confidence * 100)}% confidence)
**Market Position:** ${enhancementData.webIntelligence.enhancement.marketIntelligence.marketPosition}
**Technology Adoption:** ${enhancementData.webIntelligence.enhancement.marketIntelligence.technologyAdoption}

### 🎯 Sales Intelligence
**Primary Services:** ${enhancementData.webIntelligence.enhancement.serviceAnalysis.primaryServices.join(', ')}
**Service Model:** ${enhancementData.webIntelligence.enhancement.serviceAnalysis.serviceModel}
**Key Insights:** ${enhancementData.webIntelligence.enhancement.keyInsights.join(' | ')}
` : `
### 📊 Basic Web Intelligence
**Business Model:** ${enhancementData.webIntelligence.businessModel?.primary || 'Unknown'} 
**Services:** ${enhancementData.webIntelligence.services?.join(', ') || 'Not detected'}
**Contact:** ${enhancementData.webIntelligence.contact?.phones?.join(', ') || 'Not found'}
`}
` : `## WEB INTELLIGENCE
${enhancementData?.source === 'ai_analysis' ? `
### 🤖 AI-Powered Analysis (No Website Found)
**Business Model Prediction:** ${enhancementData.businessModel.primary} (${Math.round(enhancementData.businessModel.confidence * 100)}% confidence)
**Reasoning:** ${enhancementData.businessModel.reasoning}
**Predicted Services:** ${enhancementData.industryAnalysis.typicalServices.join(', ')}
**Company Size Estimate:** ${enhancementData.sizeEstimate.range}

### 🔍 Research Recommendations
**Alternative Search Terms:** ${enhancementData.searchRecommendations.alternativeSearchTerms.join(', ')}
**Platforms to Check:** ${enhancementData.searchRecommendations.platformsToCheck.join(', ')}
` : 'No web intelligence available - no website found and AI analysis not available.'}`}

USER QUESTION: "${query}"

## COMPREHENSIVE COMPANY RESEARCH

### 🌐 **Website & Online Presence**
${enhancementData?.webIntelligence?.url ? 
  `✅ **Website Found:** ${enhancementData.webIntelligence.url}
   📄 **Company Description:** ${enhancementData.webIntelligence.description}` :
  `❌ **Website:** No website found through AI-powered domain search
   💡 **Next Steps:** ${enhancementData?.searchRecommendations?.additionalResearch?.join(', ') || 'Try manual search or industry directories'}`}

### 🏢 **Business Intelligence**
${enhancementData?.webIntelligence?.aiEnhanced ? 
  `🤖 **AI-Enhanced Analysis:**
   - **Business Model:** ${enhancementData.webIntelligence.enhancement.enhancedBusinessModel.primary} 
   - **Confidence:** ${Math.round(enhancementData.webIntelligence.enhancement.enhancedBusinessModel.confidence * 100)}%
   - **Evidence:** ${enhancementData.webIntelligence.enhancement.enhancedBusinessModel.evidence.join(', ')}
   - **Company Size:** ${enhancementData.webIntelligence.enhancement.companySizeEstimate.range}` :
  enhancementData?.businessModel ? 
  `🎯 **AI Prediction:**
   - **Business Model:** ${enhancementData.businessModel.primary} (${Math.round(enhancementData.businessModel.confidence * 100)}% confidence)
   - **Reasoning:** ${enhancementData.businessModel.reasoning}` :
  '❓ **Business Model:** Unable to determine from available data'}

### 🎯 **Field Service Software Implications**
${enhancementData?.fieldServicePredictions ? 
  `📋 **Software Needs:** ${enhancementData.fieldServicePredictions.softwareNeeds.join(', ')}
   ⚙️ **Implementation Complexity:** ${enhancementData.fieldServicePredictions.implementationComplexity}
   ⚠️ **Typical Challenges:** ${enhancementData.fieldServicePredictions.typicalChallenges.join(', ')}` :
  'Field service requirements analysis not available'}

### 💡 **Strategic Insights**
${enhancementData?.webIntelligence?.aiEnhanced ? 
  `🚀 **Key Insights:** ${enhancementData.webIntelligence.enhancement.keyInsights.join(' | ')}
   🏆 **Competitive Factors:** ${enhancementData.webIntelligence.enhancement.marketIntelligence.competitiveFactors.join(', ')}` :
  'Strategic analysis requires additional research'}

### 🔍 **Research Quality**
${enhancementData?.webIntelligence?.aiEnhanced ? 
  '🌟 **High-Quality:** AI-enhanced web intelligence with comprehensive business analysis' :
  enhancementData?.source === 'ai_analysis' ? 
  '🎯 **AI-Predicted:** Intelligent analysis based on company name and industry patterns' :
  '⚠️ **Limited:** Basic analysis only - manual research recommended'}`;

    return await this.callOpenAI(prompt, { maxTokens: 1200 });
  }

  /**
   * ENHANCED: External Company Business Model Handler
   */
  async handleExternalCompanyBusinessModel(query, context, externalCompany, enhancementData = null) {
    const prompt = `
Analyze the business model for external company: **${externalCompany}**

${enhancementData?.webIntelligence ? `
## WEB INTELLIGENCE FOR ${externalCompany}
${JSON.stringify(enhancementData.webIntelligence, null, 2)}
` : `## WEB INTELLIGENCE
${enhancementData?.source === 'ai_analysis' ? 
  `AI Analysis Available: ${enhancementData.businessModel.primary} business model predicted` :
  'No web intelligence available - providing analysis based on company name and industry patterns.'}`}

USER QUESTION: "${query}"

Provide comprehensive business model analysis for ${externalCompany} including B2B/B2C classification, target customers, and competitive positioning.`;

    return await this.callOpenAI(prompt, { maxTokens: 1200 });
  }

  // COMPLETE: All remaining handlers preserved from previous working version
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
**Business Model:** ${JSON.stringify(enhancementData.webIntelligence.businessModel, null, 2) || 'No business model data extracted'}
**Services:** ${enhancementData.webIntelligence.services?.join(', ') || 'No services detected'}
` : '## WEB INTELLIGENCE\nNo web intelligence data available.'}

USER QUESTION: "${query}"

Provide comprehensive business model analysis with specific evidence and actionable insights for field service software sales.`;

    return await this.callOpenAI(prompt, { maxTokens: 1200 });
  }

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
${JSON.stringify(enhancementData.webIntelligence, null, 2)}
` : '## WEB INTELLIGENCE\nNo web intelligence available.'}

USER QUESTION: "${query}"

Provide detailed company profile combining internal analysis with web intelligence.`;

    return await this.callOpenAI(prompt, { maxTokens: 1000 });
  }

  async handleEmailGeneration(query, context) {
    if (!context.analysisData) {
      return "I need customer analysis data to generate personalized emails. Please ensure you're viewing a specific customer analysis.";
    }

    const analysisData = context.analysisData;
    const emailType = this.detectEmailType(query);
    
    const prompt = `
Generate a professional, personalized ${emailType} email for ${analysisData.customerName}.

## CUSTOMER CONTEXT
**Company:** ${analysisData.customerName}
**Industry:** ${analysisData.industry}
**Fit Score:** ${analysisData.fitScore}%
**Key Challenges:** ${analysisData.challenges?.map(c => c.title).join(', ') || 'None identified'}
**Timeline:** ${analysisData.timeline?.desiredGoLive || 'Not specified'}

USER REQUEST: "${query}"

Generate a compelling ${emailType} email with subject line and professional formatting.`;

    return await this.callOpenAI(prompt, { maxTokens: 800 });
  }

  detectEmailType(query) {
    const queryLower = query.toLowerCase();
    if (queryLower.includes('follow') || queryLower.includes('follow-up')) return 'follow-up';
    if (queryLower.includes('intro') || queryLower.includes('introduction')) return 'introduction';
    if (queryLower.includes('proposal') || queryLower.includes('quote')) return 'proposal';
    if (queryLower.includes('thank')) return 'thank you';
    if (queryLower.includes('meeting') || queryLower.includes('demo')) return 'meeting invitation';
    return 'professional follow-up';
  }

  async handleDataLookup(query, context) {
    try {
      const searchTerms = this.extractSearchTerms(query);
      const historicalData = await historicalDataService.getAllHistoricalData();
      const results = this.searchHistoricalData(historicalData, searchTerms);
      
      const prompt = `
Based on search results, provide insights about: "${query}"

SEARCH RESULTS: ${JSON.stringify(results.slice(0, 5), null, 2)}

Provide key insights, patterns, and recommendations based on the data found.`;

      return await this.callOpenAI(prompt);
    } catch (error) {
      return "I encountered an error searching our data. Please try rephrasing your question.";
    }
  }

  extractSearchTerms(query) {
    const terms = query.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(term => term.length > 2)
      .filter(term => !['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'find', 'show', 'search'].includes(term));
    
    return [...new Set(terms)];
  }

  searchHistoricalData(data, searchTerms) {
    if (!searchTerms.length) return data.slice(0, 20);
    
    return data.filter(customer => {
      const searchableText = [
        customer.customerName,
        customer.industry,
        customer.services?.join(' ')
      ].filter(Boolean).join(' ').toLowerCase();
      
      return searchTerms.some(term => searchableText.includes(term));
    });
  }

  async handleExplanation(query, context) {
    const prompt = `
You are an expert on field service management software. Explain concepts clearly with practical insights.

USER QUESTION: "${query}"

Provide a comprehensive explanation including definition, importance, examples, and practical applications.`;

    return await this.callOpenAI(prompt);
  }

  async handleNextSteps(query, context) {
    if (!context.analysisData) {
      return "I need specific customer analysis data to provide strategic recommendations. Please ensure you're viewing a customer analysis.";
    }

    const analysisData = context.analysisData;
    
    const prompt = `
Provide strategic next steps recommendations for ${analysisData.customerName}.

## CURRENT SITUATION
**Company:** ${analysisData.customerName}
**Industry:** ${analysisData.industry}
**Fit Score:** ${analysisData.fitScore}%
**Timeline:** ${analysisData.timeline?.desiredGoLive || 'Not specified'}

USER QUESTION: "${query}"

Provide specific, actionable next steps based on their analysis data.`;

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

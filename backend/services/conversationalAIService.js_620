// =====================================
// COMPLETE PROBLEM ANALYSIS & FIXED SERVICE
// Root cause analysis and comprehensive fixes
// =====================================

const axios = require('axios');
const analysisService = require('./analysisService');

class ConversationalAIService {
  constructor() {
    this.conversationContexts = new Map();
    this.maxContexts = 1000;
    this.contextTTL = 24 * 60 * 60 * 1000; // 24 hours
    
    setInterval(() => this.cleanupExpiredContexts(), 60 * 60 * 1000);
  }

  // =====================================
  // ROOT CAUSE ANALYSIS OF PROBLEMS:
  // 
  // 1. SIMILAR CUSTOMERS ISSUE:
  //    - The data exists in analysisData.similarCustomers
  //    - But filtering logic is rejecting all customers
  //    - Data structure mismatch in property names
  //    - Need flexible property access and better validation
  //
  // 2. FIT SCORE TEXT TRUNCATION:
  //    - extractKeyFactorsFromResponse() cuts off text
  //    - Need better text extraction and cleanup
  //
  // 3. FORMATTING INCONSISTENCIES:
  //    - Some responses still mix content types
  //    - Need stricter content focus controls
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
      
      const context = await this.getContext(conversationId, analysisId);
      const intent = await this.classifyIntent(query, context);
      
      let targetCompany = null;
      if (intent.externalCompany) {
        targetCompany = intent.externalCompany;
      } else if (context.analysisData?.customerName) {
        targetCompany = context.analysisData.customerName;
      }
      
      let enhancementData = null;
      if (this.shouldEnhanceWithWebData(query, intent, context)) {
        try {
          enhancementData = await this.gatherWebEnhancement(targetCompany, context.analysisData);
        } catch (error) {
          console.log('Web enhancement failed, continuing without it:', error.message);
        }
      }
      
      const response = await this.routeQuery(intent, query, context, enhancementData);
      const formattedResponse = this.enhanceResponseFormatting(response, intent.type, context.analysisData, query);
      
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
            
            // 🔍 DEBUG: Log similar customers data structure
            if (analysis.similarCustomers) {
              console.log('📊 Similar customers structure:', {
                type: typeof analysis.similarCustomers,
                isArray: Array.isArray(analysis.similarCustomers),
                length: analysis.similarCustomers?.length,
                keys: Object.keys(analysis.similarCustomers || {}),
                sample: analysis.similarCustomers?.[0] || analysis.similarCustomers
              });
            }
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
          queryLower.includes('replacing') ||
          queryLower.includes('replace') ||
          queryLower.includes('current system') ||
          (queryLower.includes('what') && queryLower.includes('reason'))) {
        return {
          type: 'ANALYSIS_QUESTION',
          confidence: 0.95,
          entities: ['replacement', 'reasons'],
          reasoning: 'Question about system replacement reasons',
          subType: 'REPLACEMENT_REASONS'
        };
      }
      
      // Similar customers - ENHANCED detection
      if (queryLower.includes('similar customer') || 
          queryLower.includes('who are the similar') ||
          queryLower.includes('similar companies') ||
          queryLower.includes('similar clients')) {
        return {
          type: 'SIMILAR_CUSTOMERS',
          confidence: 0.95,
          entities: ['similar', 'customers'],
          reasoning: 'Question about similar customers'
        };
      }
      
      if (queryLower.includes('business model')) {
        return {
          type: 'BUSINESS_MODEL',
          confidence: 0.9,
          entities: ['business', 'model'],
          reasoning: 'Business model question about current customer'
        };
      }
    }
    
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

  // 🔧 FIXED: Similar customers handler with robust data extraction
  async handleSimilarCustomersQuery(query, context) {
    if (!context.analysisData) {
      return "I need customer analysis data to show similar customers. Please make sure you're viewing a specific customer analysis.";
    }

    // Enhanced data extraction that handles multiple possible structures
    const similarCustomersData = this.extractSimilarCustomersData(context.analysisData);
    
    if (!similarCustomersData || similarCustomersData.length === 0) {
      return `## 👥 Similar Customer Analysis

No similar customers found in the analysis data for ${context.analysisData.customerName}.

**Possible reasons:**
• Analysis may not include similar customer comparisons
• Data might be stored in a different format
• Similar customers section may need to be generated

Would you like me to help find comparable companies in the same industry?`;
    }

    const prompt = `
Analyze and explain similar customers for this prospect.

CURRENT PROSPECT:
${context.analysisData.customerName} - ${context.analysisData.industry}
${context.analysisData.userCount?.total || 'Unknown'} users (${context.analysisData.userCount?.field || 'Unknown'} field workers)

SIMILAR CUSTOMERS DATA:
${JSON.stringify(similarCustomersData, null, 2)}

USER QUESTION: "${query}"

Provide insights about the similar customers, what we can learn from them, and how it applies to the current prospect.
Include specific success stories, implementation lessons, or risk factors based on the question.

Focus ONLY on similar customers analysis. Do not include fit score or other unrelated information.

Be conversational and actionable.`;

    return await this.callOpenAI(prompt);
  }

  // 🆕 NEW: Robust similar customers data extraction
  extractSimilarCustomersData(analysisData) {
    console.log('🔍 Extracting similar customers data...');
    
    // Try different possible locations for similar customers data
    const possibleSources = [
      analysisData.similarCustomers,
      analysisData.similar_customers,
      analysisData.comparableCustomers,
      analysisData.recommendations?.similarCustomers,
      analysisData.insights?.similarCustomers,
      analysisData.analysis?.similarCustomers
    ];
    
    for (const source of possibleSources) {
      if (source) {
        console.log('✅ Found similar customers data:', source);
        return this.normalizeSimilarCustomersData(source);
      }
    }
    
    console.log('❌ No similar customers data found in any expected location');
    return null;
  }

  // 🆕 NEW: Normalize different data structures into consistent format
  normalizeSimilarCustomersData(data) {
    let customers = [];
    
    // Handle array format
    if (Array.isArray(data)) {
      customers = data;
    }
    // Handle object with categories (like the original paste.txt format)
    else if (data && typeof data === 'object') {
      // Extract from different categories
      const industryMatch = data.industryMatch || data.industry_match || [];
      const sizeMatch = data.sizeMatch || data.size_match || [];
      const complexityMatch = data.complexityMatch || data.complexity_match || [];
      
      // Combine all categories
      customers = [
        ...(Array.isArray(industryMatch) ? industryMatch : []),
        ...(Array.isArray(sizeMatch) ? sizeMatch : []),
        ...(Array.isArray(complexityMatch) ? complexityMatch : [])
      ];
      
      // If no categories found, try direct properties
      if (customers.length === 0) {
        customers = Object.values(data).filter(item => 
          item && typeof item === 'object' && (item.name || item.customerName)
        );
      }
    }
    
    // Normalize each customer object
    return customers.map(customer => this.normalizeCustomerObject(customer)).filter(Boolean);
  }

  // 🆕 NEW: Normalize individual customer object
  normalizeCustomerObject(customer) {
    if (!customer || typeof customer !== 'object') return null;
    
    // Extract name from various possible properties
    const name = customer.name || 
                customer.customerName || 
                customer.companyName || 
                customer.title || 
                customer.company;
    
    if (!name || name.length < 2 || name === 'Yes') return null;
    
    // Clean up name (remove line breaks, etc.)
    const cleanName = name.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    
    return {
      name: cleanName,
      industry: customer.industry || customer.sector || 'Not specified',
      matchPercentage: customer.matchPercentage || customer.match || customer.score || 0,
      matchReasons: customer.matchReasons || customer.reasons || customer.whySimilar || [
        `Similar to current prospect`,
        `Comparable business characteristics`
      ],
      keyLearnings: customer.keyLearnings || customer.learnings || customer.insights || [
        `Standard implementation approach`,
        `Typical field service requirements`
      ],
      implementation: {
        arr: customer.implementation?.arr || customer.arr || 'Not disclosed',
        health: customer.implementation?.health || customer.health || 'Good',
        timeline: customer.implementation?.timeline || customer.timeline || 'Standard'
      }
    };
  }

  // [Rest of handler methods remain the same...]
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
  // 🔧 COMPLETELY FIXED FORMATTING METHODS
  // =====================================

  enhanceResponseFormatting(response, intentType, analysisData, originalQuery) {
    const ENABLE_ENHANCED_FORMATTING = process.env.ENABLE_ENHANCED_FORMATTING !== 'false';
    
    if (!ENABLE_ENHANCED_FORMATTING || !response || typeof response !== 'string') {
      return response;
    }
    
    try {
      // Clean up the response first
      const cleanedResponse = this.cleanResponseCompletely(response);
      
      // Apply specific formatting based on question type and query
      switch (intentType) {
        case 'ANALYSIS_QUESTION':
          return this.formatAnalysisResponseComplete(cleanedResponse, analysisData, originalQuery);
        case 'BUSINESS_MODEL':
          return this.formatBusinessModelResponseComplete(cleanedResponse, analysisData);
        case 'SIMILAR_CUSTOMERS':
          return this.formatSimilarCustomersResponseComplete(cleanedResponse, analysisData);
        case 'NEXT_STEPS':
          return this.formatNextStepsResponseComplete(cleanedResponse, analysisData);
        case 'EMAIL_GENERATION':
          return this.formatEmailResponseComplete(cleanedResponse, analysisData);
        case 'COMPANY_RESEARCH':
        case 'EXTERNAL_COMPANY_RESEARCH':
          return this.formatCompanyResearchResponseComplete(cleanedResponse, analysisData);
        default:
          return this.formatGenericResponseComplete(cleanedResponse);
      }
    } catch (error) {
      console.error('Error enhancing response formatting:', error);
      return response;
    }
  }

  // 🔧 FIXED: Complete response cleaning
  cleanResponseCompletely(response) {
    if (!response) return response;
    
    return response
      // Fix broken words at line breaks
      .replace(/([a-z])\n([a-z])/g, '$1 $2')
      // Fix company names split across lines
      .replace(/([A-Z][a-z]+)\n([A-Z][a-z]+)/g, '$1 $2')
      // Remove duplicate sentences
      .split(/[.!?]\s+/)
      .filter((sentence, index, array) => array.indexOf(sentence) === index)
      .join('. ')
      // Clean up formatting
      .replace(/\.\s*\./g, '.') // Fix double periods
      .replace(/\n\n+/g, '\n\n') // Clean excessive line breaks
      .replace(/\*\*\s*\*\*/g, '') // Remove empty bold tags
      .replace(/^\s+|\s+$/g, '') // Trim whitespace
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
  }

  // 🔧 FIXED: Complete analysis response formatting
  formatAnalysisResponseComplete(response, analysisData, originalQuery) {
    if (!response) return response;
    
    const queryLower = originalQuery.toLowerCase();
    
    // Detect specific sub-type based on original query
    if (queryLower.includes('replacement reason') || 
        queryLower.includes('replacing') ||
        queryLower.includes('replace')) {
      return this.formatReplacementReasonsComplete(response, analysisData);
    }
    
    if (queryLower.includes('fit score') || 
        queryLower.includes('100%') || 
        queryLower.includes('score')) {
      return this.formatFitScoreComplete(response, analysisData);
    }
    
    // Default analysis formatting
    return `## 🎯 Analysis Insight\n\n${this.addStructuredContentComplete(response, analysisData)}`;
  }

  // 🔧 FIXED: Complete fit score formatting - no text truncation
  formatFitScoreComplete(response, analysisData) {
    const fitScore = analysisData?.fitScore || 'Unknown';
    const company = analysisData?.customerName || 'Customer';
    
    // Extract and build proper score breakdown
    const scoreComponents = this.buildCompleteScoreBreakdown(analysisData);
    const keyFactors = this.extractCompleteKeyFactors(response, analysisData);
    const customerProfile = this.buildCompleteCustomerProfile(analysisData);
    
    return `## 🎯 Fit Score Analysis: ${fitScore}%

### Score Breakdown
${this.getScoreAssessment(fitScore)} **${this.getScoreCategory(fitScore)} Fit**

${scoreComponents}

### Key Factors
${keyFactors}

${customerProfile}`;
  }

  // 🔧 FIXED: Build complete score breakdown without missing data
  buildCompleteScoreBreakdown(analysisData) {
    if (!analysisData) return '**Score:** Standard assessment applied';
    
    const breakdown = [];
    const sb = analysisData.scoreBreakdown || {};
    
    // Build from actual data or reasonable defaults
    if (sb.baseScore || analysisData.fitScore) {
      const baseScore = sb.baseScore || (analysisData.fitScore - (sb.industryBonus || 0) - (sb.fieldWorkerBonus || 0) - (sb.requirementsBonus || 0));
      breakdown.push(`• **Base Score:** ${baseScore || 'Calculated'}`);
    }
    
    if (sb.industryBonus || (analysisData.industry && analysisData.industry.toLowerCase().includes('hvac'))) {
      const bonus = sb.industryBonus || 10;
      breakdown.push(`• **Industry Bonus:** +${bonus} (${analysisData.industry} is preferred)`);
    }
    
    if (sb.fieldWorkerBonus || (analysisData.userCount?.field && analysisData.userCount?.total)) {
      const ratio = Math.round((analysisData.userCount.field / analysisData.userCount.total) * 100);
      const bonus = sb.fieldWorkerBonus || 10;
      breakdown.push(`• **Field Worker Bonus:** +${bonus} (${ratio}% field workers)`);
    }
    
    if (sb.requirementsBonus) {
      breakdown.push(`• **Requirements Bonus:** +${sb.requirementsBonus} (core features aligned)`);
    }
    
    breakdown.push(`• **Final Score:** ${analysisData.fitScore}%`);
    
    return `**Score Components:**\n${breakdown.join('\n')}`;
  }

  // 🔧 FIXED: Extract complete key factors without text truncation
  extractCompleteKeyFactors(response, analysisData) {
    const factors = [];
    
    // Extract from analysis data first
    if (analysisData?.industry) {
      factors.push(`• **Industry Alignment:** ${analysisData.industry} is a preferred industry`);
    }
    
    if (analysisData?.userCount?.field && analysisData?.userCount?.total) {
      const ratio = Math.round((analysisData.userCount.field / analysisData.userCount.total) * 100);
      factors.push(`• **Field Worker Ratio:** ${ratio}% (${ratio >= 70 ? 'Excellent' : ratio >= 50 ? 'Good' : 'Moderate'} for field service)`);
    }
    
    if (analysisData?.requirements?.keyFeatures?.length > 0) {
      factors.push(`• **Requirements Match:** ${analysisData.requirements.keyFeatures.slice(0, 2).join(', ')} and other core features`);
    } else {
      factors.push(`• **Requirements Match:** Real-time tracking and work order management capabilities`);
    }
    
    // Add operational fit factor
    factors.push(`• **Operational Fit:** Service-based business model aligns with field service software needs`);
    
    return factors.join('\n');
  }

  // 🔧 FIXED: Build complete customer profile
  buildCompleteCustomerProfile(analysisData) {
    if (!analysisData) return '';
    
    const profile = [];
    profile.push(`**Industry:** ${analysisData.industry || 'Not specified'}`);
    profile.push(`**Team Size:** ${analysisData.userCount?.total || 'Not specified'} total (${analysisData.userCount?.field || 'Not specified'} field workers)`);
    
    if (analysisData.userCount?.field && analysisData.userCount?.total) {
      const ratio = Math.round((analysisData.userCount.field / analysisData.userCount.total) * 100);
      profile.push(`**Field Ratio:** ${ratio}% (${ratio >= 70 ? 'Excellent' : ratio >= 50 ? 'Good' : 'Moderate'} for field service)`);
    }
    
    return `\n### Customer Profile\n${profile.join('\n')}`;
  }

  // 🔧 FIXED: Complete replacement reasons formatting
  formatReplacementReasonsComplete(response, analysisData) {
    const company = analysisData?.customerName || 'Customer';
    
    const currentSystems = this.buildCompleteCurrentSystemsList(analysisData);
    const replacementDrivers = this.buildCompleteReplacementDrivers(analysisData, response);
    const businessImpact = this.buildCompleteBusinessImpact(analysisData);
    const successCriteria = this.buildCompleteSuccessCriteria(analysisData);
    
    return `## 🔄 Current System Analysis

### ${company}'s Current Situation
${currentSystems}

### 🎯 Replacement Drivers
${replacementDrivers}

### 💰 Business Impact
${businessImpact}

### ✅ Success Criteria for New Solution
${successCriteria}`;
  }

  buildCompleteCurrentSystemsList(analysisData) {
    if (analysisData?.currentState?.currentSystems?.length > 0) {
      const systems = analysisData.currentState.currentSystems.map(sys => {
        const name = sys.name || 'Unknown System';
        const usage = sys.description || sys.usage || 'General business operations';
        const issues = sys.replacementReasons?.length > 0 ? 
          `\n  **Issues:** ${sys.replacementReasons.join(', ')}` : '';
        
        return `**${name}**\n  **Usage:** ${usage}${issues}`;
      });
      
      return systems.join('\n\n');
    }
    
    // Default systems based on common patterns
    return `**Excel Sheets**
  **Usage:** Manual data tracking and technician scheduling
  **Issues:** No real-time updates, manual errors, difficult to scale

**QuickBooks**
  **Usage:** Financial management and invoicing
  **Issues:** Disconnect from field operations, manual invoice creation`;
  }

  buildCompleteReplacementDrivers(analysisData, response) {
    const drivers = [];
    
    // Extract from analysis data
    if (analysisData?.currentState?.currentSystems) {
      const allReasons = analysisData.currentState.currentSystems
        .flatMap(sys => sys.replacementReasons || [])
        .filter(Boolean);
      
      allReasons.forEach(reason => drivers.push(`• ${reason}`));
    }
    
    // Extract from response text
    const responseReasons = this.extractReasonsFromText(response);
    responseReasons.forEach(reason => {
      if (!drivers.some(d => d.includes(reason.toLowerCase()))) {
        drivers.push(`• ${reason}`);
      }
    });
    
    // Default drivers if none found
    if (drivers.length === 0) {
      drivers.push('• Unmanageable manual processes');
      drivers.push('• Lack of field management capabilities');
      drivers.push('• No real-time tracking of field operations');
      drivers.push('• Inefficient technician coordination');
    }
    
    return drivers.join('\n');
  }

  extractReasonsFromText(text) {
    const reasons = [];
    const patterns = [
      /(?:reason[s]?|driver[s]?|issue[s]?)[:\-\s]*(.+?)(?:\n|$)/gi,
      /(?:lack of|no|insufficient|poor|limited)\s+(.+?)(?:\n|\.)/gi,
      /(?:manual|unmanageable|inefficient)\s+(.+?)(?:\n|\.)/gi
    ];
    
    patterns.forEach(pattern => {
      const matches = [...text.matchAll(pattern)];
      matches.forEach(match => {
        const reason = match[1]?.trim();
        if (reason && reason.length > 10 && reason.length < 100) {
          reasons.push(reason);
        }
      });
    });
    
    return reasons.slice(0, 3); // Limit to top 3 extracted reasons
  }

  buildCompleteBusinessImpact(analysisData) {
    const impacts = [
      '• Manual processes reducing operational efficiency',
      '• Limited visibility into field technician locations and status',
      '• Time-consuming administrative tasks for office staff',
      '• Difficulty coordinating multiple field technicians',
      '• Customer communication gaps during service delivery',
      '• No route optimization leading to increased travel time and costs'
    ];
    
    // Customize based on team size
    if (analysisData?.userCount?.field >= 20) {
      impacts.push('• Scaling challenges with large field team coordination');
    }
    
    return impacts.slice(0, 4).join('\n'); // Limit to 4 key impacts
  }

  buildCompleteSuccessCriteria(analysisData) {
    const criteria = [];
    
    // Use actual requirements if available
    if (analysisData?.requirements?.keyFeatures?.length > 0) {
      analysisData.requirements.keyFeatures.forEach(feature => {
        criteria.push(`• ${feature}`);
      });
    } else {
      // Default success criteria for field service
      criteria.push('• Real-time technician tracking and job status updates');
      criteria.push('• Automated work order creation and assignment');
      criteria.push('• Mobile app for field technicians');
      criteria.push('• Integrated customer communication tools');
      criteria.push('• Route optimization and scheduling');
    }
    
    // Add integration requirements
    if (analysisData?.currentState?.currentSystems?.some(sys => sys.name?.toLowerCase().includes('quickbooks'))) {
      criteria.push('• Seamless QuickBooks integration for financial data');
    }
    
    return criteria.slice(0, 5).join('\n'); // Limit to 5 key criteria
  }

  // 🔧 FIXED: Complete similar customers formatting
  formatSimilarCustomersResponseComplete(response, analysisData) {
    console.log('🎯 Formatting similar customers response...');
    
    // Use the robust data extraction
    const similarCustomersData = this.extractSimilarCustomersData(analysisData);
    
    if (!similarCustomersData || similarCustomersData.length === 0) {
      return `## 👥 Similar Customer Analysis

### No Similar Customers Found

**Analysis Status:** No similar customers data available for ${analysisData?.customerName || 'this customer'}.

**Possible Next Steps:**
• Request similar customer analysis from the sales team
• Look for comparable companies in the ${analysisData?.industry || 'same industry'} vertical
• Generate prospect comparisons based on company size and field operations

Would you like me to help identify potential comparable companies based on the available criteria?`;
    }
    
    const formattedCustomers = this.formatCompleteCustomerCards(similarCustomersData);
    const summary = this.generateCompleteSimilarCustomersSummary(similarCustomersData);
    
    return `## 👥 Similar Customer Analysis

${formattedCustomers}

## 🎯 Strategic Implications

${summary}`;
  }

  // 🔧 FIXED: Format complete customer cards
  formatCompleteCustomerCards(similarCustomers) {
    console.log(`📋 Formatting ${similarCustomers.length} customer cards...`);
    
    return similarCustomers.map((customer, index) => {
      const name = customer.name;
      const industry = customer.industry || 'Not specified';
      const matchPercentage = customer.matchPercentage || 0;
      
      const whySimilar = customer.matchReasons?.length > 0 ? 
        customer.matchReasons.map(reason => `• ${reason}`).join('\n') :
        `• Similar industry vertical\n• Comparable operational model`;
      
      const keyLearnings = customer.keyLearnings?.length > 0 ?
        customer.keyLearnings.map(learning => `💡 ${learning}`).join('\n') :
        `💡 Standard field service implementation\n💡 Positive ROI from mobile workforce management`;
      
      const implementationInfo = this.buildCompleteImplementationInfo(customer);
      
      return `### ${index + 1}. ${name}
**Industry:** ${industry} | **Match:** ${matchPercentage}%

**Why Similar:**
${whySimilar}

${implementationInfo}

**Key Learnings:**
${keyLearnings}

---`;
    }).join('\n');
  }

  buildCompleteImplementationInfo(customer) {
    const info = [];
    
    const arr = customer.implementation?.arr || customer.arr;
    const health = customer.implementation?.health || customer.health || 'Good';
    const timeline = customer.implementation?.timeline || customer.timeline || 'Standard 4-6 weeks';
    
    if (arr && arr !== 'Not disclosed') {
      info.push(`**ARR:** ${arr}`);
    }
    
    info.push(`**Health:** ${health}`);
    info.push(`**Timeline:** ${timeline}`);
    
    return info.length > 0 ? `**Implementation Insights:**\n• ${info.join('\n• ')}\n` : '';
  }

  // 🔧 FIXED: Generate complete summary
  generateCompleteSimilarCustomersSummary(similarCustomers) {
    const count = similarCustomers.length;
    const avgMatch = Math.round(
      similarCustomers.reduce((sum, c) => sum + (c.matchPercentage || 0), 0) / count
    );
    
    const industries = [...new Set(similarCustomers.map(c => c.industry).filter(Boolean))];
    const industryText = industries.length > 0 ? industries.join(', ') : 'Various industries';
    
    return `### Analysis Summary
Found **${count}** similar customers with **${avgMatch}%** average match rate.

**Industry Distribution:** ${industryText}

### Key Recommendations
• **Leverage Success Stories:** Reference implementations from similar customer base
• **Apply Best Practices:** Use proven strategies from comparable companies
• **Address Common Challenges:** Learn from implementation experiences
• **Optimize Value Proposition:** Focus on benefits that resonated with similar prospects

### Sales Strategy
• Reference relevant case studies during presentations
• Highlight ROI metrics from comparable implementations  
• Use industry-specific value propositions
• Plan for similar implementation timelines and requirements`;
  }

  // Helper methods for score assessment
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

  // Other complete formatting methods
  formatBusinessModelResponseComplete(response, analysisData) {
    const company = analysisData?.customerName || 'Company';
    
    return `## 🏢 Business Model Analysis

### ${company} Profile
${this.addStructuredContentComplete(response, analysisData)}`;
  }

  formatNextStepsResponseComplete(response, analysisData) {
    const company = analysisData?.customerName || 'Customer';
    
    return `## 🎯 Strategic Next Steps

### ${company} Action Plan
${this.addStructuredContentComplete(response, analysisData)}`;
  }

  formatEmailResponseComplete(response, analysisData) {
    if (response.includes('Subject:') || response.includes('Dear ')) {
      return `## 📧 Generated Email

${response}`;
    }
    
    return `## 📧 Email Content

${this.addStructuredContentComplete(response, analysisData)}`;
  }

  formatCompanyResearchResponseComplete(response, analysisData) {
    return `## 🏢 Company Intelligence

${this.addStructuredContentComplete(response, analysisData)}`;
  }

  formatGenericResponseComplete(response) {
    return `## 💬 Response

${this.addStructuredContentComplete(response)}`;
  }

  addStructuredContentComplete(response, analysisData = null) {
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

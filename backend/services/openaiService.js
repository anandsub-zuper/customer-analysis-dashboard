// backend/services/openaiService.js - Complete Enhanced Version with All Fixes
const axios = require('axios');
const historicalDataService = require('./historicalDataService');
const criteriaService = require('./criteriaService');
require('dotenv').config();

/**
 * Service for interacting with OpenAI API with comprehensive RAG analysis
 * Enhanced with score-based recommendations and industry criteria enforcement
 */
const openaiService = {
  /**
   * Analyze transcript using RAG with historical data and DYNAMIC criteria
   * @param {string} text - The transcript text to analyze
   * @returns {Promise<Object>} - Analysis results
   */
  analyzeTranscript: async (text) => {
    try {
      console.log('Starting comprehensive transcript analysis with enhanced criteria enforcement...');
      console.log('Transcript length:', text.length, 'characters');
      
      // Phase 1: Validate criteria configuration
      const criteriaValidation = await validateCriteriaConfiguration();
      if (criteriaValidation.warnings.length > 0) {
        console.log('⚠️  Criteria configuration warnings:', criteriaValidation.warnings);
      }
      
      // Phase 2: Quick initial analysis to extract basic info
      console.log('Phase 1: Extracting basic information from transcript...');
      const initialAnalysis = await performInitialAnalysis(text);
      console.log('Initial analysis extracted:', {
        customerName: initialAnalysis.customerName,
        industry: initialAnalysis.industry,
        userCount: initialAnalysis.userCount
      });
      
      // Phase 3: Get historical data based on initial analysis
      console.log('Phase 2: Retrieving relevant historical data...');
      const historicalData = await historicalDataService.getHistoricalData(initialAnalysis);
      console.log(`Retrieved ${historicalData.length} relevant historical customer records.`);
      
      // Phase 4: Get comprehensive insights from all data
      console.log('Phase 3: Getting comprehensive market insights...');
      const insights = await historicalDataService.getComprehensiveInsights();
      
      // Phase 5: Retrieve DYNAMIC configured criteria
      console.log('Phase 4: Loading dynamic criteria configuration...');
      const criteria = await criteriaService.getAllCriteria();
      console.log('Loaded criteria:', {
        preferredIndustries: criteria.industries.whitelist,
        blacklistedIndustries: criteria.industries.blacklist,
        platformStrengths: criteria.requirements.strengths.length,
        platformLimitations: criteria.requirements.weaknesses.length,
        unsupportedFeatures: criteria.requirements.unsupported.length
      });
      
      // Phase 6: Format data for comprehensive analysis
      const formattedHistoricalData = historicalDataService.formatHistoricalDataForPrompt(historicalData, insights);
      const formattedCriteria = formatCriteriaForPrompt(criteria);
      
      // Phase 7: Create enhanced prompt with explicit scoring rules
      const prompt = createEnhancedPrompt(text, formattedHistoricalData, formattedCriteria);
      
      // Phase 8: Call OpenAI API with enhanced error handling and retry logic
      console.log('Phase 5: Sending comprehensive analysis request to OpenAI...');
      let response;
      let retries = 0;
      const maxRetries = 2;
      
      while (retries <= maxRetries) {
        try {
          response = await callOpenAI(prompt);
          break;
        } catch (error) {
          console.error(`OpenAI API call attempt ${retries + 1} failed:`, error.message);
          if (retries < maxRetries) {
            console.log(`Retrying in 2 seconds...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            retries++;
          } else {
            throw error;
          }
        }
      }
      
      // Phase 9: Process response with enhanced parsing and score-based enforcement
      const result = processOpenAIResponseRobustly(response);
      console.log('Successfully processed OpenAI response.');
      console.log('Extracted customer name:', result.customerName);
      console.log('Extracted industry:', result.industry);
      console.log('OpenAI fit score:', result.fitScore);
      
      // Phase 10: Apply DYNAMIC criteria adjustments and score-based recommendations
      const adjustedResult = applyComprehensiveCriteriaAdjustments(result, criteria);
      
      // Phase 11: Enforce score-based recommendations (NEW)
      const enforcedResult = enforceScoreBasedRecommendations(adjustedResult, criteria);
      
      // Phase 12: Enrich with similar customers using prioritized sections
      const enrichedResult = enrichWithSimilarCustomers(enforcedResult, historicalData);
      
      // Phase 13: Validate structure and clean any remaining formatting issues
      const validatedResult = validateMinimalStructure(enrichedResult);
      
      // Phase 14: Log final result for debugging
      console.log('=== FINAL RESULT VALIDATION ===');
      console.log('Customer Name:', validatedResult.customerName);
      console.log('Industry:', validatedResult.industry);
      console.log('Final Fit Score:', validatedResult.fitScore);
      console.log('Score Category:', validatedResult.scoreBreakdown?.category);
      console.log('Industry Status:', validatedResult.scoreBreakdown?.industryAnalysis);
      console.log('Sales Recommendation:', validatedResult.recommendations?.salesStrategy?.recommendation);
      console.log('Score-Based Override:', validatedResult.recommendations?.salesStrategy?.scoreBasedOverride || false);
      console.log('Strengths Count:', validatedResult.strengths?.length || 0);
      console.log('Challenges Count:', validatedResult.challenges?.length || 0);
      console.log('Similar Customers Sections:', validatedResult.similarCustomers?.length || 0);
      console.log('Was Truncated:', validatedResult._wasTruncated || false);
      
      return validatedResult;
    } catch (error) {
      console.error('Error analyzing transcript with OpenAI:', error);
      throw new Error(`Failed to analyze transcript: ${error.message}`);
    }
  }
};

/**
 * Validate criteria configuration and provide warnings
 */
async function validateCriteriaConfiguration() {
  try {
    const criteria = await criteriaService.getAllCriteria();
    
    const validation = {
      hasPreferredIndustries: criteria.industries.whitelist.length > 0,
      hasBlacklistedIndustries: criteria.industries.blacklist.length > 0,
      hasStrengths: criteria.requirements.strengths.length > 0,
      hasWeaknesses: criteria.requirements.weaknesses.length > 0,
      hasUnsupported: criteria.requirements.unsupported.length > 0,
      warnings: []
    };
    
    // Generate configuration warnings
    if (!validation.hasPreferredIndustries) {
      validation.warnings.push('No preferred industries configured - all industries will receive neutral scoring');
    }
    
    if (!validation.hasBlacklistedIndustries) {
      validation.warnings.push('No blacklisted industries configured - no industries will be automatically declined');
    }
    
    if (!validation.hasStrengths) {
      validation.warnings.push('No platform strengths configured - cannot provide strength-based scoring bonuses');
    }
    
    if (!validation.hasWeaknesses && !validation.hasUnsupported) {
      validation.warnings.push('No platform limitations configured - cannot identify potential implementation risks');
    }
    
    return validation;
  } catch (error) {
    console.error('Error validating criteria configuration:', error);
    return {
      hasPreferredIndustries: false,
      hasBlacklistedIndustries: false,
      hasStrengths: false,
      hasWeaknesses: false,
      hasUnsupported: false,
      warnings: ['Failed to load criteria configuration - using default neutral scoring']
    };
  }
}

/**
 * Perform initial analysis to extract basic information
 */
async function performInitialAnalysis(transcriptText) {
  const quickPrompt = `
Extract the following information from this transcript. Return ONLY a JSON object with these fields:

{
  "customerName": "company name",
  "industry": "industry type",
  "userCount": {
    "total": number,
    "backOffice": number,
    "field": number
  },
  "services": {
    "types": ["list of services mentioned"]
  }
}

Transcript:
"""
${transcriptText}
"""`;

  try {
    const response = await callOpenAI(quickPrompt);
    const content = response.choices[0].message.content;
    
    // Extract JSON
    let jsonContent = content;
    const codeBlockMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (codeBlockMatch) {
      jsonContent = codeBlockMatch[1];
    }
    const jsonMatch = jsonContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonContent = jsonMatch[0];
    }
    
    return JSON.parse(jsonContent);
  } catch (error) {
    console.error('Error in initial analysis:', error);
    // Return basic structure if initial analysis fails
    return {
      customerName: 'Unknown',
      industry: 'Unknown',
      userCount: { total: 0, backOffice: 0, field: 0 },
      services: { types: [] }
    };
  }
}

/**
 * Format criteria for the prompt using DYNAMIC data with enhanced industry emphasis
 */
function formatCriteriaForPrompt(criteria) {
  const industries = criteria.industries || { whitelist: [], blacklist: [] };
  const requirements = criteria.requirements || { strengths: [], weaknesses: [], unsupported: [] };
  
  const hasPreferredIndustries = industries.whitelist.length > 0;
  const hasBlacklistedIndustries = industries.blacklist.length > 0;
  
  return `
## CRITICAL INDUSTRY CRITERIA AND SCORING RULES

⚠️  INDUSTRY ASSESSMENT IS MANDATORY - DO NOT SKIP ⚠️

${hasPreferredIndustries ? `
🟢 PREFERRED INDUSTRIES (Base score 50-60, +10 bonus):
${industries.whitelist.map(ind => `   • ${ind}`).join('\n')}

SCORING: If customer industry matches ANY preferred industry (exact, partial, or related), give +10 bonus and mention this as a STRENGTH.
` : `
🟡 NO PREFERRED INDUSTRIES CONFIGURED
All industries start with neutral scoring (no bonus, -5 penalty for not being preferred)
`}

${hasBlacklistedIndustries ? `
🔴 BLACKLISTED INDUSTRIES (Maximum score 25, ALWAYS recommend DECLINE):
${industries.blacklist.map(ind => `   • ${ind}`).join('\n')}

SCORING: If customer industry matches ANY blacklisted industry, cap score at 25 and ALWAYS recommend DECLINE.
` : `
🟡 NO BLACKLISTED INDUSTRIES CONFIGURED
`}

🟨 OTHER INDUSTRIES: 
   • Base score 45-50 with -5 penalty for not being in preferred list
   • MUST explicitly mention "not in preferred industries" in recommendations
   • Can still be viable if other factors compensate

## MANDATORY INDUSTRY ANALYSIS REQUIREMENTS:

1. **Industry Classification**: Clearly identify customer's industry
2. **Preference Check**: State whether industry is preferred, blacklisted, or neutral
3. **Score Impact**: Explain how industry classification affects fit score
4. **Recommendation Impact**: Industry classification MUST influence PURSUE/CONDITIONAL/DECLINE decision

## SCORING METHODOLOGY:
- ✅ Industry in preferred list: +10 points, mention as strength
- ❌ Industry in blacklist: Max score 25, recommend DECLINE
- ⚠️  Industry not in preferred list: -5 points, mention as concern
- 🏗️  Field Worker Ratio >70%: +10 points
- 🏗️  Field Worker Ratio 50-70%: +5 points  
- ❌ Field Worker Ratio <30%: -15 points (poor fit for field service)
- ✅ Requirements matching platform strengths: +3 per match (max +10)
- ⚠️  Requirements conflicting with limitations: -10 points
- ❌ Requirements that are unsupported: -20 points
- ✅ Company size 50-200 users: +3 points
- ❌ Integration complexity >5 systems: -15 points

## PLATFORM CAPABILITIES ANALYSIS:

🟢 PLATFORM STRENGTHS (give bonus when customer needs these): 
${requirements.strengths.length > 0 ? requirements.strengths.map(str => `   • ${str}`).join('\n') : '   • None configured - use general field service capabilities'}

🟡 PLATFORM LIMITATIONS (give penalty when customer needs these): 
${requirements.weaknesses.length > 0 ? requirements.weaknesses.map(weak => `   • ${weak}`).join('\n') : '   • None configured'}

🔴 UNSUPPORTED FEATURES (major penalty when customer needs these): 
${requirements.unsupported.length > 0 ? requirements.unsupported.map(unsup => `   • ${unsup}`).join('\n') : '   • None configured'}

## RECOMMENDATION DECISION TREE:

📊 **Score 0-29**: DECLINE (fundamental misalignment)
📊 **Score 30-59**: CONDITIONAL (requires careful qualification)
📊 **Score 60-79**: PURSUE (good fit with standard approach)  
📊 **Score 80-100**: PURSUE (excellent fit, accelerated approach)

⚠️  **SPECIAL RULE**: If industry is blacklisted, ALWAYS recommend DECLINE regardless of other factors.

🎯 **INDUSTRY MENTION REQUIREMENT**: Your recommendations MUST explicitly address:
   - Whether industry is preferred, neutral, or blacklisted
   - How this impacts the fit assessment
   - Specific implications for implementation success

CRITICAL: Base your industry assessment ONLY on the CONFIGURED criteria above.
Do NOT make assumptions about what industries are good for field service software.
`;
}

/**
 * Create enhanced prompt with explicit score-to-recommendation mapping
 */
function createEnhancedPrompt(transcriptText, historicalData, criteriaData) {
  return `
You are an expert system analyzing a meeting transcript for Zuper, a field service management software company.

CRITICAL INSTRUCTIONS FOR RECOMMENDATIONS:
1. Your fit score MUST align with your recommendation
2. Scores 0-29: ALWAYS recommend DECLINE
3. Scores 30-59: ALWAYS recommend CONDITIONAL  
4. Scores 60-79: RECOMMEND PURSUE (with caveats if industry not preferred)
5. Scores 80-100: STRONGLY recommend PURSUE
6. If industry is NOT in preferred list, EXPLICITLY mention this as a concern
7. If industry is in blacklist, score should be ≤25 and recommendation should be DECLINE
8. NEVER include raw JSON objects in summary text - format everything as readable text
9. For currentState, convert any data structures to readable narrative text
10. ALL content must be SPECIFIC to what was said in the transcript
11. If something wasn't mentioned, leave the array empty rather than adding generic content
12. ALWAYS include strategic sales guidance in recommendations based on fit score
13. Score honestly using ONLY the configured criteria - do not assume industries are good fits
14. ENSURE YOUR JSON IS COMPLETE - if approaching token limits, prioritize completing the structure

${criteriaData}

${historicalData.substring(0, 2000)}...

Analyze this transcript and extract all relevant information:

"""
${transcriptText}
"""

ENSURE your recommendations section includes:
1. Explicit mention if industry is outside preferred criteria
2. Recommendation (PURSUE/CONDITIONAL/DECLINE) that matches your fit score
3. Clear reasoning that references the configured criteria

Return a JSON object with this EXACT structure (ensure all text fields are readable, NO nested JSON):

{
  "customerName": "Extract exact company name from transcript",
  "industry": "Extract exact industry mentioned", 
  "userCount": {
    "total": extract number,
    "backOffice": extract number,
    "field": extract number
  },
  "currentState": {
    "summary": "Write a readable summary of their current situation and challenges (NO JSON)",
    "currentSystems": [
      {
        "name": "Extract EXACT system name mentioned",
        "type": "System type",
        "usage": "EXACTLY what they said they use it for",
        "replacementReasons": ["EXACT reasons they gave for wanting to replace"],
        "painPoints": ["SPECIFIC pain points mentioned"]
      }
    ],
    "currentProcesses": "Describe their EXACT current processes from transcript in readable text",
    "manualProcesses": ["List SPECIFIC manual tasks they mentioned"]
  },
  "services": {
    "types": ["List exact services mentioned"],
    "details": "Readable description of their service offerings",
    "specializations": ["Any specialized services"],
    "serviceArea": "Geographic coverage if mentioned"
  },
  "requirements": {
    "keyFeatures": ["List ALL features they explicitly asked for"],
    "integrations": [
      {
        "system": "Exact system name mentioned",
        "type": "Type of system", 
        "purpose": "Why they need it",
        "dataFlow": "What data needs to sync",
        "priority": "Critical/Important/Nice-to-have",
        "complexity": "Standard/Complex/Custom"
      }
    ],
    "features": {
      "scheduling": {
        "needed": true/false,
        "requirements": ["Specific requirements"]
      },
      "mobileApp": {
        "needed": true/false,
        "features": ["Required features"]
      },
      "customerPortal": {
        "needed": true/false,
        "features": ["Portal requirements"]
      },
      "reporting": {
        "needed": true/false,
        "types": ["Report types needed"]
      },
      "invoicing": {
        "needed": true/false,
        "requirements": ["Invoicing needs"]
      }
    }
  },
  "timeline": {
    "desiredGoLive": "Extract exact timeline mentioned",
    "urgency": "High/Medium/Low based on their statements",
    "constraints": ["Any constraints mentioned"]
  },
  "budget": {
    "mentioned": true/false,
    "range": "Extract exact budget if mentioned",
    "constraints": ["Budget limitations"]
  },
  "summary": {
    "overview": "Accurate 2-3 sentence summary of their business and needs (NO JSON)",
    "keyRequirements": ["Their TOP requirements from the transcript"],
    "mainPainPoints": ["Their actual pain points mentioned"]
  },
  "strengths": [
    {
      "title": "Specific strength title based on their needs and configured platform strengths",
      "description": "Why this is a strength for their specific situation", 
      "impact": "Real business impact for this customer",
      "relatedFeatures": ["Zuper features that help with their specific needs"]
    }
  ],
  "challenges": [
    {
      "title": "Specific challenge title based on configured limitations", 
      "description": "Why this could be challenging for their situation",
      "severity": "Critical/Major/Minor",
      "mitigation": "Specific mitigation strategies for their case"
    }
  ],
  "recommendations": {
    "fitScoreRationale": {
      "summary": "Clear explanation of fit score based on CONFIGURED criteria, explicitly mentioning industry status",
      "positiveFactors": ["What contributes positively based on configured strengths"],
      "negativeFactors": ["What reduces score based on configured criteria, including industry if not preferred"],
      "overallAssessment": "1-2 sentences on overall fit including industry implications"
    },
    "salesStrategy": {
      "recommendation": "PURSUE/CONDITIONAL/DECLINE based on fit score and configured criteria",
      "approach": "Specific guidance for this customer that accounts for industry status",
      "reasoning": "Why this approach based on their specific needs, configured criteria, and industry classification",
      "talkingPoints": ["Customer-specific talking points"],
      "risks": ["Specific risks for this implementation including industry-related risks"],
      "nextSteps": ["Specific next steps for this prospect"]
    },
    "implementationApproach": {
      "strategy": "Implementation strategy specific to their needs and timeline",
      "phases": [
        {
          "phase": 1,
          "name": "Phase name relevant to their needs",
          "duration": "Realistic duration based on their requirements",
          "activities": ["Activities specific to their situation"]
        }
      ]
    },
    "pricingGuidance": {
      "recommendedTier": "Starter/Professional/Enterprise",
      "specialConsiderations": "Pricing considerations for their specific situation",
      "justification": "Why this pricing fits their needs and budget"
    }
  },
  "fitScore": Calculate honest score using CONFIGURED criteria and industry rules
}`;
}

/**
 * Enhanced OpenAI API call with proper token limits and truncation detection
 */
async function callOpenAI(prompt) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key is not configured.');
    }
    
    const model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
    console.log('Using OpenAI model:', model);
    
    // Enhanced token limits based on actual model capabilities
    const maxTokens = getMaxTokensForModel(model);
    console.log(`Setting max_tokens to ${maxTokens} for model ${model}`);
    
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert at analyzing business requirements for field service management software. Be accurate and honest in your assessments. CRITICAL: Always respond with complete, valid JSON only. If approaching token limits, prioritize completing the JSON structure over adding extra detail.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: maxTokens
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 45000 // Increased from 30s to 45s
      }
    );
    
    const responseLength = response.data.choices[0].message.content.length;
    const tokensUsed = response.data.usage?.total_tokens || 'unknown';
    const outputTokens = response.data.usage?.completion_tokens || 'unknown';
    
    console.log(`OpenAI response: ${responseLength} characters`);
    console.log(`Tokens: ${tokensUsed} total, ${outputTokens} output (limit: ${maxTokens})`);
    
    // Enhanced truncation detection
    const truncationRisk = detectTruncationRisk(response, maxTokens);
    if (truncationRisk.isLikelyTruncated) {
      console.log('⚠️  WARNING: Response appears truncated:', truncationRisk.reason);
      console.log('💡 Consider: Breaking into smaller requests or using higher token limit model');
    }
    
    return response.data;
  } catch (error) {
    console.error('Error calling OpenAI API:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      throw new Error('OpenAI API key is invalid. Please check your configuration.');
    } else if (error.response?.status === 429) {
      throw new Error('OpenAI API rate limit exceeded. Please try again later.');
    } else if (error.response?.status === 500) {
      throw new Error('OpenAI service error. Please try again.');
    }
    throw new Error(`OpenAI API error: ${error.message}`);
  }
}

/**
 * Get appropriate max tokens based on model capabilities
 */
function getMaxTokensForModel(model) {
  // Based on actual OpenAI model limits as of 2024
  const modelLimits = {
    'gpt-4o': 16384,           // Max output for GPT-4o
    'gpt-4o-mini': 16384,      // Max output for GPT-4o-mini  
    'gpt-4-turbo': 4096,       // Max output for GPT-4 Turbo
    'gpt-4': 4096,             // Max output for GPT-4
    'gpt-3.5-turbo': 4096,     // Max output for GPT-3.5 Turbo
    'gpt-3.5-turbo-16k': 4096  // Max output (not context)
  };
  
  // Check for exact match first
  if (modelLimits[model]) {
    return modelLimits[model];
  }
  
  // Check for partial matches (handles versioned models like gpt-4o-2024-08-06)
  for (const [modelName, limit] of Object.entries(modelLimits)) {
    if (model.startsWith(modelName)) {
      console.log(`Using ${limit} tokens for model ${model} (matched ${modelName})`);
      return limit;
    }
  }
  
  // Default fallback
  console.log(`Unknown model ${model}, using conservative 4096 token limit`);
  return 4096;
}

/**
 * Detect if response was likely truncated
 */
function detectTruncationRisk(response, maxTokens) {
  const content = response.choices[0].message.content;
  const usage = response.data?.usage || {};
  const outputTokens = usage.completion_tokens || 0;
  
  // Check if we hit the token limit
  if (outputTokens >= maxTokens * 0.95) {
    return {
      isLikelyTruncated: true,
      reason: `Used ${outputTokens}/${maxTokens} output tokens (${Math.round(outputTokens/maxTokens*100)}%)`
    };
  }
  
  // Check for incomplete JSON
  const openBraces = (content.match(/\{/g) || []).length;
  const closeBraces = (content.match(/\}/g) || []).length;
  if (openBraces > closeBraces) {
    return {
      isLikelyTruncated: true,
      reason: `Unbalanced JSON braces: ${openBraces} open, ${closeBraces} closed`
    };
  }
  
  // Check for incomplete final sections
  const hasRecommendations = content.includes('"recommendations"');
  const hasCompleteRecommendations = content.includes('"salesStrategy"') && content.includes('"implementationApproach"');
  
  if (hasRecommendations && !hasCompleteRecommendations) {
    return {
      isLikelyTruncated: true,
      reason: 'Recommendations section appears incomplete'
    };
  }
  
  // Check for abrupt ending
  const lastChar = content.trim().slice(-1);
  if (lastChar !== '}' && lastChar !== ']' && lastChar !== '"') {
    return {
      isLikelyTruncated: true,
      reason: `Response ends abruptly with character: "${lastChar}"`
    };
  }
  
  return {
    isLikelyTruncated: false,
    reason: 'Response appears complete'
  };
}

/**
 * ROBUST OpenAI response processing with multiple JSON extraction strategies
 */
function processOpenAIResponseRobustly(response) {
  try {
    const content = response.choices[0].message.content;
    console.log('Raw OpenAI response length:', content.length);
    
    // Strategy 1: Try direct parsing (works if response is clean)
    let jsonContent = content.trim();
    
    // Strategy 2: Remove markdown code blocks if present
    const codeBlockMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (codeBlockMatch) {
      jsonContent = codeBlockMatch[1].trim();
      console.log('Found JSON in code blocks');
    }
    
    // Strategy 3: Extract JSON object from text
    const jsonMatch = jsonContent.match(/(\{[\s\S]*\})/);
    if (jsonMatch) {
      jsonContent = jsonMatch[1];
      console.log('Extracted JSON object from response');
    }
    
    // Strategy 4: Try to parse and repair if needed
    let analysisResults;
    try {
      analysisResults = JSON.parse(jsonContent);
      console.log('✅ JSON parsed successfully');
    } catch (parseError) {
      console.log('❌ Initial JSON parse failed, attempting repair...');
      console.log('Parse error:', parseError.message);
      console.log('JSON tail (last 200 chars):', jsonContent.substring(jsonContent.length - 200));
      
      // Try to repair truncated JSON
      analysisResults = repairTruncatedJSON(jsonContent, parseError);
    }
    
    // VALIDATE AND CLEAN THE RESPONSE
    const cleanedResults = validateAndCleanResponse(analysisResults);
    
    // Log the actual OpenAI results for debugging
    console.log('=== CLEANED OPENAI ANALYSIS RESULTS ===');
    console.log('Customer:', cleanedResults.customerName);
    console.log('Industry:', cleanedResults.industry);
    console.log('Fit Score from OpenAI:', cleanedResults.fitScore);
    console.log('Strengths Count:', cleanedResults.strengths?.length || 0);
    console.log('Challenges Count:', cleanedResults.challenges?.length || 0);
    
    return {
      ...cleanedResults,
      date: new Date().toISOString()
    };
    
  } catch (e) {
    console.error('Error parsing OpenAI response:', e);
    console.error('Response content preview:', response.choices[0].message.content.substring(0, 500));
    
    // Last resort: create a basic response with extracted info
    return createFallbackResponse(response.choices[0].message.content);
  }
}

/**
 * Enhanced JSON repair with better truncation handling
 */
function repairTruncatedJSON(jsonContent, parseError) {
  try {
    console.log('Attempting JSON repair...');
    let repairedJSON = jsonContent;
    
    // Strategy 1: Find the last complete section and ensure it's properly closed
    const criticalSections = [
      '"recommendations"',
      '"similarCustomers"', 
      '"challenges"',
      '"strengths"',
      '"requirements"'
    ];
    
    let lastCompleteSection = -1;
    let lastSectionName = '';
    
    for (const section of criticalSections) {
      const sectionIndex = repairedJSON.lastIndexOf(section);
      if (sectionIndex > lastCompleteSection) {
        lastCompleteSection = sectionIndex;
        lastSectionName = section;
      }
    }
    
    if (lastCompleteSection > 0) {
      console.log(`Last complete section found: ${lastSectionName} at position ${lastCompleteSection}`);
      
      // Try to find a good truncation point after this section
      const afterSection = repairedJSON.substring(lastCompleteSection);
      const nextComma = afterSection.indexOf(',');
      const nextBrace = afterSection.indexOf('}');
      
      if (nextComma > 0 && (nextBrace < 0 || nextComma < nextBrace)) {
        // Truncate at the comma after the last complete section
        const truncateAt = lastCompleteSection + nextComma;
        repairedJSON = repairedJSON.substring(0, truncateAt);
        console.log(`Truncated at comma after ${lastSectionName}`);
      }
    }
    
    // Strategy 2: Balance braces and brackets with priority order
    const openBraces = (repairedJSON.match(/\{/g) || []).length;
    const closedBraces = (repairedJSON.match(/\}/g) || []).length;
    const openBrackets = (repairedJSON.match(/\[/g) || []).length;
    const closedBrackets = (repairedJSON.match(/\]/g) || []).length;
    
    console.log(`Brace balance: ${openBraces} open, ${closedBraces} closed`);
    console.log(`Bracket balance: ${openBrackets} open, ${closedBrackets} closed`);
    
    // Add missing closing brackets first, then braces
    const missingBrackets = openBrackets - closedBrackets;
    const missingBraces = openBraces - closedBraces;
    
    if (missingBrackets > 0) {
      repairedJSON += ']'.repeat(missingBrackets);
      console.log(`Added ${missingBrackets} closing brackets`);
    }
    
    if (missingBraces > 0) {
      repairedJSON += '}'.repeat(missingBraces);
      console.log(`Added ${missingBraces} closing braces`);
    }
    
    // Try parsing the repaired JSON
    const repairedResult = JSON.parse(repairedJSON);
    console.log('✅ JSON repair successful!');
    
    // Mark as truncated for downstream handling
    repairedResult._wasTruncated = true;
    repairedResult._truncationPoint = lastSectionName;
    
    return repairedResult;
    
  } catch (repairError) {
    console.log('❌ JSON repair failed:', repairError.message);
    throw repairError;
  }
}

/**
 * Create a fallback response when JSON parsing completely fails
 */
function createFallbackResponse(content) {
  console.log('Creating fallback response from partial content...');
  
  // Try to extract basic info with regex
  const customerNameMatch = content.match(/"customerName":\s*"([^"]+)"/);
  const industryMatch = content.match(/"industry":\s*"([^"]+)"/);
  const fitScoreMatch = content.match(/"fitScore":\s*(\d+)/);
  const totalUsersMatch = content.match(/"total":\s*(\d+)/);
  const fieldUsersMatch = content.match(/"field":\s*(\d+)/);
  const backOfficeMatch = content.match(/"backOffice":\s*(\d+)/);
  
  return {
    customerName: customerNameMatch ? customerNameMatch[1] : 'Unknown Customer',
    industry: industryMatch ? industryMatch[1] : 'Not specified',
    fitScore: fitScoreMatch ? parseInt(fitScoreMatch[1]) : 50,
    userCount: { 
      total: totalUsersMatch ? parseInt(totalUsersMatch[1]) : 0,
      backOffice: backOfficeMatch ? parseInt(backOfficeMatch[1]) : 0,
      field: fieldUsersMatch ? parseInt(fieldUsersMatch[1]) : 0
    },
    summary: { 
      overview: 'Analysis completed with partial data due to JSON parsing issues.',
      keyRequirements: [],
      mainPainPoints: []
    },
    currentState: {
      summary: 'Current state information was partially retrieved due to parsing issues.',
      currentSystems: []
    },
    services: { types: [], details: '' },
    requirements: { keyFeatures: [], integrations: [] },
    timeline: { desiredGoLive: '', urgency: 'Medium' },
    budget: { mentioned: false, range: '', constraints: [] },
    strengths: [],
    challenges: [],
    recommendations: {
      fitScoreRationale: {
        summary: 'Analysis completed with limited data due to parsing issues.',
        positiveFactors: [],
        negativeFactors: [],
        overallAssessment: 'Recommend manual review due to parsing issues.'
      },
      salesStrategy: {
        recommendation: 'CONDITIONAL',
        approach: 'Manual review required due to parsing issues',
        reasoning: 'OpenAI response was truncated, recommend re-running analysis',
        talkingPoints: ['Request additional information', 'Schedule follow-up call'],
        risks: ['Incomplete analysis'],
        nextSteps: ['Re-run analysis with shorter transcript', 'Manual review of response']
      },
      implementationApproach: {
        strategy: 'Detailed implementation plan requires complete analysis',
        phases: []
      },
      pricingGuidance: {
        recommendedTier: 'Professional',
        specialConsiderations: 'Review pricing after complete analysis',
        justification: 'Unable to determine optimal pricing due to incomplete data'
      }
    },
    similarCustomers: [],
    date: new Date().toISOString(),
    parseWarning: 'This analysis was created from a partially parsed OpenAI response. Consider re-running the analysis with a shorter transcript or in multiple parts.',
    _wasTruncated: true
  };
}

/**
 * Validate and clean the OpenAI response to prevent formatting issues
 */
function validateAndCleanResponse(results) {
  // Clean currentState to prevent JSON leakage in UI
  if (results.currentState) {
    // If currentState.summary contains JSON-like content, extract meaningful text
    if (results.currentState.summary && results.currentState.summary.includes('{')) {
      // Extract readable information from the currentState
      const systems = results.currentState.currentSystems || [];
      let cleanSummary = '';
      
      if (systems.length > 0) {
        const system = systems[0];
        cleanSummary = `Currently using ${system.name}. `;
        if (system.painPoints && system.painPoints.length > 0) {
          cleanSummary += `Main issues: ${system.painPoints.join(', ')}.`;
        }
      }
      
      if (results.currentState.currentProcesses) {
        cleanSummary += ` ${results.currentState.currentProcesses}`;
      }
      
      results.currentState.summary = cleanSummary || 'Current systems and processes need improvement.';
    }
  }
  
  // Ensure summary.overview doesn't contain JSON
  if (results.summary && results.summary.overview) {
    if (results.summary.overview.includes('{') || results.summary.overview.includes('```')) {
      // Rebuild overview from other data
      const company = results.customerName || 'Company';
      const industry = results.industry || 'business';
      const totalUsers = results.userCount?.total || 0;
      const fieldUsers = results.userCount?.field || 0;
      
      results.summary.overview = `${company} is a ${industry} company with ${totalUsers} employees` + 
        (fieldUsers > 0 ? `, including ${fieldUsers} field workers,` : '') + 
        ' seeking field service management software to improve operations and efficiency.';
    }
  }
  
  // Ensure arrays exist and are properly formatted
  if (!Array.isArray(results.strengths)) {
    results.strengths = [];
  }
  
  if (!Array.isArray(results.challenges)) {
    results.challenges = [];
  }
  
  // Clean any JSON-like strings in text fields
  const cleanTextField = (text) => {
    if (typeof text === 'string') {
      // Remove JSON-like content but preserve meaningful text
      return text.replace(/\{[^}]*\}/g, '').replace(/```[^`]*```/g, '').trim();
    }
    return text;
  };
  
  // Apply cleaning to specific problematic fields
  if (results.summary) {
    Object.keys(results.summary).forEach(key => {
      if (typeof results.summary[key] === 'string') {
        results.summary[key] = cleanTextField(results.summary[key]);
      }
    });
  }
  
  return results;
}

/**
 * Apply comprehensive criteria adjustments with DYNAMIC criteria and enhanced logging
 */
function applyComprehensiveCriteriaAdjustments(result, criteria) {
  let adjustedScore = result.fitScore || 50;
  
  const scoreBreakdown = {
    baseScore: adjustedScore,
    industryAdjustment: 0,
    fieldWorkerBonus: 0,
    requirementsAlignment: 0,
    complexityPenalty: 0,
    sizeAdjustment: 0,
    finalScore: 0,
    category: '',
    rationale: [],
    industryAnalysis: {} // Enhanced industry analysis
  };
  
  const industryLower = (result.industry || '').toLowerCase().trim();
  
  // Enhanced industry analysis
  const industryAnalysis = analyzeIndustryFit(industryLower, criteria.industries);
  scoreBreakdown.industryAnalysis = industryAnalysis;
  
  // Apply industry scoring with detailed logging
  if (industryAnalysis.isBlacklisted) {
    adjustedScore = Math.min(adjustedScore, 25);
    scoreBreakdown.industryAdjustment = adjustedScore - result.fitScore;
    scoreBreakdown.category = 'blacklisted';
    scoreBreakdown.rationale.push(`${result.industry} is in the configured blacklist - fundamental misalignment`);
  } else if (industryAnalysis.isPreferred) {
    adjustedScore += 10;
    scoreBreakdown.industryAdjustment = 10;
    scoreBreakdown.category = 'preferred';
    scoreBreakdown.rationale.push(`${result.industry} matches configured preferred industry: ${industryAnalysis.matchedPreference}`);
  } else {
    adjustedScore -= 5;
    scoreBreakdown.industryAdjustment = -5;
    scoreBreakdown.category = 'neutral';
    scoreBreakdown.rationale.push(`${result.industry} is not in configured preferred industries - neutral fit with penalty`);
  }
  
  // Field worker ratio bonus/penalty
  const totalUsers = result.userCount?.total || 0;
  const fieldUsers = result.userCount?.field || 0;
  const fieldRatio = totalUsers > 0 ? fieldUsers / totalUsers : 0;
  
  if (fieldRatio >= 0.7) {
    adjustedScore += 10;
    scoreBreakdown.fieldWorkerBonus += 10;
    scoreBreakdown.rationale.push(`Excellent field worker ratio (${Math.round(fieldRatio * 100)}%)`);
  } else if (fieldRatio >= 0.5) {
    adjustedScore += 5;
    scoreBreakdown.fieldWorkerBonus += 5;
    scoreBreakdown.rationale.push(`Good field worker ratio (${Math.round(fieldRatio * 100)}%)`);
  } else if (fieldRatio < 0.3 && totalUsers > 0) {
    adjustedScore -= 15;
    scoreBreakdown.fieldWorkerBonus -= 15;
    scoreBreakdown.rationale.push(`Low field worker ratio (${Math.round(fieldRatio * 100)}%) - poor fit for field service software`);
  }
  
  // REQUIREMENTS COMPATIBILITY CHECK using DYNAMIC criteria
  const customerRequirements = result.requirements?.keyFeatures || [];
  const platformStrengths = criteria.requirements.strengths || [];
  const platformLimitations = criteria.requirements.weaknesses || [];
  const unsupportedFeatures = criteria.requirements.unsupported || [];
  
  // Check for unsupported requirements (major penalty)
  const unsupportedMatches = customerRequirements.filter(req =>
    unsupportedFeatures.some(unsupported =>
      req.toLowerCase().includes(unsupported.toLowerCase()) ||
      unsupported.toLowerCase().includes(req.toLowerCase())
    )
  );
  
  if (unsupportedMatches.length > 0) {
    adjustedScore -= 20;
    scoreBreakdown.complexityPenalty -= 20;
    scoreBreakdown.rationale.push(`Customer requires unsupported features: ${unsupportedMatches.join(', ')}`);
  }
  
  // Check for platform limitations (moderate penalty)
  const limitationMatches = customerRequirements.filter(req =>
    platformLimitations.some(limitation =>
      req.toLowerCase().includes(limitation.toLowerCase()) ||
      limitation.toLowerCase().includes(req.toLowerCase())
    )
  );
  
  if (limitationMatches.length > 0) {
    adjustedScore -= 10;
    scoreBreakdown.complexityPenalty -= 10;
    scoreBreakdown.rationale.push(`Customer needs areas where platform has limitations: ${limitationMatches.join(', ')}`);
  }
  
  // Check for platform strengths alignment (bonus)
  const strengthMatches = customerRequirements.filter(req =>
    platformStrengths.some(strength =>
      req.toLowerCase().includes(strength.toLowerCase()) ||
      strength.toLowerCase().includes(req.toLowerCase())
    )
  );
  
  if (strengthMatches.length > 0) {
    const bonus = Math.min(strengthMatches.length * 3, 10);
    adjustedScore += bonus;
    scoreBreakdown.requirementsAlignment += bonus;
    scoreBreakdown.rationale.push(`Customer requirements align with platform strengths: ${strengthMatches.join(', ')}`);
  }
  
  // Size adjustment
  if (totalUsers >= 50 && totalUsers <= 200) {
    adjustedScore += 3;
    scoreBreakdown.sizeAdjustment = 3;
    scoreBreakdown.rationale.push(`Good company size (${totalUsers} users)`);
  } else if (totalUsers > 500) {
    adjustedScore -= 8;
    scoreBreakdown.sizeAdjustment = -8;
    scoreBreakdown.rationale.push(`Large organization (${totalUsers} users) - may need enterprise approach`);
  }
  
  // Integration complexity penalty
  const integrationCount = result.requirements?.integrations?.length || 0;
  if (integrationCount > 5) {
    adjustedScore -= 15;
    scoreBreakdown.complexityPenalty -= 15;
    scoreBreakdown.rationale.push(`High integration complexity (${integrationCount} systems)`);
  } else if (integrationCount > 3) {
    adjustedScore -= 8;
    scoreBreakdown.complexityPenalty -= 8;
    scoreBreakdown.rationale.push(`Moderate integration complexity (${integrationCount} systems)`);
  }
  
  // Ensure score stays within bounds
  scoreBreakdown.finalScore = Math.max(0, Math.min(100, Math.round(adjustedScore)));
  
  console.log('Enhanced score breakdown:', {
    ...scoreBreakdown,
    industryDetails: industryAnalysis
  });
  
  // Update result
  result.fitScore = scoreBreakdown.finalScore;
  result.scoreBreakdown = scoreBreakdown;
  
  return result;
}

/**
 * Detailed industry fit analysis
 */
function analyzeIndustryFit(industryLower, industryConfig) {
  const whitelist = industryConfig.whitelist || [];
  const blacklist = industryConfig.blacklist || [];
  
  // Check blacklist first (exact and partial matches)
  for (const blacklisted of blacklist) {
    const blackLower = blacklisted.toLowerCase().trim();
    if (industryLower.includes(blackLower) || blackLower.includes(industryLower)) {
      return {
        isBlacklisted: true,
        isPreferred: false,
        matchedBlacklist: blacklisted,
        confidence: 'high'
      };
    }
  }
  
  // Check whitelist (exact, partial, and word-based matching)
  for (const preferred of whitelist) {
    const prefLower = preferred.toLowerCase().trim();
    
    // Exact match
    if (industryLower === prefLower) {
      return {
        isBlacklisted: false,
        isPreferred: true,
        matchedPreference: preferred,
        confidence: 'exact'
      };
    }
    
    // Partial match
    if (industryLower.includes(prefLower) || prefLower.includes(industryLower)) {
      return {
        isBlacklisted: false,
        isPreferred: true,
        matchedPreference: preferred,
        confidence: 'partial'
      };
    }
    
    // Word-based matching
    const indWords = industryLower.split(/[\s\-,&]+/).filter(w => w.length > 2);
    const prefWords = prefLower.split(/[\s\-,&]+/).filter(w => w.length > 2);
    
    const hasWordMatch = indWords.some(iw => prefWords.some(pw => 
      iw.includes(pw) || pw.includes(iw) ||
      (iw.length > 3 && pw.length > 3 && iw.substring(0, 3) === pw.substring(0, 3))
    ));
    
    if (hasWordMatch) {
      return {
        isBlacklisted: false,
        isPreferred: true,
        matchedPreference: preferred,
        confidence: 'word-based'
      };
    }
  }
  
  // Not in either list
  return {
    isBlacklisted: false,
    isPreferred: false,
    confidence: 'neutral'
  };
}

/**
 * NEW: Enforce score-based recommendations and override OpenAI when needed
 */
function enforceScoreBasedRecommendations(result, criteria) {
  const fitScore = result.fitScore || 50;
  const scoreBreakdown = result.scoreBreakdown || {};
  
  // Determine correct recommendation based on score
  const correctRecommendation = determineRecommendationFromScore(fitScore, scoreBreakdown, result.industry);
  
  // Update the sales strategy with score-aligned recommendation
  if (!result.recommendations) result.recommendations = {};
  if (!result.recommendations.salesStrategy) result.recommendations.salesStrategy = {};
  
  const currentRecommendation = result.recommendations.salesStrategy.recommendation;
  
  // If OpenAI's recommendation doesn't match score-based logic, override it
  if (currentRecommendation !== correctRecommendation.decision) {
    console.log(`⚠️  OpenAI recommended ${currentRecommendation} but score-based logic suggests ${correctRecommendation.decision}. Overriding.`);
    
    result.recommendations.salesStrategy = {
      ...result.recommendations.salesStrategy,
      recommendation: correctRecommendation.decision,
      approach: correctRecommendation.approach,
      reasoning: correctRecommendation.reasoning,
      scoreBasedOverride: true,
      originalAIRecommendation: currentRecommendation,
      industryConsiderations: correctRecommendation.industryConsiderations
    };
    
    // Add score-based context to fit rationale
    if (!result.recommendations.fitScoreRationale) {
      result.recommendations.fitScoreRationale = {};
    }
    
    if (!result.recommendations.fitScoreRationale.summary) {
      result.recommendations.fitScoreRationale.summary = correctRecommendation.rationale;
    } else {
      result.recommendations.fitScoreRationale.summary += ` ${correctRecommendation.rationale}`;
    }
    
    // Ensure industry status is mentioned in negative factors if needed
    if (scoreBreakdown.category === 'neutral' || scoreBreakdown.category === 'blacklisted') {
      if (!result.recommendations.fitScoreRationale.negativeFactors) {
        result.recommendations.fitScoreRationale.negativeFactors = [];
      }
      
      if (scoreBreakdown.category === 'blacklisted') {
        result.recommendations.fitScoreRationale.negativeFactors.unshift(`${result.industry} industry is in configured blacklist`);
      } else if (scoreBreakdown.category === 'neutral') {
        result.recommendations.fitScoreRationale.negativeFactors.unshift(`${result.industry} industry not in configured preferred list`);
      }
    }
  } else {
    console.log(`✅ OpenAI recommendation ${currentRecommendation} aligns with score-based logic.`);
  }
  
  return result;
}

/**
 * Determine recommendation based on fit score, breakdown, and industry
 */
function determineRecommendationFromScore(fitScore, scoreBreakdown, industry) {
  const category = scoreBreakdown.category || 'neutral';
  
  // BLACKLISTED INDUSTRIES - Always decline
  if (category === 'blacklisted' || fitScore < 30) {
    return {
      decision: 'DECLINE',
      approach: 'Politely decline and suggest alternative solutions or partners',
      reasoning: fitScore < 30 
        ? `Very low fit score (${fitScore}%) indicates fundamental misalignment with platform capabilities`
        : `${industry} industry is in configured blacklist - poor strategic fit`,
      rationale: `Score-based analysis: ${fitScore}% fit indicates high risk of implementation failure and customer dissatisfaction.`,
      industryConsiderations: category === 'blacklisted' 
        ? `${industry} is specifically blacklisted as incompatible with the platform`
        : 'Very low fit score overrides other considerations'
    };
  }
  
  // FAIR FIT - Conditional pursuit
  if (fitScore >= 30 && fitScore < 60) {
    const hasHighFieldRatio = scoreBreakdown.fieldWorkerBonus > 0;
    const hasComplexIntegrations = scoreBreakdown.complexityPenalty < -10;
    const isNeutralIndustry = category === 'neutral';
    
    return {
      decision: 'CONDITIONAL',
      approach: hasComplexIntegrations 
        ? 'Pursue with detailed technical qualification and extended POC period'
        : 'Pursue with careful expectation setting and risk mitigation plan',
      reasoning: `Moderate fit score (${fitScore}%) requires additional qualification. ${
        isNeutralIndustry ? `${industry} industry not in preferred list adds risk. ` : ''
      }${hasComplexIntegrations ? 'Complex integration requirements add risk. ' : ''}${
        hasHighFieldRatio ? 'Strong field worker ratio is positive.' : 'Field worker ratio may limit value.'
      }`,
      rationale: `Score breakdown indicates moderate fit with specific risk factors that require careful management.`,
      industryConsiderations: isNeutralIndustry 
        ? `${industry} is not in the configured preferred industries, requiring extra diligence`
        : 'Industry status is acceptable but other factors require attention'
    };
  }
  
  // GOOD FIT - Pursue
  if (fitScore >= 60 && fitScore < 80) {
    const isNeutralIndustry = category === 'neutral';
    
    return {
      decision: 'PURSUE',
      approach: 'Standard sales process with emphasis on demonstrated strengths',
      reasoning: `Good fit score (${fitScore}%) indicates strong alignment. ${
        category === 'preferred' ? `${industry} industry is in preferred list. ` : 
        isNeutralIndustry ? `${industry} industry not in preferred list but other factors compensate. ` : ''
      }Focus on areas of strength while addressing any identified challenges.`,
      rationale: `Score indicates good platform alignment with manageable implementation complexity.`,
      industryConsiderations: category === 'preferred' 
        ? `${industry} is a preferred industry - excellent strategic fit`
        : isNeutralIndustry 
          ? `${industry} is not preferred but strong fundamentals overcome industry concerns`
          : 'Strong fundamentals support pursuit despite industry considerations'
    };
  }
  
  // EXCELLENT FIT - Strongly pursue
  if (fitScore >= 80) {
    return {
      decision: 'PURSUE',
      approach: 'Accelerated sales process - ideal customer profile',
      reasoning: `Excellent fit score (${fitScore}%) indicates exceptional alignment. ${
        category === 'preferred' ? `Perfect ${industry} industry match. ` : ''
      }High probability of successful implementation and strong ROI.`,
      rationale: `Score indicates exceptional platform alignment - ideal customer profile.`,
      industryConsiderations: category === 'preferred'
        ? `${industry} is a preferred industry - perfect strategic alignment`
        : 'Exceptional fundamentals transcend industry considerations'
    };
  }
  
  // Default fallback
  return {
    decision: 'CONDITIONAL',
    approach: 'Standard qualification process required',
    reasoning: `Fit score (${fitScore}%) requires standard sales qualification to assess viability`,
    rationale: 'Standard qualification process recommended based on mixed scoring factors.',
    industryConsiderations: 'Industry assessment requires further evaluation'
  };
}

/**
 * Enhanced similar customers with proper industry prioritization and sectioning
 */
function enrichWithSimilarCustomers(result, historicalData) {
  console.log(`Finding similar customers for ${result.customerName} (${result.industry})`);
  console.log(`Customer profile: ${result.userCount?.total} users (${result.userCount?.field} field, ${result.userCount?.backOffice} office)`);
  
  // Calculate match scores for all historical customers
  const scoredCustomers = historicalData
    .filter(h => h.customerName && h.customerName !== result.customerName)
    .map(h => {
      const scores = calculateDetailedMatchScore(result, h);
      return {
        historical: h,
        ...scores,
        totalScore: scores.industryScore + scores.sizeScore + scores.fieldRatioScore + scores.serviceScore
      };
    })
    .filter(item => item.totalScore > 20);

  console.log(`Found ${scoredCustomers.length} potential matches with score > 20`);
  
  // Group customers by match type priority - INDUSTRY FIRST
  const categorizedMatches = {
    industryMatches: scoredCustomers.filter(item => item.industryScore >= 25),
    sizeMatches: scoredCustomers.filter(item => item.industryScore < 25 && item.sizeScore >= 20),
    complexityMatches: scoredCustomers.filter(item => item.industryScore < 25 && item.sizeScore < 20 && (item.fieldRatioScore >= 15 || item.serviceScore >= 8))
  };

  // Sort each category by total score
  categorizedMatches.industryMatches.sort((a, b) => b.totalScore - a.totalScore);
  categorizedMatches.sizeMatches.sort((a, b) => b.totalScore - a.totalScore);
  categorizedMatches.complexityMatches.sort((a, b) => b.totalScore - a.totalScore);

  // Build structured similar customers response with sections
  const similarCustomersSections = [];
  
  // Add industry matches first (up to 3)
  if (categorizedMatches.industryMatches.length > 0) {
    similarCustomersSections.push({
      sectionTitle: 'Industry Match',
      sectionDescription: `Customers in similar or related industries (${result.industry})`,
      customers: categorizedMatches.industryMatches.slice(0, 3).map(item => formatSimilarCustomer(item))
    });
  }

  // Add size matches (up to 2)  
  if (categorizedMatches.sizeMatches.length > 0) {
    similarCustomersSections.push({
      sectionTitle: 'Size Match',
      sectionDescription: `Companies with similar size (~${result.userCount?.total || 0} users)`,
      customers: categorizedMatches.sizeMatches.slice(0, 2).map(item => formatSimilarCustomer(item))
    });
  }

  // Add complexity matches (up to 2)
  if (categorizedMatches.complexityMatches.length > 0) {
    similarCustomersSections.push({
      sectionTitle: 'Complexity Match', 
      sectionDescription: 'Companies with similar operational complexity and field operations',
      customers: categorizedMatches.complexityMatches.slice(0, 2).map(item => formatSimilarCustomer(item))
    });
  }

  result.similarCustomers = similarCustomersSections;
  
  // If no similar customers found, add a message
  if (similarCustomersSections.length === 0) {
    console.log('No similar customers found in historical data');
    result.similarCustomersMessage = 'No closely matching customers found in historical data. This may be a unique use case.';
  }
  
  return result;
}

/**
 * Calculate detailed match scores with breakdown
 */
function calculateDetailedMatchScore(customer, historical) {
  let industryScore = 0;
  let sizeScore = 0;
  let fieldRatioScore = 0;
  let serviceScore = 0;
  
  const custInd = (customer.industry || '').toLowerCase().trim();
  const histInd = (historical.industry || '').toLowerCase().trim();
  
  // Industry scoring (40 points max)
  if (custInd && histInd) {
    if (custInd === histInd) {
      industryScore = 40;
    } else {
      // Word-based similarity for related industries
      const custWords = custInd.split(/[\s,\/\-&]+/).filter(w => w.length > 2);
      const histWords = histInd.split(/[\s,\/\-&]+/).filter(w => w.length > 2);
      
      const commonWords = new Set();
      for (const cw of custWords) {
        for (const hw of histWords) {
          if (cw === hw || (cw.length >= 4 && hw.length >= 4 && (cw.includes(hw) || hw.includes(cw)))) {
            commonWords.add(cw);
          }
        }
      }
      
      if (commonWords.size > 0) {
        const allWords = new Set([...custWords, ...histWords]);
        industryScore = Math.round((commonWords.size / allWords.size) * 35);
      }
    }
  }
  
  // Size scoring (30 points max)
  const custTotal = customer.userCount?.total || 0;
  const histTotal = historical.userCount?.total || 0;
  
  if (custTotal > 0 && histTotal > 0) {
    const ratio = Math.min(custTotal, histTotal) / Math.max(custTotal, histTotal);
    if (ratio > 0.8) sizeScore = 30;
    else if (ratio > 0.6) sizeScore = 20;
    else if (ratio > 0.4) sizeScore = 10;
  }
  
  // Field ratio scoring (20 points max)
  const custFieldRatio = (customer.userCount?.field || 0) / (customer.userCount?.total || 1);
  const histFieldRatio = (historical.userCount?.field || 0) / (historical.userCount?.total || 1);
  
  if (custFieldRatio > 0.5 && histFieldRatio > 0.5) {
    const ratioDiff = Math.abs(custFieldRatio - histFieldRatio);
    if (ratioDiff < 0.15) fieldRatioScore = 20;
    else if (ratioDiff < 0.30) fieldRatioScore = 15;
    else fieldRatioScore = 10;
  }
  
  // Service scoring (10 points max)
  const custServices = customer.services?.types || [];
  const histServices = historical.services || [];
  
  if (custServices.length > 0 && histServices.length > 0) {
    // Simple service overlap check
    const matches = custServices.filter(cs => 
      histServices.some(hs => {
        const hsName = typeof hs === 'string' ? hs : hs.name || '';
        return hsName.toLowerCase().includes(cs.toLowerCase()) || 
               cs.toLowerCase().includes(hsName.toLowerCase());
      })
    );
    serviceScore = Math.min(matches.length * 3, 10);
  }
  
  return {
    industryScore,
    sizeScore, 
    fieldRatioScore,
    serviceScore
  };
}

/**
 * Format similar customer for display
 */
function formatSimilarCustomer(scoredItem) {
  const item = scoredItem.historical;
  
  return {
    name: item.customerName || 'Historical Customer',
    industry: item.industry || 'Not specified',
    matchPercentage: Math.round(scoredItem.totalScore),
    matchReasons: generateMatchReasons(scoredItem),
    implementation: {
      duration: item.businessMetrics?.daysToOnboard 
        ? `${item.businessMetrics.daysToOnboard} days` 
        : 'Not available',
      health: item.businessMetrics?.health || 'Not available',
      arr: item.businessMetrics?.arr 
        ? `$${item.businessMetrics.arr.toLocaleString()}` 
        : 'Not available'
    },
    keyLearnings: generateKeyLearnings(item)
  };
}

/**
 * Generate match reasons based on scores
 */
function generateMatchReasons(scoredItem) {
  const reasons = [];
  const item = scoredItem.historical;
  
  if (scoredItem.industryScore >= 25) {
    reasons.push(`Industry match: ${item.industry}`);
  }
  
  if (scoredItem.sizeScore >= 20) {
    reasons.push(`Similar size: ${item.userCount?.total || 0} users`);
  }
  
  if (scoredItem.fieldRatioScore >= 15) {
    const fieldRatio = Math.round(((item.userCount?.field || 0) / (item.userCount?.total || 1)) * 100);
    reasons.push(`Field-focused: ${fieldRatio}% field workers`);
  }
  
  if (scoredItem.serviceScore >= 8) {
    reasons.push('Similar service offerings');
  }
  
  return reasons.length > 0 ? reasons : ['General business profile similarity'];
}

/**
 * Generate key learnings from historical customer
 */
function generateKeyLearnings(historical) {
  const learnings = [];
  
  // Health-based learnings
  if (historical.businessMetrics?.health === 'Excellent') {
    learnings.push('Achieved excellent outcomes');
  } else if (historical.businessMetrics?.health === 'Good') {
    learnings.push('Successful implementation');
  } else if (historical.businessMetrics?.health === 'Poor') {
    learnings.push('Faced implementation challenges');
  }
  
  // Timeline-based learnings
  if (historical.businessMetrics?.daysToOnboard) {
    if (historical.businessMetrics.daysToOnboard < 60) {
      learnings.push(`Quick deployment: ${historical.businessMetrics.daysToOnboard} days`);
    } else if (historical.businessMetrics.daysToOnboard > 120) {
      learnings.push(`Extended timeline: ${historical.businessMetrics.daysToOnboard} days`);
    }
  }
  
  // Feature adoption
  if (historical.requirements?.checklists?.needed) {
    learnings.push('Heavy checklist usage');
  }
  if (historical.requirements?.integrations?.length > 2) {
    learnings.push('Multiple integrations required');
  }
  
  // Business model based on field ratio instead of industry
  const fieldRatio = (historical.userCount?.field || 0) / (historical.userCount?.total || 1);
  if (fieldRatio > 0.7) {
    learnings.push('Field-heavy operation');
  } else if (fieldRatio < 0.3) {
    learnings.push('Office-based operation');
  } else if (fieldRatio > 0) {
    learnings.push('Mixed field/office model');
  }
  
  return learnings.length > 0 ? learnings : ['Standard customer profile'];
}

/**
 * Minimal structure validation - preserve all data from OpenAI
 */
function validateMinimalStructure(result) {
  // Only ensure required fields exist, don't overwrite with defaults
  if (!result.customerName) result.customerName = 'Unknown Customer';
  if (!result.industry) result.industry = 'Not specified';
  if (!result.userCount) result.userCount = { total: 0, backOffice: 0, field: 0 };
  if (!result.fitScore && result.fitScore !== 0) result.fitScore = 50;
  
  // Ensure arrays exist but don't add default content
  if (!Array.isArray(result.strengths)) result.strengths = [];
  if (!Array.isArray(result.challenges)) result.challenges = [];
  if (!Array.isArray(result.similarCustomers)) result.similarCustomers = [];
  
  // Ensure objects exist but don't add default content
  if (!result.summary) result.summary = {};
  if (!result.requirements) result.requirements = {};
  if (!result.currentState) result.currentState = {};
  if (!result.services) result.services = {};
  if (!result.timeline) result.timeline = {};
  if (!result.budget) result.budget = {};
  
  // IMPORTANT: Preserve recommendations structure
  if (!result.recommendations) {
    result.recommendations = {};
  }
  
  // Ensure recommendations sub-objects exist
  if (!result.recommendations.fitScoreRationale) {
    result.recommendations.fitScoreRationale = {};
  }
  if (!result.recommendations.salesStrategy) {
    result.recommendations.salesStrategy = {};
  }
  if (!result.recommendations.implementationApproach) {
    result.recommendations.implementationApproach = {};
  }
  if (!result.recommendations.alternativeOptions) {
    result.recommendations.alternativeOptions = {};
  }
  if (!result.recommendations.pricingGuidance) {
    result.recommendations.pricingGuidance = {};
  }
  
  return result;
}

module.exports = openaiService;

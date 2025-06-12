// backend/services/openaiService.js - Complete Enhanced Version
const axios = require('axios');
const historicalDataService = require('./historicalDataService');
const criteriaService = require('./criteriaService');
require('dotenv').config();

/**
 * Service for interacting with OpenAI API with comprehensive RAG analysis
 */
const openaiService = {
  /**
   * Analyze transcript using RAG with historical data and DYNAMIC criteria
   * @param {string} text - The transcript text to analyze
   * @returns {Promise<Object>} - Analysis results
   */
  analyzeTranscript: async (text) => {
    try {
      console.log('Starting comprehensive transcript analysis with dynamic criteria...');
      console.log('Transcript length:', text.length, 'characters');
      
      // Phase 1: Quick initial analysis to extract basic info
      console.log('Phase 1: Extracting basic information from transcript...');
      const initialAnalysis = await performInitialAnalysis(text);
      console.log('Initial analysis extracted:', {
        customerName: initialAnalysis.customerName,
        industry: initialAnalysis.industry,
        userCount: initialAnalysis.userCount
      });
      
      // Phase 2: Get historical data based on initial analysis
      console.log('Phase 2: Retrieving relevant historical data...');
      const historicalData = await historicalDataService.getHistoricalData(initialAnalysis);
      console.log(`Retrieved ${historicalData.length} relevant historical customer records.`);
      
      // Phase 3: Get comprehensive insights from all data
      console.log('Phase 3: Getting comprehensive market insights...');
      const insights = await historicalDataService.getComprehensiveInsights();
      
      // Phase 4: Retrieve DYNAMIC configured criteria (no hardcoded defaults)
      console.log('Phase 4: Loading dynamic criteria configuration...');
      const criteria = await criteriaService.getAllCriteria();
      console.log('Loaded criteria:', {
        preferredIndustries: criteria.industries.whitelist,
        blacklistedIndustries: criteria.industries.blacklist,
        platformStrengths: criteria.requirements.strengths.length,
        platformLimitations: criteria.requirements.weaknesses.length
      });
      
      // Phase 5: Format data for comprehensive analysis
      const formattedHistoricalData = historicalDataService.formatHistoricalDataForPrompt(historicalData, insights);
      const formattedCriteria = formatCriteriaForPrompt(criteria);
      
      // Phase 6: Create comprehensive prompt with all context
      const prompt = createEnhancedPrompt(text, formattedHistoricalData, formattedCriteria);
      
      // Phase 7: Call OpenAI API for full analysis with retry logic
      console.log('Phase 7: Sending comprehensive analysis request to OpenAI...');
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
      
      // Phase 8: Process the response with enhanced parsing and validation
      const result = processOpenAIResponseRobustly(response);
      console.log('Successfully processed OpenAI response.');
      console.log('Extracted customer name:', result.customerName);
      console.log('Extracted industry:', result.industry);
      console.log('Extracted user count:', result.userCount);
      console.log('Fit Score from OpenAI:', result.fitScore);
      
      // Phase 9: Apply DYNAMIC criteria adjustments (no hardcoded criteria)
      const adjustedResult = applyComprehensiveCriteriaAdjustments(result, criteria);
      
      // Phase 10: Enrich with similar customers using prioritized sections
      const enrichedResult = enrichWithSimilarCustomers(adjustedResult, historicalData);
      
      // Phase 11: Validate structure and clean any remaining formatting issues
      const validatedResult = validateMinimalStructure(enrichedResult);
      
      // Phase 12: Log final result for debugging
      console.log('=== FINAL RESULT VALIDATION ===');
      console.log('Customer Name:', validatedResult.customerName);
      console.log('Industry:', validatedResult.industry);
      console.log('Final Fit Score:', validatedResult.fitScore);
      console.log('Score Category:', validatedResult.scoreBreakdown?.category);
      console.log('Strengths Count:', validatedResult.strengths?.length || 0);
      console.log('Challenges Count:', validatedResult.challenges?.length || 0);
      console.log('Similar Customers Sections:', validatedResult.similarCustomers?.length || 0);
      
      return validatedResult;
    } catch (error) {
      console.error('Error analyzing transcript with OpenAI:', error);
      throw new Error(`Failed to analyze transcript: ${error.message}`);
    }
  }
};

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
 * Create enhanced prompt that uses DYNAMIC criteria and prevents JSON leakage
 */
function createEnhancedPrompt(transcriptText, historicalData, criteriaData) {
  return `
You are an expert system analyzing a meeting transcript for Zuper, a field service management software company.

CRITICAL INSTRUCTIONS:
1. Extract EVERY piece of information from the transcript - DO NOT use generic placeholders
2. Be honest about fit - use the CONFIGURED criteria below, not field service assumptions
3. Return ONLY valid JSON without any other text
4. NEVER include raw JSON objects in summary text - format everything as readable text
5. For currentState, convert any data structures to readable narrative text
6. ALL content must be SPECIFIC to what was said in the transcript
7. If something wasn't mentioned, leave the array empty rather than adding generic content
8. ALWAYS include strategic sales guidance in recommendations based on fit score
9. Score honestly using ONLY the configured criteria - do not assume industries are good fits
10. ENSURE YOUR JSON IS COMPLETE - if approaching token limits, prioritize completing the structure

${criteriaData}

${historicalData.substring(0, 2000)}...

Analyze this transcript and extract all relevant information:

"""
${transcriptText}
"""

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
      "summary": "Clear explanation of fit score based on CONFIGURED criteria",
      "positiveFactors": ["What contributes positively based on configured strengths"],
      "negativeFactors": ["What reduces score based on configured criteria"],
      "overallAssessment": "1-2 sentences on overall fit"
    },
    "salesStrategy": {
      "recommendation": "PURSUE/CONDITIONAL/DECLINE based on fit score and configured criteria",
      "approach": "Specific guidance for this customer",
      "reasoning": "Why this approach based on their specific needs and configured criteria",
      "talkingPoints": ["Customer-specific talking points"],
      "risks": ["Specific risks for this implementation"],
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
  "fitScore": Calculate honest score using CONFIGURED criteria - NOT field service assumptions
}`;
}

/**
 * Format criteria for the prompt using DYNAMIC data from configuration
 */
function formatCriteriaForPrompt(criteria) {
  const industries = criteria.industries || { whitelist: [], blacklist: [] };
  const requirements = criteria.requirements || { strengths: [], weaknesses: [], unsupported: [] };
  
  return `
## DYNAMIC PLATFORM CRITERIA AND SCORING GUIDELINES (CONFIGURED)

PREFERRED INDUSTRIES (Base score 50-60, +10 bonus): ${industries.whitelist.length > 0 ? industries.whitelist.join(', ') : 'None configured'}
BLACKLISTED INDUSTRIES (Maximum score 25): ${industries.blacklist.length > 0 ? industries.blacklist.join(', ') : 'None configured'}
OTHER INDUSTRIES: Base score 45-55, -5 penalty for not being in preferred list

SCORING METHODOLOGY:
- Industry Match: +10 for preferred, -5 for others, -25+ for blacklisted
- Field Worker Ratio >70%: +10 points
- Field Worker Ratio 50-70%: +5 points  
- Field Worker Ratio <30%: -15 points
- Requirements matching platform strengths: +3 per match (max +10)
- Requirements conflicting with limitations: -10 points
- Requirements that are unsupported: -20 points
- Company size 50-200 users: +3 points
- Integration complexity >5 systems: -15 points

PLATFORM STRENGTHS (give bonus when customer needs these): 
${requirements.strengths.length > 0 ? requirements.strengths.join(', ') : 'None configured'}

PLATFORM LIMITATIONS (give penalty when customer needs these): 
${requirements.weaknesses.length > 0 ? requirements.weaknesses.join(', ') : 'None configured'}

UNSUPPORTED FEATURES (major penalty when customer needs these): 
${requirements.unsupported.length > 0 ? requirements.unsupported.join(', ') : 'None configured'}

CRITICAL: Base your industry assessment ONLY on the CONFIGURED criteria above.
Do NOT make assumptions about what industries are good for field service software.
If an industry is not in the configured preferred list, treat it as neutral/penalty.
`;
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
 * Attempt to repair truncated JSON by fixing common issues
 */
function repairTruncatedJSON(jsonContent, parseError) {
  try {
    console.log('Attempting JSON repair...');
    
    let repairedJSON = jsonContent;
    
    // Strategy 1: Find the last complete property and truncate there
    const lastCompleteProperty = repairedJSON.lastIndexOf('",');
    const lastCompleteNumber = repairedJSON.lastIndexOf('},');
    const lastCompleteArray = repairedJSON.lastIndexOf('],');
    const lastCompleteObject = repairedJSON.lastIndexOf('}');
    
    const lastComplete = Math.max(lastCompleteProperty, lastCompleteNumber, lastCompleteArray);
    
    if (lastComplete > repairedJSON.length - 100) { // Only if truncation is near the end
      repairedJSON = repairedJSON.substring(0, lastComplete + 1);
      console.log('Truncated to last complete property at position', lastComplete);
    }
    
    // Strategy 2: Balance braces and brackets
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
    parseWarning: 'This analysis was created from a partially parsed OpenAI response. Consider re-running the analysis with a shorter transcript or in multiple parts.'
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
 * Apply comprehensive criteria adjustments with DYNAMIC criteria (no hardcoded values)
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
    rationale: []
  };
  
  const industryLower = (result.industry || '').toLowerCase().trim();
  
  // DYNAMIC INDUSTRY MATCHING - use actual configured criteria
  const isPreferred = criteria.industries.whitelist.some(preferred => {
    const prefLower = preferred.toLowerCase().trim();
    
    // Exact match
    if (industryLower === prefLower) return true;
    
    // Partial match - both ways
    if (industryLower.includes(prefLower) || prefLower.includes(industryLower)) return true;
    
    // Word-based matching for compound industries
    const indWords = industryLower.split(/[\s\-,&]+/).filter(w => w.length > 2);
    const prefWords = prefLower.split(/[\s\-,&]+/).filter(w => w.length > 2);
    
    return indWords.some(iw => prefWords.some(pw => 
      iw.includes(pw) || pw.includes(iw) ||
      (iw.length > 3 && pw.length > 3 && iw.substring(0, 3) === pw.substring(0, 3))
    ));
  });
  
  // Check if blacklisted using DYNAMIC criteria
  const isBlacklisted = criteria.industries.blacklist.some(blacklisted => {
    const blackLower = blacklisted.toLowerCase().trim();
    return industryLower.includes(blackLower) || blackLower.includes(industryLower);
  });
  
  console.log('Dynamic criteria analysis:', {
    industry: result.industry,
    configuredWhitelist: criteria.industries.whitelist,
    configuredBlacklist: criteria.industries.blacklist,
    isPreferred,
    isBlacklisted
  });
  
  // APPLY INDUSTRY SCORING BASED ON DYNAMIC CRITERIA
  if (isBlacklisted) {
    // Blacklisted: Severe penalty
    adjustedScore = Math.min(adjustedScore, 25);
    scoreBreakdown.industryAdjustment = adjustedScore - result.fitScore;
    scoreBreakdown.category = 'blacklisted';
    scoreBreakdown.rationale.push(`${result.industry} is in the configured blacklist`);
  } else if (isPreferred) {
    // Preferred: Moderate bonus
    adjustedScore += 10;
    scoreBreakdown.industryAdjustment = 10;
    scoreBreakdown.category = 'preferred';
    scoreBreakdown.rationale.push(`${result.industry} matches configured preferred industry`);
  } else {
    // Not in preferred list: Small penalty
    adjustedScore -= 5;
    scoreBreakdown.industryAdjustment = -5;
    scoreBreakdown.category = 'neutral';
    scoreBreakdown.rationale.push(`${result.industry} is not in configured preferred industries`);
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
  
  console.log('Dynamic score breakdown:', scoreBreakdown);
  
  // Update result
  result.fitScore = scoreBreakdown.finalScore;
  result.scoreBreakdown = scoreBreakdown;
  
  return result;
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
  
  // Add historical context to recommendations
  if (result.recommendations && similarCustomersSections.length > 0) {
    const allSimilarCustomers = similarCustomersSections.flatMap(section => section.customers);
    const successfulSimilar = allSimilarCustomers.filter(c => 
      ['Excellent', 'Good'].includes(c.implementation.health)
    );
    const struggingSimilar = allSimilarCustomers.filter(c => 
      ['Poor', 'Average'].includes(c.implementation.health)
    );
    
    if (!result.recommendations.historicalContext) {
      result.recommendations.historicalContext = {
        successfulSimilarCount: successfulSimilar.length,
        strugglingSimilarCount: struggingSimilar.length,
        insights: []
      };
      
      if (successfulSimilar.length > 0) {
        result.recommendations.historicalContext.insights.push(
          `${successfulSimilar.length} similar customers achieved success`
        );
      }
      
      if (struggingSimilar.length > 0) {
        result.recommendations.historicalContext.insights.push(
          `${struggingSimilar.length} similar customers faced challenges - review their experiences`
        );
      }
    }
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

// Helper function to call OpenAI API with INCREASED token limits
async function callOpenAI(prompt) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key is not configured.');
    }
    
    const model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
    
    console.log('Using OpenAI model:', model);
    
    // INCREASED max_tokens to prevent truncation
    const maxTokens = model.includes('gpt-4') ? 4000 : 3500; // Increased from 2500/3000
    
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
        max_tokens: maxTokens // INCREASED
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      }
    );
    
    const responseLength = response.data.choices[0].message.content.length;
    const tokensUsed = response.data.usage?.total_tokens || 'unknown';
    
    console.log(`OpenAI response: ${responseLength} characters, ${tokensUsed}/${maxTokens} tokens`);
    
    // Warning if we're close to token limit
    if (typeof tokensUsed === 'number' && tokensUsed > maxTokens * 0.9) {
      console.log('⚠️  WARNING: Response approaching token limit, possible truncation');
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

module.exports = openaiService;

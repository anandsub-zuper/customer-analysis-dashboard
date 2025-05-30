const axios = require('axios');
const historicalDataService = require('./historicalDataService');
const criteriaService = require('./criteriaService');
require('dotenv').config();

/**
 * Service for interacting with OpenAI API with comprehensive analysis
 */
const openaiService = {
  /**
   * Analyze transcript using RAG with historical data and criteria
   * @param {string} text - The transcript text to analyze
   * @returns {Promise<Object>} - Analysis results
   */
  analyzeTranscript: async (text) => {
    try {
      console.log('Starting comprehensive transcript analysis...');
      console.log('Transcript length:', text.length, 'characters');
      
      // 1. Retrieve historical data
      const historicalData = await historicalDataService.getHistoricalData();
      console.log(`Retrieved ${historicalData.length} historical customer records.`);
      
      // 2. Retrieve configured criteria
      const criteria = await criteriaService.getAllCriteria();
      console.log('Retrieved industry and requirements criteria.');
      
      // 3. Format data for prompts
      const formattedHistoricalData = historicalDataService.formatHistoricalDataForPrompt(historicalData);
      const formattedCriteria = formatCriteriaForPrompt(criteria);
      
      // 4. Create comprehensive prompt
      const prompt = createEnhancedPrompt(text, formattedHistoricalData, formattedCriteria);
      
      // 5. Call OpenAI API with retry logic
      console.log('Sending comprehensive analysis request to OpenAI...');
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
      
      // 6. Process the response - NO FALLBACK
      const result = processOpenAIResponse(response);
      console.log('Successfully processed OpenAI response.');
      console.log('Extracted customer name:', result.customerName);
      console.log('Extracted industry:', result.industry);
      console.log('Extracted user count:', result.userCount);
      console.log('Fit Score from OpenAI:', result.fitScore);
      
      // 7. Apply criteria adjustments to the fit score ONLY
      const adjustedResult = applyComprehensiveCriteriaAdjustments(result, criteria);
      
      // 8. Find REAL similar customers (don't create fake ones)
      const enrichedResult = enrichWithSimilarCustomers(adjustedResult, historicalData);
      
      // 9. Minimal structure validation (don't overwrite with defaults)
      const validatedResult = validateMinimalStructure(enrichedResult);
      
      // 10. Log final result
      console.log('=== FINAL RESULT VALIDATION ===');
      console.log('Customer Name:', validatedResult.customerName);
      console.log('Industry:', validatedResult.industry);
      console.log('Final Fit Score:', validatedResult.fitScore);
      console.log('Strengths Count:', validatedResult.strengths?.length || 0);
      console.log('Challenges Count:', validatedResult.challenges?.length || 0);
      
      return validatedResult;
    } catch (error) {
      console.error('Error analyzing transcript with OpenAI:', error);
      throw new Error(`Failed to analyze transcript: ${error.message}`);
    }
  }
};

/**
 * Create enhanced prompt that explicitly asks for extraction
 */
function createEnhancedPrompt(transcriptText, historicalData, criteriaData) {
  return `
You are an expert system analyzing a meeting transcript for Zuper, a field service management software company.

CRITICAL INSTRUCTIONS:
1. Extract EVERY piece of information from the transcript - DO NOT use generic placeholders
2. Be honest about fit - if the company is not suitable for field service management, give a LOW fit score
3. Return ONLY valid JSON without any other text
4. For companies with minimal field operations (<20% field workers), fit score should be BELOW 30
5. NEVER use generic text like "Clear understanding of needs" or "Standard implementation"
6. ALL content must be SPECIFIC to what was said in the transcript
7. If something wasn't mentioned, leave the array empty rather than adding generic content

EXAMPLE OF BAD GENERIC CONTENT (DO NOT DO THIS):
- "Clear understanding of needs" 
- "Standard implementation"
- "Requirements defined"
- "Typical deployment considerations"

EXAMPLE OF GOOD SPECIFIC CONTENT:
- "Need to track cleaner arrivals/departures at each client site"
- "CleanTrack software lacks mobile capabilities"
- "Route optimization critical for minimizing travel between client sites"
- "100 field cleaners working at multiple locations daily"

${criteriaData}

IMPORTANT SCORING RULES:
- Industries in the PREFERRED list: Score 60-85
- Industries NOT in the preferred list (like cleaning, landscaping, etc.): Score 40-60
- Industries in the BLACKLISTED list: Maximum score 25
- Pure software/SaaS companies with <10% field workers: Maximum score 20
- Companies needing complex project management or ERP: Reduce score by 30 points
- Companies with >5 complex integrations: Reduce score by 20 points
- Focus on FIELD SERVICE operations, not general business management

Analyze this transcript and extract all relevant information:

"""
${transcriptText}
"""

Return a JSON object with this EXACT structure:

{
  "customerName": "Extract exact company name from transcript",
  "industry": "Extract exact industry mentioned",
  "userCount": {
    "total": extract number,
    "backOffice": extract number,
    "field": extract number
  },
  "currentState": {
    "currentSystems": [
      {
        "name": "Extract EXACT system name mentioned (CleanTrack in this case)",
        "type": "System type",
        "usage": "EXACTLY what they said they use it for",
        "replacementReasons": ["EXACT reasons they gave for wanting to replace"],
        "painPoints": ["SPECIFIC pain points mentioned - e.g. 'no mobile capabilities'"]
      }
    ],
    "currentProcesses": "Describe their EXACT current processes from transcript",
    "manualProcesses": ["List SPECIFIC manual tasks they mentioned"]
  },
  "services": {
    "types": ["List exact services mentioned"],
    "details": {
      "Service Type": "Details about this service"
    },
    "specializations": ["Any specialized services"],
    "serviceArea": "Geographic coverage if mentioned"
  },
  "requirements": {
    "keyFeatures": ["List ALL features they explicitly asked for"],
    "checklists": [],
    "communications": {
      "customerNotifications": {
        "required": false/true based on transcript,
        "types": ["Types if mentioned"],
        "methods": ["Methods if mentioned"],
        "triggers": ["Triggers if mentioned"]
      }
    },
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
    "overview": "Accurate 2-3 sentence summary based on the transcript",
    "keyRequirements": ["Their TOP requirements from the transcript"],
    "mainPainPoints": ["Their actual pain points mentioned"]
  },
  "strengths": [
    {
      "title": "ONLY list if Zuper genuinely addresses their needs",
      "description": "Be specific about why",
      "impact": "Real business impact",
      "relatedFeatures": ["Zuper features that help"]
    }
  ],
  "challenges": [
    {
      "title": "Be honest about mismatches",
      "description": "Why Zuper might not be suitable",
      "severity": "Critical/Major/Minor",
      "mitigation": "Honest assessment of how to address"
    }
  ],
  "recommendations": {
    "implementationApproach": {
      "strategy": "If fit score <30, recommend they consider alternatives. Otherwise provide real strategy",
      "phases": [
        {
          "phase": 1,
          "name": "Phase name",
          "duration": "Realistic duration",
          "activities": ["Real activities needed"]
        }
      ]
    },
    "integrationStrategy": {
      "approach": "Based on their actual integration needs",
      "details": [
        {
          "integration": "System name",
          "method": "Integration method",
          "timeline": "Realistic timeline"
        }
      ]
    },
    "trainingRecommendations": [
      {
        "audience": "Based on their user types",
        "topics": ["Relevant training topics"],
        "duration": "Realistic duration",
        "method": "Appropriate method"
      }
    ]
  },
  "fitScore": BE HONEST - for software companies with minimal field ops, this should be VERY LOW (under 30)
}`;
}

/**
 * Format criteria for the prompt
 */
function formatCriteriaForPrompt(criteria) {
  return `
## ZUPER PLATFORM CRITERIA

PREFERRED INDUSTRIES (Higher fit scores): ${criteria.industries.whitelist.join(', ')}
BLACKLISTED INDUSTRIES (Very low fit scores): ${criteria.industries.blacklist.join(', ')}

CRITICAL SCORING RULES:
- Industries in PREFERRED list: Good fit (60-90 score range)
- Industries NOT in preferred list: Moderate fit (reduce score by 20-30 points)
- Industries in BLACKLISTED: Poor fit (maximum score 25)
- Pure SaaS, software companies, and IT companies are NOT suitable for field service management

PLATFORM STRENGTHS: ${criteria.requirements.strengths.join(', ')}
PLATFORM LIMITATIONS: ${criteria.requirements.weaknesses.join(', ')}
UNSUPPORTED FEATURES: ${criteria.requirements.unsupported.join(', ')}

Zuper is designed for companies with significant FIELD operations (technicians, installers, maintenance crews).
NOT suitable for: office-only operations, pure software development, complex project management, full ERP needs.
`;
}

/**
 * Process OpenAI response - NO FALLBACK
 */
function processOpenAIResponse(response) {
  try {
    const content = response.choices[0].message.content;
    console.log('Raw OpenAI response length:', content.length);
    
    // Try to extract JSON from the response
    let jsonContent = content;
    
    // Remove any markdown code blocks if present
    const codeBlockMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (codeBlockMatch) {
      jsonContent = codeBlockMatch[1];
    }
    
    // Try to find JSON object in the response
    const jsonMatch = jsonContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonContent = jsonMatch[0];
    }
    
    // Parse the JSON
    const analysisResults = JSON.parse(jsonContent);
    
    // Log the actual OpenAI results for debugging
    console.log('=== OPENAI ANALYSIS RESULTS ===');
    console.log('Summary:', JSON.stringify(analysisResults.summary, null, 2));
    console.log('Strengths:', JSON.stringify(analysisResults.strengths, null, 2));
    console.log('Challenges:', JSON.stringify(analysisResults.challenges, null, 2));
    console.log('Current State:', JSON.stringify(analysisResults.currentState, null, 2));
    
    // Return EXACTLY what OpenAI gave us, just ensure basic structure
    return {
      ...analysisResults,
      date: new Date().toISOString()
    };
    
  } catch (e) {
    console.error('Error parsing OpenAI response:', e);
    console.error('Response content:', response.choices[0].message.content);
    
    // Don't return fallback - throw error instead
    throw new Error('Failed to parse OpenAI response. The AI analysis could not be completed.');
  }
}

/**
 * Minimal structure validation - don't overwrite data
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
  if (!result.recommendations) result.recommendations = {};
  if (!result.currentState) result.currentState = {};
  if (!result.services) result.services = {};
  if (!result.timeline) result.timeline = {};
  if (!result.budget) result.budget = {};
  
  return result;
}

/**
 * Apply comprehensive criteria adjustments - ONLY adjust fit score
 */
function applyComprehensiveCriteriaAdjustments(result, criteria) {
  // Don't modify the result data, only adjust the fit score
  let adjustedScore = result.fitScore || 50;
  
  const scoreBreakdown = {
    baseScore: adjustedScore,
    industryAdjustment: 0,
    fieldWorkerPenalty: 0,
    complexityPenalty: 0,
    finalScore: 0
  };
  
  // Industry scoring
  const industryLower = result.industry?.toLowerCase() || '';
  const isPreferred = criteria.industries.whitelist.some(
    preferred => industryLower.includes(preferred.toLowerCase())
  );
  const isBlacklisted = criteria.industries.blacklist.some(
    blacklisted => industryLower.includes(blacklisted.toLowerCase())
  );
  
  if (isBlacklisted || industryLower.includes('saas') || industryLower.includes('software')) {
    // Major penalty for blacklisted industries
    adjustedScore = Math.min(adjustedScore, 25);
    scoreBreakdown.industryAdjustment = -50;
  } else if (isPreferred) {
    // Bonus for preferred industries
    adjustedScore += 15;
    scoreBreakdown.industryAdjustment = 15;
  } else {
    // PENALTY for non-preferred industries (not in whitelist)
    adjustedScore -= 20;
    scoreBreakdown.industryAdjustment = -20;
  }
  
  // Field worker ratio penalty
  const fieldRatio = (result.userCount?.field || 0) / (result.userCount?.total || 1);
  if (fieldRatio < 0.2) { // Less than 20% field workers
    adjustedScore = Math.min(adjustedScore, 30);
    scoreBreakdown.fieldWorkerPenalty = -40;
  }
  
  // Complexity penalty
  const integrationCount = result.requirements?.integrations?.length || 0;
  if (integrationCount > 3) {
    adjustedScore -= 15;
    scoreBreakdown.complexityPenalty = -15;
  }
  
  // Calculate final score
  scoreBreakdown.finalScore = Math.max(0, Math.min(100, adjustedScore));
  result.fitScore = scoreBreakdown.finalScore;
  result.scoreBreakdown = scoreBreakdown;
  
  return result;
}

/**
 * Find REAL similar customers - don't create fake ones
 */
function enrichWithSimilarCustomers(result, historicalData) {
  const customerIndustry = (result.industry || '').toLowerCase();
  
  // Find truly similar customers
  const similarCustomers = historicalData
    .map(h => ({
      historical: h,
      score: calculateMatchScore(result, h)
    }))
    .filter(item => item.score > 50) // Only include if reasonably similar
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(item => ({
      name: item.historical.customerName || 'Historical Customer',
      industry: item.historical.industry || 'Not specified',
      matchPercentage: item.score,
      matchReasons: generateMatchReasons(result, item.historical),
      implementation: {
        duration: item.historical.businessMetrics?.daysToOnboard 
          ? `${item.historical.businessMetrics.daysToOnboard} days` 
          : 'Not available',
        health: item.historical.businessMetrics?.health || 'Not available',
        arr: item.historical.businessMetrics?.arr 
          ? `$${item.historical.businessMetrics.arr.toLocaleString()}` 
          : 'Not available'
      },
      keyLearnings: generateKeyLearnings(item.historical)
    }));
  
  // Don't create fake customers - just use what we found
  result.similarCustomers = similarCustomers;
  
  return result;
}

/**
 * Calculate match score between customer and historical data
 */
function calculateMatchScore(customer, historical) {
  let score = 0;
  
  // Industry match (40 points)
  const custInd = (customer.industry || '').toLowerCase();
  const histInd = (historical.industry || '').toLowerCase();
  
  if (custInd && histInd) {
    if (custInd === histInd) {
      score += 40;
    } else {
      // Check for partial matches
      const custWords = custInd.split(/[\s,\/]+/);
      const histWords = histInd.split(/[\s,\/]+/);
      const matches = custWords.filter(w => histWords.some(h => h.includes(w) || w.includes(h)));
      if (matches.length > 0) {
        score += 20;
      }
    }
  }
  
  // Size match (30 points)
  const sizeDiff = Math.abs((customer.userCount?.total || 0) - (historical.userCount?.total || 0));
  if (sizeDiff < 20) score += 30;
  else if (sizeDiff < 50) score += 20;
  else if (sizeDiff < 100) score += 10;
  
  // Field ratio match (20 points)
  const custFieldRatio = (customer.userCount?.field || 0) / (customer.userCount?.total || 1);
  const histFieldRatio = (historical.userCount?.field || 0) / (historical.userCount?.total || 1);
  const ratioDiff = Math.abs(custFieldRatio - histFieldRatio);
  
  if (ratioDiff < 0.1) score += 20;
  else if (ratioDiff < 0.2) score += 10;
  
  // Service match (10 points)
  if (customer.services?.types && historical.services?.length > 0) {
    const matches = customer.services.types.filter(s => 
      historical.services.some(hs => 
        hs.toLowerCase().includes(s.toLowerCase()) || 
        s.toLowerCase().includes(hs.toLowerCase())
      )
    );
    if (matches.length > 0) score += 10;
  }
  
  return Math.min(score, 100);
}

/**
 * Generate match reasons between customers
 */
function generateMatchReasons(customer, historical) {
  const reasons = [];
  
  // Industry
  const custInd = (customer.industry || '').toLowerCase();
  const histInd = (historical.industry || '').toLowerCase();
  
  if (custInd && histInd) {
    if (custInd === histInd) {
      reasons.push(`Same industry: ${historical.industry}`);
    } else if (custInd.includes(histInd.split(' ')[0]) || histInd.includes(custInd.split(' ')[0])) {
      reasons.push(`Similar industry: ${historical.industry}`);
    }
  }
  
  // Size
  const sizeDiff = Math.abs((customer.userCount?.total || 0) - (historical.userCount?.total || 0));
  if (sizeDiff < 50) {
    reasons.push(`Similar size: ${historical.userCount?.total || 0} users`);
  }
  
  // Field ratio
  const custFieldRatio = (customer.userCount?.field || 0) / (customer.userCount?.total || 1);
  const histFieldRatio = (historical.userCount?.field || 0) / (historical.userCount?.total || 1);
  
  if (Math.abs(custFieldRatio - histFieldRatio) < 0.2) {
    reasons.push(`Similar field/office ratio: ${Math.round(histFieldRatio * 100)}% field`);
  }
  
  // Services
  if (customer.services?.types && historical.services?.length > 0) {
    const matches = customer.services.types.filter(s => 
      historical.services.some(hs => 
        hs.toLowerCase().includes(s.toLowerCase()) || 
        s.toLowerCase().includes(hs.toLowerCase())
      )
    );
    if (matches.length > 0) {
      reasons.push(`Similar services offered`);
    }
  }
  
  return reasons.length > 0 ? reasons : ['General business similarity'];
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
  
  // Industry-specific
  const industry = (historical.industry || '').toLowerCase();
  if (industry.includes('construction') || industry.includes('hvac') || industry.includes('plumbing')) {
    learnings.push('Traditional field service industry');
  } else if (industry.includes('tech') || industry.includes('software')) {
    learnings.push('Non-traditional FSM use case');
  }
  
  return learnings.length > 0 ? learnings : ['Standard customer profile'];
}

// Helper functions
async function callOpenAI(prompt) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key is not configured.');
    }
    
    const model = process.env.OPENAI_MODEL || 'gpt-4-turbo';
    
    console.log('Using OpenAI model:', model);
    
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert at analyzing business requirements for field service management software. Be accurate and honest in your assessments. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 3000
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      }
    );
    
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

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
      const prompt = createComprehensivePrompt(text, formattedHistoricalData, formattedCriteria);
      
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
      
      // 6. Process the response with better error handling
      const result = processOpenAIResponse(response);
      console.log('Successfully processed OpenAI response.');
      
      // 7. Apply criteria adjustments
      const adjustedResult = applyComprehensiveCriteriaAdjustments(result, criteria);
      
      // 8. Find similar customers with detailed matching
      const enrichedResult = enrichWithSimilarCustomers(adjustedResult, historicalData);
      
      return enrichedResult;
    } catch (error) {
      console.error('Error analyzing transcript with OpenAI:', error);
      throw new Error(`Failed to analyze transcript: ${error.message}`);
    }
  }
};

/**
 * Create comprehensive prompt for detailed analysis
 * SIMPLIFIED VERSION to reduce token usage and improve reliability
 */
function createComprehensivePrompt(transcriptText, historicalData, criteriaData) {
  return `
You are an expert system that analyzes meeting transcripts for a field service management software company called Zuper.

IMPORTANT: Your response MUST be valid JSON only. Do not include any text before or after the JSON object.

${criteriaData}

## HISTORICAL CUSTOMER DATA (Summary)
${historicalData}

ANALYZE THE TRANSCRIPT and provide your response as a valid JSON object with this structure:

{
  "customerName": "string",
  "industry": "string",
  "userCount": {
    "total": 0,
    "backOffice": 0,
    "field": 0
  },
  "currentSystems": [],
  "services": [],
  "requirements": {
    "keyFeatures": [],
    "integrations": [],
    "checklists": [],
    "communications": {
      "customerNotifications": {
        "required": false,
        "types": [],
        "methods": []
      }
    },
    "features": {
      "mobileApp": { "needed": false },
      "customerPortal": { "needed": false },
      "reporting": { "needed": false },
      "invoicing": { "needed": false }
    }
  },
  "timeline": "",
  "budget": {
    "mentioned": false,
    "range": ""
  },
  "summary": "Brief overview of the customer and their needs",
  "strengths": [
    {
      "title": "string",
      "description": "string",
      "impact": "string"
    }
  ],
  "challenges": [
    {
      "title": "string",
      "description": "string",
      "severity": "Critical|Major|Minor",
      "mitigation": "string"
    }
  ],
  "similarCustomers": [],
  "recommendations": [
    "Recommendation 1",
    "Recommendation 2",
    "Recommendation 3"
  ],
  "fitScore": 0
}

Extract key information from this transcript and respond ONLY with valid JSON:

${transcriptText}
`;
}

/**
 * Format criteria for the prompt (simplified)
 */
function formatCriteriaForPrompt(criteria) {
  return `
## ZUPER PLATFORM CRITERIA

SUPPORTED INDUSTRIES: ${criteria.industries.whitelist.join(', ')}
UNSUPPORTED INDUSTRIES: ${criteria.industries.blacklist.join(', ')}
PLATFORM STRENGTHS: ${criteria.requirements.strengths.join(', ')}
PLATFORM LIMITATIONS: ${criteria.requirements.weaknesses.join(', ')}
`;
}

/**
 * Enrich results with detailed similar customer matching
 */
function enrichWithSimilarCustomers(result, historicalData) {
  const similarCustomers = [];
  
  historicalData.forEach(historical => {
    let matchScore = 0;
    const matchReasons = [];
    
    // Industry match (40 points)
    if (historical.industry?.toLowerCase() === result.industry?.toLowerCase()) {
      matchScore += 40;
      matchReasons.push(`Same industry (${historical.industry})`);
    } else if (historical.industry?.toLowerCase().includes(result.industry?.toLowerCase()) || 
               result.industry?.toLowerCase().includes(historical.industry?.toLowerCase())) {
      matchScore += 20;
      matchReasons.push(`Related industry`);
    }
    
    // Size match (20 points)
    const sizeDiff = Math.abs((historical.userCount?.total || 0) - (result.userCount?.total || 0));
    if (sizeDiff <= 10) {
      matchScore += 20;
      matchReasons.push(`Similar size (${historical.userCount?.total} users)`);
    } else if (sizeDiff <= 25) {
      matchScore += 10;
      matchReasons.push(`Comparable size`);
    }
    
    // Service match (20 points)
    const customerServices = result.services || [];
    const historicalServices = historical.services || [];
    const commonServices = customerServices.filter(s => 
      historicalServices.some(hs => hs.toLowerCase().includes(s.toLowerCase()))
    );
    if (commonServices.length > 0) {
      matchScore += Math.min(20, commonServices.length * 5);
      matchReasons.push(`Similar services: ${commonServices.join(', ')}`);
    }
    
    // Requirements match (20 points)
    let reqMatch = 0;
    if (historical.requirements?.checklists?.needed && result.requirements?.checklists?.length > 0) {
      reqMatch += 5;
      matchReasons.push('Checklist requirements');
    }
    if (historical.requirements?.notifications?.customer?.needed && 
        result.requirements?.communications?.customerNotifications?.required) {
      reqMatch += 5;
      matchReasons.push('Customer notification needs');
    }
    if (historical.requirements?.integrations?.length > 0 && 
        result.requirements?.integrations?.length > 0) {
      reqMatch += 5;
      matchReasons.push('Integration requirements');
    }
    if (historical.requirements?.invoicing?.needed && 
        result.requirements?.features?.invoicing?.needed) {
      reqMatch += 5;
      matchReasons.push('Invoicing needs');
    }
    matchScore += reqMatch;
    
    if (matchScore >= 50) {
      similarCustomers.push({
        name: historical.customerName,
        industry: historical.industry,
        matchPercentage: matchScore,
        matchReasons: matchReasons,
        implementation: {
          duration: `${historical.businessMetrics?.daysToOnboard || 'Unknown'} days`,
          health: historical.businessMetrics?.health || 'Unknown',
          arr: historical.businessMetrics?.arr ? `$${historical.businessMetrics.arr.toLocaleString()}` : 'Unknown'
        },
        keyLearnings: generateKeyLearnings(historical),
        requirements: {
          services: historical.services || [],
          integrations: historical.requirements?.integrations || [],
          userCount: historical.userCount
        }
      });
    }
  });
  
  // Sort by match percentage and take top 5
  similarCustomers.sort((a, b) => b.matchPercentage - a.matchPercentage);
  result.similarCustomers = similarCustomers.slice(0, 5);
  
  return result;
}

/**
 * Generate key learnings from historical customer
 */
function generateKeyLearnings(historical) {
  const learnings = [];
  
  if (historical.businessMetrics?.health === 'Excellent' || historical.businessMetrics?.health === 'Good') {
    learnings.push('Successful implementation');
    if (historical.businessMetrics?.daysToOnboard <= 60) {
      learnings.push('Quick onboarding achieved');
    }
  }
  
  if (historical.requirements?.checklists?.needed) {
    learnings.push('Checklist customization was key');
  }
  
  if (historical.requirements?.integrations?.length > 2) {
    learnings.push('Multiple integrations successfully implemented');
  }
  
  if (historical.businessMetrics?.health === 'Poor' || historical.businessMetrics?.retentionRisk) {
    learnings.push('Implementation challenges to avoid');
  }
  
  return learnings;
}

/**
 * Apply comprehensive criteria adjustments
 */
function applyComprehensiveCriteriaAdjustments(result, criteria) {
  // Initialize scoring
  const scoreBreakdown = {
    baseScore: 50,
    industryAdjustment: 0,
    strengthsBonus: 0,
    limitationsPenalty: 0,
    unsupportedPenalty: 0,
    complexityAdjustment: 0,
    finalScore: 0
  };
  
  let adjustedScore = scoreBreakdown.baseScore;
  
  // Industry scoring
  const industryLower = result.industry?.toLowerCase() || '';
  const isPreferred = criteria.industries.whitelist.some(
    preferred => industryLower.includes(preferred.toLowerCase())
  );
  const isBlacklisted = criteria.industries.blacklist.some(
    blacklisted => industryLower.includes(blacklisted.toLowerCase())
  );
  
  if (isBlacklisted) {
    adjustedScore = Math.min(adjustedScore, 30);
    scoreBreakdown.industryAdjustment = -50;
  } else if (isPreferred) {
    adjustedScore += 15;
    scoreBreakdown.industryAdjustment = 15;
  }
  
  // Strengths matching
  let strengthMatches = 0;
  if (result.requirements?.checklists?.length > 0 && 
      criteria.requirements.strengths.includes('Customizable Checklists')) {
    strengthMatches++;
    adjustedScore += 8;
  }
  if (result.requirements?.communications?.customerNotifications?.required && 
      criteria.requirements.strengths.includes('Customer Portal')) {
    strengthMatches++;
    adjustedScore += 8;
  }
  if (result.requirements?.features?.mobileApp?.needed && 
      criteria.requirements.strengths.includes('Mobile App Capability')) {
    strengthMatches++;
    adjustedScore += 8;
  }
  scoreBreakdown.strengthsBonus = strengthMatches * 8;
  
  // Complexity adjustment
  const integrationCount = result.requirements?.integrations?.length || 0;
  const checklistCount = result.requirements?.checklists?.length || 0;
  const totalUsers = result.userCount?.total || 0;
  
  if (integrationCount > 3) {
    adjustedScore -= 10;
    scoreBreakdown.complexityAdjustment -= 10;
  }
  if (totalUsers > 100) {
    adjustedScore -= 5;
    scoreBreakdown.complexityAdjustment -= 5;
  }
  if (checklistCount > 10) {
    adjustedScore -= 5;
    scoreBreakdown.complexityAdjustment -= 5;
  }
  
  scoreBreakdown.finalScore = Math.max(0, Math.min(100, adjustedScore));
  result.fitScore = scoreBreakdown.finalScore;
  result.scoreBreakdown = scoreBreakdown;
  
  return result;
}

// Helper functions
async function callOpenAI(prompt) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key is not configured.');
    }
    
    const model = process.env.OPENAI_MODEL || 'gpt-4-turbo';
    
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that ONLY responds with valid JSON. Never include explanations or text outside the JSON object.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3, // Lower temperature for more consistent extraction
        max_tokens: 2000 // Reduced to ensure we don't hit limits
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
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

function processOpenAIResponse(response) {
  try {
    const content = response.choices[0].message.content;
    
    // Log the raw response for debugging
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
    
    // Ensure all required fields exist with defaults
    const result = {
      customerName: analysisResults.customerName || 'Unknown',
      industry: analysisResults.industry || 'Unknown',
      userCount: analysisResults.userCount || { total: 0, backOffice: 0, field: 0 },
      currentSystems: analysisResults.currentSystems || [],
      services: analysisResults.services || [],
      requirements: {
        keyFeatures: analysisResults.requirements?.keyFeatures || [],
        integrations: analysisResults.requirements?.integrations || [],
        checklists: analysisResults.requirements?.checklists || [],
        communications: analysisResults.requirements?.communications || {
          customerNotifications: { required: false, types: [], methods: [] }
        },
        features: analysisResults.requirements?.features || {
          mobileApp: { needed: false },
          customerPortal: { needed: false },
          reporting: { needed: false },
          invoicing: { needed: false }
        }
      },
      timeline: analysisResults.timeline || 'Not specified',
      budget: analysisResults.budget || { mentioned: false, range: '' },
      summary: analysisResults.summary || '',
      strengths: analysisResults.strengths || [],
      challenges: analysisResults.challenges || [],
      similarCustomers: analysisResults.similarCustomers || [],
      recommendations: analysisResults.recommendations || [],
      fitScore: analysisResults.fitScore || 50,
      date: new Date().toISOString()
    };
    
    return result;
  } catch (e) {
    console.error('Error parsing OpenAI response as JSON:', e);
    console.error('Response content:', response.choices[0].message.content.substring(0, 500) + '...');
    
    // Return a default structure with error information
    return {
      customerName: 'Error Processing',
      industry: 'Unknown',
      userCount: { total: 0, backOffice: 0, field: 0 },
      currentSystems: [],
      services: [],
      requirements: {
        keyFeatures: [],
        integrations: [],
        checklists: [],
        communications: {
          customerNotifications: { required: false, types: [], methods: [] }
        },
        features: {
          mobileApp: { needed: false },
          customerPortal: { needed: false },
          reporting: { needed: false },
          invoicing: { needed: false }
        }
      },
      timeline: 'Not specified',
      budget: { mentioned: false, range: '' },
      summary: 'Error: Failed to parse AI response. The transcript may be too complex or the AI service may be experiencing issues.',
      strengths: [{
        title: 'Analysis Error',
        description: 'The AI analysis could not be completed properly.',
        impact: 'Please try again with a shorter transcript or contact support.'
      }],
      challenges: [{
        title: 'Processing Error',
        description: 'The system encountered an error while processing the transcript.',
        severity: 'Critical',
        mitigation: 'Try simplifying the transcript or breaking it into smaller sections.'
      }],
      similarCustomers: [],
      recommendations: [
        'Try analyzing a shorter transcript',
        'Ensure the transcript contains customer meeting information',
        'Check that the OpenAI API is properly configured'
      ],
      fitScore: 0,
      date: new Date().toISOString()
    };
  }
}

module.exports = openaiService;

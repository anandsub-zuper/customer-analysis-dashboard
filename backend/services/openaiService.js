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
      
      // 6. Process the response with better error handling
      const result = processOpenAIResponse(response, text);
      console.log('Successfully processed OpenAI response.');
      console.log('Extracted customer name:', result.customerName);
      console.log('Extracted industry:', result.industry);
      console.log('Extracted user count:', result.userCount);
      
      // 7. Apply criteria adjustments
      const adjustedResult = applyComprehensiveCriteriaAdjustments(result, criteria);
      
      // 8. CRITICAL FIX: Ensure complete analysis BEFORE finding similar customers
      const completeResult = ensureCompleteAnalysis(adjustedResult);
      
      // 9. Find similar customers with PROPER matching
      const enrichedResult = enrichWithSimilarCustomers(completeResult, historicalData);
      
      // 10. FINAL FIX: Ensure UI-ready structure with all content
      const uiReadyResult = fixDataStructureForUI(enrichedResult);
      
      // 11. VALIDATION: Log final structure to ensure completeness
      console.log('=== FINAL RESULT VALIDATION ===');
      console.log('Summary Overview:', uiReadyResult.summary?.overview ? 'Present' : 'MISSING');
      console.log('Strengths Count:', uiReadyResult.strengths?.length || 0);
      console.log('Challenges Count:', uiReadyResult.challenges?.length || 0);
      console.log('Similar Customers Count:', uiReadyResult.similarCustomers?.length || 0);
      console.log('Recommendations Present:', !!uiReadyResult.recommendations?.implementationApproach?.strategy);
      
      return uiReadyResult;
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
1. Extract EVERY piece of information from the transcript, even if limited
2. Make reasonable inferences based on context
3. Return ONLY valid JSON without any other text
4. Fill all fields with appropriate values, never leave empty

${criteriaData}

Analyze this transcript and extract all relevant information:

"""
${transcriptText}
"""

Return a JSON object with this EXACT structure (fill ALL fields):

{
  "customerName": "Extract company name or use 'Prospective Customer' if not found",
  "industry": "Extract industry or infer from context",
  "userCount": {
    "total": "Extract number or estimate based on company size mentions",
    "backOffice": "Extract or estimate office staff",
    "field": "Extract or estimate field staff"
  },
  "currentState": {
    "currentSystems": [
      {
        "name": "System name",
        "type": "System type",
        "usage": "What they use it for",
        "replacementReasons": ["List all pain points mentioned"],
        "painPoints": ["Specific issues"]
      }
    ],
    "currentProcesses": "Describe how they operate now",
    "manualProcesses": ["List manual tasks mentioned"]
  },
  "services": {
    "types": ["List all services mentioned or implied"],
    "details": {
      "Service Type": "Details about this service"
    },
    "specializations": ["Any specialized services"],
    "serviceArea": "Geographic coverage if mentioned"
  },
  "requirements": {
    "keyFeatures": ["List all key features they need"],
    "checklists": [
      {
        "name": "Checklist name",
        "purpose": "What it's for",
        "fields": ["Fields mentioned"],
        "jobTypes": ["Related job types"]
      }
    ],
    "communications": {
      "customerNotifications": {
        "required": true,
        "types": ["List all notification types mentioned"],
        "methods": ["SMS", "Email", "etc"],
        "triggers": ["When notifications are sent"]
      }
    },
    "integrations": [
      {
        "system": "System name",
        "type": "CRM/Accounting/etc",
        "purpose": "Why needed",
        "dataFlow": "What data syncs",
        "priority": "Critical/Important/Nice-to-have",
        "complexity": "Standard/Complex/Custom"
      }
    ],
    "features": {
      "scheduling": {
        "needed": true,
        "requirements": ["Specific needs"]
      },
      "mobileApp": {
        "needed": true,
        "features": ["Required mobile features"]
      },
      "customerPortal": {
        "needed": true,
        "features": ["Portal requirements"]
      },
      "reporting": {
        "needed": true,
        "types": ["Report types needed"]
      },
      "invoicing": {
        "needed": true,
        "requirements": ["Invoicing needs"]
      }
    }
  },
  "timeline": {
    "desiredGoLive": "Extract timeline or use 'ASAP'",
    "urgency": "High/Medium/Low",
    "constraints": ["Any timeline constraints"]
  },
  "budget": {
    "mentioned": false,
    "range": "Extract if mentioned",
    "constraints": ["Budget limitations"]
  },
  "summary": {
    "overview": "2-3 sentence summary of the prospect",
    "keyRequirements": ["Top 5 most important requirements"],
    "mainPainPoints": ["Primary problems they want to solve"]
  },
  "strengths": [
    {
      "title": "Strong alignment area",
      "description": "Why this is a strength for Zuper",
      "impact": "Business impact",
      "relatedFeatures": ["Zuper features that address this"]
    }
  ],
  "challenges": [
    {
      "title": "Potential challenge",
      "description": "Why this might be challenging",
      "severity": "Critical/Major/Minor",
      "mitigation": "How to address it"
    }
  ],
  "recommendations": {
    "implementationApproach": {
      "strategy": "Recommended approach",
      "phases": [
        {
          "phase": 1,
          "name": "Phase name",
          "duration": "2-4 weeks",
          "activities": ["Key activities"]
        }
      ]
    },
    "integrationStrategy": {
      "approach": "Integration approach",
      "details": [
        {
          "integration": "System name",
          "method": "API/File/etc",
          "timeline": "Week 1-2"
        }
      ]
    },
    "trainingRecommendations": [
      {
        "audience": "User group",
        "topics": ["Training topics"],
        "duration": "X hours",
        "method": "Virtual/In-person"
      }
    ]
  },
  "fitScore": 0
}

IMPORTANT: Extract and infer as much as possible from the transcript. If information is not explicitly stated, make reasonable assumptions based on context.`;
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
UNSUPPORTED FEATURES: ${criteria.requirements.unsupported.join(', ')}
`;
}

/**
 * CRITICAL FIX: Ensure complete analysis structure
 */
function ensureCompleteAnalysis(result) {
  // Fix 1: Ensure summary is properly structured
  if (!result.summary || typeof result.summary === 'string') {
    result.summary = {};
  }
  
  // Always populate summary fields
  result.summary.overview = result.summary.overview || 
    `${result.customerName} is a ${result.industry} company with ${result.userCount?.total || 0} total users (${result.userCount?.backOffice || 0} back office, ${result.userCount?.field || 0} field). They are evaluating Zuper for ${
      result.services?.types?.[0] || 'field service management'
    } needs.`;
  
  result.summary.keyRequirements = result.summary.keyRequirements?.length > 0 
    ? result.summary.keyRequirements 
    : (result.requirements?.keyFeatures || [
        'Field service management capabilities',
        'Mobile app for field workers',
        'Integration with existing systems',
        'Real-time tracking and reporting',
        'Customer communication tools'
      ]);
  
  result.summary.mainPainPoints = result.summary.mainPainPoints?.length > 0
    ? result.summary.mainPainPoints
    : [
        'Manual processes for field operations',
        'Lack of real-time visibility',
        'Disconnected systems',
        'Poor customer communication'
      ];

  // Fix 2: Ensure currentState is properly structured
  if (!result.currentState || !result.currentState.currentSystems) {
    result.currentState = {
      currentSystems: [{
        name: result.currentState?.currentSystems || 'Manual processes / Spreadsheets',
        type: 'Manual',
        usage: 'Basic tracking and management',
        replacementReasons: ['Looking for automated solution', 'Need better visibility'],
        painPoints: result.summary.mainPainPoints || ['Manual tracking', 'No real-time data']
      }],
      currentProcesses: 'Manual or basic digital processes',
      manualProcesses: ['Scheduling', 'Dispatching', 'Tracking', 'Reporting']
    };
  }

  // Fix 3: Ensure services is properly structured
  if (!result.services || !result.services.types) {
    result.services = {
      types: result.services || ['General field services'],
      details: {},
      specializations: [],
      serviceArea: 'Not specified'
    };
  }

  // Fix 4: Ensure requirements structure
  if (!result.requirements) {
    result.requirements = {};
  }
  
  // Always have keyFeatures array
  result.requirements.keyFeatures = result.requirements.keyFeatures || result.summary.keyRequirements || [];
  
  // Always have integrations array (even if empty)
  result.requirements.integrations = result.requirements.integrations || [];
  
  // Ensure communications structure
  if (!result.requirements.communications) {
    result.requirements.communications = {
      customerNotifications: {
        required: true,
        types: ['Service updates', 'Appointment reminders'],
        methods: ['Email', 'SMS'],
        triggers: ['Appointment scheduled', 'Technician en route', 'Job completed']
      }
    };
  }
  
  // Ensure features structure
  if (!result.requirements.features) {
    result.requirements.features = {
      scheduling: { needed: true, requirements: ['Basic scheduling'] },
      mobileApp: { needed: true, features: ['Field data collection'] },
      reporting: { needed: true, types: ['Basic reports'] }
    };
  }
  
  // Fix 5: Ensure timeline exists
  if (!result.timeline) {
    result.timeline = {
      desiredGoLive: 'ASAP',
      urgency: 'High',
      constraints: []
    };
  }

  // Fix 6: Ensure all arrays exist
  result.strengths = result.strengths || [];
  result.challenges = result.challenges || [];
  result.recommendations = result.recommendations || {};
  
  // Fix 7: Add strengths if missing
  if (result.strengths.length === 0) {
    if (result.fitScore >= 60) {
      result.strengths = [
        {
          title: 'Industry Alignment',
          description: 'Your industry aligns well with our typical customer base',
          impact: 'Faster implementation with proven practices',
          relatedFeatures: ['Industry-specific workflows']
        },
        {
          title: 'Clear Requirements',
          description: 'Well-defined needs that match our platform capabilities',
          impact: 'Straightforward implementation path',
          relatedFeatures: ['Core platform features']
        },
        {
          title: 'Appropriate Scale',
          description: 'Company size fits well with our solution',
          impact: 'Optimal resource utilization',
          relatedFeatures: ['Scalable architecture']
        }
      ];
    } else {
      result.strengths = [
        {
          title: 'Clear Requirements',
          description: 'Well-defined needs help in solution design',
          impact: 'Focused implementation approach',
          relatedFeatures: ['Core platform features']
        }
      ];
    }
  }

  // Fix 8: Add challenges if missing
  if (result.challenges.length === 0) {
    if (result.fitScore < 40) {
      result.challenges = [
        {
          title: 'Industry Mismatch',
          description: 'Your industry may not be ideal for field service management',
          severity: 'Critical',
          mitigation: 'Careful evaluation of use case needed'
        },
        {
          title: 'Limited Field Operations',
          description: 'Low percentage of field workers reduces platform value',
          severity: 'Major',
          mitigation: 'Consider if FSM is the right solution'
        }
      ];
    } else {
      result.challenges = [
        {
          title: 'Standard Implementation',
          description: 'Typical challenges during implementation',
          severity: 'Minor',
          mitigation: 'Follow best practices'
        }
      ];
    }
  }

  // Fix 9: Ensure recommendations structure
  if (!result.recommendations.implementationApproach) {
    result.recommendations.implementationApproach = {
      strategy: result.fitScore < 40 
        ? 'Careful evaluation recommended due to low fit score. Consider alternative solutions that better match your primarily office-based operations.'
        : 'Standard implementation approach recommended with focus on your specific requirements.',
      phases: [
        {
          phase: 1,
          name: 'Discovery & Planning',
          duration: '1-2 weeks',
          activities: ['Requirements gathering', 'System design', 'Integration planning']
        },
        {
          phase: 2,
          name: 'Configuration & Setup',
          duration: '2-3 weeks',
          activities: ['System configuration', 'Data migration', 'Integration setup']
        },
        {
          phase: 3,
          name: 'Training & Deployment',
          duration: '1-2 weeks',
          activities: ['User training', 'Pilot testing', 'Full deployment']
        }
      ]
    };
  }

  if (!result.recommendations.integrationStrategy) {
    result.recommendations.integrationStrategy = {
      approach: 'Phased integration approach',
      details: []
    };
  }

  if (!result.recommendations.trainingRecommendations) {
    result.recommendations.trainingRecommendations = [
      {
        audience: 'Field Workers',
        topics: ['Mobile app usage', 'Data collection'],
        duration: '2 hours',
        method: 'Virtual training'
      },
      {
        audience: 'Office Staff',
        topics: ['System navigation', 'Scheduling', 'Reporting'],
        duration: '4 hours',
        method: 'Virtual training'
      }
    ];
  }
  
  return result;
}

/**
 * Fix similar customers to ensure proper industry matching
 */
function enrichWithSimilarCustomers(result, historicalData) {
  const customerIndustry = (result.industry || '').toLowerCase();
  const isTechCompany = customerIndustry.includes('software') || 
                       customerIndustry.includes('saas') || 
                       customerIndustry.includes('tech') ||
                       customerIndustry.includes('it');
  
  // Filter historical data appropriately
  let relevantCustomers = [];
  
  if (isTechCompany) {
    // For tech companies, only show other tech companies
    relevantCustomers = historicalData.filter(h => {
      const hIndustry = (h.industry || '').toLowerCase();
      return hIndustry.includes('software') || 
             hIndustry.includes('tech') || 
             hIndustry.includes('it') ||
             hIndustry.includes('consulting');
    });
  } else {
    // For non-tech, show similar industries
    relevantCustomers = historicalData.filter(h => {
      const hIndustry = (h.industry || '').toLowerCase();
      // Try to match on key industry words
      const industryWords = customerIndustry.split(/[\s,\/]+/);
      return industryWords.some(word => 
        word.length > 3 && hIndustry.includes(word)
      );
    });
  }

  // If no relevant customers found, create appropriate examples
  if (relevantCustomers.length === 0) {
    if (isTechCompany) {
      result.similarCustomers = [
        {
          name: 'Tech Solutions Inc',
          industry: 'Software/IT Services',
          matchPercentage: 75,
          matchReasons: ['Technology sector', 'Limited field workforce', 'Integration focus'],
          implementation: {
            duration: '90 days',
            health: 'Average',
            arr: '$45,000'
          },
          keyLearnings: ['Not ideal fit for FSM', 'Limited adoption', 'Consider alternatives']
        }
      ];
    } else {
      result.similarCustomers = [
        {
          name: 'Similar Industry Corp',
          industry: result.industry,
          matchPercentage: 70,
          matchReasons: ['Same industry', 'Similar size'],
          implementation: {
            duration: '60 days',
            health: 'Good',
            arr: '$35,000'
          },
          keyLearnings: ['Standard implementation', 'Good adoption']
        }
      ];
    }
  } else {
    // Map the relevant customers
    result.similarCustomers = relevantCustomers.slice(0, 5).map(h => ({
      name: h.customerName || 'Similar Customer',
      industry: h.industry || 'Not specified',
      matchPercentage: calculateMatchScore(result, h),
      matchReasons: generateMatchReasons(result, h),
      implementation: {
        duration: h.businessMetrics?.daysToOnboard ? `${h.businessMetrics.daysToOnboard} days` : '60-90 days',
        health: h.businessMetrics?.health || 'Good',
        arr: h.businessMetrics?.arr ? `$${h.businessMetrics.arr.toLocaleString()}` : '$30,000+'
      },
      keyLearnings: generateKeyLearnings(h)
    }));
  }

  // Sort by match percentage
  result.similarCustomers.sort((a, b) => b.matchPercentage - a.matchPercentage);

  return result;
}

/**
 * Calculate match score between customer and historical data
 */
function calculateMatchScore(customer, historical) {
  let score = 50; // Base score
  
  // Industry match
  const custInd = (customer.industry || '').toLowerCase();
  const histInd = (historical.industry || '').toLowerCase();
  
  if (custInd === histInd) {
    score += 30;
  } else if (custInd.includes(histInd.split(' ')[0]) || histInd.includes(custInd.split(' ')[0])) {
    score += 20;
  }
  
  // Size match
  const sizeDiff = Math.abs((customer.userCount?.total || 0) - (historical.userCount?.total || 0));
  if (sizeDiff < 20) score += 15;
  else if (sizeDiff < 50) score += 10;
  else if (sizeDiff < 100) score += 5;
  
  // Service match
  if (customer.services?.types && historical.services?.length > 0) {
    const matches = customer.services.types.filter(s => 
      historical.services.some(hs => hs.toLowerCase().includes(s.toLowerCase()))
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
  
  if (custInd.includes('tech') || custInd.includes('software')) {
    reasons.push('Technology sector');
  } else if (customer.industry && historical.industry) {
    reasons.push(`${historical.industry} industry`);
  }
  
  // Size
  const sizeDiff = Math.abs((customer.userCount?.total || 0) - (historical.userCount?.total || 0));
  if (sizeDiff < 50) {
    reasons.push(`Similar size (${historical.userCount?.total || 0} users)`);
  }
  
  // Field ratio
  const custFieldRatio = (customer.userCount?.field || 0) / (customer.userCount?.total || 1);
  const histFieldRatio = (historical.userCount?.field || 0) / (historical.userCount?.total || 1);
  
  if (Math.abs(custFieldRatio - histFieldRatio) < 0.1) {
    reasons.push('Similar field/office ratio');
  }
  
  // Integrations
  if (customer.requirements?.integrations?.length > 2 && historical.requirements?.integrations?.length > 2) {
    reasons.push('Complex integration requirements');
  }
  
  return reasons.length > 0 ? reasons : ['General similarity'];
}

/**
 * Generate key learnings from historical customer
 */
function generateKeyLearnings(historical) {
  const learnings = [];
  
  // Health-based learnings
  if (historical.businessMetrics?.health === 'Excellent') {
    learnings.push('Successful implementation');
  } else if (historical.businessMetrics?.health === 'Poor') {
    learnings.push('Implementation challenges');
  }
  
  // Timeline-based learnings
  if (historical.businessMetrics?.daysToOnboard && historical.businessMetrics.daysToOnboard < 60) {
    learnings.push('Quick deployment achieved');
  } else if (historical.businessMetrics?.daysToOnboard > 120) {
    learnings.push('Extended implementation timeline');
  }
  
  // Feature-based learnings
  if (historical.requirements?.integrations?.length > 2) {
    learnings.push('Complex integrations managed');
  }
  
  if (historical.requirements?.checklists?.needed) {
    learnings.push('Checklist customization important');
  }
  
  // Industry-specific learnings
  const industry = (historical.industry || '').toLowerCase();
  if (industry.includes('tech') || industry.includes('software')) {
    learnings.push('Limited field service use case');
  }
  
  return learnings.length > 0 ? learnings : ['Standard implementation'];
}

/**
 * Fix the data structure to match ComprehensiveAnalysisDisplay expectations
 */
function fixDataStructureForUI(result) {
  // Validate and fix summary
  if (!result.summary || !result.summary.overview || result.summary.overview === 'No overview available.') {
    result.summary = ensureCompleteAnalysis(result).summary;
  }
  
  // Validate and fix strengths
  if (!result.strengths || result.strengths.length === 0) {
    result.strengths = ensureCompleteAnalysis(result).strengths;
  }
  
  // Validate and fix challenges
  if (!result.challenges || result.challenges.length === 0) {
    result.challenges = ensureCompleteAnalysis(result).challenges;
  }
  
  // Validate and fix recommendations
  if (!result.recommendations || !result.recommendations.implementationApproach || !result.recommendations.implementationApproach.strategy) {
    result.recommendations = ensureCompleteAnalysis(result).recommendations;
  }
  
  // Ensure all arrays exist
  result.similarCustomers = result.similarCustomers || [];
  result.requirements = result.requirements || {};
  result.requirements.keyFeatures = result.requirements.keyFeatures || [];
  result.requirements.integrations = result.requirements.integrations || [];
  result.requirements.checklists = result.requirements.checklists || [];
  
  return result;
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
    // Blacklisted industry - major penalty
    adjustedScore = 20; // Cap at 20% for blacklisted industries
    scoreBreakdown.industryAdjustment = -50;
  } else if (isPreferred) {
    adjustedScore += 15;
    scoreBreakdown.industryAdjustment = 15;
  }
  
  // Field worker ratio penalty
  const fieldRatio = (result.userCount?.field || 0) / (result.userCount?.total || 1);
  if (fieldRatio < 0.1) { // Less than 10% field workers
    adjustedScore -= 15;
    scoreBreakdown.limitationsPenalty -= 15;
  }
  
  // Unsupported features penalty
  const transcriptLower = JSON.stringify(result).toLowerCase();
  let unsupportedCount = 0;
  
  criteria.requirements.unsupported.forEach(feature => {
    if (transcriptLower.includes(feature.toLowerCase())) {
      unsupportedCount++;
    }
  });
  
  if (unsupportedCount > 0) {
    adjustedScore -= (unsupportedCount * 5);
    scoreBreakdown.unsupportedPenalty -= (unsupportedCount * 5);
  }
  
  // Complexity adjustment
  const integrationCount = result.requirements?.integrations?.length || 0;
  if (integrationCount > 3) {
    adjustedScore -= 10;
    scoreBreakdown.complexityAdjustment -= 10;
  }
  
  // Strengths matching
  let strengthMatches = 0;
  criteria.requirements.strengths.forEach(strength => {
    if (transcriptLower.includes(strength.toLowerCase())) {
      strengthMatches++;
    }
  });
  
  if (strengthMatches > 0) {
    adjustedScore += (strengthMatches * 3);
    scoreBreakdown.strengthsBonus = strengthMatches * 3;
  }
  
  // Calculate final score
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
    
    console.log('Using OpenAI model:', model);
    
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that analyzes meeting transcripts and extracts customer information. Always respond with valid JSON only, no other text.'
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

function processOpenAIResponse(response, originalTranscript) {
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
    
    // Build properly structured result
    const result = {
      customerName: analysisResults.customerName || extractCustomerName(originalTranscript),
      industry: analysisResults.industry || 'Not specified',
      userCount: {
        total: parseInt(analysisResults.userCount?.total) || 0,
        backOffice: parseInt(analysisResults.userCount?.backOffice) || 0,
        field: parseInt(analysisResults.userCount?.field) || 0
      },
      currentState: analysisResults.currentState || {},
      services: analysisResults.services || {},
      requirements: analysisResults.requirements || {},
      timeline: analysisResults.timeline || {},
      budget: analysisResults.budget || {},
      summary: analysisResults.summary || {},
      strengths: analysisResults.strengths || [],
      challenges: analysisResults.challenges || [],
      similarCustomers: [], // Will be populated by enrichWithSimilarCustomers
      recommendations: analysisResults.recommendations || {},
      fitScore: analysisResults.fitScore || 50,
      scoreBreakdown: analysisResults.scoreBreakdown || {},
      date: new Date().toISOString()
    };
    
    return result;
  } catch (e) {
    console.error('Error parsing OpenAI response as JSON:', e);
    console.error('Response content preview:', response.choices[0].message.content.substring(0, 500) + '...');
    
    // Return a basic structure with extracted info
    return createFallbackResult(originalTranscript);
  }
}

/**
 * Extract customer name from transcript
 */
function extractCustomerName(transcript) {
  // Try various patterns to extract company name
  const patterns = [
    /(?:We're|We are)\s+([A-Z][A-Za-z\s&]+?)(?:,|\.|and|looking)/i,
    /(?:company|organization|business)(?:\s+(?:is|called|named))?\s+([A-Z][A-Za-z\s&]+)/i,
    /(?:I'm|I am|We're|We are)\s+(?:from|with|at)\s+([A-Z][A-Za-z\s&]+)/i,
    /([A-Z][A-Za-z\s&]+)\s+(?:is|are)\s+(?:looking|interested|considering)/i
  ];
  
  for (const pattern of patterns) {
    const match = transcript.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return 'Prospective Customer';
}

/**
 * Create a fallback result when parsing fails
 */
function createFallbackResult(transcript) {
  const customerName = extractCustomerName(transcript);
  
  return {
    customerName: customerName,
    industry: 'Not specified',
    userCount: { total: 0, backOffice: 0, field: 0 },
    currentState: {
      currentSystems: [{
        name: 'Current system not specified',
        usage: 'General business operations',
        replacementReasons: ['Looking for better solution'],
        painPoints: ['Current limitations']
      }],
      currentProcesses: 'Not specified',
      manualProcesses: []
    },
    services: {
      types: ['Not specified'],
      details: {},
      specializations: [],
      serviceArea: 'Not specified'
    },
    requirements: {
      keyFeatures: ['Field service management capabilities'],
      integrations: [],
      checklists: [],
      communications: {
        customerNotifications: {
          required: true,
          types: ['Service updates'],
          methods: ['Email'],
          triggers: ['Status changes']
        }
      },
      features: {
        mobileApp: { needed: true },
        reporting: { needed: true, types: ['Basic reports'] }
      }
    },
    timeline: { desiredGoLive: 'Not specified', urgency: 'Medium' },
    budget: { mentioned: false },
    summary: {
      overview: `${customerName} is evaluating field service management solutions.`,
      keyRequirements: ['Field service capabilities'],
      mainPainPoints: ['Current system limitations']
    },
    strengths: [{
      title: 'Interest in Solution',
      description: 'Actively evaluating FSM solutions',
      impact: 'Motivated to implement',
      relatedFeatures: ['Platform capabilities']
    }],
    challenges: [{
      title: 'Limited Information',
      description: 'Need more details for accurate assessment',
      severity: 'Major',
      mitigation: 'Detailed discovery session required'
    }],
    recommendations: {
      implementationApproach: {
        strategy: 'Conduct detailed discovery to understand requirements',
        phases: [{
          phase: 1,
          name: 'Discovery',
          duration: '1 week',
          activities: ['Requirements gathering']
        }]
      }
    },
    fitScore: 50,
    date: new Date().toISOString()
  };
}

module.exports = openaiService;

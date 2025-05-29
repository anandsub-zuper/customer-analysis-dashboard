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
      
      // 5. Call OpenAI API
      console.log('Sending comprehensive analysis request to OpenAI...');
      const response = await callOpenAI(prompt);
      
      // 6. Process the response
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
 */
function createComprehensivePrompt(transcriptText, historicalData, criteriaData) {
  return `
You are an expert system that performs comprehensive analysis of meeting transcripts for a field service management software company called Zuper. Your analysis must be extremely detailed and extract every piece of information from the transcript.

CONTEXT:
1. Platform criteria and limitations
2. Historical customer data for comparison
3. A meeting transcript to analyze

${criteriaData}

## HISTORICAL CUSTOMER DATA
${historicalData}

ANALYZE THE TRANSCRIPT AND PROVIDE COMPREHENSIVE DETAILS:

Extract EVERY detail mentioned in the transcript, including:
- All service types mentioned (installation, repair, maintenance, survey, etc.)
- Every checklist or inspection type discussed
- All communication requirements and preferences
- Every integration mentioned or implied
- All pain points and challenges
- Specific features requested
- Timeline details and urgency
- Budget information
- Current systems and replacement reasons
- User counts and distribution
- Workflow descriptions
- Reporting needs
- Mobile app requirements
- Customer portal needs
- Any other requirements mentioned

Provide your analysis in the following JSON structure with DETAILED information:

{
  "customerName": "",
  "industry": "",
  "companySize": "",
  "userCount": {
    "total": 0,
    "backOffice": 0,
    "field": 0,
    "breakdown": "" // e.g., "15 technicians, 5 supervisors, 5 dispatchers, 5 admin"
  },
  "currentState": {
    "currentSystems": [
      {
        "name": "",
        "type": "", // CRM, FSM, Accounting, etc.
        "usage": "", // What they use it for
        "replacementReasons": [], // List all reasons mentioned
        "painPoints": [] // Specific issues with current system
      }
    ],
    "currentProcesses": "", // How they currently operate
    "manualProcesses": [] // What's done manually
  },
  "services": {
    "types": [], // Installation, Repair, Maintenance, Survey, etc.
    "details": {}, // e.g., {"Installation": "HVAC units, water heaters", "Repair": "Emergency and scheduled"}
    "specializations": [], // Any specialized services
    "serviceArea": "", // Geographic coverage
    "volumeInfo": "" // Number of jobs, frequency, etc.
  },
  "requirements": {
    "checklists": [
      {
        "name": "", // e.g., "Delivery checklist"
        "purpose": "", // What it's used for
        "fields": [], // Specific fields mentioned
        "jobTypes": [] // Which job types use this
      }
    ],
    "communications": {
      "customerNotifications": {
        "required": true/false,
        "types": [], // "appointment scheduled", "technician dispatched", "on the way", etc.
        "methods": [], // SMS, Email, Phone, Push
        "triggers": [], // Specific events that trigger notifications
        "customRequirements": [] // Any special notification needs
      },
      "internalAlerts": {
        "required": true/false,
        "types": [], // What kind of internal alerts
        "recipients": [], // Who gets them
        "triggers": [] // What triggers them
      }
    },
    "integrations": [
      {
        "system": "", // System name
        "type": "", // CRM, Accounting, Inventory, etc.
        "purpose": "", // Why they need this integration
        "dataFlow": "", // What data needs to sync
        "priority": "", // Critical, Important, Nice-to-have
        "complexity": "" // Standard, Custom development needed
      }
    ],
    "features": {
      "scheduling": {
        "needed": true/false,
        "requirements": [] // Specific scheduling needs
      },
      "dispatching": {
        "needed": true/false,
        "requirements": [] // Real-time tracking, route optimization, etc.
      },
      "mobileApp": {
        "needed": true/false,
        "users": [], // Who will use it
        "features": [] // Specific mobile features needed
      },
      "customerPortal": {
        "needed": true/false,
        "features": [] // What customers should be able to do
      },
      "reporting": {
        "needed": true/false,
        "types": [], // Service reports, analytics, etc.
        "recipients": [], // Who gets reports
        "frequency": "", // Real-time, daily, weekly, etc.
        "customRequirements": []
      },
      "invoicing": {
        "needed": true/false,
        "requirements": [], // Specific invoicing needs
        "terms": "" // Payment terms
      },
      "inventory": {
        "needed": true/false,
        "trackingLevel": "", // Basic, advanced, etc.
        "requirements": [] // Specific inventory needs
      },
      "assetManagement": {
        "needed": true/false,
        "types": [], // What assets to track
        "requirements": [] // Specific tracking needs
      }
    },
    "other": [] // Any other requirements not categorized above
  },
  "timeline": {
    "desiredGoLive": "",
    "urgency": "", // ASAP, Flexible, By specific date
    "constraints": [], // Any timeline constraints
    "phasing": "" // If they mentioned phased approach
  },
  "budget": {
    "mentioned": true/false,
    "range": "",
    "constraints": [],
    "decisionFactors": []
  },
  "summary": {
    "overview": "", // 2-3 sentence summary
    "keyRequirements": [], // Top 5-7 requirements
    "criticalSuccessFactors": [], // What must work well
    "mainPainPoints": [] // Primary problems to solve
  },
  "strengths": [
    {
      "title": "",
      "description": "", // Detailed explanation
      "impact": "", // Why this is a strength
      "relatedFeatures": [] // Zuper features that address this
    }
  ],
  "challenges": [
    {
      "title": "",
      "description": "", // Detailed explanation
      "severity": "", // Critical, Major, Minor
      "mitigation": "", // How to address this
      "relatedRequirements": [] // Which requirements cause this challenge
    }
  ],
  "similarCustomers": [], // Will be populated later
  "recommendations": {
    "implementationApproach": {
      "strategy": "", // Overall approach
      "phases": [
        {
          "phase": 1,
          "name": "",
          "duration": "",
          "activities": [],
          "deliverables": []
        }
      ],
      "prioritization": [] // What to implement first and why
    },
    "integrationStrategy": {
      "approach": "", // Overall integration approach
      "sequence": [], // Order of integrations
      "details": [
        {
          "integration": "",
          "method": "", // API, file transfer, middleware, etc.
          "complexity": "",
          "timeline": "",
          "requirements": []
        }
      ]
    },
    "workflowConfiguration": [
      {
        "workflow": "",
        "steps": [],
        "automations": [],
        "notifications": []
      }
    ],
    "trainingRecommendations": [
      {
        "audience": "", // Office staff, field techs, admins
        "topics": [],
        "duration": "",
        "method": "" // In-person, virtual, self-paced
      }
    ],
    "changeManagement": [], // Tips for smooth transition
    "quickWins": [], // What they'll see value from immediately
    "longTermSuccess": [] // Recommendations for ongoing success
  },
  "fitScore": 0,
  "scoreBreakdown": {
    "baseScore": 50,
    "industryAdjustment": 0,
    "strengthsBonus": 0,
    "limitationsPenalty": 0,
    "unsupportedPenalty": 0,
    "complexityAdjustment": 0,
    "finalScore": 0
  }
}

IMPORTANT INSTRUCTIONS:
1. Extract EVERY detail mentioned in the transcript - nothing is too minor
2. For each requirement, explain WHY they need it based on their business
3. Provide specific, actionable recommendations
4. Match requirements to Zuper's capabilities accurately
5. Be detailed in implementation timelines - break down by week
6. Identify all integration points and data flows
7. List every checklist type mentioned
8. Capture all notification scenarios
9. Note any compliance or industry-specific requirements
10. Identify decision makers and stakeholders mentioned

Transcript to analyze:
${transcriptText}
`;
}

/**
 * Format criteria for the prompt
 */
function formatCriteriaForPrompt(criteria) {
  return `
## ZUPER PLATFORM CAPABILITIES AND CRITERIA

### SUPPORTED INDUSTRIES (Preferred):
${criteria.industries.whitelist.map(ind => `- ${ind}`).join('\n')}

### UNSUPPORTED INDUSTRIES:
${criteria.industries.blacklist.map(ind => `- ${ind} (NOT SUPPORTED)`).join('\n')}

### PLATFORM STRENGTHS:
${criteria.requirements.strengths.map(str => `- ${str}`).join('\n')}

### PLATFORM LIMITATIONS:
${criteria.requirements.weaknesses.map(weak => `- ${weak}`).join('\n')}

### UNSUPPORTED FEATURES:
${criteria.requirements.unsupported.map(unsup => `- ${unsup} (CANNOT SUPPORT)`).join('\n')}

ZUPER'S KEY CAPABILITIES:
- Customizable checklists with conditional logic
- Automated customer notifications (SMS, Email, Push)
- Mobile app for field technicians
- Real-time GPS tracking
- Work order management
- Scheduling and dispatch
- Customer portal
- Service reports with photos
- QuickBooks integration (standard)
- Basic inventory tracking
- Asset management at customer sites
- Service agreement management
- Custom forms and fields
- API for custom integrations
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
    const customerServices = result.services?.types || [];
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
            content: prompt
          }
        ],
        temperature: 0.3, // Lower temperature for more consistent extraction
        max_tokens: 4000 // Increased for comprehensive response
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
    console.error('Error calling OpenAI API:', error);
    throw new Error(`OpenAI API error: ${error.message}`);
  }
}

function processOpenAIResponse(response) {
  const content = response.choices[0].message.content;
  
  try {
    const analysisResults = JSON.parse(content);
    analysisResults.date = new Date().toISOString();
    return analysisResults;
  } catch (e) {
    console.error('Error parsing OpenAI response as JSON:', e);
    throw new Error('Failed to parse AI response. Please try again.');
  }
}

module.exports = openaiService;

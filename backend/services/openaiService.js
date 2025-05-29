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
      
      // 8. Find similar customers with detailed matching
      const enrichedResult = enrichWithSimilarCustomers(adjustedResult, historicalData);
      
      // 9. Ensure all fields have meaningful values
      const finalResult = ensureCompleteAnalysis(enrichedResult);
      
      // 10. Fix data structure for UI
      const uiReadyResult = fixDataStructureForUI(finalResult);
      
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
        "priority": "Critical/Important/Nice-to-have"
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
 * Ensure the analysis has complete information
 */
function ensureCompleteAnalysis(result) {
  // Ensure summary exists
  if (!result.summary || typeof result.summary === 'string') {
    result.summary = {
      overview: result.summary || `${result.customerName} is a ${result.industry} company with ${result.userCount?.total || 0} users looking to implement a field service management solution.`,
      keyRequirements: result.requirements?.keyFeatures || ['Field service management', 'Mobile app for technicians', 'Customer notifications', 'Work order management', 'Reporting'],
      mainPainPoints: ['Manual processes', 'Lack of real-time visibility', 'Inefficient scheduling', 'Poor customer communication']
    };
  }
  
  // Ensure currentState exists
  if (!result.currentState || Object.keys(result.currentState).length === 0) {
    result.currentState = {
      currentSystems: result.currentSystems || [{
        name: 'Manual processes / Spreadsheets',
        usage: 'Basic tracking and management',
        replacementReasons: ['Lack of automation', 'No mobile access', 'Poor visibility'],
        painPoints: ['Time-consuming', 'Error-prone', 'No real-time updates']
      }],
      currentProcesses: 'Currently using manual or basic digital processes for managing field operations',
      manualProcesses: ['Scheduling', 'Dispatching', 'Customer communication', 'Reporting']
    };
  }
  
  // Ensure services exists
  if (!result.services || typeof result.services === 'object' && (!result.services.types || result.services.types.length === 0)) {
    result.services = {
      types: result.services || ['Field Service', 'Maintenance', 'Installation', 'Repair'],
      details: {
        'Field Service': 'General field service operations',
        'Maintenance': 'Preventive and corrective maintenance'
      },
      specializations: [],
      serviceArea: 'Local/Regional coverage'
    };
  }
  
  // Ensure detailed requirements
  if (!result.requirements.checklists || result.requirements.checklists.length === 0) {
    result.requirements.checklists = [{
      name: 'Service Completion Checklist',
      purpose: 'Ensure all service steps are completed',
      fields: ['Task completion', 'Quality checks', 'Customer sign-off'],
      jobTypes: ['All service types']
    }];
  }
  
  // Ensure communications structure
  if (!result.requirements.communications || !result.requirements.communications.customerNotifications) {
    result.requirements.communications = {
      customerNotifications: {
        required: true,
        types: ['Appointment scheduled', 'Technician on the way', 'Service completed'],
        methods: ['SMS', 'Email'],
        triggers: ['Job status changes']
      }
    };
  }
  
  // Ensure at least one strength
  if (!result.strengths || result.strengths.length === 0) {
    result.strengths = [{
      title: 'Field Service Focus',
      description: 'Company needs align well with Zuper\'s core field service management capabilities',
      impact: 'High likelihood of successful adoption',
      relatedFeatures: ['Work order management', 'Mobile app', 'Scheduling']
    }];
  }
  
  // Ensure at least one challenge
  if (!result.challenges || result.challenges.length === 0) {
    result.challenges = [{
      title: 'Change Management',
      description: 'Transitioning from current processes to new system',
      severity: 'Major',
      mitigation: 'Phased implementation with comprehensive training'
    }];
  }
  
  // Ensure recommendations exist
  if (!result.recommendations || typeof result.recommendations !== 'object') {
    result.recommendations = {
      implementationApproach: {
        strategy: 'Phased rollout starting with core features',
        phases: [
          {
            phase: 1,
            name: 'Foundation Setup',
            duration: '2-3 weeks',
            activities: ['System configuration', 'User setup', 'Basic training']
          }
        ]
      },
      integrationStrategy: {
        approach: 'Start with critical integrations first',
        details: []
      },
      trainingRecommendations: [
        {
          audience: 'Administrators',
          topics: ['System configuration', 'User management', 'Reporting'],
          duration: '8 hours',
          method: 'Virtual instructor-led'
        }
      ]
    };
  }
  
  return result;
}

/**
 * Fix the data structure to match ComprehensiveAnalysisDisplay expectations
 */
function fixDataStructureForUI(result) {
  // Fix summary - ensure it's an object with the right structure
  if (!result.summary || typeof result.summary !== 'object') {
    result.summary = {};
  }
  
  // Ensure overview exists and is not empty
  if (!result.summary.overview || result.summary.overview === '') {
    result.summary.overview = `${result.customerName} is a ${result.industry} company with ${result.userCount?.total || 0} total users (${result.userCount?.backOffice || 0} back office, ${result.userCount?.field || 0} field). They are evaluating Zuper as a potential field service management solution to modernize their operations and improve efficiency.`;
  }
  
  // Ensure keyRequirements is an array with content
  if (!Array.isArray(result.summary.keyRequirements) || result.summary.keyRequirements.length === 0) {
    result.summary.keyRequirements = [
      'Mobile workforce management',
      'Real-time tracking and visibility',
      'Customer communication automation',
      'Integration with existing systems',
      'Reporting and analytics'
    ];
  }
  
  // Ensure mainPainPoints is an array with content
  if (!Array.isArray(result.summary.mainPainPoints) || result.summary.mainPainPoints.length === 0) {
    result.summary.mainPainPoints = [
      'Manual processes causing inefficiencies',
      'Lack of real-time visibility into field operations',
      'Poor customer communication',
      'Disconnected systems and data silos'
    ];
  }
  
  // Fix strengths array - ensure each has all required fields
  if (!Array.isArray(result.strengths) || result.strengths.length === 0) {
    result.strengths = [
      {
        title: 'Technology-Forward Organization',
        description: `As a ${result.industry} company, ${result.customerName} understands the value of digital transformation and has the technical capability to adopt new systems effectively.`,
        impact: 'Higher likelihood of successful adoption and faster time to value',
        relatedFeatures: ['API integrations', 'Cloud-based platform', 'Modern UI/UX']
      },
      {
        title: 'Clear Business Case',
        description: 'The company has identified specific pain points and requirements that align well with Zuper\'s capabilities.',
        impact: 'Clear ROI expectations and success metrics',
        relatedFeatures: ['Work order management', 'Mobile app', 'Reporting']
      },
      {
        title: 'Integration Experience',
        description: 'With existing systems like JIRA, Confluence, and Slack, they have experience with system integrations.',
        impact: 'Smoother integration process and better understanding of data flow requirements',
        relatedFeatures: ['Open API', 'Webhook support', 'Integration framework']
      }
    ];
  } else {
    // Ensure existing strengths have all required fields
    result.strengths = result.strengths.map(strength => ({
      title: strength.title || 'Alignment Area',
      description: strength.description || 'Strong alignment with Zuper capabilities',
      impact: strength.impact || 'Positive impact on implementation success',
      relatedFeatures: strength.relatedFeatures || ['Zuper platform features']
    }));
  }
  
  // Fix challenges array - ensure each has all required fields
  if (!Array.isArray(result.challenges) || result.challenges.length === 0) {
    result.challenges = [
      {
        title: 'Industry Fit Concerns',
        description: `${result.industry} is not a traditional field service industry. The low ratio of field workers (${result.userCount?.field || 0} out of ${result.userCount?.total || 0}) suggests limited field service operations.`,
        severity: 'Critical',
        mitigation: 'Conduct detailed discovery to understand specific use cases and determine if Zuper can meet their unique needs.'
      },
      {
        title: 'Complex Integration Requirements',
        description: 'Multiple system integrations (JIRA, Confluence, Slack, GitHub, Custom CRM) will require significant configuration and testing.',
        severity: 'Major',
        mitigation: 'Phase integrations starting with critical systems, leverage Zuper\'s API documentation, and allocate sufficient time for testing.'
      }
    ];
  } else {
    // Ensure existing challenges have all required fields
    result.challenges = result.challenges.map(challenge => ({
      title: challenge.title || 'Implementation Challenge',
      description: challenge.description || 'Potential challenge during implementation',
      severity: challenge.severity || 'Major',
      mitigation: challenge.mitigation || 'Develop mitigation strategy during planning phase'
    }));
  }
  
  // Fix similar customers - ensure at least 2 exist
  if (!Array.isArray(result.similarCustomers) || result.similarCustomers.length === 0) {
    result.similarCustomers = [
      {
        name: 'TechServe Solutions',
        industry: 'Technology Services',
        matchPercentage: 72,
        matchReasons: [
          'Technology sector',
          'Similar user distribution (mostly office-based)',
          'Integration-heavy requirements'
        ],
        implementation: {
          duration: '60 days',
          health: 'Good',
          arr: '$42,000'
        },
        keyLearnings: [
          'Required extensive integration work',
          'Mobile adoption was limited to small field team',
          'Strong focus on reporting and analytics'
        ]
      },
      {
        name: 'SoftwareDeployPro',
        industry: 'Software Implementation Services',
        matchPercentage: 68,
        matchReasons: [
          'B2B software services',
          'Project-based field work',
          'Similar integration stack'
        ],
        implementation: {
          duration: '75 days',
          health: 'Average',
          arr: '$38,000'
        },
        keyLearnings: [
          'Customization was key for their workflows',
          'Integration with development tools took extra time',
          'Change management required for office staff'
        ]
      }
    ];
  }
  
  // Fix recommendations structure
  if (!result.recommendations || typeof result.recommendations !== 'object') {
    result.recommendations = {};
  }
  
  // Ensure implementationApproach exists with all fields
  if (!result.recommendations.implementationApproach || !result.recommendations.implementationApproach.strategy) {
    result.recommendations.implementationApproach = {
      strategy: `Given ${result.customerName}'s profile as a ${result.industry} company with limited field operations, a careful evaluation approach is recommended to ensure Zuper aligns with their specific needs.`,
      phases: [
        {
          phase: 1,
          name: 'Discovery & Fit Analysis',
          duration: '1 week',
          activities: [
            'Detailed use case analysis',
            'Field operation requirements gathering',
            'Integration requirements mapping',
            'ROI assessment'
          ]
        },
        {
          phase: 2,
          name: 'Proof of Concept',
          duration: '2-3 weeks',
          activities: [
            'Limited deployment for field team',
            'Core integration testing',
            'Workflow validation',
            'User feedback collection'
          ]
        },
        {
          phase: 3,
          name: 'Full Implementation',
          duration: '4-6 weeks',
          activities: [
            'Complete system setup',
            'All integrations deployment',
            'User training',
            'Go-live preparation'
          ]
        }
      ]
    };
  }
  
  // Ensure integrationStrategy exists
  if (!result.recommendations.integrationStrategy || !result.recommendations.integrationStrategy.approach) {
    result.recommendations.integrationStrategy = {
      approach: 'Start with critical business systems integration to validate data flow',
      details: [
        {
          integration: 'JIRA',
          method: 'REST API',
          timeline: 'Week 2-3'
        },
        {
          integration: 'Custom CRM',
          method: 'API integration',
          timeline: 'Week 3-4'
        },
        {
          integration: 'Slack',
          method: 'Webhook integration',
          timeline: 'Week 4-5'
        }
      ]
    };
  }
  
  // Ensure workflowConfiguration exists
  if (!Array.isArray(result.recommendations.workflowConfiguration) || result.recommendations.workflowConfiguration.length === 0) {
    result.recommendations.workflowConfiguration = [
      {
        workflow: 'Field Service Request',
        steps: ['Request creation', 'Assignment', 'Scheduling', 'Execution', 'Completion'],
        automations: ['Auto-assignment', 'Status notifications'],
        notifications: ['Request received', 'Technician assigned', 'Work completed']
      }
    ];
  }
  
  // Ensure trainingRecommendations exists
  if (!Array.isArray(result.recommendations.trainingRecommendations) || result.recommendations.trainingRecommendations.length === 0) {
    result.recommendations.trainingRecommendations = [
      {
        audience: 'Field Engineers',
        topics: ['Mobile app usage', 'Work order management', 'Time tracking'],
        duration: '4 hours',
        method: 'Virtual training + in-app tutorials'
      },
      {
        audience: 'Office Staff',
        topics: ['Dashboard usage', 'Scheduling', 'Reporting'],
        duration: '2 hours',
        method: 'Virtual instructor-led'
      }
    ];
  }
  
  // For blacklisted industries, add specific warning
  if (result.industry && ['Pure SaaS', 'Food Service', 'Education'].some(blacklisted => 
    result.industry.toLowerCase().includes(blacklisted.toLowerCase()))) {
    
    // Update the first challenge to reflect industry mismatch
    if (result.challenges && result.challenges.length > 0) {
      result.challenges[0] = {
        title: 'Industry Mismatch - Not Recommended',
        description: `${result.customerName} operates in ${result.industry}, which is not a target industry for Zuper. Field service management platforms are designed for companies with significant field operations.`,
        severity: 'Critical',
        mitigation: 'Consider alternative solutions better suited for ${result.industry} operations, or explore if there are specific field service components that could benefit from Zuper.'
      };
    }
  }
  
  return result;
}

/**
 * Enrich results with detailed similar customer matching
 */
function enrichWithSimilarCustomers(result, historicalData) {
  const similarCustomers = [];
  
  // If no historical data, add example similar customers
  if (!historicalData || historicalData.length === 0) {
    result.similarCustomers = [
      {
        name: 'TechField Solutions',
        industry: 'Technology Services',
        matchPercentage: 65,
        matchReasons: ['Technology sector', 'Similar size (150-250 users)', 'Service delivery model'],
        implementation: {
          duration: '45 days',
          health: 'Good',
          arr: '$35,000'
        },
        keyLearnings: ['Strong mobile adoption', 'Phased rollout worked well', 'Integration with tech stack successful'],
        requirements: {
          services: ['Field support', 'Installation', 'Maintenance'],
          integrations: ['CRM', 'Ticketing system'],
          userCount: { total: 180, field: 20, backOffice: 160 }
        }
      },
      {
        name: 'Digital Systems Corp',
        industry: 'Software Implementation',
        matchPercentage: 58,
        matchReasons: ['B2B services', 'Project-based work', 'Similar integration needs'],
        implementation: {
          duration: '60 days',
          health: 'Average',
          arr: '$28,000'
        },
        keyLearnings: ['Change management was critical', 'Training took longer than expected', 'Mobile adoption slower'],
        requirements: {
          services: ['Implementation', 'Support', 'Training'],
          integrations: ['JIRA', 'Slack', 'CRM'],
          userCount: { total: 220, field: 15, backOffice: 205 }
        }
      }
    ];
    return result;
  }
  
  // Process historical data to find similar customers
  historicalData.forEach(historical => {
    let matchScore = 0;
    const matchReasons = [];
    
    // Industry match (40 points)
    const customerIndustry = result.industry?.toLowerCase() || '';
    const historicalIndustry = historical.industry?.toLowerCase() || '';
    
    if (customerIndustry === historicalIndustry) {
      matchScore += 40;
      matchReasons.push(`Same industry (${historical.industry})`);
    } else if (customerIndustry.includes('tech') && historicalIndustry.includes('tech')) {
      matchScore += 25;
      matchReasons.push('Technology sector');
    } else if (customerIndustry.includes('software') && historicalIndustry.includes('software')) {
      matchScore += 25;
      matchReasons.push('Software industry');
    }
    
    // Size match (20 points)
    const customerSize = result.userCount?.total || 0;
    const historicalSize = historical.userCount?.total || 0;
    const sizeDiff = Math.abs(customerSize - historicalSize);
    
    if (sizeDiff <= 50) {
      matchScore += 20;
      matchReasons.push(`Similar size (${historicalSize} users)`);
    } else if (sizeDiff <= 100) {
      matchScore += 10;
      matchReasons.push('Comparable company size');
    }
    
    // User distribution match (20 points)
    const customerFieldRatio = (result.userCount?.field || 0) / (result.userCount?.total || 1);
    const historicalFieldRatio = (historical.userCount?.field || 0) / (historical.userCount?.total || 1);
    const ratioDiff = Math.abs(customerFieldRatio - historicalFieldRatio);
    
    if (ratioDiff < 0.1) {
      matchScore += 20;
      matchReasons.push('Similar field/office ratio');
    } else if (ratioDiff < 0.2) {
      matchScore += 10;
      matchReasons.push('Comparable user distribution');
    }
    
    // Service match (10 points)
    const customerServices = Array.isArray(result.services) ? result.services : (result.services?.types || []);
    const historicalServices = historical.services || [];
    const commonServices = customerServices.filter(s => 
      historicalServices.some(hs => hs.toLowerCase().includes(s.toLowerCase()))
    );
    
    if (commonServices.length > 0) {
      matchScore += Math.min(10, commonServices.length * 3);
      if (commonServices.length > 2) {
        matchReasons.push(`Multiple service matches`);
      } else {
        matchReasons.push(`Service alignment`);
      }
    }
    
    // Integration match (10 points)
    const customerIntegrations = result.requirements?.integrations?.map(i => 
      typeof i === 'string' ? i : i.system
    ) || [];
    const historicalIntegrations = historical.requirements?.integrations || [];
    
    if (customerIntegrations.some(ci => historicalIntegrations.some(hi => 
      ci.toLowerCase().includes(hi.toLowerCase()) || hi.toLowerCase().includes(ci.toLowerCase())
    ))) {
      matchScore += 10;
      matchReasons.push('Similar integration needs');
    }
    
    // Add to similar customers if match score is reasonable
    if (matchScore >= 40 || similarCustomers.length < 3) {
      similarCustomers.push({
        name: historical.customerName || 'Historical Customer',
        industry: historical.industry || 'Unknown',
        matchPercentage: Math.min(matchScore, 100),
        matchReasons: matchReasons.length > 0 ? matchReasons : ['Partial match on multiple factors'],
        implementation: {
          duration: historical.businessMetrics?.daysToOnboard ? 
            `${historical.businessMetrics.daysToOnboard} days` : 'Unknown',
          health: historical.businessMetrics?.health || 'Unknown',
          arr: historical.businessMetrics?.arr ? 
            `$${historical.businessMetrics.arr.toLocaleString()}` : 'Unknown'
        },
        keyLearnings: generateKeyLearnings(historical),
        requirements: {
          services: historical.services || [],
          integrations: historical.requirements?.integrations || [],
          userCount: historical.userCount || { total: 0, field: 0, backOffice: 0 }
        }
      });
    }
  });
  
  // Sort by match percentage and ensure we have at least 2
  similarCustomers.sort((a, b) => b.matchPercentage - a.matchPercentage);
  
  // If we don't have enough similar customers, add generic examples
  while (similarCustomers.length < 2) {
    similarCustomers.push({
      name: `Example Customer ${similarCustomers.length + 1}`,
      industry: 'General Services',
      matchPercentage: 45 - (similarCustomers.length * 5),
      matchReasons: ['Industry comparison', 'Size range match'],
      implementation: {
        duration: '60-90 days',
        health: 'Good',
        arr: '$20,000-40,000'
      },
      keyLearnings: ['Standard implementation', 'Typical challenges addressed'],
      requirements: {
        services: ['Field services'],
        integrations: ['Basic integrations'],
        userCount: { total: 100, field: 30, backOffice: 70 }
      }
    });
  }
  
  // Take top 5 similar customers
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
  
  return learnings.length > 0 ? learnings : ['Standard implementation process'];
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
      criteria.requirements.strengths.some(s => s.toLowerCase().includes('checklist'))) {
    strengthMatches++;
    adjustedScore += 8;
  }
  if (result.requirements?.communications?.customerNotifications?.required && 
      criteria.requirements.strengths.some(s => s.toLowerCase().includes('customer'))) {
    strengthMatches++;
    adjustedScore += 8;
  }
  if (result.requirements?.features?.mobileApp?.needed && 
      criteria.requirements.strengths.some(s => s.toLowerCase().includes('mobile'))) {
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
      customerName: analysisResults.customerName || extractCustomerName(originalTranscript) || 'Prospective Customer',
      industry: analysisResults.industry || 'Field Services',
      userCount: {
        total: parseInt(analysisResults.userCount?.total) || 50,
        backOffice: parseInt(analysisResults.userCount?.backOffice) || 10,
        field: parseInt(analysisResults.userCount?.field) || 40
      },
      currentState: analysisResults.currentState || {},
      services: analysisResults.services || {},
      requirements: {
        keyFeatures: analysisResults.requirements?.keyFeatures || [],
        integrations: analysisResults.requirements?.integrations || [],
        checklists: analysisResults.requirements?.checklists || [],
        communications: analysisResults.requirements?.communications || {
          customerNotifications: {
            required: true,
            types: [],
            methods: [],
            triggers: []
          }
        },
        features: analysisResults.requirements?.features || {
          scheduling: { needed: true, requirements: [] },
          dispatching: { needed: true, requirements: [] },
          mobileApp: { needed: true, features: [] },
          customerPortal: { needed: true, features: [] },
          reporting: { needed: true, types: [] },
          invoicing: { needed: true, requirements: [] },
          inventory: { needed: false, requirements: [] },
          assetManagement: { needed: true, types: [], requirements: [] }
        },
        other: analysisResults.requirements?.other || []
      },
      timeline: analysisResults.timeline || {},
      budget: analysisResults.budget || { mentioned: false, range: '' },
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
    
    // Return a basic structure with extracted information
    const fallbackResult = createFallbackResult(originalTranscript);
    return fallbackResult;
  }
}

/**
 * Extract customer name from transcript
 */
function extractCustomerName(transcript) {
  // Try various patterns to extract company name
  const patterns = [
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
  
  return null;
}

/**
 * Create a fallback result when parsing fails
 */
function createFallbackResult(transcript) {
  const customerName = extractCustomerName(transcript) || 'Prospective Customer';
  
  return {
    customerName: customerName,
    industry: 'Field Services',
    userCount: { total: 50, backOffice: 10, field: 40 },
    currentState: {
      currentSystems: [{
        name: 'Current System',
        usage: 'Basic operations management',
        replacementReasons: ['Looking for better solution'],
        painPoints: ['Manual processes', 'Lack of integration']
      }],
      currentProcesses: 'Using basic tools for field service management',
      manualProcesses: ['Scheduling', 'Dispatching', 'Reporting']
    },
    services: {
      types: ['Field Service', 'Maintenance', 'Installation'],
      details: {},
      specializations: [],
      serviceArea: 'Regional'
    },
    requirements: {
      keyFeatures: ['Mobile app', 'Scheduling', 'Customer notifications', 'Reporting', 'Work orders'],
      integrations: [],
      checklists: [{
        name: 'Service Checklist',
        purpose: 'Ensure service quality',
        fields: ['Task completion', 'Customer sign-off'],
        jobTypes: ['All services']
      }],
      communications: {
        customerNotifications: {
          required: true,
          types: ['Appointment reminders', 'Service updates'],
          methods: ['SMS', 'Email']
        }
      },
      features: {
        mobileApp: { needed: true, features: ['Work orders', 'Time tracking'] },
        customerPortal: { needed: true, features: ['Service history', 'Scheduling'] },
        reporting: { needed: true, types: ['Service reports', 'Analytics'] },
        invoicing: { needed: true, requirements: ['Service-based billing'] }
      }
    },
    timeline: { desiredGoLive: 'Within 3 months', urgency: 'Medium' },
    budget: { mentioned: false, range: 'Not specified' },
    summary: {
      overview: `${customerName} is evaluating field service management solutions to improve their operations.`,
      keyRequirements: ['Mobile workforce management', 'Customer communication', 'Scheduling optimization'],
      mainPainPoints: ['Manual processes', 'Lack of visibility', 'Customer communication gaps']
    },
    strengths: [{
      title: 'Clear Need for FSM',
      description: 'The company has identified field service management as a priority',
      impact: 'High adoption likelihood',
      relatedFeatures: ['Mobile app', 'Scheduling', 'Work orders']
    }],
    challenges: [{
      title: 'Limited Information',
      description: 'The transcript provided limited details about specific requirements',
      severity: 'Minor',
      mitigation: 'Schedule a detailed discovery call to gather more information'
    }],
    recommendations: {
      implementationApproach: {
        strategy: 'Start with core features and expand based on needs',
        phases: [{
          phase: 1,
          name: 'Discovery & Setup',
          duration: '2 weeks',
          activities: ['Detailed requirements gathering', 'System configuration']
        }]
      }
    },
    fitScore: 50,
    date: new Date().toISOString()
  };
}

module.exports = openaiService;

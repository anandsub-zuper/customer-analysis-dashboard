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
      
      // Phase 4: Retrieve configured criteria
      const criteria = await criteriaService.getAllCriteria();
      console.log('Retrieved industry and requirements criteria.');
      
      // Phase 5: Format data for comprehensive analysis
      const formattedHistoricalData = historicalDataService.formatHistoricalDataForPrompt(historicalData, insights);
      const formattedCriteria = formatCriteriaForPrompt(criteria);
      
      // Phase 6: Create comprehensive prompt with all context
      const prompt = createEnhancedPrompt(text, formattedHistoricalData, formattedCriteria);
      
      // Phase 7: Call OpenAI API for full analysis
      console.log('Phase 4: Sending comprehensive analysis request to OpenAI...');
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
      
      // Phase 8: Process the response
      const result = processOpenAIResponse(response);
      console.log('Successfully processed OpenAI response.');
      console.log('Extracted customer name:', result.customerName);
      console.log('Extracted industry:', result.industry);
      console.log('Extracted user count:', result.userCount);
      console.log('Fit Score from OpenAI:', result.fitScore);
      
      // Phase 9: Apply criteria adjustments
      const adjustedResult = applyComprehensiveCriteriaAdjustments(result, criteria);
      
      // Phase 10: Enrich with similar customers (using the already retrieved historical data)
      const enrichedResult = enrichWithSimilarCustomers(adjustedResult, historicalData);
      
      // Phase 11: Validate structure
      const validatedResult = validateMinimalStructure(enrichedResult);
      
      // Phase 12: Log final result
      console.log('=== FINAL RESULT VALIDATION ===');
      console.log('Customer Name:', validatedResult.customerName);
      console.log('Industry:', validatedResult.industry);
      console.log('Final Fit Score:', validatedResult.fitScore);
      console.log('Strengths Count:', validatedResult.strengths?.length || 0);
      console.log('Challenges Count:', validatedResult.challenges?.length || 0);
      console.log('Similar Customers Count:', validatedResult.similarCustomers?.length || 0);
      
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
 * Create enhanced prompt that explicitly asks for extraction and sales strategy
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
8. ALWAYS include strategic sales guidance in recommendations based on fit score

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

SALES STRATEGY GUIDELINES BASED ON FIT SCORE:
- Score 70-100: Strong fit - Pursue aggressively with standard pricing
- Score 50-69: Moderate fit - Pursue with customized approach, address gaps
- Score 30-49: Weak fit - Conditional pursuit, need executive approval
- Score 0-29: Poor fit - Recommend alternative solutions or decline

IMPORTANT SCORING RULES:
- Industries in the PREFERRED list: Score 60-85
- Industries NOT in the preferred list (like cleaning, landscaping, etc.): Score 40-60
- Industries in the BLACKLISTED list: Maximum score 25
- Pure software/SaaS companies with <10% field workers: Maximum score 20
- Companies needing complex project management or ERP: Reduce score by 30 points
- Companies with >5 complex integrations: Reduce score by 20 points
- Focus on FIELD SERVICE operations, not general business management

${historicalData}

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
    "fitScoreRationale": {
      "summary": "Clear explanation of why they received this fit score",
      "positiveFactors": ["What contributes positively to their score"],
      "negativeFactors": ["What reduces their score"],
      "overallAssessment": "1-2 sentences on overall fit"
    },
    "salesStrategy": {
      "recommendation": "PURSUE/CONDITIONAL/DECLINE",
      "approach": "Detailed guidance on how sales team should proceed",
      "reasoning": "Why this approach is recommended",
      "talkingPoints": [
        "Key points to emphasize or address",
        "Objection handling strategies",
        "Value propositions to highlight"
      ],
      "risks": [
        "Implementation risks if pursued",
        "Customer satisfaction risks",
        "Resource allocation concerns"
      ],
      "nextSteps": [
        "Specific action items for sales team",
        "Required approvals or validations",
        "Timeline for decision"
      ]
    },
    "alternativeOptions": {
      "ifPursuing": "Special considerations if moving forward despite challenges",
      "ifDeclining": "How to gracefully decline or suggest alternatives",
      "partnerReferral": "Potential partners who might be better suited"
    },
    "implementationApproach": {
      "strategy": "If fit score <40, provide STRATEGIC GUIDANCE for the sales team:
        - Should they pursue this prospect? (Yes/No/Conditional)
        - If No: Suggest polite ways to decline or redirect
        - If Conditional: What would need to change to make them viable?
        - If Yes despite low score: Special approach needed
        
        For good fits (>60), provide implementation strategy",
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
    ],
    "pricingGuidance": {
      "recommendedTier": "Starter/Professional/Enterprise",
      "specialConsiderations": "Any pricing adjustments needed",
      "justification": "Why this pricing is appropriate"
    }
  },
  "fitScore": BE HONEST - base on industry fit, field worker ratio, and requirements match
}`;
}

/**
 * Format criteria for the prompt
 */
function formatCriteriaForPrompt(criteria) {
  return `
## ZUPER PLATFORM CRITERIA AND SCORING GUIDELINES

PREFERRED INDUSTRIES (60-75 base score): ${criteria.industries.whitelist.join(', ')}
BLACKLISTED INDUSTRIES (0-25 max score): ${criteria.industries.blacklist.join(', ')}
NEUTRAL INDUSTRIES: All others start at 45-55 base score

SCORING ADJUSTMENTS:
- Field worker ratio >70%: +10 points
- Field worker ratio 50-70%: +5 points  
- Field worker ratio 30-50%: 0 points
- Field worker ratio <30%: -20 points
- Company size 50-200 users: +5 points
- Company size >500 users: -10 points
- Integration complexity (>5 systems): -15 points
- Integration complexity (3-5 systems): -8 points

FINAL SCORE INTERPRETATION:
- 70-100: Excellent fit - standard sales process
- 50-69: Moderate fit - needs customization
- 30-49: Poor fit - requires special approval
- 0-29: Not recommended - suggest alternatives

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
 * Apply comprehensive criteria adjustments with balanced scoring
 */
function applyComprehensiveCriteriaAdjustments(result, criteria) {
  let adjustedScore = result.fitScore || 50;
  
  const scoreBreakdown = {
    baseScore: adjustedScore,
    industryAdjustment: 0,
    fieldWorkerBonus: 0,
    complexityPenalty: 0,
    sizeAdjustment: 0,
    finalScore: 0,
    category: '',
    rationale: []
  };
  
  const industryLower = (result.industry || '').toLowerCase().trim();
  
  // Check if preferred industry
  const isPreferred = criteria.industries.whitelist.some(preferred => {
    const prefLower = preferred.toLowerCase().trim();
    
    if (industryLower === prefLower) return true;
    if (industryLower.includes(prefLower)) return true;
    if (prefLower.includes(industryLower)) return true;
    
    // Special handling for common variations
    if (industryLower.includes('cleaning') && prefLower.includes('cleaning')) return true;
    if (industryLower.includes('hvac') && prefLower.includes('hvac')) return true;
    if (industryLower.includes('plumbing') && prefLower.includes('plumbing')) return true;
    if (industryLower.includes('electrical') && prefLower.includes('electrical')) return true;
    
    // Word-based matching
    const indWords = industryLower.split(/[\s\-,]+/).filter(w => w.length > 2);
    const prefWords = prefLower.split(/[\s\-,]+/).filter(w => w.length > 2);
    
    return indWords.some(iw => prefWords.some(pw => 
      iw.includes(pw) || pw.includes(iw) ||
      (iw.length > 3 && pw.length > 3 && iw.substring(0, 3) === pw.substring(0, 3))
    ));
  });
  
  // Check if blacklisted
  const isBlacklisted = criteria.industries.blacklist.some(blacklisted => {
    const blackLower = blacklisted.toLowerCase().trim();
    return industryLower.includes(blackLower);
  });
  
  // Check if field service
  const fieldServiceKeywords = ['cleaning', 'hvac', 'plumbing', 'electrical', 'roofing', 
                                'maintenance', 'repair', 'service', 'installation', 'inspection',
                                'landscaping', 'pest control', 'janitorial', 'facilities', 'spa', 
                                'salon', 'wellness', 'therapy'];
  const isFieldService = fieldServiceKeywords.some(keyword => industryLower.includes(keyword));
  
  console.log('Industry analysis:', {
    industry: result.industry,
    isPreferred,
    isBlacklisted,
    isFieldService
  });
  
  // BALANCED INDUSTRY SCORING
  if (isBlacklisted) {
    // Blacklisted: Major penalty
    adjustedScore = Math.min(adjustedScore, 25);
    scoreBreakdown.industryAdjustment = -50;
    scoreBreakdown.category = 'blacklisted';
    scoreBreakdown.rationale.push(`${result.industry} is in our blacklist of incompatible industries`);
  } else if (isPreferred) {
    // Preferred: Bonus
    adjustedScore += 15;
    scoreBreakdown.industryAdjustment = 15;
    scoreBreakdown.category = 'preferred';
    scoreBreakdown.rationale.push(`${result.industry} is a preferred industry with proven success`);
  } else if (isFieldService) {
    // Field service but not preferred: Neutral (no adjustment)
    scoreBreakdown.industryAdjustment = 0;
    scoreBreakdown.category = 'neutral-field-service';
    scoreBreakdown.rationale.push(`${result.industry} is a field service business but not in our core verticals`);
  } else {
    // Not field service: Small penalty
    adjustedScore -= 10;
    scoreBreakdown.industryAdjustment = -10;
    scoreBreakdown.category = 'neutral-non-field';
    scoreBreakdown.rationale.push(`${result.industry} is outside our typical field service focus`);
  }
  
  // Field worker ratio bonus/penalty
  const totalUsers = result.userCount?.total || 0;
  const fieldUsers = result.userCount?.field || 0;
  const fieldRatio = totalUsers > 0 ? fieldUsers / totalUsers : 0;
  
  if (fieldRatio >= 0.7) {
    // Excellent field ratio
    adjustedScore += 10;
    scoreBreakdown.fieldWorkerBonus = 10;
    scoreBreakdown.rationale.push(`Excellent field worker ratio (${Math.round(fieldRatio * 100)}%) indicates strong fit`);
  } else if (fieldRatio >= 0.5) {
    // Good field ratio
    adjustedScore += 5;
    scoreBreakdown.fieldWorkerBonus = 5;
    scoreBreakdown.rationale.push(`Good field worker ratio (${Math.round(fieldRatio * 100)}%)`);
  } else if (fieldRatio >= 0.3) {
    // Acceptable field ratio
    scoreBreakdown.fieldWorkerBonus = 0;
    scoreBreakdown.rationale.push(`Moderate field worker ratio (${Math.round(fieldRatio * 100)}%)`);
  } else {
    // Poor field ratio
    adjustedScore -= 20;
    scoreBreakdown.fieldWorkerBonus = -20;
    scoreBreakdown.rationale.push(`Low field worker ratio (${Math.round(fieldRatio * 100)}%) indicates poor fit for FSM`);
  }
  
  // Size adjustment
  if (totalUsers >= 50 && totalUsers <= 200) {
    adjustedScore += 5;
    scoreBreakdown.sizeAdjustment = 5;
    scoreBreakdown.rationale.push(`Ideal company size (${totalUsers} users)`);
  } else if (totalUsers > 500) {
    adjustedScore -= 10;
    scoreBreakdown.sizeAdjustment = -10;
    scoreBreakdown.rationale.push(`Very large organization (${totalUsers} users) may require enterprise approach`);
  } else if (totalUsers < 20) {
    adjustedScore -= 5;
    scoreBreakdown.sizeAdjustment = -5;
    scoreBreakdown.rationale.push(`Small organization (${totalUsers} users) may have limited budget`);
  }
  
  // Integration complexity
  const integrationCount = result.requirements?.integrations?.length || 0;
  if (integrationCount > 5) {
    adjustedScore -= 15;
    scoreBreakdown.complexityPenalty = -15;
    scoreBreakdown.rationale.push(`High integration complexity (${integrationCount} systems) increases risk`);
  } else if (integrationCount > 3) {
    adjustedScore -= 8;
    scoreBreakdown.complexityPenalty = -8;
    scoreBreakdown.rationale.push(`Moderate integration complexity (${integrationCount} systems)`);
  }
  
  // Ensure score stays within bounds
  scoreBreakdown.finalScore = Math.max(0, Math.min(100, adjustedScore));
  
  console.log('Score breakdown:', scoreBreakdown);
  
  // Update result
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
    .filter(item => item.score > 40) // Lower threshold to get more matches
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
      keyLearnings: generateKeyLearnings(item.historical),
      strategicInsight: generateStrategicInsight(result, item.historical)
    }));
  
  result.similarCustomers = similarCustomers;
  
  // Add historical context to recommendations if not already present
  if (result.recommendations && similarCustomers.length > 0) {
    const successfulSimilar = similarCustomers.filter(c => 
      ['Excellent', 'Good'].includes(c.implementation.health)
    );
    const struggingSimilar = similarCustomers.filter(c => 
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
          `${successfulSimilar.length} similar customers achieved success with average implementation of ${
            successfulSimilar[0].implementation.duration
          }`
        );
      }
      
      if (struggingSimilar.length > 0) {
        result.recommendations.historicalContext.insights.push(
          `${struggingSimilar.length} similar customers faced challenges - review their experiences before proceeding`
        );
      }
    }
  }
  
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

/**
 * Generate strategic insight from historical comparison
 */
function generateStrategicInsight(currentCustomer, historicalCustomer) {
  const insights = [];
  
  // Health-based insights
  if (historicalCustomer.businessMetrics?.health === 'Excellent') {
    insights.push('This similar customer achieved excellent outcomes');
  } else if (historicalCustomer.businessMetrics?.health === 'Poor') {
    insights.push('This similar customer struggled - learn from their challenges');
  }
  
  // Size comparison
  const currentSize = currentCustomer.userCount?.total || 0;
  const historicalSize = historicalCustomer.userCount?.total || 0;
  
  if (Math.abs(currentSize - historicalSize) < 20) {
    insights.push('Very similar size - implementation approach likely transferable');
  }
  
  // Integration complexity
  const currentIntegrations = currentCustomer.requirements?.integrations?.length || 0;
  const historicalIntegrations = historicalCustomer.requirements?.integrations?.length || 0;
  
  if (currentIntegrations > historicalIntegrations + 2) {
    insights.push('More complex integration needs than this reference');
  }
  
  return insights.join('. ') || 'Review implementation details for relevant insights';
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

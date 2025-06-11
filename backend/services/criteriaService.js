// backend/services/criteriaService.js - Remove hardcoded defaults
const { getDb } = require('./mongoDbService');

/**
 * Get industry criteria (whitelist/blacklist) - NO HARDCODED DEFAULTS
 */
exports.getIndustryCriteria = async () => {
  try {
    const db = await getDb();
    const criteria = await db.collection('configuration').findOne({ _id: 'industries' });
    
    if (!criteria) {
      console.warn('No industry criteria configured in database');
      return {
        whitelist: [],
        blacklist: []
      };
    }
    
    return {
      whitelist: criteria.whitelist || [],
      blacklist: criteria.blacklist || []
    };
  } catch (error) {
    console.error('Error getting industry criteria:', error);
    throw error;
  }
};

/**
 * Get requirements criteria (strengths/weaknesses/unsupported) - NO HARDCODED DEFAULTS
 */
exports.getRequirementsCriteria = async () => {
  try {
    const db = await getDb();
    const criteria = await db.collection('configuration').findOne({ _id: 'requirements' });
    
    if (!criteria) {
      console.warn('No requirements criteria configured in database');
      return {
        strengths: [],
        weaknesses: [],
        unsupported: []
      };
    }
    
    return {
      strengths: criteria.strengths || [],
      weaknesses: criteria.weaknesses || [],
      unsupported: criteria.unsupported || []
    };
  } catch (error) {
    console.error('Error getting requirements criteria:', error);
    throw error;
  }
};

// backend/services/openaiService.js - Updated to use dynamic criteria

/**
 * Apply comprehensive criteria adjustments with DYNAMIC criteria
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
    // Preferred: Moderate bonus (not excessive)
    adjustedScore += 10; // Reduced from 15
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
    adjustedScore += Math.min(strengthMatches.length * 3, 10);
    scoreBreakdown.fieldWorkerBonus += Math.min(strengthMatches.length * 3, 10);
    scoreBreakdown.rationale.push(`Customer requirements align with platform strengths: ${strengthMatches.join(', ')}`);
  }
  
  // Field worker ratio bonus/penalty (unchanged)
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
  } else if (fieldRatio < 0.3) {
    adjustedScore -= 15;
    scoreBreakdown.fieldWorkerBonus -= 15;
    scoreBreakdown.rationale.push(`Low field worker ratio (${Math.round(fieldRatio * 100)}%) - poor fit for field service software`);
  }
  
  // Size adjustment (unchanged but more moderate)
  if (totalUsers >= 50 && totalUsers <= 200) {
    adjustedScore += 3; // Reduced from 5
    scoreBreakdown.sizeAdjustment = 3;
    scoreBreakdown.rationale.push(`Good company size (${totalUsers} users)`);
  } else if (totalUsers > 500) {
    adjustedScore -= 8; // Reduced from 10
    scoreBreakdown.sizeAdjustment = -8;
    scoreBreakdown.rationale.push(`Large organization (${totalUsers} users) - may need enterprise approach`);
  }
  
  // Integration complexity penalty (unchanged)
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
 * Format criteria for the prompt using DYNAMIC data
 */
function formatCriteriaForPrompt(criteria) {
  const industries = criteria.industries || { whitelist: [], blacklist: [] };
  const requirements = criteria.requirements || { strengths: [], weaknesses: [], unsupported: [] };
  
  return `
## DYNAMIC PLATFORM CRITERIA AND SCORING GUIDELINES

PREFERRED INDUSTRIES (Base score 50-60, +10 bonus): ${industries.whitelist.join(', ') || 'None configured'}
BLACKLISTED INDUSTRIES (Maximum score 25): ${industries.blacklist.join(', ') || 'None configured'}
OTHER INDUSTRIES: Base score 45-55, -5 penalty for not being preferred

SCORING METHODOLOGY:
- Industry Preference: +10 for preferred, -5 for other, -25+ for blacklisted
- Field Worker Ratio >70%: +10 points
- Field Worker Ratio 50-70%: +5 points  
- Field Worker Ratio <30%: -15 points
- Requirements alignment with strengths: +3 per match (max +10)
- Requirements conflicting with limitations: -10 points
- Unsupported requirements: -20 points
- Company size 50-200 users: +3 points
- Integration complexity >5 systems: -15 points

PLATFORM STRENGTHS (give bonus when customer needs these): 
${requirements.strengths.join(', ') || 'None configured'}

PLATFORM LIMITATIONS (give penalty when customer needs these): 
${requirements.weaknesses.join(', ') || 'None configured'}

UNSUPPORTED FEATURES (major penalty when customer needs these): 
${requirements.unsupported.join(', ') || 'None configured'}

IMPORTANT: Base your industry assessment on the CONFIGURED criteria above, not assumptions.
If an industry is not in the preferred list, it should receive a lower score even if it seems field-service related.
`;
}

// EXAMPLE: For your configuration, CityWide Cleaning Services should score:
// - Base score: ~55 (from OpenAI)
// - Industry: -5 (not in configured preferred list: HVAC, Plumbing, Electrical, Roofing)
// - Field ratio: +10 (100 field / 120 total = 83%)
// - Requirements: Possible +3 for route optimization if it matches any strengths
// - Final score: ~63-68% (Good Fit, not Excellent Fit)

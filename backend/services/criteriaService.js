// backend/services/criteriaService.js - Add missing getAllCriteria function
const { getDb } = require('./mongoDbService');

/**
 * Get all criteria (industries + requirements) - MAIN FUNCTION NEEDED BY OPENAI SERVICE
 */
exports.getAllCriteria = async () => {
  try {
    console.log('Loading all criteria from database...');
    
    // Get both industry and requirements criteria
    const [industriesCriteria, requirementsCriteria] = await Promise.all([
      this.getIndustryCriteria(),
      this.getRequirementsCriteria()
    ]);
    
    const allCriteria = {
      industries: industriesCriteria,
      requirements: requirementsCriteria
    };
    
    console.log('Loaded criteria:', {
      industriesWhitelist: allCriteria.industries.whitelist.length,
      industriesBlacklist: allCriteria.industries.blacklist.length,
      requirementsStrengths: allCriteria.requirements.strengths.length,
      requirementsWeaknesses: allCriteria.requirements.weaknesses.length,
      requirementsUnsupported: allCriteria.requirements.unsupported.length
    });
    
    return allCriteria;
  } catch (error) {
    console.error('Error getting all criteria:', error);
    throw error;
  }
};

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
 * Update industry criteria
 */
exports.updateIndustryCriteria = async (criteriaData) => {
  try {
    const db = await getDb();
    
    const updateData = {
      _id: 'industries',
      whitelist: criteriaData.whitelist || [],
      blacklist: criteriaData.blacklist || [],
      updatedAt: new Date()
    };
    
    await db.collection('configuration').replaceOne(
      { _id: 'industries' },
      updateData,
      { upsert: true }
    );
    
    return updateData;
  } catch (error) {
    console.error('Error updating industry criteria:', error);
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

/**
 * Update requirements criteria
 */
exports.updateRequirementsCriteria = async (criteriaData) => {
  try {
    const db = await getDb();
    
    const updateData = {
      _id: 'requirements',
      strengths: criteriaData.strengths || [],
      weaknesses: criteriaData.weaknesses || [],
      unsupported: criteriaData.unsupported || [],
      updatedAt: new Date()
    };
    
    await db.collection('configuration').replaceOne(
      { _id: 'requirements' },
      updateData,
      { upsert: true }
    );
    
    return updateData;
  } catch (error) {
    console.error('Error updating requirements criteria:', error);
    throw error;
  }
};

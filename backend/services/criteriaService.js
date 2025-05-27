const { getDb } = require('./mongoDbService');

/**
 * Get industry criteria (whitelist/blacklist)
 */
exports.getIndustryCriteria = async () => {
  try {
    const db = await getDb();
    const criteria = await db.collection('configuration').findOne({ _id: 'industries' });
    
    return criteria || {
      whitelist: [
        'Construction',
        'Field Services',
        'Property Maintenance',
        'HVAC',
        'Plumbing',
        'Electrical',
        'Cleaning Services',
        'Solar'
      ],
      blacklist: [
        'Food Service',
        'Pure SaaS',
        'Education'
      ]
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
    
    const updatedCriteria = {
      _id: 'industries',
      whitelist: criteriaData.whitelist || [],
      blacklist: criteriaData.blacklist || [],
      updatedAt: new Date()
    };
    
    await db.collection('configuration').replaceOne(
      { _id: 'industries' },
      updatedCriteria,
      { upsert: true }
    );
    
    return updatedCriteria;
  } catch (error) {
    console.error('Error updating industry criteria:', error);
    throw error;
  }
};

/**
 * Get requirements criteria (strengths/weaknesses/unsupported)
 */
exports.getRequirementsCriteria = async () => {
  try {
    const db = await getDb();
    const criteria = await db.collection('configuration').findOne({ _id: 'requirements' });
    
    return criteria || {
      strengths: [
        'Field Technician Management',
        'Real-time Tracking',
        'Work Order Management',
        'Mobile App Capability',
        'Customer Portal',
        'Scheduling',
        'Customizable Checklists'
      ],
      weaknesses: [
        'Complex Manufacturing',
        'Advanced Project Management',
        'Route Optimization'
      ],
      unsupported: [
        'Full ERP',
        'Complex Accounting',
        'Hospital Management'
      ]
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
    
    const updatedCriteria = {
      _id: 'requirements',
      strengths: criteriaData.strengths || [],
      weaknesses: criteriaData.weaknesses || [],
      unsupported: criteriaData.unsupported || [],
      updatedAt: new Date()
    };
    
    await db.collection('configuration').replaceOne(
      { _id: 'requirements' },
      updatedCriteria,
      { upsert: true }
    );
    
    return updatedCriteria;
  } catch (error) {
    console.error('Error updating requirements criteria:', error);
    throw error;
  }
};

/**
 * Get all criteria (industries + requirements)
 */
exports.getAllCriteria = async () => {
  try {
    const [industries, requirements] = await Promise.all([
      this.getIndustryCriteria(),
      this.getRequirementsCriteria()
    ]);
    
    return {
      industries,
      requirements
    };
  } catch (error) {
    console.error('Error getting all criteria:', error);
    throw error;
  }
};

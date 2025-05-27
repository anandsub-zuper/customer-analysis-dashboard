const { getDb } = require('./mongoDbService');
const { ObjectId } = require('mongodb');

/**
 * Create a new template
 */
exports.createTemplate = async (templateData) => {
  try {
    const db = await getDb();
    
    const template = {
      name: templateData.name,
      description: templateData.description,
      industryFocus: templateData.industryFocus,
      tags: templateData.tags || [],
      criteria: templateData.criteria || {},
      promptTemplate: templateData.promptTemplate || '',
      createdAt: new Date(),
      updatedAt: new Date(),
      isDefault: templateData.isDefault || false
    };
    
    // Validate required fields
    if (!template.name || !template.description) {
      throw new Error('Template name and description are required');
    }
    
    // Check for duplicate names
    const existingTemplate = await db.collection('templates').findOne({ name: template.name });
    if (existingTemplate) {
      throw new Error('A template with this name already exists');
    }
    
    const result = await db.collection('templates').insertOne(template);
    
    return {
      id: result.insertedId.toString(),
      ...template
    };
  } catch (error) {
    console.error('Error creating template:', error);
    throw error;
  }
};

/**
 * Get all templates
 */
exports.getTemplates = async () => {
  try {
    const db = await getDb();
    const templates = await db.collection('templates')
      .find()
      .sort({ isDefault: -1, name: 1 })
      .toArray();
    
    return templates.map(template => ({
      id: template._id.toString(),
      ...template,
      _id: undefined
    }));
  } catch (error) {
    console.error('Error getting templates:', error);
    throw error;
  }
};

/**
 * Get template by ID
 */
exports.getTemplateById = async (id) => {
  try {
    const db = await getDb();
    const template = await db.collection('templates').findOne({ _id: new ObjectId(id) });
    
    if (!template) {
      throw new Error('Template not found');
    }
    
    return {
      id: template._id.toString(),
      ...template,
      _id: undefined
    };
  } catch (error) {
    console.error('Error getting template:', error);
    throw error;
  }
};

/**
 * Update template
 */
exports.updateTemplate = async (id, templateData) => {
  try {
    const db = await getDb();
    
    const updateData = {
      name: templateData.name,
      description: templateData.description,
      industryFocus: templateData.industryFocus,
      tags: templateData.tags || [],
      criteria: templateData.criteria || {},
      promptTemplate: templateData.promptTemplate || '',
      updatedAt: new Date()
    };
    
    // Validate required fields
    if (!updateData.name || !updateData.description) {
      throw new Error('Template name and description are required');
    }
    
    // Check for duplicate names (excluding current template)
    const existingTemplate = await db.collection('templates').findOne({
      name: updateData.name,
      _id: { $ne: new ObjectId(id) }
    });
    
    if (existingTemplate) {
      throw new Error('A template with this name already exists');
    }
    
    const result = await db.collection('templates').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );
    
    if (result.matchedCount === 0) {
      throw new Error('Template not found');
    }
    
    return await this.getTemplateById(id);
  } catch (error) {
    console.error('Error updating template:', error);
    throw error;
  }
};

/**
 * Delete template
 */
exports.deleteTemplate = async (id) => {
  try {
    const db = await getDb();
    
    // Check if template is default
    const template = await db.collection('templates').findOne({ _id: new ObjectId(id) });
    if (template && template.isDefault) {
      throw new Error('Cannot delete default template');
    }
    
    const result = await db.collection('templates').deleteOne({ _id: new ObjectId(id) });
    
    if (result.deletedCount === 0) {
      throw new Error('Template not found');
    }
    
    return { success: true, message: 'Template deleted successfully' };
  } catch (error) {
    console.error('Error deleting template:', error);
    throw error;
  }
};

/**
 * Get default template
 */
exports.getDefaultTemplate = async () => {
  try {
    const db = await getDb();
    const template = await db.collection('templates').findOne({ isDefault: true });
    
    if (!template) {
      // Return a basic default if none exists
      return {
        name: 'Standard Analysis Template',
        description: 'Default template for customer analysis',
        industryFocus: 'General',
        criteria: {
          scoringFactors: ['Industry Fit', 'Feature Requirements', 'Integration Complexity', 'User Count', 'Timeline'],
          weightings: {
            'Industry Fit': 25,
            'Feature Requirements': 35,
            'Integration Complexity': 20,
            'User Count': 10,
            'Timeline': 10
          }
        }
      };
    }
    
    return {
      id: template._id.toString(),
      ...template,
      _id: undefined
    };
  } catch (error) {
    console.error('Error getting default template:', error);
    throw error;
  }
};

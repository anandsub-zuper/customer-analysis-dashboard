const express = require('express');
const router = express.Router();
const modelConfigService = require('../services/modelConfigService');
const templateService = require('../services/templateService');
const criteriaService = require('../services/criteriaService');

// Model Configuration Routes
router.get('/model', async (req, res) => {
  try {
    const config = await modelConfigService.getModelConfig();
    res.json({ success: true, data: config });
  } catch (error) {
    console.error('Error getting model config:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/model', async (req, res) => {
  try {
    const config = await modelConfigService.updateModelConfig(req.body);
    res.json({ success: true, data: config, message: 'Model configuration updated successfully' });
  } catch (error) {
    console.error('Error updating model config:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/api', async (req, res) => {
  try {
    const db = await require('../services/mongoDbService').getDb();
    const config = await db.collection('configuration').findOne({ _id: 'api' });
    
    // Return config without exposing the full API key
    const safeConfig = config ? {
      key: config.key ? `${config.key.substring(0, 7)}...${config.key.slice(-4)}` : '',
      maxUsage: config.maxUsage || 100,
      alertThreshold: config.alertThreshold || 80,
      configured: !!config.key
    } : {
      key: '',
      maxUsage: 100,
      alertThreshold: 80,
      configured: false
    };
    
    res.json({ success: true, data: safeConfig });
  } catch (error) {
    console.error('Error getting API config:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/api', async (req, res) => {
  try {
    const { key, maxUsage, alertThreshold } = req.body;
    const db = await require('../services/mongoDbService').getDb();
    
    // Prepare update object
    const updateData = {
      _id: 'api',
      maxUsage: parseInt(maxUsage) || 100,
      alertThreshold: parseInt(alertThreshold) || 80,
      updatedAt: new Date()
    };
    
    // Only update the key if a new one is provided (not masked)
    if (key && !key.includes('...')) {
      updateData.key = key;
      
      // Also update the environment variable for immediate effect
      process.env.OPENAI_API_KEY = key;
    }
    
    await db.collection('configuration').replaceOne(
      { _id: 'api' },
      updateData,
      { upsert: true }
    );
    
    res.json({ 
      success: true, 
      message: 'API configuration updated successfully',
      data: {
        ...updateData,
        key: updateData.key ? `${updateData.key.substring(0, 7)}...${updateData.key.slice(-4)}` : undefined
      }
    });
  } catch (error) {
    console.error('Error updating API config:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

// Template Routes
router.get('/templates', async (req, res) => {
  try {
    const templates = await templateService.getTemplates();
    res.json({ success: true, data: templates });
  } catch (error) {
    console.error('Error getting templates:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/templates/:id', async (req, res) => {
  try {
    const template = await templateService.getTemplateById(req.params.id);
    res.json({ success: true, data: template });
  } catch (error) {
    console.error('Error getting template:', error);
    res.status(404).json({ success: false, message: error.message });
  }
});

router.post('/templates', async (req, res) => {
  try {
    const template = await templateService.createTemplate(req.body);
    res.status(201).json({ success: true, data: template, message: 'Template created successfully' });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

router.put('/templates/:id', async (req, res) => {
  try {
    const template = await templateService.updateTemplate(req.params.id, req.body);
    res.json({ success: true, data: template, message: 'Template updated successfully' });
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

router.delete('/templates/:id', async (req, res) => {
  try {
    const result = await templateService.deleteTemplate(req.params.id);
    res.json({ success: true, message: result.message });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/templates/default', async (req, res) => {
  try {
    const template = await templateService.getDefaultTemplate();
    res.json({ success: true, data: template });
  } catch (error) {
    console.error('Error getting default template:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/criteria', async (req, res) => {
  try {
    const criteria = await criteriaService.getAllCriteria();
    res.json({ success: true, data: criteria });
  } catch (error) {
    console.error('Error getting criteria:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/criteria/industries', async (req, res) => {
  try {
    const criteria = await criteriaService.getIndustryCriteria();
    res.json({ success: true, data: criteria });
  } catch (error) {
    console.error('Error getting industry criteria:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/criteria/industries', async (req, res) => {
  try {
    const criteria = await criteriaService.updateIndustryCriteria(req.body);
    res.json({ success: true, data: criteria, message: 'Industry criteria updated successfully' });
  } catch (error) {
    console.error('Error updating industry criteria:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/criteria/requirements', async (req, res) => {
  try {
    const criteria = await criteriaService.getRequirementsCriteria();
    res.json({ success: true, data: criteria });
  } catch (error) {
    console.error('Error getting requirements criteria:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/criteria/requirements', async (req, res) => {
  try {
    const criteria = await criteriaService.updateRequirementsCriteria(req.body);
    res.json({ success: true, data: criteria, message: 'Requirements criteria updated successfully' });
  } catch (error) {
    console.error('Error updating requirements criteria:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;

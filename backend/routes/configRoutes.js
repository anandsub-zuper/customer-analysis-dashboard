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

module.exports = router;

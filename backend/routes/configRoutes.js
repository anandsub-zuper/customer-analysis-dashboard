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

module.exports = router;

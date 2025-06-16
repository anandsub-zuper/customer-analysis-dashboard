// backend/routes/conversationalRoutes.js
const express = require('express');
const router = express.Router();
const conversationalController = require('../controllers/conversationalController');

// @route   POST api/conversation/query
// @desc    Process conversational query
// @access  Public
router.post('/query', conversationalController.processQuery);

// @route   GET api/conversation/suggestions/:analysisId
// @desc    Get contextual suggestions for an analysis
// @access  Public  
router.get('/suggestions/:analysisId', conversationalController.getSuggestions);

// @route   POST api/conversation/email
// @desc    Generate email based on analysis
// @access  Public
router.post('/email', conversationalController.generateEmail);

// @route   POST api/conversation/agenda
// @desc    Generate meeting agenda
// @access  Public
router.post('/agenda', conversationalController.generateAgenda);

module.exports = router;

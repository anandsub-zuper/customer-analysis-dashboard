const express = require('express');
const router = express.Router();
const analysisController = require('../controllers/analysisController');
// Remove auth import - not needed

// @route   POST api/analysis/transcript
// @desc    Analyze a meeting transcript
// @access  Public
router.post('/transcript', analysisController.analyzeTranscript);

// @route   GET api/analysis/history
// @desc    Get analysis history
// @access  Public
router.get('/history', analysisController.getAnalysisHistory);

// @route   GET api/analysis/:id
// @desc    Get a specific analysis by ID
// @access  Public
router.get('/:id', analysisController.getAnalysis);

// @route   GET api/analysis/:id/export
// @desc    Export analysis as PDF
// @access  Public
router.get('/:id/export', analysisController.exportAnalysisAsPdf);

// @route   DELETE api/analysis/:id
// @desc    Delete an analysis
// @access  Public
router.delete('/:id', analysisController.deleteAnalysis);

module.exports = router;

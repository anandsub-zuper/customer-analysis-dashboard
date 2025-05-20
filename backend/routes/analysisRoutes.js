const express = require('express');
const router = express.Router();
const analysisController = require('../controllers/analysisController');
const auth = require('../middleware/authMiddleware');

// @route   POST api/analysis/transcript
// @desc    Analyze a meeting transcript
// @access  Private
router.post('/transcript', auth, analysisController.analyzeTranscript);

module.exports = router;

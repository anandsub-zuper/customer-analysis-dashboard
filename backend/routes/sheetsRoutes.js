const express = require('express');
const router = express.Router();
const sheetsController = require('../controllers/sheetsController');
const auth = require('../middleware/authMiddleware');

// @route   GET api/sheets/list
// @desc    List available sheets
// @access  Public
router.get('/list', sheetsController.listSheets);

// @route   GET api/sheets/data
// @desc    Get data from a specific sheet
// @access  Public
router.get('/data', sheetsController.getSheetData);

// --- New Routes for RAG Implementation ---

// @route   GET api/sheets/historical-data
// @desc    Get formatted historical data for RAG analysis
// @access  Private
router.get('/historical-data', auth, sheetsController.getHistoricalData);

// @route   GET api/sheets/industry/:industry
// @desc    Get historical data filtered by industry
// @access  Private
router.get('/industry/:industry', auth, sheetsController.getDataByIndustry);

// @route   POST api/sheets/refresh-cache
// @desc    Refresh the cached historical data
// @access  Private
router.post('/refresh-cache', auth, sheetsController.refreshHistoricalDataCache);

module.exports = router;

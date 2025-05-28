const express = require('express');
const router = express.Router();
const sheetsController = require('../controllers/sheetsController');
// Remove auth import - not needed

// @route   GET api/sheets/list
// @desc    List available sheets
// @access  Public
router.get('/list', sheetsController.listSheets);

// @route   GET api/sheets/data
// @desc    Get data from a specific sheet
// @access  Public
router.get('/data', sheetsController.getSheetData);

// --- Routes for RAG Implementation ---

// @route   GET api/sheets/historical-data
// @desc    Get formatted historical data for RAG analysis
// @access  Public
router.get('/historical-data', sheetsController.getHistoricalData);

// @route   GET api/sheets/industry/:industry
// @desc    Get historical data filtered by industry
// @access  Public
router.get('/industry/:industry', sheetsController.getDataByIndustry);

// @route   POST api/sheets/refresh-cache
// @desc    Refresh the cached historical data
// @access  Public
router.post('/refresh-cache', sheetsController.refreshHistoricalDataCache);

module.exports = router;

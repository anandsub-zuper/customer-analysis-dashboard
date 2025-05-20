const express = require('express');
const router = express.Router();
const sheetsController = require('../controllers/sheetsController');

// @route   GET api/sheets/list
// @desc    List available sheets
// @access  Public
router.get('/list', sheetsController.listSheets);

// @route   GET api/sheets/data
// @desc    Get data from a specific sheet
// @access  Public
router.get('/data', sheetsController.getSheetData);

module.exports = router;

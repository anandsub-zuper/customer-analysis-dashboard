const express = require('express');
const router = express.Router();
const docsController = require('../controllers/docsController');
// Remove auth import - not needed

// @route   GET api/docs/list
// @desc    List available Google Docs
// @access  Public
router.get('/list', docsController.listDocs);

// @route   GET api/docs/:id
// @desc    Get content of a specific Google Doc
// @access  Public
router.get('/:id', docsController.getDocContent);

// --- Routes for RAG Implementation ---

// @route   GET api/docs/analysis-folder
// @desc    List documents from the analysis folder
// @access  Public
router.get('/analysis-folder', docsController.listAnalysisDocuments);

// @route   POST api/docs/extract
// @desc    Extract structured customer data from a document
// @access  Public
router.post('/extract', docsController.extractCustomerData);

// @route   GET api/docs/search
// @desc    Search documents with specific keywords
// @access  Public
router.get('/search', docsController.searchDocuments);

module.exports = router;

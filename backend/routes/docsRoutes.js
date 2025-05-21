const express = require('express');
const router = express.Router();
const docsController = require('../controllers/docsController');
const auth = require('../middleware/authMiddleware');

// @route   GET api/docs/list
// @desc    List available Google Docs
// @access  Private
router.get('/list', auth, docsController.listDocs);

// @route   GET api/docs/:id
// @desc    Get content of a specific Google Doc
// @access  Private
router.get('/:id', auth, docsController.getDocContent);

// --- New Routes for RAG Implementation ---

// @route   GET api/docs/analysis-folder
// @desc    List documents from the analysis folder
// @access  Private
router.get('/analysis-folder', auth, docsController.listAnalysisDocuments);

// @route   POST api/docs/extract
// @desc    Extract structured customer data from a document
// @access  Private
router.post('/extract', auth, docsController.extractCustomerData);

// @route   GET api/docs/search
// @desc    Search documents with specific keywords
// @access  Private
router.get('/search', auth, docsController.searchDocuments);

module.exports = router;

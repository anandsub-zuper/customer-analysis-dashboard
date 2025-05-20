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

module.exports = router;

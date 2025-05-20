const docsService = require('../services/googleDocsService');
const driveService = require('../services/googleDriveService');

// @route   GET api/docs/list
// @desc    List available Google Docs
// @access  Private
exports.listDocs = async (req, res) => {
  try {
    const { folderId } = req.query;
    const docs = await driveService.listDocuments(folderId);
    res.json(docs);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @route   GET api/docs/:id
// @desc    Get content of a specific Google Doc
// @access  Private
exports.getDocContent = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ message: 'Document ID is required' });
    }
    
    const document = await docsService.getDocContent(id);
    const plainText = docsService.extractText(document);
    
    res.json({ 
      document,
      plainText
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

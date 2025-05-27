const openaiService = require('../services/openaiService');
const docsService = require('../services/googleDocsService');
const analysisService = require('../services/analysisService');

// @route   POST api/analysis/transcript
// @desc    Analyze a meeting transcript
// @access  Private
exports.analyzeTranscript = async (req, res) => {
  try {
    const { transcript, documentId, templateId } = req.body;
    
    if (!transcript && !documentId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Either transcript text or document ID is required' 
      });
    }
    
    let transcriptText = transcript;
    
    // If documentId is provided, fetch the document content
    if (documentId) {
      try {
        const document = await docsService.getDocContent(documentId);
        transcriptText = docsService.extractText(document);
      } catch (docErr) {
        console.error('Error fetching document:', docErr);
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to fetch document content' 
        });
      }
    }
    
    if (!transcriptText || transcriptText.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Transcript content is empty'
      });
    }
    
    // Analyze the transcript with OpenAI using RAG
    try {
      const analysisResults = await openaiService.analyzeTranscript(transcriptText);
      
      // Add document reference and template if provided
      analysisResults.documentId = documentId || null;
      analysisResults.templateId = templateId || null;
      analysisResults.timestamp = new Date();
      
      // Save analysis results to MongoDB
      const savedAnalysis = await analysisService.saveAnalysisResults(analysisResults);
      
      // Return the complete analysis results with MongoDB ID
      res.json({
        success: true,
        message: 'Analysis completed and saved',
        results: savedAnalysis
      });
    } catch (aiErr) {
      console.error('Error with OpenAI analysis:', aiErr);
      return res.status(500).json({
        success: false,
        message: 'Error analyzing transcript with AI',
        error: aiErr.message
      });
    }
  } catch (err) {
    console.error('Error analyzing transcript:', err);
    res.status(500).json({
      success: false,
      message: 'Server error analyzing transcript',
      error: err.message
    });
  }
};

// @route   GET api/analysis/history
// @desc    Get analysis history
// @access  Private
exports.getAnalysisHistory = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    // Get analysis history from MongoDB
    const analyses = await analysisService.listRecentAnalyses(limit);
    
    res.json({
      success: true,
      message: 'Analysis history retrieved',
      data: analyses
    });
  } catch (err) {
    console.error('Error getting analysis history:', err);
    res.status(500).json({
      success: false,
      message: 'Server error getting analysis history',
      error: err.message
    });
  }
};

// @route   GET api/analysis/:id
// @desc    Get a specific analysis by ID
// @access  Private
exports.getAnalysis = async (req, res) => {
  try {
    const analysisId = req.params.id;
    
    // Get analysis from MongoDB
    const analysis = await analysisService.getAnalysisById(analysisId);
    
    res.json({
      success: true,
      message: 'Analysis retrieved',
      data: analysis
    });
  } catch (err) {
    console.error('Error getting analysis:', err);
    
    if (err.message === 'Analysis not found') {
      return res.status(404).json({
        success: false,
        message: 'Analysis not found'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error getting analysis',
      error: err.message
    });
  }
};

// @route   GET api/analysis/:id/export
// @desc    Export analysis as PDF
// @access  Private
exports.exportAnalysisAsPdf = async (req, res) => {
  try {
    const analysisId = req.params.id;
    
    // Get analysis from MongoDB
    const analysis = await analysisService.getAnalysisById(analysisId);
    
    // For now, return a placeholder message
    // In a real implementation, you would generate a PDF
    res.status(501).json({
      success: false,
      message: 'PDF export feature not implemented yet'
    });
    
    // PDF generation would normally happen here
    // Example:
    // const pdfBuffer = await generatePdf(analysis);
    // res.set('Content-Type', 'application/pdf');
    // res.set('Content-Disposition', `attachment; filename="${analysis.customerName} Analysis.pdf"`);
    // res.send(pdfBuffer);
  } catch (err) {
    console.error('Error exporting analysis:', err);
    
    if (err.message === 'Analysis not found') {
      return res.status(404).json({
        success: false,
        message: 'Analysis not found'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error exporting analysis',
      error: err.message
    });
  }
};

// @route   DELETE api/analysis/:id
// @desc    Delete an analysis
// @access  Private
exports.deleteAnalysis = async (req, res) => {
  try {
    const analysisId = req.params.id;
    
    // Delete from MongoDB
    const result = await analysisService.deleteAnalysis(analysisId);
    
    res.json({
      success: true,
      message: 'Analysis deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting analysis:', err);
    
    if (err.message === 'Analysis not found') {
      return res.status(404).json({
        success: false,
        message: 'Analysis not found'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error deleting analysis',
      error: err.message
    });
  }
};

module.exports = exports;

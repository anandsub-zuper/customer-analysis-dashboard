const openaiService = require('../services/openaiService');
const docsService = require('../services/googleDocsService');

// @route   POST api/analysis/transcript
// @desc    Analyze a meeting transcript
// @access  Private
exports.analyzeTranscript = async (req, res) => {
  try {
    const { transcript, documentId } = req.body;
    
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
    // The openaiService will retrieve historical data and include it in the prompt
    try {
      const analysisResults = await openaiService.analyzeTranscript(transcriptText);
      
      // Add unique ID and date if not present
      const analysisId = 'analysis-' + Date.now();
      analysisResults.id = analysisId;
      if (!analysisResults.date) {
        analysisResults.date = new Date().toLocaleDateString();
      }
      
      // Store the analysis results
      storeAnalysisResults(analysisResults);
      
      // Return the complete analysis results
      res.json({
        success: true,
        message: 'Analysis completed',
        results: analysisResults
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
    
    // Get analysis history
    // In a production application, this would fetch from a database
    const history = getStoredAnalysisHistory(limit);
    
    res.json({
      success: true,
      message: 'Analysis history retrieved',
      data: history
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
    
    // Find the analysis by ID
    const analysis = analysisHistory.find(item => item.id === analysisId);
    
    if (!analysis) {
      return res.status(404).json({
        success: false,
        message: 'Analysis not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Analysis retrieved',
      data: analysis
    });
  } catch (err) {
    console.error('Error getting analysis:', err);
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
    
    // Find the analysis by ID
    const analysis = analysisHistory.find(item => item.id === analysisId);
    
    if (!analysis) {
      return res.status(404).json({
        success: false,
        message: 'Analysis not found'
      });
    }
    
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
    
    // Find the analysis index
    const analysisIndex = analysisHistory.findIndex(item => item.id === analysisId);
    
    if (analysisIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Analysis not found'
      });
    }
    
    // Remove the analysis
    analysisHistory.splice(analysisIndex, 1);
    
    res.json({
      success: true,
      message: 'Analysis deleted'
    });
  } catch (err) {
    console.error('Error deleting analysis:', err);
    res.status(500).json({
      success: false,
      message: 'Server error deleting analysis',
      error: err.message
    });
  }
};

// In-memory storage for analysis results (temporary solution)
// In a production application, this would be replaced with a database
let analysisHistory = [
  {
    id: 'sample-analysis-1',
    customerName: "Bullfrog Spas",
    industry: "Manufacturing and Retail",
    fitScore: 91,
    date: "Jan 15, 2024",
    userCount: {
      total: 30,
      backOffice: 9,
      field: 21
    },
    services: ["Installation", "Repair", "Maintenance", "Site Survey"],
    requirements: {
      keyFeatures: ["Mobile App", "Customer Portal", "Checklists"],
      integrations: ["Hubspot", "QuickBooks"]
    }
  },
  {
    id: 'sample-analysis-2',
    customerName: "Greenline Electrify",
    industry: "Solar, Residential and Commercial",
    fitScore: 89,
    date: "Dec 18, 2023",
    userCount: {
      total: 12,
      backOffice: 3,
      field: 9
    },
    services: ["Installation", "Maintenance"]
  },
  {
    id: 'sample-analysis-3',
    customerName: "Jusclean Services",
    industry: "Commercial Cleaning Services",
    fitScore: 76,
    date: "Dec 18, 2023",
    userCount: {
      total: 25,
      backOffice: 5,
      field: 20
    },
    services: ["Cleaning", "Maintenance"]
  },
  {
    id: 'sample-analysis-4',
    customerName: "LCMS Disaster Response",
    industry: "Non-Profit Christian Disaster Response",
    fitScore: 62,
    date: "Dec 21, 2023",
    userCount: {
      total: 45,
      backOffice: 15,
      field: 30
    },
    services: ["Emergency Response", "Cleanup", "Restoration"]
  },
  {
    id: 'sample-analysis-5',
    customerName: "FITNESS FOR LIFE SPORTING GOODS",
    industry: "Sporting Goods",
    fitScore: 42,
    date: "Jan 3, 2024",
    userCount: {
      total: 15,
      backOffice: 10,
      field: 5
    },
    services: ["Equipment Installation", "Repair"]
  }
];

/**
 * Store analysis results
 * @param {Object} results - Analysis results to store
 */
function storeAnalysisResults(results) {
  // Add date if not present
  if (!results.date) {
    results.date = new Date().toLocaleDateString();
  }
  
  // Insert at the beginning of the array
  analysisHistory.unshift(results);
  
  // Limit the size of the history
  if (analysisHistory.length > 100) {
    analysisHistory = analysisHistory.slice(0, 100);
  }
}

/**
 * Get stored analysis history
 * @param {number} limit - Maximum number of items to return
 * @returns {Array} - Analysis history
 */
function getStoredAnalysisHistory(limit) {
  return analysisHistory.slice(0, limit);
}

module.exports = exports;

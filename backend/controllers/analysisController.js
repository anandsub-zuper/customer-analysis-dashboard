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
      
      // Store the analysis results
      // In a production application, this would save to a database
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

// In-memory storage for analysis results (temporary solution)
// In a production application, this would be replaced with a database
let analysisHistory = [
  {
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

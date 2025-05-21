const docsService = require('../services/googleDocsService');
const driveService = require('../services/googleDriveService');
const historicalDataService = require('../services/historicalDataService');

// @route   GET api/docs/list
// @desc    List available Google Docs
// @access  Private
exports.listDocs = async (req, res) => {
  try {
    const { folderId } = req.query;
    const docs = await driveService.listDocuments(folderId);
    res.json(docs);
  } catch (err) {
    console.error('Error listing documents:', err);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
};

// @route   GET api/docs/:id
// @desc    Get content of a specific Google Doc
// @access  Private
exports.getDocContent = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ 
        success: false,
        message: 'Document ID is required' 
      });
    }
    
    const document = await docsService.getDocContent(id);
    const plainText = docsService.extractText(document);
    
    res.json({ 
      success: true,
      document,
      plainText
    });
  } catch (err) {
    console.error('Error getting document content:', err);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
};

// @route   GET api/docs/analysis-folder
// @desc    List documents from the analysis folder
// @access  Private
exports.listAnalysisDocuments = async (req, res) => {
  try {
    // Get the configured analysis folder ID
    const folderId = process.env.ANALYSIS_DOCS_FOLDER_ID;
    
    if (!folderId) {
      return res.status(400).json({
        success: false,
        message: 'Analysis folder ID is not configured'
      });
    }
    
    // Get documents from the folder
    const docs = await driveService.listDocuments(folderId);
    
    // Sort by modified date (newest first)
    docs.sort((a, b) => new Date(b.modifiedTime) - new Date(a.modifiedTime));
    
    res.json({
      success: true,
      folderName: 'Analysis Documents',
      documents: docs
    });
  } catch (err) {
    console.error('Error listing analysis documents:', err);
    res.status(500).json({
      success: false,
      message: 'Server error listing analysis documents',
      error: err.message
    });
  }
};

// @route   POST api/docs/extract
// @desc    Extract structured customer data from a document
// @access  Private
exports.extractCustomerData = async (req, res) => {
  try {
    const { documentId } = req.body;
    
    if (!documentId) {
      return res.status(400).json({
        success: false,
        message: 'Document ID is required'
      });
    }
    
    // Get the document content
    const document = await docsService.getDocContent(documentId);
    const plainText = docsService.extractText(document);
    
    // Get document metadata
    const docMetadata = await driveService.getFileMetadata(documentId);
    
    // Extract structured data from the document
    const customerData = extractCustomerDataFromDoc(plainText, docMetadata.name);
    
    if (!customerData || Object.keys(customerData).length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Could not extract customer data from document',
        documentName: docMetadata.name
      });
    }
    
    res.json({
      success: true,
      message: 'Customer data extracted',
      data: customerData
    });
  } catch (err) {
    console.error('Error extracting customer data:', err);
    res.status(500).json({
      success: false,
      message: 'Server error extracting customer data',
      error: err.message
    });
  }
};

// @route   GET api/docs/search
// @desc    Search documents with specific keywords
// @access  Private
exports.searchDocuments = async (req, res) => {
  try {
    const { query, folderId } = req.query;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }
    
    // Search in the specified folder, or in the analysis folder if not specified
    const targetFolderId = folderId || process.env.ANALYSIS_DOCS_FOLDER_ID;
    
    if (!targetFolderId) {
      return res.status(400).json({
        success: false,
        message: 'Folder ID is required (either in query or env variables)'
      });
    }
    
    // Search documents
    const searchResults = await driveService.searchInFolder(targetFolderId, query);
    
    res.json({
      success: true,
      message: `Found ${searchResults.length} documents matching "${query}"`,
      results: searchResults
    });
  } catch (err) {
    console.error('Error searching documents:', err);
    res.status(500).json({
      success: false,
      message: 'Server error searching documents',
      error: err.message
    });
  }
};

/**
 * Extract customer data from a Google Doc
 * @param {string} content - Document content
 * @param {string} docName - Document name
 * @returns {Object|null} - Customer data object or null if extraction failed
 */
function extractCustomerDataFromDoc(content, docName) {
  try {
    // Check if the document is a customer analysis document
    if (!content.includes('Customer Analysis') && 
        !content.includes('Fit Analysis') && 
        !content.includes('Customer Fit')) {
      return null;
    }
    
    // Initialize customer object
    const customer = {
      customerName: '',
      industry: '',
      userCount: {
        total: 0,
        backOffice: 0,
        field: 0
      },
      services: [],
      requirements: {
        keyFeatures: [],
        integrations: []
      },
      fitScore: 0
    };
    
    // Extract customer name from document name or content
    const nameFromDoc = docName.match(/Analysis(?:\s+for)?\s+([^-]+)/i);
    if (nameFromDoc) {
      customer.customerName = nameFromDoc[1].trim();
    } else {
      const nameMatch = content.match(/(?:Customer|Company)(?:\s+Name)?:\s*([^\n]+)/i);
      if (nameMatch) {
        customer.customerName = nameMatch[1].trim();
      }
    }
    
    // Extract industry
    const industryMatch = content.match(/Industry:\s*([^\n]+)/i);
    if (industryMatch) {
      customer.industry = industryMatch[1].trim();
    }
    
    // Extract user counts
    const totalUsersMatch = content.match(/(?:Total\s+)?Users?(?:\s+Count)?:\s*(\d+)/i);
    if (totalUsersMatch) {
      customer.userCount.total = parseInt(totalUsersMatch[1], 10);
    }
    
    const officeMatch = content.match(/(?:Office|Back\s+Office)\s+(?:Staff|Users?):\s*(\d+)/i);
    if (officeMatch) {
      customer.userCount.backOffice = parseInt(officeMatch[1], 10);
    }
    
    const fieldMatch = content.match(/(?:Field|Technician)\s+(?:Staff|Users?):\s*(\d+)/i);
    if (fieldMatch) {
      customer.userCount.field = parseInt(fieldMatch[1], 10);
    }
    
    // Extract services
    const servicesMatch = content.match(/Services?(?:\s+Types?)?:(?:\s*)((?:[\s\S](?!Requirements|Key Features|Integrations))*)/i);
    if (servicesMatch) {
      const servicesText = servicesMatch[1].trim();
      // Check if services are listed with bullet points or commas
      if (servicesText.includes('\n')) {
        // Bullet point list
        customer.services = servicesText
          .split('\n')
          .map(s => s.replace(/^[•\-*]\s*/, '').trim())
          .filter(Boolean);
      } else {
        // Comma-separated list
        customer.services = servicesText
          .split(/[,;]/)
          .map(s => s.trim())
          .filter(Boolean);
      }
    }
    
    // Extract key features/requirements
    const featuresMatch = content.match(/(?:Key\s+)?Requirements|Key\s+Features:(?:\s*)((?:[\s\S](?!Integration|Timeline|Fit Score))*)/i);
    if (featuresMatch) {
      const featuresText = featuresMatch[1].trim();
      // Check if features are listed with bullet points or commas
      if (featuresText.includes('\n')) {
        // Bullet point list
        customer.requirements.keyFeatures = featuresText
          .split('\n')
          .map(f => f.replace(/^[•\-*]\s*/, '').trim())
          .filter(Boolean);
      } else {
        // Comma-separated list
        customer.requirements.keyFeatures = featuresText
          .split(/[,;]/)
          .map(f => f.trim())
          .filter(Boolean);
      }
    }
    
    // Extract integrations
    const integrationsMatch = content.match(/Integrations?(?:\s+Requirements?)?:(?:\s*)((?:[\s\S](?!Timeline|Fit Score))*)/i);
    if (integrationsMatch) {
      const integrationsText = integrationsMatch[1].trim();
      // Check if integrations are listed with bullet points or commas
      if (integrationsText.includes('\n')) {
        // Bullet point list
        customer.requirements.integrations = integrationsText
          .split('\n')
          .map(i => i.replace(/^[•\-*]\s*/, '').trim())
          .filter(Boolean);
      } else {
        // Comma-separated list
        customer.requirements.integrations = integrationsText
          .split(/[,;]/)
          .map(i => i.trim())
          .filter(Boolean);
      }
    }
    
    // Extract fit score
    const fitScoreMatch = content.match(/Fit\s+Score:?\s*(\d+)/i);
    if (fitScoreMatch) {
      customer.fitScore = parseInt(fitScoreMatch[1], 10);
    }
    
    return customer;
  } catch (error) {
    console.error(`Error extracting customer data from document ${docName}:`, error);
    return null;
  }
}

module.exports = exports;

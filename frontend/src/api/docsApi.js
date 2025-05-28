import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// No auth interceptor needed since there's no frontend-backend auth

/**
 * List available Google Docs
 * @param {string} folderId - Optional folder ID to list docs from
 * @returns {Promise<Object>} - Response with list of documents
 */
export const listDocs = async (folderId = null) => {
  try {
    const params = folderId ? { folderId } : {};
    const response = await api.get('/api/docs/list', { params });
    
    if (response.data && response.data.success === false) {
      throw new Error(response.data.message || 'Failed to list documents');
    }
    
    return response.data;
  } catch (error) {
    console.error('Error listing Google Docs:', error);
    throw error;
  }
};

/**
 * Get content of a specific Google Doc
 * @param {string} documentId - ID of the Google Doc
 * @returns {Promise<Object>} - Document content and plain text
 */
export const getDocContent = async (documentId) => {
  try {
    const response = await api.get(`/api/docs/${documentId}`);
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to retrieve document content');
    }
    
    return response.data;
  } catch (error) {
    console.error('Error getting document content:', error);
    throw error;
  }
};

/**
 * List documents from the analysis folder
 * @returns {Promise<Object>} - List of analysis documents
 */
export const listAnalysisDocuments = async () => {
  try {
    const response = await api.get('/api/docs/analysis-folder');
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to list analysis documents');
    }
    
    return response.data;
  } catch (error) {
    console.error('Error listing analysis documents:', error);
    throw error;
  }
};

/**
 * Extract customer data from a document
 * @param {string} documentId - ID of the document to extract data from
 * @returns {Promise<Object>} - Extracted customer data
 */
export const extractCustomerData = async (documentId) => {
  try {
    const response = await api.post('/api/docs/extract', { documentId });
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to extract customer data');
    }
    
    return response.data;
  } catch (error) {
    console.error('Error extracting customer data:', error);
    throw error;
  }
};

/**
 * Search documents with specific keywords
 * @param {string} query - Search query
 * @param {string} folderId - Optional folder ID to search within
 * @returns {Promise<Object>} - Search results
 */
export const searchDocuments = async (query, folderId = null) => {
  try {
    const params = { query };
    if (folderId) {
      params.folderId = folderId;
    }
    
    const response = await api.get('/api/docs/search', { params });
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to search documents');
    }
    
    return response.data;
  } catch (error) {
    console.error('Error searching documents:', error);
    throw error;
  }
};

// Export the configured axios instance for custom requests
export { api as docsApiClient };

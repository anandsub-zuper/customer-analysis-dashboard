// frontend/src/api/analysisApi.js

import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

/**
 * Analyze a meeting transcript with enhanced RAG capabilities
 * @param {string} transcriptText - The transcript text to analyze (optional if documentId is provided)
 * @param {string} documentId - Google Doc ID to analyze (optional if transcriptText is provided)
 * @returns {Promise<Object>} - Analysis results
 */
export const analyzeTranscript = async (transcriptText, documentId = null) => {
  try {
    const response = await axios.post(`${API_URL}/analysis/transcript`, {
      transcript: transcriptText,
      documentId
    });
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Analysis failed');
    }
    
    return response.data;
  } catch (error) {
    console.error('Error analyzing transcript:', error);
    throw error;
  }
};

/**
 * Get analysis history
 * @param {number} limit - Number of items to return (default: 10)
 * @returns {Promise<Array>} - Array of analysis history items
 */
export const getAnalysisHistory = async (limit = 10) => {
  try {
    const response = await axios.get(`${API_URL}/analysis/history`, {
      params: { limit }
    });
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to retrieve analysis history');
    }
    
    return response.data;
  } catch (error) {
    console.error('Error getting analysis history:', error);
    throw error;
  }
};

/**
 * Get a specific analysis by ID
 * @param {string} analysisId - The ID of the analysis to retrieve
 * @returns {Promise<Object>} - Detailed analysis information
 */
export const getAnalysis = async (analysisId) => {
  try {
    const response = await axios.get(`${API_URL}/analysis/${analysisId}`);
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to retrieve analysis');
    }
    
    return response.data;
  } catch (error) {
    console.error(`Error retrieving analysis ${analysisId}:`, error);
    throw error;
  }
};

/**
 * Export analysis results as PDF
 * @param {string} analysisId - The ID of the analysis to export
 * @returns {Promise<Blob>} - PDF blob
 */
export const exportAnalysisAsPdf = async (analysisId) => {
  try {
    const response = await axios.get(`${API_URL}/analysis/${analysisId}/export`, {
      responseType: 'blob'
    });
    
    return new Blob([response.data], { type: 'application/pdf' });
  } catch (error) {
    console.error(`Error exporting analysis ${analysisId}:`, error);
    throw error;
  }
};

/**
 * Delete an analysis
 * @param {string} analysisId - The ID of the analysis to delete
 * @returns {Promise<Object>} - Deletion result
 */
export const deleteAnalysis = async (analysisId) => {
  try {
    const response = await axios.delete(`${API_URL}/analysis/${analysisId}`);
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to delete analysis');
    }
    
    return response.data;
  } catch (error) {
    console.error(`Error deleting analysis ${analysisId}:`, error);
    throw error;
  }
};

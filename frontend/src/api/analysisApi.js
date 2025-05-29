// frontend/src/api/analysisApi.js - Enhanced with retry logic

import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

/**
 * Helper function to wait for a specified time
 */
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Analyze a meeting transcript with retry logic for timeouts
 * @param {string} transcriptText - The transcript text to analyze
 * @param {string} documentId - Google Doc ID to analyze
 * @param {string} templateId - Template ID to use for analysis
 * @param {function} onRetry - Callback for retry attempts (optional)
 * @returns {Promise<Object>} - Analysis results
 */
export const analyzeTranscript = async (
  transcriptText, 
  documentId = null, 
  templateId = null,
  onRetry = null
) => {
  const maxRetries = 3;
  const retryDelays = [2000, 5000, 10000]; // 2s, 5s, 10s
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Analysis attempt ${attempt + 1}/${maxRetries + 1}`);
      
      const response = await axios.post(
        `${API_URL}/api/analysis/transcript`,
        {
          transcript: transcriptText,
          documentId,
          templateId
        },
        {
          timeout: 35000, // Set client timeout slightly higher than Heroku's
          validateStatus: (status) => {
            // Don't throw on 503 (timeout) - we'll retry
            return status < 500 || status === 503;
          }
        }
      );
      
      // Check if we got a timeout response
      if (response.status === 503) {
        throw new Error('Request timed out');
      }
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Analysis failed');
      }
      
      // Success! Return the results
      return response.data;
      
    } catch (error) {
      console.error(`Analysis attempt ${attempt + 1} failed:`, error.message);
      lastError = error;
      
      // Check if it's a timeout or network error
      const isTimeout = error.code === 'ECONNABORTED' || 
                       error.message.includes('timeout') ||
                       error.response?.status === 503;
      
      if (isTimeout && attempt < maxRetries) {
        const delay = retryDelays[attempt] || 5000;
        console.log(`Retrying in ${delay}ms...`);
        
        // Call retry callback if provided
        if (onRetry) {
          onRetry(attempt + 1, maxRetries);
        }
        
        await wait(delay);
        continue; // Try again
      }
      
      // Not a timeout or no more retries
      break;
    }
  }
  
  // All attempts failed
  console.error('All analysis attempts failed:', lastError);
  throw lastError;
};

/**
 * Alternative: Poll for analysis results (for future implementation)
 * This would require backend changes to support async analysis
 */
export const analyzeTranscriptAsync = async (
  transcriptText,
  documentId = null,
  templateId = null,
  onStatusUpdate = null
) => {
  // Step 1: Start analysis (would need new backend endpoint)
  const startResponse = await axios.post(`${API_URL}/api/analysis/start`, {
    transcript: transcriptText,
    documentId,
    templateId
  });
  
  const analysisId = startResponse.data.analysisId;
  
  // Step 2: Poll for results
  const maxPolls = 20;
  const pollInterval = 3000; // 3 seconds
  
  for (let i = 0; i < maxPolls; i++) {
    await wait(pollInterval);
    
    try {
      const statusResponse = await axios.get(
        `${API_URL}/api/analysis/status/${analysisId}`
      );
      
      if (onStatusUpdate) {
        onStatusUpdate(statusResponse.data.status, i + 1, maxPolls);
      }
      
      if (statusResponse.data.status === 'completed') {
        return statusResponse.data;
      }
      
      if (statusResponse.data.status === 'failed') {
        throw new Error('Analysis failed: ' + statusResponse.data.error);
      }
    } catch (error) {
      console.error('Error polling for status:', error);
    }
  }
  
  throw new Error('Analysis timed out after polling');
};

// Keep other functions unchanged
export const getAnalysisHistory = async (limit = 10) => {
  try {
    const response = await axios.get(`${API_URL}/api/analysis/history`, {
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

export const getAnalysis = async (analysisId) => {
  try {
    const response = await axios.get(`${API_URL}/api/analysis/${analysisId}`);
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to retrieve analysis');
    }
    
    return response.data;
  } catch (error) {
    console.error(`Error retrieving analysis ${analysisId}:`, error);
    throw error;
  }
};

export const deleteAnalysis = async (analysisId) => {
  try {
    const response = await axios.delete(`${API_URL}/api/analysis/${analysisId}`);
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to delete analysis');
    }
    
    return response.data;
  } catch (error) {
    console.error(`Error deleting analysis ${analysisId}:`, error);
    throw error;
  }
};

export const exportAnalysisAsPdf = async (analysisId) => {
  try {
    const response = await axios.get(`${API_URL}/api/analysis/${analysisId}/export`, {
      responseType: 'blob'
    });
    
    return new Blob([response.data], { type: 'application/pdf' });
  } catch (error) {
    console.error(`Error exporting analysis ${analysisId}:`, error);
    throw error;
  }
};

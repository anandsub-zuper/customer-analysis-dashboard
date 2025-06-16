// frontend/src/api/conversationalApi.js
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const sendQuery = async (query, analysisId, conversationId) => {
  try {
    const response = await axios.post(`${API_URL}/api/conversation/query`, {
      query,
      analysisId,
      conversationId
    });
    return response.data;
  } catch (error) {
    console.error('Error sending query:', error);
    throw error;
  }
};

export const getSuggestions = async (analysisId) => {
  try {
    const response = await axios.get(`${API_URL}/api/conversation/suggestions/${analysisId}`);
    return response.data;
  } catch (error) {
    console.error('Error getting suggestions:', error);
    throw error;
  }
};

export const generateEmail = async (analysisId, emailType, customInstructions) => {
  try {
    const response = await axios.post(`${API_URL}/api/conversation/email`, {
      analysisId,
      emailType,
      customInstructions
    });
    return response.data;
  } catch (error) {
    console.error('Error generating email:', error);
    throw error;
  }
};

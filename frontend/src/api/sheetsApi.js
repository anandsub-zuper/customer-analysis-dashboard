import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Get available sheets from historical data spreadsheet
export const listSheets = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/sheets/list`);
    
    // Handle both old format (array) and new format (object with success flag)
    if (response.data.success) {
      return response.data.data;
    }
    return response.data;
  } catch (error) {
    console.error('Error listing sheets:', error);
    throw error;
  }
};

// Get data from a specific sheet
export const getSheetData = async (spreadsheetId, range) => {
  try {
    // Build params - only include spreadsheetId if provided
    const params = { range };
    if (spreadsheetId) {
      params.spreadsheetId = spreadsheetId;
    }
    
    const response = await axios.get(`${API_URL}/api/sheets/data`, {
      params
    });
    
    // Handle both old format (array) and new format (object with success flag)
    if (response.data.success) {
      return response.data.data;
    }
    return response.data;
  } catch (error) {
    console.error('Error getting sheet data:', error);
    throw error;
  }
};

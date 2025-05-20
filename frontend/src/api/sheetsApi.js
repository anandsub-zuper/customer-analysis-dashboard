import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

// Get available sheets from historical data spreadsheet
export const listSheets = async () => {
  try {
    const response = await axios.get(`${API_URL}/sheets/list`);
    return response.data;
  } catch (error) {
    console.error('Error listing sheets:', error);
    throw error;
  }
};

// Get data from a specific sheet
export const getSheetData = async (spreadsheetId, range) => {
  try {
    const response = await axios.get(`${API_URL}/sheets/data`, {
      params: { spreadsheetId, range }
    });
    return response.data;
  } catch (error) {
    console.error('Error getting sheet data:', error);
    throw error;
  }
};

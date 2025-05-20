const { google } = require('googleapis');
const { JWT } = require('google-auth-library');
let serviceAccount;

if (process.env.NODE_ENV === 'production') {
  serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
} else {
  serviceAccount = require('../config/serviceAccount.json');
}
//const serviceAccount = require('../config/serviceAccount.json');

// Create a JWT client
const jwtClient = new JWT({
  email: serviceAccount.client_email,
  key: serviceAccount.private_key,
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

// Initialize the Sheets API
const sheets = google.sheets({ version: 'v4', auth: jwtClient });

// Function to get data from a Google Sheet
exports.getSheetData = async (spreadsheetId, range) => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });
    
    return response.data.values;
  } catch (error) {
    console.error('Error accessing Google Sheets:', error);
    throw new Error('Failed to retrieve data from Google Sheets');
  }
};

// Function to list all sheets in a spreadsheet
exports.listSheets = async (spreadsheetId) => {
  try {
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
    });
    
    return response.data.sheets.map(sheet => ({
      id: sheet.properties.sheetId,
      title: sheet.properties.title,
    }));
  } catch (error) {
    console.error('Error listing sheets:', error);
    throw new Error('Failed to list sheets');
  }
};

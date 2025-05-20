const { google } = require('googleapis');
const { JWT } = require('google-auth-library');

// Initialize service account with better error handling
let serviceAccount;
let jwtClient;

try {
  // Log environment for debugging
  console.log("NODE_ENV:", process.env.NODE_ENV);
  
  if (process.env.NODE_ENV === 'production') {
    console.log("Using production service account from environment variable");
    
    // Check if environment variable exists
    if (!process.env.GOOGLE_SERVICE_ACCOUNT) {
      throw new Error("GOOGLE_SERVICE_ACCOUNT environment variable is not set");
    }
    
    try {
      // Parse the service account JSON
      serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
      console.log("Successfully parsed service account JSON");
      
      // Verify required fields
      if (!serviceAccount.client_email || !serviceAccount.private_key) {
        throw new Error("Service account is missing required fields: client_email or private_key");
      }
    } catch (parseError) {
      throw new Error(`Failed to parse GOOGLE_SERVICE_ACCOUNT: ${parseError.message}`);
    }
  } else {
    console.log("Using local service account file");
    try {
      serviceAccount = require('../config/serviceAccount.json');
      console.log("Successfully loaded service account from file");
    } catch (fileError) {
      throw new Error(`Failed to load service account file: ${fileError.message}`);
    }
  }
  
  // Log successful initialization of service account (without revealing private key)
  console.log("Service account email:", serviceAccount.client_email);
  
  // Create JWT client
  jwtClient = new JWT({
    email: serviceAccount.client_email,
    key: serviceAccount.private_key,
    scopes: ['https://www.googleapis.com/auth/documents.readonly'],
  });
  
  console.log("JWT client successfully created");
} catch (error) {
  console.error("ERROR INITIALIZING GOOGLE AUTH:", error.message);
  // Continue execution instead of crashing - you might want to handle this differently
  // depending on your application needs
}

// Export the JWT client
module.exports = jwtClient;

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

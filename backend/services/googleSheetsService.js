const { google } = require('googleapis');
const { JWT } = require('google-auth-library');

/**
 * Initialize JWT client for Google Sheets API
 * This function handles different environment configurations
 */
const getJwtClient = () => {
  try {
    // Log environment for debugging
    console.log(`Initializing Google Sheets Service in ${process.env.NODE_ENV || 'development'} mode`);
    
    let jwtClient;
    
    // Production environment
    if (process.env.NODE_ENV === 'production') {
      console.log('Using production credentials...');
      
      // Option 1: Using base64-encoded service account
      if (process.env.GOOGLE_SERVICE_ACCOUNT_BASE64) {
        console.log('Using base64-encoded service account');
        try {
          const base64 = process.env.GOOGLE_SERVICE_ACCOUNT_BASE64;
          const serviceAccountJson = Buffer.from(base64, 'base64').toString();
          const serviceAccount = JSON.parse(serviceAccountJson);
          
          jwtClient = new JWT({
            email: serviceAccount.client_email,
            key: serviceAccount.private_key,
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
          });
          
          console.log(`Successfully initialized JWT client with email: ${serviceAccount.client_email}`);
        } catch (base64Error) {
          throw new Error(`Failed to parse base64-encoded service account: ${base64Error.message}`);
        }
      }
      // Option 2: Using individual environment variables
      else if (process.env.SA_CLIENT_EMAIL && process.env.SA_PRIVATE_KEY) {
        console.log('Using individual service account environment variables');
        
        jwtClient = new JWT({
          email: process.env.SA_CLIENT_EMAIL,
          key: process.env.SA_PRIVATE_KEY,
          scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });
        
        console.log(`Successfully initialized JWT client with email: ${process.env.SA_CLIENT_EMAIL}`);
      }
      // Option 3: Using JSON service account
      else if (process.env.GOOGLE_SERVICE_ACCOUNT) {
        console.log('Using JSON service account from environment variable');
        try {
          const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
          
          jwtClient = new JWT({
            email: serviceAccount.client_email,
            key: serviceAccount.private_key,
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
          });
          
          console.log(`Successfully initialized JWT client with email: ${serviceAccount.client_email}`);
        } catch (jsonError) {
          throw new Error(`Failed to parse JSON service account: ${jsonError.message}`);
        }
      }
      // No valid credentials found
      else {
        throw new Error('No service account credentials found in environment variables');
      }
    }
    // Development environment - use local file
    else {
      console.log('Using local service account file');
      try {
        const serviceAccount = require('../config/serviceAccount.json');
        
        jwtClient = new JWT({
          email: serviceAccount.client_email,
          key: serviceAccount.private_key,
          scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });
        
        console.log(`Successfully initialized JWT client with email: ${serviceAccount.client_email}`);
      } catch (fileError) {
        throw new Error(`Failed to load local service account file: ${fileError.message}`);
      }
    }
    
    return jwtClient;
  } catch (error) {
    console.error('===== ERROR INITIALIZING GOOGLE SHEETS SERVICE =====');
    console.error(error);
    
    // Instead of crashing, return null and handle this in the calling code
    return null;
  }
};

// Initialize the JWT client
const jwtClient = getJwtClient();

// Initialize the Sheets API
const sheets = jwtClient ? google.sheets({ version: 'v4', auth: jwtClient }) : null;

/**
 * Function to get data from a Google Sheet
 * @param {string} spreadsheetId - ID of the spreadsheet
 * @param {string} range - Range of cells to retrieve (e.g., 'Sheet1!A1:Z100')
 * @returns {Promise<Array>} - Array of rows
 */
exports.getSheetData = async (spreadsheetId, range) => {
  if (!sheets) {
    throw new Error('Google Sheets API client not initialized');
  }
  
  try {
    console.log(`Fetching data from spreadsheet: ${spreadsheetId}, range: ${range}`);
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });
    
    console.log(`Successfully retrieved ${response.data.values?.length || 0} rows`);
    return response.data.values || [];
  } catch (error) {
    console.error('Error accessing Google Sheets:', error);
    throw new Error(`Failed to retrieve data from Google Sheets: ${error.message}`);
  }
};

/**
 * Function to list all sheets in a spreadsheet
 * @param {string} spreadsheetId - ID of the spreadsheet
 * @returns {Promise<Array>} - Array of sheet objects with id and title
 */
exports.listSheets = async (spreadsheetId) => {
  if (!sheets) {
    throw new Error('Google Sheets API client not initialized');
  }
  
  try {
    console.log(`Listing sheets in spreadsheet: ${spreadsheetId}`);
    
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
    });
    
    const sheetList = response.data.sheets.map(sheet => ({
      id: sheet.properties.sheetId,
      title: sheet.properties.title,
    }));
    
    console.log(`Found ${sheetList.length} sheets`);
    return sheetList;
  } catch (error) {
    console.error('Error listing sheets:', error);
    throw new Error(`Failed to list sheets: ${error.message}`);
  }
};

/**
 * Get metadata about a spreadsheet
 * @param {string} spreadsheetId - ID of the spreadsheet
 * @returns {Promise<Object>} - Spreadsheet metadata
 */
exports.getSpreadsheetInfo = async (spreadsheetId) => {
  if (!sheets) {
    throw new Error('Google Sheets API client not initialized');
  }
  
  try {
    console.log(`Getting metadata for spreadsheet: ${spreadsheetId}`);
    
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
    });
    
    return {
      title: response.data.properties.title,
      locale: response.data.properties.locale,
      timeZone: response.data.properties.timeZone,
      sheets: response.data.sheets.map(sheet => ({
        id: sheet.properties.sheetId,
        title: sheet.properties.title,
        index: sheet.properties.index,
        sheetType: sheet.properties.sheetType,
        rowCount: sheet.properties.gridProperties?.rowCount,
        columnCount: sheet.properties.gridProperties?.columnCount,
      })),
    };
  } catch (error) {
    console.error('Error getting spreadsheet metadata:', error);
    throw new Error(`Failed to retrieve spreadsheet metadata: ${error.message}`);
  }
};

// Export the Google Sheets API client for advanced usage
exports.sheets = sheets;

// Export the JWT client for reuse with other Google APIs
exports.jwtClient = jwtClient;

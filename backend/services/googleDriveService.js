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

// Initialize the Drive API
const drive = google.drive({ version: 'v3', auth: jwtClient });

// Function to list Google Docs files
exports.listDocuments = async (folderId = null) => {
  try {
    let query = "mimeType='application/vnd.google-apps.document'";
    
    if (folderId) {
      query += ` and '${folderId}' in parents`;
    }
    
    const response = await drive.files.list({
      q: query,
      fields: 'files(id, name, createdTime, modifiedTime)',
      orderBy: 'modifiedTime desc',
    });
    
    return response.data.files;
  } catch (error) {
    console.error('Error listing documents:', error);
    throw new Error('Failed to list documents from Google Drive');
  }
};

// Function to list spreadsheets
exports.listSpreadsheets = async (folderId = null) => {
  try {
    let query = "mimeType='application/vnd.google-apps.spreadsheet'";
    
    if (folderId) {
      query += ` and '${folderId}' in parents`;
    }
    
    const response = await drive.files.list({
      q: query,
      fields: 'files(id, name, createdTime, modifiedTime)',
      orderBy: 'modifiedTime desc',
    });
    
    return response.data.files;
  } catch (error) {
    console.error('Error listing spreadsheets:', error);
    throw new Error('Failed to list spreadsheets from Google Drive');
  }
};

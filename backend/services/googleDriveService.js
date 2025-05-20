const { google } = require('googleapis');
const { JWT } = require('google-auth-library');
const serviceAccount = require('../config/serviceAccount.json');

// Create a JWT client
const jwtClient = new JWT({
  email: serviceAccount.client_email,
  key: serviceAccount.private_key,
  scopes: ['https://www.googleapis.com/auth/drive.readonly'],
});

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

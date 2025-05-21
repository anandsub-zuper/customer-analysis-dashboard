const { google } = require('googleapis');
const { JWT } = require('google-auth-library');

/**
 * Initialize JWT client for Google Drive API
 * This function handles different environment configurations
 */
const getJwtClient = () => {
  try {
    // Log environment for debugging
    console.log(`Initializing Google Drive Service in ${process.env.NODE_ENV || 'development'} mode`);
    
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
            scopes: ['https://www.googleapis.com/auth/drive.readonly'],
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
          scopes: ['https://www.googleapis.com/auth/drive.readonly'],
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
            scopes: ['https://www.googleapis.com/auth/drive.readonly'],
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
          scopes: ['https://www.googleapis.com/auth/drive.readonly'],
        });
        
        console.log(`Successfully initialized JWT client with email: ${serviceAccount.client_email}`);
      } catch (fileError) {
        throw new Error(`Failed to load local service account file: ${fileError.message}`);
      }
    }
    
    return jwtClient;
  } catch (error) {
    console.error('===== ERROR INITIALIZING GOOGLE DRIVE SERVICE =====');
    console.error(error);
    
    // Instead of crashing, return null and handle this in the calling code
    return null;
  }
};

// Initialize the JWT client
const jwtClient = getJwtClient();

// Initialize the Drive API
const drive = jwtClient ? google.drive({ version: 'v3', auth: jwtClient }) : null;

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

// Additional methods to add to your googleDriveService.js file

/**
 * Search for files in a specific folder
 * @param {string} folderId - Folder ID to search in
 * @param {string} query - Search query
 * @returns {Promise<Array>} - Array of matching files
 */
exports.searchInFolder = async (folderId, query) => {
  if (!drive) {
    throw new Error('Google Drive API client not initialized');
  }
  
  try {
    console.log(`Searching for "${query}" in folder: ${folderId}`);
    
    // Construct the search query for Drive API
    let driveQuery = '';
    
    if (folderId) {
      driveQuery += `'${folderId}' in parents and `;
    }
    
    // Add fullText search and file type filter (only documents)
    driveQuery += `(mimeType='application/vnd.google-apps.document') and ` +
                  `(fullText contains '${query}')`;
    
    const response = await drive.files.list({
      q: driveQuery,
      fields: 'files(id, name, mimeType, createdTime, modifiedTime, webViewLink)',
      orderBy: 'modifiedTime desc',
      pageSize: 20
    });
    
    const files = response.data.files || [];
    console.log(`Found ${files.length} files matching "${query}"`);
    
    return files;
  } catch (error) {
    console.error('Error searching in Drive folder:', error);
    throw new Error(`Failed to search in folder: ${error.message}`);
  }
};

/**
 * Get metadata for a specific file
 * @param {string} fileId - File ID
 * @returns {Promise<Object>} - File metadata
 */
exports.getFileMetadata = async (fileId) => {
  if (!drive) {
    throw new Error('Google Drive API client not initialized');
  }
  
  try {
    console.log(`Getting metadata for file: ${fileId}`);
    
    const response = await drive.files.get({
      fileId: fileId,
      fields: 'id, name, mimeType, createdTime, modifiedTime, parents, webViewLink'
    });
    
    return response.data;
  } catch (error) {
    console.error('Error getting file metadata:', error);
    throw new Error(`Failed to get file metadata: ${error.message}`);
  }
};

// Export the Google Drive API client for advanced usage
exports.drive = drive;

// Export the JWT client for reuse with other Google APIs
exports.jwtClient = jwtClient;

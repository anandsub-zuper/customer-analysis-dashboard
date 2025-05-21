const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { google } = require('googleapis');
const { JWT } = require('google-auth-library');

// Load environment variables
dotenv.config();

// Initialize JWT client based on environment
let jwtClient;

// Production environment - use environment variables
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
        scopes: [
          'https://www.googleapis.com/auth/spreadsheets.readonly',
          'https://www.googleapis.com/auth/documents.readonly',
          'https://www.googleapis.com/auth/drive.readonly'
        ],
      });
      
      console.log(`Successfully initialized JWT client with email: ${serviceAccount.client_email}`);
    } catch (base64Error) {
      console.error(`Failed to parse base64-encoded service account: ${base64Error.message}`);
    }
  }
  // Option 2: Using individual environment variables
  else if (process.env.SA_CLIENT_EMAIL && process.env.SA_PRIVATE_KEY) {
    console.log('Using individual service account environment variables');
    
    jwtClient = new JWT({
      email: process.env.SA_CLIENT_EMAIL,
      key: process.env.SA_PRIVATE_KEY,
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets.readonly',
        'https://www.googleapis.com/auth/documents.readonly',
        'https://www.googleapis.com/auth/drive.readonly'
      ],
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
        scopes: [
          'https://www.googleapis.com/auth/spreadsheets.readonly',
          'https://www.googleapis.com/auth/documents.readonly',
          'https://www.googleapis.com/auth/drive.readonly'
        ],
      });
      
      console.log(`Successfully initialized JWT client with email: ${serviceAccount.client_email}`);
    } catch (jsonError) {
      console.error(`Failed to parse JSON service account: ${jsonError.message}`);
    }
  }
  // No valid credentials found
  else {
    console.error('No service account credentials found in environment variables');
  }
} 
// Development environment - use local file
else {
  console.log('Using local service account file');
  try {
    const serviceAccount = require('./config/serviceAccount.json');
    
    jwtClient = new JWT({
      email: serviceAccount.client_email,
      key: serviceAccount.private_key,
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets.readonly',
        'https://www.googleapis.com/auth/documents.readonly',
        'https://www.googleapis.com/auth/drive.readonly'
      ],
    });
    
    console.log(`Successfully initialized JWT client with email: ${serviceAccount.client_email}`);
  } catch (fileError) {
    console.error(`Failed to load local service account file: ${fileError.message}`);
  }
}

// Import routes
const sheetsRoutes = require('./routes/sheetsRoutes');
const docsRoutes = require('./routes/docsRoutes');
const analysisRoutes = require('./routes/analysisRoutes');

// Initialize app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/sheets', sheetsRoutes);
app.use('/api/docs', docsRoutes);
app.use('/api/analysis', analysisRoutes);

// Root route
app.get('/', (req, res) => {
  res.send('Customer Analysis Dashboard API is running');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

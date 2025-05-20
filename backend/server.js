const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { google } = require('googleapis');
const { JWT } = require('google-auth-library');
const serviceAccount = require('./config/serviceAccount.json');


// Load environment variables
dotenv.config();

const jwtClient = new JWT({
  email: serviceAccount.client_email,
  key: serviceAccount.private_key,
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets.readonly',
    'https://www.googleapis.com/auth/documents.readonly',
    'https://www.googleapis.com/auth/drive.readonly'
  ],
});

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

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { google } = require('googleapis');
const { JWT } = require('google-auth-library');
const { connect, close, getDb } = require('./services/mongoDbService');
const configRoutes = require('./routes/configRoutes');


// Load environment variables
dotenv.config();

// Google API Setup (keeping your existing Google integration)
let serviceAccount;
try {
  serviceAccount = require('./config/serviceAccount.json');
} catch (error) {
  console.log('No local service account file found, using environment variables');
}

const jwtClient = new JWT({
  email: serviceAccount?.client_email || process.env.SA_CLIENT_EMAIL,
  key: serviceAccount?.private_key || process.env.SA_PRIVATE_KEY,
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
const dashboardRoutes = require('./routes/dashboardRoutes');
const conversationalRoutes = require('./routes/conversationalRoutes');

// Initialize app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/api/config', configRoutes);
app.use('/api/conversation', conversationalRoutes);

// Connect to MongoDB on startup
async function initializeServer() {
  try {
    console.log('Initializing server...');
    
    // Connect to MongoDB
    await connect();
    console.log('MongoDB connection established');
    
    // Start server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log('Environment:', process.env.NODE_ENV || 'development');
    });
    
  } catch (error) {
    console.error('Failed to initialize server:', error);
    process.exit(1);
  }
}

// Routes
app.use('/api/sheets', sheetsRoutes);
app.use('/api/docs', docsRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // You can add a simple MongoDB ping here if needed
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'ERROR', 
      message: error.message 
    });
  }
});

// Test connections endpoint
app.get('/api/test-connections', async (req, res) => {
  const results = {
    timestamp: new Date().toISOString(),
    connections: {}
  };
  
  // Test MongoDB
  try {
    const db = await getDb();
    if (db) {
      await db.admin().ping();
      results.connections.mongodb = {
        status: 'connected',
        message: 'MongoDB Atlas connection successful',
        database: db.databaseName
      };
    } else {
      results.connections.mongodb = {
        status: 'error',
        message: 'MongoDB connection not initialized'
      };
    }
  } catch (error) {
    results.connections.mongodb = {
      status: 'error',
      message: `MongoDB error: ${error.message}`
    };
  }
  
  // Test Google Sheets
  try {
    const { sheets } = require('./services/googleSheetsService');
    if (sheets) {
      // Try to get spreadsheet info
      const spreadsheetId = process.env.HISTORICAL_DATA_SPREADSHEET_ID;
      if (spreadsheetId) {
        const info = await sheets.spreadsheets.get({
          spreadsheetId: spreadsheetId
        });
        results.connections.googleSheets = {
          status: 'connected',
          message: 'Google Sheets API connected',
          spreadsheetTitle: info.data.properties.title
        };
      } else {
        results.connections.googleSheets = {
          status: 'error',
          message: 'HISTORICAL_DATA_SPREADSHEET_ID not configured'
        };
      }
    } else {
      results.connections.googleSheets = {
        status: 'error',
        message: 'Google Sheets service not initialized'
      };
    }
  } catch (error) {
    results.connections.googleSheets = {
      status: 'error',
      message: `Google Sheets error: ${error.message}`
    };
  }
  
  // Test Google Docs
  try {
    const { docs } = require('./services/googleDocsService');
    if (docs) {
      // Just check if the service is initialized
      results.connections.googleDocs = {
        status: 'connected',
        message: 'Google Docs API ready'
      };
    } else {
      results.connections.googleDocs = {
        status: 'error',
        message: 'Google Docs service not initialized'
      };
    }
  } catch (error) {
    results.connections.googleDocs = {
      status: 'error',
      message: `Google Docs error: ${error.message}`
    };
  }
  
  // Test OpenAI
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      results.connections.openai = {
        status: 'configured',
        message: 'OpenAI API key configured',
        keyPrefix: apiKey.substring(0, 7) + '...'
      };
    } else {
      results.connections.openai = {
        status: 'error',
        message: 'OPENAI_API_KEY not configured'
      };
    }
  } catch (error) {
    results.connections.openai = {
      status: 'error',
      message: `OpenAI configuration error: ${error.message}`
    };
  }
  
  // Overall status
  const allConnected = Object.values(results.connections).every(
    conn => conn.status === 'connected' || conn.status === 'configured'
  );
  
  results.overall = {
    status: allConnected ? 'healthy' : 'degraded',
    message: allConnected ? 'All services connected' : 'Some services have issues'
  };
  
  res.json({
    success: true,
    data: results
  });
});

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Customer Analysis Dashboard API is running',
    version: '2.0.0',
    database: 'MongoDB Atlas',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Handle 404 routes
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  });
});

// Graceful shutdown handlers
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  try {
    await close();
    console.log('MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  try {
    await close();
    console.log('MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', async (error) => {
  console.error('Uncaught Exception:', error);
  try {
    await close();
  } catch (closeError) {
    console.error('Error closing MongoDB connection:', closeError);
  }
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', async (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  try {
    await close();
  } catch (closeError) {
    console.error('Error closing MongoDB connection:', closeError);
  }
  process.exit(1);
});

// Initialize and start the server
initializeServer();  

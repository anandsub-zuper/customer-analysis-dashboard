const { MongoClient } = require('mongodb');

// Connection URI from environment variables
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('ERROR: MONGODB_URI environment variable is not set');
}

// Database Name - can be extracted from the URI or set explicitly
const dbName = uri ? (uri.split('/').pop().split('?')[0] || 'customer_analysis_db') : 'customer_analysis_db';

// Create a new MongoClient
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Connection state tracking
let connected = false;
let db = null;

/**
 * Connect to MongoDB Atlas
 */
async function connect() {
  if (!connected) {
    try {
      console.log('Connecting to MongoDB Atlas...');
      
      // Connect the client to the server
      await client.connect();
      
      // Confirm connection
      await client.db('admin').command({ ping: 1 });
      console.log('Connected successfully to MongoDB Atlas');
      
      // Get the database
      db = client.db(dbName);
      connected = true;
      
    } catch (error) {
      console.error('MongoDB connection error:', error);
      throw error;
    }
  }
  
  return db;
}

/**
 * Get database instance (connects if not already connected)
 */
async function getDb() {
  if (!connected) {
    return await connect();
  }
  return db;
}

/**
 * Close the database connection
 */
async function close() {
  if (connected) {
    await client.close();
    connected = false;
    db = null;
    console.log('MongoDB connection closed');
  }
}

// Handle application shutdown
process.on('SIGINT', async () => {
  await close();
  process.exit(0);
});

// Handle Heroku app termination signal
process.on('SIGTERM', async () => {
  await close();
  process.exit(0);
});

module.exports = {
  connect,
  getDb,
  close
};

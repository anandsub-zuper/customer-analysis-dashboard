const { MongoClient } = require('mongodb');
require('dotenv').config();

// Get MongoDB URI from environment variables
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('ERROR: MONGODB_URI environment variable is not set');
  process.exit(1);
}

// Database Name
const dbName = uri.split('/').pop().split('?')[0] || 'customer_analysis_db';

console.log(`Initializing database structure: ${dbName}`);

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function initDatabase() {
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB Atlas');
    
    const db = client.db(dbName);
    
    // Check existing collections
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    console.log('📁 Existing collections:', collectionNames.join(', ') || 'none');
    
    // Initialize database structure only
    await initAnalysesCollection(db, collectionNames);
    await initTemplatesCollection(db, collectionNames);
    await initConfigurationStructure(db, collectionNames);
    await initDashboardMetricsCollection(db, collectionNames);
    
    console.log('✅ Database structure initialization completed');
    
    // Verify structure
    const finalCollections = await db.listCollections().toArray();
    const configCount = await db.collection('configuration').countDocuments();
    
    console.log(`📊 Final state:`);
    console.log(`- Collections: ${finalCollections.map(c => c.name).join(', ')}`);
    console.log(`- Configuration documents: ${configCount}`);
    
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    return false;
  } finally {
    if (client) {
      await client.close();
      console.log('🔐 MongoDB connection closed');
    }
  }
}

/**
 * Initialize configuration structure - NO BUSINESS LOGIC
 * Only creates empty/minimal structures that the UI can populate
 */
async function initConfigurationStructure(db, existingCollections) {
  try {
    console.log('\n🔧 Setting up configuration structure...');
    
    if (!existingCollections.includes('configuration')) {
      await db.createCollection('configuration');
      console.log('📝 Created configuration collection');
    }
    
    // Only create EMPTY structures - no business decisions
    const structuralConfigs = [
      { 
        _id: 'api', 
        key: '', // Empty - user must configure
        maxUsage: 100,
        alertThreshold: 80,
        createdAt: new Date()
      },
      { 
        _id: 'model', 
        type: 'gpt-4-turbo',
        temperature: 0.7,
        maxTokens: 2500,
        depth: 'Standard',
        timeout: 30000,
        createdAt: new Date()
      },
      { 
        _id: 'industries', 
        whitelist: [], // EMPTY - user configures through UI
        blacklist: [], // EMPTY - user configures through UI
        createdAt: new Date(),
        note: 'Configure preferred and blacklisted industries through the Configuration UI'
      },
      { 
        _id: 'requirements', 
        strengths: [], // EMPTY - user configures through UI
        weaknesses: [], // EMPTY - user configures through UI  
        unsupported: [], // EMPTY - user configures through UI
        createdAt: new Date(),
        note: 'Configure platform capabilities through the Configuration UI'
      }
    ];
    
    // Only create if they don't exist - don't overwrite user data
    for (const config of structuralConfigs) {
      const existing = await db.collection('configuration').findOne({ _id: config._id });
      
      if (!existing) {
        await db.collection('configuration').insertOne(config);
        console.log(`📝 Created empty structure for: ${config._id}`);
      } else {
        console.log(`✅ Structure already exists: ${config._id} (preserving user data)`);
      }
    }
    
    console.log('✅ Configuration structure setup complete');
    console.log('ℹ️  Users must configure criteria through the UI');
    
  } catch (error) {
    console.error('❌ Error setting up configuration structure:', error);
    throw error;
  }
}

async function initAnalysesCollection(db, existingCollections) {
  try {
    if (!existingCollections.includes('analyses')) {
      console.log('📊 Creating analyses collection...');
      await db.createCollection('analyses');
      
      await db.collection('analyses').createIndexes([
        { key: { timestamp: -1 }, name: 'timestamp_desc' },
        { key: { customerName: 1 }, name: 'customer_name' },
        { key: { industry: 1 }, name: 'industry' },
        { key: { fitScore: -1 }, name: 'fit_score_desc' }
      ]);
      
      console.log('✅ Analyses collection created with indexes');
    } else {
      console.log('✅ Analyses collection already exists');
    }
  } catch (error) {
    console.error('❌ Error initializing analyses collection:', error);
    throw error;
  }
}

async function initTemplatesCollection(db, existingCollections) {
  try {
    if (!existingCollections.includes('templates')) {
      console.log('📋 Creating templates collection...');
      await db.createCollection('templates');
      
      await db.collection('templates').createIndexes([
        { key: { name: 1 }, name: 'template_name', unique: true },
        { key: { industryFocus: 1 }, name: 'industry_focus' }
      ]);
      
      // Only create a basic default template
      const defaultTemplate = {
        name: 'Standard Analysis Template',
        description: 'Default template for customer analysis',
        industryFocus: 'General',
        tags: ['standard', 'default'],
        createdAt: new Date(),
        updatedAt: new Date(),
        isDefault: true,
        criteria: {
          scoringFactors: [
            'Industry Fit',
            'Feature Requirements', 
            'Integration Complexity',
            'User Count',
            'Timeline'
          ],
          weightings: {
            'Industry Fit': 25,
            'Feature Requirements': 35,
            'Integration Complexity': 20,
            'User Count': 10,
            'Timeline': 10
          }
        }
      };
      
      await db.collection('templates').insertOne(defaultTemplate);
      console.log('✅ Templates collection created with basic default template');
    } else {
      console.log('✅ Templates collection already exists');
    }
  } catch (error) {
    console.error('❌ Error initializing templates collection:', error);
    throw error;
  }
}

async function initDashboardMetricsCollection(db, existingCollections) {
  try {
    if (!existingCollections.includes('dashboard_metrics')) {
      console.log('📈 Creating dashboard_metrics collection...');
      await db.createCollection('dashboard_metrics');
      
      const initialMetrics = [
        {
          _id: 'industry_distribution',
          name: 'industry_distribution', 
          timeframe: 'all_time',
          lastUpdated: new Date(),
          data: {}
        },
        {
          _id: 'average_fit_score',
          name: 'average_fit_score',
          timeframe: 'all_time', 
          lastUpdated: new Date(),
          data: {
            average: 0,
            count: 0,
            sum: 0
          }
        }
      ];
      
      await db.collection('dashboard_metrics').insertMany(initialMetrics);
      console.log('✅ Dashboard metrics collection created');
    } else {
      console.log('✅ Dashboard metrics collection already exists');
    }
  } catch (error) {
    console.error('❌ Error initializing dashboard_metrics collection:', error);
    throw error;
  }
}

// Run initialization if executed directly
if (require.main === module) {
  console.log('🚀 Starting database structure initialization...');
  console.log('ℹ️  This only sets up the database structure');
  console.log('ℹ️  Configure actual criteria through the Configuration UI');
  
  initDatabase()
    .then((success) => {
      if (success) {
        console.log('\n✅ Database structure initialization completed successfully');
        console.log('📝 Next step: Configure your analysis criteria through the UI');
        process.exit(0);
      } else {
        console.error('\n❌ Database structure initialization failed');
        process.exit(1);
      }
    })
    .catch(err => {
      console.error('\n❌ Unhandled error in initialization script:', err);
      process.exit(1);
    });
}

module.exports = { initDatabase };

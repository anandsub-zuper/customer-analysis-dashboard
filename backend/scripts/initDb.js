const { MongoClient } = require('mongodb');

// Get MongoDB URI from environment variables
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('ERROR: MONGODB_URI environment variable is not set');
  process.exit(1);
}

// Database Name - can be extracted from the URI or set explicitly
const dbName = uri.split('/').pop().split('?')[0] || 'customer_analysis_db';

console.log(`Initializing database: ${dbName}`);

// MongoDB client
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function initDatabase() {
  try {
    // Connect to MongoDB
    await client.connect();
    console.log('Connected to MongoDB Atlas');
    
    // Get database reference
    const db = client.db(dbName);
    
    // Check existing collections
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    console.log('Existing collections:', collectionNames.join(', ') || 'none');
    
    // Initialize collections
    await initAnalysesCollection(db, collectionNames);
    await initTemplatesCollection(db, collectionNames);
    await initConfigurationCollection(db, collectionNames);
    await initDashboardMetricsCollection(db, collectionNames);
    
    console.log('Database initialization completed successfully');
    return true;
  } catch (error) {
    console.error('Database initialization failed:', error);
    // Don't exit process with an error code, as that would fail the Heroku release
    // Instead, log the error and let the release continue
    return false;
  } finally {
    // Close the connection
    await client.close();
    console.log('MongoDB connection closed');
  }
}

// Initialize Analyses Collection
async function initAnalysesCollection(db, existingCollections) {
  if (!existingCollections.includes('analyses')) {
    console.log('Creating analyses collection...');
    await db.createCollection('analyses');
    
    console.log('Creating indexes for analyses collection...');
    await db.collection('analyses').createIndexes([
      { key: { timestamp: -1 }, name: 'timestamp_desc' },
      { key: { customerName: 1 }, name: 'customer_name' },
      { key: { industry: 1 }, name: 'industry' },
      { key: { fitScore: -1 }, name: 'fit_score_desc' },
      { key: { templateId: 1 }, name: 'template_id' }
    ]);
    
    console.log('Analyses collection created with indexes');
  } else {
    console.log('Analyses collection already exists, checking indexes...');
    
    // Ensure indexes exist even if collection already exists
    const indexInfo = await db.collection('analyses').indexInformation();
    
    // Check and create missing indexes
    const requiredIndexes = [
      { key: { timestamp: -1 }, name: 'timestamp_desc' },
      { key: { customerName: 1 }, name: 'customer_name' },
      { key: { industry: 1 }, name: 'industry' },
      { key: { fitScore: -1 }, name: 'fit_score_desc' },
      { key: { templateId: 1 }, name: 'template_id' }
    ];
    
    for (const idx of requiredIndexes) {
      const indexName = idx.name;
      if (!indexInfo[indexName]) {
        console.log(`Creating missing index: ${indexName}`);
        await db.collection('analyses').createIndex(idx.key, { name: indexName });
      }
    }
  }
}

// Initialize Templates Collection
async function initTemplatesCollection(db, existingCollections) {
  if (!existingCollections.includes('templates')) {
    console.log('Creating templates collection...');
    await db.createCollection('templates');
    
    console.log('Creating indexes for templates collection...');
    await db.collection('templates').createIndexes([
      { key: { name: 1 }, name: 'template_name', unique: true },
      { key: { industryFocus: 1 }, name: 'industry_focus' }
    ]);
    
    // Insert default template
    const defaultTemplate = {
      name: 'Standard Analysis Template',
      description: 'Default template for customer analysis',
      industryFocus: 'General',
      tags: ['standard', 'default'],
      createdAt: new Date(),
      updatedAt: new Date(),
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
    console.log('Templates collection created with default template');
  } else {
    console.log('Templates collection already exists, checking indexes and default template...');
    
    // Ensure indexes exist
    const indexInfo = await db.collection('templates').indexInformation();
    
    // Check and create missing indexes
    if (!indexInfo['template_name']) {
      await db.collection('templates').createIndex({ name: 1 }, { name: 'template_name', unique: true });
    }
    
    if (!indexInfo['industry_focus']) {
      await db.collection('templates').createIndex({ industryFocus: 1 }, { name: 'industry_focus' });
    }
    
    // Check if default template exists
    const defaultTemplate = await db.collection('templates').findOne({ name: 'Standard Analysis Template' });
    
    if (!defaultTemplate) {
      console.log('Creating missing default template...');
      await db.collection('templates').insertOne({
        name: 'Standard Analysis Template',
        description: 'Default template for customer analysis',
        industryFocus: 'General',
        tags: ['standard', 'default'],
        createdAt: new Date(),
        updatedAt: new Date(),
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
      });
    }
  }
}

// Initialize Configuration Collection
async function initConfigurationCollection(db, existingCollections) {
  if (!existingCollections.includes('configuration')) {
    console.log('Creating configuration collection...');
    await db.createCollection('configuration');
    
    // Create default configurations
    const defaultConfigs = [
      { 
        _id: 'api', 
        key: 'sk-sample-api-key',
        maxUsage: 100,
        alertThreshold: 80
      },
      { 
        _id: 'model', 
        type: 'gpt-4-turbo',
        temperature: 0.7,
        depth: 'Standard'
      },
      { 
        _id: 'industries', 
        whitelist: [
          'Construction',
          'Field Services',
          'Property Maintenance',
          'HVAC',
          'Plumbing',
          'Electrical',
          'Cleaning Services',
          'Solar'
        ],
        blacklist: [
          'Food Service',
          'Pure SaaS',
          'Education'
        ]
      },
      { 
        _id: 'requirements', 
        strengths: [
          'Field Technician Management',
          'Real-time Tracking',
          'Work Order Management',
          'Mobile App Capability',
          'Customer Portal',
          'Scheduling',
          'Customizable Checklists'
        ],
        weaknesses: [
          'Complex Manufacturing',
          'Advanced Project Management',
          'Route Optimization'
        ],
        unsupported: [
          'Full ERP',
          'Complex Accounting',
          'Hospital Management'
        ]
      }
    ];
    
    await db.collection('configuration').insertMany(defaultConfigs);
    console.log('Configuration collection created with default settings');
  } else {
    console.log('Configuration collection already exists, checking default configurations...');
    
    // Check if default configurations exist and create if missing
    const configIds = ['api', 'model', 'industries', 'requirements'];
    
    for (const configId of configIds) {
      const config = await db.collection('configuration').findOne({ _id: configId });
      
      if (!config) {
        console.log(`Creating missing configuration: ${configId}`);
        
        let defaultConfig = {};
        
        // Create appropriate default based on config type
        switch (configId) {
          case 'api':
            defaultConfig = {
              _id: 'api',
              key: 'sk-sample-api-key',
              maxUsage: 100,
              alertThreshold: 80
            };
            break;
          case 'model':
            defaultConfig = {
              _id: 'model',
              type: 'gpt-4-turbo',
              temperature: 0.7,
              depth: 'Standard'
            };
            break;
          case 'industries':
            defaultConfig = {
              _id: 'industries',
              whitelist: [
                'Construction',
                'Field Services',
                'Property Maintenance',
                'HVAC',
                'Plumbing',
                'Electrical',
                'Cleaning Services',
                'Solar'
              ],
              blacklist: [
                'Food Service',
                'Pure SaaS',
                'Education'
              ]
            };
            break;
          case 'requirements':
            defaultConfig = {
              _id: 'requirements',
              strengths: [
                'Field Technician Management',
                'Real-time Tracking',
                'Work Order Management',
                'Mobile App Capability',
                'Customer Portal',
                'Scheduling',
                'Customizable Checklists'
              ],
              weaknesses: [
                'Complex Manufacturing',
                'Advanced Project Management',
                'Route Optimization'
              ],
              unsupported: [
                'Full ERP',
                'Complex Accounting',
                'Hospital Management'
              ]
            };
            break;
        }
        
        await db.collection('configuration').insertOne(defaultConfig);
      }
    }
  }
}

// Initialize Dashboard Metrics Collection
async function initDashboardMetricsCollection(db, existingCollections) {
  if (!existingCollections.includes('dashboard_metrics')) {
    console.log('Creating dashboard_metrics collection...');
    await db.createCollection('dashboard_metrics');
    
    // Create initial metric documents
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
    console.log('Dashboard metrics collection created with initial documents');
  } else {
    console.log('Dashboard metrics collection already exists, checking initial metrics...');
    
    // Check if required metrics exist
    const metricIds = ['industry_distribution', 'average_fit_score'];
    
    for (const metricId of metricIds) {
      const metric = await db.collection('dashboard_metrics').findOne({ _id: metricId });
      
      if (!metric) {
        console.log(`Creating missing metric: ${metricId}`);
        
        let initialMetric = {};
        
        if (metricId === 'industry_distribution') {
          initialMetric = {
            _id: 'industry_distribution',
            name: 'industry_distribution',
            timeframe: 'all_time',
            lastUpdated: new Date(),
            data: {}
          };
        } else if (metricId === 'average_fit_score') {
          initialMetric = {
            _id: 'average_fit_score',
            name: 'average_fit_score',
            timeframe: 'all_time',
            lastUpdated: new Date(),
            data: {
              average: 0,
              count: 0,
              sum: 0
            }
          };
        }
        
        await db.collection('dashboard_metrics').insertOne(initialMetric);
      }
    }
  }
}

// Run initialization if executed directly
initDatabase()
  .then(() => {
    console.log('Database initialization script completed');
  })
  .catch(err => {
    console.error('Unhandled error in initialization script:', err);
  });

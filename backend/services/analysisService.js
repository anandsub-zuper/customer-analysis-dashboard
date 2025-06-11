// backend/services/analysisService.js
const { getDb } = require('./mongoDbService');
const { ObjectId } = require('mongodb');

// Save analysis results to MongoDB
exports.saveAnalysisResults = async (analysisData) => {
  try {
    const db = await getDb();
    const collection = db.collection('analyses');
    
    // IMPORTANT: Preserve ALL data from OpenAI, don't restructure it
    const analysisToSave = {
      // Core identification fields
      customerId: analysisData.customerId || null,
      customerName: analysisData.customerName,
      industry: analysisData.industry,
      timestamp: new Date(),
      sourceReference: analysisData.documentId || null,
      templateId: analysisData.templateId || null,
      fitScore: analysisData.fitScore,
      
      // Preserve complete data structures from OpenAI
      userCount: analysisData.userCount || {},
      currentState: analysisData.currentState || {},
      services: analysisData.services || {},
      requirements: analysisData.requirements || {},
      timeline: analysisData.timeline || {},
      budget: analysisData.budget || {},
      summary: analysisData.summary || {},
      
      // Arrays that must be preserved
      strengths: analysisData.strengths || [],
      challenges: analysisData.challenges || [],
      similarCustomers: analysisData.similarCustomers || [],
      
      // Complete recommendations object
      recommendations: analysisData.recommendations || {},
      
      // Score breakdown for debugging
      scoreBreakdown: analysisData.scoreBreakdown || {},
      
      // Keep any other fields that might exist
      ...analysisData
    };
    
    // Remove duplicate fields
    delete analysisToSave.documentId;
    delete analysisToSave.templateId;
    
    // Insert the document
    const result = await collection.insertOne(analysisToSave);
    
    // Update dashboard metrics
    await updateDashboardMetrics(analysisData);
    
    // Return the complete saved document with its ID
    const savedDoc = {
      id: result.insertedId.toString(),
      ...analysisToSave
    };
    
    console.log('Saved analysis with fields:', Object.keys(savedDoc));
    console.log('Strengths count:', savedDoc.strengths?.length || 0);
    console.log('Challenges count:', savedDoc.challenges?.length || 0);
    console.log('Similar customers count:', savedDoc.similarCustomers?.length || 0);
    
    return savedDoc;
  } catch (error) {
    console.error('Error saving analysis:', error);
    throw error;
  }
};

// Get analysis by ID
exports.getAnalysisById = async (id) => {
  try {
    const db = await getDb();
    const collection = db.collection('analyses');
    
    // Convert string ID to ObjectId
    const objectId = new ObjectId(id);
    
    // Find the document
    const analysis = await collection.findOne({ _id: objectId });
    
    if (!analysis) {
      throw new Error('Analysis not found');
    }
    
    // Return complete document with string ID for API consistency
    const result = { 
      id: analysis._id.toString(),
      ...analysis
    };
    
    // Remove the MongoDB _id field to avoid confusion
    delete result._id;
    
    console.log('Retrieved analysis with fields:', Object.keys(result));
    console.log('Strengths count:', result.strengths?.length || 0);
    console.log('Challenges count:', result.challenges?.length || 0);
    
    return result;
  } catch (error) {
    console.error('Error getting analysis:', error);
    throw error;
  }
};

// List recent analyses
exports.listRecentAnalyses = async (limit = 10) => {
  try {
    const db = await getDb();
    const collection = db.collection('analyses');
    
    // Find the most recent analyses
    const analyses = await collection
      .find()
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();
    
    // Convert ObjectIds to strings for API consistency
    return analyses.map(analysis => ({
      id: analysis._id.toString(),
      ...analysis,
      _id: undefined // Remove the MongoDB _id field
    }));
  } catch (error) {
    console.error('Error listing analyses:', error);
    throw error;
  }
};

// Delete analysis by ID
exports.deleteAnalysis = async (id) => {
  try {
    const db = await getDb();
    const collection = db.collection('analyses');
    
    // Convert string ID to ObjectId
    const objectId = new ObjectId(id);
    
    // Delete the document
    const result = await collection.deleteOne({ _id: objectId });
    
    if (result.deletedCount === 0) {
      throw new Error('Analysis not found');
    }
    
    return { success: true, message: 'Analysis deleted successfully' };
  } catch (error) {
    console.error('Error deleting analysis:', error);
    throw error;
  }
};

// Helper function to update dashboard metrics
async function updateDashboardMetrics(analysisData) {
  try {
    const db = await getDb();
    const metricsCollection = db.collection('dashboard_metrics');
    
    // Update industry distribution
    const industry = analysisData.industry;
    await metricsCollection.updateOne(
      { _id: 'industry_distribution' },
      { 
        $set: {
          lastUpdated: new Date()
        },
        $inc: {
          [`data.${industry}`]: 1
        }
      },
      { upsert: true }
    );
    
    // Update average fit score
    const fitScore = analysisData.fitScore;
    const avgScoreDoc = await metricsCollection.findOne({ _id: 'average_fit_score' });
    
    if (!avgScoreDoc) {
      // First entry
      await metricsCollection.insertOne({
        _id: 'average_fit_score',
        name: 'average_fit_score',
        timeframe: 'all_time',
        lastUpdated: new Date(),
        data: {
          average: fitScore,
          count: 1,
          sum: fitScore
        }
      });
    } else {
      // Update existing metrics
      const currentCount = avgScoreDoc.data.count;
      const currentSum = avgScoreDoc.data.sum;
      const newCount = currentCount + 1;
      const newSum = currentSum + fitScore;
      const newAverage = newSum / newCount;
      
      await metricsCollection.updateOne(
        { _id: 'average_fit_score' },
        {
          $set: {
            lastUpdated: new Date(),
            'data.average': newAverage,
            'data.count': newCount,
            'data.sum': newSum
          }
        }
      );
    }
  } catch (error) {
    console.error('Error updating dashboard metrics:', error);
    // Don't throw - this shouldn't block the main operation
  }
}

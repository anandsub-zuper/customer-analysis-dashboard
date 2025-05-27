const express = require('express');
const router = express.Router();
const { getDb } = require('../services/mongoDbService');

// @route   GET api/dashboard/metrics
// @desc    Get dashboard metrics
// @access  Public (should be private in production)
router.get('/metrics', async (req, res) => {
  try {
    const db = await getDb();
    const metricsCollection = db.collection('dashboard_metrics');
    const analysesCollection = db.collection('analyses');
    
    // Get all metrics
    const industryDistribution = await metricsCollection.findOne({ _id: 'industry_distribution' });
    const averageFitScore = await metricsCollection.findOne({ _id: 'average_fit_score' });
    
    // Get recent analyses count
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentAnalysesCount = await analysesCollection.countDocuments({
      timestamp: { $gte: thirtyDaysAgo }
    });
    
    // Get total analyses count
    const totalAnalyses = await analysesCollection.countDocuments();
    
    // Get top industries
    const topIndustries = industryDistribution?.data 
      ? Object.entries(industryDistribution.data)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([industry, count]) => ({ industry, count, percentage: Math.round((count / totalAnalyses) * 100) }))
      : [];
    
    res.json({
      success: true,
      data: {
        recentAnalysesCount,
        totalAnalyses,
        averageFitScore: averageFitScore?.data?.average || 0,
        topIndustries,
        industryDistribution: industryDistribution?.data || {},
        lastUpdated: averageFitScore?.lastUpdated || new Date()
      }
    });
  } catch (error) {
    console.error('Error getting dashboard metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Server error getting dashboard metrics',
      error: error.message
    });
  }
});

// @route   GET api/dashboard/activity
// @desc    Get recent activity
// @access  Public (should be private in production)
router.get('/activity', async (req, res) => {
  try {
    const db = await getDb();
    const analysesCollection = db.collection('analyses');
    
    // Get recent analyses with limited fields
    const recentActivity = await analysesCollection
      .find()
      .sort({ timestamp: -1 })
      .limit(10)
      .project({
        customerName: 1,
        industry: 1,
        timestamp: 1,
        fitScore: 1,
        userCount: 1
      })
      .toArray();
    
    // Convert ObjectIds to strings
    const formattedActivity = recentActivity.map(activity => ({
      id: activity._id.toString(),
      customerName: activity.customerName,
      industry: activity.industry,
      timestamp: activity.timestamp,
      fitScore: activity.fitScore,
      userCount: activity.userCount
    }));
    
    res.json({
      success: true,
      data: formattedActivity
    });
  } catch (error) {
    console.error('Error getting dashboard activity:', error);
    res.status(500).json({
      success: false,
      message: 'Server error getting dashboard activity',
      error: error.message
    });
  }
});

// @route   GET api/dashboard/trends
// @desc    Get analysis trends over time
// @access  Public (should be private in production)
router.get('/trends', async (req, res) => {
  try {
    const db = await getDb();
    const analysesCollection = db.collection('analyses');
    
    // Get analyses from the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const analyses = await analysesCollection
      .find({ timestamp: { $gte: sixMonthsAgo } })
      .sort({ timestamp: 1 })
      .project({
        timestamp: 1,
        fitScore: 1,
        industry: 1
      })
      .toArray();
    
    // Group by month
    const monthlyData = {};
    analyses.forEach(analysis => {
      const monthKey = new Date(analysis.timestamp).toISOString().slice(0, 7); // YYYY-MM
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          count: 0,
          totalScore: 0,
          industries: {}
        };
      }
      monthlyData[monthKey].count++;
      monthlyData[monthKey].totalScore += analysis.fitScore;
      
      if (analysis.industry) {
        monthlyData[monthKey].industries[analysis.industry] = 
          (monthlyData[monthKey].industries[analysis.industry] || 0) + 1;
      }
    });
    
    // Format the data
    const trends = Object.entries(monthlyData).map(([month, data]) => ({
      month,
      analysisCount: data.count,
      averageFitScore: Math.round(data.totalScore / data.count),
      topIndustry: Object.entries(data.industries)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'
    }));
    
    res.json({
      success: true,
      data: trends
    });
  } catch (error) {
    console.error('Error getting dashboard trends:', error);
    res.status(500).json({
      success: false,
      message: 'Server error getting dashboard trends',
      error: error.message
    });
  }
});

module.exports = router;

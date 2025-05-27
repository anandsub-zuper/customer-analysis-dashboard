const sheetsService = require('../services/googleSheetsService');
const historicalDataService = require('../services/historicalDataService');

// Simple cache for historical data to improve performance
let historicalDataCache = null;
let lastCacheRefresh = null;
const CACHE_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

// @route   GET api/sheets/list
// @desc    List available sheets
// @access  Private
exports.listSheets = async (req, res) => {
  try {
    // Use the configured spreadsheet ID
    const spreadsheetId = process.env.HISTORICAL_DATA_SPREADSHEET_ID;
    
    if (!spreadsheetId) {
      return res.status(500).json({ 
        message: 'Historical data spreadsheet ID not configured',
        success: false 
      });
    }
    
    const sheets = await sheetsService.listSheets(spreadsheetId);
    res.json({
      success: true,
      data: sheets
    });
  } catch (err) {
    console.error('Error in listSheets:', err.message);
    res.status(500).json({ 
      message: 'Server error listing sheets',
      error: err.message,
      success: false 
    });
  }
};

// @route   GET api/sheets/data
// @desc    Get data from a specific sheet
// @access  Private
exports.getSheetData = async (req, res) => {
  try {
    const { spreadsheetId, range } = req.query;
    
    // Use the configured spreadsheet ID if none provided
    const sheetId = spreadsheetId || process.env.HISTORICAL_DATA_SPREADSHEET_ID;
    
    if (!sheetId) {
      return res.status(500).json({ 
        message: 'Historical data spreadsheet ID not configured',
        success: false 
      });
    }
    
    if (!range) {
      return res.status(400).json({ 
        message: 'Range is required',
        success: false 
      });
    }
    
    const data = await sheetsService.getSheetData(sheetId, range);
    res.json({
      success: true,
      data: data
    });
  } catch (err) {
    console.error('Error in getSheetData:', err.message);
    res.status(500).json({ 
      message: 'Server error getting sheet data',
      error: err.message,
      success: false 
    });
  }
};

// @route   GET api/sheets/historical-data
// @desc    Get formatted historical data for RAG analysis
// @access  Private
exports.getHistoricalData = async (req, res) => {
  try {
    // Check if we have cached data that's still valid
    if (historicalDataCache && lastCacheRefresh && (Date.now() - lastCacheRefresh < CACHE_EXPIRY_MS)) {
      console.log('Returning historical data from cache');
      return res.json({
        success: true,
        message: 'Historical data retrieved from cache',
        data: historicalDataCache,
        fromCache: true,
        cacheAge: Math.round((Date.now() - lastCacheRefresh) / 1000) // in seconds
      });
    }
    
    // If not, fetch fresh data
    console.log('Fetching fresh historical data');
    const historicalData = await historicalDataService.getHistoricalData();
    
    // Update cache
    historicalDataCache = historicalData;
    lastCacheRefresh = Date.now();
    
    res.json({
      success: true,
      message: 'Historical data retrieved',
      data: historicalData,
      fromCache: false
    });
  } catch (err) {
    console.error('Error getting historical data:', err);
    res.status(500).json({
      success: false,
      message: 'Server error getting historical data',
      error: err.message
    });
  }
};

// @route   GET api/sheets/industry/:industry
// @desc    Get historical data filtered by industry
// @access  Private
exports.getDataByIndustry = async (req, res) => {
  try {
    const { industry } = req.params;
    
    if (!industry) {
      return res.status(400).json({
        success: false,
        message: 'Industry parameter is required'
      });
    }
    
    // Get all historical data (use cache if available)
    let historicalData;
    if (historicalDataCache && lastCacheRefresh && (Date.now() - lastCacheRefresh < CACHE_EXPIRY_MS)) {
      historicalData = historicalDataCache;
    } else {
      historicalData = await historicalDataService.getHistoricalData();
      // Update cache
      historicalDataCache = historicalData;
      lastCacheRefresh = Date.now();
    }
    
    // Filter by industry
    const industryLower = industry.toLowerCase();
    const filteredData = historicalData.filter(item => {
      if (!item.industry) return false;
      return item.industry.toLowerCase().includes(industryLower);
    });
    
    res.json({
      success: true,
      message: `Data for industry "${industry}" retrieved`,
      data: filteredData,
      count: filteredData.length
    });
  } catch (err) {
    console.error(`Error getting data for industry ${req.params.industry}:`, err);
    res.status(500).json({
      success: false,
      message: 'Server error getting industry data',
      error: err.message
    });
  }
};

// @route   POST api/sheets/refresh-cache
// @desc    Refresh the cached historical data
// @access  Private
exports.refreshHistoricalDataCache = async (req, res) => {
  try {
    console.log('Manually refreshing historical data cache');
    
    // Force refresh the data
    const historicalData = await historicalDataService.getHistoricalData();
    
    // Update cache
    historicalDataCache = historicalData;
    lastCacheRefresh = Date.now();
    
    res.json({
      success: true,
      message: 'Historical data cache refreshed',
      count: historicalData.length
    });
  } catch (err) {
    console.error('Error refreshing historical data cache:', err);
    res.status(500).json({
      success: false,
      message: 'Server error refreshing historical data cache',
      error: err.message
    });
  }
};

module.exports = exports;

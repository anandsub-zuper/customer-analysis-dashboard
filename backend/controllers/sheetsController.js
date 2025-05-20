const sheetsService = require('../services/googleSheetsService');

// @route   GET api/sheets/list
// @desc    List available sheets
// @access  Private
exports.listSheets = async (req, res) => {
  try {
    // Use a predefined spreadsheet ID for historical data
    // In production, you might store this in environment variables
    const spreadsheetId = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'; // Example Google Sheets ID
    
    const sheets = await sheetsService.listSheets(spreadsheetId);
    res.json(sheets);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @route   GET api/sheets/data
// @desc    Get data from a specific sheet
// @access  Private
exports.getSheetData = async (req, res) => {
  try {
    const { spreadsheetId, range } = req.query;
    
    if (!spreadsheetId || !range) {
      return res.status(400).json({ message: 'SpreadsheetId and range are required' });
    }
    
    const data = await sheetsService.getSheetData(spreadsheetId, range);
    res.json(data);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

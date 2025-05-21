/**
 * Service for fetching and aggregating historical customer data
 * from multiple Google sources (Forms, Docs, Sheets)
 */
const sheetsService = require('./googleSheetsService');
const docsService = require('./googleDocsService');
const driveService = require('./googleDriveService');

/**
 * Main service for retrieving historical customer data from all sources
 */
const historicalDataService = {
  /**
   * Aggregates historical customer data from all configured sources
   * @returns {Promise<Array>} - Aggregated historical data
   */
  getHistoricalData: async () => {
    try {
      console.log('Retrieving historical customer data from multiple sources...');
      
      // Initialize an array to store all historical data
      let allHistoricalData = [];
      
      // 1. Get data from Google Sheets (if configured)
      const sheetsData = await retrieveFromSheets();
      if (sheetsData && sheetsData.length > 0) {
        console.log(`Retrieved ${sheetsData.length - 1} customer records from Sheets`);
        allHistoricalData = allHistoricalData.concat(normalizeSheetData(sheetsData));
      }
      
      // 2. Get data from Google Forms responses (if configured)
      const formsData = await retrieveFromForms();
      if (formsData && formsData.length > 0) {
        console.log(`Retrieved ${formsData.length} customer records from Forms`);
        allHistoricalData = allHistoricalData.concat(formsData);
      }
      
      // 3. Get data from Google Docs (analysis documents)
      const docsData = await retrieveFromDocs();
      if (docsData && docsData.length > 0) {
        console.log(`Retrieved ${docsData.length} customer records from Docs`);
        allHistoricalData = allHistoricalData.concat(docsData);
      }
      
      // If we didn't get any data, return empty result
      if (allHistoricalData.length === 0) {
        console.warn('No historical data found in any configured sources.');
        return [];
      }
      
      // Return the aggregated data
      return allHistoricalData;
    } catch (error) {
      console.error('Error retrieving historical data:', error);
      return [];
    }
  },
  
  /**
   * Formats historical data for inclusion in the OpenAI prompt
   * @param {Array} historicalData - Aggregated historical data
   * @returns {string} - Formatted historical data as string
   */
  formatHistoricalDataForPrompt: (historicalData) => {
    if (!historicalData || historicalData.length === 0) {
      return "No historical data available.";
    }
    
    // Format each customer as a summary
    const customerSummaries = historicalData.map(customer => {
      return `
Customer: ${customer.customerName || 'Unknown'}
Industry: ${customer.industry || 'Unknown'}
Size: ${customer.userCount?.total || '0'} users (${customer.userCount?.field || '0'} field staff, ${customer.userCount?.backOffice || '0'} office staff)
Services: ${Array.isArray(customer.services) ? customer.services.join(', ') : (customer.services || 'None listed')}
Key Requirements: ${
  customer.requirements?.keyFeatures ? 
  (Array.isArray(customer.requirements.keyFeatures) ? 
   customer.requirements.keyFeatures.join(', ') : 
   customer.requirements.keyFeatures) : 
  'None listed'
}
Integrations: ${
  customer.requirements?.integrations ? 
  (Array.isArray(customer.requirements.integrations) ? 
   customer.requirements.integrations.join(', ') : 
   customer.requirements.integrations) : 
  'None listed'
}
Fit Score: ${customer.fitScore || 'N/A'}
`;
    }).join('\n---\n');
    
    // Calculate aggregate statistics
    const avgFitScore = calculateAverageFitScore(historicalData);
    const topIndustries = getTopIndustries(historicalData);
    
    // Create a section with analysis of historical data
    const historicalAnalysis = `
HISTORICAL DATA SUMMARY:
- Total customers in database: ${historicalData.length}
- Average fit score: ${avgFitScore}
- Top industries: ${topIndustries}
`;

    return `${historicalAnalysis}\n\nDETAILED CUSTOMER EXAMPLES:\n${customerSummaries}`;
  }
};

/**
 * Retrieve customer data from Google Sheets
 * @returns {Promise<Array>} - Array of data rows from the sheet
 */
async function retrieveFromSheets() {
  try {
    // Check if we have a spreadsheet ID configured
    const spreadsheetId = process.env.HISTORICAL_DATA_SPREADSHEET_ID;
    if (!spreadsheetId) {
      console.log('No historical data spreadsheet ID configured, skipping Sheets retrieval.');
      return [];
    }
    
    const range = process.env.HISTORICAL_DATA_RANGE || 'Sheet1!A1:Z1000';
    
    // Retrieve the data from the sheet
    const data = await sheetsService.getSheetData(spreadsheetId, range);
    
    if (!data || data.length < 2) { // Need at least headers + 1 row
      console.warn('Retrieved empty or invalid data from Google Sheets.');
      return [];
    }
    
    return data;
  } catch (error) {
    console.error('Error retrieving data from Google Sheets:', error);
    return [];
  }
}

/**
 * Retrieve customer data from Google Forms responses
 * @returns {Promise<Array>} - Array of customer data objects
 */
async function retrieveFromForms() {
  try {
    // Get forms response spreadsheet IDs from environment variables
    // Format: FORMS_RESPONSE_SHEETS=id1,id2,id3
    const formResponseSheets = process.env.FORMS_RESPONSE_SHEETS;
    if (!formResponseSheets) {
      console.log('No forms response spreadsheets configured, skipping Forms retrieval.');
      return [];
    }
    
    const sheetIds = formResponseSheets.split(',').map(id => id.trim());
    let allFormsData = [];
    
    // For each sheet, retrieve and process the data
    for (const sheetId of sheetIds) {
      try {
        const data = await sheetsService.getSheetData(sheetId, 'Form Responses 1!A1:Z1000');
        if (data && data.length >= 2) {
          const normalizedData = normalizeFormResponseData(data);
          allFormsData = allFormsData.concat(normalizedData);
        }
      } catch (formError) {
        console.error(`Error retrieving data from form response sheet ${sheetId}:`, formError);
        // Continue with the next sheet
      }
    }
    
    return allFormsData;
  } catch (error) {
    console.error('Error retrieving data from Google Forms:', error);
    return [];
  }
}

/**
 * Retrieve customer data from Google Docs (previous analysis documents)
 * @returns {Promise<Array>} - Array of customer data objects
 */
async function retrieveFromDocs() {
  try {
    // Get the folder ID containing the analysis documents
    const analysisFolderId = process.env.ANALYSIS_DOCS_FOLDER_ID;
    if (!analysisFolderId) {
      console.log('No analysis docs folder ID configured, skipping Docs retrieval.');
      return [];
    }
    
    // List documents in the folder
    const documents = await driveService.listDocuments(analysisFolderId);
    if (!documents || documents.length === 0) {
      console.log('No analysis documents found in the specified folder.');
      return [];
    }
    
    const allDocsData = [];
    
    // Process each document (limit to the most recent 20 to avoid excessive API calls)
    const docsToProcess = documents.slice(0, 20);
    
    for (const doc of docsToProcess) {
      try {
        // Get the document content
        const document = await docsService.getDocContent(doc.id);
        const content = docsService.extractText(document);
        
        // Extract customer data from the document
        const customerData = extractCustomerDataFromDoc(content, doc.name);
        if (customerData) {
          allDocsData.push(customerData);
        }
      } catch (docError) {
        console.error(`Error processing document ${doc.name}:`, docError);
        // Continue with the next document
      }
    }
    
    return allDocsData;
  } catch (error) {
    console.error('Error retrieving data from Google Docs:', error);
    return [];
  }
}

/**
 * Normalize data from a Google Sheet into customer objects
 * @param {Array} sheetData - Raw sheet data
 * @returns {Array} - Array of normalized customer objects
 */
function normalizeSheetData(sheetData) {
  // Extract headers from the first row
  const headers = sheetData[0].map(header => header.trim());
  
  // Process each row into a customer object
  return sheetData.slice(1).map(row => {
    const customer = {
      customerName: '',
      industry: '',
      userCount: {
        total: 0,
        backOffice: 0,
        field: 0
      },
      services: [],
      requirements: {
        keyFeatures: [],
        integrations: []
      },
      fitScore: 0
    };
    
    // Map each field based on column headers
    headers.forEach((header, index) => {
      const value = row[index];
      
      // Skip empty values
      if (!value) return;
      
      const headerLower = header.toLowerCase();
      
      if (headerLower.includes('company') || headerLower.includes('customer')) {
        customer.customerName = value;
      } 
      else if (headerLower.includes('industry')) {
        customer.industry = value;
      }
      else if (headerLower.includes('total') && headerLower.includes('user')) {
        customer.userCount.total = parseInt(value, 10) || 0;
      }
      else if ((headerLower.includes('office') || headerLower.includes('back office')) && headerLower.includes('staff')) {
        customer.userCount.backOffice = parseInt(value, 10) || 0;
      }
      else if ((headerLower.includes('field') || headerLower.includes('technician')) && headerLower.includes('staff')) {
        customer.userCount.field = parseInt(value, 10) || 0;
      }
      else if (headerLower.includes('service')) {
        customer.services = value.split(/[,;]/).map(s => s.trim());
      }
      else if (headerLower.includes('requirement') || headerLower.includes('feature')) {
        customer.requirements.keyFeatures = value.split(/[,;]/).map(f => f.trim());
      }
      else if (headerLower.includes('integration')) {
        customer.requirements.integrations = value.split(/[,;]/).map(i => i.trim());
      }
      else if (headerLower.includes('fit') && headerLower.includes('score')) {
        customer.fitScore = parseInt(value, 10) || 0;
      }
    });
    
    return customer;
  });
}

/**
 * Normalize data from Form responses into customer objects
 * @param {Array} formData - Raw form response data
 * @returns {Array} - Array of normalized customer objects
 */
function normalizeFormResponseData(formData) {
  // Extract headers from the first row
  const headers = formData[0].map(header => header.trim());
  
  // Process each row into a customer object
  return formData.slice(1).map(row => {
    const customer = {
      customerName: '',
      industry: '',
      userCount: {
        total: 0,
        backOffice: 0,
        field: 0
      },
      services: [],
      requirements: {
        keyFeatures: [],
        integrations: []
      },
      fitScore: 0
    };
    
    // Map each field based on form question headers
    headers.forEach((header, index) => {
      const value = row[index];
      
      // Skip empty values
      if (!value) return;
      
      const headerLower = header.toLowerCase();
      
      if (headerLower.includes('company') || headerLower.includes('customer') || headerLower.includes('business')) {
        customer.customerName = value;
      } 
      else if (headerLower.includes('industry') || headerLower.includes('sector') || headerLower.includes('vertical')) {
        customer.industry = value;
      }
      else if (headerLower.includes('total') && (headerLower.includes('user') || headerLower.includes('employee'))) {
        customer.userCount.total = parseInt(value, 10) || 0;
      }
      else if ((headerLower.includes('office') || headerLower.includes('back office')) && 
               (headerLower.includes('staff') || headerLower.includes('user') || headerLower.includes('employee'))) {
        customer.userCount.backOffice = parseInt(value, 10) || 0;
      }
      else if ((headerLower.includes('field') || headerLower.includes('technician')) && 
               (headerLower.includes('staff') || headerLower.includes('user') || headerLower.includes('employee'))) {
        customer.userCount.field = parseInt(value, 10) || 0;
      }
      else if (headerLower.includes('service') || headerLower.includes('offering')) {
        customer.services = value.split(/[,;]/).map(s => s.trim());
      }
      else if (headerLower.includes('requirement') || headerLower.includes('feature') || 
               headerLower.includes('need') || headerLower.includes('functionality')) {
        customer.requirements.keyFeatures = value.split(/[,;]/).map(f => f.trim());
      }
      else if (headerLower.includes('integration') || headerLower.includes('connect') || 
               headerLower.includes('software') || headerLower.includes('system')) {
        customer.requirements.integrations = value.split(/[,;]/).map(i => i.trim());
      }
    });
    
    return customer;
  });
}

/**
 * Extract customer data from a Google Doc
 * @param {string} content - Document content
 * @param {string} docName - Document name
 * @returns {Object|null} - Customer data object or null if extraction failed
 */
function extractCustomerDataFromDoc(content, docName) {
  try {
    // Check if the document is a customer analysis document
    if (!content.includes('Customer Analysis') && 
        !content.includes('Fit Analysis') && 
        !content.includes('Customer Fit')) {
      return null;
    }
    
    // Initialize customer object
    const customer = {
      customerName: '',
      industry: '',
      userCount: {
        total: 0,
        backOffice: 0,
        field: 0
      },
      services: [],
      requirements: {
        keyFeatures: [],
        integrations: []
      },
      fitScore: 0
    };
    
    // Extract customer name from document name or content
    const nameFromDoc = docName.match(/Analysis(?:\s+for)?\s+([^-]+)/i);
    if (nameFromDoc) {
      customer.customerName = nameFromDoc[1].trim();
    } else {
      const nameMatch = content.match(/(?:Customer|Company)(?:\s+Name)?:\s*([^\n]+)/i);
      if (nameMatch) {
        customer.customerName = nameMatch[1].trim();
      }
    }
    
    // Extract industry
    const industryMatch = content.match(/Industry:\s*([^\n]+)/i);
    if (industryMatch) {
      customer.industry = industryMatch[1].trim();
    }
    
    // Extract user counts
    const totalUsersMatch = content.match(/(?:Total\s+)?Users?(?:\s+Count)?:\s*(\d+)/i);
    if (totalUsersMatch) {
      customer.userCount.total = parseInt(totalUsersMatch[1], 10);
    }
    
    const officeMatch = content.match(/(?:Office|Back\s+Office)\s+(?:Staff|Users?):\s*(\d+)/i);
    if (officeMatch) {
      customer.userCount.backOffice = parseInt(officeMatch[1], 10);
    }
    
    const fieldMatch = content.match(/(?:Field|Technician)\s+(?:Staff|Users?):\s*(\d+)/i);
    if (fieldMatch) {
      customer.userCount.field = parseInt(fieldMatch[1], 10);
    }
    
    // Extract services
    const servicesMatch = content.match(/Services?(?:\s+Types?)?:(?:\s*)((?:[\s\S](?!Requirements|Key Features|Integrations))*)/i);
    if (servicesMatch) {
      const servicesText = servicesMatch[1].trim();
      // Check if services are listed with bullet points or commas
      if (servicesText.includes('\n')) {
        // Bullet point list
        customer.services = servicesText
          .split('\n')
          .map(s => s.replace(/^[•\-*]\s*/, '').trim())
          .filter(Boolean);
      } else {
        // Comma-separated list
        customer.services = servicesText
          .split(/[,;]/)
          .map(s => s.trim())
          .filter(Boolean);
      }
    }
    
    // Extract key features/requirements
    const featuresMatch = content.match(/(?:Key\s+)?Requirements|Key\s+Features:(?:\s*)((?:[\s\S](?!Integration|Timeline|Fit Score))*)/i);
    if (featuresMatch) {
      const featuresText = featuresMatch[1].trim();
      // Check if features are listed with bullet points or commas
      if (featuresText.includes('\n')) {
        // Bullet point list
        customer.requirements.keyFeatures = featuresText
          .split('\n')
          .map(f => f.replace(/^[•\-*]\s*/, '').trim())
          .filter(Boolean);
      } else {
        // Comma-separated list
        customer.requirements.keyFeatures = featuresText
          .split(/[,;]/)
          .map(f => f.trim())
          .filter(Boolean);
      }
    }
    
    // Extract integrations
    const integrationsMatch = content.match(/Integrations?(?:\s+Requirements?)?:(?:\s*)((?:[\s\S](?!Timeline|Fit Score))*)/i);
    if (integrationsMatch) {
      const integrationsText = integrationsMatch[1].trim();
      // Check if integrations are listed with bullet points or commas
      if (integrationsText.includes('\n')) {
        // Bullet point list
        customer.requirements.integrations = integrationsText
          .split('\n')
          .map(i => i.replace(/^[•\-*]\s*/, '').trim())
          .filter(Boolean);
      } else {
        // Comma-separated list
        customer.requirements.integrations = integrationsText
          .split(/[,;]/)
          .map(i => i.trim())
          .filter(Boolean);
      }
    }
    
    // Extract fit score
    const fitScoreMatch = content.match(/Fit\s+Score:?\s*(\d+)/i);
    if (fitScoreMatch) {
      customer.fitScore = parseInt(fitScoreMatch[1], 10);
    }
    
    return customer;
  } catch (error) {
    console.error(`Error extracting customer data from document ${docName}:`, error);
    return null;
  }
}

/**
 * Calculate average fit score from customer data
 * @param {Array} customers - Array of customer objects
 * @returns {string} - Average fit score as string
 */
function calculateAverageFitScore(customers) {
  const scores = customers
    .map(c => c.fitScore || 0)
    .filter(score => score > 0);
  
  if (scores.length === 0) return 'Unknown';
  
  const sum = scores.reduce((total, score) => total + score, 0);
  return Math.round(sum / scores.length).toString();
}

/**
 * Get top industries from customer data
 * @param {Array} customers - Array of customer objects
 * @returns {string} - Formatted string with top industries
 */
function getTopIndustries(customers) {
  const industries = {};
  
  customers.forEach(customer => {
    if (!customer.industry) return;
    
    // Split by slash or comma and count each industry
    const industriesList = customer.industry.split(/[\/,]/).map(i => i.trim());
    industriesList.forEach(industry => {
      industries[industry] = (industries[industry] || 0) + 1;
    });
  });
  
  // Find top industries
  const topIndustries = Object.entries(industries)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([industry, count]) => `${industry} (${count} customer${count > 1 ? 's' : ''})`)
    .join(', ');
  
  return topIndustries || 'None identified';
}

module.exports = historicalDataService;

/**
 * Service for fetching and aggregating historical customer data
 * from multiple Google sources (Forms, Docs, Sheets)
 */
const sheetsService = require('./googleSheetsService');
const docsService = require('./googleDocsService');
const driveService = require('./googleDriveService');

// Helper function - Generate comprehensive analytics from all data points
function generateComprehensiveAnalytics(historicalData) {
  const total = historicalData.length;
  
  // ARR Analysis
  const arrData = historicalData.filter(c => c.businessMetrics?.arr > 0);
  const avgARR = arrData.length > 0 
    ? Math.round(arrData.reduce((sum, c) => sum + c.businessMetrics.arr, 0) / arrData.length)
    : 0;
  
  // Implementation Time Analysis
  const implementationData = historicalData.filter(c => c.businessMetrics?.daysToOnboard > 0);
  const avgImplementation = implementationData.length > 0
    ? Math.round(implementationData.reduce((sum, c) => sum + c.businessMetrics.daysToOnboard, 0) / implementationData.length)
    : 0;
  
  // Health Distribution
  const healthCounts = historicalData.reduce((acc, c) => {
    const health = c.businessMetrics?.health || 'Unknown';
    acc[health] = (acc[health] || 0) + 1;
    return acc;
  }, {});
  
  // Feature Adoption
  const featureAdoption = {
    checklists: historicalData.filter(c => c.requirements?.checklists?.needed).length,
    notifications: historicalData.filter(c => c.requirements?.notifications?.customer?.needed).length,
    reports: historicalData.filter(c => c.requirements?.serviceReports?.needed).length,
    quotations: historicalData.filter(c => c.requirements?.quotations?.needed).length,
    invoicing: historicalData.filter(c => c.requirements?.invoicing?.needed).length,
    payments: historicalData.filter(c => c.requirements?.paymentCollection?.needed).length
  };
  
  // Integration Patterns
  const allIntegrations = historicalData
    .flatMap(c => c.requirements?.integrations || [])
    .filter(Boolean);
  const integrationCounts = allIntegrations.reduce((acc, int) => {
    acc[int] = (acc[int] || 0) + 1;
    return acc;
  }, {});
  
  // Success Patterns
  const successfulCustomers = historicalData.filter(c => 
    c.businessMetrics?.health === 'Good' || c.businessMetrics?.health === 'Excellent'
  );
  const avgSuccessfulARR = successfulCustomers.length > 0
    ? Math.round(successfulCustomers.reduce((sum, c) => sum + (c.businessMetrics?.arr || 0), 0) / successfulCustomers.length)
    : 0;
  
  // Risk Patterns
  const atRiskCustomers = historicalData.filter(c => 
    c.businessMetrics?.health === 'Poor' || c.businessMetrics?.retentionRisk
  );
  
  return `
MARKET INTELLIGENCE:
- Total Customers Analyzed: ${total}
- Average ARR: $${avgARR.toLocaleString()}
- Average Implementation Time: ${avgImplementation} days

CUSTOMER HEALTH DISTRIBUTION:
${Object.entries(healthCounts).map(([health, count]) => `- ${health}: ${count} (${Math.round(count/total*100)}%)`).join('\n')}

SUCCESS INDICATORS:
- Successful Customer Profile:
  * Average ARR: $${avgSuccessfulARR.toLocaleString()}
  * Implementation: <${Math.round(avgImplementation * 0.8)} days
  * Common traits: ${successfulCustomers.length > 0 ? 'Complete requirements, clear timeline, 10-50 users' : 'Insufficient data'}

RISK INDICATORS:
- At-Risk Customers: ${atRiskCustomers.length} (${Math.round(atRiskCustomers.length/total*100)}%)
- Common Risk Factors: ${atRiskCustomers.length > 0 ? 'Delayed implementation, payment issues, complex integrations' : 'None identified'}

FEATURE ADOPTION RATES:
- Checklists/Inspections: ${Math.round(featureAdoption.checklists/total*100)}%
- Customer Notifications: ${Math.round(featureAdoption.notifications/total*100)}%
- Service Reports: ${Math.round(featureAdoption.reports/total*100)}%
- Quotations: ${Math.round(featureAdoption.quotations/total*100)}%
- Invoicing: ${Math.round(featureAdoption.invoicing/total*100)}%
- Payment Collection: ${Math.round(featureAdoption.payments/total*100)}%

INTEGRATION LANDSCAPE:
${Object.entries(integrationCounts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .map(([integration, count]) => `- ${integration}: ${count} customers`)
  .join('\n')}

KEY INSIGHTS:
1. Sweet Spot: Customers with $15-40K ARR and 10-50 users show highest success rates
2. Critical Period: First 90 days determine long-term health
3. Integration Impact: >2 integrations correlate with ${Math.round(avgImplementation * 1.5)} day implementations
4. Payment Feature: ${Math.round(featureAdoption.payments/total*100)}% adoption suggests ${featureAdoption.payments/total > 0.3 ? 'strong' : 'growth'} opportunity
`;
}

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
      
      // MODIFIED: Limit data to prevent token overflow
      const MAX_HISTORICAL_RECORDS = parseInt(process.env.MAX_HISTORICAL_RECORDS) || 50;
      
      if (allHistoricalData.length > MAX_HISTORICAL_RECORDS) {
        // Sort by completeness and fit score to get best examples
        const sortedData = allHistoricalData
          .filter(record => record.completenessScore > 50) // Only include records with decent data
          .sort((a, b) => {
            // Prioritize complete records with high fit scores
            const scoreA = (a.completenessScore * 0.3) + (a.fitScore * 0.7);
            const scoreB = (b.completenessScore * 0.3) + (b.fitScore * 0.7);
            return scoreB - scoreA;
          })
          .slice(0, MAX_HISTORICAL_RECORDS);
        
        console.log(`Limited historical data from ${allHistoricalData.length} to ${sortedData.length} records for token management`);
        return sortedData;
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
   * MODIFIED: Optimized version that creates more concise summaries
   * @param {Array} historicalData - Aggregated historical data
   * @returns {string} - Formatted historical data as string
   */
  formatHistoricalDataForPrompt: (historicalData) => {
    if (!historicalData || historicalData.length === 0) {
      return "No historical data available.";
    }
    
    // Create a more concise summary to reduce tokens
    const MAX_DETAILED_EXAMPLES = 10; // Only show detailed profiles for top 10
    const topCustomers = historicalData
      .filter(c => c.fitScore > 60) // Focus on good fits
      .slice(0, MAX_DETAILED_EXAMPLES);
    
    // Create detailed profiles for top customers only
    const detailedProfiles = topCustomers.map(customer => {
      return `
CUSTOMER: ${customer.customerName} (${customer.industry})
- Fit Score: ${customer.fitScore}% | Users: ${customer.userCount?.total || 0} (${customer.userCount?.field || 0} field)
- ARR: $${customer.businessMetrics?.arr?.toLocaleString() || 'Unknown'} | Health: ${customer.businessMetrics?.health || 'Unknown'}
- Services: ${(customer.services || []).slice(0, 3).join(', ')}
- Key Requirements: ${(customer.requirements?.keyFeatures || []).slice(0, 3).join(', ')}`;
    }).join('\n');
    
    // Create summary statistics for the rest
    const industries = {};
    const serviceTypes = {};
    let totalARR = 0;
    let arrCount = 0;
    
    historicalData.forEach(c => {
      if (c.industry) industries[c.industry] = (industries[c.industry] || 0) + 1;
      (c.services || []).forEach(s => {
        serviceTypes[s] = (serviceTypes[s] || 0) + 1;
      });
      if (c.businessMetrics?.arr) {
        totalARR += c.businessMetrics.arr;
        arrCount++;
      }
    });
    
    const topIndustries = Object.entries(industries)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([ind, count]) => `${ind} (${count})`)
      .join(', ');
    
    const topServices = Object.entries(serviceTypes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([service, count]) => `${service} (${count})`)
      .join(', ');
    
    const avgFitScore = Math.round(historicalData.reduce((sum, c) => sum + c.fitScore, 0) / historicalData.length);
    const avgARR = arrCount > 0 ? Math.round(totalARR / arrCount) : 0;
    
    return `
HISTORICAL CUSTOMER ANALYSIS (${historicalData.length} customers)
==========================================

SUMMARY STATISTICS:
- Average Fit Score: ${avgFitScore}%
- Average ARR: $${avgARR.toLocaleString()}
- Top Industries: ${topIndustries}
- Top Services: ${topServices}

KEY SUCCESS PATTERNS:
- Best fit: 10-50 users, $15-40K ARR, clear requirements
- Common integrations: QuickBooks, Salesforce, Office 365
- Implementation success: <90 days, minimal integrations

TOP ${topCustomers.length} CUSTOMER EXAMPLES:
${detailedProfiles}
`;
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
  const headers = sheetData[0].map(header => header ? header.trim() : '');
  
  console.log(`Processing ${headers.length} columns (A-${String.fromCharCode(65 + headers.length - 1)})`);
  
  // Process each row into a comprehensive customer object
  return sheetData.slice(1).map((row, rowIndex) => {
    const customer = {
      // Basic Information
      customerName: '',
      industry: '',
      timestamp: '',
      
      // User Information
      userCount: {
        total: 0,
        backOffice: 0,
        field: 0
      },
      
      // Timeline
      launchDate: '',
      
      // Current State
      currentSystems: {
        name: '',
        replacementReasons: ''
      },
      
      // Services & Workflows
      services: [],
      servicesDetails: '',
      workflowDescription: '',
      
      // Requirements
      requirements: {
        integrations: [],
        integrationScope: '',
        keyFeatures: [],
        checklists: {
          needed: false,
          details: ''
        },
        notifications: {
          customer: {
            needed: false,
            methods: [],
            triggers: ''
          },
          backOffice: {
            needed: false,
            triggers: ''
          }
        },
        serviceReports: {
          needed: false,
          template: ''
        },
        quotations: {
          needed: false,
          template: '',
          specificRequirements: ''
        },
        invoicing: {
          needed: false,
          template: '',
          specificRequirements: ''
        },
        paymentCollection: {
          needed: false
        }
      },
      
      // Business Metrics (from additional columns AA-AF)
      businessMetrics: {
        arr: 0,
        daysToOnboard: null,
        currentStatus: '',
        pendingPayments: false,
        health: '',
        retentionRisk: ''
      },
      
      // Additional columns (AG-AO) - placeholder for any extra metrics
      additionalMetrics: {},
      
      // Calculated scores
      fitScore: 0,
      completenessScore: 0
    };
    
    // Map each column by index and header
    headers.forEach((header, index) => {
      const value = row[index];
      
      // Skip empty values
      if (!value || (typeof value === 'string' && value.trim() === '')) return;
      
      const headerLower = header.toLowerCase();
      
      // Column A: Timestamp
      if (index === 0) {
        customer.timestamp = value;
      }
      // Column B: Business Name
      else if (header.includes('What is the name of your business')) {
        customer.customerName = value.trim();
      }
      // Column C: Industry
      else if (header.includes('What industry are you in')) {
        customer.industry = value.trim();
      }
      // Column D: User Count
      else if (header.includes('How many total users')) {
        parseUserCount(value.toString(), customer);
      }
      // Column E: Launch Date
      else if (header.includes('expected launch date')) {
        customer.launchDate = value.trim();
      }
      // Column F: Current Systems
      else if (header.includes('existing products for Field Service Management')) {
        if (value.toLowerCase() !== 'no' && value.toLowerCase() !== 'n/a') {
          customer.currentSystems.name = value.trim();
          // Check if next column has replacement reasons
          if (headers[index + 1] && headers[index + 1].includes('reasons for replacing')) {
            customer.currentSystems.replacementReasons = row[index + 1] || '';
          }
        }
      }
      // Column G: Integration Needs
      else if (header.includes('Do you need Zuper to integrate')) {
        customer.requirements.integrations.needed = value.toLowerCase() === 'yes';
      }
      // Column H: Integration Scope
      else if (header.includes('scope of integration')) {
        if (value.toLowerCase() !== 'n/a') {
          customer.requirements.integrationScope = value.trim();
          // Parse specific integrations mentioned
          const integrations = value.match(/(?:with\s+)?(\w+(?:\s+\w+)?)/gi);
          if (integrations) {
            customer.requirements.integrations = integrations.map(i => i.replace(/^with\s+/i, '').trim());
          }
        }
      }
      // Column I: Services Offered
      else if (header.includes('What services do you offer')) {
        customer.services = value.split(/[,;]/).map(s => s.trim()).filter(s => s && s.toLowerCase() !== 'yes');
      }
      // Column J: Additional Services
      else if (header.includes('list of services if you have picked "Others"')) {
        if (value.toLowerCase() !== 'n/a') {
          customer.servicesDetails = value.trim();
        }
      }
      // Column K: Workflow Description
      else if (header.includes('typical workflow')) {
        customer.workflowDescription = value.trim();
      }
      // Column L: Checklists/Inspections
      else if (header.includes('checklists or inspection list')) {
        if (value.toLowerCase() !== 'no' && value.toLowerCase() !== 'n/a') {
          customer.requirements.checklists.needed = true;
          customer.requirements.checklists.details = value.trim();
        }
      }
      // Column M: Customer Notifications
      else if (header.includes('notifications to your customers') && !header.includes('mode')) {
        customer.requirements.notifications.customer.needed = value.toLowerCase() === 'yes';
      }
      // Column N: Notification Methods
      else if (header.includes('mode of the notification')) {
        if (value.toLowerCase() !== 'n/a') {
          customer.requirements.notifications.customer.methods = value.split(/[,;]/).map(m => m.trim());
        }
      }
      // Column O: Notification Triggers
      else if (header.includes('trigger in your workflow for sending')) {
        customer.requirements.notifications.customer.triggers = value.trim();
      }
      // Column P: Back Office Notifications
      else if (header.includes('notifications to your back office')) {
        customer.requirements.notifications.backOffice.needed = value.toLowerCase() === 'yes';
      }
      // Column Q: Back Office Triggers
      else if (header.includes('triggers for the notifcations') && index > 15) {
        customer.requirements.notifications.backOffice.triggers = value.trim();
      }
      // Column R: Service Reports
      else if (header.includes('create service reports')) {
        customer.requirements.serviceReports.needed = value.toLowerCase() === 'yes';
      }
      // Column S: Service Report Template
      else if (header.includes('template for your service report')) {
        if (value.toLowerCase() !== 'n/a') {
          customer.requirements.serviceReports.template = value.trim();
        }
      }
      // Column T: Quotations
      else if (header.includes('Quotation/Estimation to your customers')) {
        customer.requirements.quotations.needed = value.toLowerCase() === 'yes';
      }
      // Column U: Quotation Template
      else if (header.includes('template for your Quotation')) {
        if (value.toLowerCase() !== 'n/a') {
          customer.requirements.quotations.template = value.trim();
        }
      }
      // Column V: Quotation Requirements
      else if (header.includes('specific requirement on the Quotation')) {
        if (value.toLowerCase() !== 'n/a' && value.toLowerCase() !== 'no') {
          customer.requirements.quotations.specificRequirements = value.trim();
        }
      }
      // Column W: Invoicing
      else if (header.includes('Invoices to your customers')) {
        customer.requirements.invoicing.needed = value.toLowerCase() === 'yes';
      }
      // Column X: Invoice Template
      else if (header.includes('invoicing template')) {
        if (value.toLowerCase() !== 'n/a') {
          customer.requirements.invoicing.template = value.trim();
        }
      }
      // Column Y: Invoice Requirements
      else if (header.includes('specific requirement for Invoicing')) {
        if (value.toLowerCase() !== 'n/a' && value.toLowerCase() !== 'no') {
          customer.requirements.invoicing.specificRequirements = value.trim();
        }
      }
      // Column Z: Payment Collection
      else if (header.includes('collecting payments')) {
        customer.requirements.paymentCollection.needed = value.toLowerCase() === 'yes';
      }
      
      // Business Metrics (columns AA-AF, indices 26-31)
      else if (index === 26 && value !== '#N/A' && !isNaN(value)) { // ARR
        customer.businessMetrics.arr = parseInt(value, 10);
      }
      else if (index === 27 && value !== '#N/A' && value !== '-' && !isNaN(value)) { // Days to onboard
        customer.businessMetrics.daysToOnboard = parseInt(value, 10);
      }
      else if (index === 28 && value !== '#N/A' && value !== '-') { // Current Status
        customer.businessMetrics.currentStatus = value.trim();
      }
      else if (index === 29) { // Pending payments
        customer.businessMetrics.pendingPayments = value.toString().toLowerCase() === 'yes';
      }
      else if (index === 30 && value !== '#N/A' && value !== '-') { // Health
        customer.businessMetrics.health = value.trim();
      }
      else if (index === 31 && value && value !== '-') { // Retention Risk
        customer.businessMetrics.retentionRisk = value.trim();
      }
      
      // Additional columns (AG-AO, indices 32-40)
      else if (index >= 32 && value && value !== '#N/A' && value !== '-') {
        // Store any additional metrics with generic keys
        customer.additionalMetrics[`metric_${String.fromCharCode(65 + index)}`] = value;
      }
    });
    
    // Calculate comprehensive fit score
    customer.fitScore = calculateComprehensiveFitScore(customer);
    
    // Calculate data completeness score
    customer.completenessScore = calculateCompletenessScore(customer);
    
    return customer;
  }).filter(customer => 
    customer.customerName && 
    customer.customerName !== 'Yes' && 
    customer.customerName !== '#N/A' &&
    customer.customerName.trim() !== ''
  );
}

// Helper function to parse user count
function parseUserCount(userText, customer) {
  // Try various patterns
  const patterns = [
    /(\d+)\s*(?:total)/i,
    /(\d+)\s*(?:users)/i,
    /(\d+)\s*(?:employees)/i,
    /^(\d+)$/
  ];
  
  for (const pattern of patterns) {
    const match = userText.match(pattern);
    if (match) {
      customer.userCount.total = parseInt(match[1], 10);
      break;
    }
  }
  
  // Look for office/field breakdown
  const backOfficeMatch = userText.match(/(\d+)\s*(?:back\s*office|backoffice|office|admin)/i);
  if (backOfficeMatch) customer.userCount.backOffice = parseInt(backOfficeMatch[1], 10);
  
  const fieldMatch = userText.match(/(\d+)\s*(?:field|technician|mobile)/i);
  if (fieldMatch) customer.userCount.field = parseInt(fieldMatch[1], 10);
  
  // If only total, assume all field
  if (customer.userCount.total > 0 && customer.userCount.backOffice === 0 && customer.userCount.field === 0) {
    customer.userCount.field = customer.userCount.total;
  }
}

// Calculate comprehensive fit score using ALL data points
function calculateComprehensiveFitScore(customer) {
  let score = 30; // Base score
  
  // Basic Information (15 points)
  if (customer.customerName) score += 3;
  if (customer.industry) score += 3;
  if (customer.userCount.total > 0) score += 3;
  if (customer.userCount.total >= 10 && customer.userCount.total <= 100) score += 3; // Sweet spot
  if (customer.launchDate) score += 3;
  
  // Business Metrics (30 points)
  if (customer.businessMetrics.arr > 30000) score += 10;
  else if (customer.businessMetrics.arr > 15000) score += 7;
  else if (customer.businessMetrics.arr > 5000) score += 4;
  
  if (customer.businessMetrics.daysToOnboard && customer.businessMetrics.daysToOnboard < 60) score += 8;
  else if (customer.businessMetrics.daysToOnboard && customer.businessMetrics.daysToOnboard < 120) score += 5;
  
  if (customer.businessMetrics.health === 'Excellent') score += 10;
  else if (customer.businessMetrics.health === 'Good') score += 7;
  else if (customer.businessMetrics.health === 'Average') score += 3;
  else if (customer.businessMetrics.health === 'Poor') score -= 5;
  
  if (!customer.businessMetrics.pendingPayments) score += 2;
  
  // Requirements Complexity (25 points)
  if (customer.services.length > 0 && customer.services.length <= 5) score += 5; // Focused services
  if (customer.workflowDescription && customer.workflowDescription.length > 50) score += 3;
  
  // Features needed (positive if they need our strengths)
  if (customer.requirements.checklists.needed) score += 3;
  if (customer.requirements.notifications.customer.needed) score += 3;
  if (customer.requirements.serviceReports.needed) score += 3;
  if (customer.requirements.quotations.needed) score += 2;
  if (customer.requirements.invoicing.needed) score += 2;
  if (customer.requirements.paymentCollection.needed) score += 2;
  
  // Integration complexity
  if (customer.requirements.integrations.length === 0) score += 5; // No integration = easier
  else if (customer.requirements.integrations.length <= 2) score += 3; // Manageable
  else score -= 2; // Complex integration needs
  
  // Current system replacement (opportunity)
  if (customer.currentSystems.name) score += 5;
  
  return Math.min(Math.max(score, 0), 100);
}

// Calculate how complete their data submission is
function calculateCompletenessScore(customer) {
  let filledFields = 0;
  let totalFields = 0;
  
  const checkField = (value) => {
    totalFields++;
    if (value && value !== '' && value !== 'n/a' && value !== '#N/A') filledFields++;
  };
  
  // Check all major fields
  checkField(customer.customerName);
  checkField(customer.industry);
  checkField(customer.userCount.total);
  checkField(customer.launchDate);
  checkField(customer.services.length);
  checkField(customer.workflowDescription);
  checkField(customer.businessMetrics.arr);
  checkField(customer.businessMetrics.health);
  
  return Math.round((filledFields / totalFields) * 100);
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

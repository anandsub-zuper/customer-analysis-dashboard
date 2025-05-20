const { google } = require('googleapis');
const { JWT } = require('google-auth-library');

/**
 * Initialize JWT client for Google Docs API
 * This function handles different environment configurations
 */
const getJwtClient = () => {
  try {
    // Log environment for debugging
    console.log(`Initializing Google Docs Service in ${process.env.NODE_ENV || 'development'} mode`);
    
    let jwtClient;
    
    // Production environment
    if (process.env.NODE_ENV === 'production') {
      console.log('Using production credentials...');
      
      // Option 1: Using base64-encoded service account
      if (process.env.GOOGLE_SERVICE_ACCOUNT_BASE64) {
        console.log('Using base64-encoded service account');
        try {
          const base64 = process.env.GOOGLE_SERVICE_ACCOUNT_BASE64;
          const serviceAccountJson = Buffer.from(base64, 'base64').toString();
          const serviceAccount = JSON.parse(serviceAccountJson);
          
          jwtClient = new JWT({
            email: serviceAccount.client_email,
            key: serviceAccount.private_key,
            scopes: ['https://www.googleapis.com/auth/documents.readonly'],
          });
          
          console.log(`Successfully initialized JWT client with email: ${serviceAccount.client_email}`);
        } catch (base64Error) {
          throw new Error(`Failed to parse base64-encoded service account: ${base64Error.message}`);
        }
      }
      // Option 2: Using individual environment variables
      else if (process.env.SA_CLIENT_EMAIL && process.env.SA_PRIVATE_KEY) {
        console.log('Using individual service account environment variables');
        
        jwtClient = new JWT({
          email: process.env.SA_CLIENT_EMAIL,
          key: process.env.SA_PRIVATE_KEY,
          scopes: ['https://www.googleapis.com/auth/documents.readonly'],
        });
        
        console.log(`Successfully initialized JWT client with email: ${process.env.SA_CLIENT_EMAIL}`);
      }
      // Option 3: Using JSON service account
      else if (process.env.GOOGLE_SERVICE_ACCOUNT) {
        console.log('Using JSON service account from environment variable');
        try {
          const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
          
          jwtClient = new JWT({
            email: serviceAccount.client_email,
            key: serviceAccount.private_key,
            scopes: ['https://www.googleapis.com/auth/documents.readonly'],
          });
          
          console.log(`Successfully initialized JWT client with email: ${serviceAccount.client_email}`);
        } catch (jsonError) {
          throw new Error(`Failed to parse JSON service account: ${jsonError.message}`);
        }
      }
      // No valid credentials found
      else {
        throw new Error('No service account credentials found in environment variables');
      }
    }
    // Development environment - use local file
    else {
      console.log('Using local service account file');
      try {
        const serviceAccount = require('../config/serviceAccount.json');
        
        jwtClient = new JWT({
          email: serviceAccount.client_email,
          key: serviceAccount.private_key,
          scopes: ['https://www.googleapis.com/auth/documents.readonly'],
        });
        
        console.log(`Successfully initialized JWT client with email: ${serviceAccount.client_email}`);
      } catch (fileError) {
        throw new Error(`Failed to load local service account file: ${fileError.message}`);
      }
    }
    
    return jwtClient;
  } catch (error) {
    console.error('===== ERROR INITIALIZING GOOGLE DOCS SERVICE =====');
    console.error(error);
    
    // Instead of crashing, return null and handle this in the calling code
    return null;
  }
};

// Initialize the JWT client
const jwtClient = getJwtClient();

// Initialize the Docs API
const docs = jwtClient ? google.docs({ version: 'v1', auth: jwtClient }) : null;

/**
 * Function to get the content of a Google Doc
 * @param {string} documentId - ID of the Google Doc
 * @returns {Promise<Object>} - Document content
 */
exports.getDocContent = async (documentId) => {
  if (!docs) {
    throw new Error('Google Docs API client not initialized');
  }
  
  try {
    console.log(`Fetching document content for ID: ${documentId}`);
    
    const response = await docs.documents.get({
      documentId,
    });
    
    console.log(`Successfully retrieved document: ${response.data.title}`);
    return response.data;
  } catch (error) {
    console.error('Error accessing Google Docs:', error);
    throw new Error(`Failed to retrieve document from Google Docs: ${error.message}`);
  }
};

/**
 * Function to extract plain text from a Google Doc
 * @param {Object} document - Google Doc document object
 * @returns {string} - Plain text content
 */
exports.extractText = (document) => {
  if (!document || !document.body || !document.body.content) {
    return '';
  }
  
  let text = '';
  
  // Process each content element
  document.body.content.forEach(element => {
    if (element.paragraph) {
      element.paragraph.elements.forEach(parElement => {
        if (parElement.textRun && parElement.textRun.content) {
          text += parElement.textRun.content;
        }
      });
    } else if (element.table) {
      // Extract text from tables
      element.table.tableRows.forEach(row => {
        row.tableCells.forEach(cell => {
          if (cell.content) {
            cell.content.forEach(cellContent => {
              if (cellContent.paragraph) {
                cellContent.paragraph.elements.forEach(parElement => {
                  if (parElement.textRun && parElement.textRun.content) {
                    text += parElement.textRun.content;
                  }
                });
              }
            });
          }
        });
      });
    }
  });
  
  return text;
};

/**
 * Function to get document metadata
 * @param {string} documentId - ID of the Google Doc
 * @returns {Promise<Object>} - Document metadata
 */
exports.getDocumentMetadata = async (documentId) => {
  if (!docs) {
    throw new Error('Google Docs API client not initialized');
  }
  
  try {
    console.log(`Fetching document metadata for ID: ${documentId}`);
    
    const response = await docs.documents.get({
      documentId,
      fields: 'documentId,title,revisionId,documentStyle,namedStyles',
    });
    
    return {
      id: response.data.documentId,
      title: response.data.title,
      revisionId: response.data.revisionId,
    };
  } catch (error) {
    console.error('Error getting document metadata:', error);
    throw new Error(`Failed to retrieve document metadata: ${error.message}`);
  }
};

/**
 * Function to extract structured content from a document
 * @param {Object} document - Google Doc document object
 * @returns {Object} - Structured content object
 */
exports.extractStructuredContent = (document) => {
  if (!document || !document.body || !document.body.content) {
    return { sections: [], headings: [], lists: [] };
  }
  
  const result = {
    sections: [],
    headings: [],
    lists: [],
    tables: [],
  };
  
  let currentSection = {
    heading: null,
    content: '',
  };
  
  let currentListItem = null;
  
  // Process each content element
  document.body.content.forEach(element => {
    if (element.paragraph) {
      const paragraph = element.paragraph;
      let paragraphText = '';
      
      // Extract text from paragraph
      paragraph.elements.forEach(parElement => {
        if (parElement.textRun && parElement.textRun.content) {
          paragraphText += parElement.textRun.content;
        }
      });
      
      // Check if it's a heading
      if (paragraph.paragraphStyle && paragraph.paragraphStyle.namedStyleType && 
          paragraph.paragraphStyle.namedStyleType.startsWith('HEADING_')) {
        // Save previous section if it exists
        if (currentSection.content.trim()) {
          result.sections.push({...currentSection});
        }
        
        // Start new section
        currentSection = {
          heading: paragraphText.trim(),
          content: '',
        };
        
        result.headings.push({
          text: paragraphText.trim(),
          level: parseInt(paragraph.paragraphStyle.namedStyleType.split('_')[1]) || 1,
        });
      } 
      // Check if it's a list item
      else if (paragraph.bullet) {
        if (!currentListItem) {
          currentListItem = {
            items: [],
            type: paragraph.bullet.listId ? 'ordered' : 'unordered',
          };
          result.lists.push(currentListItem);
        }
        
        currentListItem.items.push(paragraphText.trim());
        currentSection.content += paragraphText;
      } 
      // Regular paragraph
      else {
        currentListItem = null; // End current list if we encounter a non-list paragraph
        currentSection.content += paragraphText;
      }
    } else if (element.table) {
      // Process tables
      const table = {
        rows: [],
      };
      
      element.table.tableRows.forEach(row => {
        const tableRow = {
          cells: [],
        };
        
        row.tableCells.forEach(cell => {
          let cellText = '';
          
          if (cell.content) {
            cell.content.forEach(cellContent => {
              if (cellContent.paragraph) {
                cellContent.paragraph.elements.forEach(parElement => {
                  if (parElement.textRun && parElement.textRun.content) {
                    cellText += parElement.textRun.content;
                  }
                });
              }
            });
          }
          
          tableRow.cells.push(cellText.trim());
        });
        
        table.rows.push(tableRow);
      });
      
      result.tables.push(table);
      
      // Add a placeholder for the table in the section content
      currentSection.content += '[TABLE]\n';
    }
  });
  
  // Add the last section
  if (currentSection.content.trim()) {
    result.sections.push(currentSection);
  }
  
  return result;
};

// Export the Google Docs API client for advanced usage
exports.docs = docs;

// Export the JWT client for reuse with other Google APIs
exports.jwtClient = jwtClient;

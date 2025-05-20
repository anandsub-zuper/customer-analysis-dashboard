const { google } = require('googleapis');
const { JWT } = require('google-auth-library');
let serviceAccount;

if (process.env.NODE_ENV === 'production') {
  serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
} else {
  serviceAccount = require('../config/serviceAccount.json');
}

// Create a JWT client
const jwtClient = new JWT({
  email: serviceAccount.client_email,
  key: serviceAccount.private_key,
  scopes: ['https://www.googleapis.com/auth/documents.readonly'],
});

// Initialize the Docs API
const docs = google.docs({ version: 'v1', auth: jwtClient });

// Function to get the content of a Google Doc
exports.getDocContent = async (documentId) => {
  try {
    const response = await docs.documents.get({
      documentId,
    });
    
    return response.data;
  } catch (error) {
    console.error('Error accessing Google Docs:', error);
    throw new Error('Failed to retrieve document from Google Docs');
  }
};

// Function to extract plain text from a Google Doc
exports.extractText = (document) => {
  if (!document.body || !document.body.content) {
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
    }
  });
  
  return text;
};

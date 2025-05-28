const axios = require('axios');
const historicalDataService = require('./historicalDataService');
require('dotenv').config();

/**
 * Service for interacting with OpenAI API with RAG implementation
 */
const openaiService = {
  /**
   * Analyze transcript using RAG with historical data from multiple Google sources
   * @param {string} text - The transcript text to analyze
   * @returns {Promise<Object>} - Analysis results
   */
  analyzeTranscript: async (text) => {
    try {
      console.log('Starting transcript analysis with RAG...');
      
      // 1. Retrieve historical data from multiple Google sources
      console.log('Retrieving historical data from Google services...');
      const historicalData = await historicalDataService.getHistoricalData();
      console.log(`Retrieved ${historicalData.length} historical customer records.`);
      
      // 2. Format the historical data for the prompt
      const formattedHistoricalData = historicalDataService.formatHistoricalDataForPrompt(historicalData);
      
      // 3. Create the RAG-enhanced prompt
      const prompt = createRAGPrompt(text, formattedHistoricalData);
      
      // 4. Call OpenAI API with the RAG-enhanced prompt
      console.log('Sending RAG-enhanced prompt to OpenAI...');
      const response = await callOpenAI(prompt);
      
      // 5. Process the response
      const result = processOpenAIResponse(response);
      console.log('Successfully processed OpenAI response.');
      
      return result;
    } catch (error) {
      console.error('Error analyzing transcript with OpenAI:', error);
      throw new Error(`Failed to analyze transcript: ${error.message}`);
    }
  }
};

/**
 * Call the OpenAI API with the prompt
 * @param {string} prompt - The RAG-enhanced prompt
 * @returns {Promise<Object>} - OpenAI API response
 */
async function callOpenAI(prompt) {
  try {
    // First check MongoDB for API key
    let apiKey = process.env.OPENAI_API_KEY;
    let model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
    let temperature = 0.5;
    let maxTokens = 2500;
    
    try {
      const db = await require('./mongoDbService').getDb();
      
      // Get API configuration
      const apiConfig = await db.collection('configuration').findOne({ _id: 'api' });
      if (apiConfig && apiConfig.key) {
        apiKey = apiConfig.key;
      }
      
      // Get model configuration
      const modelConfig = await db.collection('configuration').findOne({ _id: 'model' });
      if (modelConfig) {
        model = modelConfig.type || model;
        temperature = modelConfig.temperature || temperature;
        maxTokens = modelConfig.maxTokens || maxTokens;
      }
    } catch (dbError) {
      console.log('Using environment variables for OpenAI config:', dbError.message);
    }
    
    if (!apiKey) {
      throw new Error('OpenAI API key is not configured.');
    }
    
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: model,
        messages: [
          {
            role: 'system',
            content: prompt
          }
        ],
        temperature: temperature,
        max_tokens: maxTokens
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    if (error.response) {
      console.error('OpenAI API error response:', error.response.data);
    }
    throw new Error(`OpenAI API error: ${error.message}`);
  }
}


/**
 * Create the RAG-enhanced prompt with historical data
 * @param {string} transcriptText - The transcript to analyze
 * @param {string} historicalData - Formatted historical data
 * @returns {string} - Complete RAG-enhanced prompt
 */
function createRAGPrompt(transcriptText, historicalData) {
  return `
You are an expert system that analyzes meeting transcripts to determine customer fit for a field service management software.

I'm going to provide you with:
1. Historical data about our past customers, their requirements, and their fit scores
2. A transcript from a meeting with a new potential customer

Your task is to analyze the transcript and determine how well the potential customer fits with our software. Use the historical data to inform your analysis.

## HISTORICAL CUSTOMER DATA
${historicalData}

Analyze the following meeting transcript and extract the following information:
1. Customer company name
2. Industry/vertical
3. User count (total, office staff, field staff)
4. Current systems they're using
5. Services they provide (Installation, Repair, Maintenance, etc.)
6. Key requirements and pain points
7. Integration requirements
8. Timeline for implementation

Based on this analysis and the historical data provided, determine:
- How well this potential customer fits with our software (fit score 0-100)
- Compare them to similar customers in our historical data
- Identify their strengths (areas where they align well with our software)
- Identify potential challenges (areas of concern)
- Generate specific recommendations for implementation, integration, and training

Please respond in valid JSON format with the following structure:
{
  "customerName": "",
  "industry": "",
  "userCount": {
    "total": 0,
    "backOffice": 0,
    "field": 0
  },
  "currentSystems": [
    {
      "name": "",
      "description": "",
      "replacing": true/false
    }
  ],
  "services": [],
  "requirements": {
    "keyFeatures": [],
    "integrations": [],
    "painPoints": []
  },
  "strengths": [
    {
      "title": "",
      "description": ""
    }
  ],
  "challenges": [
    {
      "title": "",
      "description": ""
    }
  ],
  "similarCustomers": [
    {
      "name": "",
      "matchPercentage": 0,
      "description": ""
    }
  ],
  "recommendations": {
    "implementationApproach": [],
    "integrationStrategy": [],
    "trainingRecommendations": [],
    "timelineProjection": {}
  },
  "timeline": "",
  "fitScore": 0
}

The fitScore should be between 0-100 and represent how well the customer fits our field service management software based on their requirements and industry.

Transcript:
${transcriptText}
`;
}

/**
 * Process the OpenAI API response into a structured format
 * @param {Object} response - The raw OpenAI API response
 * @returns {Object} - Structured analysis results
 */
function processOpenAIResponse(response) {
  // Extract the content from the response
  const content = response.choices[0].message.content;
  
  try {
    // Try to parse if OpenAI returned JSON
    const analysisResults = JSON.parse(content);
    
    // Add date
    analysisResults.date = new Date().toLocaleDateString();
    
    return analysisResults;
  } catch (e) {
    console.error('Error parsing OpenAI response as JSON:', e);
    console.log('Raw response:', content);
    
    // If not JSON, implement fallback parsing logic
    return {
      customerName: extractCustomerName(content),
      industry: extractIndustry(content),
      userCount: extractUserCount(content),
      requirements: extractRequirements(content),
      services: extractServices(content),
      currentSystems: extractCurrentSystems(content),
      timeline: extractTimeline(content),
      fitScore: calculateFitScore(content),
      date: new Date().toLocaleDateString()
    };
  }
}

// Helper functions to extract specific data points if JSON parsing fails
function extractCustomerName(content) {
  const match = content.match(/Customer company name:?\s*([^\n]+)/i);
  return match ? match[1].trim() : "Unknown Company";
}

function extractIndustry(content) {
  const match = content.match(/Industry\/vertical:?\s*([^\n]+)/i);
  return match ? match[1].trim() : "Unknown Industry";
}

function extractUserCount(content) {
  const totalMatch = content.match(/User count:?\s*([0-9]+)/i);
  const officeMatch = content.match(/office staff:?\s*([0-9]+)/i);
  const fieldMatch = content.match(/field staff:?\s*([0-9]+)/i);
  
  return {
    total: totalMatch ? parseInt(totalMatch[1], 10) : 0,
    backOffice: officeMatch ? parseInt(officeMatch[1], 10) : 0,
    field: fieldMatch ? parseInt(fieldMatch[1], 10) : 0
  };
}

function extractServices(content) {
  const match = content.match(/Services:?\s*([^\n]+)/i);
  if (!match) return [];
  
  return match[1].trim().split(/,\s*/).map(service => service.trim());
}

function extractRequirements(content) {
  const keyFeaturesMatch = content.match(/Key requirements:?\s*([\s\S]*?)(?=\n\s*\n|\n[A-Z]|$)/i);
  const integrationsMatch = content.match(/Integration requirements:?\s*([\s\S]*?)(?=\n\s*\n|\n[A-Z]|$)/i);
  const painPointsMatch = content.match(/Pain points:?\s*([\s\S]*?)(?=\n\s*\n|\n[A-Z]|$)/i);
  
  const keyFeatures = keyFeaturesMatch 
    ? keyFeaturesMatch[1].trim().split(/\n/).map(item => item.replace(/^[•\-*]\s*/, '').trim()).filter(Boolean)
    : [];
    
  const integrations = integrationsMatch 
    ? integrationsMatch[1].trim().split(/\n/).map(item => item.replace(/^[•\-*]\s*/, '').trim()).filter(Boolean)
    : [];
    
  const painPoints = painPointsMatch 
    ? painPointsMatch[1].trim().split(/\n/).map(item => item.replace(/^[•\-*]\s*/, '').trim()).filter(Boolean)
    : [];
  
  return {
    keyFeatures,
    integrations,
    painPoints
  };
}

function extractCurrentSystems(content) {
  const match = content.match(/Current systems:?\s*([\s\S]*?)(?=\n\s*\n|\n[A-Z]|$)/i);
  if (!match) return [];
  
  return match[1].trim().split(/\n/).map(item => {
    const system = item.replace(/^[•\-*]\s*/, '').trim();
    return {
      name: system,
      description: "Current system in use",
      replacing: true
    };
  }).filter(Boolean);
}

function extractTimeline(content) {
  const match = content.match(/Timeline:?\s*([^\n]+)/i);
  return match ? match[1].trim() : "Not specified";
}

function calculateFitScore(content) {
  const match = content.match(/Fit\s*score:?\s*([0-9]+)/i);
  return match ? parseInt(match[1], 10) : 50; // Default to 50 if no score found
}

module.exports = openaiService;

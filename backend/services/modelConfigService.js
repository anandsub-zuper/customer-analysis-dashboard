const { getDb } = require('./mongoDbService');

/**
 * Get model configuration
 */
exports.getModelConfig = async () => {
  try {
    const db = await getDb();
    const config = await db.collection('configuration').findOne({ _id: 'model' });
    
    // Return default config if none exists
    return config || {
      type: 'gpt-4-turbo',
      temperature: 0.7,
      maxTokens: 2500,
      depth: 'Standard',
      timeout: 30000
    };
  } catch (error) {
    console.error('Error getting model config:', error);
    throw error;
  }
};

/**
 * Update model configuration
 */
exports.updateModelConfig = async (configData) => {
  try {
    const db = await getDb();
    
    // Validate the configuration
    const validatedConfig = validateModelConfig(configData);
    
    await db.collection('configuration').replaceOne(
      { _id: 'model' },
      { _id: 'model', ...validatedConfig, updatedAt: new Date() },
      { upsert: true }
    );
    
    return validatedConfig;
  } catch (error) {
    console.error('Error updating model config:', error);
    throw error;
  }
};

/**
 * Validate model configuration
 */
function validateModelConfig(config) {
  const validModels = ['gpt-4-turbo', 'gpt-4o', 'gpt-3.5-turbo'];
  const validDepths = ['Standard', 'Comprehensive', 'Advanced'];
  
  // Validate model type
  if (!validModels.includes(config.type)) {
    throw new Error(`Invalid model type. Must be one of: ${validModels.join(', ')}`);
  }
  
  // Validate temperature
  if (config.temperature < 0 || config.temperature > 2) {
    throw new Error('Temperature must be between 0 and 2');
  }
  
  // Validate max tokens
  if (config.maxTokens < 100 || config.maxTokens > 4000) {
    throw new Error('Max tokens must be between 100 and 4000');
  }
  
  // Validate depth
  if (!validDepths.includes(config.depth)) {
    throw new Error(`Invalid analysis depth. Must be one of: ${validDepths.join(', ')}`);
  }
  
  return {
    type: config.type,
    temperature: parseFloat(config.temperature),
    maxTokens: parseInt(config.maxTokens),
    depth: config.depth,
    timeout: parseInt(config.timeout) || 30000
  };
}

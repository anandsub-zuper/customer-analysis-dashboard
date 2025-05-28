// frontend/src/api/configApi.js

import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Model Configuration
export const getModelConfig = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/config/model`);
    return response.data;
  } catch (error) {
    console.error('Error loading model config:', error);
    throw error;
  }
};

export const updateModelConfig = async (config) => {
  try {
    const response = await axios.put(`${API_URL}/api/config/model`, config);
    return response.data;
  } catch (error) {
    console.error('Error updating model config:', error);
    throw error;
  }
};

// Template Management
export const getTemplates = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/config/templates`);
    return response.data;
  } catch (error) {
    console.error('Error loading templates:', error);
    throw error;
  }
};

export const getTemplateById = async (id) => {
  try {
    const response = await axios.get(`${API_URL}/api/config/templates/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error loading template:', error);
    throw error;
  }
};

export const createTemplate = async (templateData) => {
  try {
    const response = await axios.post(`${API_URL}/api/config/templates`, templateData);
    return response.data;
  } catch (error) {
    console.error('Error creating template:', error);
    throw error;
  }
};

export const updateTemplate = async (id, templateData) => {
  try {
    const response = await axios.put(`${API_URL}/api/config/templates/${id}`, templateData);
    return response.data;
  } catch (error) {
    console.error('Error updating template:', error);
    throw error;
  }
};

export const deleteTemplate = async (id) => {
  try {
    const response = await axios.delete(`${API_URL}/api/config/templates/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting template:', error);
    throw error;
  }
};

// Criteria Management
export const getAllCriteria = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/config/criteria`);
    return response.data;
  } catch (error) {
    console.error('Error loading criteria:', error);
    throw error;
  }
};

export const getIndustryCriteria = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/config/criteria/industries`);
    return response.data;
  } catch (error) {
    console.error('Error loading industry criteria:', error);
    throw error;
  }
};

export const updateIndustryCriteria = async (criteria) => {
  try {
    const response = await axios.put(`${API_URL}/api/config/criteria/industries`, criteria);
    return response.data;
  } catch (error) {
    console.error('Error updating industry criteria:', error);
    throw error;
  }
};

export const getRequirementsCriteria = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/config/criteria/requirements`);
    return response.data;
  } catch (error) {
    console.error('Error loading requirements criteria:', error);
    throw error;
  }
};

export const updateRequirementsCriteria = async (criteria) => {
  try {
    const response = await axios.put(`${API_URL}/api/config/criteria/requirements`, criteria);
    return response.data;
  } catch (error) {
    console.error('Error updating requirements criteria:', error);
    throw error;
  }
};

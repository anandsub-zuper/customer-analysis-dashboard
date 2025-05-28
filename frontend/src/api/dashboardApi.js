// frontend/src/api/dashboardApi.js

import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

/**
 * Get dashboard metrics
 * @returns {Promise<Object>} - Dashboard metrics data
 */
export const getDashboardMetrics = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/dashboard/metrics`);
    return response.data;
  } catch (error) {
    console.error('Error loading dashboard metrics:', error);
    throw error;
  }
};

/**
 * Get recent activity
 * @returns {Promise<Object>} - Recent activity data
 */
export const getDashboardActivity = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/dashboard/activity`);
    return response.data;
  } catch (error) {
    console.error('Error loading dashboard activity:', error);
    throw error;
  }
};

/**
 * Get analysis trends over time
 * @returns {Promise<Object>} - Trends data
 */
export const getDashboardTrends = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/dashboard/trends`);
    return response.data;
  } catch (error) {
    console.error('Error loading dashboard trends:', error);
    throw error;
  }
};

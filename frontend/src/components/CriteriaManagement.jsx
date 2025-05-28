import React, { useState, useEffect } from 'react';
import { Save, Plus, X, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { 
  getAllCriteria, 
  updateIndustryCriteria, 
  updateRequirementsCriteria 
} from '../api/configApi';


const CriteriaManagement = () => {
  const [criteria, setCriteria] = useState({
    industries: { whitelist: [], blacklist: [] },
    requirements: { strengths: [], weaknesses: [], unsupported: [] }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [newInputs, setNewInputs] = useState({
    whitelist: '',
    blacklist: '',
    strengths: '',
    weaknesses: '',
    unsupported: ''
  });

  useEffect(() => {
    loadCriteria();
  }, []);

const loadCriteria = async () => {
  try {
    const result = await getAllCriteria();
    
    if (result.success) {
      setCriteria(result.data);
    }
  } catch (error) {
    console.error('Error loading criteria:', error);
    setMessage('Error loading criteria');
  } finally {
    setLoading(false);
  }
};

const saveCriteria = async () => {
  try {
    setSaving(true);
    setMessage('');

    // Save industries and requirements separately using the API
    const [industriesResult, requirementsResult] = await Promise.all([
      updateIndustryCriteria(criteria.industries),
      updateRequirementsCriteria(criteria.requirements)
    ]);

    if (industriesResult.success && requirementsResult.success) {
      setMessage('Criteria saved successfully');
      setTimeout(() => setMessage(''), 3000);
    } else {
      setMessage('Error saving criteria');
    }
  } catch (error) {
    console.error('Error saving criteria:', error);
    setMessage('Error saving criteria');
  } finally {
    setSaving(false);
  }
};

  const addItem = (category, subcategory) => {
    const value = newInputs[subcategory].trim();
    if (!value) return;

    setCriteria(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [subcategory]: [...prev[category][subcategory], value]
      }
    }));

    setNewInputs(prev => ({ ...prev, [subcategory]: '' }));
  };

  const removeItem = (category, subcategory, index) => {
    setCriteria(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [subcategory]: prev[category][subcategory].filter((_, i) => i !== index)
      }
    }));
  };

  const handleInputKeyPress = (e, category, subcategory) => {
    if (e.key === 'Enter') {
      addItem(category, subcategory);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Analysis Criteria Configuration</h1>
        <button
          onClick={saveCriteria}
          disabled={saving}
          className={`flex items-center px-4 py-2 text-white rounded-md ${
            saving ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save All Changes'}
        </button>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-md ${
          message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
        }`}>
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Industry Criteria */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Industry Criteria</h2>
          
          {/* Whitelisted Industries */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              <h3 className="text-lg font-medium">Preferred Industries</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Industries that are a good fit for your software
            </p>
            
            <div className="flex flex-wrap gap-2 mb-4">
              {criteria.industries.whitelist.map((industry, index) => (
                <span key={index} className="bg-green-100 text-green-800 text-sm px-3 py-1 rounded-full flex items-center">
                  {industry}
                  <button
                    onClick={() => removeItem('industries', 'whitelist', index)}
                    className="ml-2 text-green-600 hover:text-green-800"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            
            <div className="flex">
              <input
                type="text"
                value={newInputs.whitelist}
                onChange={(e) => setNewInputs(prev => ({ ...prev, whitelist: e.target.value }))}
                onKeyPress={(e) => handleInputKeyPress(e, 'industries', 'whitelist')}
                className="flex-1 p-2 border border-gray-300 rounded-l-md focus:ring-2 focus:ring-green-500"
                placeholder="Add preferred industry"
              />
              <button
                onClick={() => addItem('industries', 'whitelist')}
                className="px-4 py-2 bg-green-600 text-white rounded-r-md hover:bg-green-700"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Blacklisted Industries */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <XCircle className="h-5 w-5 text-red-600 mr-2" />
              <h3 className="text-lg font-medium">Industries to Avoid</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Industries that are typically not a good fit
            </p>
            
            <div className="flex flex-wrap gap-2 mb-4">
              {criteria.industries.blacklist.map((industry, index) => (
                <span key={index} className="bg-red-100 text-red-800 text-sm px-3 py-1 rounded-full flex items-center">
                  {industry}
                  <button
                    onClick={() => removeItem('industries', 'blacklist', index)}
                    className="ml-2 text-red-600 hover:text-red-800"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            
            <div className="flex">
              <input
                type="text"
                value={newInputs.blacklist}
                onChange={(e) => setNewInputs(prev => ({ ...prev, blacklist: e.target.value }))}
                onKeyPress={(e) => handleInputKeyPress(e, 'industries', 'blacklist')}
                className="flex-1 p-2 border border-gray-300 rounded-l-md focus:ring-2 focus:ring-red-500"
                placeholder="Add industry to avoid"
              />
              <button
                onClick={() => addItem('industries', 'blacklist')}
                className="px-4 py-2 bg-red-600 text-white rounded-r-md hover:bg-red-700"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Requirements Criteria */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Requirements Criteria</h2>
          
          {/* Strengths */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <CheckCircle className="h-5 w-5 text-blue-600 mr-2" />
              <h3 className="text-lg font-medium">Platform Strengths</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Features and capabilities your software excels at
            </p>
            
            <div className="flex flex-wrap gap-2 mb-4">
              {criteria.requirements.strengths.map((strength, index) => (
                <span key={index} className="bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full flex items-center">
                  {strength}
                  <button
                    onClick={() => removeItem('requirements', 'strengths', index)}
                    className="ml-2 text-blue-600 hover:text-blue-800"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            
            <div className="flex">
              <input
                type="text"
                value={newInputs.strengths}
                onChange={(e) => setNewInputs(prev => ({ ...prev, strengths: e.target.value }))}
                onKeyPress={(e) => handleInputKeyPress(e, 'requirements', 'strengths')}
                className="flex-1 p-2 border border-gray-300 rounded-l-md focus:ring-2 focus:ring-blue-500"
                placeholder="Add platform strength"
              />
              <button
                onClick={() => addItem('requirements', 'strengths')}
                className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Weaknesses */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
              <h3 className="text-lg font-medium">Platform Limitations</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Areas where your software has limitations
            </p>
            
            <div className="flex flex-wrap gap-2 mb-4">
              {criteria.requirements.weaknesses.map((weakness, index) => (
                <span key={index} className="bg-yellow-100 text-yellow-800 text-sm px-3 py-1 rounded-full flex items-center">
                  {weakness}
                  <button
                    onClick={() => removeItem('requirements', 'weaknesses', index)}
                    className="ml-2 text-yellow-600 hover:text-yellow-800"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            
            <div className="flex">
              <input
                type="text"
                value={newInputs.weaknesses}
                onChange={(e) => setNewInputs(prev => ({ ...prev, weaknesses: e.target.value }))}
                onKeyPress={(e) => handleInputKeyPress(e, 'requirements', 'weaknesses')}
                className="flex-1 p-2 border border-gray-300 rounded-l-md focus:ring-2 focus:ring-yellow-500"
                placeholder="Add platform limitation"
              />
              <button
                onClick={() => addItem('requirements', 'weaknesses')}
                className="px-4 py-2 bg-yellow-600 text-white rounded-r-md hover:bg-yellow-700"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Unsupported */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <XCircle className="h-5 w-5 text-red-600 mr-2" />
              <h3 className="text-lg font-medium">Unsupported Requirements</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Features your software cannot or does not support
            </p>
            
            <div className="flex flex-wrap gap-2 mb-4">
              {criteria.requirements.unsupported.map((unsupported, index) => (
                <span key={index} className="bg-red-100 text-red-800 text-sm px-3 py-1 rounded-full flex items-center">
                  {unsupported}
                  <button
                    onClick={() => removeItem('requirements', 'unsupported', index)}
                    className="ml-2 text-red-600 hover:text-red-800"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            
            <div className="flex">
              <input
                type="text"
                value={newInputs.unsupported}
                onChange={(e) => setNewInputs(prev => ({ ...prev, unsupported: e.target.value }))}
                onKeyPress={(e) => handleInputKeyPress(e, 'requirements', 'unsupported')}
                className="flex-1 p-2 border border-gray-300 rounded-l-md focus:ring-2 focus:ring-red-500"
                placeholder="Add unsupported requirement"
              />
              <button
                onClick={() => addItem('requirements', 'unsupported')}
                className="px-4 py-2 bg-red-600 text-white rounded-r-md hover:bg-red-700"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CriteriaManagement;

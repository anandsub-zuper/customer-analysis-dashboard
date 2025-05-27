import React, { useState, useEffect } from 'react';
import { Settings, Save, RotateCcw } from 'lucide-react';

const ModelSettings = () => {
  const [config, setConfig] = useState({
    type: 'gpt-4-turbo',
    temperature: 0.7,
    maxTokens: 2500,
    depth: 'Standard',
    timeout: 30000
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadModelConfig();
  }, []);

  const loadModelConfig = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/config/model`);
      const result = await response.json();
      
      if (result.success) {
        setConfig(result.data);
      }
    } catch (error) {
      console.error('Error loading model config:', error);
      setMessage('Error loading configuration');
    } finally {
      setLoading(false);
    }
  };

  const saveModelConfig = async () => {
    try {
      setSaving(true);
      setMessage('');

      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/config/model`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      const result = await response.json();

      if (result.success) {
        setMessage('Configuration saved successfully');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(`Error: ${result.message}`);
      }
    } catch (error) {
      console.error('Error saving model config:', error);
      setMessage('Error saving configuration');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    setConfig({
      type: 'gpt-4-turbo',
      temperature: 0.7,
      maxTokens: 2500,
      depth: 'Standard',
      timeout: 30000
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Settings className="h-6 w-6 text-blue-600 mr-2" />
          <h2 className="text-xl font-semibold">AI Model Settings</h2>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={resetToDefaults}
            className="flex items-center px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset to Defaults
          </button>
          <button
            onClick={saveModelConfig}
            disabled={saving}
            className={`flex items-center px-4 py-2 text-sm text-white rounded-md ${
              saving ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            <Save className="h-4 w-4 mr-1" />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-md ${
          message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
        }`}>
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            AI Model
          </label>
          <select
            value={config.type}
            onChange={(e) => setConfig({ ...config, type: e.target.value })}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="gpt-4-turbo">GPT-4 Turbo (Recommended)</option>
            <option value="gpt-4o">GPT-4o (Latest)</option>
            <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Faster)</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Choose the AI model for analysis. GPT-4 Turbo offers the best balance of quality and speed.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Analysis Depth
          </label>
          <select
            value={config.depth}
            onChange={(e) => setConfig({ ...config, depth: e.target.value })}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="Standard">Standard Analysis</option>
            <option value="Comprehensive">Comprehensive Analysis</option>
            <option value="Advanced">Advanced Analysis</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Standard: Quick analysis. Comprehensive: Detailed analysis. Advanced: Maximum depth.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Temperature: {config.temperature}
          </label>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={config.temperature}
            onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Conservative (0)</span>
            <span>Balanced (1)</span>
            <span>Creative (2)</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Controls randomness. Lower values make responses more focused and deterministic.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Max Tokens
          </label>
          <input
            type="number"
            min="100"
            max="4000"
            step="100"
            value={config.maxTokens}
            onChange={(e) => setConfig({ ...config, maxTokens: parseInt(e.target.value) })}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Maximum response length. Higher values allow more detailed analysis but cost more.
          </p>
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-sm font-medium text-blue-800 mb-2">Current Configuration Summary</h3>
        <div className="text-sm text-blue-700 space-y-1">
          <p><strong>Model:</strong> {config.type}</p>
          <p><strong>Analysis Depth:</strong> {config.depth}</p>
          <p><strong>Temperature:</strong> {config.temperature} (Creativity Level)</p>
          <p><strong>Max Response Length:</strong> {config.maxTokens} tokens</p>
        </div>
      </div>
    </div>
  );
};

export default ModelSettings;

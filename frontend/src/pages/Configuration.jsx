import React, { useState } from 'react';
import { Settings, Database, Key, Link } from 'lucide-react';
import ModelSettings from '../components/ModelSettings';
import CriteriaManagement from '../components/CriteriaManagement';
import Button from '../components/common/Button';

const Configuration = () => {
  const [activeTab, setActiveTab] = useState('model');
  
  const tabs = [
    { id: 'model', label: 'Model Settings', icon: <Settings className="h-4 w-4" /> },
    { id: 'criteria', label: 'Analysis Criteria', icon: <Database className="h-4 w-4" /> },
    { id: 'api', label: 'API Settings', icon: <Key className="h-4 w-4" /> },
    { id: 'integrations', label: 'Integrations', icon: <Link className="h-4 w-4" /> }
  ];
  
  const renderAPISettings = () => (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-6 flex items-center">
        <Key className="h-5 w-5 mr-2 text-purple-600" />
        API Configuration
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-medium mb-4">OpenAI Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Key
              </label>
              <input
                type="password"
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                placeholder="sk-..."
                defaultValue="sk-●●●●●●●●●●●●●●●●●●●●●●●●"
              />
              <p className="text-xs text-gray-500 mt-1">
                Your OpenAI API key for AI-powered analysis
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Monthly Usage Limit
              </label>
              <input
                type="text"
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                defaultValue="$100"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Alert Threshold
              </label>
              <input
                type="text"
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                defaultValue="80%"
              />
              <p className="text-xs text-gray-500 mt-1">
                Alert when usage reaches this percentage
              </p>
            </div>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-medium mb-4">Usage Statistics</h3>
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Current Month Usage</span>
              <span className="text-sm font-medium">$42.50</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Remaining Budget</span>
              <span className="text-sm font-medium text-green-600">$57.50</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">API Calls This Month</span>
              <span className="text-sm font-medium">1,247</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Average Cost per Call</span>
              <span className="text-sm font-medium">$0.034</span>
            </div>
          </div>
          
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1">
              <span>Usage Progress</span>
              <span className="font-medium">42.5%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: '42.5%' }}></div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-6 flex justify-end">
        <Button variant="primary">
          Save API Settings
        </Button>
      </div>
    </div>
  );
  
  const renderIntegrations = () => (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-6 flex items-center">
        <Link className="h-5 w-5 mr-2 text-green-600" />
        Google Workspace Integrations
      </h2>
      
      <div className="space-y-4">
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <div className="bg-green-100 p-2 rounded-md mr-3">
                <Database className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium">Google Sheets</h3>
                <p className="text-sm text-gray-500">Historical customer data</p>
              </div>
            </div>
            <span className="text-sm text-green-600 font-medium">Connected</span>
          </div>
          <div className="bg-gray-50 rounded p-3 text-sm">
            <p className="text-gray-600 mb-1">Spreadsheet ID:</p>
            <code className="text-xs bg-white px-2 py-1 rounded">1BxiMVs0XRA5nFMdKvBd...</code>
          </div>
        </div>
        
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <div className="bg-blue-100 p-2 rounded-md mr-3">
                <Database className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium">Google Docs</h3>
                <p className="text-sm text-gray-500">Meeting transcripts</p>
              </div>
            </div>
            <span className="text-sm text-green-600 font-medium">Connected</span>
          </div>
          <div className="bg-gray-50 rounded p-3 text-sm">
            <p className="text-gray-600 mb-1">Analysis Folder:</p>
            <code className="text-xs bg-white px-2 py-1 rounded">Customer Analysis Documents</code>
          </div>
        </div>
        
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <div className="bg-purple-100 p-2 rounded-md mr-3">
                <Database className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-medium">MongoDB Atlas</h3>
                <p className="text-sm text-gray-500">Analysis storage</p>
              </div>
            </div>
            <span className="text-sm text-green-600 font-medium">Connected</span>
          </div>
          <div className="bg-gray-50 rounded p-3 text-sm">
            <p className="text-gray-600 mb-1">Database:</p>
            <code className="text-xs bg-white px-2 py-1 rounded">customer_analysis_db</code>
          </div>
        </div>
      </div>
      
      <div className="mt-6">
        <Button variant="outline" fullWidth>
          Test All Connections
        </Button>
      </div>
    </div>
  );
  
  return (
    <div className="min-h-full bg-gray-100 p-6">
      <h1 className="text-2xl font-bold mb-6">Configuration</h1>
      
      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.icon}
                <span className="ml-2">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>
      
      {/* Tab Content */}
      <div>
        {activeTab === 'model' && <ModelSettings />}
        {activeTab === 'criteria' && <CriteriaManagement />}
        {activeTab === 'api' && renderAPISettings()}
        {activeTab === 'integrations' && renderIntegrations()}
      </div>
    </div>
  );
};

export default Configuration;

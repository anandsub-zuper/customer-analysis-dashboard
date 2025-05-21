import React, { useState, useEffect } from 'react';
import { Bell, Settings, Users, Database, FileText, BarChart2, PieChart, Check, X, 
         AlertTriangle, Upload, Clock, Search, Home, Layers, ArrowRight, Clipboard, 
         Sliders, HelpCircle, ChevronRight, Award, Download, Calendar, Briefcase } from 'lucide-react';
import { analyzeTranscript, getAnalysisHistory } from '../api/analysisApi';
import { listDocs, getDocContent } from '../api/docsApi';
import { listSheets, getSheetData } from '../api/sheetsApi';
import FileUpload from './common/FileUpload';

const Dashboard = () => {
  // State for navigation and UI
  const [activeTab, setActiveTab] = useState('dashboard');
  const [analysisTab, setAnalysisTab] = useState('summary');
  const [showUploadModal, setShowUploadModal] = useState(false);
  
  // State for analysis data
  const [transcriptText, setTranscriptText] = useState('');
  const [selectedDocId, setSelectedDocId] = useState('');
  const [analyzingTranscript, setAnalyzingTranscript] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [googleDocs, setGoogleDocs] = useState([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  
  // State for dashboard data
  const [recentAnalyses, setRecentAnalyses] = useState([]);
  const [historicalData, setHistoricalData] = useState([]);
  const [isLoadingHistorical, setIsLoadingHistorical] = useState(false);
  
  // Load recent analyses on component mount
  useEffect(() => {
    const loadRecentAnalyses = async () => {
      try {
        const history = await getAnalysisHistory(5);
        setRecentAnalyses(history.data || []);
      } catch (error) {
        console.error('Error loading analysis history:', error);
      }
    };
    
    loadRecentAnalyses();
  }, []);
  
  // Handle uploading a transcript
  const handleUpload = () => {
    setShowUploadModal(true);
    // Reset form states
    setTranscriptText('');
    setSelectedDocId('');
  };
  
  // Load Google Docs list
  const loadGoogleDocs = async () => {
    try {
      setIsLoadingDocs(true);
      const response = await listDocs();
      setGoogleDocs(response.files || []);
      setIsLoadingDocs(false);
    } catch (error) {
      console.error('Error loading Google Docs:', error);
      setIsLoadingDocs(false);
    }
  };
  
  // Load Google Doc content
  const handleDocSelect = async (e) => {
    const docId = e.target.value;
    setSelectedDocId(docId);
    
    if (docId) {
      try {
        setIsLoadingDocs(true);
        const response = await getDocContent(docId);
        setTranscriptText(response.plainText || '');
        setIsLoadingDocs(false);
      } catch (error) {
        console.error('Error loading Google Doc content:', error);
        setIsLoadingDocs(false);
      }
    }
  };
  
  // Handle file upload
  const handleFileContent = (content) => {
    setTranscriptText(content);
  };
  
  // Run analysis on transcript
  const handleAnalyzeTranscript = async () => {
    if (!transcriptText.trim() && !selectedDocId) {
      alert('Please enter a transcript or select a Google Doc');
      return;
    }
    
    try {
      setAnalyzingTranscript(true);
      
      const response = await analyzeTranscript(
        transcriptText.trim() ? transcriptText : null,
        selectedDocId || null
      );
      
      if (response.success) {
        setAnalysisResults(response.results);
        setAnalysisComplete(true);
        setActiveTab('analysis');
        
        // Refresh the recent analyses list
        const history = await getAnalysisHistory(5);
        setRecentAnalyses(history.data || []);
      } else {
        alert(`Analysis failed: ${response.message}`);
      }
      
      setAnalyzingTranscript(false);
      setShowUploadModal(false);
    } catch (error) {
      console.error('Error analyzing transcript:', error);
      setAnalyzingTranscript(false);
      alert('Error analyzing transcript. Please try again.');
    }
  };
  
  // Load historical data
  const loadHistoricalData = async () => {
    try {
      setIsLoadingHistorical(true);
      const sheets = await listSheets();
      
      if (sheets && sheets.length > 0) {
        const sheetTitle = sheets[0].title;
        const spreadsheetId = process.env.REACT_APP_HISTORICAL_SPREADSHEET_ID;
        
        if (spreadsheetId && sheetTitle) {
          const data = await getSheetData(spreadsheetId, `${sheetTitle}!A1:Z1000`);
          setHistoricalData(data || []);
        }
      }
      
      setIsLoadingHistorical(false);
    } catch (error) {
      console.error('Error loading historical data:', error);
      setIsLoadingHistorical(false);
    }
  };
  
  // Load historical data when visiting the historical tab
  useEffect(() => {
    if (activeTab === 'historical' && historicalData.length === 0) {
      loadHistoricalData();
    }
  }, [activeTab]);
  
  // Functions to render different tabs
  
  // Main dashboard tab
  const renderDashboard = () => (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <DashboardCard 
          title="Recent Analyses" 
          icon={<FileText className="h-6 w-6 text-blue-600" />}
          value={recentAnalyses.length || "0"}
          description="Analyzed in last 30 days"
        />
        <DashboardCard 
          title="Average Fit Score" 
          icon={<BarChart2 className="h-6 w-6 text-green-600" />}
          value={calculateAverageFitScore()}
          description="Across all prospects"
        />
        <DashboardCard 
          title="Configuration Status" 
          icon={<Settings className="h-6 w-6 text-purple-600" />}
          value="Connected"
          description="Google API connected"
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Recent Prospects</h2>
            <button 
              className="text-blue-600 text-sm"
              onClick={() => setActiveTab('historical')}
            >
              View All
            </button>
          </div>
          <div className="space-y-4">
            {recentAnalyses.length > 0 ? (
              recentAnalyses.map((analysis, index) => (
                <ProspectItem 
                  key={index}
                  name={analysis.customerName} 
                  industry={analysis.industry} 
                  date={analysis.date}
                  score={analysis.fitScore}
                  onClick={() => {
                    setAnalysisResults(analysis);
                    setActiveTab('analysis');
                  }}
                />
              ))
            ) : (
              <div className="text-center py-4 text-gray-500">
                No recent analyses. Click "New Analysis" to get started.
              </div>
            )}
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Industry Distribution</h2>
            <div className="flex space-x-2">
              <button className="text-sm text-gray-500">Last 30 Days</button>
              <button className="text-sm text-blue-600">All Time</button>
            </div>
          </div>
          <div className="h-64 flex items-center justify-center">
            <PieChart className="h-48 w-48 text-gray-300" />
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
              <span className="text-sm">Construction (24%)</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
              <span className="text-sm">Retail (18%)</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
              <span className="text-sm">Service (28%)</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-purple-500 mr-2"></div>
              <span className="text-sm">Manufacturing (16%)</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
              <span className="text-sm">Other (14%)</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-6 bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Analysis Activity</h2>
          <button 
            className="text-blue-600 text-sm"
            onClick={() => setActiveTab('historical')}
          >
            View Details
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Industry</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fit Score</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentAnalyses.length > 0 ? (
                recentAnalyses.map((analysis, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {analysis.customerName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {analysis.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {analysis.industry}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <span className={`mr-2 font-medium ${getFitScoreColor(analysis.fitScore)}`}>
                          {analysis.fitScore}%
                        </span>
                        <div className="w-24 bg-gray-200 rounded-full h-2.5">
                          <div 
                            className={`${getFitScoreBackgroundColor(analysis.fitScore)} h-2.5 rounded-full`} 
                            style={{width: `${analysis.fitScore}%`}}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button 
                        className="text-blue-600 hover:text-blue-800"
                        onClick={() => {
                          setAnalysisResults(analysis);
                          setActiveTab('analysis');
                        }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                    No analysis activity yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
  
  // Historical data tab
  const renderHistoricalData = () => (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Historical Customer Data</h1>
        <div className="flex space-x-2">
          <button className="px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 flex items-center">
            <Search className="h-4 w-4 mr-1" />
            Search
          </button>
          <button className="px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 flex items-center">
            <Download className="h-4 w-4 mr-1" />
            Export
          </button>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <FileText className="h-5 w-5 text-green-600 mr-2" />
              <h2 className="font-medium">Google Sheets Data Source</h2>
            </div>
            {isLoadingHistorical ? (
              <div className="text-sm text-gray-500">Loading...</div>
            ) : (
              <div className="flex items-center text-sm text-gray-500">
                <Clock className="h-4 w-4 mr-1" />
                <span>Last synced: {new Date().toLocaleTimeString()}</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="overflow-x-auto">
          {historicalData.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  {historicalData[0].map((header, index) => (
                    <th 
                      key={index}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {historicalData.slice(1).map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <td 
                        key={cellIndex}
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-6 text-center text-gray-500">
              {isLoadingHistorical ? 'Loading data...' : 'No historical data available'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
  
  // Templates tab
  const renderTemplates = () => (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Analysis Templates</h1>
        <button className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm flex items-center">
          <span className="mr-1">+</span> New Template
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium">Field Service Standard</h2>
            <div className="flex space-x-1">
              <button className="p-1 text-gray-500 hover:text-gray-700">
                <Sliders className="h-4 w-4" />
              </button>
              <button className="p-1 text-gray-500 hover:text-gray-700">
                <FileText className="h-4 w-4" />
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-4">Standard analysis template for field service companies with mobile workforce requirements.</p>
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded">Field Service</span>
            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded">Standard</span>
            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded">Mobile</span>
          </div>
          <button className="w-full mt-2 px-3 py-1.5 border border-blue-600 text-blue-600 rounded-md text-sm">Use Template</button>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium">Construction Specialty</h2>
            <div className="flex space-x-1">
              <button className="p-1 text-gray-500 hover:text-gray-700">
                <Sliders className="h-4 w-4" />
              </button>
              <button className="p-1 text-gray-500 hover:text-gray-700">
                <FileText className="h-4 w-4" />
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-4">Specialized template for construction firms with project-based workflows and inventory tracking.</p>
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded">Construction</span>
            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded">Projects</span>
            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded">Inventory</span>
          </div>
          <button className="w-full mt-2 px-3 py-1.5 border border-blue-600 text-blue-600 rounded-md text-sm">Use Template</button>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium">Enterprise Integration</h2>
            <div className="flex space-x-1">
              <button className="p-1 text-gray-500 hover:text-gray-700">
                <Sliders className="h-4 w-4" />
              </button>
              <button className="p-1 text-gray-500 hover:text-gray-700">
                <FileText className="h-4 w-4" />
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-4">Complex analysis template for companies with advanced integration requirements and custom workflows.</p>
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded">Enterprise</span>
            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded">Integration</span>
            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded">Custom</span>
          </div>
          <button className="w-full mt-2 px-3 py-1.5 border border-blue-600 text-blue-600 rounded-md text-sm">Use Template</button>
        </div>
      </div>
    </div>
  );
  
  // Configuration tab
  const renderConfiguration = () => (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Configuration</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">API Settings</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">OpenAI API Key</label>
              <input 
                type="password" 
                className="w-full p-2 border border-gray-300 rounded-md" 
                value="sk-●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●" 
                readOnly
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Maximum API Usage per Month</label>
              <input 
                type="text" 
                className="w-full p-2 border border-gray-300 rounded-md" 
                defaultValue="$100" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alert Threshold</label>
              <input 
                type="text" 
                className="w-full p-2 border border-gray-300 rounded-md" 
                defaultValue="80%" 
              />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Model Settings</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">AI Model</label>
              <select className="w-full p-2 border border-gray-300 rounded-md">
                <option>gpt-4-turbo</option>
                <option>gpt-4o</option>
                <option>gpt-3.5-turbo</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Temperature</label>
              <input 
                type="range" 
                className="w-full" 
                min="0" 
                max="2" 
                step="0.1" 
                defaultValue="0.7" 
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Conservative (0)</span>
                <span>Balanced (0.7)</span>
                <span>Creative (2)</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Analysis Depth</label>
              <select className="w-full p-2 border border-gray-300 rounded-md">
                <option>Standard</option>
                <option>Comprehensive</option>
                <option>Advanced</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Data Sources</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
              <div className="flex items-center">
                <FileText className="h-5 w-5 text-green-600 mr-2" />
                <div>
                  <p className="font-medium">Google Sheets</p>
                  <p className="text-sm text-gray-500">Customer Data Sheet: Connected</p>
                </div>
              </div>
              <button className="text-blue-600 text-sm">Configure</button>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
              <div className="flex items-center">
                <FileText className="h-5 w-5 text-blue-600 mr-2" />
                <div>
                  <p className="font-medium">Google Docs</p>
                  <p className="text-sm text-gray-500">Meeting Transcripts Folder: Connected</p>
                </div>
              </div>
              <button className="text-blue-600 text-sm">Configure</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
  
  // Analysis tab
  const renderAnalysis = () => {
    if (!analysisResults) {
      return (
        <div className="p-6 text-center">
          <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium mb-2">No Analysis Available</h3>
          <p className="text-gray-500 mb-4">Upload or select a transcript to analyze</p>
          <button 
            className="px-4 py-2 bg-blue-600 text-white rounded-md"
            onClick={handleUpload}
          >
            New Analysis
          </button>
        </div>
      );
    }
    
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Customer Fit Analysis</h1>
          <div className="flex space-x-2">
            <button className="px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 flex items-center">
              <Download className="h-4 w-4 mr-1" />
              Export Report
            </button>
            <button 
              className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm flex items-center"
              onClick={handleUpload}
            >
              <Upload className="h-4 w-4 mr-1" />
              New Analysis
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between">
              <h2 className="text-lg font-semibold mb-2">{analysisResults.customerName}</h2>
              <span className="text-xs text-gray-500">
                {new Date().toLocaleDateString()}
              </span>
            </div>
            <div className="text-sm text-gray-500 mb-4">{analysisResults.industry}</div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                <span className="text-xl font-bold text-green-600">{analysisResults.fitScore}%</span>
              </div>
              <div>
                <p className="font-medium">{getFitLabel(analysisResults.fitScore)}</p>
                <p className="text-sm text-gray-500">Compatibility score</p>
              </div>
            </div>
            <div className="border-t pt-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-gray-500">Users</p>
                  <p className="font-medium">
                    {analysisResults.userCount?.total || 'N/A'} 
                    {analysisResults.userCount?.backOffice && analysisResults.userCount?.field ? 
                      ` (${analysisResults.userCount.backOffice} office, ${analysisResults.userCount.field} field)` :
                      ''}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Launch Date</p>
                  <p className="font-medium">{analysisResults.timeline || 'Not specified'}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Key Metrics</h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">Success Probability</span>
                  <span className={`text-sm font-medium ${getFitScoreColor(analysisResults.fitScore)}`}>
                    {getSuccessProbability(analysisResults.fitScore)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className={`${getFitScoreBackgroundColor(analysisResults.fitScore)} h-2.5 rounded-full`} 
                    style={{width: `${analysisResults.fitScore}%`}}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">Feature Match</span>
                  <span className={`text-sm font-medium ${getFitScoreColor(analysisResults.fitScore)}`}>
                    {getFitLabel(analysisResults.fitScore)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className={`${getFitScoreBackgroundColor(analysisResults.fitScore)} h-2.5 rounded-full`} 
                    style={{width: `${analysisResults.fitScore}%`}}
                  ></div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Current Systems</h2>
            <div className="space-y-3">
              {analysisResults.currentSystems ? (
                analysisResults.currentSystems.map((system, index) => (
                  <div key={index} className="flex items-start">
                    <div className="min-w-8 mt-0.5">
                      {system.replacing ? (
                        <X className="h-5 w-5 text-red-500" />
                      ) : (
                        <Check className="h-5 w-5 text-green-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{system.name}</p>
                      <p className="text-sm text-gray-500">{system.description}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500">No current systems information available</p>
              )}
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b">
            <div className="flex">
              <button 
                className={`px-4 py-3 text-sm font-medium ${analysisTab === 'summary' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
                onClick={() => setAnalysisTab('summary')}
              >
                Summary
              </button>
              <button 
                className={`px-4 py-3 text-sm font-medium ${analysisTab === 'strengths' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
                onClick={() => setAnalysisTab('strengths')}
              >
                Strengths & Challenges
              </button>
              <button 
                className={`px-4 py-3 text-sm font-medium ${analysisTab === 'similar' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
                onClick={() => setAnalysisTab('similar')}
              >
                Similar Customers
              </button>
              <button 
                className={`px-4 py-3 text-sm font-medium ${analysisTab === 'requirements' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
                onClick={() => setAnalysisTab('requirements')}
              >
                Requirements
              </button>
              <button 
                className={`px-4 py-3 text-sm font-medium ${analysisTab === 'recommendations' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
                onClick={() => setAnalysisTab('recommendations')}
              >
                Recommendations
              </button>
            </div>
          </div>
          
          <div className="p-6">
            {analysisTab === 'summary' && renderAnalysisSummary()}
            {analysisTab === 'strengths' && renderAnalysisStrengths()}
            {analysisTab === 'similar' && renderAnalysisSimilar()}
            {analysisTab === 'requirements' && renderAnalysisRequirements()}
            {analysisTab === 'recommendations' && renderAnalysisRecommendations()}
          </div>
        </div>
      </div>
    );
  };
  
  // Analysis tab sections
  const renderAnalysisSummary = () => (
    <div>
      <p className="text-gray-700 mb-4">
        {analysisResults.customerName} is a {analysisResults.industry} company with {analysisResults.userCount?.total || 'an unknown number of'} users
        {analysisResults.userCount?.backOffice && analysisResults.userCount?.field ? 
          ` (${analysisResults.userCount.backOffice} office, ${analysisResults.userCount.field} field)` :
          ''}
        {analysisResults.timeline ? ` looking to implement by ${analysisResults.timeline}` : ''}.
      </p>
      
      {analysisResults.currentSystems && analysisResults.currentSystems.length > 0 && (
        <div className="mb-4">
          <h3 className="font-medium mb-2">Current Systems</h3>
          <p className="text-gray-700">
            They currently use {analysisResults.currentSystems.map(s => s.name).join(', ')}.
          </p>
        </div>
      )}
      
      {analysisResults.services && analysisResults.services.length > 0 && (
        <div className="mb-4">
          <h3 className="font-medium mb-2">Service Types</h3>
          <div className="flex flex-wrap gap-2">
            {analysisResults.services.map((service, index) => (
              <span key={index} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                {service}
              </span>
            ))}
          </div>
        </div>
      )}
      
      {analysisResults.requirements && (
        <div className="mb-4">
          <h3 className="font-medium mb-2">Key Requirements</h3>
          <ul className="list-disc pl-8 text-gray-700 space-y-1">
            {analysisResults.requirements.keyFeatures && analysisResults.requirements.keyFeatures.map((feature, index) => (
              <li key={index}>{feature}</li>
            ))}
            {analysisResults.requirements.painPoints && analysisResults.requirements.painPoints.map((point, index) => (
              <li key={index}>{point}</li>
            ))}
          </ul>
        </div>
      )}
      
      <div>
        <h3 className="font-medium mb-2">Analysis Conclusion</h3>
        <p className="text-gray-700">
          {analysisResults.customerName} represents a {getFitLabel(analysisResults.fitScore).toLowerCase()} fit for our service management platform. 
          Their requirements align {analysisResults.fitScore > 80 ? 'very well' : analysisResults.fitScore > 60 ? 'well' : 'partially'} with our core strengths.
          The overall compatibility score is {analysisResults.fitScore}%.
        </p>
      </div>
    </div>
  );
  
  const renderAnalysisStrengths = () => (
    <div>
      <h3 className="font-medium mb-3">Key Strengths</h3>
      <div className="space-y-3 mb-6">
        {analysisResults.strengths ? (
          analysisResults.strengths.map((strength, index) => (
            <div key={index} className="flex items-start">
              <div className="min-w-8 mt-0.5">
                <Check className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="font-medium">{strength.title}</p>
                <p className="text-sm text-gray-700">{strength.description}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="flex items-start">
            <div className="min-w-8 mt-0.5">
              <Check className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="font-medium">Industry Fit</p>
              <p className="text-sm text-gray-700">The {analysisResults.industry} industry aligns well with our software capabilities.</p>
            </div>
          </div>
        )}
      </div>
      
      <h3 className="font-medium mb-3">Potential Challenges</h3>
      <div className="space-y-3">
        {analysisResults.challenges ? (
          analysisResults.challenges.map((challenge, index) => (
            <div key={index} className="flex items-start">
              <div className="min-w-8 mt-0.5">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="font-medium">{challenge.title}</p>
                <p className="text-sm text-gray-700">{challenge.description}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="flex items-start">
            <div className="min-w-8 mt-0.5">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <p className="font-medium">Integration Requirements</p>
              <p className="text-sm text-gray-700">May require custom integration work with existing systems.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
  
  const renderAnalysisSimilar = () => (
    <div>
      <p className="text-gray-700 mb-4">
        Here are several existing customers with similar profiles and requirements to {analysisResults.customerName}:
      </p>
      
      <div className="space-y-6">
        {analysisResults.similarCustomers ? (
          analysisResults.similarCustomers.map((customer, index) => (
            <div key={index} className="border-b pb-4">
              <div className="flex justify-between mb-2">
                <h3 className="font-medium">{customer.name}</h3>
                <span className="text-sm text-green-600 font-medium">{customer.matchPercentage}% Match</span>
              </div>
              <div className="text-sm text-gray-500 mb-2">{customer.userCount} users</div>
              <div className="mb-3">
                <div className="flex flex-wrap gap-2 mb-2">
                  {customer.industries.map((industry, idx) => (
                    <span key={idx} className="bg-gray-100 text-gray-800 text-xs px-2 py-0.5 rounded">
                      {industry}
                    </span>
                  ))}
                  {customer.services.map((service, idx) => (
                    <span key={idx} className="bg-gray-100 text-gray-800 text-xs px-2 py-0.5 rounded">
                      {service}
                    </span>
                  ))}
                </div>
                <p className="text-sm text-gray-700">
                  {customer.description || 'Similar company profile with comparable requirements.'}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-4 text-gray-500">
            No similar customers found in the database.
          </div>
        )}
      </div>
    </div>
  );
  
  const renderAnalysisRequirements = () => (
    <div>
      {analysisResults.services && analysisResults.services.length > 0 && (
        <div className="mb-6">
          <h3 className="font-medium mb-3">Service Types</h3>
          <div className="space-y-2">
            {analysisResults.services.map((service, index) => (
              <div key={index} className="flex items-center">
                <div className="min-w-8">
                  <Check className="h-5 w-5 text-green-500" />
                </div>
                <div className="font-medium">{service}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {analysisResults.requirements && analysisResults.requirements.keyFeatures && (
        <div className="mb-6">
          <h3 className="font-medium mb-3">Key Features</h3>
          <div className="space-y-2">
            {analysisResults.requirements.keyFeatures.map((feature, index) => (
              <div key={index} className="flex items-center">
                <div className="min-w-8">
                  <Check className="h-5 w-5 text-green-500" />
                </div>
                <div className="font-medium">{feature}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {analysisResults.requirements && analysisResults.requirements.integrations && (
        <div className="mb-6">
          <h3 className="font-medium mb-3">Integration Requirements</h3>
          <div className="space-y-2">
            {analysisResults.requirements.integrations.map((integration, index) => (
              <div key={index} className="flex items-center">
                <div className="min-w-8">
                  <Check className="h-5 w-5 text-green-500" />
                </div>
                <div className="font-medium">{integration}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
  
  const renderAnalysisRecommendations = () => (
    <div>
      <p className="text-gray-700 mb-4">
        Based on the analysis of {analysisResults.customerName}'s requirements and their compatibility with our platform, here are specific recommendations:
      </p>
      
      <div className="space-y-6">
        {analysisResults.recommendations ? (
          <>
            <div>
              <h3 className="font-medium mb-2">Implementation Approach</h3>
              <ul className="list-disc pl-8 text-gray-700 space-y-1">
                {analysisResults.recommendations.implementationApproach && 
                  analysisResults.recommendations.implementationApproach.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))
                }
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Integration Strategy</h3>
              <ul className="list-disc pl-8 text-gray-700 space-y-1">
                {analysisResults.recommendations.integrationStrategy && 
                  analysisResults.recommendations.integrationStrategy.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))
                }
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Training Recommendations</h3>
              <ul className="list-disc pl-8 text-gray-700 space-y-1">
                {analysisResults.recommendations.trainingRecommendations && 
                  analysisResults.recommendations.trainingRecommendations.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))
                }
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Timeline Projection</h3>
              <div className="bg-gray-50 p-4 rounded-md">
                <div className="space-y-3">
                  {analysisResults.recommendations.timelineProjection && 
                    Object.entries(analysisResults.recommendations.timelineProjection).map(([time, task], index) => (
                      <div key={index} className="flex">
                        <div className="min-w-40 font-medium">{time}:</div>
                        <div>{task}</div>
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-4 text-gray-500">
            Recommendations not available for this analysis.
          </div>
        )}
      </div>
    </div>
  );
  
  // Render upload modal
  const renderUploadModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl p-6">
        <h2 className="text-xl font-semibold mb-4">Upload Meeting Transcript</h2>
        
        {!analyzingTranscript ? (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Paste transcript or upload file</label>
              <textarea 
                className="w-full p-3 border border-gray-300 rounded-md h-64"
                placeholder="Paste your meeting transcript here..."
                value={transcriptText}
                onChange={(e) => setTranscriptText(e.target.value)}
              ></textarea>
            </div>
            
            <div className="mb-6">
              <FileUpload onFileContent={handleFileContent} />
            </div>
            
            <div className="flex items-center mb-6">
              <div className="flex-1 border-t border-gray-300"></div>
              <div className="px-3 text-gray-500 text-sm">OR</div>
              <div className="flex-1 border-t border-gray-300"></div>
            </div>
            
            <div className="mb-6">
              <div className="flex items-center space-x-2 mb-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <label className="block text-sm font-medium text-gray-700">Select from Google Docs</label>
                <button 
                  className="text-blue-600 text-sm"
                  onClick={loadGoogleDocs}
                >
                  {isLoadingDocs ? 'Loading...' : 'Load Docs'}
                </button>
              </div>
              {googleDocs.length > 0 ? (
                <select 
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={selectedDocId}
                  onChange={handleDocSelect}
                >
                  <option value="">Select a transcript document...</option>
                  {googleDocs.map(doc => (
                    <option key={doc.id} value={doc.id}>
                      {doc.name} ({new Date(doc.modifiedTime).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="text-sm text-gray-500">
                  {isLoadingDocs ? 'Loading Google Docs...' : 'Click "Load Docs" to see available documents'}
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-3">
              <button 
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700"
                onClick={() => setShowUploadModal(false)}
              >
                Cancel
              </button>
              <button 
                className={`px-4 py-2 rounded-md ${
                  transcriptText.trim() || selectedDocId 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                onClick={handleAnalyzeTranscript}
                disabled={!transcriptText.trim() && !selectedDocId}
              >
                Analyze Transcript
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-lg">Analyzing transcript...</p>
            <p className="text-sm text-gray-500 mt-2">This might take a moment</p>
          </div>
        )}
      </div>
    </div>
  );
  
  // Helper functions
  const calculateAverageFitScore = () => {
    if (!recentAnalyses || recentAnalyses.length === 0) {
      return "0%";
    }
    
    const sum = recentAnalyses.reduce((total, analysis) => total + analysis.fitScore, 0);
    return `${Math.round(sum / recentAnalyses.length)}%`;
  };
  
  const getFitScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  const getFitScoreBackgroundColor = (score) => {
    if (score >= 80) return 'bg-green-600';
    if (score >= 60) return 'bg-yellow-600';
    return 'bg-red-600';
  };
  
  const getFitLabel = (score) => {
    if (score >= 80) return 'Excellent Fit';
    if (score >= 60) return 'Good Fit';
    return 'Poor Fit';
  };
  
  const getSuccessProbability = (score) => {
    if (score >= 80) return 'Very High';
    if (score >= 70) return 'High';
    if (score >= 60) return 'Moderate';
    if (score >= 40) return 'Low';
    return 'Very Low';
  };
  
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-md">
        <div className="p-6">
          <h1 className="text-xl font-bold text-blue-700">Customer Analysis</h1>
        </div>
        <div className="px-4 pb-6">
          <button 
            className="w-full px-4 py-2.5 mb-3 bg-blue-600 text-white rounded-md flex items-center justify-center"
            onClick={handleUpload}
          >
            <Upload className="h-4 w-4 mr-2" />
            New Analysis
          </button>
        </div>
        <nav className="space-y-1 px-3">
          <NavItem 
            icon={<Home />} 
            label="Dashboard" 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')}
          />
          <NavItem 
            icon={<BarChart2 />} 
            label="Analysis" 
            active={activeTab === 'analysis'} 
            onClick={() => setActiveTab('analysis')}
          />
          <NavItem 
            icon={<Database />} 
            label="Historical Data" 
            active={activeTab === 'historical'} 
            onClick={() => setActiveTab('historical')}
          />
          <NavItem 
            icon={<Layers />} 
            label="Templates" 
            active={activeTab === 'templates'} 
            onClick={() => setActiveTab('templates')}
          />
          <NavItem 
            icon={<Settings />} 
            label="Configuration" 
            active={activeTab === 'configuration'} 
            onClick={() => setActiveTab('configuration')}
          />
        </nav>
        
        <div className="mt-8 px-4">
          <div className="text-xs font-medium text-gray-400 uppercase mb-2 pl-3">Recent Analyses</div>
          <div className="space-y-1">
            {recentAnalyses.length > 0 ? (
              recentAnalyses.map((analysis, index) => (
                <RecentItem 
                  key={index}
                  company={analysis.customerName} 
                  score={analysis.fitScore} 
                  date={analysis.date} 
                  active={activeTab === 'analysis' && analysisResults && analysisResults.customerName === analysis.customerName}
                  onClick={() => {
                    setAnalysisResults(analysis);
                    setActiveTab('analysis');
                  }}
                />
              ))
            ) : (
              <div className="text-sm text-gray-500 pl-3">No recent analyses</div>
            )}
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'configuration' && renderConfiguration()}
        {activeTab === 'analysis' && renderAnalysis()}
        {activeTab === 'historical' && renderHistoricalData()}
        {activeTab === 'templates' && renderTemplates()}
        {showUploadModal && renderUploadModal()}
      </div>
    </div>
  );
};

// Component for navigation items
const NavItem = ({ icon, label, active, onClick }) => (
  <button 
    className={`w-full flex items-center px-3 py-2.5 rounded-md text-sm ${
      active ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
    }`}
    onClick={onClick}
  >
    <div className={`mr-3 ${active ? 'text-blue-600' : 'text-gray-500'}`}>
      {icon}
    </div>
    {label}
  </button>
);

// Component for dashboard cards
const DashboardCard = ({ title, icon, value, description }) => (
  <div className="bg-white rounded-lg shadow p-6">
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      {icon}
    </div>
    <div className="mt-2">
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-sm text-gray-500">{description}</div>
    </div>
  </div>
);

// Component for prospect items
const ProspectItem = ({ name, industry, date, score, onClick }) => (
  <div className="flex items-center justify-between py-2 cursor-pointer hover:bg-gray-50 rounded-md px-2" onClick={onClick}>
    <div>
      <p className="font-medium">{name}</p>
      <p className="text-sm text-gray-500">{industry}</p>
    </div>
    <div className="flex items-center">
      <div className={`h-8 w-8 rounded-full flex items-center justify-center mr-3 ${
        score >= 80 ? 'bg-green-100 text-green-600' : 
        score >= 60 ? 'bg-yellow-100 text-yellow-600' : 
        'bg-red-100 text-red-600'
      }`}>
        <span className="text-xs font-bold">{score}%</span>
      </div>
      <span className="text-xs text-gray-500">{date}</span>
    </div>
  </div>
);

// Component for recent analysis items
const RecentItem = ({ company, score, date, active, onClick }) => (
  <button 
    className={`w-full flex items-center p-2 rounded-md text-sm ${
      active ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
    }`}
    onClick={onClick}
  >
    <div className={`h-6 w-6 rounded-full flex items-center justify-center mr-2 text-xs font-bold ${
      score >= 80 ? 'bg-green-100 text-green-600' : 
      score >= 60 ? 'bg-yellow-100 text-yellow-600' : 
      'bg-red-100 text-red-600'
    }`}>
      {score}
    </div>
    <div className="flex-1 text-left">
      <div className={`truncate font-medium ${active ? 'text-blue-700' : 'text-gray-700'}`}>{company}</div>
      <div className="text-xs text-gray-500">{date}</div>
    </div>
  </button>
);

export default Dashboard;

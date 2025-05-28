import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bell, Settings, Users, Database, FileText, BarChart2, PieChart, Check, X, 
         AlertTriangle, Upload, Clock, Search, Home, Layers, ArrowRight, Clipboard, 
         Sliders, HelpCircle, ChevronRight, Award, Download, Calendar, Briefcase } from 'lucide-react';
import { analyzeTranscript, getAnalysisHistory, getAnalysis } from '../api/analysisApi';
import { listDocs, getDocContent } from '../api/docsApi';
import { listSheets, getSheetData } from '../api/sheetsApi';
import { getTemplates } from '../api/configApi';
import { getDashboardMetrics } from '../api/dashboardApi';
import FileUpload from '../components/common/FileUpload';
import Button from '../components/common/Button';

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // State for upload modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [transcriptText, setTranscriptText] = useState('');
  const [selectedDocId, setSelectedDocId] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [analyzingTranscript, setAnalyzingTranscript] = useState(false);
  const [googleDocs, setGoogleDocs] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  
  // State for dashboard data
  const [recentAnalyses, setRecentAnalyses] = useState([]);
  const [dashboardMetrics, setDashboardMetrics] = useState({});
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);

  // Load initial data on component mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        await Promise.all([
          loadRecentAnalyses(),
          loadDashboardMetrics(),
          loadTemplates()
        ]);
      } catch (error) {
        console.error('Error loading initial data:', error);
      }
    };
    
    loadInitialData();
  }, []);

  // Check for URL parameters to open upload modal
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('action') === 'new-analysis') {
      setShowUploadModal(true);
      // Clean up the URL
      navigate('/dashboard', { replace: true });
    }
  }, [location, navigate]);

  // Load recent analyses with proper IDs
  const loadRecentAnalyses = async () => {
    try {
      const history = await getAnalysisHistory(5);
      // Ensure each analysis has an id field
      const analysesWithIds = (history.data || []).map(analysis => ({
        ...analysis,
        id: analysis.id || analysis._id || analysis.analysisId
      }));
      setRecentAnalyses(analysesWithIds);
    } catch (error) {
      console.error('Error loading analysis history:', error);
    }
  };

  // Load templates
  const loadTemplates = async () => {
    try {
      const result = await getTemplates();
      if (result.success) {
        setTemplates(result.data);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  // Load dashboard metrics
  const loadDashboardMetrics = async () => {
    try {
      setIsLoadingMetrics(true);
      const result = await getDashboardMetrics();
      if (result.success) {
        setDashboardMetrics(result.data);
      }
    } catch (error) {
      console.error('Error loading dashboard metrics:', error);
    } finally {
      setIsLoadingMetrics(false);
    }
  };

  // Handle uploading a transcript
  const handleUpload = () => {
    setShowUploadModal(true);
    // Reset form states
    setTranscriptText('');
    setSelectedDocId('');
    setSelectedTemplateId('');
  };

  // Load Google Docs list
  const loadGoogleDocs = async () => {
    try {
      setIsLoadingDocs(true);
      const response = await listDocs();
      setGoogleDocs(response.files || response || []); // Handle both response formats
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
      window.alert('Please enter a transcript or select a Google Doc');
      return;
    }

    try {
      setAnalyzingTranscript(true);

      const response = await analyzeTranscript(
        transcriptText.trim() ? transcriptText : null,
        selectedDocId || null,
        selectedTemplateId || null
      );

      if (response.success) {
        // Navigate to analysis page with the results
        navigate('/analysis', { state: { analysisResults: response.results } });
        
        // Refresh the recent analyses list
        await loadRecentAnalyses();
      } else {
        window.alert(`Analysis failed: ${response.message}`);
      }

      setAnalyzingTranscript(false);
      setShowUploadModal(false);
    } catch (error) {
      console.error('Error analyzing transcript:', error);
      setAnalyzingTranscript(false);
      window.alert('Error analyzing transcript. Please try again.');
    }
  };

  // Enhanced viewAnalysis function with full data loading
  const viewAnalysis = async (analysis) => {
    // If we have an analysis ID, fetch the full details
    if (analysis.id || analysis._id) {
      try {
        const analysisId = analysis.id || analysis._id;
        const fullAnalysis = await getAnalysis(analysisId);
        
        // Navigate with the full analysis data
        navigate('/analysis', { 
          state: { 
            analysisResults: fullAnalysis.data || fullAnalysis 
          } 
        });
      } catch (error) {
        console.error('Error loading analysis details:', error);
        // Fallback: navigate with whatever data we have
        navigate('/analysis', { 
          state: { 
            analysisResults: analysis 
          } 
        });
      }
    } else {
      // If no ID, just navigate with the data we have
      navigate('/analysis', { 
        state: { 
          analysisResults: analysis 
        } 
      });
    }
  };

  // Helper functions
  const calculateAverageFitScore = () => {
    if (dashboardMetrics.averageFitScore) {
      return `${Math.round(dashboardMetrics.averageFitScore)}%`;
    }
    
    // Fallback to calculating from recent analyses if metrics not available
    if (!recentAnalyses || recentAnalyses.length === 0) {
      return "0%";
    }

    const sum = recentAnalyses.reduce((total, analysis) => total + (analysis.fitScore || 0), 0);
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

            {/* Template Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Analysis Template (Optional)</label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md"
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
              >
                <option value="">Use Default Template</option>
                {templates.map(template => (
                  <option key={template.id} value={template.id}>
                    {template.name} - {template.industryFocus}
                  </option>
                ))}
              </select>
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

  // Main dashboard render
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded-md flex items-center hover:bg-blue-700"
          onClick={handleUpload}
        >
          <Upload className="h-4 w-4 mr-2" />
          New Analysis
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <DashboardCard
          title="Recent Analyses"
          icon={<FileText className="h-6 w-6 text-blue-600" />}
          value={recentAnalyses.length || "0"}
          description="Analyzed in last 30 days"
          loading={isLoadingMetrics}
        />
        <DashboardCard
          title="Average Fit Score"
          icon={<BarChart2 className="h-6 w-6 text-green-600" />}
          value={calculateAverageFitScore()}
          description="Across all prospects"
          loading={isLoadingMetrics}
        />
        <DashboardCard
          title="Configuration Status"
          icon={<Settings className="h-6 w-6 text-purple-600" />}
          value="Connected"
          description="MongoDB and APIs connected"
          loading={isLoadingMetrics}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Recent Prospects</h2>
            <button
              className="text-blue-600 text-sm hover:underline"
              onClick={() => navigate('/historical')}
            >
              View All
            </button>
          </div>
          <div className="space-y-4">
            {recentAnalyses.length > 0 ? (
              recentAnalyses.map((analysis, index) => (
                <ProspectItem
                  key={analysis.id || index}
                  name={analysis.customerName}
                  industry={analysis.industry}
                  date={analysis.date || new Date(analysis.timestamp).toLocaleDateString()}
                  score={analysis.fitScore}
                  analysis={analysis}
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
          
          {dashboardMetrics.topIndustries && dashboardMetrics.topIndustries.length > 0 ? (
            <>
              <div className="h-64 flex items-center justify-center">
                <PieChart className="h-48 w-48 text-gray-300" />
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {dashboardMetrics.topIndustries.map((item, index) => {
                  const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-red-500'];
                  return (
                    <div key={item.industry} className="flex items-center">
                      <div className={`w-3 h-3 rounded-full ${colors[index % colors.length]} mr-2`}></div>
                      <span className="text-sm">{item.industry} ({item.percentage}%)</span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              <p>No industry data available yet</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Analysis Activity</h2>
          <button
            className="text-blue-600 text-sm"
            onClick={() => navigate('/historical')}
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
                  <tr key={analysis.id || index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {analysis.customerName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {analysis.date || new Date(analysis.timestamp).toLocaleDateString()}
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
                        className="text-blue-600 hover:text-blue-800 font-medium"
                        onClick={() => viewAnalysis(analysis)}
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

      {/* Render upload modal if shown */}
      {showUploadModal && renderUploadModal()}
    </div>
  );
};

// Component for dashboard cards
const DashboardCard = ({ title, icon, value, description, loading }) => (
  <div className="bg-white rounded-lg shadow p-6">
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      {icon}
    </div>
    <div className="mt-2">
      {loading ? (
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-24"></div>
        </div>
      ) : (
        <>
          <div className="text-3xl font-bold">{value}</div>
          <div className="text-sm text-gray-500">{description}</div>
        </>
      )}
    </div>
  </div>
);

// Component for prospect items with loading state
const ProspectItem = ({ name, industry, date, score, analysis }) => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  
  const handleClick = async () => {
    setIsLoading(true);
    
    // If we have an analysis ID, fetch the full details
    if (analysis.id || analysis._id) {
      try {
        const analysisId = analysis.id || analysis._id;
        const fullAnalysis = await getAnalysis(analysisId);
        
        // Navigate with the full analysis data
        navigate('/analysis', { 
          state: { 
            analysisResults: fullAnalysis.data || fullAnalysis 
          } 
        });
      } catch (error) {
        console.error('Error loading analysis details:', error);
        // Fallback: navigate with whatever data we have
        navigate('/analysis', { 
          state: { 
            analysisResults: analysis 
          } 
        });
      }
    } else {
      // If no ID, just navigate with the data we have
      navigate('/analysis', { 
        state: { 
          analysisResults: analysis 
        } 
      });
    }
    
    setIsLoading(false);
  };
  
  return (
    <div 
      className={`flex items-center justify-between py-2 hover:bg-gray-50 rounded-md px-2 cursor-pointer ${
        isLoading ? 'opacity-50' : ''
      }`} 
      onClick={handleClick}
    >
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
};

export default Dashboard;

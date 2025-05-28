// src/pages/Analysis.jsx
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Upload, FileText, Download, Calendar, Users, Building, 
         Target, AlertCircle, CheckCircle, XCircle, TrendingUp, 
         Package, FileCheck, DollarSign } from 'lucide-react';
import Button from '../components/common/Button';
import { analyzeTranscript } from '../api/analysisApi';
import { listDocs, getDocContent } from '../api/docsApi';

const Analysis = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('summary');
  
  // Get analysis results from navigation state
  const [analysisResults, setAnalysisResults] = useState(location.state?.analysisResults || null);
  
  // States for new analysis
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [transcriptText, setTranscriptText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [googleDocs, setGoogleDocs] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState('');
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  
  // Check if we should show upload form (no results)
  useEffect(() => {
    if (!analysisResults) {
      setShowUploadForm(true);
    }
  }, [analysisResults]);
  
  // Load Google Docs list
  const loadGoogleDocs = async () => {
    try {
      setIsLoadingDocs(true);
      const docs = await listDocs();
      setGoogleDocs(docs);
      setIsLoadingDocs(false);
    } catch (error) {
      console.error('Error loading Google Docs:', error);
      setIsLoadingDocs(false);
    }
  };
  
  // Load Google Doc content
  const loadGoogleDocContent = async (docId) => {
    try {
      setIsAnalyzing(true);
      const docContent = await getDocContent(docId);
      setTranscriptText(docContent.plainText);
      setIsAnalyzing(false);
    } catch (error) {
      console.error('Error loading Google Doc content:', error);
      setIsAnalyzing(false);
    }
  };
  
  // Handle document selection
  const handleDocSelect = (e) => {
    const docId = e.target.value;
    setSelectedDocId(docId);
    if (docId) {
      loadGoogleDocContent(docId);
    }
  };
  
  // Run analysis on transcript
  const handleAnalyzeTranscript = async () => {
    if (!transcriptText.trim()) {
      window.alert('Please enter a transcript or select a Google Doc');
      return;
    }
    
    try {
      setIsAnalyzing(true);
      const results = await analyzeTranscript(transcriptText, selectedDocId);
      setAnalysisResults(results.results);
      setShowUploadForm(false);
      setIsAnalyzing(false);
    } catch (error) {
      console.error('Error analyzing transcript:', error);
      setIsAnalyzing(false);
      window.alert('Error analyzing transcript. Please try again.');
    }
  };
  
  // Start new analysis
  const handleNewAnalysis = () => {
    setAnalysisResults(null);
    setShowUploadForm(true);
    setTranscriptText('');
    setSelectedDocId('');
  };
  
  // Export report
  const handleExportReport = () => {
    // TODO: Implement PDF export
    window.alert('Export feature coming soon!');
  };
  
  // Helper functions
  const getFitScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  const getFitScoreLabel = (score) => {
    if (score >= 80) return 'Excellent Fit';
    if (score >= 60) return 'Good Fit';
    if (score >= 40) return 'Fair Fit';
    return 'Poor Fit';
  };
  
  const getMetricColor = (value, metric) => {
    const colors = {
      high: 'bg-green-500',
      medium: 'bg-yellow-500',
      low: 'bg-red-500'
    };
    
    if (metric === 'Risk Level') {
      return value === 'Low' ? colors.high : value === 'Medium' ? colors.medium : colors.low;
    }
    return value === 'Very High' || value === 'Excellent' ? colors.high : 
           value === 'Medium' || value === 'Moderate' ? colors.medium : colors.low;
  };
  
  // If showing upload form
  if (showUploadForm && !analysisResults) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Customer Analysis</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Meeting Transcript</h2>
            
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Paste transcript or select from Google Docs
                </label>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={loadGoogleDocs}
                  disabled={isLoadingDocs}
                >
                  <FileText className="h-4 w-4 mr-1" />
                  {isLoadingDocs ? 'Loading...' : 'Load Google Docs'}
                </Button>
              </div>
              
              {googleDocs.length > 0 && (
                <div className="mb-4">
                  <select
                    className="w-full p-2 border border-gray-300 rounded-md mb-4"
                    value={selectedDocId}
                    onChange={handleDocSelect}
                  >
                    <option value="">-- Select a Google Doc --</option>
                    {googleDocs.map(doc => (
                      <option key={doc.id} value={doc.id}>
                        {doc.name} ({new Date(doc.modifiedTime).toLocaleDateString()})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              <textarea 
                className="w-full p-3 border border-gray-300 rounded-md h-64"
                placeholder="Paste your meeting transcript here..."
                value={transcriptText}
                onChange={(e) => setTranscriptText(e.target.value)}
              ></textarea>
            </div>
            
            <div className="mb-6">
              <div className="relative border-2 border-dashed border-gray-300 rounded-md p-6 flex flex-col items-center justify-center">
                <Upload className="h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-500">Drag and drop transcript file, or <span className="text-blue-600">browse</span></p>
                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" />
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button 
                onClick={handleAnalyzeTranscript}
                disabled={isAnalyzing || !transcriptText.trim()}
              >
                {isAnalyzing ? 'Analyzing...' : 'Analyze Transcript'}
              </Button>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">No Analysis Yet</h3>
              <p>Upload or paste a transcript and click "Analyze Transcript" to see results</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Show analysis results
  if (!analysisResults) return null;
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Customer Fit Analysis</h1>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleExportReport}>
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
              <Button onClick={handleNewAnalysis}>
                <Upload className="h-4 w-4 mr-2" />
                New Analysis
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Customer Info Header */}
      <div className="bg-white px-6 py-8 border-b">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-3xl font-bold mb-2">{analysisResults.customerName}</h2>
            <p className="text-gray-600">{analysisResults.industry}</p>
          </div>
          <div className="text-right">
            <div className="flex items-center justify-end mb-2">
              <div className={`text-5xl font-bold ${getFitScoreColor(analysisResults.fitScore)}`}>
                {analysisResults.fitScore}%
              </div>
            </div>
            <p className={`text-lg font-medium ${getFitScoreColor(analysisResults.fitScore)}`}>
              {getFitScoreLabel(analysisResults.fitScore)}
            </p>
            <p className="text-sm text-gray-500 mt-1">High compatibility score</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-8 mt-6">
          <div>
            <p className="text-sm text-gray-500">Users</p>
            <p className="font-medium">
              {analysisResults.userCount?.total || 0} ({analysisResults.userCount?.backOffice || 0} office, {analysisResults.userCount?.field || 0} field)
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Launch Date</p>
            <p className="font-medium">{analysisResults.timeline || 'Not specified'}</p>
          </div>
        </div>
      </div>
      
      {/* Key Metrics */}
      <div className="bg-white px-6 py-6 border-b">
        <h3 className="text-lg font-semibold mb-4">Key Metrics</h3>
        <div className="space-y-3">
          {[
            { label: 'Success Probability', value: 'Very High' },
            { label: 'Implementation Time', value: 'Medium' },
            { label: 'Feature Match', value: 'Excellent' },
            { label: 'Integration Complexity', value: 'Moderate' },
            { label: 'Risk Level', value: 'Low' }
          ].map((metric) => (
            <div key={metric.label} className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">{metric.label}</span>
              <div className="flex items-center gap-2">
                <div className="w-48 bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${getMetricColor(metric.value, metric.label)}`}
                    style={{ 
                      width: metric.value === 'Very High' || metric.value === 'Excellent' ? '90%' : 
                             metric.value === 'Medium' || metric.value === 'Moderate' ? '60%' : 
                             metric.value === 'Low' ? '20%' : '40%' 
                    }}
                  />
                </div>
                <span className={`text-sm font-medium ${
                  metric.value === 'Very High' || metric.value === 'Excellent' || (metric.label === 'Risk Level' && metric.value === 'Low') 
                    ? 'text-green-600' 
                    : metric.value === 'Medium' || metric.value === 'Moderate' 
                    ? 'text-yellow-600' 
                    : 'text-red-600'
                }`}>
                  {metric.value}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Current Systems */}
      {analysisResults.currentSystems && analysisResults.currentSystems.length > 0 && (
        <div className="bg-white px-6 py-6 border-b">
          <h3 className="text-lg font-semibold mb-4">Current Systems</h3>
          <div className="space-y-3">
            {analysisResults.currentSystems.map((system, index) => (
              <div key={index} className="flex items-start gap-3">
                {system.replacing ? (
                  <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                )}
                <div>
                  <p className="font-medium">{system.name}</p>
                  <p className="text-sm text-gray-600">{system.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="px-6">
          <nav className="flex space-x-8">
            {['Summary', 'Strengths & Challenges', 'Similar Customers', 'Requirements', 'Recommendations'].map((tab) => (
              <button
                key={tab}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.toLowerCase().replace(/\s&\s/g, '-').replace(/\s/g, '-')
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab(tab.toLowerCase().replace(/\s&\s/g, '-').replace(/\s/g, '-'))}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>
      </div>
      
      {/* Tab Content */}
      <div className="px-6 py-6">
        <div className="bg-white rounded-lg shadow p-6">
          {activeTab === 'summary' && (
            <div className="prose max-w-none">
              <p className="text-gray-700 leading-relaxed">
                {analysisResults.customerName} is a {analysisResults.industry} company with {analysisResults.userCount?.total || 0} users 
                ({analysisResults.userCount?.backOffice || 0} office, {analysisResults.userCount?.field || 0} field) looking to implement 
                Zuper by {analysisResults.timeline || 'their target date'}. They currently use{' '}
                {analysisResults.currentSystems?.map(s => s.name).join(', ') || 'various systems'} but want additional features and 
                processes beyond their current system without having to develop them in-house.
              </p>
              
              <h3 className="text-lg font-semibold mt-6 mb-3">Integration Requirements</h3>
              <p className="text-gray-700">
                They need Zuper to integrate with {analysisResults.requirements?.integrations?.join(', ') || 'their existing systems'} 
                for product details, customer information, invoicing, inventory, and warranty claim submission.
              </p>
              
              <h3 className="text-lg font-semibold mt-6 mb-3">Service Types</h3>
              <div className="flex flex-wrap gap-2">
                {(analysisResults.services || []).map((service, index) => (
                  <span key={index} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                    {service}
                  </span>
                ))}
              </div>
              
              <h3 className="text-lg font-semibold mt-6 mb-3">Key Requirements</h3>
              <ul className="list-disc pl-5 space-y-2 text-gray-700">
                {(analysisResults.requirements?.keyFeatures || []).map((req, index) => (
                  <li key={index}>{req}</li>
                ))}
              </ul>
              
              <h3 className="text-lg font-semibold mt-6 mb-3">Analysis Conclusion</h3>
              <p className="text-gray-700">
                {analysisResults.customerName} represents an excellent fit for Zuper's service management platform. 
                Their requirements align well with Zuper's core strengths in managing field service operations, 
                asset tracking, checklist implementation, and customer communication. While there is moderate 
                integration complexity, the overall compatibility score is very high at {analysisResults.fitScore}%.
              </p>
            </div>
          )}
          
          {activeTab === 'strengths-challenges' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-4 text-green-600">Strengths</h3>
                <div className="space-y-3">
                  {(analysisResults.strengths || []).map((strength, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">{strength.title}</p>
                        <p className="text-sm text-gray-600">{strength.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-4 text-red-600">Challenges</h3>
                <div className="space-y-3">
                  {(analysisResults.challenges || []).map((challenge, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">{challenge.title}</p>
                        <p className="text-sm text-gray-600">{challenge.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'similar-customers' && (
            <div className="space-y-4">
              {(analysisResults.similarCustomers || []).map((customer, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold">{customer.name}</h4>
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
                      {customer.matchPercentage}% Match
                    </span>
                  </div>
                  <p className="text-gray-600">{customer.description}</p>
                </div>
              ))}
            </div>
          )}
          
          {activeTab === 'requirements' && (
            <div className="space-y-6">
              {analysisResults.requirements?.keyFeatures && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Key Features</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {analysisResults.requirements.keyFeatures.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {analysisResults.requirements?.integrations && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Integrations</h3>
                  <div className="flex flex-wrap gap-2">
                    {analysisResults.requirements.integrations.map((integration, index) => (
                      <span key={index} className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm">
                        {integration}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {analysisResults.requirements?.painPoints && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Pain Points</h3>
                  <ul className="list-disc pl-5 space-y-2">
                    {analysisResults.requirements.painPoints.map((point, index) => (
                      <li key={index} className="text-gray-700">{point}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'recommendations' && (
            <div className="space-y-6">
              {analysisResults.recommendations?.implementationApproach && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Implementation Approach</h3>
                  <ol className="list-decimal pl-5 space-y-2">
                    {analysisResults.recommendations.implementationApproach.map((item, index) => (
                      <li key={index} className="text-gray-700">{item}</li>
                    ))}
                  </ol>
                </div>
              )}
              
              {analysisResults.recommendations?.integrationStrategy && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Integration Strategy</h3>
                  <ul className="list-disc pl-5 space-y-2">
                    {analysisResults.recommendations.integrationStrategy.map((item, index) => (
                      <li key={index} className="text-gray-700">{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {analysisResults.recommendations?.trainingRecommendations && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Training Recommendations</h3>
                  <ul className="list-disc pl-5 space-y-2">
                    {analysisResults.recommendations.trainingRecommendations.map((item, index) => (
                      <li key={index} className="text-gray-700">{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analysis;

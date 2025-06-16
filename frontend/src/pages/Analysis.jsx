// src/pages/Analysis.jsx
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Download, Upload, Clock, ArrowLeft, AlertCircle } from 'lucide-react';
import Button from '../components/common/Button';
import { getAnalysisHistory, getAnalysis } from '../api/analysisApi';
import ComprehensiveAnalysisDisplay from '../components/ComprehensiveAnalysisDisplay';
import ChatWidget from '../components/ChatWidget';

const Analysis = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  
  // Get analysis results from navigation state or load most recent
  const [analysisResults, setAnalysisResults] = useState(location.state?.analysisResults || null);
  
  // Load most recent analysis if none provided via navigation
  useEffect(() => {
    const loadAnalysis = async () => {
      // If we already have results from navigation, don't load
      if (analysisResults) {
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        const history = await getAnalysisHistory(1);
        
        if (history.data && history.data.length > 0) {
          const mostRecent = history.data[0];
          
          // If we have an ID, fetch full details
          if (mostRecent.id || mostRecent._id) {
            const analysisId = mostRecent.id || mostRecent._id;
            const fullAnalysis = await getAnalysis(analysisId);
            setAnalysisResults(fullAnalysis.data || fullAnalysis);
          } else {
            setAnalysisResults(mostRecent);
          }
        }
      } catch (error) {
        console.error('Error loading analysis:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadAnalysis();
  }, []);
  
  // Navigate to dashboard to start new analysis
  const handleNewAnalysis = () => {
    navigate('/dashboard?action=new-analysis');
  };
  
  // Export report
  const handleExportReport = () => {
    // TODO: Implement PDF export
    window.alert('Export feature coming soon!');
  };
  
  // Navigate back to dashboard
  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading analysis...</p>
        </div>
      </div>
    );
  }
  
  // No analysis found state
  if (!analysisResults) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center bg-white rounded-lg shadow-lg p-8 max-w-md">
          <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">No Analysis Found</h2>
          <p className="text-gray-600 mb-6">
            You haven't created any analyses yet. Start by analyzing a meeting transcript.
          </p>
          <Button onClick={handleNewAnalysis}>
            <Upload className="h-4 w-4 mr-2" />
            Create New Analysis
          </Button>
        </div>
      </div>
    );
  }
  
  // Main analysis display
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <button
                onClick={handleBackToDashboard}
                className="mr-4 p-2 text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h1 className="text-2xl font-bold">Customer Fit Analysis</h1>
            </div>
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
      
      {/* Analysis timestamp if available */}
      {(analysisResults.timestamp || analysisResults.date) && (
        <div className="bg-gray-50 px-6 py-2 border-b">
          <div className="flex items-center text-sm text-gray-600">
            <Clock className="h-4 w-4 mr-1" />
            <span>
              Analysis created on {new Date(analysisResults.timestamp || analysisResults.date).toLocaleString()}
            </span>
          </div>
        </div>
      )}
      
      {/* Main Content Area */}
      <div className="container mx-auto px-6 py-6">
        {/* Use the ComprehensiveAnalysisDisplay component */}
        <ComprehensiveAnalysisDisplay analysisResults={analysisResults} />
        <ChatWidget analysisResults={analysisResults} />
      </div>
    </div>
  );
};

export default Analysis;

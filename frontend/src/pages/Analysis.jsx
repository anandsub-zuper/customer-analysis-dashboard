// src/pages/Analysis.jsx
import React, { useState } from 'react';
import { Upload, FileText } from 'lucide-react';
import Button from '../components/common/Button';
import { analyzeTranscript } from '../api/analysisApi';
import { listDocs, getDocContent } from '../api/docsApi';

const Analysis = () => {
  const [transcriptText, setTranscriptText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [googleDocs, setGoogleDocs] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState('');
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  
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
      setIsAnalyzing(false);
    } catch (error) {
      console.error('Error analyzing transcript:', error);
      setIsAnalyzing(false);
      window.alert('Error analyzing transcript. Please try again.');
    }
  };
  
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
        
        {analysisResults ? (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Analysis Results</h2>
              <div className="flex items-center space-x-2">
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-lg font-bold text-green-600">{analysisResults.fitScore}%</span>
                </div>
                <span className="text-sm font-medium text-green-600">Excellent Fit</span>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Customer Details</h3>
                <div className="bg-gray-50 p-3 rounded-md">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Company</p>
                      <p className="font-medium">{analysisResults.customerName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Industry</p>
                      <p className="font-medium">{analysisResults.industry}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Users</p>
                      <p className="font-medium">{analysisResults.userCount.total}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">User Distribution</p>
                      <p className="font-medium">
                        {analysisResults.userCount.backOffice} office / {analysisResults.userCount.field} field
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Requirements</h3>
                <div className="bg-gray-50 p-3 rounded-md">
                  <div className="mb-3">
                    <p className="text-sm text-gray-500 mb-1">Services</p>
                    <div className="flex flex-wrap gap-2">
                      {analysisResults.requirements.services.map((service, index) => (
                        <span key={index} className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded">
                          {service}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <p className="text-sm text-gray-500 mb-1">Integrations</p>
                    <div className="flex flex-wrap gap-2">
                      {analysisResults.requirements.integrations.map((integration, index) => (
                        <span key={index} className="bg-purple-100 text-purple-800 text-xs px-2 py-0.5 rounded">
                          {integration}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Key Features</p>
                    <div className="flex flex-wrap gap-2">
                      {analysisResults.requirements.keyFeatures.map((feature, index) => (
                        <span key={index} className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded">
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Additional analysis sections would go here */}
            </div>
            
            <div className="mt-6">
              <Button variant="outline" fullWidth>
                View Full Analysis
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-6 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">No Analysis Yet</h3>
              <p>Upload or paste a transcript and click "Analyze Transcript" to see results</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Analysis;

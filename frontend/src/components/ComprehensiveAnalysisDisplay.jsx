import React, { useState } from 'react';
import { 
  CheckCircle, AlertTriangle, XCircle, Users, Building, 
  Calendar, DollarSign, FileText, Settings, MessageSquare,
  Package, Link, Briefcase, Clock, TrendingUp, Award,
  Activity, Zap, AlertCircle, Check, X
} from 'lucide-react';

const ComprehensiveAnalysisDisplay = ({ analysisResults }) => {
  const [activeTab, setActiveTab] = useState('summary');

   // DEBUG: Log the entire analysisResults object
  console.log('=== ANALYSIS RESULTS DEBUG ===');
  console.log('Full analysisResults:', analysisResults);
  console.log('Has strengths?', analysisResults?.strengths?.length > 0);
  console.log('Strengths:', analysisResults?.strengths);
  console.log('Has challenges?', analysisResults?.challenges?.length > 0);
  console.log('Challenges:', analysisResults?.challenges);
  console.log('Has currentState?', !!analysisResults?.currentState);
  console.log('CurrentState:', analysisResults?.currentState);
  console.log('Has similarCustomers?', analysisResults?.similarCustomers?.length > 0);
  console.log('Similar Customers:', analysisResults?.similarCustomers);
  console.log('Has recommendations?', !!analysisResults?.recommendations);
  console.log('Recommendations:', analysisResults?.recommendations);
  console.log('=== END DEBUG ===');
  
  if (!analysisResults) return null;

  const tabs = [
    { id: 'summary', label: 'Summary' },
    { id: 'strengths', label: 'Strengths & Challenges' },
    { id: 'similar', label: 'Similar Customers' },
    { id: 'requirements', label: 'Requirements' },
    { id: 'recommendations', label: 'Recommendations' }
  ];

  // Determine fit level
  const getFitLevel = (score) => {
    if (score >= 80) return { level: 'Excellent Fit', color: 'green', textColor: 'text-green-700', bgColor: 'bg-green-50' };
    if (score >= 60) return { level: 'Good Fit', color: 'blue', textColor: 'text-blue-700', bgColor: 'bg-blue-50' };
    if (score >= 40) return { level: 'Fair Fit', color: 'yellow', textColor: 'text-yellow-700', bgColor: 'bg-yellow-50' };
    return { level: 'Poor Fit', color: 'red', textColor: 'text-red-700', bgColor: 'bg-red-50' };
  };

  const fitLevel = getFitLevel(analysisResults.fitScore);

  // Calculate key metrics for the summary card
  const getMetrics = () => {
    const score = analysisResults.fitScore || 0;
    const integrationCount = analysisResults.requirements?.integrations?.length || 0;
    const fieldRatio = (analysisResults.userCount?.field || 0) / (analysisResults.userCount?.total || 1);
    
    return {
      successProbability: score >= 60 ? 'high' : score >= 40 ? 'medium' : 'low',
      implementationTime: integrationCount > 3 ? 'high' : 'medium',
      featureMatch: score >= 60 ? 'excellent' : score >= 40 ? 'good' : 'poor',
      integrationComplexity: integrationCount > 3 ? 'high' : 'moderate',
      riskLevel: score < 40 ? 'high' : score < 60 ? 'medium' : 'low'
    };
  };

  const metrics = getMetrics();

  return (
    <div className="space-y-6">
      {/* Summary Card - Before Tabs */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-start mb-6">
          {/* Left side - Company Info */}
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{analysisResults.customerName}</h1>
                <p className="text-lg text-gray-600 mt-1">{analysisResults.industry}</p>
              </div>
              <div className="text-right">
                <div className={`inline-flex items-center px-4 py-2 rounded-lg ${fitLevel.bgColor}`}>
                  <span className={`text-4xl font-bold ${fitLevel.textColor} mr-3`}>
                    {analysisResults.fitScore}%
                  </span>
                  <div>
                    <p className={`text-sm font-medium ${fitLevel.textColor}`}>{fitLevel.level}</p>
                    {analysisResults.fitScore < 30 && (
                      <p className="text-xs text-red-600">High compatibility issues</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-6 mt-6">
              <div>
                <p className="text-sm text-gray-500">Users</p>
                <p className="text-lg font-semibold">
                  {analysisResults.userCount?.total || 0} total
                  ({analysisResults.userCount?.backOffice || 0} office, {analysisResults.userCount?.field || 0} field)
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Launch Date</p>
                <p className="text-lg font-semibold">
                  {analysisResults.timeline?.desiredGoLive || 'TBD'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-4">Key Metrics</h3>
          <div className="space-y-3">
            <MetricBar 
              label="Success Probability" 
              level={metrics.successProbability}
              value={analysisResults.fitScore}
            />
            <MetricBar 
              label="Implementation Time" 
              level={metrics.implementationTime}
              value={metrics.implementationTime === 'high' ? 30 : 70}
              reverse={true}
            />
            <MetricBar 
              label="Feature Match" 
              level={metrics.featureMatch}
              value={analysisResults.fitScore}
            />
            <MetricBar 
              label="Integration Complexity" 
              level={metrics.integrationComplexity}
              value={metrics.integrationComplexity === 'high' ? 80 : 40}
              reverse={true}
            />
            <MetricBar 
              label="Risk Level" 
              level={metrics.riskLevel}
              value={metrics.riskLevel === 'high' ? 90 : metrics.riskLevel === 'medium' ? 50 : 20}
              reverse={true}
            />
          </div>
        </div>

        {/* Current Systems */}
        {analysisResults.currentState?.currentSystems?.length > 0 && (
          <div className="border-t pt-6 mt-6">
            <h3 className="text-lg font-semibold mb-4">Current Systems</h3>
            {analysisResults.currentState.currentSystems.map((system, idx) => (
              <div key={idx} className="mb-4">
                <div className="flex items-start">
                  <X className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium">{system.name}</p>
                    <p className="text-sm text-gray-600">{system.usage}</p>
                  </div>
                </div>
                {system.replacementReasons?.length > 0 && (
                  <div className="mt-2 ml-7 bg-gray-50 rounded p-3">
                    <p className="text-sm font-medium text-gray-700 mb-1">Replacement Reasons</p>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {system.replacementReasons.map((reason, i) => (
                        <li key={i}>• {reason}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Tabbed Content */}
      <div className="bg-white rounded-lg shadow-lg">
        {/* Tabs */}
        <div className="border-b">
          <nav className="flex -mb-px">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'summary' && <SummaryTab data={analysisResults} />}
          {activeTab === 'strengths' && <StrengthsChallengesTab data={analysisResults} />}
          {activeTab === 'similar' && <SimilarCustomersTab data={analysisResults} />}
          {activeTab === 'requirements' && <RequirementsTab data={analysisResults} />}
          {activeTab === 'recommendations' && <RecommendationsTab data={analysisResults} />}
        </div>
      </div>
    </div>
  );
};

// Metric Bar Component
const MetricBar = ({ label, level, value, reverse = false, explanation, factors }) => {
  const [showDetails, setShowDetails] = useState(false);
  
  const getColor = () => {
    if (reverse) {
      if (level === 'high') return 'bg-red-500';
      if (level === 'medium' || level === 'moderate') return 'bg-yellow-500';
      return 'bg-green-500';
    } else {
      if (level === 'high' || level === 'excellent') return 'bg-green-500';
      if (level === 'medium' || level === 'good' || level === 'moderate') return 'bg-yellow-500';
      return 'bg-red-500';
    }
  };

  const getLabelColor = () => {
    if (reverse) {
      if (level === 'high') return 'text-red-600';
      if (level === 'medium' || level === 'moderate') return 'text-yellow-600';
      return 'text-green-600';
    } else {
      if (level === 'high' || level === 'excellent') return 'text-green-600';
      if (level === 'medium' || level === 'good' || level === 'moderate') return 'text-yellow-600';
      return 'text-red-600';
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center">
        <div className="w-40 text-sm font-medium text-gray-700">{label}</div>
        <div className="flex-1 mx-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${getColor()}`} 
              style={{ width: `${value}%` }}
            />
          </div>
        </div>
        <div className={`text-sm font-medium ${getLabelColor()} capitalize w-20 text-right`}>
          {level}
        </div>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="ml-2 text-gray-400 hover:text-gray-600"
        >
          <AlertCircle className="h-4 w-4" />
        </button>
      </div>
      
      {showDetails && (
        <div className="ml-40 bg-gray-50 rounded p-3 text-sm">
          <p className="font-medium mb-1">Why {level}?</p>
          <p className="text-gray-600 mb-2">{explanation}</p>
          {factors && factors.length > 0 && (
            <>
              <p className="font-medium mb-1">Key Factors:</p>
              <ul className="text-gray-600 space-y-1">
                {factors.map((factor, idx) => (
                  <li key={idx} className="flex items-start">
                    <span className={`mr-2 ${factor.positive ? 'text-green-600' : 'text-red-600'}`}>
                      {factor.positive ? '+' : '-'}
                    </span>
                    {factor.text}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
};

const ActionableInsights = ({ analysisResults, metrics }) => {
  const criticalActions = [];
  
  // Based on metrics, generate specific actions
  if (metrics.successProbability.level === 'low') {
    criticalActions.push({
      priority: 'High',
      action: 'Schedule qualification call to validate field service needs',
      reason: 'Low fit score indicates potential mismatch',
      owner: 'Sales Team'
    });
  }
  
  if (metrics.implementationTime.level === 'high') {
    criticalActions.push({
      priority: 'High',
      action: 'Involve integration specialist early in sales process',
      reason: `${analysisResults.requirements?.integrations?.length} complex integrations identified`,
      owner: 'Technical Team'
    });
  }
  
  if (analysisResults.industry && !['hvac', 'plumbing', 'electrical', 'roofing'].some(i => 
    analysisResults.industry.toLowerCase().includes(i))) {
    criticalActions.push({
      priority: 'Medium',
      action: 'Verify industry-specific requirements are supportable',
      reason: 'Customer in non-core vertical',
      owner: 'Product Team'
    });
  }
  
  return (
    <div className="bg-blue-50 rounded-lg p-6 mt-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <Zap className="h-5 w-5 mr-2 text-blue-600" />
        Actionable Next Steps
      </h3>
      <div className="space-y-3">
        {criticalActions.map((action, idx) => (
          <div key={idx} className="bg-white rounded p-4 border border-blue-200">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-medium">{action.action}</h4>
              <span className={`text-xs px-2 py-1 rounded ${
                action.priority === 'High' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
              }`}>
                {action.priority} Priority
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-1">Reason: {action.reason}</p>
            <p className="text-sm font-medium">Owner: {action.owner}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// Summary Tab Component - Show actual data only
const SummaryTab = ({ data }) => {
  console.log('SummaryTab data:', data);
  
  // Use cleaned summary data
  const overview = data.summary?.overview || '';
  const keyRequirements = data.requirements?.keyFeatures || [];
  const mainPainPoints = data.summary?.mainPainPoints || [];

  if (!overview && keyRequirements.length === 0 && mainPainPoints.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No summary data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {overview && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Overview</h3>
          <p className="text-gray-700">{overview}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="font-medium mb-3 flex items-center">
            <Briefcase className="h-5 w-5 mr-2 text-blue-600" />
            Current State
          </h4>
          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            {/* Use cleaned summary instead of raw currentState */}
            {data.currentState?.summary && (
              <div>
                <p className="text-gray-700">{data.currentState.summary}</p>
              </div>
            )}
            
            {data.currentState?.currentSystems?.map((system, idx) => (
              <div key={idx} className="border-l-4 border-orange-400 pl-3">
                <p className="font-medium">{system.name}</p>
                <p className="text-sm text-gray-600">{system.usage}</p>
                {system.painPoints?.length > 0 && (
                  <ul className="text-sm text-red-600 mt-1">
                    {system.painPoints.map((pain, i) => (
                      <li key={i}>• {pain}</li>
                    ))}
                  </ul>
                )}
              </div>
            )) || (
              <p className="text-gray-600">No current systems information available</p>
            )}
          </div>
        </div>

        <div>
          <h4 className="font-medium mb-3 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
            Key Requirements
          </h4>
          <div className="bg-gray-50 p-4 rounded-lg">
            {keyRequirements.length > 0 ? (
              <ul className="space-y-2">
                {keyRequirements.map((req, idx) => (
                  <li key={idx} className="flex items-start">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
                    <span className="text-sm">{req}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-600 text-sm">No specific requirements listed</p>
            )}
          </div>
        </div>
      </div>

      {mainPainPoints.length > 0 && (
        <div>
          <h4 className="font-medium mb-3">Main Pain Points</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {mainPainPoints.map((pain, idx) => (
              <div key={idx} className="flex items-start bg-red-50 p-3 rounded">
                <AlertTriangle className="h-4 w-4 text-red-500 mr-2 mt-0.5" />
                <span className="text-sm">{pain}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Strengths & Challenges Tab - Show actual data only
const StrengthsChallengesTab = ({ data }) => {
  const hasContent = (data.strengths?.length > 0) || (data.challenges?.length > 0);
  
  if (!hasContent) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No strengths or challenges analysis available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {data.strengths?.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Key Strengths</h3>
          <div className="space-y-4">
            {data.strengths.map((strength, idx) => (
              <div key={idx} className="border-l-4 border-green-500 pl-4">
                <h4 className="font-medium flex items-center mb-1">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  {strength.title}
                </h4>
                <p className="text-gray-700 mb-2">{strength.description}</p>
                <p className="text-sm text-gray-600">
                  <strong>Impact:</strong> {strength.impact}
                </p>
                {strength.relatedFeatures?.length > 0 && (
                  <div className="mt-2">
                    <span className="text-sm font-medium">Related Features: </span>
                    <span className="text-sm text-blue-600">
                      {strength.relatedFeatures.join(', ')}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {data.challenges?.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Potential Challenges</h3>
          <div className="space-y-4">
            {data.challenges.map((challenge, idx) => (
              <div key={idx} className={`border-l-4 pl-4 ${
                challenge.severity === 'Critical' ? 'border-red-500' :
                challenge.severity === 'Major' ? 'border-yellow-500' :
                'border-gray-400'
              }`}>
                <h4 className="font-medium flex items-center mb-1">
                  <AlertTriangle className={`h-5 w-5 mr-2 ${
                    challenge.severity === 'Critical' ? 'text-red-600' :
                    challenge.severity === 'Major' ? 'text-yellow-600' :
                    'text-gray-600'
                  }`} />
                  {challenge.title}
                  <span className={`ml-2 text-xs px-2 py-1 rounded ${
                    challenge.severity === 'Critical' ? 'bg-red-100 text-red-700' :
                    challenge.severity === 'Major' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {challenge.severity}
                  </span>
                </h4>
                <p className="text-gray-700 mb-2">{challenge.description}</p>
                <p className="text-sm text-gray-600">
                  <strong>Mitigation:</strong> {challenge.mitigation}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Similar Customers Tab
const SimilarCustomersTab = ({ data }) => {
  const hasSectionedData = data.similarCustomers && 
    Array.isArray(data.similarCustomers) && 
    data.similarCustomers.length > 0 && 
    data.similarCustomers[0].sectionTitle;
  if (!data.similarCustomers || data.similarCustomers.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No similar customer data available</p>
      </div>
    );
  }

  if (hasSectionedData) {
    return (
      <div className="space-y-8">
        <h3 className="text-lg font-semibold">Similar Customer Analysis</h3>
        
        {data.similarCustomers.map((section, sectionIdx) => (
          <div key={sectionIdx} className="space-y-4">
            {/* Section Header */}
            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="text-lg font-medium text-blue-800">{section.sectionTitle}</h4>
              <p className="text-sm text-gray-600">{section.sectionDescription}</p>
            </div>
            
            {/* Section Customers */}
            <div className="grid gap-4 ml-6">
              {section.customers.map((customer, idx) => (
                <SimilarCustomerCard key={idx} customer={customer} />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Similar Customer Implementations</h3>
      {data.similarCustomers.map((customer, idx) => (
        <div key={idx} className="border rounded-lg p-5 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h4 className="font-semibold text-lg">{customer.name}</h4>
              <p className="text-gray-600">{customer.industry}</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {customer.matchPercentage}%
              </div>
              <p className="text-xs text-gray-500">Match Score</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-sm text-gray-500">Implementation</p>
              <p className="font-medium">{customer.implementation?.duration}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-sm text-gray-500">Health Status</p>
              <p className={`font-medium ${
                customer.implementation?.health === 'Excellent' ? 'text-green-600' :
                customer.implementation?.health === 'Good' ? 'text-blue-600' :
                customer.implementation?.health === 'Average' ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {customer.implementation?.health}
              </p>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-sm text-gray-500">ARR</p>
              <p className="font-medium">{customer.implementation?.arr}</p>
            </div>
          </div>

          <div className="mb-3">
            <p className="text-sm font-medium mb-1">Why Similar:</p>
            <ul className="text-sm text-gray-600">
              {customer.matchReasons?.map((reason, i) => (
                <li key={i}>• {reason}</li>
              ))}
            </ul>
          </div>

          {customer.keyLearnings?.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-1">Key Learnings:</p>
              <div className="flex flex-wrap gap-2">
                {customer.keyLearnings.map((learning, i) => (
                  <span key={i} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                    {learning}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const SimilarCustomerCard = ({ customer }) => (
  <div className="border rounded-lg p-5 hover:shadow-md transition-shadow bg-gray-50">
    <div className="flex justify-between items-start mb-3">
      <div>
        <h5 className="font-semibold text-lg">{customer.name}</h5>
        <p className="text-gray-600">{customer.industry}</p>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-blue-600">
          {customer.matchPercentage}%
        </div>
        <p className="text-xs text-gray-500">Match Score</p>
      </div>
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
      <div className="bg-white p-3 rounded border">
        <p className="text-sm text-gray-500">Implementation</p>
        <p className="font-medium">{customer.implementation?.duration}</p>
      </div>
      <div className="bg-white p-3 rounded border">
        <p className="text-sm text-gray-500">Health Status</p>
        <p className={`font-medium ${
          customer.implementation?.health === 'Excellent' ? 'text-green-600' :
          customer.implementation?.health === 'Good' ? 'text-blue-600' :
          customer.implementation?.health === 'Average' ? 'text-yellow-600' :
          'text-red-600'
        }`}>
          {customer.implementation?.health}
        </p>
      </div>
      <div className="bg-white p-3 rounded border">
        <p className="text-sm text-gray-500">ARR</p>
        <p className="font-medium">{customer.implementation?.arr}</p>
      </div>
    </div>

    <div className="mb-3">
      <p className="text-sm font-medium mb-1">Why Similar:</p>
      <ul className="text-sm text-gray-600">
        {customer.matchReasons?.map((reason, i) => (
          <li key={i}>• {reason}</li>
        ))}
      </ul>
    </div>

    {customer.keyLearnings?.length > 0 && (
      <div>
        <p className="text-sm font-medium mb-1">Key Learnings:</p>
        <div className="flex flex-wrap gap-2">
          {customer.keyLearnings.map((learning, i) => (
            <span key={i} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
              {learning}
            </span>
          ))}
        </div>
      </div>
    )}
  </div>
);


// Requirements Tab
const RequirementsTab = ({ data }) => {
  const isPoorFit = data.fitScore < 30;
  const hasRequirements = (data.services?.types?.length > 0) || 
                         (data.requirements?.keyFeatures?.length > 0) || 
                         (data.requirements?.integrations?.length > 0);

  if (!hasRequirements) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No requirements data available</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {isPoorFit && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Critical Fit Issues</h3>
              <p className="text-sm text-red-700 mt-1">
                This prospect's requirements may not align well with field service management capabilities.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {data.services?.types?.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Service Types</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {data.services.types.map((service, idx) => (
              <div key={idx} className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                <span>{service}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.requirements?.keyFeatures?.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Key Requirements</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.requirements.keyFeatures.map((req, idx) => (
              <div key={idx} className="flex items-start bg-blue-50 p-3 rounded">
                <Check className="h-4 w-4 text-blue-600 mr-2 mt-0.5" />
                <span className="text-sm">{req}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.requirements?.integrations?.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Integration Requirements</h3>
          <div className="space-y-3">
            {data.requirements.integrations.map((integration, idx) => (
              <div key={idx} className="border rounded p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">{integration.system}</h4>
                    <p className="text-sm text-gray-600">{integration.purpose}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${
                    integration.priority === 'Critical' ? 'bg-red-100 text-red-700' :
                    integration.priority === 'Important' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {integration.priority}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Recommendations Tab
const RecommendationsTab = ({ data }) => {
  const hasRecommendations = data.recommendations && (
    data.recommendations.fitScoreRationale ||
    data.recommendations.salesStrategy ||
    data.recommendations.implementationApproach?.strategy ||
    data.recommendations.pricingGuidance
  );
    
  if (!hasRecommendations) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No specific recommendations available</p>
      </div>
    );
  }
  
  const { recommendations } = data;
  const salesStrategy = recommendations.salesStrategy || {};
  const fitRationale = recommendations.fitScoreRationale || {};
  
  // Determine recommendation color
  const getRecommendationColor = (recommendation) => {
    switch (recommendation) {
      case 'PURSUE': return 'bg-green-100 text-green-800 border-green-300';
      case 'CONDITIONAL': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'DECLINE': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Fit Score Rationale */}
      {fitRationale.summary && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-3 flex items-center">
            <Award className="h-5 w-5 mr-2 text-blue-600" />
            Fit Score Analysis: {data.fitScore}%
          </h3>
          <p className="text-gray-700 mb-4">{fitRationale.summary}</p>
          
          <div className="grid md:grid-cols-2 gap-4">
            {fitRationale.positiveFactors?.length > 0 && (
              <div>
                <h4 className="font-medium text-green-700 mb-2">Positive Factors:</h4>
                <ul className="space-y-1">
                  {fitRationale.positiveFactors.map((factor, idx) => (
                    <li key={idx} className="flex items-start">
                      <Check className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{factor}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {fitRationale.negativeFactors?.length > 0 && (
              <div>
                <h4 className="font-medium text-red-700 mb-2">Challenges:</h4>
                <ul className="space-y-1">
                  {fitRationale.negativeFactors.map((factor, idx) => (
                    <li key={idx} className="flex items-start">
                      <X className="h-4 w-4 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{factor}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          
          {fitRationale.overallAssessment && (
            <p className="mt-4 font-medium text-gray-800">{fitRationale.overallAssessment}</p>
          )}
        </div>
      )}

      {/* Sales Strategy */}
      {salesStrategy.recommendation && (
        <div className={`border-2 rounded-lg p-6 ${getRecommendationColor(salesStrategy.recommendation)}`}>
          <h3 className="text-lg font-semibold mb-3 flex items-center">
            <Briefcase className="h-5 w-5 mr-2" />
            Sales Recommendation: {salesStrategy.recommendation}
          </h3>
          
          {salesStrategy.approach && (
            <div className="mb-4">
              <h4 className="font-medium mb-2">Recommended Approach:</h4>
              <p className="text-sm">{salesStrategy.approach}</p>
            </div>
          )}
          
          {salesStrategy.reasoning && (
            <div className="mb-4">
              <h4 className="font-medium mb-2">Reasoning:</h4>
              <p className="text-sm">{salesStrategy.reasoning}</p>
            </div>
          )}
          
          <div className="grid md:grid-cols-2 gap-4">
            {salesStrategy.talkingPoints?.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Key Talking Points:</h4>
                <ul className="space-y-1">
                  {salesStrategy.talkingPoints.map((point, idx) => (
                    <li key={idx} className="text-sm flex items-start">
                      <span className="mr-2">•</span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {salesStrategy.risks?.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Risks to Consider:</h4>
                <ul className="space-y-1">
                  {salesStrategy.risks.map((risk, idx) => (
                    <li key={idx} className="text-sm flex items-start">
                      <AlertTriangle className="h-3 w-3 mr-2 mt-0.5 flex-shrink-0" />
                      {risk}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          
          {salesStrategy.nextSteps?.length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium mb-2">Next Steps:</h4>
              <ol className="space-y-1">
                {salesStrategy.nextSteps.map((step, idx) => (
                  <li key={idx} className="text-sm flex items-start">
                    <span className="font-medium mr-2">{idx + 1}.</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      {/* Alternative Options */}
      {recommendations.alternativeOptions && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium mb-3">Alternative Approaches:</h4>
          {recommendations.alternativeOptions.ifPursuing && (
            <div className="mb-3">
              <p className="text-sm font-medium text-gray-700">If Pursuing:</p>
              <p className="text-sm text-gray-600">{recommendations.alternativeOptions.ifPursuing}</p>
            </div>
          )}
          {recommendations.alternativeOptions.ifDeclining && (
            <div className="mb-3">
              <p className="text-sm font-medium text-gray-700">If Declining:</p>
              <p className="text-sm text-gray-600">{recommendations.alternativeOptions.ifDeclining}</p>
            </div>
          )}
          {recommendations.alternativeOptions.partnerReferral && (
            <div>
              <p className="text-sm font-medium text-gray-700">Partner Referral Option:</p>
              <p className="text-sm text-gray-600">{recommendations.alternativeOptions.partnerReferral}</p>
            </div>
          )}
        </div>
      )}

      {/* Pricing Guidance */}
      {recommendations.pricingGuidance && (
        <div className="border rounded-lg p-4">
          <h4 className="font-medium mb-3 flex items-center">
            <DollarSign className="h-5 w-5 mr-2 text-green-600" />
            Pricing Recommendation
          </h4>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium">Recommended Tier:</p>
              <p className="text-lg font-semibold text-blue-600">
                {recommendations.pricingGuidance.recommendedTier}
              </p>
            </div>
            {recommendations.pricingGuidance.specialConsiderations && (
              <div>
                <p className="text-sm font-medium">Special Considerations:</p>
                <p className="text-sm text-gray-600">
                  {recommendations.pricingGuidance.specialConsiderations}
                </p>
              </div>
            )}
          </div>
          {recommendations.pricingGuidance.justification && (
            <p className="text-sm text-gray-600 mt-2">
              {recommendations.pricingGuidance.justification}
            </p>
          )}
        </div>
      )}

      {/* Implementation Approach (if pursuing) */}
      {recommendations.implementationApproach?.strategy && (
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-3">Implementation Strategy (If Pursuing)</h3>
          <p className="text-gray-700 mb-4">{recommendations.implementationApproach.strategy}</p>
          
          {recommendations.implementationApproach.phases?.length > 0 && (
            <div className="space-y-3">
              {recommendations.implementationApproach.phases.map((phase, idx) => (
                <div key={idx} className="border-l-4 border-blue-500 pl-4">
                  <h4 className="font-medium">Phase {phase.phase}: {phase.name}</h4>
                  <p className="text-sm text-gray-600">Duration: {phase.duration}</p>
                  {phase.activities?.length > 0 && (
                    <ul className="text-sm mt-2 space-y-1">
                      {phase.activities.map((activity, i) => (
                        <li key={i}>• {activity}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ComprehensiveAnalysisDisplay;

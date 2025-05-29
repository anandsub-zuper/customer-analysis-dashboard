// Comprehensive Analysis Display Component for Analysis.jsx

import React, { useState } from 'react';
import { 
  CheckCircle, AlertTriangle, XCircle, Users, Building, 
  Calendar, DollarSign, FileText, Settings, MessageSquare,
  Package, Link, Briefcase, Clock, TrendingUp, Award
} from 'lucide-react';

const ComprehensiveAnalysisDisplay = ({ analysisResults }) => {
  const [activeTab, setActiveTab] = useState('summary');
  
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
    if (score >= 80) return { level: 'Excellent Fit', color: 'green' };
    if (score >= 60) return { level: 'Good Fit', color: 'blue' };
    if (score >= 40) return { level: 'Fair Fit', color: 'yellow' };
    return { level: 'Poor Fit', color: 'red' };
  };

  const fitLevel = getFitLevel(analysisResults.fitScore);

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold">{analysisResults.customerName}</h2>
            <p className="text-gray-600 mt-1">{analysisResults.industry}</p>
            <div className="flex items-center mt-2 space-x-4 text-sm text-gray-500">
              <span className="flex items-center">
                <Users className="h-4 w-4 mr-1" />
                {analysisResults.userCount?.total || 0} users
              </span>
              <span className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                {analysisResults.timeline?.desiredGoLive || 'Timeline TBD'}
              </span>
              {analysisResults.budget?.range && (
                <span className="flex items-center">
                  <DollarSign className="h-4 w-4 mr-1" />
                  {analysisResults.budget.range}
                </span>
              )}
            </div>
          </div>
          <div className="text-center">
            <div className={`text-5xl font-bold text-${fitLevel.color}-600 mb-1`}>
              {analysisResults.fitScore}%
            </div>
            <p className={`text-sm font-medium text-${fitLevel.color}-600`}>
              {fitLevel.level}
            </p>
          </div>
        </div>
      </div>

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
  );
};

// Summary Tab Component
const SummaryTab = ({ data }) => (
  <div className="space-y-6">
    <div>
      <h3 className="text-lg font-semibold mb-3">Overview</h3>
      <p className="text-gray-700">{data.summary?.overview || 'No overview available.'}</p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <h4 className="font-medium mb-3 flex items-center">
          <Briefcase className="h-5 w-5 mr-2 text-blue-600" />
          Current State
        </h4>
        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
          {data.currentState?.currentSystems?.map((system, idx) => (
            <div key={idx}>
              <p className="font-medium">{system.name}</p>
              <p className="text-sm text-gray-600">{system.usage}</p>
              {system.replacementReasons?.length > 0 && (
                <ul className="text-sm text-red-600 mt-1">
                  {system.replacementReasons.map((reason, i) => (
                    <li key={i}>• {reason}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="font-medium mb-3 flex items-center">
          <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
          Key Requirements
        </h4>
        <div className="bg-gray-50 p-4 rounded-lg">
          <ul className="space-y-2">
            {data.summary?.keyRequirements?.map((req, idx) => (
              <li key={idx} className="flex items-start">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
                <span className="text-sm">{req}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>

    <div>
      <h4 className="font-medium mb-3">Main Pain Points</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {data.summary?.mainPainPoints?.map((pain, idx) => (
          <div key={idx} className="flex items-start bg-red-50 p-3 rounded">
            <AlertTriangle className="h-4 w-4 text-red-500 mr-2 mt-0.5" />
            <span className="text-sm">{pain}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Strengths & Challenges Tab
const StrengthsChallengesTab = ({ data }) => (
  <div className="space-y-6">
    <div>
      <h3 className="text-lg font-semibold mb-4">Key Strengths</h3>
      <div className="space-y-4">
        {data.strengths?.map((strength, idx) => (
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
                <span className="text-sm font-medium">Zuper Features: </span>
                <span className="text-sm text-blue-600">
                  {strength.relatedFeatures.join(', ')}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>

    <div>
      <h3 className="text-lg font-semibold mb-4">Potential Challenges</h3>
      <div className="space-y-4">
        {data.challenges?.map((challenge, idx) => (
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
  </div>
);

// Similar Customers Tab
const SimilarCustomersTab = ({ data }) => (
  <div className="space-y-6">
    <h3 className="text-lg font-semibold">Similar Customer Implementations</h3>
    {data.similarCustomers?.map((customer, idx) => (
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

// Requirements Tab
const RequirementsTab = ({ data }) => (
  <div className="space-y-6">
    {/* Service Types */}
    <div>
      <h3 className="text-lg font-semibold mb-3">Service Types</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {data.services?.types?.map((service, idx) => (
          <div key={idx} className="flex items-center">
            <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
            <span>{service}</span>
          </div>
        ))}
      </div>
      {data.services?.details && Object.keys(data.services.details).length > 0 && (
        <div className="mt-3 bg-gray-50 p-3 rounded">
          <p className="text-sm font-medium mb-2">Service Details:</p>
          {Object.entries(data.services.details).map(([type, details]) => (
            <p key={type} className="text-sm">
              <strong>{type}:</strong> {details}
            </p>
          ))}
        </div>
      )}
    </div>

    {/* Checklists & Inspections */}
    <div>
      <h3 className="text-lg font-semibold mb-3">Checklists & Inspections</h3>
      <p className="text-gray-600 mb-3">
        {data.customerName} has several required checklists that align well with Zuper's capabilities:
      </p>
      <ul className="space-y-2">
        {data.requirements?.checklists?.map((checklist, idx) => (
          <li key={idx} className="ml-4">
            <p className="font-medium">• {checklist.name}</p>
            {checklist.purpose && (
              <p className="text-sm text-gray-600 ml-4">{checklist.purpose}</p>
            )}
            {checklist.jobTypes?.length > 0 && (
              <p className="text-sm text-gray-500 ml-4">
                Used for: {checklist.jobTypes.join(', ')}
              </p>
            )}
          </li>
        ))}
      </ul>
      <p className="text-sm text-gray-600 mt-3">
        Zuper's customizable checklist capabilities can fully accommodate these requirements, 
        and the ability to assign checklists to specific job statuses is directly aligned with their needs.
      </p>
    </div>

    {/* Customer Communications */}
    <div>
      <h3 className="text-lg font-semibold mb-3">Customer Communications</h3>
      <p className="text-gray-600 mb-3">Their communication requirements include:</p>
      <ul className="space-y-2">
        {data.requirements?.communications?.customerNotifications?.types?.map((type, idx) => (
          <li key={idx} className="ml-4">• {type}</li>
        ))}
      </ul>
      <div className="mt-3 bg-blue-50 p-3 rounded">
        <p className="text-sm">
          <strong>Methods:</strong> {data.requirements?.communications?.customerNotifications?.methods?.join(', ')}
        </p>
        <p className="text-sm mt-1">
          <strong>Triggers:</strong> {data.requirements?.communications?.customerNotifications?.triggers?.join(', ')}
        </p>
      </div>
      <p className="text-sm text-gray-600 mt-3">
        Zuper's notification system supports all these requirements through its automated communication tools.
      </p>
    </div>

    {/* Integrations */}
    <div>
      <h3 className="text-lg font-semibold mb-3">Integrations</h3>
      <p className="text-gray-600 mb-3">Required integrations include:</p>
      <div className="space-y-3">
        {data.requirements?.integrations?.map((integration, idx) => (
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
            {integration.dataFlow && (
              <p className="text-sm mt-2">
                <strong>Data Flow:</strong> {integration.dataFlow}
              </p>
            )}
            <p className="text-sm mt-1">
              <strong>Complexity:</strong> {integration.complexity}
            </p>
          </div>
        ))}
      </div>
    </div>

    {/* Other Requirements */}
    <div>
      <h3 className="text-lg font-semibold mb-3">Other Requirements</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.requirements?.features?.assetManagement?.needed && (
          <div className="flex items-start">
            <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
            <div>
              <p className="font-medium">Asset/Product Management</p>
              <p className="text-sm text-gray-600">
                Track {data.requirements.features.assetManagement.types?.join(', ')}
              </p>
            </div>
          </div>
        )}
        {data.requirements?.features?.inventory?.needed && (
          <div className="flex items-start">
            <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
            <div>
              <p className="font-medium">Inventory Tracking</p>
              <p className="text-sm text-gray-600">
                {data.requirements.features.inventory.trackingLevel} tracking required
              </p>
            </div>
          </div>
        )}
        {data.requirements?.features?.reporting?.needed && (
          <div className="flex items-start">
            <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
            <div>
              <p className="font-medium">Reporting</p>
              <p className="text-sm text-gray-600">
                {data.requirements.features.reporting.types?.join(', ')}
              </p>
            </div>
          </div>
        )}
        {data.requirements?.features?.customerPortal?.needed && (
          <div className="flex items-start">
            <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
            <div>
              <p className="font-medium">Customer Portal</p>
              <p className="text-sm text-gray-600">
                {data.requirements.features.customerPortal.features?.join(', ')}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
);

// Recommendations Tab
const RecommendationsTab = ({ data }) => (
  <div className="space-y-6">
    <div className="bg-blue-50 p-4 rounded-lg">
      <p className="text-blue-800">
        Based on the analysis of {data.customerName}'s requirements and their excellent 
        compatibility with Zuper, here are specific recommendations for implementation and onboarding:
      </p>
    </div>

    {/* Implementation Approach */}
    <div>
      <h3 className="text-lg font-semibold mb-3">Implementation Approach</h3>
      <p className="text-gray-600 mb-3">{data.recommendations?.implementationApproach?.strategy}</p>
      <div className="space-y-3">
        {data.recommendations?.implementationApproach?.phases?.map((phase, idx) => (
          <div key={idx} className="border-l-4 border-blue-500 pl-4">
            <h4 className="font-medium">Phase {phase.phase}: {phase.name}</h4>
            <p className="text-sm text-gray-600">Duration: {phase.duration}</p>
            <ul className="text-sm mt-2 space-y-1">
              {phase.activities?.map((activity, i) => (
                <li key={i}>• {activity}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>

    {/* Integration Strategy */}
    <div>
      <h3 className="text-lg font-semibold mb-3">Integration Strategy</h3>
      <p className="text-gray-600 mb-3">{data.recommendations?.integrationStrategy?.approach}</p>
      <ul className="space-y-2">
        {data.recommendations?.integrationStrategy?.details?.map((integration, idx) => (
          <li key={idx} className="ml-4">
            <p className="font-medium">• {integration.integration}</p>
            <p className="text-sm text-gray-600 ml-4">
              Method: {integration.method} | Timeline: {integration.timeline}
            </p>
          </li>
        ))}
      </ul>
    </div>

    {/* Workflow Configuration */}
    <div>
      <h3 className="text-lg font-semibold mb-3">Workflow Configuration</h3>
      <ul className="space-y-3">
        {data.recommendations?.workflowConfiguration?.map((workflow, idx) => (
          <li key={idx} className="ml-4">
            <p className="font-medium">• {workflow.workflow}</p>
            <p className="text-sm text-gray-600 ml-4">
              {workflow.steps?.length} steps with {workflow.automations?.length} automations
            </p>
          </li>
        ))}
      </ul>
    </div>

    {/* Training Recommendations */}
    <div>
      <h3 className="text-lg font-semibold mb-3">Training Recommendations</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.recommendations?.trainingRecommendations?.map((training, idx) => (
          <div key={idx} className="border rounded p-3">
            <h4 className="font-medium">{training.audience}</h4>
            <p className="text-sm text-gray-600">Duration: {training.duration}</p>
            <p className="text-sm text-gray-600">Method: {training.method}</p>
            <p className="text-sm mt-2">Topics: {training.topics?.join(', ')}</p>
          </div>
        ))}
      </div>
    </div>

    {/* Timeline Projection */}
    <div>
      <h3 className="text-lg font-semibold mb-3">Timeline Projection</h3>
      <div className="bg-gray-50 rounded-lg p-4">
        <table className="w-full">
          <thead>
            <tr className="text-left text-sm font-medium text-gray-700">
              <th className="pb-2">Period</th>
              <th className="pb-2">Activities</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {data.recommendations?.implementationApproach?.phases?.map((phase, idx) => (
              <tr key={idx} className="border-t">
                <td className="py-2 font-medium whitespace-nowrap">
                  {phase.duration}
                </td>
                <td className="py-2">
                  {phase.activities?.join(', ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

export default ComprehensiveAnalysisDisplay;

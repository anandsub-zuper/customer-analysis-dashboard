// SmartFormattedMessage.jsx - Content-aware formatting for any AI response

import React from 'react';
import { 
  CheckCircle, AlertTriangle, TrendingUp, Users, Target, Award, 
  Mail, Calendar, MessageSquare, FileText, BarChart3, Settings,
  Lightbulb, ArrowRight, Clock, Star, AlertCircle, Info
} from 'lucide-react';

const SmartFormattedMessage = ({ content, type = 'bot' }) => {
  // If it's a user message, just return plain text
  if (type === 'user') {
    return <div className="text-sm">{content}</div>;
  }

  // Detect the response type based on content
  const responseType = detectResponseType(content);
  
  // Apply appropriate formatting based on response type
  return (
    <div className="text-sm space-y-2">
      {formatContentByType(content, responseType)}
    </div>
  );
};

// Detect what type of response this is
const detectResponseType = (content) => {
  const contentLower = content.toLowerCase();
  
  // Email generation
  if (contentLower.includes('subject:') && (contentLower.includes('dear') || contentLower.includes('hello'))) {
    return 'email';
  }
  
  // Scoring/analysis (fit score, breakdown, etc.)
  if (contentLower.includes('fit score') || contentLower.includes('base score') || contentLower.includes('industry status')) {
    return 'scoring';
  }
  
  // Similar customers
  if (contentLower.includes('similar customer') || contentLower.includes('match percentage')) {
    return 'customers';
  }
  
  // Next steps/strategy
  if (contentLower.includes('next step') || contentLower.includes('recommend') || contentLower.includes('strategy')) {
    return 'strategy';
  }
  
  // Meeting agenda
  if (contentLower.includes('agenda') || contentLower.includes('meeting') || contentLower.includes('minutes')) {
    return 'agenda';
  }
  
  // General explanation
  if (contentLower.includes('in summary') || contentLower.includes('explanation') || contentLower.includes('concept')) {
    return 'explanation';
  }
  
  // Default to general
  return 'general';
};

// Format content based on detected type
const formatContentByType = (content, responseType) => {
  switch (responseType) {
    case 'email':
      return formatEmailContent(content);
    case 'scoring':
      return formatScoringContent(content);
    case 'customers':
      return formatCustomersContent(content);
    case 'strategy':
      return formatStrategyContent(content);
    case 'agenda':
      return formatAgendaContent(content);
    case 'explanation':
      return formatExplanationContent(content);
    default:
      return formatGeneralContent(content);
  }
};

// Email-specific formatting
const formatEmailContent = (content) => {
  const lines = content.split('\n').filter(line => line.trim());
  const subjectLine = lines.find(line => line.toLowerCase().includes('subject:'));
  const bodyLines = lines.filter(line => !line.toLowerCase().includes('subject:'));
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {subjectLine && (
        <div className="bg-blue-50 px-4 py-3 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Mail className="h-4 w-4 text-blue-600" />
            <div>
              <div className="text-xs text-gray-600 uppercase tracking-wide">Email Subject</div>
              <div className="font-medium text-gray-900">{subjectLine.replace(/subject:\s*/i, '')}</div>
            </div>
          </div>
        </div>
      )}
      <div className="p-4">
        <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
          {bodyLines.join('\n')}
        </div>
      </div>
    </div>
  );
};

// Scoring/analysis-specific formatting
const formatScoringContent = (content) => {
  const sections = content.split('\n\n');
  
  return sections.map((section, index) => {
    if (isScoringSection(section)) {
      return (
        <div key={index} className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border-l-4 border-blue-500">
          {formatScoringSection(section)}
        </div>
      );
    } else {
      return (
        <p key={index} className="mb-3 text-sm leading-relaxed text-gray-700">
          {formatInlineElements(section)}
        </p>
      );
    }
  });
};

// Similar customers formatting
const formatCustomersContent = (content) => {
  const sections = content.split('\n\n');
  
  return sections.map((section, index) => {
    if (section.includes('1.') || section.includes('2.') || section.includes('3.')) {
      return (
        <div key={index} className="bg-purple-50 rounded-lg p-4 border-l-4 border-purple-500">
          {formatCustomerSection(section)}
        </div>
      );
    } else {
      return (
        <p key={index} className="mb-3 text-sm leading-relaxed text-gray-700">
          {formatInlineElements(section)}
        </p>
      );
    }
  });
};

// Strategy/next steps formatting
const formatStrategyContent = (content) => {
  const sections = content.split('\n\n');
  
  return sections.map((section, index) => {
    if (isActionableSection(section)) {
      return (
        <div key={index} className="bg-green-50 rounded-lg p-4 border-l-4 border-green-500">
          {formatStrategySection(section)}
        </div>
      );
    } else {
      return (
        <p key={index} className="mb-3 text-sm leading-relaxed text-gray-700">
          {formatInlineElements(section)}
        </p>
      );
    }
  });
};

// Meeting agenda formatting
const formatAgendaContent = (content) => {
  const lines = content.split('\n').filter(line => line.trim());
  
  return (
    <div className="bg-yellow-50 rounded-lg p-4 border-l-4 border-yellow-500">
      <div className="flex items-center space-x-2 mb-3">
        <Calendar className="h-4 w-4 text-yellow-600" />
        <h4 className="font-semibold text-gray-900">Meeting Agenda</h4>
      </div>
      {lines.map((line, index) => {
        if (line.match(/^\d+\./)) {
          return (
            <div key={index} className="flex items-start space-x-2 mb-2">
              <Clock className="h-4 w-4 text-yellow-600 mt-0.5" />
              <span className="text-sm text-gray-700">{line}</span>
            </div>
          );
        }
        return (
          <p key={index} className="text-sm text-gray-700 mb-2">{line}</p>
        );
      })}
    </div>
  );
};

// General explanation formatting
const formatExplanationContent = (content) => {
  const sections = content.split('\n\n');
  
  return sections.map((section, index) => (
    <div key={index} className="mb-4">
      {section.includes('•') || section.includes('-') ? (
        <div className="bg-gray-50 rounded-lg p-3">
          {formatBulletPoints(section)}
        </div>
      ) : (
        <p className="text-sm leading-relaxed text-gray-700">
          {formatInlineElements(section)}
        </p>
      )}
    </div>
  ));
};

// Generic formatting for any other content
const formatGeneralContent = (content) => {
  const sections = content.split('\n\n');
  
  return sections.map((section, index) => {
    if (section.includes('1.') || section.includes('2.')) {
      return (
        <div key={index} className="bg-gray-50 rounded-lg p-4 border-l-4 border-gray-400">
          {formatGenericList(section)}
        </div>
      );
    } else {
      return (
        <p key={index} className="mb-3 text-sm leading-relaxed text-gray-700">
          {formatInlineElements(section)}
        </p>
      );
    }
  });
};

// Helper functions for specific formatting
const isScoringSection = (section) => {
  return section.includes('Score:') || section.includes('Industry') || section.includes('bonus') || section.includes('points');
};

const isActionableSection = (section) => {
  return section.includes('next') || section.includes('action') || section.includes('recommend') || section.includes('step');
};

const formatScoringSection = (section) => {
  const lines = section.split('\n').filter(line => line.trim());
  
  return lines.map((line, index) => {
    if (line.match(/^\d+\./)) {
      return (
        <div key={index} className="flex items-start space-x-2 mb-3">
          <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center mt-0.5">
            {line.match(/^(\d+)/)[1]}
          </div>
          <div className="text-sm text-gray-700">{formatInlineElements(line.replace(/^\d+\.\s*/, ''))}</div>
        </div>
      );
    }
    
    if (line.includes(':')) {
      const [key, value] = line.split(':');
      return (
        <div key={index} className="flex justify-between items-center py-1 border-b border-blue-200 last:border-b-0">
          <span className="text-sm font-medium text-gray-600">{key.trim()}</span>
          <span className="text-sm font-semibold text-blue-700">{formatScoreValue(value.trim())}</span>
        </div>
      );
    }
    
    return (
      <p key={index} className="text-sm text-gray-700 mb-2">{formatInlineElements(line)}</p>
    );
  });
};

const formatCustomerSection = (section) => {
  const lines = section.split('\n').filter(line => line.trim());
  
  return lines.map((line, index) => {
    if (line.match(/^\d+\./)) {
      return (
        <div key={index} className="flex items-start space-x-2 mb-3">
          <Users className="h-4 w-4 text-purple-600 mt-0.5" />
          <div className="text-sm text-gray-700">{formatInlineElements(line.replace(/^\d+\.\s*/, ''))}</div>
        </div>
      );
    }
    return (
      <p key={index} className="text-sm text-gray-700 mb-2">{formatInlineElements(line)}</p>
    );
  });
};

const formatStrategySection = (section) => {
  const lines = section.split('\n').filter(line => line.trim());
  
  return lines.map((line, index) => {
    if (line.match(/^-\s/) || line.match(/^•\s/)) {
      return (
        <div key={index} className="flex items-start space-x-2 mb-2">
          <ArrowRight className="h-4 w-4 text-green-600 mt-0.5" />
          <div className="text-sm text-gray-700">{formatInlineElements(line.replace(/^[-•]\s*/, ''))}</div>
        </div>
      );
    }
    return (
      <p key={index} className="text-sm text-gray-700 mb-2">{formatInlineElements(line)}</p>
    );
  });
};

const formatBulletPoints = (section) => {
  const lines = section.split('\n').filter(line => line.trim());
  
  return lines.map((line, index) => {
    if (line.match(/^[-•]\s/)) {
      return (
        <div key={index} className="flex items-start space-x-2 mb-2">
          <CheckCircle className="h-4 w-4 text-gray-500 mt-0.5" />
          <div className="text-sm text-gray-700">{formatInlineElements(line.replace(/^[-•]\s*/, ''))}</div>
        </div>
      );
    }
    return (
      <p key={index} className="text-sm text-gray-700 mb-2">{formatInlineElements(line)}</p>
    );
  });
};

const formatGenericList = (section) => {
  const lines = section.split('\n').filter(line => line.trim());
  
  return lines.map((line, index) => {
    if (line.match(/^\d+\./)) {
      return (
        <div key={index} className="flex items-start space-x-2 mb-2">
          <Info className="h-4 w-4 text-gray-500 mt-0.5" />
          <div className="text-sm text-gray-700">{formatInlineElements(line.replace(/^\d+\.\s*/, ''))}</div>
        </div>
      );
    }
    return (
      <p key={index} className="text-sm text-gray-700 mb-2">{formatInlineElements(line)}</p>
    );
  });
};

// Format score values (used specifically for scoring responses)
const formatScoreValue = (value) => {
  if (value.includes('+')) {
    return <span className="text-green-600 font-bold">{value}</span>;
  }
  if (value.includes('-') && !value.includes('management')) {
    return <span className="text-red-600 font-bold">{value}</span>;
  }
  if (value.includes('%') || /^\d+$/.test(value.trim())) {
    return <span className="text-blue-600 font-bold">{value}</span>;
  }
  return value;
};

// Format inline elements like **bold** text
const formatInlineElements = (text) => {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const boldText = part.slice(2, -2);
      return <strong key={index} className="font-semibold text-gray-900">{boldText}</strong>;
    }
    return part;
  });
};

export default SmartFormattedMessage;

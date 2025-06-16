import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, X, Bot, User, Lightbulb, TrendingUp, Users } from 'lucide-react';

const ChatWidget = ({ analysisResults }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      content: "Hi! I'm your AI assistant. I can help you understand this analysis, find similar customers, or answer questions about the recommendations.",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Quick action suggestions based on analysis
  const getQuickActions = () => {
    if (!analysisResults) return [];
    
    const actions = [];
    
    if (analysisResults.fitScore < 40) {
      actions.push({
        icon: <X className="h-4 w-4" />,
        text: "Why is the fit score low?",
        query: "Explain why this customer received a low fit score and what the main concerns are."
      });
    }
    
    if (analysisResults.fitScore > 70) {
      actions.push({
        icon: <TrendingUp className="h-4 w-4" />,
        text: "How to accelerate this deal?",
        query: "What are the best strategies to accelerate this high-fit prospect through the sales process?"
      });
    }
    
    if (analysisResults.similarCustomers?.length > 0) {
      actions.push({
        icon: <Users className="h-4 w-4" />,
        text: "Tell me about similar customers",
        query: "Explain the most relevant similar customers and what we can learn from their implementations."
      });
    }
    
    actions.push({
      icon: <Lightbulb className="h-4 w-4" />,
      text: "Generate follow-up email",
      query: "Create a personalized follow-up email for this prospect based on their analysis."
    });
    
    return actions;
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;
    
    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: input,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    try {
      // In real implementation, this would call your backend
      const response = await simulateAIResponse(input, analysisResults);
      
      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: response,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: "I'm sorry, I encountered an error. Please try again.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (query) => {
    setInput(query);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Chat Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors z-50"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-20 right-6 w-96 h-96 bg-white border border-gray-200 rounded-lg shadow-xl z-50 flex flex-col">
          {/* Header */}
          <div className="bg-blue-600 text-white p-4 rounded-t-lg flex items-center">
            <Bot className="h-5 w-5 mr-2" />
            <span className="font-medium">AI Assistant</span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.type === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    {message.type === 'bot' && <Bot className="h-4 w-4 mt-0.5 text-blue-600" />}
                    {message.type === 'user' && <User className="h-4 w-4 mt-0.5" />}
                    <div className="text-sm">{message.content}</div>
                  </div>
                  <div className={`text-xs mt-1 opacity-75`}>
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 p-3 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Bot className="h-4 w-4 text-blue-600" />
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          {messages.length === 1 && (
            <div className="p-4 border-t border-gray-200">
              <div className="text-xs text-gray-600 mb-2">Quick actions:</div>
              <div className="space-y-2">
                {getQuickActions().map((action, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickAction(action.query)}
                    className="w-full text-left text-xs bg-gray-50 hover:bg-gray-100 p-2 rounded flex items-center space-x-2 transition-colors"
                  >
                    {action.icon}
                    <span>{action.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex space-x-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything about this analysis..."
                className="flex-1 p-2 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={2}
              />
              <button
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading}
                className="bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Simulate AI response - replace with actual API call
const simulateAIResponse = async (query, analysisResults) => {
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
  
  const queryLower = query.toLowerCase();
  
  if (queryLower.includes('fit score') || queryLower.includes('low score')) {
    return `The fit score of ${analysisResults?.fitScore || 'N/A'}% is based on several factors:

• **Industry Match**: ${analysisResults?.industry || 'Unknown'} industry alignment
• **Field Worker Ratio**: ${Math.round(((analysisResults?.userCount?.field || 0) / (analysisResults?.userCount?.total || 1)) * 100)}% field workers
• **Requirements Complexity**: ${analysisResults?.requirements?.integrations?.length || 0} integrations needed

${analysisResults?.fitScore < 40 ? 'The main concerns are likely industry mismatch or complex requirements that may be difficult to support.' : 'This is actually a decent score with good potential for success.'}`;
  }
  
  if (queryLower.includes('similar customer') || queryLower.includes('learn from')) {
    const similarCount = analysisResults?.similarCustomers?.length || 0;
    if (similarCount > 0) {
      return `I found ${similarCount} similar customers in our database. Here are key insights:

• Most similar customers had successful implementations
• Average implementation time: 6-8 weeks
• Common success factors: Clear requirements, dedicated project team
• Potential challenges: Integration complexity, change management

Would you like me to dive deeper into any specific similar customer?`;
    } else {
      return "No closely similar customers found in our historical data. This could indicate a unique use case that requires extra attention during qualification.";
    }
  }
  
  if (queryLower.includes('email') || queryLower.includes('follow')) {
    return `Here's a personalized follow-up email draft:

**Subject**: Next Steps for ${analysisResults?.customerName || 'Your Company'}'s Field Service Solution

Hi [Contact Name],

Thank you for sharing details about ${analysisResults?.customerName || 'your company'}'s field service needs. Based on our analysis:

✅ **Strong fit areas**: ${analysisResults?.strengths?.[0]?.title || 'Field worker management'}
⚠️ **Areas to discuss**: ${analysisResults?.challenges?.[0]?.title || 'Integration requirements'}

I'd love to schedule a 30-minute call to discuss how we can address your specific needs.

Best regards,
[Your Name]

Would you like me to customize this further?`;
  }
  
  if (queryLower.includes('accelerate') || queryLower.includes('strategies')) {
    return `To accelerate this high-fit prospect:

🚀 **Immediate Actions**:
• Schedule demo focused on their top 3 requirements
• Share case study from similar ${analysisResults?.industry || 'industry'} customer
• Involve technical team for integration discussion

📈 **Value Proposition**:
• Emphasize ROI from ${analysisResults?.userCount?.field || 'field'} worker productivity
• Address their main pain points directly
• Propose pilot program to reduce risk

⏰ **Timeline Strategy**:
• Align with their ${analysisResults?.timeline?.desiredGoLive || 'desired timeline'}
• Create urgency around implementation benefits

Would you like specific talking points for the next call?`;
  }
  
  return `I understand you're asking about "${query}". Based on the analysis for ${analysisResults?.customerName || 'this customer'}, I can provide insights about:

• Customer fit analysis and scoring factors
• Implementation recommendations and risks
• Similar customer comparisons and learnings
• Next steps and sales strategies

What specific aspect would you like me to explain in more detail?`;
};

export default ChatWidget;

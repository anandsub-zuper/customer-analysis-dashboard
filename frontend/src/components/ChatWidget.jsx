// Updated ChatWidget.jsx - Using SmartFormattedMessage for content-aware formatting

import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, X, Bot, User, Lightbulb, TrendingUp, Users } from 'lucide-react';
import { sendQuery } from '../api/conversationalApi';
import SmartFormattedMessage from './SmartFormattedMessage'; // Import the smart component

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
  const [conversationId, setConversationId] = useState(null);
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
      console.log('ChatWidget: Making API call...', {
        query: input,
        analysisId: analysisResults?.id,
        conversationId
      });

      const result = await sendQuery(
        input, 
        analysisResults?.id, 
        conversationId
      );
      
      console.log('ChatWidget: API response received:', result);
      
      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: result.response,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, botMessage]);
      
      // Update conversation ID if new
      if (result.conversationId && !conversationId) {
        setConversationId(result.conversationId);
      }
      
    } catch (error) {
      console.error('ChatWidget: Error sending message:', error);
      
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

      {/* Chat Window - Optimized size for different content types */}
      {isOpen && (
        <div className="fixed bottom-20 right-6 w-[500px] h-[650px] bg-white border border-gray-200 rounded-lg shadow-xl z-50 flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-t-lg flex items-center">
            <Bot className="h-5 w-5 mr-2" />
            <div className="flex-1">
              <span className="font-medium">AI Assistant</span>
              <div className="text-xs opacity-90">Smart analysis & recommendations</div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-xs opacity-90">Online</span>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[90%] rounded-lg ${
                    message.type === 'user'
                      ? 'bg-blue-600 text-white p-3'
                      : 'bg-white border border-gray-200 shadow-sm'
                  }`}
                >
                  {/* Message Header */}
                  <div className="flex items-start space-x-2 mb-2">
                    {message.type === 'bot' && (
                      <div className="flex-shrink-0">
                        <Bot className="h-4 w-4 text-blue-600 mt-1" />
                      </div>
                    )}
                    {message.type === 'user' && (
                      <User className="h-4 w-4 mt-1" />
                    )}
                    <div className="flex-1 min-w-0">
                      {/* Use SmartFormattedMessage for intelligent formatting */}
                      {message.type === 'bot' ? (
                        <div className="p-3">
                          <SmartFormattedMessage content={message.content} type={message.type} />
                        </div>
                      ) : (
                        <div className="text-sm">{message.content}</div>
                      )}
                    </div>
                  </div>
                  
                  {/* Timestamp */}
                  <div className={`text-xs mt-2 ${
                    message.type === 'user' ? 'text-blue-100' : 'text-gray-500 px-3 pb-2'
                  }`}>
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            
            {/* Enhanced Loading indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  <div className="flex items-center space-x-3">
                    <Bot className="h-4 w-4 text-blue-600" />
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                    <span className="text-sm text-gray-600">Analyzing & formatting response...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          {messages.length === 1 && (
            <div className="p-4 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50">
              <div className="text-xs text-gray-600 mb-3 font-medium">Try these smart suggestions:</div>
              <div className="grid grid-cols-1 gap-2">
                {getQuickActions().map((action, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickAction(action.query)}
                    className="w-full text-left text-xs bg-white hover:bg-blue-50 p-3 rounded-md border border-gray-200 flex items-center space-x-2 transition-all hover:border-blue-300 hover:shadow-sm group"
                  >
                    <span className="text-blue-600 group-hover:text-blue-700">{action.icon}</span>
                    <span className="text-gray-700 group-hover:text-gray-900">{action.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Enhanced Input */}
          <div className="p-4 border-t border-gray-200 bg-white">
            <div className="flex space-x-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about analysis, generate emails, get strategies..."
                className="flex-1 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm placeholder-gray-500"
                rows={2}
              />
              <button
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading}
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-3 rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center shadow-sm"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <div className="text-xs text-gray-500 mt-2 flex items-center justify-between">
              <span>Press Enter to send, Shift+Enter for new line</span>
              <span className="text-blue-600">Smart formatting enabled ✨</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatWidget;

import { useState, useRef, useEffect } from "react";
import { useAuth, API } from "../App";
import { useLocation } from "react-router-dom";
import axios from "axios";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { MessageSquare, X, Send, Minimize2, Maximize2, Bot, User } from "lucide-react";

const ChatBot = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "bot",
      content: "Hi! I'm InfoConnect, your AI assistant for OMNISupply.io. I can help you find products, manage orders, and navigate the platform. How can I assist you today?"
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Don't show chatbot on landing page or login page
  const hiddenPages = ["/", "/login"];
  if (hiddenPages.includes(location.pathname)) {
    return null;
  }

  // Don't show if not logged in
  if (!user) {
    return null;
  }

  const sendMessage = async () => {
    if (!message.trim() || loading) return;

    const userMessage = message.trim();
    setMessage("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const response = await axios.post(`${API}/chat/message`, {
        message: userMessage,
        session_id: sessionId
      });
      
      setSessionId(response.data.session_id);
      setMessages(prev => [...prev, { role: "bot", content: response.data.response }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: "bot", 
        content: "I'm sorry, I encountered an error. Please try again or contact support if the issue persists." 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="chatbot-container" data-testid="chatbot-container">
      {/* Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="chatbot-button"
          data-testid="chatbot-open-btn"
        >
          <MessageSquare className="w-6 h-6" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div 
          className={`chatbot-window ${isMinimized ? 'h-14' : ''}`}
          style={{ height: isMinimized ? '56px' : '500px' }}
        >
          {/* Header */}
          <div className="bg-[#007CC3] text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">InfoConnect</h3>
                <p className="text-xs text-white/80">AI Assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 hover:bg-white/20 rounded"
                data-testid="chatbot-minimize-btn"
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-white/20 rounded"
                data-testid="chatbot-close-btn"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, idx) => (
                  <div 
                    key={idx} 
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={msg.role === 'user' ? 'chat-message-user' : 'chat-message-bot'}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="chat-message-bot">
                      <div className="flex items-center gap-2">
                        <span className="animate-pulse">●</span>
                        <span className="animate-pulse delay-100">●</span>
                        <span className="animate-pulse delay-200">●</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-slate-200">
                <div className="flex gap-2">
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    className="flex-1"
                    disabled={loading}
                    data-testid="chatbot-input"
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!message.trim() || loading}
                    className="bg-[#007CC3] hover:bg-[#00629B]"
                    data-testid="chatbot-send-btn"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-slate-400 mt-2 text-center">
                  Powered by InfoConnect AI
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatBot;

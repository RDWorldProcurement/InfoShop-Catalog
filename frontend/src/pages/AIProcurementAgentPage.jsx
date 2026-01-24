import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, API } from "../App";
import { useLanguage } from "../i18n/LanguageContext";
import axios from "axios";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";
import {
  Brain, Send, Loader2, ShoppingCart, FileUp, Handshake, Search,
  Bot, User, Sparkles, ArrowRight, Package, Briefcase, X, ChevronRight,
  Building2, Phone, Mail, Globe, MapPin, CheckCircle, AlertCircle,
  Zap, MessageSquare, RotateCcw, Home
} from "lucide-react";
import Sidebar from "../components/Sidebar";

// Infosys BPM branding colors
const INFOSYS_BLUE = "#007CC3";
const INFOSYS_ORANGE = "#FF6B00";

// AI Engine indicators
const AI_ENGINES = [
  { id: "gpt", name: "GPT-5.2", icon: "🤖", color: "from-green-500 to-emerald-600" },
  { id: "claude", name: "Claude", icon: "🧠", color: "from-orange-500 to-amber-600" },
  { id: "gemini", name: "Gemini", icon: "⚡", color: "from-blue-500 to-cyan-600" }
];

// Quick action buttons
const QUICK_ACTIONS = [
  { id: "product", label: "Find a Product", icon: Package, color: "bg-blue-100 text-blue-700 hover:bg-blue-200" },
  { id: "service", label: "Find a Service", icon: Briefcase, color: "bg-purple-100 text-purple-700 hover:bg-purple-200" },
  { id: "quotation", label: "I have a Quotation", icon: FileUp, color: "bg-amber-100 text-amber-700 hover:bg-amber-200" },
  { id: "complex", label: "Complex/Strategic Sourcing", icon: Handshake, color: "bg-orange-100 text-orange-700 hover:bg-orange-200" }
];

const AIProcurementAgentPage = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { t, language, currency } = useLanguage();
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [activeEngines, setActiveEngines] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [conversationContext, setConversationContext] = useState({
    intent: null,
    searchType: null,
    searchQuery: null,
    products: [],
    services: [],
    supplierInfo: null,
    unspscCode: null,
    categoryName: null
  });
  const [searchResults, setSearchResults] = useState(null);
  const [showManualOptions, setShowManualOptions] = useState(false);

  // Initialize conversation
  useEffect(() => {
    if (user && messages.length === 0) {
      const welcomeMessage = {
        id: Date.now(),
        type: "assistant",
        content: `Hello ${user.name}! 👋\n\nI'm your **Infosys AI Procurement Agent**, powered by advanced AI to help with all your procurement needs.\n\nHow can I assist you today? You can:\n\n• **Search for Products** - Tell me what you're looking for (OEM name, part numbers, descriptions)\n• **Find Services** - Describe the professional services you need\n• **Upload a Quotation** - I'll analyze it with AI-powered price benchmarking\n• **Strategic Sourcing** - For complex, multi-year engagements\n\nOr simply describe what you need in your own words!`,
        timestamp: new Date().toISOString(),
        engines: []
      };
      setMessages([welcomeMessage]);
      setSessionId(`session_${Date.now()}_${user.email}`);
    }
  }, [user]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Process user message with AI
  const processMessage = async (userMessage) => {
    if (!userMessage.trim()) return;

    // Add user message
    const userMsg = {
      id: Date.now(),
      type: "user",
      content: userMessage,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMsg]);
    setInputValue("");
    setIsTyping(true);
    setActiveEngines(["gpt", "claude", "gemini"]);

    try {
      const response = await axios.post(`${API}/ai-agent/conversation`, {
        message: userMessage,
        session_id: sessionId,
        context: conversationContext,
        language: language,
        currency: currency.code
      }, {
        headers: { "Authorization": `Bearer ${token}` }
      });

      const aiResponse = response.data;
      
      // Update context
      if (aiResponse.context) {
        setConversationContext(prev => ({ ...prev, ...aiResponse.context }));
      }

      // Handle search results
      if (aiResponse.search_results) {
        setSearchResults(aiResponse.search_results);
      }

      // Add AI response
      const assistantMsg = {
        id: Date.now() + 1,
        type: "assistant",
        content: aiResponse.message,
        timestamp: new Date().toISOString(),
        engines: aiResponse.engines_used || ["gpt", "claude", "gemini"],
        action: aiResponse.action,
        products: aiResponse.products,
        services: aiResponse.services,
        supplierForm: aiResponse.supplier_form,
        managedServiceForm: aiResponse.managed_service_form,
        unspscSuggestion: aiResponse.unspsc_suggestion
      };
      setMessages(prev => [...prev, assistantMsg]);

    } catch (error) {
      console.error("AI Agent error:", error);
      const errorMsg = {
        id: Date.now() + 1,
        type: "assistant",
        content: "I apologize, but I encountered an issue processing your request. Please try again or select one of the manual options below.",
        timestamp: new Date().toISOString(),
        engines: [],
        isError: true
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
      setActiveEngines([]);
    }
  };

  // Handle quick actions
  const handleQuickAction = (actionId) => {
    const actionMessages = {
      product: "I'm looking to buy a product",
      service: "I need to find a professional service",
      quotation: "I have a quotation from a supplier that I'd like analyzed",
      complex: "I need help with a complex strategic sourcing engagement"
    };
    processMessage(actionMessages[actionId]);
  };

  // Handle adding to cart
  const handleAddToCart = async (item, type) => {
    try {
      await axios.post(`${API}/cart/add`, {
        item_id: item.id || item.product_id || item.service_id,
        item_type: type,
        quantity: 1
      }, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      toast.success(`${item.name} added to cart!`);
    } catch (error) {
      toast.error("Failed to add item to cart");
    }
  };

  // Navigate to manual options
  const navigateToOption = (path) => {
    navigate(path);
  };

  // Reset conversation
  const resetConversation = () => {
    setMessages([]);
    setConversationContext({
      intent: null,
      searchType: null,
      searchQuery: null,
      products: [],
      services: [],
      supplierInfo: null,
      unspscCode: null,
      categoryName: null
    });
    setSearchResults(null);
    setSessionId(`session_${Date.now()}_${user?.email}`);
    
    // Re-add welcome message
    setTimeout(() => {
      const welcomeMessage = {
        id: Date.now(),
        type: "assistant",
        content: `Hello ${user?.name}! 👋\n\nI'm your **Infosys AI Procurement Agent**, ready to help with all your procurement needs.\n\nWhat can I help you find today?`,
        timestamp: new Date().toISOString(),
        engines: []
      };
      setMessages([welcomeMessage]);
    }, 100);
  };

  // Format price - uses API-provided currency symbol or falls back to context currency
  const formatPrice = (price, apiCurrency) => {
    const symbol = apiCurrency || currency.symbol;
    return `${symbol}${price?.toLocaleString() || '0'}`;
  };

  // Render message content with markdown-like formatting
  const renderMessageContent = (content) => {
    if (!content) return null;
    
    // Split by double newlines for paragraphs
    const paragraphs = content.split('\n\n');
    
    return paragraphs.map((para, idx) => {
      // Handle bullet points
      if (para.includes('\n•') || para.startsWith('•')) {
        const items = para.split('\n').filter(item => item.trim());
        return (
          <div key={idx} className="my-2">
            {items.map((item, i) => {
              if (item.startsWith('•')) {
                const text = item.substring(1).trim();
                // Handle bold text
                const parts = text.split(/\*\*(.*?)\*\*/g);
                return (
                  <div key={i} className="flex items-start gap-2 my-1">
                    <span className="text-[#007CC3] mt-1">•</span>
                    <span>
                      {parts.map((part, j) => 
                        j % 2 === 1 ? <strong key={j}>{part}</strong> : part
                      )}
                    </span>
                  </div>
                );
              }
              return <p key={i} className="my-1">{item}</p>;
            })}
          </div>
        );
      }
      
      // Handle bold text in regular paragraphs
      const parts = para.split(/\*\*(.*?)\*\*/g);
      return (
        <p key={idx} className="my-2">
          {parts.map((part, j) => 
            j % 2 === 1 ? <strong key={j}>{part}</strong> : part
          )}
        </p>
      );
    });
  };

  // Render product/service cards
  const renderSearchResults = (msg) => {
    if (!msg.products?.length && !msg.services?.length) return null;

    return (
      <div className="mt-4 space-y-3">
        {msg.products?.map((product, idx) => (
          <Card key={idx} className="border-l-4 border-l-[#007CC3] hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex gap-4">
                {product.image_url && (
                  <img src={product.image_url} alt={product.name} className="w-20 h-20 object-cover rounded-lg" />
                )}
                <div className="flex-1">
                  <h4 className="font-semibold text-slate-900">{product.name}</h4>
                  <p className="text-sm text-slate-600 line-clamp-2">{product.description}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <Badge variant="outline">{product.brand}</Badge>
                    <span className="text-lg font-bold text-[#007CC3]">{formatPrice(product.price)}</span>
                    <span className="text-sm text-slate-500">per {product.unit || 'EA'}</span>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  className="bg-[#007CC3] hover:bg-[#00629B] self-center"
                  onClick={() => handleAddToCart(product, 'product')}
                >
                  <ShoppingCart className="w-4 h-4 mr-1" /> Add
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {msg.services?.map((service, idx) => (
          <Card key={idx} className="border-l-4 border-l-purple-500 hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex gap-4">
                <div className="w-20 h-20 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Briefcase className="w-8 h-8 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-slate-900">{service.name}</h4>
                  <p className="text-sm text-slate-600 line-clamp-2">{service.description}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <Badge variant="outline" className="border-purple-300 text-purple-700">{service.category}</Badge>
                    <span className="text-lg font-bold text-purple-600">{formatPrice(service.rate)}</span>
                    <span className="text-sm text-slate-500">{service.pricing_model || 'per hour'}</span>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  className="bg-purple-600 hover:bg-purple-700 self-center"
                  onClick={() => handleAddToCart(service, 'service')}
                >
                  <ShoppingCart className="w-4 h-4 mr-1" /> Add
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  if (!user) {
    navigate("/login");
    return null;
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar activePage="ai-agent" />
      
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-gradient-to-r from-[#007CC3] via-[#0066A2] to-[#004C7A] text-white px-6 py-4 shadow-lg">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <Brain className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold" style={{ fontFamily: 'Manrope' }}>
                  Infosys AI Procurement Agent
                </h1>
                <p className="text-white/80 text-sm">
                  Powered by GPT-5.2, Claude & Gemini
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* AI Engine Indicators */}
              <div className="flex items-center gap-1 mr-4">
                {AI_ENGINES.map(engine => (
                  <div 
                    key={engine.id}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all ${
                      activeEngines.includes(engine.id) 
                        ? `bg-gradient-to-br ${engine.color} animate-pulse` 
                        : 'bg-white/20'
                    }`}
                    title={engine.name}
                  >
                    {engine.icon}
                  </div>
                ))}
              </div>
              
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-white hover:bg-white/20"
                onClick={resetConversation}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                New Chat
              </Button>
              
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-white hover:bg-white/20"
                onClick={() => setShowManualOptions(!showManualOptions)}
              >
                <Home className="w-4 h-4 mr-2" />
                Manual Options
              </Button>
            </div>
          </div>
        </header>

        {/* Manual Options Panel */}
        {showManualOptions && (
          <div className="bg-white border-b shadow-sm px-6 py-4">
            <div className="max-w-5xl mx-auto">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-slate-600">Skip AI guidance and go directly to:</p>
                <Button variant="ghost" size="sm" onClick={() => setShowManualOptions(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Card 
                  className="cursor-pointer hover:shadow-md transition-all hover:border-[#007CC3]"
                  onClick={() => navigateToOption("/catalog")}
                >
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#007CC3]/10 rounded-lg flex items-center justify-center">
                      <Search className="w-5 h-5 text-[#007CC3]" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">Browse Catalog</p>
                      <p className="text-xs text-slate-500">30M+ Products & Services</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400 ml-auto" />
                  </CardContent>
                </Card>
                
                <Card 
                  className="cursor-pointer hover:shadow-md transition-all hover:border-purple-500"
                  onClick={() => navigateToOption("/upload-quotation")}
                >
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <FileUp className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">Upload Quotation</p>
                      <p className="text-xs text-slate-500">AI Price Benchmarking</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400 ml-auto" />
                  </CardContent>
                </Card>
                
                <Card 
                  className="cursor-pointer hover:shadow-md transition-all hover:border-[#FF6B00]"
                  onClick={() => navigateToOption("/sourcing-support")}
                >
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Handshake className="w-5 h-5 text-[#FF6B00]" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">Managed Services</p>
                      <p className="text-xs text-slate-500">Strategic Sourcing</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400 ml-auto" />
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* Chat Messages Area */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-5xl mx-auto space-y-6">
            {messages.map((msg) => (
              <div 
                key={msg.id}
                className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex gap-3 max-w-[85%] ${msg.type === 'user' ? 'flex-row-reverse' : ''}`}>
                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    msg.type === 'user' 
                      ? 'bg-slate-700' 
                      : 'bg-gradient-to-br from-[#007CC3] to-[#00629B]'
                  }`}>
                    {msg.type === 'user' ? (
                      <User className="w-5 h-5 text-white" />
                    ) : (
                      <Bot className="w-5 h-5 text-white" />
                    )}
                  </div>
                  
                  {/* Message Content */}
                  <div className={`rounded-2xl px-5 py-4 ${
                    msg.type === 'user'
                      ? 'bg-slate-700 text-white'
                      : msg.isError
                        ? 'bg-red-50 border border-red-200 text-slate-800'
                        : 'bg-white border border-slate-200 text-slate-800 shadow-sm'
                  }`}>
                    {/* AI Engines Used Badge */}
                    {msg.type === 'assistant' && msg.engines?.length > 0 && (
                      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-100">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <span className="text-xs text-slate-500">Analyzed by:</span>
                        {msg.engines.map(engineId => {
                          const engine = AI_ENGINES.find(e => e.id === engineId);
                          return engine ? (
                            <Badge key={engineId} variant="outline" className="text-xs">
                              {engine.icon} {engine.name}
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    )}
                    
                    {/* Message Text */}
                    <div className="text-sm leading-relaxed">
                      {renderMessageContent(msg.content)}
                    </div>
                    
                    {/* Search Results */}
                    {renderSearchResults(msg)}
                    
                    {/* Managed Service UNSPSC Suggestion */}
                    {msg.unspscSuggestion && (
                      <div className="mt-4 p-4 bg-orange-50 rounded-xl border border-orange-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Building2 className="w-5 h-5 text-[#FF6B00]" />
                          <span className="font-semibold text-slate-900">Category Classification</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-slate-500">UNSPSC Code</p>
                            <p className="font-mono font-semibold">{msg.unspscSuggestion.code}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Category Name</p>
                            <p className="font-semibold">{msg.unspscSuggestion.name}</p>
                          </div>
                        </div>
                        <p className="mt-3 text-sm text-orange-700">
                          <CheckCircle className="w-4 h-4 inline mr-1" />
                          A Category Expert will be in touch shortly.
                        </p>
                      </div>
                    )}
                    
                    {/* Timestamp */}
                    <p className={`text-xs mt-3 ${msg.type === 'user' ? 'text-slate-400' : 'text-slate-400'}`}>
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#007CC3] to-[#00629B] flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl px-5 py-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-[#007CC3] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-2 h-2 bg-[#007CC3] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-2 h-2 bg-[#007CC3] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </div>
                      <span className="text-sm text-slate-500">AI is analyzing...</span>
                      <div className="flex gap-1">
                        {activeEngines.map(engineId => {
                          const engine = AI_ENGINES.find(e => e.id === engineId);
                          return engine ? (
                            <span key={engineId} className="text-sm animate-pulse">{engine.icon}</span>
                          ) : null;
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Quick Actions */}
        {messages.length <= 1 && (
          <div className="px-6 pb-4">
            <div className="max-w-5xl mx-auto">
              <p className="text-sm text-slate-500 mb-3">Quick actions:</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_ACTIONS.map(action => (
                  <Button
                    key={action.id}
                    variant="outline"
                    className={action.color}
                    onClick={() => handleQuickAction(action.id)}
                  >
                    <action.icon className="w-4 h-4 mr-2" />
                    {action.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="bg-white border-t px-6 py-4">
          <div className="max-w-5xl mx-auto">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && processMessage(inputValue)}
                  placeholder="Describe what you're looking for..."
                  className="pr-12 py-6 text-base rounded-xl border-slate-200 focus:border-[#007CC3] focus:ring-[#007CC3]"
                  disabled={isTyping}
                />
                <Button
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#007CC3] hover:bg-[#00629B] rounded-lg"
                  onClick={() => processMessage(inputValue)}
                  disabled={!inputValue.trim() || isTyping}
                >
                  {isTyping ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2 text-center">
              Press Enter to send • Currency: {currency.code} ({currency.symbol})
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AIProcurementAgentPage;

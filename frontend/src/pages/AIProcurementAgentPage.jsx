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
  Zap, MessageSquare, RotateCcw, Home, Upload, Lightbulb, Info
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
  
  // Quotation upload state
  const [showQuotationUpload, setShowQuotationUpload] = useState(false);
  const [uploadingQuotation, setUploadingQuotation] = useState(false);
  const [quotationFile, setQuotationFile] = useState(null);
  const [supplierName, setSupplierName] = useState("");
  const [supplierEmail, setSupplierEmail] = useState("");
  const [quotationAnalysisResult, setQuotationAnalysisResult] = useState(null);
  const [aiAnalysisProgress, setAiAnalysisProgress] = useState(null);
  const fileInputRef = useRef(null);

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
        unspscSuggestion: aiResponse.unspsc_suggestion,
        showQuotationUpload: aiResponse.show_quotation_upload,
        showManagedServices: aiResponse.show_managed_services,
        intelligentGuidance: aiResponse.intelligent_guidance
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
      const cartPayload = {
        product_id: item.id || item.product_id || item.service_id,
        product_name: item.name,
        brand: item.brand || "N/A",
        sku: item.sku || item.id || "N/A",
        unspsc_code: item.unspsc_code || item.unspsc || "43211500",
        category: item.category || "General",
        quantity: 1,
        unit_price: item.price || item.rate || 0,
        total_price: item.price || item.rate || 0,
        currency_code: currency.code || "USD",
        image_url: item.image_url || null,
        is_service: type === "service"
      };
      
      await axios.post(`${API}/cart/add`, cartPayload, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      toast.success(`${item.name} added to cart!`);
    } catch (error) {
      console.error("Add to cart error:", error);
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

  // Handle quotation file selection
  const handleQuotationFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setQuotationFile(file);
      // Add message showing file selected
      const fileMsg = {
        id: Date.now(),
        type: "user",
        content: `📎 Selected file: **${file.name}** (${(file.size / 1024).toFixed(1)} KB)`,
        timestamp: new Date().toISOString(),
        isFileUpload: true
      };
      setMessages(prev => [...prev, fileMsg]);
    }
  };

  // Upload and analyze quotation with Real AI
  const handleQuotationUpload = async () => {
    if (!quotationFile) {
      toast.error("Please select a file first");
      return;
    }
    // Supplier name is now optional

    setUploadingQuotation(true);
    setAiAnalysisProgress({ gpt: 'analyzing', claude: 'waiting', gemini: 'waiting' });

    // Add processing message
    const processingMsg = {
      id: Date.now(),
      type: "assistant",
      content: "I'm analyzing your quotation with our AI-powered price benchmarking system. This uses **GPT-5.2**, **Claude Sonnet 4.5**, and **Gemini 3 Flash** working together.\n\n⏳ This typically takes **2-3 minutes** for complete analysis. Please wait...",
      timestamp: new Date().toISOString(),
      engines: ["gpt", "claude", "gemini"],
      isAnalyzing: true
    };
    setMessages(prev => [...prev, processingMsg]);

    try {
      const formData = new FormData();
      formData.append("file", quotationFile);
      formData.append("supplier_name", supplierName || "");
      formData.append("supplier_email", supplierEmail || "");
      formData.append("document_language", language);

      // Simulate progress updates with realistic timing (based on actual ~2.5 min processing)
      setTimeout(() => setAiAnalysisProgress({ gpt: 'analyzing', claude: 'analyzing', gemini: 'waiting' }), 5000);
      setTimeout(() => setAiAnalysisProgress({ gpt: 'complete', claude: 'analyzing', gemini: 'waiting' }), 45000);
      setTimeout(() => setAiAnalysisProgress({ gpt: 'complete', claude: 'complete', gemini: 'analyzing' }), 90000);
      setTimeout(() => setAiAnalysisProgress({ gpt: 'complete', claude: 'complete', gemini: 'analyzing' }), 120000);

      const response = await axios.post(`${API}/procurement/quotation/upload-with-ai`, formData, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "multipart/form-data"
        },
        timeout: 300000 // 5 minutes for Real AI analysis
      });

      setAiAnalysisProgress({ gpt: 'complete', claude: 'complete', gemini: 'complete' });

      if (response.data.success) {
        setQuotationAnalysisResult(response.data);
        
        // Remove the processing message and add the result
        setMessages(prev => {
          const filtered = prev.filter(m => !m.isAnalyzing);
          const analysis = response.data.analysis;
          const benchmark = analysis?.price_benchmark || {};
          const extractedData = analysis?.extracted_data || {};
          const lineItems = extractedData.line_items || [];
          const totalSavings = benchmark.total_potential_savings || 0;
          
          const resultMsg = {
            id: Date.now(),
            type: "assistant",
            content: `## ✅ Quotation Analysis Complete\n\n**Supplier:** ${extractedData.supplier?.name || supplierName}\n**Quote #:** ${extractedData.quotation_details?.quotation_number || 'N/A'}\n**Total Amount:** ${currency.symbol}${extractedData.quotation_details?.total_amount?.toLocaleString() || 'N/A'}\n\n### AI Price Benchmarking Results\n\n• **${lineItems.length} Line Items** analyzed\n• **${benchmark.benchmarks?.length || 0} Price Benchmarks** generated\n• **Potential Savings:** ${currency.symbol}${totalSavings.toLocaleString()}\n\nI found opportunities to save money on several items. Would you like me to:\n\n• **View detailed benchmarks** for each line item\n• **Add approved items to cart** for PunchOut transfer\n• **Escalate to Buying Desk** for negotiation support`,
            timestamp: new Date().toISOString(),
            engines: response.data.ai_engines_used || ["gpt", "claude", "gemini"],
            quotationAnalysis: response.data,
            showQuotationResults: true
          };
          return [...filtered, resultMsg];
        });

        toast.success("Quotation analyzed successfully with Real AI!");
        
        // Reset upload form
        setShowQuotationUpload(false);
        setQuotationFile(null);
        setSupplierName("");
        setSupplierEmail("");
      }
    } catch (error) {
      console.error("Quotation upload error:", error);
      setMessages(prev => {
        const filtered = prev.filter(m => !m.isAnalyzing);
        const errorMsg = {
          id: Date.now(),
          type: "assistant",
          content: error.code === 'ECONNABORTED' 
            ? "The AI analysis is taking longer than expected. This can happen with complex quotations. Would you like to:\n\n• **Try again** with the same file\n• **Use Demo Mode** for instant results\n• **Upload via the dedicated page** for more options"
            : `I encountered an issue analyzing your quotation: ${error.response?.data?.detail || error.message}\n\nWould you like to try again or use the dedicated upload page?`,
          timestamp: new Date().toISOString(),
          engines: [],
          isError: true,
          showQuotationUpload: true
        };
        return [...filtered, errorMsg];
      });
      toast.error("Failed to analyze quotation");
    } finally {
      setUploadingQuotation(false);
      setAiAnalysisProgress(null);
    }
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
                    <span className="text-lg font-bold text-[#007CC3]">{formatPrice(product.price, product.currency)}</span>
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
                    <span className="text-lg font-bold text-purple-600">{formatPrice(service.rate, service.currency)}</span>
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
                  onClick={() => setShowQuotationUpload(true)}
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
                    
                    {/* Intelligent Action Buttons - Show when no results or alternatives offered */}
                    {msg.type === 'assistant' && (msg.showQuotationUpload || msg.showManagedServices) && (
                      <div className="mt-4 p-4 bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl border border-slate-200">
                        <div className="flex items-center gap-2 mb-3">
                          <Lightbulb className="w-5 h-5 text-amber-500" />
                          <span className="font-semibold text-slate-700">Recommended Next Steps</span>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                          {msg.showQuotationUpload && (
                            <Button
                              onClick={() => setShowQuotationUpload(true)}
                              className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                              data-testid="ai-upload-quotation-btn"
                            >
                              <Upload className="w-4 h-4 mr-2" />
                              Upload Quotation for Analysis
                            </Button>
                          )}
                          {msg.showManagedServices && (
                            <Button
                              onClick={() => navigate("/sourcing-support")}
                              className="flex-1 bg-[#FF6B00] hover:bg-[#E65000]"
                              data-testid="ai-managed-services-btn"
                            >
                              <Handshake className="w-4 h-4 mr-2" />
                              Request Buying Desk Support
                            </Button>
                          )}
                        </div>
                        {msg.intelligentGuidance && (
                          <p className="mt-3 text-xs text-slate-500 flex items-center gap-1">
                            <Info className="w-3 h-3" />
                            {msg.intelligentGuidance.reason}
                          </p>
                        )}
                      </div>
                    )}
                    
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

        {/* Inline Quotation Upload Form */}
        {showQuotationUpload && (
          <div className="bg-gradient-to-r from-purple-50 via-blue-50 to-indigo-50 border-t border-purple-200 px-6 py-6">
            <div className="max-w-3xl mx-auto">
              <div className="bg-white rounded-2xl shadow-lg border border-purple-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center">
                      <FileUp className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-slate-900">Upload Quotation for AI Analysis</h3>
                      <p className="text-sm text-slate-500">Powered by GPT-5.2, Claude & Gemini</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => {
                    setShowQuotationUpload(false);
                    setQuotationFile(null);
                    setSupplierName("");
                    setSupplierEmail("");
                  }}>
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                {/* File Upload */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Quotation Document *
                    </label>
                    <div 
                      className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                        quotationFile 
                          ? 'border-purple-400 bg-purple-50' 
                          : 'border-slate-300 hover:border-purple-400 hover:bg-purple-50/50'
                      }`}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.xlsx,.xls,.png,.jpg,.jpeg"
                        onChange={handleQuotationFileSelect}
                        className="hidden"
                      />
                      {quotationFile ? (
                        <div className="flex items-center justify-center gap-3">
                          <CheckCircle className="w-8 h-8 text-purple-600" />
                          <div className="text-left">
                            <p className="font-semibold text-purple-900">{quotationFile.name}</p>
                            <p className="text-sm text-purple-600">{(quotationFile.size / 1024).toFixed(1)} KB</p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                          <p className="text-slate-600">Click to upload or drag & drop</p>
                          <p className="text-xs text-slate-400 mt-1">PDF, Excel, or Image (max 10MB)</p>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Supplier Name <span className="text-slate-400 font-normal">(optional)</span>
                      </label>
                      <Input
                        value={supplierName}
                        onChange={(e) => setSupplierName(e.target.value)}
                        placeholder="Enter supplier name"
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Supplier Email <span className="text-slate-400 font-normal">(optional)</span>
                      </label>
                      <Input
                        value={supplierEmail}
                        onChange={(e) => setSupplierEmail(e.target.value)}
                        placeholder="supplier@company.com"
                        className="w-full"
                      />
                    </div>
                  </div>

                  {/* AI Progress Indicator */}
                  {uploadingQuotation && aiAnalysisProgress && (
                    <div className="bg-slate-50 rounded-xl p-4 border">
                      <div className="flex items-center gap-2 mb-3">
                        <Brain className="w-5 h-5 text-purple-600 animate-pulse" />
                        <span className="font-semibold text-slate-900">AI Analysis in Progress</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          {aiAnalysisProgress.gpt === 'complete' ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <Loader2 className="w-4 h-4 animate-spin text-green-500" />
                          )}
                          <span className="text-sm">GPT-5.2: {aiAnalysisProgress.gpt === 'complete' ? 'Complete' : 'Extracting data...'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {aiAnalysisProgress.claude === 'complete' ? (
                            <CheckCircle className="w-4 h-4 text-purple-500" />
                          ) : aiAnalysisProgress.claude === 'analyzing' ? (
                            <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
                          )}
                          <span className="text-sm">Claude: {aiAnalysisProgress.claude === 'complete' ? 'Complete' : aiAnalysisProgress.claude === 'analyzing' ? 'Benchmarking...' : 'Waiting'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {aiAnalysisProgress.gemini === 'complete' ? (
                            <CheckCircle className="w-4 h-4 text-blue-500" />
                          ) : aiAnalysisProgress.gemini === 'analyzing' ? (
                            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
                          )}
                          <span className="text-sm">Gemini: {aiAnalysisProgress.gemini === 'complete' ? 'Complete' : aiAnalysisProgress.gemini === 'analyzing' ? 'Validating...' : 'Waiting'}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <Button
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 py-6"
                    onClick={handleQuotationUpload}
                    disabled={!quotationFile || uploadingQuotation}
                  >
                    {uploadingQuotation ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        AI Analyzing (please wait up to 3 minutes)...
                      </>
                    ) : (
                      <>
                        <Brain className="w-5 h-5 mr-2" />
                        Upload &amp; Analyze
                      </>
                    )}
                  </Button>
                </div>
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

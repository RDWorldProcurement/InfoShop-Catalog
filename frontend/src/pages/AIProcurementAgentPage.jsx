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
  Zap, MessageSquare, RotateCcw, Home, Upload, Lightbulb, Info,
  Target, TrendingDown, DollarSign, CreditCard
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
  const quotationUploadRef = useRef(null);
  
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
  const [analysisPercentage, setAnalysisPercentage] = useState(0);
  const fileInputRef = useRef(null);
  
  // Cart and transfer state
  const [selectedPaymentEntity, setSelectedPaymentEntity] = useState(null);
  const [selectedPunchoutSystem, setSelectedPunchoutSystem] = useState(null);
  const [addingToCart, setAddingToCart] = useState(false);
  const [transferringCart, setTransferringCart] = useState(false);
  
  // Buying Desk engagement state
  const [engagingBuyingDesk, setEngagingBuyingDesk] = useState(false);
  const [buyingDeskEngaged, setBuyingDeskEngaged] = useState({});

  // Payment entities
  const PAYMENT_ENTITIES = [
    { id: "infosys", name: "Infosys", description: "Payment handled by Infosys on behalf of customer", icon: "🏢" },
    { id: "propay", name: "ProPay", description: "Payment through ProPay procurement service", icon: "💳" },
    { id: "customer", name: "Direct by Customer", description: "Customer handles payment directly", icon: "👤" }
  ];

  // PunchOut systems
  const PUNCHOUT_SYSTEMS = [
    { name: "Coupa", logo: "https://logo.clearbit.com/coupa.com" },
    { name: "SAP Ariba", logo: "https://logo.clearbit.com/ariba.com" },
    { name: "SAP ERP", logo: "https://logo.clearbit.com/sap.com" },
    { name: "Ivalua", logo: "https://logo.clearbit.com/ivalua.com" },
    { name: "Oracle", logo: "https://logo.clearbit.com/oracle.com" }
  ];

  // Function to open quotation upload and scroll to it
  const openQuotationUpload = useCallback(() => {
    setShowQuotationUpload(true);
    // Use setTimeout to ensure the modal is rendered before scrolling
    setTimeout(() => {
      quotationUploadRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }, []);

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
    
    const msgLower = userMessage.toLowerCase();
    
    // ===== CONTEXT-AWARE HANDLING =====
    // Check if user is asking about existing quotation analysis
    if (quotationAnalysisResult) {
      const analysis = quotationAnalysisResult.analysis || quotationAnalysisResult;
      const extractedData = analysis.extracted_data || {};
      const lineItems = extractedData.line_items || [];
      const priceBenchmark = analysis.price_benchmark || {};
      const supplier = extractedData.supplier || {};
      const totals = extractedData.totals || {};
      
      // User asking about line items
      if (msgLower.includes('line item') || msgLower.includes('detail') || msgLower.includes('breakdown') || 
          msgLower.includes('show item') || msgLower.includes('view item') || msgLower.includes('list item')) {
        
        let itemsContent = `## 📋 Line Items from Your Quotation\n\n**Supplier:** ${supplier.name || 'N/A'}\n**Quote #:** ${extractedData.quotation_details?.quotation_number || 'N/A'}\n\n`;
        
        if (lineItems.length > 0) {
          itemsContent += `| # | Description | Qty | Unit Price | Total |\n|---|-------------|-----|------------|-------|\n`;
          lineItems.forEach((item, idx) => {
            itemsContent += `| ${idx + 1} | ${item.description || 'Item'} | ${item.quantity || 1} | ${currency.symbol}${(item.unit_price || 0).toLocaleString()} | ${currency.symbol}${(item.line_total || 0).toLocaleString()} |\n`;
          });
          itemsContent += `\n**Subtotal:** ${currency.symbol}${(totals.subtotal || 0).toLocaleString()}\n`;
          itemsContent += `**Tax:** ${currency.symbol}${(totals.tax_amount || 0).toLocaleString()}\n`;
          itemsContent += `**Grand Total:** ${currency.symbol}${(totals.grand_total || 0).toLocaleString()}\n`;
        } else {
          itemsContent += "No line items were extracted from this quotation.";
        }
        
        itemsContent += `\n\nWould you like to:\n• **Start AI Negotiation** to get better pricing\n• **Add items to Cart** for procurement\n• **Contact Buying Desk** for negotiation support`;
        
        const assistantMsg = {
          id: Date.now() + 1,
          type: "assistant",
          content: itemsContent,
          timestamp: new Date().toISOString(),
          engines: [],
          quotationAnalysis: quotationAnalysisResult,
          showQuotationResults: true
        };
        setMessages(prev => [...prev, assistantMsg]);
        return;
      }
      
      // User asking about savings
      if (msgLower.includes('saving') || msgLower.includes('benchmark') || msgLower.includes('market') || msgLower.includes('opportunity')) {
        const benchmarks = priceBenchmark.benchmarks || [];
        const totalSavings = priceBenchmark.total_potential_savings || 0;
        
        let savingsContent = `## 💰 Savings Analysis\n\n**Total Potential Savings:** ${currency.symbol}${totalSavings.toLocaleString()}\n\n`;
        
        if (benchmarks.length > 0) {
          savingsContent += `### Item-Level Benchmarking\n\n`;
          benchmarks.forEach((b, idx) => {
            const status = b.variance_percent > 10 ? '🔴 Above Market' : b.variance_percent > -5 ? '🟡 At Market' : '🟢 Below Market';
            savingsContent += `**${idx + 1}. ${b.item}**\n`;
            savingsContent += `   Quoted: ${currency.symbol}${(b.quoted_price || 0).toLocaleString()} | Market: ${currency.symbol}${(b.market_avg_price || 0).toLocaleString()} | ${status}\n`;
            savingsContent += `   Potential Savings: ${currency.symbol}${(b.potential_savings || 0).toLocaleString()}\n\n`;
          });
        }
        
        savingsContent += `\n**Ready to negotiate?** Use our AI Negotiation Agent to generate target prices and professional negotiation emails.`;
        
        const assistantMsg = {
          id: Date.now() + 1,
          type: "assistant",
          content: savingsContent,
          timestamp: new Date().toISOString(),
          engines: ["gpt", "claude", "gemini"],
          quotationAnalysis: quotationAnalysisResult,
          showQuotationResults: true
        };
        setMessages(prev => [...prev, assistantMsg]);
        return;
      }
      
      // User wants to add to cart
      if (msgLower.includes('add to cart') || msgLower.includes('cart') || msgLower.includes('checkout') || msgLower.includes('proceed')) {
        const assistantMsg = {
          id: Date.now() + 1,
          type: "assistant",
          content: `## 🛒 Add to Cart\n\nI'll add the items from your quotation to your procurement cart.\n\n**Please select the payment entity:**`,
          timestamp: new Date().toISOString(),
          engines: [],
          quotationAnalysis: quotationAnalysisResult,
          showPaymentEntitySelection: true,
          lineItems: lineItems
        };
        setMessages(prev => [...prev, assistantMsg]);
        return;
      }
      
      // User wants negotiation help
      if (msgLower.includes('negotiat') || msgLower.includes('buying desk') || msgLower.includes('help') || msgLower.includes('support')) {
        const assistantMsg = {
          id: Date.now() + 1,
          type: "assistant",
          content: `## 🤝 Negotiation Options\n\nI can help you get better pricing on this quotation:\n\n**Option 1: AI Negotiation Agent**\nOur AI will generate target prices and professional negotiation emails based on market data.\n\n**Option 2: Infosys Buying Desk**\nOur procurement specialists will negotiate directly with the supplier on your behalf.\n\nWhich would you prefer?`,
          timestamp: new Date().toISOString(),
          engines: [],
          quotationAnalysis: quotationAnalysisResult,
          showQuotationResults: true,
          showManagedServices: true
        };
        setMessages(prev => [...prev, assistantMsg]);
        return;
      }
    }
    
    // ===== STANDARD AI PROCESSING =====
    setIsTyping(true);
    setActiveEngines(["gpt", "claude", "gemini"]);

    try {
      // Build enhanced context with quotation data if available
      const enhancedContext = {
        ...conversationContext,
        ...(quotationAnalysisResult && {
          quotation_analyzed: true,
          quotation_id: quotationAnalysisResult.quotation_id,
          supplier_name: quotationAnalysisResult.analysis?.extracted_data?.supplier?.name || 
                         quotationAnalysisResult.extracted_data?.supplier?.name,
          quotation_total: quotationAnalysisResult.analysis?.extracted_data?.totals?.grand_total ||
                          quotationAnalysisResult.extracted_data?.totals?.grand_total || 0,
          line_items_count: (quotationAnalysisResult.analysis?.extracted_data?.line_items ||
                           quotationAnalysisResult.extracted_data?.line_items || []).length,
          potential_savings: quotationAnalysisResult.analysis?.price_benchmark?.total_potential_savings ||
                            quotationAnalysisResult.price_benchmark?.total_potential_savings || 0
        })
      };
      
      const response = await axios.post(`${API}/ai-agent/conversation`, {
        message: userMessage,
        session_id: sessionId,
        context: enhancedContext,
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
      
      // Handle follow-up actions for quotation context
      if (aiResponse.follow_up_action && quotationAnalysisResult) {
        const analysis = quotationAnalysisResult.analysis || quotationAnalysisResult;
        const extractedData = analysis.extracted_data || quotationAnalysisResult.extracted_data || {};
        const lineItems = extractedData.line_items || [];
        const priceBenchmark = analysis.price_benchmark || quotationAnalysisResult.price_benchmark || {};
        
        if (aiResponse.follow_up_action === 'show_line_items') {
          // Let the AI response show, but also add line items display
          const assistantMsg = {
            id: Date.now() + 1,
            type: "assistant",
            content: aiResponse.message,
            timestamp: new Date().toISOString(),
            engines: aiResponse.engines_used || ["gpt"],
            quotationAnalysis: quotationAnalysisResult,
            showQuotationResults: true,
            lineItemsDisplay: lineItems
          };
          setMessages(prev => [...prev, assistantMsg]);
          return;
        }
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
        intelligentGuidance: aiResponse.intelligent_guidance,
        followUpAction: aiResponse.follow_up_action,
        referencesPriorContext: aiResponse.references_prior_context
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

  // Handle payment entity selection
  const handlePaymentEntitySelect = async (entity) => {
    setSelectedPaymentEntity(entity);
    
    // Add confirmation message
    const confirmMsg = {
      id: Date.now(),
      type: "assistant",
      content: `## ✅ Payment Entity Selected: ${entity.name}\n\n${entity.description}\n\n**Now select your PunchOut system to transfer the cart:**`,
      timestamp: new Date().toISOString(),
      engines: [],
      showPunchoutSelection: true,
      paymentEntity: entity
    };
    setMessages(prev => [...prev, confirmMsg]);
  };

  // Handle adding quotation items to cart
  const handleAddQuotationToCart = async (lineItems, paymentEntity) => {
    if (!lineItems || lineItems.length === 0) {
      toast.error("No items to add to cart");
      return;
    }
    
    setAddingToCart(true);
    try {
      let addedCount = 0;
      for (const item of lineItems) {
        const cartPayload = {
          product_id: `quot-${Date.now()}-${addedCount}`,
          product_name: item.description || `Item ${addedCount + 1}`,
          brand: "Supplier Quotation",
          sku: item.part_number || `SKU-${addedCount}`,
          unspsc_code: "43211500",
          category: item.category || "Quotation Items",
          quantity: item.quantity || 1,
          unit_price: item.unit_price || 0,
          total_price: item.line_total || (item.unit_price * (item.quantity || 1)),
          currency_code: currency.code || "USD",
          image_url: null,
          is_service: false,
          payment_entity: paymentEntity?.id || "customer"
        };
        
        await axios.post(`${API}/cart/add`, cartPayload, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        addedCount++;
      }
      
      toast.success(`${addedCount} items added to cart!`);
      
      // Add success message
      const successMsg = {
        id: Date.now(),
        type: "assistant",
        content: `## ✅ Items Added to Cart\n\n**${addedCount} items** from your quotation have been added to your procurement cart.\n\n**Payment Entity:** ${paymentEntity?.name || 'Direct'}\n\n**Ready to complete the order?** Select a PunchOut system to transfer the cart:`,
        timestamp: new Date().toISOString(),
        engines: [],
        showPunchoutSelection: true,
        cartItemsCount: addedCount
      };
      setMessages(prev => [...prev, successMsg]);
      
    } catch (error) {
      console.error("Add to cart error:", error);
      toast.error("Failed to add items to cart");
    } finally {
      setAddingToCart(false);
    }
  };

  // Handle cart transfer to PunchOut system
  const handleCartTransfer = async (system) => {
    setTransferringCart(true);
    setSelectedPunchoutSystem(system);
    
    try {
      // Get cart items first
      const cartResponse = await axios.get(`${API}/cart`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      const cartItems = cartResponse.data.items || [];
      if (cartItems.length === 0) {
        toast.error("Cart is empty");
        return;
      }
      
      // Transfer cart
      const transferResponse = await axios.post(`${API}/cart/transfer`, {
        system: system.name,
        cart_items: cartItems.map(item => item.id)
      }, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      toast.success(`Cart transferred to ${system.name}!`);
      
      // Add success message
      const successMsg = {
        id: Date.now(),
        type: "assistant",
        content: `## 🎉 Cart Transfer Complete!\n\n**System:** ${system.name}\n**Items Transferred:** ${cartItems.length}\n**Transfer ID:** ${transferResponse.data.transfer_id || 'N/A'}\n\nYour procurement request has been submitted. You can track its status in your ${system.name} dashboard.\n\n**What would you like to do next?**`,
        timestamp: new Date().toISOString(),
        engines: [],
        transferComplete: true,
        transferSystem: system.name
      };
      setMessages(prev => [...prev, successMsg]);
      
      // Reset state
      setSelectedPaymentEntity(null);
      setSelectedPunchoutSystem(null);
      
    } catch (error) {
      console.error("Cart transfer error:", error);
      toast.error(`Failed to transfer cart to ${system.name}`);
    } finally {
      setTransferringCart(false);
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
    setAnalysisPercentage(0);

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

    // Real-time percentage progress simulation (total ~150 seconds = 2.5 min)
    // Phase 1: GPT analyzing (0-35%) - 0-45 sec
    // Phase 2: Claude analyzing (35-70%) - 45-90 sec  
    // Phase 3: Gemini validating (70-95%) - 90-140 sec
    // Phase 4: Final processing (95-100%) - 140-150 sec
    const progressIntervals = [];
    
    // Phase 1: GPT (0-35%)
    for (let i = 0; i <= 35; i += 2) {
      progressIntervals.push(setTimeout(() => setAnalysisPercentage(i), i * 1200));
    }
    // Update status after 5 sec
    progressIntervals.push(setTimeout(() => {
      setAiAnalysisProgress({ gpt: 'analyzing', claude: 'analyzing', gemini: 'waiting' });
    }, 5000));
    
    // Phase 2: Claude (35-70%)
    for (let i = 36; i <= 70; i += 2) {
      progressIntervals.push(setTimeout(() => setAnalysisPercentage(i), 42000 + (i - 35) * 1300));
    }
    // GPT complete at 45 sec
    progressIntervals.push(setTimeout(() => {
      setAiAnalysisProgress({ gpt: 'complete', claude: 'analyzing', gemini: 'waiting' });
    }, 45000));
    
    // Phase 3: Gemini (70-95%)
    for (let i = 71; i <= 95; i += 2) {
      progressIntervals.push(setTimeout(() => setAnalysisPercentage(i), 88000 + (i - 70) * 1200));
    }
    // Claude complete, Gemini starts at 90 sec
    progressIntervals.push(setTimeout(() => {
      setAiAnalysisProgress({ gpt: 'complete', claude: 'complete', gemini: 'analyzing' });
    }, 90000));

    try {
      const formData = new FormData();
      formData.append("file", quotationFile);
      formData.append("supplier_name", supplierName || "");
      formData.append("supplier_email", supplierEmail || "");
      formData.append("document_language", language);

      const response = await axios.post(`${API}/procurement/quotation/upload-with-ai`, formData, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "multipart/form-data"
        },
        timeout: 300000 // 5 minutes for Real AI analysis
      });
      
      // Clear all intervals
      progressIntervals.forEach(interval => clearTimeout(interval));

      // Set to 100% complete
      setAnalysisPercentage(100);
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
      // Clear all intervals on error
      progressIntervals.forEach(interval => clearTimeout(interval));
      
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
      setAnalysisPercentage(0);
    }
  };

  // Engage Infosys Buying Desk with context
  const handleEngageBuyingDesk = async (context = {}) => {
    setEngagingBuyingDesk(true);
    
    try {
      // Build request data with all available context
      const requestData = {
        request_type: context.requestType || "general_sourcing",
        description: context.description || conversationContext.searchQuery || "Procurement assistance requested",
        quotation_id: context.quotationId || quotationAnalysisResult?.quotation_id || null,
        search_query: conversationContext.searchQuery,
        unspsc_code: conversationContext.unspscCode,
        category_name: conversationContext.categoryName,
        supplier_info: context.supplierInfo || conversationContext.supplierInfo,
        line_items: context.lineItems || quotationAnalysisResult?.data?.line_items || [],
        potential_savings: context.potentialSavings || null,
        user_notes: context.notes || "",
        session_id: sessionId
      };

      const response = await axios.post(`${API}/procurement/buying-desk/engage`, requestData, {
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (response.data.success) {
        // Track which context this engagement is for
        const engagementKey = context.quotationId || context.messageId || 'general';
        setBuyingDeskEngaged(prev => ({ ...prev, [engagementKey]: true }));
        
        // Add confirmation message to chat
        const confirmMsg = {
          id: Date.now(),
          type: "assistant",
          content: `## ✅ Infosys Buying Desk Engaged\n\n**Request ID:** ${response.data.request_id}\n\nOur procurement specialists have been notified and will review your request:\n\n${context.quotationId ? `• **Quotation:** ${context.supplierName || 'Attached quotation'}\n• **Potential Savings:** ${context.potentialSavings || 'To be determined'}\n` : ''}${conversationContext.searchQuery ? `• **Your Request:** ${conversationContext.searchQuery}\n` : ''}• **Priority:** ${response.data.priority || 'Standard'}\n\n📞 **A specialist will contact you within 2-4 business hours.**\n\nIn the meantime, feel free to continue searching or upload additional quotations.`,
          timestamp: new Date().toISOString(),
          engines: [],
          buyingDeskConfirmation: true,
          requestId: response.data.request_id
        };
        setMessages(prev => [...prev, confirmMsg]);
        
        toast.success("Infosys Buying Desk has been notified!");
      }
    } catch (error) {
      console.error("Buying desk engagement error:", error);
      toast.error("Failed to engage Buying Desk. Please try again.");
    } finally {
      setEngagingBuyingDesk(false);
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
                  onClick={openQuotationUpload}
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
                    
                    {/* Payment Entity Selection */}
                    {msg.showPaymentEntitySelection && (
                      <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                        <div className="flex items-center gap-2 mb-3">
                          <DollarSign className="w-5 h-5 text-blue-600" />
                          <span className="font-semibold text-slate-700">Select Payment Entity</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {PAYMENT_ENTITIES.map((entity) => (
                            <div
                              key={entity.id}
                              onClick={() => {
                                handlePaymentEntitySelect(entity);
                                // Add items to cart with selected entity
                                if (msg.lineItems) {
                                  handleAddQuotationToCart(msg.lineItems, entity);
                                }
                              }}
                              className={`p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md ${
                                selectedPaymentEntity?.id === entity.id
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-slate-200 bg-white hover:border-blue-300'
                              }`}
                            >
                              <div className="text-2xl mb-2">{entity.icon}</div>
                              <p className="font-semibold text-slate-900">{entity.name}</p>
                              <p className="text-xs text-slate-500 mt-1">{entity.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* PunchOut System Selection */}
                    {msg.showPunchoutSelection && (
                      <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                        <div className="flex items-center gap-2 mb-3">
                          <ArrowRight className="w-5 h-5 text-green-600" />
                          <span className="font-semibold text-slate-700">Transfer to PunchOut System</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                          {PUNCHOUT_SYSTEMS.map((system) => (
                            <div
                              key={system.name}
                              onClick={() => handleCartTransfer(system)}
                              className={`p-3 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md flex flex-col items-center ${
                                selectedPunchoutSystem?.name === system.name
                                  ? 'border-green-500 bg-green-50'
                                  : 'border-slate-200 bg-white hover:border-green-300'
                              } ${transferringCart ? 'opacity-50 pointer-events-none' : ''}`}
                            >
                              <img 
                                src={system.logo} 
                                alt={system.name}
                                className="w-10 h-10 object-contain mb-2"
                                onError={(e) => { e.target.style.display = 'none'; }}
                              />
                              <p className="font-medium text-slate-900 text-sm text-center">{system.name}</p>
                              {transferringCart && selectedPunchoutSystem?.name === system.name && (
                                <Loader2 className="w-4 h-4 animate-spin text-green-600 mt-1" />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Transfer Complete */}
                    {msg.transferComplete && (
                      <div className="mt-4 p-4 bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl border border-green-300">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <span className="font-semibold text-green-800">Transfer Successful!</span>
                        </div>
                        <p className="text-sm text-green-700">
                          Your cart has been transferred to {msg.transferSystem}. Check your {msg.transferSystem} dashboard for order status.
                        </p>
                      </div>
                    )}
                    
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
                              onClick={openQuotationUpload}
                              className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                              data-testid="ai-upload-quotation-btn"
                            >
                              <Upload className="w-4 h-4 mr-2" />
                              Upload Quotation for Analysis
                            </Button>
                          )}
                          {msg.showManagedServices && (
                            <Button
                              onClick={() => handleEngageBuyingDesk({
                                requestType: "general_sourcing",
                                description: conversationContext.searchQuery || msg.content?.substring(0, 200),
                                messageId: msg.id
                              })}
                              disabled={engagingBuyingDesk || buyingDeskEngaged[msg.id]}
                              className={`flex-1 ${buyingDeskEngaged[msg.id] ? 'bg-green-600' : 'bg-[#FF6B00] hover:bg-[#E65000]'}`}
                              data-testid="ai-managed-services-btn"
                            >
                              {engagingBuyingDesk ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : buyingDeskEngaged[msg.id] ? (
                                <CheckCircle className="w-4 h-4 mr-2" />
                              ) : (
                                <Handshake className="w-4 h-4 mr-2" />
                              )}
                              {buyingDeskEngaged[msg.id] ? 'Buying Desk Notified' : 'Request Buying Desk Support'}
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

                    {/* Quotation Analysis Actions */}
                    {msg.showQuotationResults && msg.quotationAnalysis && (
                      <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                        <div className="flex items-center gap-2 mb-3">
                          <TrendingDown className="w-5 h-5 text-green-600" />
                          <span className="font-semibold text-slate-900">Negotiation Opportunity Identified</span>
                        </div>
                        <p className="text-sm text-slate-600 mb-4">
                          Our AI analysis found potential savings. Use the Negotiation Agent to automatically generate 
                          target prices and negotiation emails based on market data.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <Button
                            onClick={() => navigate(`/negotiation/${msg.quotationAnalysis.quotation_id}`)}
                            className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                            data-testid="start-negotiation-btn"
                          >
                            <Target className="w-4 h-4 mr-2" />
                            Start AI Negotiation
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handleEngageBuyingDesk({
                              requestType: "quotation_negotiation",
                              quotationId: msg.quotationAnalysis.quotation_id,
                              supplierName: msg.quotationAnalysis.supplier_name,
                              potentialSavings: `${currency.symbol}${msg.quotationAnalysis.potential_savings?.toLocaleString() || '0'}`,
                              lineItems: msg.quotationAnalysis.line_items,
                              messageId: `quot_${msg.quotationAnalysis.quotation_id}`
                            })}
                            disabled={engagingBuyingDesk || buyingDeskEngaged[`quot_${msg.quotationAnalysis.quotation_id}`]}
                            className={`flex-1 ${buyingDeskEngaged[`quot_${msg.quotationAnalysis.quotation_id}`] ? 'border-green-500 text-green-700' : ''}`}
                          >
                            {engagingBuyingDesk ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : buyingDeskEngaged[`quot_${msg.quotationAnalysis.quotation_id}`] ? (
                              <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                            ) : (
                              <Handshake className="w-4 h-4 mr-2" />
                            )}
                            {buyingDeskEngaged[`quot_${msg.quotationAnalysis.quotation_id}`] ? 'Buying Desk Notified' : 'Escalate to Buying Desk'}
                          </Button>
                        </div>
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
          <div 
            ref={quotationUploadRef}
            className="bg-gradient-to-r from-purple-50 via-blue-50 to-indigo-50 border-t border-purple-200 px-6 py-6"
          >
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

                  {/* AI Progress Indicator with Real-time Percentage */}
                  {uploadingQuotation && aiAnalysisProgress && (
                    <div className="bg-slate-50 rounded-xl p-4 border">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Brain className="w-5 h-5 text-purple-600 animate-pulse" />
                          <span className="font-semibold text-slate-900">AI Analysis in Progress</span>
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-bold text-purple-600">{analysisPercentage}%</span>
                          <p className="text-xs text-slate-500">Complete</p>
                        </div>
                      </div>
                      
                      {/* Overall Progress Bar */}
                      <div className="w-full bg-slate-200 rounded-full h-3 mb-4 overflow-hidden">
                        <div 
                          className="h-3 rounded-full bg-gradient-to-r from-purple-500 via-blue-500 to-green-500 transition-all duration-500 ease-out"
                          style={{ width: `${analysisPercentage}%` }}
                        />
                      </div>
                      
                      <div className="space-y-3">
                        {/* GPT-5.2 */}
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center bg-green-100">
                            {aiAnalysisProgress.gpt === 'complete' ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : aiAnalysisProgress.gpt === 'analyzing' ? (
                              <Loader2 className="w-4 h-4 animate-spin text-green-500" />
                            ) : (
                              <div className="w-3 h-3 rounded-full border-2 border-slate-300" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium">🤖 GPT-5.2</span>
                              <span className="text-xs text-slate-500">
                                {aiAnalysisProgress.gpt === 'complete' ? '100%' : aiAnalysisProgress.gpt === 'analyzing' ? 'In progress...' : 'Waiting'}
                              </span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-1.5">
                              <div 
                                className="h-1.5 rounded-full bg-green-500 transition-all duration-300"
                                style={{ width: aiAnalysisProgress.gpt === 'complete' ? '100%' : aiAnalysisProgress.gpt === 'analyzing' ? '60%' : '0%' }}
                              />
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">Extracting & analyzing data</p>
                          </div>
                        </div>
                        
                        {/* Claude */}
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center bg-purple-100">
                            {aiAnalysisProgress.claude === 'complete' ? (
                              <CheckCircle className="w-4 h-4 text-purple-500" />
                            ) : aiAnalysisProgress.claude === 'analyzing' ? (
                              <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                            ) : (
                              <div className="w-3 h-3 rounded-full border-2 border-slate-300" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium">🧠 Claude Sonnet 4.5</span>
                              <span className="text-xs text-slate-500">
                                {aiAnalysisProgress.claude === 'complete' ? '100%' : aiAnalysisProgress.claude === 'analyzing' ? 'In progress...' : 'Waiting'}
                              </span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-1.5">
                              <div 
                                className="h-1.5 rounded-full bg-purple-500 transition-all duration-300"
                                style={{ width: aiAnalysisProgress.claude === 'complete' ? '100%' : aiAnalysisProgress.claude === 'analyzing' ? '60%' : '0%' }}
                              />
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">Price benchmarking & market rates</p>
                          </div>
                        </div>
                        
                        {/* Gemini */}
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center bg-blue-100">
                            {aiAnalysisProgress.gemini === 'complete' ? (
                              <CheckCircle className="w-4 h-4 text-blue-500" />
                            ) : aiAnalysisProgress.gemini === 'analyzing' ? (
                              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                            ) : (
                              <div className="w-3 h-3 rounded-full border-2 border-slate-300" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium">⚡ Gemini 3 Flash</span>
                              <span className="text-xs text-slate-500">
                                {aiAnalysisProgress.gemini === 'complete' ? '100%' : aiAnalysisProgress.gemini === 'analyzing' ? 'In progress...' : 'Waiting'}
                              </span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-1.5">
                              <div 
                                className="h-1.5 rounded-full bg-blue-500 transition-all duration-300"
                                style={{ width: aiAnalysisProgress.gemini === 'complete' ? '100%' : aiAnalysisProgress.gemini === 'analyzing' ? '60%' : '0%' }}
                              />
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">Cross-validation & recommendations</p>
                          </div>
                        </div>
                      </div>
                      
                      <p className="mt-4 text-xs text-center text-slate-500">
                        ⏱️ Typical analysis time: 2-3 minutes
                      </p>
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

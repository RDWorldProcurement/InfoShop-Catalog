import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, API } from "../App";
import { useLanguage } from "../i18n/LanguageContext";
import axios from "axios";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { toast } from "sonner";
import {
  Upload, FileUp, Brain, CheckCircle, AlertTriangle, Clock, DollarSign,
  FileText, ArrowRight, X, Loader2, TrendingUp, TrendingDown, Minus,
  Calculator, Scale, Flag, ShoppingCart, Handshake, ChevronDown, ChevronUp,
  Building2, Mail, Phone, Receipt, Package, Sparkles, Zap, Database,
  Search, Globe, BarChart3, CircleDot, Play
} from "lucide-react";
import Sidebar from "../components/Sidebar";

const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "fr", name: "French", flag: "🇫🇷" },
  { code: "de", name: "German", flag: "🇩🇪" },
  { code: "es", name: "Spanish", flag: "🇪🇸" },
  { code: "it", name: "Italian", flag: "🇮🇹" },
  { code: "nl", name: "Dutch", flag: "🇳🇱" },
  { code: "zh", name: "Chinese", flag: "🇨🇳" },
  { code: "pt", name: "Portuguese", flag: "🇵🇹" }
];

const INVOICE_HANDLING_OPTIONS = [
  { id: "infosys_limited", name: "Infosys Limited", description: "Consolidated invoicing through Infosys entity", logo: "https://customer-assets.emergentagent.com/job_infosys-mro/artifacts/5v2g4s4l_Infosys%20BPM%20Logo.png" },
  { id: "propay", name: "ProPay World Wide Inc.", description: "Third-party payment processing partner", logo: "https://customer-assets.emergentagent.com/job_procure-ai-fusion/artifacts/tst2i955_ProPay.ai%20Logo%202.svg" },
  { id: "customer_direct", name: "Customer Direct", description: "Direct invoicing from supplier to customer", logo: null }
];

// AI Engine logos/icons
const AI_ENGINES = [
  { id: "openai", name: "OpenAI GPT-5.2", color: "from-green-500 to-emerald-600", icon: "🤖", specialty: "Product Price Analysis" },
  { id: "claude", name: "Claude Sonnet 4.5", color: "from-orange-500 to-amber-600", icon: "🧠", specialty: "Professional Services Rates" },
  { id: "gemini", name: "Gemini 3 Flash", color: "from-blue-500 to-cyan-600", icon: "⚡", specialty: "Cross-Validation & Synthesis" }
];

const UploadQuotationPage = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { t } = useLanguage();
  
  const [file, setFile] = useState(null);
  const [supplierName, setSupplierName] = useState("");
  const [supplierEmail, setSupplierEmail] = useState("");
  const [documentLanguage, setDocumentLanguage] = useState("en");
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [showDetails, setShowDetails] = useState({});
  const [escalateModalOpen, setEscalateModalOpen] = useState(false);
  const [escalateNotes, setEscalateNotes] = useState("");
  const [engagingBuyers, setEngagingBuyers] = useState(false);
  const [buyersEngaged, setBuyersEngaged] = useState(false);
  const [invoiceHandlingEntity, setInvoiceHandlingEntity] = useState("infosys_limited");
  
  // Demo mode states
  const [demoMode, setDemoMode] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const [aiEngineStatus, setAiEngineStatus] = useState({
    openai: { status: 'idle', progress: 0 },
    claude: { status: 'idle', progress: 0 },
    gemini: { status: 'idle', progress: 0 }
  });
  const [showAiAnalysis, setShowAiAnalysis] = useState(false);
  const [useRealAi, setUseRealAi] = useState(false);

  const handleFileDrop = useCallback((e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer?.files[0] || e.target.files[0];
    if (droppedFile) {
      const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (allowedTypes.includes(droppedFile.type) || droppedFile.name.match(/\.(pdf|png|jpg|jpeg|xlsx|xls|doc|docx)$/i)) {
        setFile(droppedFile);
      } else {
        toast.error("Please upload a PDF, image, Excel, or Word document");
      }
    }
  }, []);

  // Simulate AI engine progress
  const simulateAiProgress = async (engineId, delay) => {
    for (let i = 0; i <= 100; i += 5) {
      await new Promise(resolve => setTimeout(resolve, delay));
      setAiEngineStatus(prev => ({
        ...prev,
        [engineId]: { status: i < 100 ? 'analyzing' : 'complete', progress: i }
      }));
    }
  };

  // Handle demo quotation analysis
  const handleDemoAnalysis = async () => {
    setDemoMode(true);
    setShowAiAnalysis(true);
    setDemoStep(1);
    
    // Reset AI status
    setAiEngineStatus({
      openai: { status: 'starting', progress: 0 },
      claude: { status: 'waiting', progress: 0 },
      gemini: { status: 'waiting', progress: 0 }
    });

    // Simulate file upload
    await new Promise(resolve => setTimeout(resolve, 500));
    setDemoStep(2);
    
    // Start all AI engines in parallel
    setAiEngineStatus({
      openai: { status: 'analyzing', progress: 0 },
      claude: { status: 'analyzing', progress: 0 },
      gemini: { status: 'waiting', progress: 0 }
    });

    // Simulate parallel AI analysis
    await Promise.all([
      simulateAiProgress('openai', 40),
      simulateAiProgress('claude', 50)
    ]);

    // Start Gemini for cross-validation
    setAiEngineStatus(prev => ({
      ...prev,
      gemini: { status: 'analyzing', progress: 0 }
    }));
    await simulateAiProgress('gemini', 30);

    setDemoStep(3);
    
    // Fetch actual demo results from backend
    try {
      const response = await axios.get(`${API}/procurement/quotation/demo-analysis`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setAnalysisResult(response.data);
        setDemoMode(false);
        setShowAiAnalysis(false);
        toast.success("AI Analysis Complete! 3 AI Engines processed your quotation.");
      }
    } catch (error) {
      console.error("Demo analysis error:", error);
      toast.error("Failed to load demo analysis");
      setDemoMode(false);
      setShowAiAnalysis(false);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file to upload");
      return;
    }

    setUploading(true);
    setShowAiAnalysis(useRealAi);
    
    if (useRealAi) {
      // Reset AI status for real analysis
      setAiEngineStatus({
        openai: { status: 'starting', progress: 0 },
        claude: { status: 'waiting', progress: 0 },
        gemini: { status: 'waiting', progress: 0 }
      });
    }

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("supplier_name", supplierName);
      formData.append("supplier_email", supplierEmail);
      formData.append("document_language", documentLanguage);
      formData.append("notes", notes);

      // Choose endpoint based on AI mode
      const endpoint = useRealAi 
        ? `${API}/procurement/quotation/upload-with-ai`
        : `${API}/procurement/quotation/upload`;

      if (useRealAi) {
        // Simulate AI progress while waiting for response
        const progressPromise = (async () => {
          setAiEngineStatus({
            openai: { status: 'analyzing', progress: 0 },
            claude: { status: 'analyzing', progress: 0 },
            gemini: { status: 'waiting', progress: 0 }
          });
          await Promise.all([
            simulateAiProgress('openai', 80),
            simulateAiProgress('claude', 100)
          ]);
          setAiEngineStatus(prev => ({
            ...prev,
            gemini: { status: 'analyzing', progress: 0 }
          }));
          await simulateAiProgress('gemini', 60);
        })();
      }

      const response = await axios.post(endpoint, formData, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "multipart/form-data"
        }
      });

      if (response.data.success) {
        setAnalysisResult(response.data);
        toast.success(useRealAi 
          ? "Quotation analyzed with real AI price benchmarking!" 
          : "Quotation analyzed successfully!"
        );
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error.response?.data?.detail || "Failed to upload quotation");
    } finally {
      setUploading(false);
      setShowAiAnalysis(false);
    }
  };

  const handleEscalate = async () => {
    try {
      const formData = new FormData();
      formData.append("notes", escalateNotes);
      
      await axios.post(`${API}/procurement/quotation/${analysisResult.quotation_id}/escalate`, formData, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      toast.success("Escalated to Infosys negotiation team!");
      setEscalateModalOpen(false);
    } catch (error) {
      toast.error("Failed to escalate quotation");
    }
  };

  const handleAddToCart = async () => {
    try {
      const response = await axios.post(`${API}/procurement/quotation/${analysisResult.quotation_id}/add-to-cart`, {}, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      toast.success(`${response.data.items_added} items added to cart!`);
      navigate("/catalog?openCart=true");
    } catch (error) {
      toast.error("Failed to add items to cart");
    }
  };

  const handleEngageTacticalBuyers = async () => {
    setEngagingBuyers(true);
    try {
      const response = await axios.post(`${API}/procurement/quotation/${analysisResult.quotation_id}/engage-tactical-buyers`, {}, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setBuyersEngaged(true);
        toast.success("Infosys Tactical Buying Team has been notified!");
      }
    } catch (error) {
      toast.error("Failed to engage tactical buyers");
    } finally {
      setEngagingBuyers(false);
    }
  };

  const toggleDetails = (section) => {
    setShowDetails(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const resetForm = () => {
    setFile(null);
    setSupplierName("");
    setSupplierEmail("");
    setNotes("");
    setAnalysisResult(null);
    setDemoMode(false);
    setShowAiAnalysis(false);
  };

  if (!user) {
    navigate("/login");
    return null;
  }

  // Render helper for AI engine status badge
  const renderAiStatusBadge = (status) => {
    if (status.status === 'complete') {
      return (
        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
          <CheckCircle className="w-3 h-3 mr-1" /> Complete
        </Badge>
      );
    } else if (status.status === 'analyzing') {
      return (
        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 animate-pulse">
          <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Analyzing
        </Badge>
      );
    } else if (status.status === 'waiting') {
      return (
        <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">
          <Clock className="w-3 h-3 mr-1" /> Waiting
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
          <Zap className="w-3 h-3 mr-1" /> Starting
        </Badge>
      );
    }
  };

  // Render helper for AI engine analysis text
  const getAnalysisText = (engineId) => {
    if (engineId === 'openai') return 'Querying market databases, supplier catalogs...';
    if (engineId === 'claude') return 'Analyzing Robert Half data, PayScale, industry rates...';
    if (engineId === 'gemini') return 'Cross-validating results, calculating confidence scores...';
    return '';
  };

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar activePage="upload-quotation" />
      
      {/* AI Analysis Overlay */}
      {(showAiAnalysis || demoMode) && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center">
          <Card className="w-full max-w-2xl mx-4 bg-slate-900 border-slate-700">
            <CardHeader className="border-b border-slate-700">
              <CardTitle className="text-white flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center animate-pulse">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <div>
                  <span>AI Price Benchmarking in Progress</span>
                  <p className="text-sm font-normal text-slate-400 mt-1">3 AI Engines analyzing your quotation</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {AI_ENGINES.map((engine) => {
                const status = aiEngineStatus[engine.id];
                return (
                  <div key={engine.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${engine.color} flex items-center justify-center text-white text-xl`}>
                          {engine.icon}
                        </div>
                        <div>
                          <p className="font-semibold text-white">{engine.name}</p>
                          <p className="text-xs text-slate-400">{engine.specialty}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {renderAiStatusBadge(status)}
                      </div>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full bg-gradient-to-r ${engine.color} transition-all duration-300`}
                        style={{ width: `${status.progress}%` }}
                      />
                    </div>
                    {status.status === 'analyzing' && (
                      <div className="text-xs text-slate-500 flex items-center gap-2">
                        <CircleDot className="w-3 h-3 animate-pulse" />
                        {getAnalysisText(engine.id)}
                      </div>
                    )}
                  </div>
                );
              })}
              
              <div className="pt-4 border-t border-slate-700">
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                  <Database className="w-4 h-4" />
                  <span>Data sources: Grainger, MSC Industrial, Robert Half, PayScale, CAT Parts, Industry Reports</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        <div className="max-w-6xl mx-auto">
          {/* Infosys AI Banner */}
          <div className="mb-6 bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 text-white px-6 py-4 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Brain className="w-7 h-7 text-white" />
                </div>
                <div>
                  <span className="font-bold text-xl" style={{ fontFamily: 'Manrope' }}>Infosys AI Enabled Intelligent Buying</span>
                  <p className="text-white/80 text-sm">Powered by GPT-5.2, Claude Sonnet 4.5 & Gemini 3 Flash</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {AI_ENGINES.map(engine => (
                  <div key={engine.id} className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-lg" title={engine.name}>
                    {engine.icon}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-blue-100 rounded-xl flex items-center justify-center">
                  <Brain className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
                    AI Enabled Intelligent Buying
                  </h1>
                  <p className="text-slate-600">Upload quotation for real AI-powered price benchmarking analysis</p>
                </div>
              </div>
              
              {/* Use Already Available Quotations Button */}
              {!analysisResult && (
                <Button
                  onClick={handleDemoAnalysis}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                  data-testid="demo-quotation-btn"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Use Already Available Quotations
                </Button>
              )}
            </div>
          </div>

          {!analysisResult ? (
            /* Upload Form */
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Main Upload Area */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Upload className="w-5 h-5" />
                        Upload Document
                      </div>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="real-ai-toggle" className="text-sm font-normal text-slate-600">
                          Use Real AI Analysis
                        </Label>
                        <input
                          id="real-ai-toggle"
                          type="checkbox"
                          checked={useRealAi}
                          onChange={(e) => setUseRealAi(e.target.checked)}
                          className="w-4 h-4 accent-purple-600"
                        />
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* AI Engines Info */}
                    {useRealAi && (
                      <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-200">
                        <p className="text-sm font-semibold text-purple-900 mb-2 flex items-center gap-2">
                          <Sparkles className="w-4 h-4" /> Real AI Analysis Enabled
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {AI_ENGINES.map(engine => (
                            <Badge key={engine.id} variant="outline" className="bg-white">
                              {engine.icon} {engine.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Drop Zone */}
                    <div
                      className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                        file ? 'border-green-400 bg-green-50' : 'border-slate-300 hover:border-purple-400 hover:bg-purple-50'
                      }`}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleFileDrop}
                    >
                      {file ? (
                        <div className="flex items-center justify-center gap-4">
                          <FileText className="w-12 h-12 text-green-600" />
                          <div className="text-left">
                            <p className="font-semibold text-slate-900">{file.name}</p>
                            <p className="text-sm text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => setFile(null)}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <FileUp className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                          <p className="text-lg font-medium text-slate-700 mb-2">
                            Drag and drop your quotation here
                          </p>
                          <p className="text-sm text-slate-500 mb-4">
                            Supports PDF, Images, Excel, and Word documents in 8 languages
                          </p>
                          <input
                            type="file"
                            id="quotation-file-input"
                            className="hidden"
                            accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls,.doc,.docx"
                            onChange={handleFileDrop}
                          />
                          <Button 
                            variant="outline" 
                            onClick={() => document.getElementById('quotation-file-input').click()}
                            data-testid="browse-files-btn"
                          >
                            Browse Files
                          </Button>
                        </>
                      )}
                    </div>

                    {/* Supplier Details */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="supplier-name">Supplier Name (Optional)</Label>
                        <Input
                          id="supplier-name"
                          placeholder="Enter supplier name"
                          value={supplierName}
                          onChange={(e) => setSupplierName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="supplier-email">Supplier Email (Optional)</Label>
                        <Input
                          id="supplier-email"
                          type="email"
                          placeholder="supplier@company.com"
                          value={supplierEmail}
                          onChange={(e) => setSupplierEmail(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Document Language */}
                    <div className="space-y-2">
                      <Label>Document Language</Label>
                      <div className="flex flex-wrap gap-2">
                        {SUPPORTED_LANGUAGES.map((lang) => (
                          <Button
                            key={lang.code}
                            variant={documentLanguage === lang.code ? "default" : "outline"}
                            size="sm"
                            onClick={() => setDocumentLanguage(lang.code)}
                            className={documentLanguage === lang.code ? "bg-purple-600 hover:bg-purple-700" : ""}
                          >
                            {lang.flag} {lang.name}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                      <Label htmlFor="notes">Additional Notes (Optional)</Label>
                      <Textarea
                        id="notes"
                        placeholder="Any special instructions or context..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                      />
                    </div>

                    {/* Submit Button */}
                    <Button
                      className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                      onClick={handleUpload}
                      disabled={!file || uploading}
                      data-testid="upload-quotation-btn"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {useRealAi ? 'AI Analyzing...' : 'Analyzing...'}
                        </>
                      ) : (
                        <>
                          <Brain className="w-4 h-4 mr-2" />
                          {useRealAi ? 'Upload & Analyze with AI' : 'Upload & Analyze'}
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar Info */}
              <div className="space-y-6">
                {/* AI Capabilities Card */}
                <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                      <Sparkles className="w-5 h-5 text-yellow-400" />
                      AI Analysis Capabilities
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {AI_ENGINES.map(engine => (
                      <div key={engine.id} className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${engine.color} flex items-center justify-center text-lg flex-shrink-0`}>
                          {engine.icon}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{engine.name}</p>
                          <p className="text-xs text-slate-400">{engine.specialty}</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* PO Invoice Handling */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Receipt className="w-4 h-4" />
                      PO & Invoice Handling Entity
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {INVOICE_HANDLING_OPTIONS.map((option) => (
                      <div
                        key={option.id}
                        className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          invoiceHandlingEntity === option.id
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-slate-200 hover:border-purple-300'
                        }`}
                        onClick={() => setInvoiceHandlingEntity(option.id)}
                      >
                        <div className="flex items-center gap-3">
                          {option.logo ? (
                            <img src={option.logo} alt={option.name} className="h-6 object-contain" />
                          ) : (
                            <div className="w-6 h-6 bg-slate-200 rounded flex items-center justify-center">
                              <Building2 className="w-4 h-4 text-slate-500" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-sm">{option.name}</p>
                            <p className="text-xs text-slate-500">{option.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            /* Analysis Results */
            <div className="space-y-6">
              {/* Success Header with AI Engines Used */}
              <Card className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                        <CheckCircle className="w-8 h-8" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold">Analysis Complete</h2>
                        <p className="text-green-100">
                          {analysisResult.analysis_mode === 'DEMO' || analysisResult.analysis_mode === 'REAL_AI' 
                            ? 'AI-powered price benchmarking complete'
                            : 'Quotation processed successfully'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {(analysisResult.ai_engines_used || []).map((engine, idx) => (
                        <Badge key={idx} className="bg-white/20 text-white border-white/30">
                          {engine}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quotation Summary */}
              <div className="grid lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Extracted Quotation Data
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* Supplier Info */}
                    <div className="p-4 bg-slate-50 rounded-lg mb-6">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-slate-500">Supplier</p>
                          <p className="font-semibold">{analysisResult.analysis?.extracted_data?.supplier?.name}</p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-500">Quotation #</p>
                          <p className="font-semibold">{analysisResult.analysis?.extracted_data?.quotation_details?.quotation_number}</p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-500">Valid Until</p>
                          <p className="font-semibold">{analysisResult.analysis?.extracted_data?.quotation_details?.valid_until}</p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-500">Payment Terms</p>
                          <p className="font-semibold">{analysisResult.analysis?.extracted_data?.quotation_details?.payment_terms}</p>
                        </div>
                      </div>
                    </div>

                    {/* Line Items with AI Analysis */}
                    <div className="space-y-3">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        Line Items ({analysisResult.analysis?.extracted_data?.line_items?.length || 0})
                      </h4>
                      {(analysisResult.analysis?.price_benchmark?.benchmarks || []).map((benchmark, idx) => (
                        <Card key={idx} className="border">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-slate-900">{benchmark.item}</p>
                                <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                                  <span>Qty: {analysisResult.analysis?.extracted_data?.line_items?.[idx]?.quantity}</span>
                                  <span>Unit: ${benchmark.quoted_price?.toFixed(2)}</span>
                                  <Badge variant="outline" className={
                                    benchmark.benchmark_status === 'ABOVE_MARKET' ? 'border-amber-300 text-amber-600' :
                                    benchmark.benchmark_status === 'BELOW_MARKET' ? 'border-green-300 text-green-600' :
                                    'border-slate-300 text-slate-600'
                                  }>
                                    {benchmark.benchmark_status === 'ABOVE_MARKET' ? (
                                      <><TrendingUp className="w-3 h-3 mr-1" /> Above Market</>
                                    ) : benchmark.benchmark_status === 'BELOW_MARKET' ? (
                                      <><TrendingDown className="w-3 h-3 mr-1" /> Below Market</>
                                    ) : (
                                      <><Minus className="w-3 h-3 mr-1" /> At Market</>
                                    )}
                                  </Badge>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-bold text-slate-900">
                                  ${(analysisResult.analysis?.extracted_data?.line_items?.[idx]?.line_total || 0).toLocaleString()}
                                </p>
                                {benchmark.potential_savings > 0 && (
                                  <p className="text-sm text-green-600 font-medium">
                                    Save ${benchmark.potential_savings?.toLocaleString()}
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            {/* AI Analysis Details */}
                            {benchmark.ai_analyses && (
                              <div className="mt-4 pt-4 border-t">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => toggleDetails(`item-${idx}`)}
                                  className="text-purple-600"
                                >
                                  {showDetails[`item-${idx}`] ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
                                  View AI Analysis Details
                                </Button>
                                {showDetails[`item-${idx}`] && (
                                  <div className="mt-3 grid md:grid-cols-3 gap-3">
                                    {/* OpenAI */}
                                    <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                                      <div className="flex items-center gap-2 mb-2">
                                        <span className="text-lg">🤖</span>
                                        <span className="font-semibold text-sm text-green-800">GPT-5.2</span>
                                      </div>
                                      <p className="text-xs text-slate-600">
                                        Market Avg: ${benchmark.market_avg_price?.toFixed(2)}
                                      </p>
                                      {benchmark.ai_analyses?.openai?.data_sources && (
                                        <p className="text-xs text-slate-500 mt-1">
                                          Sources: {benchmark.ai_analyses.openai.data_sources.join(', ')}
                                        </p>
                                      )}
                                    </div>
                                    {/* Claude */}
                                    <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                                      <div className="flex items-center gap-2 mb-2">
                                        <span className="text-lg">🧠</span>
                                        <span className="font-semibold text-sm text-orange-800">Claude 4.5</span>
                                      </div>
                                      <p className="text-xs text-slate-600">
                                        {benchmark.ai_analyses?.claude?.analysis_type || 'Rate Analysis'}
                                      </p>
                                      {benchmark.ai_analyses?.claude?.skill_level && (
                                        <p className="text-xs text-slate-500 mt-1">
                                          Skill: {benchmark.ai_analyses.claude.skill_level}
                                        </p>
                                      )}
                                    </div>
                                    {/* Gemini */}
                                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                      <div className="flex items-center gap-2 mb-2">
                                        <span className="text-lg">⚡</span>
                                        <span className="font-semibold text-sm text-blue-800">Gemini 3</span>
                                      </div>
                                      <p className="text-xs text-slate-600">
                                        Rec: {benchmark.ai_analyses?.gemini?.recommendation || benchmark.recommendation}
                                      </p>
                                      <p className="text-xs text-slate-500 mt-1">
                                        Risk: {benchmark.ai_analyses?.gemini?.risk_level || benchmark.risk_level}
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {/* Totals */}
                    <div className="mt-6 p-4 bg-slate-900 rounded-xl text-white">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-slate-400">Subtotal</span>
                        <span>${analysisResult.analysis?.extracted_data?.totals?.subtotal?.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-slate-400">Tax</span>
                        <span>${analysisResult.analysis?.extracted_data?.totals?.tax_amount?.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-xl font-bold pt-4 border-t border-slate-700">
                        <span>Grand Total</span>
                        <span>${analysisResult.analysis?.extracted_data?.totals?.grand_total?.toLocaleString()}</span>
                      </div>
                      {analysisResult.analysis?.price_benchmark?.total_potential_savings > 0 && (
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-700 text-green-400">
                          <span className="flex items-center gap-2">
                            <DollarSign className="w-5 h-5" />
                            Potential Savings
                          </span>
                          <span className="text-xl font-bold">
                            ${analysisResult.analysis?.price_benchmark?.total_potential_savings?.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Actions & Recommendations */}
                <div className="space-y-6">
                  {/* Flags */}
                  {analysisResult.analysis?.flags?.length > 0 && (
                    <Card className="border-amber-200 bg-amber-50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-amber-800 flex items-center gap-2 text-sm">
                          <AlertTriangle className="w-4 h-4" />
                          Flags ({analysisResult.analysis.flags.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {analysisResult.analysis.flags.map((flag, idx) => (
                          <div key={idx} className="p-2 bg-white rounded border border-amber-200 text-sm">
                            <p className="font-medium text-amber-900">{flag.message}</p>
                            {flag.item && <p className="text-amber-700 text-xs">{flag.item}</p>}
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {/* Recommendations */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <BarChart3 className="w-4 h-4" />
                        AI Recommendations
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {(analysisResult.analysis?.recommendations || []).map((rec, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>{rec}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Actions */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Button 
                        className="w-full bg-green-600 hover:bg-green-700"
                        onClick={handleAddToCart}
                      >
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Add to Cart
                      </Button>
                      
                      {!buyersEngaged ? (
                        <Button 
                          variant="outline" 
                          className="w-full border-purple-300 text-purple-700 hover:bg-purple-50"
                          onClick={handleEngageTacticalBuyers}
                          disabled={engagingBuyers}
                        >
                          {engagingBuyers ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Handshake className="w-4 h-4 mr-2" />
                          )}
                          Engage Tactical Buyers
                        </Button>
                      ) : (
                        <div className="p-3 bg-green-50 rounded-lg border border-green-200 text-center">
                          <CheckCircle className="w-5 h-5 text-green-600 mx-auto mb-1" />
                          <p className="text-sm font-medium text-green-800">Tactical Buyers Engaged</p>
                          <p className="text-xs text-green-600">Team has been notified</p>
                        </div>
                      )}
                      
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => setEscalateModalOpen(true)}
                      >
                        <Flag className="w-4 h-4 mr-2" />
                        Request Negotiation Support
                      </Button>
                      
                      <Button 
                        variant="ghost" 
                        className="w-full text-slate-500"
                        onClick={resetForm}
                      >
                        <ArrowRight className="w-4 h-4 mr-2" />
                        Upload Another Quotation
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Escalate Modal */}
      <Dialog open={escalateModalOpen} onOpenChange={setEscalateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Negotiation Support</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Our Infosys negotiation specialists will review this quotation and work with the supplier to optimize pricing.
            </p>
            <div className="space-y-2">
              <Label>Additional Notes</Label>
              <Textarea
                placeholder="Any specific items or concerns to address..."
                value={escalateNotes}
                onChange={(e) => setEscalateNotes(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEscalateModalOpen(false)}>Cancel</Button>
            <Button onClick={handleEscalate} className="bg-purple-600 hover:bg-purple-700">
              <Handshake className="w-4 h-4 mr-2" />
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UploadQuotationPage;

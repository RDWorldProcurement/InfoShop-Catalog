import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { useAuth } from "../auth/AuthContext";
import { useLanguage } from "../i18n/LanguageContext";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Textarea } from "../components/ui/textarea";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Target,
  Mail,
  TrendingDown,
  DollarSign,
  MessageSquare,
  Copy,
  Send,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Handshake,
  Brain,
  BarChart3,
  Zap,
  Shield,
  Clock,
  ChevronRight,
  RefreshCw,
  FileText,
  Users,
  Building2
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

// Strategy icons and colors
const STRATEGY_CONFIG = {
  aggressive: { 
    icon: Zap, 
    color: "text-red-500", 
    bgColor: "bg-red-50",
    borderColor: "border-red-200"
  },
  balanced: { 
    icon: Target, 
    color: "text-blue-500", 
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200"
  },
  relationship: { 
    icon: Handshake, 
    color: "text-green-500", 
    bgColor: "bg-green-50",
    borderColor: "border-green-200"
  },
  volume_based: { 
    icon: BarChart3, 
    color: "text-purple-500", 
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200"
  },
  urgent: { 
    icon: Clock, 
    color: "text-orange-500", 
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200"
  }
};

const NegotiationAgentPage = () => {
  const { quotationId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const { currency } = useLanguage();

  // State
  const [loading, setLoading] = useState(true);
  const [quotation, setQuotation] = useState(null);
  const [strategies, setStrategies] = useState([]);
  const [selectedStrategy, setSelectedStrategy] = useState("balanced");
  const [negotiationTargets, setNegotiationTargets] = useState(null);
  const [negotiationId, setNegotiationId] = useState(null);
  const [generatedEmail, setGeneratedEmail] = useState(null);
  const [generatingTargets, setGeneratingTargets] = useState(false);
  const [generatingEmail, setGeneratingEmail] = useState(false);
  
  // Counter-offer tracking
  const [showCounterOffer, setShowCounterOffer] = useState(false);
  const [theirOffer, setTheirOffer] = useState("");
  const [counterOfferResult, setCounterOfferResult] = useState(null);
  const [processingCounter, setProcessingCounter] = useState(false);
  
  // Buyer info for email
  const [buyerName, setBuyerName] = useState("Procurement Team");
  const [companyName, setCompanyName] = useState("Infosys Limited");

  // Load quotation and strategies
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load strategies
        const stratRes = await axios.get(`${API}/negotiation/strategies`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStrategies(stratRes.data.strategies || []);

        // Load quotation
        if (quotationId) {
          const quotRes = await axios.get(`${API}/procurement/quotation/${quotationId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setQuotation(quotRes.data.quotation);
        }
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Failed to load quotation data");
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      loadData();
    }
  }, [token, quotationId]);

  // Generate negotiation targets
  const handleGenerateTargets = async () => {
    setGeneratingTargets(true);
    try {
      const response = await axios.post(`${API}/negotiation/generate-targets`, {
        quotation_id: quotationId,
        strategy: selectedStrategy
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setNegotiationTargets(response.data.targets);
      setNegotiationId(response.data.negotiation_id);
      toast.success("Negotiation targets generated!");
    } catch (error) {
      console.error("Error generating targets:", error);
      toast.error("Failed to generate targets");
    } finally {
      setGeneratingTargets(false);
    }
  };

  // Generate negotiation email
  const handleGenerateEmail = async () => {
    setGeneratingEmail(true);
    try {
      const response = await axios.post(`${API}/negotiation/generate-email`, {
        quotation_id: quotationId,
        negotiation_id: negotiationId,
        strategy: selectedStrategy,
        buyer_name: buyerName,
        company_name: companyName
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setGeneratedEmail(response.data.email);
      toast.success("Negotiation email generated!");
    } catch (error) {
      console.error("Error generating email:", error);
      toast.error("Failed to generate email");
    } finally {
      setGeneratingEmail(false);
    }
  };

  // Process counter-offer
  const handleCounterOffer = async () => {
    if (!theirOffer || isNaN(parseFloat(theirOffer))) {
      toast.error("Please enter a valid offer amount");
      return;
    }

    setProcessingCounter(true);
    try {
      const response = await axios.post(`${API}/negotiation/counter-offer`, {
        negotiation_id: negotiationId,
        their_offer: parseFloat(theirOffer)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setCounterOfferResult(response.data);
      toast.success("Counter-offer calculated!");
    } catch (error) {
      console.error("Error processing counter-offer:", error);
      toast.error("Failed to process counter-offer");
    } finally {
      setProcessingCounter(false);
    }
  };

  // Copy email to clipboard
  const copyEmailToClipboard = () => {
    if (generatedEmail) {
      navigator.clipboard.writeText(generatedEmail.body);
      toast.success("Email copied to clipboard!");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading Negotiation Agent...</p>
        </div>
      </div>
    );
  }

  const analysis = quotation?.analysis || {};
  const extractedData = analysis.extracted_data || quotation?.extracted_data || {};
  const supplier = extractedData.supplier || {};
  const quotationDetails = extractedData.quotation_details || {};
  const lineItems = extractedData.line_items || [];
  const benchmarks = analysis.price_benchmark?.benchmarks || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => navigate(-1)}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <div className="h-8 w-px bg-slate-200" />
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">Negotiation Agent</h1>
                  <p className="text-sm text-slate-500">AI-Powered Price Negotiation</p>
                </div>
              </div>
            </div>
            <Badge className="bg-purple-100 text-purple-700 border-purple-200">
              Quote #{quotationDetails.quotation_number || quotationId}
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Quotation Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Supplier</p>
                  <p className="font-semibold text-slate-900">{supplier.name || "Unknown"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Line Items</p>
                  <p className="font-semibold text-slate-900">{lineItems.length} items</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Quoted Total</p>
                  <p className="font-semibold text-slate-900">
                    {currency.symbol}{extractedData.totals?.grand_total?.toLocaleString() || "0"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <TrendingDown className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Potential Savings</p>
                  <p className="font-semibold text-green-600">
                    {currency.symbol}{analysis.price_benchmark?.total_potential_savings?.toLocaleString() || "0"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Strategy Selection & Targets */}
          <div className="lg:col-span-2 space-y-6">
            {/* Strategy Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-purple-600" />
                  Step 1: Select Negotiation Strategy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {strategies.map((strategy) => {
                    const config = STRATEGY_CONFIG[strategy.id] || STRATEGY_CONFIG.balanced;
                    const Icon = config.icon;
                    const isSelected = selectedStrategy === strategy.id;
                    
                    return (
                      <div
                        key={strategy.id}
                        onClick={() => setSelectedStrategy(strategy.id)}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          isSelected 
                            ? `${config.borderColor} ${config.bgColor} ring-2 ring-offset-2 ring-${strategy.id === 'aggressive' ? 'red' : strategy.id === 'balanced' ? 'blue' : strategy.id === 'relationship' ? 'green' : strategy.id === 'volume_based' ? 'purple' : 'orange'}-500`
                            : "border-slate-200 hover:border-slate-300 bg-white"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className={`w-5 h-5 ${config.color}`} />
                          <span className="font-semibold text-slate-900">{strategy.name}</span>
                        </div>
                        <p className="text-xs text-slate-600 mb-2">{strategy.description}</p>
                        <div className="flex items-center gap-2 text-xs">
                          <Badge variant="outline" className="text-xs">
                            {strategy.tone} tone
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {strategy.max_rounds} rounds
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <Button
                  onClick={handleGenerateTargets}
                  disabled={generatingTargets}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  {generatingTargets ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Calculating Targets...
                    </>
                  ) : (
                    <>
                      <Target className="w-4 h-4 mr-2" />
                      Generate Negotiation Targets
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Negotiation Targets */}
            {negotiationTargets && (
              <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-700">
                    <CheckCircle className="w-5 h-5" />
                    Step 2: Your Negotiation Targets
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-lg p-4 border">
                      <p className="text-xs text-slate-500 mb-1">Quoted Total</p>
                      <p className="text-xl font-bold text-slate-900">
                        {currency.symbol}{negotiationTargets.summary?.total_quoted?.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border">
                      <p className="text-xs text-slate-500 mb-1">Market Average</p>
                      <p className="text-xl font-bold text-blue-600">
                        {currency.symbol}{negotiationTargets.summary?.total_market_avg?.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-green-200">
                      <p className="text-xs text-slate-500 mb-1">Target Price</p>
                      <p className="text-xl font-bold text-green-600">
                        {currency.symbol}{negotiationTargets.summary?.total_target?.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg p-4 text-white">
                      <p className="text-xs text-green-100 mb-1">Potential Savings</p>
                      <p className="text-xl font-bold">
                        {currency.symbol}{negotiationTargets.summary?.total_potential_savings?.toLocaleString()}
                      </p>
                      <p className="text-xs text-green-200">
                        ({negotiationTargets.summary?.savings_percent}% reduction)
                      </p>
                    </div>
                  </div>

                  {/* Item-level Targets */}
                  <div className="bg-white rounded-lg border overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2 border-b">
                      <p className="font-semibold text-slate-700">Item-Level Target Prices</p>
                    </div>
                    <div className="divide-y max-h-64 overflow-y-auto">
                      {negotiationTargets.item_targets?.slice(0, 10).map((item, idx) => (
                        <div key={idx} className="px-4 py-3 flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-slate-900 text-sm">{item.item}</p>
                            <p className="text-xs text-slate-500">Qty: {item.quantity}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm">
                              <span className="text-slate-500 line-through">{currency.symbol}{item.quoted_price?.toLocaleString()}</span>
                              <span className="mx-2">→</span>
                              <span className="text-green-600 font-semibold">{currency.symbol}{item.target_price?.toLocaleString()}</span>
                            </p>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${
                                item.recommendation === 'STRONG_NEGOTIATE' ? 'bg-red-50 text-red-700 border-red-200' :
                                item.recommendation === 'NEGOTIATE' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                'bg-green-50 text-green-700 border-green-200'
                              }`}
                            >
                              {item.recommendation?.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Email Generation */}
            {negotiationTargets && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-blue-600" />
                    Step 3: Generate Negotiation Email
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-1 block">Your Name</label>
                      <Input
                        value={buyerName}
                        onChange={(e) => setBuyerName(e.target.value)}
                        placeholder="Procurement Team"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-1 block">Company Name</label>
                      <Input
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Your Company"
                      />
                    </div>
                  </div>
                  
                  <Button
                    onClick={handleGenerateEmail}
                    disabled={generatingEmail}
                    className="w-full"
                    variant="outline"
                  >
                    {generatingEmail ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        AI Generating Email...
                      </>
                    ) : (
                      <>
                        <Brain className="w-4 h-4 mr-2" />
                        Generate AI Negotiation Email
                      </>
                    )}
                  </Button>

                  {generatedEmail && (
                    <div className="mt-4 space-y-3">
                      <div className="bg-slate-50 rounded-lg p-4 border">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-semibold text-slate-700">Subject:</p>
                          <Badge>{generatedEmail.tone} tone</Badge>
                        </div>
                        <p className="text-slate-900">{generatedEmail.subject}</p>
                      </div>
                      
                      <div className="bg-white rounded-lg border">
                        <div className="bg-slate-50 px-4 py-2 border-b flex items-center justify-between">
                          <p className="font-semibold text-slate-700">Email Body</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={copyEmailToClipboard}
                          >
                            <Copy className="w-4 h-4 mr-1" />
                            Copy
                          </Button>
                        </div>
                        <div className="p-4">
                          <pre className="whitespace-pre-wrap text-sm text-slate-700 font-sans">
                            {generatedEmail.body}
                          </pre>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <Button className="flex-1 bg-blue-600 hover:bg-blue-700">
                          <Send className="w-4 h-4 mr-2" />
                          Send to Supplier
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setShowCounterOffer(true)}
                        >
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Track Response
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Counter-Offer Tracking */}
            {showCounterOffer && negotiationId && (
              <Card className="border-amber-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-amber-700">
                    <RefreshCw className="w-5 h-5" />
                    Step 4: Track Supplier Response
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">
                      Supplier's Counter-Offer ({currency.symbol})
                    </label>
                    <div className="flex gap-3">
                      <Input
                        type="number"
                        value={theirOffer}
                        onChange={(e) => setTheirOffer(e.target.value)}
                        placeholder="Enter their offer amount"
                        className="flex-1"
                      />
                      <Button
                        onClick={handleCounterOffer}
                        disabled={processingCounter}
                      >
                        {processingCounter ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Calculate Response"
                        )}
                      </Button>
                    </div>
                  </div>

                  {counterOfferResult && (
                    <div className="bg-slate-50 rounded-lg p-4 border space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-700">AI Recommendation:</span>
                        <Badge 
                          className={
                            counterOfferResult.counter_offer?.recommendation === 'COUNTER' 
                              ? 'bg-blue-100 text-blue-700' 
                              : 'bg-amber-100 text-amber-700'
                          }
                        >
                          {counterOfferResult.counter_offer?.recommendation}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="bg-white rounded-lg p-3 border">
                          <p className="text-xs text-slate-500">Their Offer</p>
                          <p className="text-lg font-bold text-slate-900">
                            {currency.symbol}{counterOfferResult.counter_offer?.their_offer?.toLocaleString()}
                          </p>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-blue-200">
                          <p className="text-xs text-slate-500">Your Counter</p>
                          <p className="text-lg font-bold text-blue-600">
                            {currency.symbol}{counterOfferResult.counter_offer?.our_counter?.toLocaleString()}
                          </p>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-green-200">
                          <p className="text-xs text-slate-500">Savings So Far</p>
                          <p className="text-lg font-bold text-green-600">
                            {counterOfferResult.savings_achieved?.percent}%
                          </p>
                        </div>
                      </div>

                      <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                        <p className="text-sm text-blue-800">
                          <strong>Suggested Response:</strong> {counterOfferResult.counter_offer?.message}
                        </p>
                      </div>

                      <p className="text-xs text-slate-500 text-center">
                        Round {counterOfferResult.counter_offer?.round} of negotiation • 
                        {counterOfferResult.counter_offer?.rounds_remaining} rounds remaining
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Quick Actions & Help */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card className="bg-gradient-to-br from-purple-600 to-blue-700 text-white">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Brain className="w-8 h-8" />
                  <div>
                    <h3 className="font-bold text-lg">AI Negotiation</h3>
                    <p className="text-purple-200 text-sm">Powered by GPT-5.2</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="bg-white/10 rounded-lg p-3">
                    <p className="text-purple-200 text-xs">Strategy Selected</p>
                    <p className="font-semibold capitalize">{selectedStrategy.replace(/_/g, ' ')}</p>
                  </div>
                  {negotiationTargets && (
                    <div className="bg-white/10 rounded-lg p-3">
                      <p className="text-purple-200 text-xs">Target Savings</p>
                      <p className="font-semibold">
                        {currency.symbol}{negotiationTargets.summary?.total_potential_savings?.toLocaleString()} 
                        <span className="text-sm text-purple-200"> ({negotiationTargets.summary?.savings_percent}%)</span>
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Strategy Guide */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Strategy Guide</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {strategies.map((s) => {
                  const config = STRATEGY_CONFIG[s.id] || STRATEGY_CONFIG.balanced;
                  const Icon = config.icon;
                  return (
                    <div key={s.id} className="flex items-start gap-2 text-sm">
                      <Icon className={`w-4 h-4 mt-0.5 ${config.color}`} />
                      <div>
                        <p className="font-medium text-slate-900">{s.name}</p>
                        <p className="text-xs text-slate-500">{s.best_for}</p>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate(`/quotation-analysis/${quotationId}`)}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  View Full Analysis
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate("/sourcing-support")}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Escalate to Buying Desk
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate("/upload-quotation")}
                >
                  <ChevronRight className="w-4 h-4 mr-2" />
                  Upload New Quotation
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NegotiationAgentPage;

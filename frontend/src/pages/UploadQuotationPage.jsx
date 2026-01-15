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
  Building2, Mail, Phone, Receipt, Package
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
  { id: "propay", name: "ProPay.ai", description: "Third-party payment processing partner", logo: "https://customer-assets.emergentagent.com/job_procure-ai-fusion/artifacts/tst2i955_ProPay.ai%20Logo%202.svg" },
  { id: "customer_direct", name: "Customer Direct", description: "Direct invoicing from supplier to customer", logo: null }
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

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file to upload");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("supplier_name", supplierName);
      formData.append("supplier_email", supplierEmail);
      formData.append("document_language", documentLanguage);
      formData.append("notes", notes);

      const response = await axios.post(`${API}/procurement/quotation/upload`, formData, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "multipart/form-data"
        }
      });

      if (response.data.success) {
        setAnalysisResult(response.data);
        toast.success("Quotation analyzed successfully!");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error.response?.data?.detail || "Failed to upload quotation");
    } finally {
      setUploading(false);
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
      // Navigate to catalog page with cart open
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
  };

  if (!user) {
    navigate("/login");
    return null;
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar activePage="upload-quotation" />
      
      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <FileUp className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
                  One-Off Purchases
                </h1>
                <p className="text-slate-600">Upload quotation for AI-powered analysis with price benchmarking for products and services</p>
              </div>
            </div>
          </div>

          {!analysisResult ? (
            /* Upload Form */
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Main Upload Area */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Upload className="w-5 h-5" />
                      Upload Document
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
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
                            Supports PDF, Images, Excel, and Word documents
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

                    {/* Supplier Info */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label>Supplier Name (Optional)</Label>
                        <Input
                          placeholder="Enter supplier name"
                          value={supplierName}
                          onChange={(e) => setSupplierName(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Supplier Email (Optional)</Label>
                        <Input
                          type="email"
                          placeholder="supplier@company.com"
                          value={supplierEmail}
                          onChange={(e) => setSupplierEmail(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Document Language */}
                    <div>
                      <Label>Document Language</Label>
                      <Select value={documentLanguage} onValueChange={setDocumentLanguage}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SUPPORTED_LANGUAGES.map((lang) => (
                            <SelectItem key={lang.code} value={lang.code}>
                              <span className="flex items-center gap-2">
                                <span>{lang.flag}</span>
                                <span>{lang.name}</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Notes */}
                    <div>
                      <Label>Additional Notes (Optional)</Label>
                      <Textarea
                        placeholder="Any specific instructions or context..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                      />
                    </div>

                    {/* Upload Button */}
                    <Button
                      className="w-full bg-purple-600 hover:bg-purple-700 py-6 text-lg"
                      onClick={handleUpload}
                      disabled={!file || uploading}
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Analyzing with AI...
                        </>
                      ) : (
                        <>
                          <Brain className="w-5 h-5 mr-2" />
                          Analyze Quotation
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Info Panel */}
              <div className="space-y-6">
                <Card className="bg-purple-50 border-purple-200">
                  <CardContent className="p-6">
                    <Brain className="w-10 h-10 text-purple-600 mb-4" />
                    <h3 className="font-bold text-slate-900 mb-2">AI-Powered Analysis</h3>
                    <p className="text-sm text-slate-600 mb-4">
                      Our AI will automatically extract data, benchmark prices for products and services, and verify tax compliance.
                    </p>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2 text-slate-700">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Data extraction from any format
                      </li>
                      <li className="flex items-center gap-2 text-slate-700">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Price benchmarking vs market
                      </li>
                      <li className="flex items-center gap-2 text-slate-700">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Tax verification (Avalara)
                      </li>
                      <li className="flex items-center gap-2 text-slate-700">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Negotiation recommendations
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <Clock className="w-10 h-10 text-[#007CC3] mb-4" />
                    <h3 className="font-bold text-slate-900 mb-2">Processing Time</h3>
                    <p className="text-sm text-slate-600">
                      Analysis typically completes within <strong>30 seconds</strong>. Complex documents may take up to 2 minutes.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            /* Analysis Results */
            <div className="space-y-6">
              {/* Success Banner */}
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-green-800">Analysis Complete</h2>
                        <p className="text-green-700">Quotation ID: {analysisResult.quotation_id}</p>
                      </div>
                    </div>
                    <Button variant="outline" onClick={resetForm}>
                      Upload Another
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Engage Infosys Tactical Buyers - Before Potential Savings */}
              <Card className={`border-2 ${buyersEngaged ? 'border-green-400 bg-green-50' : 'border-[#007CC3] bg-[#007CC3]/5'}`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${buyersEngaged ? 'bg-green-100' : 'bg-[#007CC3]/10'}`}>
                        {buyersEngaged ? (
                          <CheckCircle className="w-7 h-7 text-green-600" />
                        ) : (
                          <Building2 className="w-7 h-7 text-[#007CC3]" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-slate-900" style={{ fontFamily: 'Manrope' }}>
                          {buyersEngaged ? 'Infosys Notified!' : 'Engage Infosys Tactical Buyers'}
                        </h3>
                        <p className="text-sm text-slate-600">
                          {buyersEngaged 
                            ? 'Your request has been submitted to the Infosys Buying Desk Dashboard. Expected response within 24 hours.'
                            : 'Let our expert buying team negotiate better rates and terms on your behalf'
                          }
                        </p>
                      </div>
                    </div>
                    {!buyersEngaged && (
                      <Button
                        size="lg"
                        className="bg-[#007CC3] hover:bg-[#00629B] text-white px-8 py-6 text-base font-semibold shadow-lg"
                        onClick={handleEngageTacticalBuyers}
                        disabled={engagingBuyers}
                        data-testid="engage-tactical-buyers-btn"
                      >
                        {engagingBuyers ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Notifying Team...
                          </>
                        ) : (
                          <>
                            <Handshake className="w-5 h-5 mr-2" />
                            Engage Tactical Buyers
                          </>
                        )}
                      </Button>
                    )}
                    {buyersEngaged && (
                      <Badge className="bg-green-100 text-green-700 px-4 py-2 text-sm">
                        <CheckCircle className="w-4 h-4 mr-1 inline" />
                        Request Submitted
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-slate-900">
                      ${analysisResult.analysis.extracted_data.totals.grand_total.toLocaleString()}
                    </p>
                    <p className="text-sm text-slate-500">Total Amount</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-slate-900">
                      {analysisResult.analysis.extracted_data.line_items.length}
                    </p>
                    <p className="text-sm text-slate-500">Line Items</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">
                      ${analysisResult.analysis.price_benchmark.total_potential_savings.toLocaleString()}
                    </p>
                    <p className="text-sm text-slate-500">Potential Savings</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-amber-600">
                      {analysisResult.analysis.flags.length}
                    </p>
                    <p className="text-sm text-slate-500">Flags</p>
                  </CardContent>
                </Card>
              </div>

              {/* Flags & Recommendations */}
              {(analysisResult.analysis.flags.length > 0 || analysisResult.analysis.recommendations.length > 0) && (
                <div className="grid md:grid-cols-2 gap-6">
                  {analysisResult.analysis.flags.length > 0 && (
                    <Card className="border-amber-200">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-amber-700">
                          <Flag className="w-5 h-5" />
                          Flags ({analysisResult.analysis.flags.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {analysisResult.analysis.flags.map((flag, idx) => (
                          <div key={idx} className={`p-3 rounded-lg ${flag.severity === 'HIGH' ? 'bg-red-50' : 'bg-amber-50'}`}>
                            <div className="flex items-start gap-2">
                              <AlertTriangle className={`w-4 h-4 mt-0.5 ${flag.severity === 'HIGH' ? 'text-red-500' : 'text-amber-500'}`} />
                              <div>
                                <p className="font-medium text-slate-900 text-sm">{flag.message}</p>
                                {flag.item && <p className="text-xs text-slate-500">{flag.item}</p>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  <Card className="border-blue-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-blue-700">
                        <CheckCircle className="w-5 h-5" />
                        Recommendations
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {analysisResult.analysis.recommendations.map((rec, idx) => (
                        <div key={idx} className="flex items-start gap-2 p-2">
                          <ArrowRight className="w-4 h-4 mt-0.5 text-blue-500" />
                          <p className="text-sm text-slate-700">{rec}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Extracted Data */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Extracted Data
                    </span>
                    <Badge variant="outline">
                      Confidence: {(analysisResult.analysis.extracted_data.extraction_confidence * 100).toFixed(0)}%
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Supplier Info */}
                  <div className="mb-6 p-4 bg-slate-50 rounded-lg">
                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-slate-500">Supplier</p>
                        <p className="font-semibold text-slate-900">{analysisResult.analysis.extracted_data.supplier.name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Quotation #</p>
                        <p className="font-semibold text-slate-900">{analysisResult.analysis.extracted_data.quotation_details.quotation_number}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Valid Until</p>
                        <p className="font-semibold text-slate-900">{analysisResult.analysis.extracted_data.quotation_details.valid_until}</p>
                      </div>
                    </div>
                  </div>

                  {/* Line Items Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3 bg-slate-50">#</th>
                          <th className="text-left p-3 bg-slate-50">Description</th>
                          <th className="text-center p-3 bg-slate-50">Qty</th>
                          <th className="text-right p-3 bg-slate-50">Unit Price</th>
                          <th className="text-right p-3 bg-slate-50">Total</th>
                          <th className="text-center p-3 bg-slate-50">Benchmark</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analysisResult.analysis.extracted_data.line_items.map((item, idx) => {
                          const benchmark = analysisResult.analysis.price_benchmark.benchmarks[idx];
                          return (
                            <tr key={idx} className="border-b hover:bg-slate-50">
                              <td className="p-3">{item.line_number}</td>
                              <td className="p-3">
                                <p className="font-medium">{item.description}</p>
                                <p className="text-xs text-slate-500">{item.category}</p>
                              </td>
                              <td className="p-3 text-center">{item.quantity}</td>
                              <td className="p-3 text-right">${item.unit_price.toFixed(2)}</td>
                              <td className="p-3 text-right font-semibold">${item.line_total.toFixed(2)}</td>
                              <td className="p-3 text-center">
                                {benchmark && (
                                  <Badge className={
                                    benchmark.benchmark_status === 'ABOVE_MARKET' ? 'bg-red-100 text-red-700' :
                                    benchmark.benchmark_status === 'BELOW_MARKET' ? 'bg-green-100 text-green-700' :
                                    'bg-slate-100 text-slate-700'
                                  }>
                                    {benchmark.benchmark_status === 'ABOVE_MARKET' && <TrendingUp className="w-3 h-3 mr-1" />}
                                    {benchmark.benchmark_status === 'BELOW_MARKET' && <TrendingDown className="w-3 h-3 mr-1" />}
                                    {benchmark.benchmark_status === 'AT_MARKET' && <Minus className="w-3 h-3 mr-1" />}
                                    {benchmark.variance_percent > 0 ? '+' : ''}{benchmark.variance_percent}%
                                  </Badge>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-50">
                          <td colSpan={4} className="p-3 text-right font-semibold">Subtotal:</td>
                          <td className="p-3 text-right font-semibold">${analysisResult.analysis.extracted_data.totals.subtotal.toFixed(2)}</td>
                          <td></td>
                        </tr>
                        <tr className="bg-slate-50">
                          <td colSpan={4} className="p-3 text-right">Tax ({(analysisResult.analysis.extracted_data.totals.tax_rate * 100).toFixed(2)}%):</td>
                          <td className="p-3 text-right">${analysisResult.analysis.extracted_data.totals.tax_amount.toFixed(2)}</td>
                          <td></td>
                        </tr>
                        <tr className="bg-[#007CC3]/10">
                          <td colSpan={4} className="p-3 text-right font-bold text-lg">Grand Total:</td>
                          <td className="p-3 text-right font-bold text-lg">${analysisResult.analysis.extracted_data.totals.grand_total.toFixed(2)}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Tax Analysis */}
              <Card>
                <CardHeader>
                  <button 
                    className="w-full flex items-center justify-between"
                    onClick={() => toggleDetails('tax')}
                  >
                    <CardTitle className="flex items-center gap-2">
                      <Calculator className="w-5 h-5" />
                      Tax Analysis
                      {analysisResult.analysis.tax_analysis.tax_verified ? (
                        <Badge className="bg-green-100 text-green-700 ml-2">Verified</Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-700 ml-2">Review Needed</Badge>
                      )}
                    </CardTitle>
                    {showDetails.tax ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                </CardHeader>
                {showDetails.tax && (
                  <CardContent>
                    <div className="grid md:grid-cols-4 gap-4">
                      <div className="p-4 bg-slate-50 rounded-lg">
                        <p className="text-xs text-slate-500">Jurisdiction</p>
                        <p className="font-semibold">{analysisResult.analysis.tax_analysis.jurisdiction}</p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-lg">
                        <p className="text-xs text-slate-500">Quoted Tax</p>
                        <p className="font-semibold">${analysisResult.analysis.tax_analysis.quoted_tax.toFixed(2)}</p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-lg">
                        <p className="text-xs text-slate-500">Calculated Tax</p>
                        <p className="font-semibold">${analysisResult.analysis.tax_analysis.calculated_tax.toFixed(2)}</p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-lg">
                        <p className="text-xs text-slate-500">Avalara Status</p>
                        <p className="font-semibold">{analysisResult.analysis.tax_analysis.avalara_verification}</p>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* PO and Invoice Handling Entity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="w-5 h-5" />
                    PO and Invoice Handling Entity
                  </CardTitle>
                  <p className="text-sm text-slate-500 mt-1">
                    Select which entity will handle purchase orders and invoices for this quotation
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    {INVOICE_HANDLING_OPTIONS.map((option) => (
                      <div
                        key={option.id}
                        className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                          invoiceHandlingEntity === option.id
                            ? 'border-[#007CC3] bg-[#007CC3]/5'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                        onClick={() => setInvoiceHandlingEntity(option.id)}
                        data-testid={`invoice-entity-${option.id}`}
                      >
                        {option.logo ? (
                          <div className="flex items-center gap-3 mb-3">
                            <img 
                              src={option.logo} 
                              alt={option.name}
                              className="h-8 object-contain"
                            />
                            <div className={`w-4 h-4 rounded-full border-2 ml-auto ${
                              invoiceHandlingEntity === option.id
                                ? 'border-[#007CC3] bg-[#007CC3]'
                                : 'border-slate-300'
                            }`}>
                              {invoiceHandlingEntity === option.id && (
                                <CheckCircle className="w-3 h-3 text-white" />
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                              invoiceHandlingEntity === option.id
                                ? 'border-[#007CC3] bg-[#007CC3]'
                                : 'border-slate-300'
                            }`}>
                              {invoiceHandlingEntity === option.id && (
                                <CheckCircle className="w-3 h-3 text-white" />
                              )}
                            </div>
                            <span className="font-semibold text-sm">{option.name}</span>
                          </div>
                        )}
                        {option.logo && <span className="font-semibold text-sm block mb-1">{option.name}</span>}
                        <p className="text-xs text-slate-500">{option.description}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  className="flex-1 bg-[#FF9900] hover:bg-[#FF6B00] py-6"
                  onClick={handleAddToCart}
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Add to Cart
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="flex-1 border-purple-500 text-purple-600 hover:bg-purple-50 py-6"
                  onClick={() => setEscalateModalOpen(true)}
                >
                  <Handshake className="w-5 h-5 mr-2" />
                  Request Negotiation Support
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Escalation Modal */}
      <Dialog open={escalateModalOpen} onOpenChange={setEscalateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Handshake className="w-5 h-5 text-purple-600" />
              Request Negotiation Support
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-slate-600 mb-4">
              Our Infosys procurement specialists will review this quotation and negotiate better terms on your behalf.
            </p>
            <Label>Additional Notes for Negotiation Team</Label>
            <Textarea
              placeholder="Any specific concerns or targets..."
              value={escalateNotes}
              onChange={(e) => setEscalateNotes(e.target.value)}
              rows={4}
            />
            <p className="text-xs text-slate-500 mt-2">
              Expected response time: 24-48 hours
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEscalateModalOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-purple-600 hover:bg-purple-700" onClick={handleEscalate}>
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UploadQuotationPage;

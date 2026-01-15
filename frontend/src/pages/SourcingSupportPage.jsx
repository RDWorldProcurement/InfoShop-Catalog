import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, API } from "../App";
import { useLanguage } from "../i18n/LanguageContext";
import axios from "axios";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { toast } from "sonner";
import {
  Handshake, Building2, Package, FileText, Clock, DollarSign, MapPin,
  CheckCircle, AlertCircle, Loader2, Send, Search, Filter, Calendar,
  User, Phone, Mail, ArrowRight, ChevronRight, Briefcase, Target,
  TrendingUp, Shield, Zap, Receipt
} from "lucide-react";
import Sidebar from "../components/Sidebar";

const SOURCING_CATEGORIES = [
  "IT Equipment & Software",
  "MRO Supplies",
  "Office Supplies",
  "Facilities & Maintenance",
  "Professional Services",
  "Marketing & Creative",
  "Logistics & Transportation",
  "Lab & Scientific Equipment",
  "Industrial Equipment",
  "Raw Materials",
  "Other"
];

const PAYMENT_MODELS = [
  { id: "infosys_limited", name: "Infosys Limited", description: "One vendor model - simplified invoicing" },
  { id: "propay", name: "ProPay World Wide Inc", description: "Alternative payment processing partner" },
  { id: "customer_direct", name: "Customer Direct Payment", description: "You pay supplier directly after approval" }
];

const URGENCY_LEVELS = [
  { id: "standard", name: "Standard", days: "5-7 business days", color: "bg-slate-100 text-slate-700" },
  { id: "urgent", name: "Urgent", days: "2-3 business days", color: "bg-amber-100 text-amber-700" },
  { id: "critical", name: "Critical", days: "24-48 hours", color: "bg-red-100 text-red-700" }
];

const SourcingSupportPage = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { t } = useLanguage();
  
  const [activeTab, setActiveTab] = useState("new-request");
  const [submitting, setSubmitting] = useState(false);
  const [requests, setRequests] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    request_title: "",
    category: "",
    description: "",
    estimated_budget: "",
    budget_currency: "USD",
    quantity: "",
    required_by_date: "",
    delivery_location: "",
    preferred_suppliers: "",
    technical_specifications: "",
    payment_model: "infosys_limited",
    urgency: "standard"
  });

  useEffect(() => {
    if (activeTab === "history") {
      fetchHistory();
    }
  }, [activeTab]);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const response = await axios.get(`${API}/procurement/sourcing/history`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      setRequests(response.data.requests);
    } catch (error) {
      console.error("Failed to fetch history:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.request_title || !formData.category || !formData.description || !formData.delivery_location) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        estimated_budget: formData.estimated_budget ? parseFloat(formData.estimated_budget) : null,
        quantity: formData.quantity ? parseInt(formData.quantity) : null,
        preferred_suppliers: formData.preferred_suppliers ? formData.preferred_suppliers.split(",").map(s => s.trim()) : []
      };

      const response = await axios.post(`${API}/procurement/sourcing/request`, payload, {
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (response.data.success) {
        toast.success("Sourcing request submitted successfully!");
        setFormData({
          request_title: "",
          category: "",
          description: "",
          estimated_budget: "",
          budget_currency: "USD",
          quantity: "",
          required_by_date: "",
          delivery_location: "",
          preferred_suppliers: "",
          technical_specifications: "",
          payment_model: "infosys_limited",
          urgency: "standard"
        });
        setActiveTab("history");
        fetchHistory();
      }
    } catch (error) {
      console.error("Submit error:", error);
      toast.error(error.response?.data?.detail || "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "SUBMITTED": return "bg-blue-100 text-blue-700";
      case "IN_PROGRESS": return "bg-amber-100 text-amber-700";
      case "RFQ_SENT": return "bg-purple-100 text-purple-700";
      case "QUOTES_RECEIVED": return "bg-indigo-100 text-indigo-700";
      case "COMPLETED": return "bg-green-100 text-green-700";
      case "CANCELLED": return "bg-red-100 text-red-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  if (!user) {
    navigate("/login");
    return null;
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar activePage="sourcing-support" />
      
      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <Handshake className="w-6 h-6 text-[#FF6B00]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
                  End-to-End Sourcing Support
                </h1>
                <p className="text-slate-600">Let Infosys handle your procurement needs</p>
              </div>
            </div>
          </div>

          {/* Benefits Cards */}
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            <Card className="bg-gradient-to-br from-[#007CC3]/10 to-[#007CC3]/5">
              <CardContent className="p-4">
                <Search className="w-8 h-8 text-[#007CC3] mb-2" />
                <h3 className="font-semibold text-slate-900 text-sm">Supplier Identification</h3>
                <p className="text-xs text-slate-600">We find the right suppliers</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-purple-100 to-purple-50">
              <CardContent className="p-4">
                <FileText className="w-8 h-8 text-purple-600 mb-2" />
                <h3 className="font-semibold text-slate-900 text-sm">RFQ Management</h3>
                <p className="text-xs text-slate-600">Professional RFQ handling</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-100 to-green-50">
              <CardContent className="p-4">
                <TrendingUp className="w-8 h-8 text-green-600 mb-2" />
                <h3 className="font-semibold text-slate-900 text-sm">Expert Negotiation</h3>
                <p className="text-xs text-slate-600">Get the best prices</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-amber-100 to-amber-50">
              <CardContent className="p-4">
                <Shield className="w-8 h-8 text-amber-600 mb-2" />
                <h3 className="font-semibold text-slate-900 text-sm">Qualified Suppliers</h3>
                <p className="text-xs text-slate-600">Vetted & verified vendors</p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="new-request" className="gap-2">
                <Send className="w-4 h-4" />
                New Request
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2">
                <Clock className="w-4 h-4" />
                My Requests
              </TabsTrigger>
            </TabsList>

            {/* New Request Form */}
            <TabsContent value="new-request">
              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  {/* Basic Info */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Briefcase className="w-5 h-5" />
                        Request Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label>Request Title *</Label>
                        <Input
                          placeholder="e.g., Bulk Office Furniture Purchase"
                          value={formData.request_title}
                          onChange={(e) => handleInputChange("request_title", e.target.value)}
                        />
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <Label>Category *</Label>
                          <Select value={formData.category} onValueChange={(v) => handleInputChange("category", v)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              {SOURCING_CATEGORIES.map((cat) => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Urgency</Label>
                          <Select value={formData.urgency} onValueChange={(v) => handleInputChange("urgency", v)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {URGENCY_LEVELS.map((level) => (
                                <SelectItem key={level.id} value={level.id}>
                                  <span className="flex items-center gap-2">
                                    <span>{level.name}</span>
                                    <span className="text-xs text-slate-500">({level.days})</span>
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <Label>Description *</Label>
                        <Textarea
                          placeholder="Describe what you need in detail..."
                          value={formData.description}
                          onChange={(e) => handleInputChange("description", e.target.value)}
                          rows={4}
                        />
                      </div>

                      <div>
                        <Label>Technical Specifications (Optional)</Label>
                        <Textarea
                          placeholder="Any technical requirements, standards, certifications..."
                          value={formData.technical_specifications}
                          onChange={(e) => handleInputChange("technical_specifications", e.target.value)}
                          rows={3}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Budget & Quantity */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5" />
                        Budget & Quantity
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-3 gap-4">
                        <div>
                          <Label>Estimated Budget</Label>
                          <Input
                            type="number"
                            placeholder="50000"
                            value={formData.estimated_budget}
                            onChange={(e) => handleInputChange("estimated_budget", e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Currency</Label>
                          <Select value={formData.budget_currency} onValueChange={(v) => handleInputChange("budget_currency", v)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="USD">USD ($)</SelectItem>
                              <SelectItem value="EUR">EUR (€)</SelectItem>
                              <SelectItem value="GBP">GBP (£)</SelectItem>
                              <SelectItem value="INR">INR (₹)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Quantity</Label>
                          <Input
                            type="number"
                            placeholder="100"
                            value={formData.quantity}
                            onChange={(e) => handleInputChange("quantity", e.target.value)}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Delivery */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="w-5 h-5" />
                        Delivery Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <Label>Delivery Location *</Label>
                          <Input
                            placeholder="City, State/Country"
                            value={formData.delivery_location}
                            onChange={(e) => handleInputChange("delivery_location", e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Required By Date</Label>
                          <Input
                            type="date"
                            value={formData.required_by_date}
                            onChange={(e) => handleInputChange("required_by_date", e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="mt-4">
                        <Label>Preferred Suppliers (Optional)</Label>
                        <Input
                          placeholder="Supplier names separated by commas"
                          value={formData.preferred_suppliers}
                          onChange={(e) => handleInputChange("preferred_suppliers", e.target.value)}
                        />
                        <p className="text-xs text-slate-500 mt-1">Leave blank to let us identify the best suppliers</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Payment Model */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Receipt className="w-5 h-5" />
                        Payment Model
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-3 gap-4">
                        {PAYMENT_MODELS.map((model) => (
                          <div
                            key={model.id}
                            className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                              formData.payment_model === model.id
                                ? 'border-[#007CC3] bg-[#007CC3]/5'
                                : 'border-slate-200 hover:border-slate-300'
                            }`}
                            onClick={() => handleInputChange("payment_model", model.id)}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <div className={`w-4 h-4 rounded-full border-2 ${
                                formData.payment_model === model.id
                                  ? 'border-[#007CC3] bg-[#007CC3]'
                                  : 'border-slate-300'
                              }`}>
                                {formData.payment_model === model.id && (
                                  <CheckCircle className="w-3 h-3 text-white" />
                                )}
                              </div>
                              <span className="font-semibold text-sm">{model.name}</span>
                            </div>
                            <p className="text-xs text-slate-500">{model.description}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Submit Button */}
                  <Button
                    className="w-full bg-[#FF6B00] hover:bg-[#E65000] py-6 text-lg"
                    onClick={handleSubmit}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Submitting Request...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5 mr-2" />
                        Submit Sourcing Request
                      </>
                    )}
                  </Button>
                </div>

                {/* Info Panel */}
                <div className="space-y-6">
                  <Card className="bg-[#FF6B00]/10 border-[#FF6B00]/20">
                    <CardContent className="p-6">
                      <Handshake className="w-10 h-10 text-[#FF6B00] mb-4" />
                      <h3 className="font-bold text-slate-900 mb-2">What We Do For You</h3>
                      <ul className="space-y-3 text-sm">
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                          <span className="text-slate-700">Identify & qualify suppliers</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                          <span className="text-slate-700">Send professional RFQs</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                          <span className="text-slate-700">Negotiate best terms</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                          <span className="text-slate-700">Analyze & compare quotes</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                          <span className="text-slate-700">Deliver ready-to-approve quotation</span>
                        </li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <Clock className="w-10 h-10 text-[#007CC3] mb-4" />
                      <h3 className="font-bold text-slate-900 mb-2">Timeline</h3>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Standard</span>
                          <span className="font-semibold">5-7 days</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Urgent</span>
                          <span className="font-semibold">2-3 days</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Critical</span>
                          <span className="font-semibold">24-48 hours</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <User className="w-10 h-10 text-purple-600 mb-4" />
                      <h3 className="font-bold text-slate-900 mb-2">Your Specialist</h3>
                      <p className="text-sm text-slate-600">
                        A dedicated Infosys procurement specialist will be assigned to your request within 24 hours.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* Request History */}
            <TabsContent value="history">
              {loadingHistory ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                </div>
              ) : requests.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Handshake className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">No Sourcing Requests Yet</h3>
                    <p className="text-slate-500 mb-4">Submit your first request to get started</p>
                    <Button onClick={() => setActiveTab("new-request")}>
                      Create New Request
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {requests.map((request) => (
                    <Card key={request.sourcing_id} className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold text-slate-900">{request.request_title}</h3>
                              <Badge className={getStatusColor(request.status)}>
                                {request.status.replace(/_/g, " ")}
                              </Badge>
                              <Badge variant="outline" className={
                                request.urgency === "critical" ? "border-red-300 text-red-600" :
                                request.urgency === "urgent" ? "border-amber-300 text-amber-600" :
                                "border-slate-300 text-slate-600"
                              }>
                                {request.urgency.charAt(0).toUpperCase() + request.urgency.slice(1)}
                              </Badge>
                            </div>
                            <p className="text-sm text-slate-500 mb-3">
                              {request.sourcing_id} • {request.category} • {new Date(request.created_at).toLocaleDateString()}
                            </p>
                            <p className="text-sm text-slate-600 line-clamp-2">{request.description}</p>
                            
                            <div className="flex items-center gap-6 mt-4 text-sm">
                              {request.estimated_budget && (
                                <div className="flex items-center gap-1 text-slate-500">
                                  <DollarSign className="w-4 h-4" />
                                  <span>{request.budget_currency} {request.estimated_budget.toLocaleString()}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1 text-slate-500">
                                <MapPin className="w-4 h-4" />
                                <span>{request.delivery_location}</span>
                              </div>
                              <div className="flex items-center gap-1 text-slate-500">
                                <Calendar className="w-4 h-4" />
                                <span>Est. {request.estimated_completion}</span>
                              </div>
                            </div>

                            {request.assigned_specialist && (
                              <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                                <p className="text-xs text-slate-500 mb-1">Assigned Specialist</p>
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 bg-[#007CC3] rounded-full flex items-center justify-center text-white text-sm font-semibold">
                                    {request.assigned_specialist.name.charAt(0)}
                                  </div>
                                  <div>
                                    <p className="font-medium text-sm">{request.assigned_specialist.name}</p>
                                    <p className="text-xs text-slate-500">{request.assigned_specialist.email}</p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                          <Button variant="ghost" size="sm">
                            <ChevronRight className="w-5 h-5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default SourcingSupportPage;

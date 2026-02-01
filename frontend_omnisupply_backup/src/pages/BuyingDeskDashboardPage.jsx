import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { useAuth } from "../App";
import Sidebar from "../components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { 
  CheckCircle, 
  Clock, 
  Search,
  FileText,
  Building2,
  Send,
  MessageSquare,
  Handshake,
  Package,
  ArrowRight,
  Loader2,
  RefreshCw,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Eye
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Stage definitions for tracking
const STAGES = [
  { key: "submitted", title: "Submitted", icon: FileText, description: "Request received" },
  { key: "supplier_identification", title: "Supplier Identification", icon: Search, description: "Finding best suppliers" },
  { key: "rfq_sent", title: "RFQ Sent", icon: Send, description: "Request for quotes sent" },
  { key: "quotes_received", title: "Quotes Received", icon: MessageSquare, description: "Analyzing received quotes" },
  { key: "negotiating", title: "Negotiating", icon: Handshake, description: "Negotiating best terms" },
  { key: "po_ready", title: "PO Ready", icon: Package, description: "Purchase order ready" }
];

const BuyingDeskDashboardPage = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user && token) {
      fetchRequests();
    }
  }, [user, token]);

  const fetchRequests = async () => {
    try {
      const response = await axios.get(`${API}/procurement/buying-desk/requests`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      setRequests(response.data.requests || []);
    } catch (error) {
      console.error("Failed to fetch requests:", error);
      toast.error("Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchRequests();
    setRefreshing(false);
    toast.success("Requests refreshed");
  };

  const getStageIndex = (currentStage) => {
    return STAGES.findIndex(s => s.key === currentStage);
  };

  const getStatusColor = (status) => {
    switch(status) {
      case "submitted": return "bg-blue-100 text-blue-700";
      case "supplier_identification": return "bg-purple-100 text-purple-700";
      case "rfq_sent": return "bg-cyan-100 text-cyan-700";
      case "quotes_received": return "bg-amber-100 text-amber-700";
      case "negotiating": return "bg-orange-100 text-orange-700";
      case "po_ready": return "bg-green-100 text-green-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!user) {
    navigate("/login");
    return null;
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar activePage="buying-desk" />
      
      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#007CC3]/10 rounded-xl flex items-center justify-center">
                <Building2 className="w-6 h-6 text-[#007CC3]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
                  Buying Desk Dashboard
                </h1>
                <p className="text-slate-600">Track your managed procurement requests</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={handleRefresh}
              disabled={refreshing}
              data-testid="refresh-requests-btn"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{requests.length}</p>
                  <p className="text-sm text-slate-500">Total Requests</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">
                    {requests.filter(r => r.current_stage !== 'po_ready').length}
                  </p>
                  <p className="text-sm text-slate-500">In Progress</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">
                    {requests.filter(r => r.current_stage === 'po_ready').length}
                  </p>
                  <p className="text-sm text-slate-500">Completed</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">
                    ${requests.reduce((sum, r) => sum + (r.potential_savings || 0), 0).toLocaleString()}
                  </p>
                  <p className="text-sm text-slate-500">Potential Savings</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-[#007CC3]" />
            </div>
          ) : requests.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No Requests Yet</h3>
                <p className="text-slate-600 mb-6 max-w-md mx-auto">
                  You have not submitted any Buying Desk requests yet. Upload a quotation and engage our tactical buyers to get started.
                </p>
                <div className="flex gap-4 justify-center">
                  <Button onClick={() => navigate("/upload-quotation")} className="bg-purple-600 hover:bg-purple-700">
                    Upload Quotation
                  </Button>
                  <Button onClick={() => navigate("/sourcing-support")} variant="outline">
                    Request Sourcing
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Request List */}
              <div className="grid gap-4">
                {requests.map((request) => (
                  <Card 
                    key={request.request_id}
                    className={`cursor-pointer transition-all hover:shadow-lg ${
                      selectedRequest?.request_id === request.request_id ? 'ring-2 ring-[#007CC3]' : ''
                    }`}
                    onClick={() => setSelectedRequest(selectedRequest?.request_id === request.request_id ? null : request)}
                    data-testid={`request-card-${request.request_id}`}
                  >
                    <CardContent className="p-6">
                      {/* Request Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg font-bold text-slate-900">{request.request_id}</span>
                            <Badge className={getStatusColor(request.current_stage)}>
                              {STAGES.find(s => s.key === request.current_stage)?.title || request.current_stage}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-600">
                            Supplier: <span className="font-medium">{request.supplier_name}</span>
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-slate-900">${request.total_amount?.toLocaleString()}</p>
                          <p className="text-sm text-green-600 flex items-center justify-end gap-1">
                            <TrendingUp className="w-3 h-3" />
                            ${request.potential_savings?.toLocaleString()} potential savings
                          </p>
                        </div>
                      </div>

                      {/* Progress Tracker */}
                      <div className="relative">
                        {/* Progress Line */}
                        <div className="absolute top-5 left-0 right-0 h-1 bg-slate-200 rounded-full">
                          <div 
                            className="h-full bg-[#007CC3] rounded-full transition-all duration-500"
                            style={{ width: `${(getStageIndex(request.current_stage) / (STAGES.length - 1)) * 100}%` }}
                          />
                        </div>
                        
                        {/* Stage Icons */}
                        <div className="flex justify-between relative">
                          {STAGES.map((stage, idx) => {
                            const isCompleted = idx <= getStageIndex(request.current_stage);
                            const isCurrent = stage.key === request.current_stage;
                            const StageIcon = stage.icon;
                            
                            return (
                              <div key={stage.key} className="flex flex-col items-center" style={{ width: '16.66%' }}>
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                                  isCompleted 
                                    ? 'bg-[#007CC3] border-[#007CC3] text-white' 
                                    : 'bg-white border-slate-300 text-slate-400'
                                } ${isCurrent ? 'ring-4 ring-[#007CC3]/20' : ''}`}>
                                  {isCompleted && idx < getStageIndex(request.current_stage) ? (
                                    <CheckCircle className="w-5 h-5" />
                                  ) : (
                                    <StageIcon className="w-5 h-5" />
                                  )}
                                </div>
                                <span className={`text-xs mt-2 text-center ${isCompleted ? 'text-[#007CC3] font-medium' : 'text-slate-400'}`}>
                                  {stage.title}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {selectedRequest?.request_id === request.request_id && (
                        <div className="mt-6 pt-6 border-t border-slate-200">
                          <div className="grid md:grid-cols-3 gap-4 mb-4">
                            <div className="p-4 bg-slate-50 rounded-lg">
                              <p className="text-xs text-slate-500 mb-1">Submitted</p>
                              <p className="font-medium text-slate-900">{formatDate(request.submitted_at)}</p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-lg">
                              <p className="text-xs text-slate-500 mb-1">Expected Response</p>
                              <p className="font-medium text-slate-900">{formatDate(request.expected_response_by)}</p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-lg">
                              <p className="text-xs text-slate-500 mb-1">Line Items</p>
                              <p className="font-medium text-slate-900">{request.line_items_count} items</p>
                            </div>
                          </div>
                          
                          <div className="p-4 bg-[#007CC3]/5 rounded-lg mb-4">
                            <p className="text-sm text-[#007CC3] font-medium mb-1">Assigned To</p>
                            <p className="text-slate-900">{request.assigned_to}</p>
                          </div>

                          {/* Stage History */}
                          {request.stages && (
                            <div className="space-y-3">
                              <p className="text-sm font-semibold text-slate-900">Progress History</p>
                              {request.stages.filter(s => s.completed).map((stage, idx) => (
                                <div key={idx} className="flex items-center gap-3 text-sm">
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                  <span className="font-medium">{stage.title}</span>
                                  <span className="text-slate-400">•</span>
                                  <span className="text-slate-500">{formatDate(stage.completed_at)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          <div className="mt-4 flex gap-3">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (request.quotation_id) {
                                  navigate(`/upload-quotation`);
                                }
                              }}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View Original Quotation
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      {/* Click to expand hint */}
                      {selectedRequest?.request_id !== request.request_id && (
                        <p className="text-xs text-slate-400 mt-4 text-center">
                          Click to view details
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default BuyingDeskDashboardPage;

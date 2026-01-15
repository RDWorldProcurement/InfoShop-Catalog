import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import { 
  Upload, FileSpreadsheet, Package, Briefcase, Building2, CheckCircle, 
  AlertCircle, LogIn, LogOut, Trash2, Download, RefreshCw, Shield,
  Handshake, FileText, Clock, DollarSign, User, Search, Filter,
  ChevronRight, ChevronDown, Send, MessageSquare, Eye, Edit, 
  TrendingUp, AlertTriangle, Zap, Calendar, MapPin, Phone, Mail
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Stage definitions for tactical buying
const BUYING_STAGES = [
  { key: "submitted", title: "Submitted", color: "bg-blue-100 text-blue-700" },
  { key: "supplier_identification", title: "Supplier ID", color: "bg-purple-100 text-purple-700" },
  { key: "rfq_sent", title: "RFQ Sent", color: "bg-cyan-100 text-cyan-700" },
  { key: "quotes_received", title: "Quotes Received", color: "bg-amber-100 text-amber-700" },
  { key: "negotiating", title: "Negotiating", color: "bg-orange-100 text-orange-700" },
  { key: "po_ready", title: "PO Ready", color: "bg-green-100 text-green-700" }
];

// Sourcing status definitions
const SOURCING_STATUSES = [
  { key: "SUBMITTED", title: "Submitted", color: "bg-blue-100 text-blue-700" },
  { key: "IN_PROGRESS", title: "In Progress", color: "bg-purple-100 text-purple-700" },
  { key: "RFQ_SENT", title: "RFQ Sent", color: "bg-cyan-100 text-cyan-700" },
  { key: "QUOTES_RECEIVED", title: "Quotes Received", color: "bg-amber-100 text-amber-700" },
  { key: "COMPLETED", title: "Completed", color: "bg-green-100 text-green-700" },
  { key: "CANCELLED", title: "Cancelled", color: "bg-red-100 text-red-700" }
];

export default function AdminPortalPage() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [adminToken, setAdminToken] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Upload state
  const [selectedPartner, setSelectedPartner] = useState('');
  const [catalogType, setCatalogType] = useState('products');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  // Data state
  const [deliveryPartners, setDeliveryPartners] = useState([]);
  const [catalogSummary, setCatalogSummary] = useState(null);
  
  // Buying Desk state
  const [tacticalRequests, setTacticalRequests] = useState([]);
  const [tacticalStats, setTacticalStats] = useState({});
  const [sourcingRequests, setSourcingRequests] = useState([]);
  const [sourcingStats, setSourcingStats] = useState({});
  const [dashboardStats, setDashboardStats] = useState(null);
  const [specialists, setSpecialists] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [newNote, setNewNote] = useState('');
  const [selectedSpecialist, setSelectedSpecialist] = useState('');

  useEffect(() => {
    const savedToken = localStorage.getItem('adminToken');
    if (savedToken) {
      setAdminToken(savedToken);
      setIsLoggedIn(true);
      loadData();
    }
  }, []);

  const loadData = async () => {
    try {
      const [partnersRes, summaryRes] = await Promise.all([
        axios.get(`${API_URL}/api/admin/delivery-partners`),
        axios.get(`${API_URL}/api/admin/uploaded-catalogs`)
      ]);
      setDeliveryPartners(partnersRes.data.partners);
      setCatalogSummary(summaryRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const loadBuyingDeskData = async () => {
    setLoadingRequests(true);
    try {
      const [tacticalRes, sourcingRes, statsRes, specialistsRes] = await Promise.all([
        axios.get(`${API_URL}/api/admin/buying-desk/requests`),
        axios.get(`${API_URL}/api/admin/sourcing/requests`),
        axios.get(`${API_URL}/api/admin/buying-desk/dashboard-stats`),
        axios.get(`${API_URL}/api/admin/buying-desk/specialists`)
      ]);
      setTacticalRequests(tacticalRes.data.requests || []);
      setTacticalStats(tacticalRes.data.stats || {});
      setSourcingRequests(sourcingRes.data.requests || []);
      setSourcingStats(sourcingRes.data.stats || {});
      setDashboardStats(statsRes.data);
      setSpecialists(specialistsRes.data.specialists || []);
    } catch (error) {
      console.error('Error loading buying desk data:', error);
      toast.error('Failed to load buying desk data');
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoading(true);
    
    try {
      const response = await axios.post(`${API_URL}/api/admin/login`, {
        username,
        password
      });
      
      if (response.data.success) {
        setAdminToken(response.data.token);
        setIsLoggedIn(true);
        localStorage.setItem('adminToken', response.data.token);
        loadData();
      }
    } catch (error) {
      setLoginError(error.response?.data?.detail || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setAdminToken('');
    localStorage.removeItem('adminToken');
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setUploadResult(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedPartner) {
      setUploadResult({ success: false, message: 'Please select a file and delivery partner' });
      return;
    }
    
    setUploading(true);
    setUploadResult(null);
    
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('partner_id', selectedPartner);
    formData.append('catalog_type', catalogType);
    
    try {
      const response = await axios.post(`${API_URL}/api/admin/upload-catalog`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${adminToken}`
        }
      });
      
      setUploadResult(response.data);
      loadData();
      setSelectedFile(null);
      document.getElementById('file-upload').value = '';
    } catch (error) {
      setUploadResult({
        success: false,
        message: error.response?.data?.detail || 'Upload failed'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleClearCatalog = async (partnerId) => {
    if (!window.confirm('Are you sure you want to clear this catalog? This action cannot be undone.')) {
      return;
    }
    
    try {
      await axios.delete(`${API_URL}/api/admin/clear-catalog/${partnerId}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      loadData();
    } catch (error) {
      console.error('Error clearing catalog:', error);
    }
  };

  const downloadSampleCSV = (type) => {
    const headers = type === 'products' 
      ? 'name,description,brand,category,sku,unspsc,price,unit,image_url'
      : 'name,description,category,unspsc,rate,pricing_model,supplier,image_url';
    
    const sampleData = type === 'products'
      ? '\nSKF Ball Bearing 6205-2RS,Deep groove ball bearing with rubber seals,SKF,Bearings & Power Transmission,SKF-6205-2RS,31170000,45.99,EA,\nBosch Cordless Drill 18V,Professional-grade cordless drill,Bosch,Power Tools,BOSCH-GSR18V,27112000,189.00,EA,'
      : '\nNetwork Installation Service,Complete network cabling and setup,Network Installation Services,81112200,125.00,Per Hour,TechPro Services,\nHVAC Maintenance,Quarterly HVAC system inspection,Facilities Management & Workplace Services,72101502,350.00,Per Visit,Climate Control Inc,';
    
    const blob = new Blob([headers + sampleData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sample_${type}_catalog.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Buying Desk Functions
  const updateTacticalStatus = async (requestId, newStatus) => {
    try {
      await axios.put(`${API_URL}/api/admin/buying-desk/request/${requestId}/status`, {
        status: newStatus,
        notes: `Status updated to ${newStatus}`
      });
      toast.success(`Status updated to ${newStatus}`);
      loadBuyingDeskData();
      setSelectedRequest(null);
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const updateSourcingStatus = async (sourcingId, newStatus) => {
    try {
      await axios.put(`${API_URL}/api/admin/sourcing/request/${sourcingId}/status`, {
        status: newStatus,
        notes: `Status updated to ${newStatus}`
      });
      toast.success(`Status updated to ${newStatus}`);
      loadBuyingDeskData();
      setSelectedRequest(null);
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const assignSpecialist = async (requestId, type) => {
    if (!selectedSpecialist) {
      toast.error('Please select a specialist');
      return;
    }
    const specialist = specialists.find(s => s.email === selectedSpecialist);
    if (!specialist) return;

    try {
      const endpoint = type === 'tactical' 
        ? `${API_URL}/api/admin/buying-desk/request/${requestId}/assign`
        : `${API_URL}/api/admin/sourcing/request/${requestId}/assign`;
      
      await axios.put(endpoint, {
        specialist_name: specialist.name,
        specialist_email: specialist.email
      });
      toast.success(`Assigned to ${specialist.name}`);
      loadBuyingDeskData();
      setSelectedSpecialist('');
    } catch (error) {
      toast.error('Failed to assign specialist');
    }
  };

  const addNote = async (requestId, type) => {
    if (!newNote.trim()) {
      toast.error('Please enter a note');
      return;
    }

    try {
      const endpoint = type === 'tactical'
        ? `${API_URL}/api/admin/buying-desk/request/${requestId}/note`
        : `${API_URL}/api/admin/sourcing/request/${requestId}/note`;
      
      await axios.post(endpoint, {
        note: newNote,
        author: 'Admin'
      });
      toast.success('Note added');
      setNewNote('');
      loadBuyingDeskData();
    } catch (error) {
      toast.error('Failed to add note');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const getStageColor = (stage) => {
    const found = BUYING_STAGES.find(s => s.key === stage);
    return found ? found.color : 'bg-slate-100 text-slate-700';
  };

  const getStatusColor = (status) => {
    const found = SOURCING_STATUSES.find(s => s.key === status);
    return found ? found.color : 'bg-slate-100 text-slate-700';
  };

  // Login Screen
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-slate-700 bg-slate-800/50 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-[#007CC3]/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-[#007CC3]" />
            </div>
            <CardTitle className="text-2xl text-white">Admin Portal</CardTitle>
            <CardDescription className="text-slate-400">
              OMNISupply.io Buying Desk & Catalog Management
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-slate-300">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="bg-slate-700 border-slate-600 text-white"
                  data-testid="admin-username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-slate-700 border-slate-600 text-white"
                  data-testid="admin-password"
                />
              </div>
              
              {loginError && (
                <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center gap-2 text-red-400">
                  <AlertCircle className="w-4 h-4" />
                  {loginError}
                </div>
              )}
              
              <Button 
                type="submit" 
                className="w-full bg-[#007CC3] hover:bg-[#00629B]"
                disabled={loading}
                data-testid="admin-login-btn"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <LogIn className="w-4 h-4 mr-2" />}
                Sign In to Admin Portal
              </Button>
              
              <div className="text-center text-sm text-slate-500 mt-4">
                <p>Demo credentials: admin / admin123</p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Admin Dashboard
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-[#007CC3]" />
              <div>
                <h1 className="text-xl font-bold text-slate-900">Admin Portal</h1>
                <p className="text-xs text-slate-500">Buying Desk & Catalog Management</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => navigate('/catalog')} className="text-sm">
                View Catalog
              </Button>
              <Button variant="ghost" onClick={handleLogout} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="buying-desk" className="space-y-6" onValueChange={(value) => {
          if (value === 'buying-desk' || value === 'sourcing') {
            loadBuyingDeskData();
          }
        }}>
          <TabsList className="bg-white border">
            <TabsTrigger value="buying-desk" className="data-[state=active]:bg-[#007CC3] data-[state=active]:text-white">
              <Handshake className="w-4 h-4 mr-2" />
              Tactical Buying
            </TabsTrigger>
            <TabsTrigger value="sourcing" className="data-[state=active]:bg-[#FF6B00] data-[state=active]:text-white">
              <Briefcase className="w-4 h-4 mr-2" />
              Managed Services
            </TabsTrigger>
            <TabsTrigger value="upload" className="data-[state=active]:bg-[#007CC3] data-[state=active]:text-white">
              <Upload className="w-4 h-4 mr-2" />
              Upload Catalog
            </TabsTrigger>
            <TabsTrigger value="partners" className="data-[state=active]:bg-[#007CC3] data-[state=active]:text-white">
              <Building2 className="w-4 h-4 mr-2" />
              Delivery Partners
            </TabsTrigger>
          </TabsList>

          {/* Tactical Buying Tab */}
          <TabsContent value="buying-desk">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-xs">Total Requests</p>
                      <p className="text-2xl font-bold">{tacticalStats.total || 0}</p>
                    </div>
                    <FileText className="w-8 h-8 text-blue-200" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-amber-100 text-xs">Pending Action</p>
                      <p className="text-2xl font-bold">{(tacticalStats.submitted || 0) + (tacticalStats.supplier_identification || 0)}</p>
                    </div>
                    <Clock className="w-8 h-8 text-amber-200" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-cyan-100 text-xs">RFQ Sent</p>
                      <p className="text-2xl font-bold">{tacticalStats.rfq_sent || 0}</p>
                    </div>
                    <Send className="w-8 h-8 text-cyan-200" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-100 text-xs">Negotiating</p>
                      <p className="text-2xl font-bold">{tacticalStats.negotiating || 0}</p>
                    </div>
                    <Handshake className="w-8 h-8 text-orange-200" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-xs">PO Ready</p>
                      <p className="text-2xl font-bold">{tacticalStats.po_ready || 0}</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-200" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filter and Refresh */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {BUYING_STAGES.map(stage => (
                      <SelectItem key={stage.key} value={stage.key}>{stage.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" onClick={loadBuyingDeskData} disabled={loadingRequests}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loadingRequests ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {/* Request List */}
            {loadingRequests ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
              </div>
            ) : tacticalRequests.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Handshake className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-700 mb-2">No Tactical Buying Requests</h3>
                  <p className="text-slate-500">Requests from users who engage tactical buyers will appear here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {tacticalRequests
                  .filter(r => statusFilter === 'all' || r.current_stage === statusFilter)
                  .map((request) => (
                  <Card key={request.request_id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-bold text-slate-900">{request.request_id}</span>
                            <Badge className={getStageColor(request.current_stage)}>
                              {BUYING_STAGES.find(s => s.key === request.current_stage)?.title || request.current_stage}
                            </Badge>
                          </div>
                          <div className="grid md:grid-cols-4 gap-4 text-sm mb-4">
                            <div>
                              <p className="text-slate-500">Customer</p>
                              <p className="font-medium">{request.user_name || request.user_id}</p>
                            </div>
                            <div>
                              <p className="text-slate-500">Supplier</p>
                              <p className="font-medium">{request.supplier_name}</p>
                            </div>
                            <div>
                              <p className="text-slate-500">Amount</p>
                              <p className="font-medium">${request.total_amount?.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-slate-500">Potential Savings</p>
                              <p className="font-medium text-green-600">${request.potential_savings?.toLocaleString()}</p>
                            </div>
                          </div>
                          
                          {/* Progress Bar */}
                          <div className="flex items-center gap-1 mb-4">
                            {BUYING_STAGES.map((stage, idx) => {
                              const currentIdx = BUYING_STAGES.findIndex(s => s.key === request.current_stage);
                              const isCompleted = idx <= currentIdx;
                              return (
                                <div key={stage.key} className="flex-1">
                                  <div className={`h-2 rounded-full ${isCompleted ? 'bg-[#007CC3]' : 'bg-slate-200'}`} />
                                  <p className={`text-xs mt-1 ${isCompleted ? 'text-[#007CC3]' : 'text-slate-400'}`}>
                                    {stage.title}
                                  </p>
                                </div>
                              );
                            })}
                          </div>

                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Submitted: {formatDate(request.submitted_at)}
                            </span>
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              Assigned: {request.assigned_to || 'Unassigned'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Package className="w-3 h-3" />
                              {request.line_items_count} items
                            </span>
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedRequest(selectedRequest?.request_id === request.request_id ? null : { ...request, type: 'tactical' })}
                        >
                          {selectedRequest?.request_id === request.request_id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </Button>
                      </div>

                      {/* Expanded Actions Panel */}
                      {selectedRequest?.request_id === request.request_id && (
                        <div className="mt-6 pt-6 border-t border-slate-200 space-y-4">
                          <div className="grid md:grid-cols-2 gap-4">
                            {/* Update Status */}
                            <Card className="bg-slate-50">
                              <CardHeader className="pb-2">
                                <CardTitle className="text-sm flex items-center gap-2">
                                  <Edit className="w-4 h-4" /> Update Status
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="flex flex-wrap gap-2">
                                  {BUYING_STAGES.map(stage => (
                                    <Button
                                      key={stage.key}
                                      size="sm"
                                      variant={request.current_stage === stage.key ? 'default' : 'outline'}
                                      className={request.current_stage === stage.key ? 'bg-[#007CC3]' : ''}
                                      onClick={() => updateTacticalStatus(request.request_id, stage.key)}
                                    >
                                      {stage.title}
                                    </Button>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>

                            {/* Assign Specialist */}
                            <Card className="bg-slate-50">
                              <CardHeader className="pb-2">
                                <CardTitle className="text-sm flex items-center gap-2">
                                  <User className="w-4 h-4" /> Assign Specialist
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="flex gap-2">
                                  <Select value={selectedSpecialist} onValueChange={setSelectedSpecialist}>
                                    <SelectTrigger className="flex-1">
                                      <SelectValue placeholder="Select specialist" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {specialists.map(s => (
                                        <SelectItem key={s.email} value={s.email}>
                                          {s.name} - {s.specialty}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Button onClick={() => assignSpecialist(request.request_id, 'tactical')}>
                                    Assign
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          </div>

                          {/* Add Note */}
                          <Card className="bg-slate-50">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm flex items-center gap-2">
                                <MessageSquare className="w-4 h-4" /> Add Note
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="flex gap-2">
                                <Textarea
                                  placeholder="Add a note about this request..."
                                  value={newNote}
                                  onChange={(e) => setNewNote(e.target.value)}
                                  className="flex-1"
                                  rows={2}
                                />
                                <Button onClick={() => addNote(request.request_id, 'tactical')}>
                                  Add
                                </Button>
                              </div>
                            </CardContent>
                          </Card>

                          {/* Notes History */}
                          {request.notes && request.notes.length > 0 && (
                            <div>
                              <p className="text-sm font-medium text-slate-700 mb-2">Notes History</p>
                              <div className="space-y-2 max-h-40 overflow-y-auto">
                                {request.notes.map((note, idx) => (
                                  <div key={idx} className="p-3 bg-white rounded-lg border text-sm">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="font-medium text-slate-900">{note.author}</span>
                                      <span className="text-xs text-slate-500">{formatDate(note.timestamp)}</span>
                                    </div>
                                    <p className="text-slate-600">{note.text}</p>
                                    {note.action && <Badge variant="outline" className="mt-1 text-xs">{note.action}</Badge>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Sourcing/Managed Services Tab */}
          <TabsContent value="sourcing">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
              <Card className="bg-gradient-to-br from-[#FF6B00] to-[#E65000] text-white">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-100 text-xs">Total Requests</p>
                      <p className="text-2xl font-bold">{sourcingStats.total || 0}</p>
                    </div>
                    <Briefcase className="w-8 h-8 text-orange-200" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-red-100 text-xs">Urgent/Critical</p>
                      <p className="text-2xl font-bold">{(sourcingStats.urgent || 0) + (sourcingStats.critical || 0)}</p>
                    </div>
                    <AlertTriangle className="w-8 h-8 text-red-200" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-xs">In Progress</p>
                      <p className="text-2xl font-bold">{sourcingStats.in_progress || 0}</p>
                    </div>
                    <Zap className="w-8 h-8 text-purple-200" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-cyan-100 text-xs">RFQ Sent</p>
                      <p className="text-2xl font-bold">{sourcingStats.rfq_sent || 0}</p>
                    </div>
                    <Send className="w-8 h-8 text-cyan-200" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-xs">Completed</p>
                      <p className="text-2xl font-bold">{sourcingStats.completed || 0}</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-200" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filter and Refresh */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {SOURCING_STATUSES.map(status => (
                      <SelectItem key={status.key} value={status.key}>{status.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" onClick={loadBuyingDeskData} disabled={loadingRequests}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loadingRequests ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {/* Request List */}
            {loadingRequests ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
              </div>
            ) : sourcingRequests.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Briefcase className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-700 mb-2">No Sourcing Requests</h3>
                  <p className="text-slate-500">Managed services requests from users will appear here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {sourcingRequests
                  .filter(r => statusFilter === 'all' || r.status === statusFilter)
                  .map((request) => (
                  <Card key={request.sourcing_id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-bold text-slate-900">{request.sourcing_id}</span>
                            <Badge className={getStatusColor(request.status)}>
                              {request.status?.replace(/_/g, ' ')}
                            </Badge>
                            <Badge variant="outline" className={
                              request.urgency === 'critical' ? 'border-red-300 text-red-600' :
                              request.urgency === 'urgent' ? 'border-amber-300 text-amber-600' :
                              'border-slate-300 text-slate-600'
                            }>
                              {request.urgency?.charAt(0).toUpperCase() + request.urgency?.slice(1)}
                            </Badge>
                          </div>
                          <h3 className="font-semibold text-slate-900 mb-2">{request.request_title}</h3>
                          <p className="text-sm text-slate-600 mb-4 line-clamp-2">{request.description}</p>
                          
                          <div className="grid md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-slate-500">Customer</p>
                              <p className="font-medium">{request.user_name || request.user_id}</p>
                            </div>
                            <div>
                              <p className="text-slate-500">Category</p>
                              <p className="font-medium">{request.category}</p>
                            </div>
                            <div>
                              <p className="text-slate-500">Budget</p>
                              <p className="font-medium">
                                {request.estimated_budget 
                                  ? `${request.budget_currency} ${request.estimated_budget.toLocaleString()}`
                                  : 'Not specified'}
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-500">Delivery</p>
                              <p className="font-medium flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {request.delivery_location}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 mt-4 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Submitted: {formatDate(request.created_at)}
                            </span>
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              Assigned: {request.assigned_specialist?.name || 'Unassigned'}
                            </span>
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedRequest(selectedRequest?.sourcing_id === request.sourcing_id ? null : { ...request, type: 'sourcing' })}
                        >
                          {selectedRequest?.sourcing_id === request.sourcing_id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </Button>
                      </div>

                      {/* Expanded Actions Panel */}
                      {selectedRequest?.sourcing_id === request.sourcing_id && (
                        <div className="mt-6 pt-6 border-t border-slate-200 space-y-4">
                          <div className="grid md:grid-cols-2 gap-4">
                            {/* Update Status */}
                            <Card className="bg-slate-50">
                              <CardHeader className="pb-2">
                                <CardTitle className="text-sm flex items-center gap-2">
                                  <Edit className="w-4 h-4" /> Update Status
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="flex flex-wrap gap-2">
                                  {SOURCING_STATUSES.map(status => (
                                    <Button
                                      key={status.key}
                                      size="sm"
                                      variant={request.status === status.key ? 'default' : 'outline'}
                                      className={request.status === status.key ? 'bg-[#FF6B00]' : ''}
                                      onClick={() => updateSourcingStatus(request.sourcing_id, status.key)}
                                    >
                                      {status.title}
                                    </Button>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>

                            {/* Assign Specialist */}
                            <Card className="bg-slate-50">
                              <CardHeader className="pb-2">
                                <CardTitle className="text-sm flex items-center gap-2">
                                  <User className="w-4 h-4" /> Assign Specialist
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="flex gap-2">
                                  <Select value={selectedSpecialist} onValueChange={setSelectedSpecialist}>
                                    <SelectTrigger className="flex-1">
                                      <SelectValue placeholder="Select specialist" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {specialists.map(s => (
                                        <SelectItem key={s.email} value={s.email}>
                                          {s.name} - {s.specialty}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Button onClick={() => assignSpecialist(request.sourcing_id, 'sourcing')}>
                                    Assign
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          </div>

                          {/* Request Details */}
                          <Card className="bg-slate-50">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm flex items-center gap-2">
                                <Eye className="w-4 h-4" /> Full Request Details
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm">
                              <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                  <p className="text-slate-500">Technical Specifications</p>
                                  <p className="font-medium">{request.technical_specifications || 'None provided'}</p>
                                </div>
                                <div>
                                  <p className="text-slate-500">Preferred Suppliers</p>
                                  <p className="font-medium">
                                    {request.preferred_suppliers?.length > 0 
                                      ? request.preferred_suppliers.join(', ')
                                      : 'No preference'}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-slate-500">Required By</p>
                                  <p className="font-medium">{request.required_by_date || 'Not specified'}</p>
                                </div>
                                <div>
                                  <p className="text-slate-500">Payment Model</p>
                                  <p className="font-medium">{request.payment_model || 'infosys_limited'}</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                          {/* Add Note */}
                          <Card className="bg-slate-50">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm flex items-center gap-2">
                                <MessageSquare className="w-4 h-4" /> Add Note
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="flex gap-2">
                                <Textarea
                                  placeholder="Add a note about this request..."
                                  value={newNote}
                                  onChange={(e) => setNewNote(e.target.value)}
                                  className="flex-1"
                                  rows={2}
                                />
                                <Button onClick={() => addNote(request.sourcing_id, 'sourcing')}>
                                  Add
                                </Button>
                              </div>
                            </CardContent>
                          </Card>

                          {/* Notes History */}
                          {request.admin_notes && request.admin_notes.length > 0 && (
                            <div>
                              <p className="text-sm font-medium text-slate-700 mb-2">Admin Notes</p>
                              <div className="space-y-2 max-h-40 overflow-y-auto">
                                {request.admin_notes.map((note, idx) => (
                                  <div key={idx} className="p-3 bg-white rounded-lg border text-sm">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="font-medium text-slate-900">{note.author}</span>
                                      <span className="text-xs text-slate-500">{formatDate(note.timestamp)}</span>
                                    </div>
                                    <p className="text-slate-600">{note.text}</p>
                                    {note.action && <Badge variant="outline" className="mt-1 text-xs">{note.action}</Badge>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Upload Tab */}
          <TabsContent value="upload">
            <Card>
              <CardHeader>
                <CardTitle>Upload Vendor Catalog</CardTitle>
                <CardDescription>
                  Import products or services from delivery partners like Grainger, MOTION, Fastenal, BDI
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Delivery Partner</Label>
                    <Select value={selectedPartner} onValueChange={setSelectedPartner}>
                      <SelectTrigger data-testid="partner-select">
                        <SelectValue placeholder="Select delivery partner" />
                      </SelectTrigger>
                      <SelectContent>
                        {deliveryPartners.map((partner) => (
                          <SelectItem key={partner.id} value={partner.id}>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: partner.color }} />
                              {partner.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Catalog Type</Label>
                    <Select value={catalogType} onValueChange={setCatalogType}>
                      <SelectTrigger data-testid="catalog-type-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="products">
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4" />
                            Products
                          </div>
                        </SelectItem>
                        <SelectItem value="services">
                          <div className="flex items-center gap-2">
                            <Briefcase className="w-4 h-4" />
                            Services
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Catalog File (CSV or Excel)</Label>
                  <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center hover:border-[#007CC3] transition-colors">
                    <input
                      id="file-upload"
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileChange}
                      className="hidden"
                      data-testid="file-upload"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <FileSpreadsheet className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                      <p className="text-slate-600 font-medium">
                        {selectedFile ? selectedFile.name : 'Click to upload or drag and drop'}
                      </p>
                      <p className="text-sm text-slate-400 mt-1">CSV, XLSX, or XLS (max 10MB)</p>
                    </label>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button variant="outline" onClick={() => downloadSampleCSV('products')} className="text-sm">
                    <Download className="w-4 h-4 mr-2" />
                    Download Sample Products CSV
                  </Button>
                  <Button variant="outline" onClick={() => downloadSampleCSV('services')} className="text-sm">
                    <Download className="w-4 h-4 mr-2" />
                    Download Sample Services CSV
                  </Button>
                </div>

                <Button 
                  onClick={handleUpload} 
                  disabled={uploading || !selectedFile || !selectedPartner}
                  className="w-full bg-[#007CC3] hover:bg-[#00629B]"
                  data-testid="upload-btn"
                >
                  {uploading ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Catalog
                    </>
                  )}
                </Button>

                {uploadResult && (
                  <div className={`p-4 rounded-lg border ${uploadResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {uploadResult.success ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-600" />
                      )}
                      <span className={`font-medium ${uploadResult.success ? 'text-green-800' : 'text-red-800'}`}>
                        {uploadResult.message}
                      </span>
                    </div>
                    {uploadResult.success && (
                      <div className="text-sm text-green-700">
                        <p>Products imported: {uploadResult.products_imported}</p>
                        <p>Services imported: {uploadResult.services_imported}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Delivery Partners Tab */}
          <TabsContent value="partners">
            <Card>
              <CardHeader>
                <CardTitle>Delivery Partners</CardTitle>
                <CardDescription>Manage catalogs from distribution partners</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {deliveryPartners.map((partner) => (
                    <Card key={partner.id} className="border hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div 
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                            style={{ backgroundColor: partner.color }}
                          >
                            {partner.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{partner.name}</p>
                            <p className="text-xs text-slate-500">{partner.id}</p>
                          </div>
                        </div>
                        <div className="flex gap-2 text-sm">
                          <Badge variant="secondary">
                            {catalogSummary?.products_by_partner?.[partner.name] || 0} Products
                          </Badge>
                          <Badge variant="outline">
                            {catalogSummary?.services_by_partner?.[partner.name] || 0} Services
                          </Badge>
                        </div>
                        {(catalogSummary?.products_by_partner?.[partner.name] > 0 || catalogSummary?.services_by_partner?.[partner.name] > 0) && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="w-full mt-3 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleClearCatalog(partner.id)}
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Clear Catalog
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

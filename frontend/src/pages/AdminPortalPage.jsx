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
import { 
  Upload, FileSpreadsheet, Package, Briefcase, Building2, CheckCircle, 
  AlertCircle, LogIn, LogOut, Trash2, Download, RefreshCw, Shield
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

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

  useEffect(() => {
    // Check for saved admin session
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
      loadData(); // Refresh summary
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
              OMNISupply.io Vendor Catalog Management
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
                <p className="text-xs text-slate-500">Vendor Catalog Management</p>
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
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Total Vendor Products</p>
                  <p className="text-3xl font-bold">{catalogSummary?.total_vendor_products || 0}</p>
                </div>
                <Package className="w-10 h-10 text-blue-200" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Total Vendor Services</p>
                  <p className="text-3xl font-bold">{catalogSummary?.total_vendor_services || 0}</p>
                </div>
                <Briefcase className="w-10 h-10 text-purple-200" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-100 text-sm">Delivery Partners</p>
                  <p className="text-3xl font-bold">{deliveryPartners.length}</p>
                </div>
                <Building2 className="w-10 h-10 text-emerald-200" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm">Active Catalogs</p>
                  <p className="text-3xl font-bold">
                    {Object.keys(catalogSummary?.products_by_partner || {}).length}
                  </p>
                </div>
                <FileSpreadsheet className="w-10 h-10 text-orange-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="upload" className="space-y-6">
          <TabsList className="bg-white border">
            <TabsTrigger value="upload" className="data-[state=active]:bg-[#007CC3] data-[state=active]:text-white">
              <Upload className="w-4 h-4 mr-2" />
              Upload Catalog
            </TabsTrigger>
            <TabsTrigger value="partners" className="data-[state=active]:bg-[#007CC3] data-[state=active]:text-white">
              <Building2 className="w-4 h-4 mr-2" />
              Delivery Partners
            </TabsTrigger>
            <TabsTrigger value="summary" className="data-[state=active]:bg-[#007CC3] data-[state=active]:text-white">
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Catalog Summary
            </TabsTrigger>
          </TabsList>

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
                  {/* Delivery Partner Selection */}
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
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: partner.color }}
                              />
                              {partner.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Catalog Type Selection */}
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

                {/* File Upload */}
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

                {/* Sample Download */}
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

                {/* Upload Button */}
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

                {/* Upload Result */}
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
                    {uploadResult.errors?.length > 0 && (
                      <div className="mt-2 text-sm text-red-600">
                        <p className="font-medium">Errors:</p>
                        <ul className="list-disc list-inside">
                          {uploadResult.errors.map((err, idx) => (
                            <li key={idx}>{err}</li>
                          ))}
                        </ul>
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
                <CardDescription>
                  Manage catalogs from distribution partners
                </CardDescription>
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

          {/* Summary Tab */}
          <TabsContent value="summary">
            <Card>
              <CardHeader>
                <CardTitle>Catalog Summary</CardTitle>
                <CardDescription>
                  Overview of uploaded vendor catalogs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Delivery Partner</TableHead>
                      <TableHead className="text-right">Products</TableHead>
                      <TableHead className="text-right">Services</TableHead>
                      <TableHead className="text-right">Total Items</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deliveryPartners.map((partner) => {
                      const products = catalogSummary?.products_by_partner?.[partner.name] || 0;
                      const services = catalogSummary?.services_by_partner?.[partner.name] || 0;
                      return (
                        <TableRow key={partner.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: partner.color }}
                              />
                              <span className="font-medium">{partner.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{products.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{services.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-semibold">
                            {(products + services).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {(products > 0 || services > 0) && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => handleClearCatalog(partner.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

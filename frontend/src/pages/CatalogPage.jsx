import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth, API } from "../App";
import axios from "axios";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Card, CardContent } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { toast } from "sonner";
import {
  Search, Package, Settings, Coins, Clock, Truck, FileText, RefreshCw,
  Upload, History, ChevronDown, Filter, ShoppingCart, MessageSquare,
  CheckCircle, AlertCircle, XCircle, Zap, ArrowRight, LogOut, Menu,
  Home, Calendar, Boxes, Award, HelpCircle, User, ChevronRight
} from "lucide-react";

const CatalogPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("products");
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [serviceCategories, setServiceCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Modals
  const [rfqModalOpen, setRfqModalOpen] = useState(false);
  const [quotationModalOpen, setQuotationModalOpen] = useState(false);
  const [inventoryModalOpen, setInventoryModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [inventoryData, setInventoryData] = useState(null);
  
  // RFQ Form
  const [rfqForm, setRfqForm] = useState({
    product_description: "",
    quantity: 1,
    brand_name: "",
    oem_part_number: "",
    needed_by: "",
    delivery_location: "",
    supplier_name: "",
    supplier_email: "",
    request_type: "actual",
    is_product: true
  });

  useEffect(() => {
    fetchCategories();
    if (searchQuery || selectedCategory || selectedBrand) {
      handleSearch();
    } else {
      // Initial load with empty search
      handleSearch();
    }
  }, [activeTab]);

  const fetchCategories = async () => {
    try {
      const [catRes, brandRes, serviceCatRes] = await Promise.all([
        axios.get(`${API}/products/categories`),
        axios.get(`${API}/products/brands`),
        axios.get(`${API}/services/categories`)
      ]);
      setCategories(catRes.data.categories);
      setBrands(brandRes.data.brands);
      setServiceCategories(serviceCatRes.data.categories);
    } catch (error) {
      console.error("Failed to fetch categories");
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      if (activeTab === "products") {
        const response = await axios.get(`${API}/products/search`, {
          params: {
            q: searchQuery,
            category: selectedCategory || undefined,
            brand: selectedBrand || undefined,
            limit: 20
          }
        });
        setProducts(response.data.results);
      } else {
        const response = await axios.get(`${API}/services/search`, {
          params: {
            q: searchQuery,
            category: selectedCategory || undefined,
            limit: 20
          }
        });
        setServices(response.data.results);
      }
    } catch (error) {
      toast.error("Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const checkInventory = async (product) => {
    setSelectedProduct(product);
    setInventoryModalOpen(true);
    try {
      const response = await axios.get(`${API}/products/${product.id}/inventory`);
      setInventoryData(response.data);
    } catch (error) {
      toast.error("Failed to check inventory");
    }
  };

  const submitRFQ = async () => {
    try {
      const response = await axios.post(`${API}/rfq/submit`, {
        ...rfqForm,
        is_product: activeTab === "products"
      });
      toast.success(response.data.message);
      setRfqModalOpen(false);
      setRfqForm({
        product_description: "",
        quantity: 1,
        brand_name: "",
        oem_part_number: "",
        needed_by: "",
        delivery_location: "",
        supplier_name: "",
        supplier_email: "",
        request_type: "actual",
        is_product: true
      });
    } catch (error) {
      toast.error("Failed to submit RFQ");
    }
  };

  const requestQuotation = async () => {
    if (!selectedProduct) return;
    try {
      const response = await axios.post(`${API}/quotation/request`, {
        product_id: selectedProduct.id,
        product_name: selectedProduct.name,
        quantity: 1,
        notes: ""
      });
      toast.success(response.data.message);
      setQuotationModalOpen(false);
    } catch (error) {
      toast.error("Failed to request quotation");
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const NavItem = ({ icon: Icon, label, path, active }) => (
    <button
      onClick={() => navigate(path)}
      className={`sidebar-nav-item w-full ${active ? 'active' : ''}`}
      data-testid={`nav-${label.toLowerCase().replace(/\s/g, '-')}`}
    >
      <Icon className="w-5 h-5" />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-0'} bg-white border-r border-slate-200 flex-shrink-0 transition-all duration-300 overflow-hidden`}>
        <div className="p-6 min-w-64">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-[#007CC3] rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-lg text-slate-900" style={{ fontFamily: 'Manrope' }}>
              OMNI<span className="text-[#007CC3]">Supply</span>
            </span>
          </div>

          {/* User Info */}
          <div className="mb-6 p-4 bg-slate-50 rounded-xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-[#007CC3]/10 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-[#007CC3]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 truncate">{user?.name}</p>
                <p className="text-xs text-slate-500">{user?.country}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <div className="infocoins-badge text-sm">
                <Coins className="w-4 h-4" />
                {user?.info_coins || 0}
              </div>
              <span className="text-xs text-slate-500">InfoCoins</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="space-y-1">
            <NavItem icon={Search} label="Catalog" path="/catalog" active={true} />
            <NavItem icon={History} label="Order History" path="/orders" />
            <NavItem icon={RefreshCw} label="Repeat Orders" path="/repeat-orders" />
            <NavItem icon={Upload} label="Bulk Upload" path="/bulk-upload" />
            <NavItem icon={Award} label="InfoCoins" path="/rewards" />
          </nav>

          {/* Logout */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <button
              onClick={handleLogout}
              className="sidebar-nav-item w-full text-red-500 hover:bg-red-50"
              data-testid="logout-btn"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Top Bar */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-slate-100 rounded-lg"
              data-testid="toggle-sidebar-btn"
            >
              <Menu className="w-5 h-5 text-slate-600" />
            </button>
            
            {/* Search Bar */}
            <div className="flex-1 max-w-2xl">
              <div className="search-bar">
                <Search className="w-5 h-5 text-slate-400 ml-4" />
                <input
                  type="text"
                  placeholder={`Search ${activeTab === 'products' ? '3M+ products' : '100K+ services'} by name, category, or brand...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  data-testid="search-input"
                />
                <Button 
                  onClick={handleSearch}
                  className="bg-[#007CC3] hover:bg-[#00629B] text-white"
                  data-testid="search-btn"
                >
                  Search
                </Button>
              </div>
            </div>

            {/* Currency Display */}
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-lg">
              <span className="text-sm text-slate-500">Currency:</span>
              <span className="font-semibold text-slate-900">{user?.currency?.code}</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-6">
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList className="tab-nav">
              <TabsTrigger value="products" className="tab-item data-[state=active]:active" data-testid="products-tab">
                <Package className="w-4 h-4 mr-2" />
                Products (3M+)
              </TabsTrigger>
              <TabsTrigger value="services" className="tab-item data-[state=active]:active" data-testid="services-tab">
                <Settings className="w-4 h-4 mr-2" />
                Services (100K+)
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48" data-testid="category-filter">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Categories</SelectItem>
                {(activeTab === 'products' ? categories : serviceCategories).map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {activeTab === 'products' && (
              <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                <SelectTrigger className="w-48" data-testid="brand-filter">
                  <SelectValue placeholder="All Brands" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Brands</SelectItem>
                  {brands.map((brand) => (
                    <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Button 
              variant="outline" 
              onClick={() => setRfqModalOpen(true)}
              className="ml-auto"
              data-testid="submit-rfq-btn"
            >
              <FileText className="w-4 h-4 mr-2" />
              Submit Free Text RFQ
            </Button>
          </div>

          {/* Results */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg p-4 h-80">
                  <div className="skeleton h-40 rounded-lg mb-4"></div>
                  <div className="skeleton h-4 rounded w-3/4 mb-2"></div>
                  <div className="skeleton h-4 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : activeTab === 'products' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onCheckInventory={() => checkInventory(product)}
                  onRequestQuotation={() => {
                    setSelectedProduct(product);
                    setQuotationModalOpen(true);
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  onRequestQuotation={() => {
                    setSelectedProduct(service);
                    setQuotationModalOpen(true);
                  }}
                  onSubmitRFQ={() => {
                    setRfqForm(prev => ({
                      ...prev,
                      product_description: service.name,
                      is_product: false
                    }));
                    setRfqModalOpen(true);
                  }}
                />
              ))}
            </div>
          )}

          {/* No Results - RFQ Prompt */}
          {!loading && (activeTab === 'products' ? products : services).length === 0 && (
            <div className="text-center py-16">
              <XCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-700 mb-2">No Results Found</h3>
              <p className="text-slate-500 mb-6">
                Can't find what you're looking for? Submit a Free Text RFQ
              </p>
              <Button 
                onClick={() => setRfqModalOpen(true)}
                className="bg-[#FF6B00] hover:bg-[#E65000] text-white"
                data-testid="no-results-rfq-btn"
              >
                Submit Free Text RFQ <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* RFQ Modal */}
      <Dialog open={rfqModalOpen} onOpenChange={setRfqModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Submit Free Text RFQ</DialogTitle>
            <DialogDescription>
              Describe what you need and we'll find the best suppliers for you
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Product/Service Description *</Label>
              <Textarea
                value={rfqForm.product_description}
                onChange={(e) => setRfqForm({...rfqForm, product_description: e.target.value})}
                placeholder="Describe what you're looking for..."
                className="mt-1"
                data-testid="rfq-description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Quantity *</Label>
                <Input
                  type="number"
                  value={rfqForm.quantity}
                  onChange={(e) => setRfqForm({...rfqForm, quantity: parseInt(e.target.value)})}
                  className="mt-1"
                  data-testid="rfq-quantity"
                />
              </div>
              <div>
                <Label>Brand Name</Label>
                <Input
                  value={rfqForm.brand_name}
                  onChange={(e) => setRfqForm({...rfqForm, brand_name: e.target.value})}
                  className="mt-1"
                  data-testid="rfq-brand"
                />
              </div>
            </div>
            <div>
              <Label>OEM Part Number</Label>
              <Input
                value={rfqForm.oem_part_number}
                onChange={(e) => setRfqForm({...rfqForm, oem_part_number: e.target.value})}
                className="mt-1"
                data-testid="rfq-part-number"
              />
            </div>
            <div>
              <Label>Delivery Location *</Label>
              <Input
                value={rfqForm.delivery_location}
                onChange={(e) => setRfqForm({...rfqForm, delivery_location: e.target.value})}
                placeholder="City, Country"
                className="mt-1"
                data-testid="rfq-location"
              />
            </div>
            <div>
              <Label>When do you need it?</Label>
              <Input
                type="date"
                value={rfqForm.needed_by}
                onChange={(e) => setRfqForm({...rfqForm, needed_by: e.target.value})}
                className="mt-1"
                data-testid="rfq-date"
              />
            </div>
            <div>
              <Label>Request Type</Label>
              <Select 
                value={rfqForm.request_type} 
                onValueChange={(v) => setRfqForm({...rfqForm, request_type: v})}
              >
                <SelectTrigger className="mt-1" data-testid="rfq-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="actual">Actual Product Required</SelectItem>
                  <SelectItem value="pricing_only">Check Pricing Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Recommended Supplier Name</Label>
                <Input
                  value={rfqForm.supplier_name}
                  onChange={(e) => setRfqForm({...rfqForm, supplier_name: e.target.value})}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Supplier Email</Label>
                <Input
                  type="email"
                  value={rfqForm.supplier_email}
                  onChange={(e) => setRfqForm({...rfqForm, supplier_email: e.target.value})}
                  className="mt-1"
                />
              </div>
            </div>
            <Button 
              onClick={submitRFQ}
              className="w-full bg-[#007CC3] hover:bg-[#00629B]"
              data-testid="rfq-submit-btn"
            >
              Submit RFQ
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quotation Modal */}
      <Dialog open={quotationModalOpen} onOpenChange={setQuotationModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Instant Quotation</DialogTitle>
            <DialogDescription>
              We'll send your request to 100+ Infosys distributors for competitive quotes
            </DialogDescription>
          </DialogHeader>
          {selectedProduct && (
            <div className="mt-4 space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <h4 className="font-semibold">{selectedProduct.name}</h4>
                <p className="text-sm text-slate-500 mt-1">{selectedProduct.category}</p>
              </div>
              <p className="text-sm text-slate-600">
                <Zap className="w-4 h-4 inline mr-1 text-[#FF6B00]" />
                Expect responses within 4-8 hours
              </p>
              <Button 
                onClick={requestQuotation}
                className="w-full bg-[#FF6B00] hover:bg-[#E65000]"
                data-testid="quotation-submit-btn"
              >
                Request Quotation
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Inventory Modal */}
      <Dialog open={inventoryModalOpen} onOpenChange={setInventoryModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Real-Time Inventory Availability</DialogTitle>
          </DialogHeader>
          {selectedProduct && inventoryData && (
            <div className="mt-4 space-y-4">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center justify-between">
                  <span className="text-green-700 font-medium">Total Available</span>
                  <span className="text-2xl font-bold text-green-700">{inventoryData.available_quantity}</span>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-slate-700">By Warehouse Location:</h4>
                {inventoryData.warehouse_locations?.map((loc, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-600">{loc.location}</span>
                    <span className="font-semibold">{loc.quantity} units</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500">
                Last updated: {new Date(inventoryData.last_updated).toLocaleString()}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Product Card Component
const ProductCard = ({ product, onCheckInventory, onRequestQuotation }) => {
  const [showAlternates, setShowAlternates] = useState(false);

  return (
    <Card className="card-product product-card overflow-hidden" data-testid={`product-card-${product.id}`}>
      <div className="relative">
        <img 
          src={product.image_url} 
          alt={product.name}
          className="w-full h-40 object-cover"
          onError={(e) => {
            e.target.src = "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=400";
          }}
        />
        {product.result_type === "quotation_required" && (
          <Badge className="absolute top-2 right-2 bg-[#FF6B00]">Quote Required</Badge>
        )}
      </div>
      <CardContent className="p-4">
        <div className="mb-2">
          <Badge variant="outline" className="text-xs">{product.brand}</Badge>
        </div>
        <h3 className="font-semibold text-slate-900 mb-1 line-clamp-2">{product.name}</h3>
        <p className="text-xs text-slate-500 mb-3 line-clamp-2">{product.description}</p>
        <p className="text-xs text-slate-400 font-mono mb-3">SKU: {product.sku}</p>

        {product.result_type === "with_partner" ? (
          <>
            {/* Price & Lead Time */}
            <div className="flex items-center justify-between mb-3">
              <div className="price-primary text-xl">
                {product.currency_symbol}{product.price?.toFixed(2)}
              </div>
              <div className="lead-time-badge">
                <Clock className="w-3 h-3" />
                {product.lead_time_days} days
              </div>
            </div>

            {/* Delivery Partners */}
            {product.delivery_partners?.length > 1 && (
              <div className="mb-3">
                <p className="text-xs font-medium text-slate-600 mb-2">
                  {product.delivery_partners.length} Delivery Options:
                </p>
                <div className="space-y-1">
                  {product.delivery_partners.slice(0, 3).map((dp, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs p-2 bg-slate-50 rounded">
                      <span>Partner {idx + 1}</span>
                      <span className="font-medium">{product.currency_symbol}{dp.price?.toFixed(2)}</span>
                      <span className="text-slate-500">{dp.lead_time_days}d</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Alternate Products */}
            {product.alternate_products?.length > 0 && (
              <div className="mb-3">
                <button
                  onClick={() => setShowAlternates(!showAlternates)}
                  className="text-xs text-[#007CC3] flex items-center gap-1 hover:underline"
                  data-testid="show-alternates-btn"
                >
                  <ChevronDown className={`w-3 h-3 transition-transform ${showAlternates ? 'rotate-180' : ''}`} />
                  {product.alternate_products.length} Alternate(s) Available
                </button>
                {showAlternates && (
                  <div className="mt-2 space-y-1">
                    {product.alternate_products.map((alt, idx) => (
                      <div key={idx} className="p-2 bg-green-50 rounded text-xs">
                        <p className="font-medium text-green-700">{alt.brand}</p>
                        <div className="flex justify-between mt-1">
                          <span className="price-alternate">{product.currency_symbol}{alt.price?.toFixed(2)}</span>
                          <span className="text-slate-500">{alt.lead_time_days}d</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button 
                onClick={onCheckInventory}
                variant="outline" 
                size="sm" 
                className="flex-1 text-xs"
                data-testid="check-inventory-btn"
              >
                <Boxes className="w-3 h-3 mr-1" />
                Check Stock
              </Button>
              <Button 
                size="sm" 
                className="flex-1 bg-[#007CC3] hover:bg-[#00629B] text-xs"
                data-testid="add-to-cart-btn"
              >
                <ShoppingCart className="w-3 h-3 mr-1" />
                Add
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <AlertCircle className="w-8 h-8 text-[#FF6B00] mx-auto mb-2" />
            <p className="text-sm text-slate-600 mb-3">No delivery partner mapped</p>
            <Button 
              onClick={onRequestQuotation}
              className="w-full bg-[#FF6B00] hover:bg-[#E65000] text-sm"
              data-testid="request-quotation-btn"
            >
              <Zap className="w-4 h-4 mr-2" />
              Initiate Instant Quotation
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Service Card Component
const ServiceCard = ({ service, onRequestQuotation, onSubmitRFQ }) => {
  return (
    <Card className="card-product" data-testid={`service-card-${service.id}`}>
      <CardContent className="p-5">
        <Badge variant="outline" className="mb-3 text-xs">{service.category}</Badge>
        <h3 className="font-semibold text-slate-900 mb-2">{service.name}</h3>
        <p className="text-xs text-slate-500 mb-3">{service.unspsc_name}</p>
        <p className="text-xs text-slate-400 font-mono mb-4">UNSPSC: {service.unspsc_code}</p>

        {service.result_type === "with_supplier" ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-xs text-slate-500">Pricing Model:</span>
                <p className="font-medium text-slate-700">{service.pricing_model}</p>
              </div>
              {service.price && (
                <div className="price-primary text-xl">
                  {service.currency_symbol}{service.price?.toFixed(2)}
                </div>
              )}
            </div>
            {service.supplier_name && (
              <p className="text-xs text-slate-500 mb-3">
                <CheckCircle className="w-3 h-3 inline mr-1 text-green-500" />
                Supplier: {service.supplier_name}
              </p>
            )}
            <Button 
              className="w-full bg-[#007CC3] hover:bg-[#00629B]"
              data-testid="request-service-btn"
            >
              Request Service
            </Button>
          </>
        ) : service.result_type === "quotation_required" ? (
          <div className="text-center py-2">
            <p className="text-sm text-slate-600 mb-3">No supplier mapped</p>
            <Button 
              onClick={onRequestQuotation}
              className="w-full bg-[#FF6B00] hover:bg-[#E65000]"
              data-testid="service-quotation-btn"
            >
              <Zap className="w-4 h-4 mr-2" />
              Request Instant Quotation
            </Button>
          </div>
        ) : (
          <div className="text-center py-2">
            <XCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-600 mb-3">Service not found</p>
            <Button 
              onClick={onSubmitRFQ}
              variant="outline"
              className="w-full"
              data-testid="service-rfq-btn"
            >
              <FileText className="w-4 h-4 mr-2" />
              Submit Free Text RFQ
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CatalogPage;

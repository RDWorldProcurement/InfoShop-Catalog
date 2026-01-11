import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, API } from "../App";
import { useLanguage } from "../i18n/LanguageContext";
import axios from "axios";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Card, CardContent } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { toast } from "sonner";
import {
  Search, Package, Settings, Coins, Clock, Truck, FileText, RefreshCw,
  Upload, History, ShoppingCart, CheckCircle, AlertCircle, XCircle, Zap,
  ArrowRight, LogOut, Menu, User, ChevronDown, Star, ExternalLink, Info
} from "lucide-react";
import Sidebar from "../components/Sidebar";

const CatalogPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("products");
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [serviceCategories, setServiceCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Cart state
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [punchoutModalOpen, setPunchoutModalOpen] = useState(false);
  const [selectedPunchoutSystem, setSelectedPunchoutSystem] = useState(null);
  const [punchoutSystems, setPunchoutSystems] = useState([]);
  const [transferring, setTransferring] = useState(false);
  const [transferSuccess, setTransferSuccess] = useState(false);
  
  // Modals
  const [rfqModalOpen, setRfqModalOpen] = useState(false);
  const [quotationModalOpen, setQuotationModalOpen] = useState(false);
  const [inventoryModalOpen, setInventoryModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [inventoryData, setInventoryData] = useState(null);
  
  // RFQ Form
  const [rfqForm, setRfqForm] = useState({
    product_description: "", quantity: 1, brand_name: "", oem_part_number: "",
    needed_by: "", delivery_location: "", supplier_name: "", supplier_email: "",
    request_type: "actual", is_product: true
  });

  useEffect(() => {
    fetchCategories();
    fetchCart();
    fetchPunchoutSystems();
    handleSearch();
  }, [activeTab, language]);

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

  const fetchCart = async () => {
    try {
      const response = await axios.get(`${API}/cart`);
      setCart(response.data.items || []);
    } catch (error) {
      console.error("Failed to fetch cart");
    }
  };

  const fetchPunchoutSystems = async () => {
    try {
      const response = await axios.get(`${API}/punchout/systems`);
      setPunchoutSystems(response.data.systems || []);
    } catch (error) {
      console.error("Failed to fetch punchout systems");
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      if (activeTab === "products") {
        const response = await axios.get(`${API}/products/search`, {
          params: { 
            q: searchQuery, 
            category: selectedCategory !== "all" ? selectedCategory : undefined,
            brand: selectedBrand !== "all" ? selectedBrand : undefined, 
            limit: 20,
            lang: language 
          }
        });
        setProducts(response.data.results);
        if (response.data.categories) setCategories(response.data.categories);
      } else {
        const response = await axios.get(`${API}/services/search`, {
          params: { 
            q: searchQuery, 
            category: selectedCategory !== "all" ? selectedCategory : undefined, 
            limit: 20,
            lang: language 
          }
        });
        setServices(response.data.results);
        if (response.data.categories) setServiceCategories(response.data.categories);
      }
    } catch (error) {
      toast.error("Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (item, isService = false) => {
    try {
      const cartItem = {
        product_id: item.id,
        product_name: item.name,
        brand: item.brand || "Service",
        sku: item.sku || item.unspsc_code,
        unspsc_code: item.unspsc_code,
        category: item.category,
        quantity: 1,
        unit_price: item.price || 0,
        total_price: item.price || 0,
        currency_code: item.currency_code,
        image_url: item.image_url || null,
        is_service: isService
      };
      
      await axios.post(`${API}/cart/add`, cartItem);
      toast.success("Added to cart!");
      fetchCart();
    } catch (error) {
      toast.error("Failed to add to cart");
    }
  };

  const removeFromCart = async (itemId) => {
    try {
      await axios.delete(`${API}/cart/remove/${itemId}`);
      toast.success("Removed from cart");
      fetchCart();
    } catch (error) {
      toast.error("Failed to remove item");
    }
  };

  const transferCart = async () => {
    if (!selectedPunchoutSystem) {
      toast.error("Please select a system");
      return;
    }
    
    setTransferring(true);
    try {
      const response = await axios.post(`${API}/cart/transfer`, {
        system: selectedPunchoutSystem.name,
        cart_items: cart.map(c => c.id)
      });
      
      // Simulate transfer delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setTransferSuccess(true);
      setCart([]);
      toast.success(response.data.message);
    } catch (error) {
      toast.error("Transfer failed");
    } finally {
      setTransferring(false);
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
      const response = await axios.post(`${API}/rfq/submit`, { ...rfqForm, is_product: activeTab === "products" });
      toast.success(response.data.message);
      setRfqModalOpen(false);
      setRfqForm({ product_description: "", quantity: 1, brand_name: "", oem_part_number: "",
                   needed_by: "", delivery_location: "", supplier_name: "", supplier_email: "",
                   request_type: "actual", is_product: true });
    } catch (error) {
      toast.error("Failed to submit RFQ");
    }
  };

  const requestQuotation = async () => {
    if (!selectedProduct) return;
    try {
      const response = await axios.post(`${API}/quotation/request`, {
        product_id: selectedProduct.id, product_name: selectedProduct.name, quantity: 1, notes: ""
      });
      toast.success(response.data.message);
      setQuotationModalOpen(false);
    } catch (error) {
      toast.error("Failed to request quotation");
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.total_price || 0), 0);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      <Sidebar activePage="catalog" />

      <main className="flex-1 overflow-auto">
        {/* Top Bar */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-40 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-slate-100 rounded-lg lg:hidden">
              <Menu className="w-5 h-5 text-slate-600" />
            </button>
            
            {/* Search Bar */}
            <div className="flex-1 max-w-2xl">
              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden focus-within:border-[#007CC3] focus-within:ring-2 focus-within:ring-[#007CC3]/20 transition-all">
                <Search className="w-5 h-5 text-slate-400 ml-4" />
                <input
                  type="text"
                  placeholder={activeTab === 'products' ? t.catalog.searchPlaceholder : t.catalog.searchPlaceholderServices}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="flex-1 px-4 py-3 bg-transparent outline-none"
                  data-testid="search-input"
                />
                <Button onClick={handleSearch} className="bg-[#007CC3] hover:bg-[#00629B] text-white rounded-none px-6 h-full" data-testid="search-btn">
                  Search
                </Button>
              </div>
            </div>

            {/* Cart Button */}
            <Button variant="outline" className="relative" onClick={() => setCartOpen(true)} data-testid="cart-btn">
              <ShoppingCart className="w-5 h-5" />
              {cart.length > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-[#FF6B00] text-white text-xs rounded-full flex items-center justify-center">
                  {cart.length}
                </span>
              )}
            </Button>

            {/* Currency Display */}
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-sm text-slate-500">{t.common.currency}:</span>
              <span className="font-semibold text-slate-900">{user?.currency?.code}</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-6">
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSelectedCategory("all"); }} className="mb-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <TabsList className="bg-slate-100 p-1 rounded-xl">
                <TabsTrigger value="products" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm" data-testid="products-tab">
                  <Package className="w-4 h-4 mr-2" />
                  {t.nav.products}
                  <Badge className="ml-2 bg-[#007CC3]/10 text-[#007CC3]">30M+</Badge>
                </TabsTrigger>
                <TabsTrigger value="services" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm" data-testid="services-tab">
                  <Settings className="w-4 h-4 mr-2" />
                  {t.nav.services}
                  <Badge className="ml-2 bg-purple-100 text-purple-700">100K+</Badge>
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-500 hidden sm:inline">Can't find a product or service?</span>
                <Button className="bg-[#FF9900] hover:bg-[#FF6B00] text-white font-semibold shadow-md" onClick={() => setRfqModalOpen(true)} data-testid="submit-rfq-btn">
                  <FileText className="w-4 h-4 mr-2" />
                  {t.catalog.submitRfq}
                </Button>
              </div>
            </div>
          </Tabs>

          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-56 bg-white" data-testid="category-filter">
                <SelectValue placeholder={t.catalog.allCategories} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.catalog.allCategories}</SelectItem>
                {(activeTab === 'products' ? categories : serviceCategories).map((cat) => (
                  <SelectItem key={cat.name} value={cat.name}>
                    <span className="flex items-center gap-2">
                      {cat.name}
                      <span className="text-xs text-slate-400 font-mono">{cat.unspsc}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {activeTab === 'products' && (
              <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                <SelectTrigger className="w-48 bg-white" data-testid="brand-filter">
                  <SelectValue placeholder={t.catalog.allBrands} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.catalog.allBrands}</SelectItem>
                  {brands.map((brand) => (
                    <SelectItem key={brand.name} value={brand.name}>
                      <span className="flex items-center gap-2">
                        {brand.logo && <img src={brand.logo} alt="" className="w-4 h-4 object-contain" onError={(e) => e.target.style.display = 'none'} />}
                        {brand.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Results */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl p-4 h-80 animate-pulse">
                  <div className="bg-slate-200 h-40 rounded-lg mb-4"></div>
                  <div className="bg-slate-200 h-4 rounded w-3/4 mb-2"></div>
                  <div className="bg-slate-200 h-4 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : activeTab === 'products' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={() => addToCart(product)}
                  onCheckInventory={() => checkInventory(product)}
                  onRequestQuotation={() => { setSelectedProduct(product); setQuotationModalOpen(true); }}
                  t={t}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  onAddToCart={() => addToCart(service, true)}
                  onRequestQuotation={() => { setSelectedProduct(service); setQuotationModalOpen(true); }}
                  onSubmitRFQ={() => { setRfqForm(prev => ({ ...prev, product_description: service.name, is_product: false })); setRfqModalOpen(true); }}
                  t={t}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Cart Drawer */}
      <Dialog open={cartOpen} onOpenChange={setCartOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              {t.cart.title} ({cart.length} {t.common.items})
            </DialogTitle>
          </DialogHeader>
          
          {cart.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">{t.cart.empty}</p>
            </div>
          ) : (
            <>
              <div className="space-y-3 max-h-64 overflow-auto">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.product_name}</p>
                      <p className="text-xs text-slate-500 font-mono">UNSPSC: {item.unspsc_code}</p>
                    </div>
                    <p className="font-semibold text-sm">{user?.currency?.symbol}{item.total_price?.toFixed(2)}</p>
                    <Button variant="ghost" size="sm" onClick={() => removeFromCart(item.id)}>
                      <XCircle className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
              
              <div className="border-t pt-4 mt-4">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-medium">{t.cart.total}:</span>
                  <span className="text-xl font-bold text-[#007CC3]">{user?.currency?.symbol}{cartTotal.toFixed(2)}</span>
                </div>
                
                <Button className="w-full bg-[#FF6B00] hover:bg-[#E65000]" onClick={() => { setCartOpen(false); setPunchoutModalOpen(true); }} data-testid="transfer-cart-btn">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  {t.cart.transferCart}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* PunchOut Modal */}
      <Dialog open={punchoutModalOpen} onOpenChange={(open) => { setPunchoutModalOpen(open); if (!open) setTransferSuccess(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t.cart.transferCart}</DialogTitle>
            <DialogDescription>{t.cart.selectSystem}</DialogDescription>
          </DialogHeader>
          
          {transferSuccess ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">{t.cart.transferSuccess}</h3>
              <p className="text-slate-500 mb-2">Your cart has been transferred to {selectedPunchoutSystem?.name}</p>
              <Badge className="bg-amber-100 text-amber-700">Status: {t.cart.pendingPO}</Badge>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 my-4">
                {punchoutSystems.map((system) => (
                  <button
                    key={system.name}
                    onClick={() => setSelectedPunchoutSystem(system)}
                    className={`p-4 border-2 rounded-xl flex flex-col items-center gap-2 transition-all ${
                      selectedPunchoutSystem?.name === system.name ? 'border-[#007CC3] bg-[#007CC3]/5' : 'border-slate-200 hover:border-slate-300'
                    }`}
                    data-testid={`punchout-system-${system.name}`}
                  >
                    <img src={system.logo} alt={system.name} className="w-10 h-10 object-contain" onError={(e) => e.target.style.display = 'none'} />
                    <span className="text-sm font-medium">{system.name}</span>
                  </button>
                ))}
              </div>
              
              <Button className="w-full bg-[#007CC3] hover:bg-[#00629B]" onClick={transferCart} disabled={!selectedPunchoutSystem || transferring} data-testid="confirm-transfer-btn">
                {transferring ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                    Transferring to {selectedPunchoutSystem?.name}...
                  </span>
                ) : (
                  <>Transfer Cart</>
                )}
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* RFQ Modal */}
      <Dialog open={rfqModalOpen} onOpenChange={setRfqModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Submit Free Text RFQ</DialogTitle>
            <DialogDescription>Describe what you need and we will find suppliers</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Description *</Label>
              <Textarea value={rfqForm.product_description} onChange={(e) => setRfqForm({...rfqForm, product_description: e.target.value})} placeholder="Describe what you're looking for..." className="mt-1" data-testid="rfq-description" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Quantity *</Label>
                <Input type="number" value={rfqForm.quantity} onChange={(e) => setRfqForm({...rfqForm, quantity: parseInt(e.target.value)})} className="mt-1" data-testid="rfq-quantity" />
              </div>
              <div>
                <Label>Brand Name</Label>
                <Input value={rfqForm.brand_name} onChange={(e) => setRfqForm({...rfqForm, brand_name: e.target.value})} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Delivery Location *</Label>
              <Input value={rfqForm.delivery_location} onChange={(e) => setRfqForm({...rfqForm, delivery_location: e.target.value})} placeholder="City, Country" className="mt-1" data-testid="rfq-location" />
            </div>
            <Button onClick={submitRFQ} className="w-full bg-[#007CC3] hover:bg-[#00629B]" data-testid="rfq-submit-btn">Submit RFQ</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quotation Modal */}
      <Dialog open={quotationModalOpen} onOpenChange={setQuotationModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Instant Quotation</DialogTitle>
            <DialogDescription>We will get quotes from 100+ Infosys partners</DialogDescription>
          </DialogHeader>
          {selectedProduct && (
            <div className="mt-4 space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <h4 className="font-semibold">{selectedProduct.name}</h4>
                <p className="text-sm text-slate-500 mt-1">{selectedProduct.category}</p>
                <p className="text-xs text-slate-400 font-mono mt-1">UNSPSC: {selectedProduct.unspsc_code}</p>
              </div>
              <Button onClick={requestQuotation} className="w-full bg-[#FF6B00] hover:bg-[#E65000]" data-testid="quotation-submit-btn">
                <Zap className="w-4 h-4 mr-2" />
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
            <DialogTitle>Real-Time Inventory</DialogTitle>
          </DialogHeader>
          {inventoryData && (
            <div className="mt-4 space-y-4">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center justify-between">
                  <span className="text-green-700 font-medium">Total Available</span>
                  <span className="text-2xl font-bold text-green-700">{inventoryData.available_quantity}</span>
                </div>
              </div>
              <div className="space-y-2">
                {inventoryData.warehouse_locations?.map((loc, idx) => (
                  <div key={idx} className="flex justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-600">{loc.location}</span>
                    <span className="font-semibold">{loc.quantity} units</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Product Card Component with Amazon-like display
const ProductCard = ({ product, onAddToCart, onCheckInventory, onRequestQuotation, t }) => {
  const [showSpecs, setShowSpecs] = useState(false);
  const [showAlternates, setShowAlternates] = useState(false);

  // Generate star rating display
  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />);
      } else if (i === fullStars && hasHalf) {
        stars.push(<Star key={i} className="w-3 h-3 fill-amber-400/50 text-amber-400" />);
      } else {
        stars.push(<Star key={i} className="w-3 h-3 text-gray-300" />);
      }
    }
    return stars;
  };

  return (
    <Card className={`overflow-hidden hover:shadow-xl transition-all group relative ${product.is_sponsored ? 'ring-2 ring-amber-200' : ''}`} data-testid={`product-card-${product.id}`}>
      {/* Sponsored Badge */}
      {product.is_sponsored && (
        <div className="absolute top-3 right-3 z-10">
          <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">
            <Star className="w-3 h-3 mr-1 fill-amber-500" />
            {t?.catalog?.sponsored || "Sponsored"}
          </Badge>
        </div>
      )}
      
      {/* Product Image */}
      <div className="relative bg-white p-4">
        <img 
          src={product.image_url} 
          alt={product.name} 
          className="w-full h-48 object-contain mx-auto"
          onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800&q=80"; }} 
        />
        {product.result_type === "quotation_required" && (
          <Badge className="absolute top-2 left-2 bg-[#FF6B00]">{t?.catalog?.getQuote || "Quote Required"}</Badge>
        )}
        {product.availability?.in_stock && (
          <Badge className="absolute bottom-2 left-2 bg-green-600 text-white text-xs">
            {t?.catalog?.inStock || "In Stock"}
          </Badge>
        )}
      </div>
      
      <CardContent className="p-4 border-t">
        {/* Brand Badge - styled with brand color */}
        <div className="flex items-center gap-2 mb-2">
          <Badge 
            className="text-xs font-bold text-white px-2 py-0.5"
            style={{ backgroundColor: product.brand_color || '#007CC3' }}
          >
            {product.brand}
          </Badge>
        </div>
        
        {/* Product Name */}
        <h3 className="font-semibold text-slate-900 mb-2 line-clamp-2 text-sm leading-tight hover:text-[#007CC3] cursor-pointer" style={{ fontFamily: 'Manrope' }}>
          {product.name}
        </h3>
        
        {/* Rating */}
        {product.rating && (
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center">{renderStars(product.rating)}</div>
            <span className="text-xs text-[#007CC3] hover:underline cursor-pointer">
              {product.reviews_count?.toLocaleString()} reviews
            </span>
          </div>
        )}
        
        {/* Short Description */}
        {product.short_description && (
          <p className="text-xs text-slate-600 mb-2 line-clamp-2">{product.short_description}</p>
        )}
        
        {/* UNSPSC Code & Category */}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">UNSPSC: {product.unspsc_code}</span>
          <span className="text-xs text-slate-400">•</span>
          <span className="text-xs text-slate-500">{product.category}</span>
        </div>

        {/* Specifications Toggle */}
        {product.specifications && Object.keys(product.specifications).length > 0 && (
          <div className="mb-3">
            <button 
              onClick={() => setShowSpecs(!showSpecs)} 
              className="text-xs text-[#007CC3] flex items-center gap-1 hover:underline"
            >
              <Info className="w-3 h-3" />
              {showSpecs ? 'Hide' : 'View'} {t?.catalog?.specifications || "Specifications"}
              <ChevronDown className={`w-3 h-3 transition-transform ${showSpecs ? 'rotate-180' : ''}`} />
            </button>
            {showSpecs && (
              <div className="mt-2 p-2 bg-slate-50 rounded-lg text-xs space-y-1 max-h-32 overflow-y-auto">
                {Object.entries(product.specifications).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-slate-500">{key}:</span>
                    <span className="font-medium text-slate-700">{value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {product.result_type === "with_partner" ? (
          <>
            {/* Price Section */}
            <div className="flex items-end justify-between mb-3">
              <div>
                <span className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
                  {product.currency_symbol}{product.price?.toFixed(2)}
                </span>
                <span className="text-xs text-slate-500 ml-1">/{product.unit}</span>
              </div>
              <div className="text-right">
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full flex items-center gap-1">
                  <Truck className="w-3 h-3" />
                  {product.lead_time_days} {t?.catalog?.days || "days"}
                </span>
              </div>
            </div>

            {/* Availability Info */}
            {product.availability && (
              <div className="text-xs text-slate-500 mb-3">
                <span className="text-green-600 font-medium">
                  {product.availability.quantity} {t?.catalog?.units || "units"}
                </span>
                {' '}available • Ships from {product.availability.warehouse}
              </div>
            )}

            {/* Delivery Partners */}
            {product.delivery_partners?.length > 1 && (
              <div className="mb-3 text-xs text-slate-500">
                <Truck className="w-3 h-3 inline mr-1" />
                {product.delivery_partners.length} delivery options from {product.currency_symbol}
                {Math.min(...product.delivery_partners.map(dp => dp.price)).toFixed(2)}
              </div>
            )}

            {/* Alternates */}
            {product.alternate_products?.length > 0 && (
              <>
                <button 
                  onClick={() => setShowAlternates(!showAlternates)} 
                  className="text-xs text-[#007CC3] flex items-center gap-1 mb-2 hover:underline"
                >
                  <ChevronDown className={`w-3 h-3 transition-transform ${showAlternates ? 'rotate-180' : ''}`} />
                  {product.alternate_products.length} {t?.catalog?.alternates || "Alternate(s)"} - Save up to {
                    Math.round((1 - Math.min(...product.alternate_products.map(a => a.price)) / product.price) * 100)
                  }%
                </button>
                {showAlternates && (
                  <div className="space-y-1 mb-3">
                    {product.alternate_products.map((alt, idx) => (
                      <div key={idx} className="p-2 bg-green-50 rounded text-xs flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          {alt.brand_logo && <img src={alt.brand_logo} alt="" className="h-3 w-auto" onError={(e) => e.target.style.display = 'none'} />}
                          <span className="text-green-700">{alt.brand}</span>
                        </div>
                        <span className="font-semibold text-green-700">{product.currency_symbol}{alt.price?.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-2">
              <Button size="sm" className="w-full bg-[#FF9900] hover:bg-[#FF6B00] text-white text-sm font-semibold py-2.5 shadow-md hover:shadow-lg transition-all" onClick={onAddToCart} data-testid="add-to-cart-btn">
                <ShoppingCart className="w-4 h-4 mr-2" />
                {t?.catalog?.addToCart || "Add to Cart"}
              </Button>
              <Button variant="outline" size="sm" className="w-full text-xs py-2 border-slate-300 hover:bg-slate-50" onClick={onCheckInventory} data-testid="check-inventory-btn">
                {t?.catalog?.checkStock || "Check Stock"}
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center py-3">
            <AlertCircle className="w-8 h-8 text-[#FF6B00] mx-auto mb-2" />
            <p className="text-sm text-slate-600 mb-3">{t?.catalog?.noPartner || "No delivery partner"}</p>
            <Button onClick={onRequestQuotation} className="w-full bg-[#FF6B00] hover:bg-[#E65000] text-sm" data-testid="request-quotation-btn">
              <Zap className="w-4 h-4 mr-2" />
              {t?.catalog?.getQuote || "Get Quote"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Service Card Component with enhanced display
const ServiceCard = ({ service, onAddToCart, onRequestQuotation, onSubmitRFQ, t }) => {
  const [showDetails, setShowDetails] = useState(false);

  // Generate star rating display
  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating || 4.5);
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />);
      } else {
        stars.push(<Star key={i} className="w-3 h-3 text-gray-300" />);
      }
    }
    return stars;
  };

  return (
    <Card className={`hover:shadow-xl transition-all relative overflow-hidden ${service.is_sponsored ? 'ring-2 ring-amber-200' : ''}`} data-testid={`service-card-${service.id}`}>
      {service.is_sponsored && (
        <div className="absolute top-3 right-3 z-10">
          <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">
            <Star className="w-3 h-3 mr-1 fill-amber-500" />
            {t?.catalog?.sponsored || "Sponsored"}
          </Badge>
        </div>
      )}
      
      {/* Service Image */}
      <div className="relative h-40 bg-gradient-to-br from-slate-100 to-slate-50">
        <img 
          src={service.image_url} 
          alt={service.name} 
          className="w-full h-full object-cover"
          onError={(e) => { e.target.src = "https://static.prod-images.emergentagent.com/jobs/93bd7302-b98c-48b8-885e-c31e5a425122/images/49c83afc1a588e3c2810a205953d952ac31ad730ca2f9871863edeeea2072a83.png"; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
      </div>
      
      <CardContent className="p-5">
        {/* Category Badge */}
        <div className="flex items-center justify-between mb-3">
          <Badge variant="outline" className="text-xs">{service.category}</Badge>
          {service.supplier_name && (
            <Badge 
              className="text-xs font-bold text-white px-2 py-0.5"
              style={{ backgroundColor: service.supplier_color || '#007CC3' }}
            >
              {service.supplier_name.split(' ')[0]}
            </Badge>
          )}
        </div>
        
        {/* Service Name */}
        <h3 className="font-semibold text-slate-900 mb-2 line-clamp-2 hover:text-[#007CC3] cursor-pointer" style={{ fontFamily: 'Manrope' }}>
          {service.name}
        </h3>
        
        {/* Rating */}
        {service.rating && (
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center">{renderStars(service.rating)}</div>
            <span className="text-xs text-[#007CC3] hover:underline cursor-pointer">
              {service.reviews_count?.toLocaleString() || '0'} reviews
            </span>
          </div>
        )}
        
        {/* Short Description */}
        {service.short_description && (
          <p className="text-xs text-slate-600 mb-3 line-clamp-2">{service.short_description}</p>
        )}
        
        {/* UNSPSC Code */}
        <div className="mb-3">
          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">UNSPSC: {service.unspsc_code}</span>
          <p className="text-xs text-slate-400 mt-1">{service.unspsc_name}</p>
        </div>

        {/* Service Includes (if available) */}
        {service.service_includes && service.service_includes.length > 0 && (
          <div className="mb-3">
            <button 
              onClick={() => setShowDetails(!showDetails)} 
              className="text-xs text-[#007CC3] flex items-center gap-1 hover:underline"
            >
              <CheckCircle className="w-3 h-3" />
              {showDetails ? 'Hide' : 'View'} Service Details
              <ChevronDown className={`w-3 h-3 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
            </button>
            {showDetails && (
              <div className="mt-2 p-2 bg-green-50 rounded-lg text-xs space-y-1 max-h-32 overflow-y-auto">
                {service.service_includes.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <CheckCircle className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-700">{item}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {service.result_type === "with_supplier" ? (
          <>
            {/* Pricing Section */}
            <div className="flex items-end justify-between mb-3 p-3 bg-slate-50 rounded-lg">
              <div>
                <span className="text-xs text-slate-500 block">Pricing Model:</span>
                <p className="font-medium text-slate-700">{service.pricing_model}</p>
              </div>
              {service.price && (
                <div className="text-right">
                  <span className="text-2xl font-bold text-[#007CC3]" style={{ fontFamily: 'Manrope' }}>
                    {service.currency_symbol}{service.price?.toFixed(2)}
                  </span>
                  <span className="text-xs text-slate-500 block">/{service.pricing_model}</span>
                </div>
              )}
            </div>
            
            {/* Supplier Info */}
            {service.supplier_name && (
              <div className="flex items-center gap-2 mb-3 p-2 bg-green-50 rounded">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-xs text-green-700">
                  Verified {t?.common?.supplier || "Partner"}: <strong>{service.supplier_name}</strong>
                </span>
              </div>
            )}
            
            {/* Availability */}
            {service.availability && (
              <div className="text-xs text-slate-500 mb-3">
                <Clock className="w-3 h-3 inline mr-1" />
                Lead time: {service.availability.lead_time_days} days • Available in {service.availability.regions?.join(', ')}
              </div>
            )}
            
            <Button className="w-full bg-[#FF9900] hover:bg-[#FF6B00] text-white font-medium" onClick={onAddToCart} data-testid="add-service-btn">
              <ShoppingCart className="w-4 h-4 mr-2" />
              {t?.catalog?.addToCart || "Add to Cart"}
            </Button>
          </>
        ) : service.result_type === "quotation_required" ? (
          <div className="text-center py-3">
            <AlertCircle className="w-8 h-8 text-[#FF6B00] mx-auto mb-2" />
            <p className="text-sm text-slate-600 mb-3">{t?.catalog?.noPartner || "No supplier mapped"}</p>
            <Button onClick={onRequestQuotation} className="w-full bg-[#FF6B00] hover:bg-[#E65000]" data-testid="service-quotation-btn">
              <Zap className="w-4 h-4 mr-2" />
              {t?.catalog?.getQuote || "Get Quote"}
            </Button>
          </div>
        ) : (
          <div className="text-center py-3">
            <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm text-slate-600 mb-3">Service not available in catalog</p>
            <Button onClick={onSubmitRFQ} variant="outline" className="w-full" data-testid="service-rfq-btn">
              <FileText className="w-4 h-4 mr-2" />
              {t?.catalog?.submitRfq || "Submit RFQ"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CatalogPage;

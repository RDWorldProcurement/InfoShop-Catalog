import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Checkbox } from "../components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";
import {
  Search,
  ShoppingCart,
  Package,
  Star,
  StarHalf,
  Loader2,
  Sparkles,
  LayoutGrid,
  LayoutList,
  Globe,
  X,
  ChevronLeft,
  ChevronRight,
  Heart,
  Truck,
  Building,
  ExternalLink,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const API = process.env.REACT_APP_BACKEND_URL || "http://localhost:8002";

// Countries
const COUNTRIES = [
  { code: "ALL", name: "All Countries", flag: "🌎" },
  { code: "USA", name: "United States", flag: "🇺🇸" },
  { code: "Canada", name: "Canada", flag: "🇨🇦" },
  { code: "Mexico", name: "Mexico", flag: "🇲🇽" },
  { code: "Germany", name: "Germany", flag: "🇩🇪" },
  { code: "UK", name: "United Kingdom", flag: "🇬🇧" },
];

// Format price
const formatPrice = (price) => {
  if (!price || price === 0) return null;
  return `$${parseFloat(price).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

// Generate rating
const getProductRating = (productId) => {
  const hash = productId?.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0) || 0;
  const rating = 3.5 + (Math.abs(hash) % 15) / 10;
  const reviews = 10 + (Math.abs(hash) % 500);
  return { rating: Math.min(rating, 5), reviews };
};

// Star Rating Component
const StarRating = ({ rating, reviews }) => {
  const fullStars = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;
  
  return (
    <div className="flex items-center gap-1">
      <div className="flex text-amber-400">
        {[...Array(fullStars)].map((_, i) => (
          <Star key={i} className="w-4 h-4 fill-current" />
        ))}
        {hasHalf && <StarHalf className="w-4 h-4 fill-current" />}
        {[...Array(5 - fullStars - (hasHalf ? 1 : 0))].map((_, i) => (
          <Star key={`empty-${i}`} className="w-4 h-4 text-slate-300" />
        ))}
      </div>
      <span className="text-sm text-blue-600">{reviews.toLocaleString()} ratings</span>
    </div>
  );
};

// Product Card
const ProductCard = ({ product, onAddToCart, viewMode, punchoutMode }) => {
  const [imageError, setImageError] = useState(false);
  
  const primaryImage = product.primary_image || product.images?.[0];
  const hasPrice = product.selling_price > 0 || product.price > 0;
  const hasDiscount = product.discount_percentage > 0;
  const { rating, reviews } = getProductRating(product.objectID);
  const sellingPrice = product.selling_price || product.price;

  return (
    <Card className="group hover:shadow-xl transition-all duration-200 border border-slate-200 hover:border-slate-300 bg-white overflow-hidden h-full flex flex-col">
      {/* Image */}
      <div className="relative aspect-square bg-white p-4 border-b border-slate-100">
        {primaryImage && !imageError ? (
          <img
            src={primaryImage}
            alt={product.product_name}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-50 rounded">
            <Package className="w-20 h-20 text-slate-300" />
          </div>
        )}
        
        {hasDiscount && (
          <Badge className="absolute top-2 left-2 bg-red-600 text-white text-xs font-bold px-2 py-1">
            -{product.discount_percentage}%
          </Badge>
        )}
      </div>

      {/* Content */}
      <CardContent className="p-4 flex-1 flex flex-col">
        <p className="text-xs text-blue-600 uppercase tracking-wide mb-1">
          {product.brand || "Industrial Supply"}
        </p>

        <h3 className="text-sm text-slate-800 line-clamp-2 mb-2 min-h-[40px]">
          {product.product_name}
        </h3>

        <div className="mb-2">
          <StarRating rating={rating} reviews={reviews} />
        </div>

        {/* Price */}
        <div className="mb-3">
          {hasPrice ? (
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-xs text-slate-500">$</span>
                <span className="text-xl font-medium text-slate-900">
                  {sellingPrice.toLocaleString("en-US", { minimumFractionDigits: 2 }).split('.')[0]}
                </span>
                <span className="text-sm text-slate-900">
                  .{sellingPrice.toLocaleString("en-US", { minimumFractionDigits: 2 }).split('.')[1]}
                </span>
              </div>
              {hasDiscount && product.list_price > 0 && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-500 line-through">
                    List: {formatPrice(product.list_price)}
                  </span>
                  <span className="text-xs text-red-600 font-medium">
                    Save {formatPrice(product.list_price - sellingPrice)}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="p-2 bg-blue-50 border border-blue-100 rounded-lg text-center">
              <p className="text-sm font-semibold text-blue-700">Request Quote</p>
            </div>
          )}
        </div>

        {/* Availability */}
        <div className="text-xs mb-3">
          {product.in_stock ? (
            <span className="text-green-600 font-medium">
              ✓ In Stock {product.stock_quantity > 0 && `(${product.stock_quantity})`}
            </span>
          ) : (
            <span className="text-orange-600">{product.availability || "Ships in 2-3 weeks"}</span>
          )}
        </div>

        <p className="text-xs text-slate-400 mb-3">
          Sold by {product.supplier || "InfoShop"}
        </p>

        {/* Action Button */}
        <div className="mt-auto">
          {hasPrice && (
            <Button 
              className="w-full bg-amber-400 hover:bg-amber-500 text-black font-medium text-sm"
              onClick={() => onAddToCart(product)}
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              {punchoutMode ? "Add to Cart" : "Add to Cart"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Main InfoShop Catalog
const InfoShopCatalog = () => {
  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalHits, setTotalHits] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [processingTime, setProcessingTime] = useState(0);
  const [viewMode, setViewMode] = useState("grid");
  const [showFilters, setShowFilters] = useState(true);
  const [catalogStats, setCatalogStats] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState("ALL");
  const [sortBy, setSortBy] = useState("relevance");
  const [selectedFilters, setSelectedFilters] = useState({
    brand: null,
    category: null,
    supplier: null,
  });

  // PunchOut Mode State
  const [punchoutMode, setPunchoutMode] = useState(false);
  const [punchoutSession, setPunchoutSession] = useState(null);
  const [punchoutCart, setPunchoutCart] = useState([]);
  const [showPunchoutCart, setShowPunchoutCart] = useState(false);
  const [transferring, setTransferring] = useState(false);

  // Check for PunchOut mode
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionToken = params.get("punchout");
    
    if (sessionToken) {
      const verifySession = async () => {
        try {
          const response = await axios.get(`${API}/api/punchout/session/${sessionToken}`);
          if (response.data.valid) {
            setPunchoutMode(true);
            setPunchoutSession({ token: sessionToken, ...response.data });
            toast.info(
              <div>
                <p className="font-medium">PunchOut Mode Active</p>
                <p className="text-sm">Browse and add items, then Transfer to Coupa</p>
              </div>,
              { duration: 6000 }
            );
          }
        } catch (error) {
          console.error("Invalid PunchOut session:", error);
          toast.error("Invalid or expired PunchOut session");
          window.history.replaceState({}, '', window.location.pathname);
        }
      };
      verifySession();
    }
  }, []);

  // Add to PunchOut Cart
  const addToPunchoutCart = (product, quantity = 1) => {
    setPunchoutCart(prevCart => {
      const existingIndex = prevCart.findIndex(item => item.product_id === product.objectID);
      
      if (existingIndex >= 0) {
        const newCart = [...prevCart];
        newCart[existingIndex].quantity += quantity;
        return newCart;
      }
      
      return [...prevCart, {
        product_id: product.objectID,
        supplier_part_id: product.sku || product.part_number || product.objectID,
        name: product.product_name,
        description: product.short_description || "",
        quantity: quantity,
        unit_price: product.selling_price || product.price || 0,
        unit_of_measure: product.unit || "EA",
        brand: product.brand || "",
        part_number: product.part_number || "",
        unspsc_code: product.unspsc_code || ""
      }];
    });
    
    toast.success(`Added to cart: ${product.product_name}`);
  };

  // Remove from cart
  const removeFromPunchoutCart = (productId) => {
    setPunchoutCart(prevCart => prevCart.filter(item => item.product_id !== productId));
  };

  // Sync cart with backend
  useEffect(() => {
    if (punchoutMode && punchoutSession?.token && punchoutCart.length > 0) {
      axios.post(`${API}/api/punchout/cart/update`, {
        session_token: punchoutSession.token,
        items: punchoutCart
      }).catch(err => console.error("Cart sync error:", err));
    }
  }, [punchoutMode, punchoutSession, punchoutCart]);

  // Transfer to Coupa
  const transferToCoupa = async () => {
    if (!punchoutSession?.token || punchoutCart.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    
    setTransferring(true);
    try {
      const response = await axios.post(`${API}/api/punchout/order?session_token=${punchoutSession.token}`);
      const { cxml, browser_form_post_url } = response.data;
      
      if (browser_form_post_url && cxml) {
        const form = document.createElement("form");
        form.method = "POST";
        form.action = browser_form_post_url;
        form.target = "_self";
        
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = "cxml-urlencoded";
        input.value = encodeURIComponent(cxml);
        
        form.appendChild(input);
        document.body.appendChild(form);
        
        toast.success("Cart transfer initiated, redirecting...");
        setTimeout(() => form.submit(), 1000);
      } else {
        toast.success(
          <div>
            <p className="font-medium text-green-700">✓ Cart Transfer Completed</p>
            <p className="text-sm">Order sent to procurement system.</p>
          </div>,
          { duration: 5000 }
        );
        setPunchoutCart([]);
        setPunchoutMode(false);
        window.history.replaceState({}, '', window.location.pathname);
      }
    } catch (error) {
      console.error("Transfer error:", error);
      toast.error("Failed to transfer cart");
    } finally {
      setTransferring(false);
    }
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Search function
  const searchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const filters = {};
      if (selectedCountry !== "ALL") filters.country = selectedCountry;
      if (selectedFilters.brand) filters.brand = selectedFilters.brand;
      if (selectedFilters.category) filters.category = selectedFilters.category;
      if (selectedFilters.supplier) filters.supplier = selectedFilters.supplier;

      const response = await axios.post(`${API}/api/catalog/search`, {
        query: debouncedQuery,
        page: currentPage,
        hits_per_page: 24,
        filters,
        sort_by: sortBy !== "relevance" ? sortBy : null,
      });

      const data = response.data;
      setProducts(data.hits || []);
      setTotalHits(data.nbHits || 0);
      setTotalPages(data.nbPages || 0);
      setProcessingTime(data.processingTimeMS || 0);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, currentPage, selectedCountry, selectedFilters, sortBy]);

  // Fetch stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get(`${API}/api/catalog/stats`);
        setCatalogStats(response.data);
      } catch (error) {
        console.error("Stats error:", error);
      }
    };
    fetchStats();
  }, []);

  // Search on change
  useEffect(() => {
    searchProducts();
  }, [searchProducts]);

  // Handle add to cart
  const handleAddToCart = (product) => {
    if (punchoutMode) {
      addToPunchoutCart(product);
    } else {
      toast.info("Please access this catalog through your procurement system (Coupa) for purchasing.");
    }
  };

  // Cart total
  const punchoutCartTotal = punchoutCart.reduce(
    (sum, item) => sum + item.unit_price * item.quantity, 0
  );

  return (
    <div className="min-h-screen bg-slate-100">
      {/* PunchOut Banner */}
      {punchoutMode && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-6 py-3">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold">PunchOut Session Active</p>
                <p className="text-sm text-blue-100">
                  Connected from {punchoutSession?.buyer_identity || "Coupa"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                className="text-white hover:bg-white/10"
                onClick={() => setShowPunchoutCart(true)}
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                Cart ({punchoutCart.length})
                {punchoutCartTotal > 0 && <span className="ml-2">${punchoutCartTotal.toFixed(2)}</span>}
              </Button>
              <Button
                className="bg-amber-500 hover:bg-amber-600 text-black font-bold"
                onClick={transferToCoupa}
                disabled={transferring || punchoutCart.length === 0}
              >
                {transferring ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <ExternalLink className="w-5 h-5 mr-2" />}
                Transfer to Coupa
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white px-6 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              InfoShop Catalog
            </h1>
            <span className="text-sm text-slate-300">
              {catalogStats?.total_products?.toLocaleString() || "0"} products
            </span>
          </div>
          <Select value={selectedCountry} onValueChange={(val) => { setSelectedCountry(val); setCurrentPage(0); }}>
            <SelectTrigger className="w-[160px] bg-slate-700 border-slate-600 text-white">
              <Globe className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COUNTRIES.map((country) => (
                <SelectItem key={country.code} value={country.code}>
                  {country.flag} {country.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-4 max-w-7xl mx-auto">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              type="text"
              placeholder="Search products by name, part number, brand..."
              className="w-full h-12 pl-12 pr-12 text-lg border-2 border-slate-300 focus:border-orange-500 rounded-lg"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(0); }}
            />
            {searchQuery && (
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                onClick={() => { setSearchQuery(""); setCurrentPage(0); }}
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          <Button className="h-12 px-8 bg-amber-500 hover:bg-amber-600 text-black font-medium">
            <Search className="w-5 h-5 mr-2" />
            Search
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex p-6 gap-6 max-w-7xl mx-auto">
        {/* Filters */}
        {showFilters && (
          <aside className="w-64 flex-shrink-0">
            <Card className="sticky top-32">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-900">Filters</h3>
                  <button
                    className="text-sm text-blue-600"
                    onClick={() => setSelectedFilters({ brand: null, category: null, supplier: null })}
                  >
                    Clear all
                  </button>
                </div>

                {/* Category */}
                <div className="mb-4">
                  <h4 className="font-medium text-sm text-slate-900 mb-2">Category</h4>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {catalogStats?.top_categories?.slice(0, 10).map((cat) => (
                      <label key={cat.name} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                        <Checkbox
                          checked={selectedFilters.category === cat.name}
                          onCheckedChange={(checked) => 
                            setSelectedFilters({ ...selectedFilters, category: checked ? cat.name : null })
                          }
                        />
                        <span className="text-sm text-slate-700 truncate flex-1">{cat.name}</span>
                        <span className="text-xs text-slate-400">{cat.count}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Brand */}
                <div className="mb-4">
                  <h4 className="font-medium text-sm text-slate-900 mb-2">Brand</h4>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {catalogStats?.top_brands?.slice(0, 10).map((brand) => (
                      <label key={brand.name} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                        <Checkbox
                          checked={selectedFilters.brand === brand.name}
                          onCheckedChange={(checked) => 
                            setSelectedFilters({ ...selectedFilters, brand: checked ? brand.name : null })
                          }
                        />
                        <span className="text-sm text-slate-700 truncate flex-1">{brand.name}</span>
                        <span className="text-xs text-slate-400">{brand.count}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Supplier */}
                <div>
                  <h4 className="font-medium text-sm text-slate-900 mb-2">Supplier</h4>
                  <div className="space-y-1">
                    {catalogStats?.suppliers?.map((supplier) => (
                      <label key={supplier.name} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                        <Checkbox
                          checked={selectedFilters.supplier === supplier.name}
                          onCheckedChange={(checked) => 
                            setSelectedFilters({ ...selectedFilters, supplier: checked ? supplier.name : null })
                          }
                        />
                        <span className="text-sm text-slate-700">{supplier.name}</span>
                        <span className="text-xs text-slate-400">{supplier.count}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </aside>
        )}

        {/* Products */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => setShowFilters(!showFilters)}>
                <SlidersHorizontal className="w-4 h-4 mr-1" />
                {showFilters ? "Hide" : "Show"} Filters
              </Button>
              <span className="text-sm text-slate-600">
                <span className="font-medium">{totalHits.toLocaleString()}</span> results
                {processingTime > 0 && <span className="text-slate-400"> ({processingTime}ms)</span>}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Relevance</SelectItem>
                  <SelectItem value="price_asc">Price: Low to High</SelectItem>
                  <SelectItem value="price_desc">Price: High to Low</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center border rounded-lg">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  className="rounded-r-none"
                  onClick={() => setViewMode("grid")}
                >
                  <LayoutGrid className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  className="rounded-l-none"
                  onClick={() => setViewMode("list")}
                >
                  <LayoutList className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
            </div>
          )}

          {/* Products Grid */}
          {!loading && products.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {products.map((product) => (
                <ProductCard
                  key={product.objectID}
                  product={product}
                  viewMode={viewMode}
                  onAddToCart={handleAddToCart}
                  punchoutMode={punchoutMode}
                />
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && products.length === 0 && (
            <div className="text-center py-20">
              <Package className="w-20 h-20 mx-auto text-slate-300 mb-4" />
              <h3 className="text-xl font-medium text-slate-900 mb-2">No products found</h3>
              <p className="text-slate-500">Try adjusting your search or filters</p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <Button variant="outline" disabled={currentPage === 0} onClick={() => setCurrentPage(currentPage - 1)}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Previous
              </Button>
              <span className="px-4 py-2 text-sm">Page {currentPage + 1} of {totalPages}</span>
              <Button variant="outline" disabled={currentPage >= totalPages - 1} onClick={() => setCurrentPage(currentPage + 1)}>
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* PunchOut Cart Dialog */}
      <Dialog open={showPunchoutCart} onOpenChange={setShowPunchoutCart}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-blue-600" />
              PunchOut Cart
            </DialogTitle>
            <DialogDescription>Review items before transferring to Coupa</DialogDescription>
          </DialogHeader>
          
          {punchoutCart.length === 0 ? (
            <div className="py-8 text-center text-slate-500">
              <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>Your cart is empty</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {punchoutCart.map((item) => (
                <div key={item.product_id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-sm text-slate-900 line-clamp-1">{item.name}</p>
                    <p className="text-xs text-slate-500">{item.brand} • {item.part_number}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sm text-slate-600">Qty: {item.quantity}</span>
                      <span className="text-sm font-medium text-slate-900">${(item.unit_price * item.quantity).toFixed(2)}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeFromPunchoutCart(item.product_id)}>
                    <X className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <span className="font-medium text-slate-900">Total:</span>
              <span className="text-xl font-bold text-slate-900">${punchoutCartTotal.toFixed(2)}</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowPunchoutCart(false)}>
                Continue Shopping
              </Button>
              <Button
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-black font-bold"
                onClick={() => { setShowPunchoutCart(false); transferToCoupa(); }}
                disabled={punchoutCart.length === 0 || transferring}
              >
                {transferring ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ExternalLink className="w-4 h-4 mr-2" />}
                Transfer to Coupa
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InfoShopCatalog;

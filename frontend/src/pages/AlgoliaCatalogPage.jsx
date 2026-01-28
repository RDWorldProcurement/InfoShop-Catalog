import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
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
} from "../components/ui/dialog";
import {
  Search,
  Filter,
  ShoppingCart,
  Check,
  Package,
  Building2,
  Tag,
  Loader2,
  Award,
  Users,
  Sparkles,
  SlidersHorizontal,
  LayoutGrid,
  LayoutList,
  Globe,
  TrendingDown,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { useAuth } from "../App";

const API = process.env.REACT_APP_BACKEND_URL;

// Available countries for filtering
const COUNTRIES = [
  { code: "ALL", name: "All Countries", flag: "🌎" },
  { code: "USA", name: "United States", flag: "🇺🇸" },
  { code: "Canada", name: "Canada", flag: "🇨🇦" },
  { code: "Mexico", name: "Mexico", flag: "🇲🇽" },
  { code: "Germany", name: "Germany", flag: "🇩🇪" },
  { code: "UK", name: "United Kingdom", flag: "🇬🇧" },
  { code: "India", name: "India", flag: "🇮🇳" },
];

// Format price with currency symbol
const formatPrice = (price) => {
  if (!price || price === 0) return "Contact for Price";
  return `$${parseFloat(price).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

// Product Card Component
const ProductCard = ({ product, onAddToCart, onViewDetails, viewMode }) => {
  const [imageError, setImageError] = useState(false);
  const primaryImage = product.primary_image || product.images?.[0];
  const hasDiscount = product.discount_percentage > 0;
  const isLowestPrice = product.is_lowest_price;

  if (viewMode === "list") {
    return (
      <Card className="group hover:shadow-lg transition-all duration-300 border-slate-200 hover:border-blue-300">
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="w-32 h-32 flex-shrink-0 bg-slate-50 rounded-lg overflow-hidden">
              {primaryImage && !imageError ? (
                <img
                  src={primaryImage}
                  alt={product.product_name}
                  className="w-full h-full object-contain"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300">
                  <Package className="w-12 h-12" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex flex-wrap gap-1 mb-2">
                    {isLowestPrice && (
                      <Badge className="bg-green-500 text-white text-xs">
                        <Award className="w-3 h-3 mr-1" />
                        Lowest Price
                      </Badge>
                    )}
                    {product.in_stock && (
                      <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                        <Check className="w-3 h-3 mr-1" />
                        In Stock
                      </Badge>
                    )}
                    {hasDiscount && (
                      <Badge className="bg-orange-500 text-white text-xs">
                        <TrendingDown className="w-3 h-3 mr-1" />
                        Save {product.discount_percentage}%
                      </Badge>
                    )}
                  </div>
                  <h3
                    className="font-semibold text-slate-900 line-clamp-2 cursor-pointer hover:text-blue-600"
                    onClick={() => onViewDetails(product)}
                  >
                    {product.product_name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-slate-500">
                    {product.brand && (
                      <span className="flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        {product.brand}
                      </span>
                    )}
                    {product.supplier && (
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {product.supplier}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0 min-w-[140px]">
                  <p className="text-2xl font-bold text-green-600">
                    {formatPrice(product.selling_price || product.price)}
                  </p>
                  {hasDiscount && product.list_price > 0 && (
                    <p className="text-sm text-slate-400 line-through">
                      List: {formatPrice(product.list_price)}
                    </p>
                  )}
                  <Button
                    size="sm"
                    className="mt-3 bg-blue-600 hover:bg-blue-700"
                    onClick={() => onAddToCart(product)}
                  >
                    <ShoppingCart className="w-4 h-4 mr-1" />
                    Add to Cart
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Grid View
  return (
    <Card className="group hover:shadow-xl transition-all duration-300 border-slate-200 hover:border-blue-300 overflow-hidden">
      <div className="relative aspect-square bg-slate-50 overflow-hidden">
        {primaryImage && !imageError ? (
          <img
            src={primaryImage}
            alt={product.product_name}
            className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300">
            <Package className="w-16 h-16" />
          </div>
        )}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {isLowestPrice && (
            <Badge className="bg-green-500 text-white text-xs shadow-md">
              <Award className="w-3 h-3 mr-1" />
              Lowest Price
            </Badge>
          )}
        </div>
        {hasDiscount && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-orange-500 text-white text-xs shadow-md font-bold">
              -{product.discount_percentage}%
            </Badge>
          </div>
        )}
      </div>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          {product.brand && (
            <span className="text-xs font-medium text-blue-600 uppercase tracking-wide">
              {product.brand}
            </span>
          )}
          {product.supplier && (
            <span className="text-xs text-slate-500">{product.supplier}</span>
          )}
        </div>
        <h3
          className="font-semibold text-slate-900 line-clamp-2 min-h-[48px] cursor-pointer hover:text-blue-600"
          onClick={() => onViewDetails(product)}
        >
          {product.product_name}
        </h3>
        {product.part_number && (
          <p className="text-xs font-mono text-slate-500 mt-1">
            Part #: {product.part_number}
          </p>
        )}
        <div className="flex items-center gap-2 mt-2">
          {product.in_stock ? (
            <span className="flex items-center text-xs text-emerald-600">
              <Check className="w-3 h-3 mr-1" />
              In Stock
            </span>
          ) : (
            <span className="text-xs text-amber-600">{product.availability || "Check Availability"}</span>
          )}
        </div>
        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-2xl font-bold text-green-600">
                {formatPrice(product.selling_price || product.price)}
              </p>
              {hasDiscount && product.list_price > 0 && (
                <p className="text-xs text-slate-400 line-through">
                  List: {formatPrice(product.list_price)}
                </p>
              )}
            </div>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => onAddToCart(product)}
            >
              <ShoppingCart className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Product Detail Modal
const ProductDetailModal = ({ product, isOpen, onClose, onAddToCart }) => {
  if (!product) return null;
  const hasDiscount = product.discount_percentage > 0;
  const sellingPrice = product.selling_price || product.price;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{product.product_name}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          <div className="aspect-square bg-slate-50 rounded-lg overflow-hidden">
            {product.images?.length > 0 ? (
              <img
                src={product.images[0]}
                alt={product.product_name}
                className="w-full h-full object-contain p-4"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-300">
                <Package className="w-24 h-24" />
              </div>
            )}
          </div>
          <div>
            <div className="flex flex-wrap gap-2 mb-4">
              {product.is_lowest_price && (
                <Badge className="bg-green-500 text-white">
                  <Award className="w-4 h-4 mr-1" />
                  Lowest Price
                </Badge>
              )}
              {product.in_stock && (
                <Badge className="bg-emerald-100 text-emerald-700">
                  <Check className="w-4 h-4 mr-1" />
                  In Stock
                </Badge>
              )}
              <Badge variant="outline">{product.supplier}</Badge>
            </div>
            <div className="mb-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-green-600">
                  {formatPrice(sellingPrice)}
                </span>
                {hasDiscount && (
                  <Badge className="bg-orange-500 text-white">
                    Save {product.discount_percentage}%
                  </Badge>
                )}
              </div>
              {hasDiscount && product.list_price > 0 && (
                <p className="text-sm text-slate-500 mt-1">
                  <span className="line-through">List Price: {formatPrice(product.list_price)}</span>
                </p>
              )}
              <p className="text-xs text-slate-500 mt-2">
                per {product.unit || "EA"} • Infosys Preferred Pricing
              </p>
            </div>
            <div className="space-y-2 mb-4">
              {product.brand && (
                <p className="text-sm">
                  <span className="text-slate-500">Brand:</span> <span className="font-medium">{product.brand}</span>
                </p>
              )}
              {product.part_number && (
                <p className="text-sm">
                  <span className="text-slate-500">Part Number:</span> <span className="font-mono">{product.part_number}</span>
                </p>
              )}
              {product.category && (
                <p className="text-sm">
                  <span className="text-slate-500">Category:</span> <span className="font-medium">{product.category}</span>
                </p>
              )}
            </div>
            {product.description && (
              <div className="mb-4">
                <h4 className="font-semibold text-slate-900 mb-2">Description</h4>
                <p className="text-sm text-slate-600">{product.description}</p>
              </div>
            )}
            <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={() => onAddToCart(product)}>
              <ShoppingCart className="w-4 h-4 mr-2" />
              Add to Cart
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Main Catalog Page Component
const AlgoliaCatalogPage = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();

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
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showFilters, setShowFilters] = useState(true);
  const [catalogStats, setCatalogStats] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState("ALL");
  const [selectedFilters, setSelectedFilters] = useState({
    brand: null,
    category: null,
    supplier: null,
  });
  const [facets, setFacets] = useState({});

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Search function
  const searchProducts = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const filters = {};
      if (selectedCountry !== "ALL") filters.country = selectedCountry;
      if (selectedFilters.brand) filters.brand = selectedFilters.brand;
      if (selectedFilters.category) filters.category = selectedFilters.category;
      if (selectedFilters.supplier) filters.supplier = selectedFilters.supplier;

      const response = await axios.post(
        `${API}/api/algolia/catalog/search`,
        {
          query: debouncedQuery,
          page: currentPage,
          hits_per_page: 24,
          filters,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const data = response.data;
      setProducts(data.hits || []);
      setTotalHits(data.nbHits || 0);
      setTotalPages(data.nbPages || 0);
      setProcessingTime(data.processingTimeMS || 0);
      setFacets(data.facets || {});
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Search failed");
    } finally {
      setLoading(false);
    }
  }, [token, debouncedQuery, currentPage, selectedCountry, selectedFilters]);

  // Fetch stats
  useEffect(() => {
    const fetchStats = async () => {
      if (!token) return;
      try {
        const response = await axios.get(`${API}/api/algolia/catalog/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCatalogStats(response.data);
      } catch (error) {
        console.error("Failed to fetch catalog stats:", error);
      }
    };
    fetchStats();
  }, [token]);

  // Search on query/filter change
  useEffect(() => {
    searchProducts();
  }, [searchProducts]);

  // Add to cart handler
  const handleAddToCart = async (product) => {
    try {
      await axios.post(
        `${API}/api/cart/add`,
        {
          id: product.objectID || product.object_id,
          name: product.product_name,
          brand: product.brand,
          sku: product.sku || product.part_number,
          quantity: 1,
          unit_price: product.selling_price || product.price,
          total_price: product.selling_price || product.price,
          supplier: product.supplier,
          list_price: product.list_price,
          discount_percentage: product.discount_percentage,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Added ${product.product_name} to cart`);
    } catch (error) {
      toast.error("Failed to add item to cart");
    }
  };

  if (!user) {
    navigate("/login");
    return null;
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar activePage="algolia-catalog" />

      <main className="flex-1 p-6 overflow-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-blue-600" />
                Product Catalog
              </h1>
              <p className="text-slate-500 mt-1">
                {catalogStats?.total_products?.toLocaleString() || "0"} products from{" "}
                {catalogStats?.supplier_count || 0} suppliers
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-slate-500" />
                <Select value={selectedCountry} onValueChange={(val) => { setSelectedCountry(val); setCurrentPage(0); }}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select Country" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((country) => (
                      <SelectItem key={country.code} value={country.code}>
                        <span className="flex items-center gap-2">
                          <span>{country.flag}</span>
                          <span>{country.name}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-1 border rounded-lg p-1">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                >
                  <LayoutGrid className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                >
                  <LayoutList className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              type="text"
              placeholder="Search by product name, part number, brand, or description..."
              className="w-full h-12 pl-12 pr-4 rounded-xl border-2 border-slate-200 focus:border-blue-500 text-lg"
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
        </div>

        <div className="flex gap-6">
          {/* Filters Sidebar */}
          {showFilters && (
            <aside className="w-64 flex-shrink-0">
              <Card>
                <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4" />
                    Filters
                  </CardTitle>
                  <button
                    className="text-xs text-blue-600 hover:text-blue-800"
                    onClick={() => setSelectedFilters({ brand: null, category: null, supplier: null })}
                  >
                    Clear All
                  </button>
                </CardHeader>
                <CardContent className="p-4 space-y-6">
                  {/* Category Filter */}
                  <div>
                    <h4 className="font-semibold text-sm text-slate-900 mb-2">Category</h4>
                    <Select
                      value={selectedFilters.category || "all"}
                      onValueChange={(val) => setSelectedFilters({ ...selectedFilters, category: val === "all" ? null : val })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {catalogStats?.top_categories?.map((cat) => (
                          <SelectItem key={cat.name} value={cat.name}>
                            {cat.name} ({cat.count})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Brand Filter */}
                  <div>
                    <h4 className="font-semibold text-sm text-slate-900 mb-2">Brand</h4>
                    <Select
                      value={selectedFilters.brand || "all"}
                      onValueChange={(val) => setSelectedFilters({ ...selectedFilters, brand: val === "all" ? null : val })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Brands" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Brands</SelectItem>
                        {catalogStats?.top_brands?.map((brand) => (
                          <SelectItem key={brand.name} value={brand.name}>
                            {brand.name} ({brand.count})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Supplier Filter */}
                  <div>
                    <h4 className="font-semibold text-sm text-slate-900 mb-2">Supplier</h4>
                    <Select
                      value={selectedFilters.supplier || "all"}
                      onValueChange={(val) => setSelectedFilters({ ...selectedFilters, supplier: val === "all" ? null : val })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Suppliers" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Suppliers</SelectItem>
                        {catalogStats?.suppliers?.map((supplier) => (
                          <SelectItem key={supplier.name} value={supplier.name}>
                            {supplier.name} ({supplier.count})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </aside>
          )}

          {/* Results */}
          <div className="flex-1">
            {/* Results Header */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-slate-500">
                {totalHits.toLocaleString()} results ({processingTime}ms)
              </p>
              <Button variant="ghost" size="sm" onClick={() => setShowFilters(!showFilters)}>
                <Filter className="w-4 h-4 mr-1" />
                {showFilters ? "Hide Filters" : "Show Filters"}
              </Button>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            )}

            {/* Products Grid/List */}
            {!loading && products.length > 0 && (
              <div
                className={
                  viewMode === "grid"
                    ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                    : "space-y-4"
                }
              >
                {products.map((product) => (
                  <ProductCard
                    key={product.objectID || product.object_id}
                    product={product}
                    viewMode={viewMode}
                    onAddToCart={handleAddToCart}
                    onViewDetails={setSelectedProduct}
                  />
                ))}
              </div>
            )}

            {/* Empty State */}
            {!loading && products.length === 0 && (
              <div className="text-center py-12">
                <Package className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-900">No products found</h3>
                <p className="text-slate-500 mt-1">Try adjusting your search or filters</p>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 0}
                  onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-slate-600">
                  Page {currentPage + 1} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages - 1}
                  onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Product Detail Modal */}
        <ProductDetailModal
          product={selectedProduct}
          isOpen={!!selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={handleAddToCart}
        />
      </main>
    </div>
  );
};

export default AlgoliaCatalogPage;

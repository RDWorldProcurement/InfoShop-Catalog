import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  InstantSearch,
  SearchBox,
  Hits,
  RefinementList,
  Pagination,
  Stats,
  SortBy,
  ClearRefinements,
  CurrentRefinements,
  Configure,
} from "react-instantsearch-dom";
import Sidebar from "../components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
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
  X,
  FileText,
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
  Percent,
  TrendingDown,
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { useAuth } from "../App";

const API = process.env.REACT_APP_BACKEND_URL;

// Custom search client that uses our backend API instead of direct Algolia
// This ensures all searches go through our backend for pricing calculations
const createBackendSearchClient = (apiUrl, token) => ({
  search: async (requests) => {
    try {
      console.log("Search requests:", requests);
      
      // Only handle the first request for simplicity
      const request = requests[0];
      const { indexName, params } = request;
      
      // Parse params
      const searchParams = new URLSearchParams(params);
      const query = searchParams.get('query') || '';
      const page = parseInt(searchParams.get('page') || '0');
      const hitsPerPage = parseInt(searchParams.get('hitsPerPage') || '24');
      
      // Get filters from facetFilters
      const facetFilters = searchParams.get('facetFilters');
      let filters = {};
      if (facetFilters) {
        try {
          const parsed = JSON.parse(facetFilters);
          parsed.forEach(filter => {
            if (Array.isArray(filter)) {
              filter.forEach(f => {
                const [key, value] = f.split(':');
                if (key && value) filters[key] = value;
              });
            } else {
              const [key, value] = filter.split(':');
              if (key && value) filters[key] = value;
            }
          });
        } catch (e) {
          console.error("Filter parse error:", e);
        }
      }
      
      console.log("Calling backend with:", { query, page, hitsPerPage, filters });
      
      const response = await fetch(`${apiUrl}/api/algolia/catalog/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          query,
          page,
          hits_per_page: hitsPerPage,
          filters
        })
      });
      
      const data = await response.json();
      console.log("Backend response:", { nbHits: data.nbHits, hitsCount: data.hits?.length });
      
      // Transform hits to ensure objectID is present
      const transformedHits = (data.hits || []).map(hit => ({
        ...hit,
        objectID: hit.objectID || hit.object_id || `${hit.supplier}_${hit.sku}`
      }));
      
      // Transform facets to InstantSearch format
      // Backend returns: { brand: { "name": "X", "count": N }, ... }
      // InstantSearch expects: { brand: { "X": N, ... }, ... }
      const transformedFacets = {};
      if (data.facets) {
        // If facets are in array format from model_dump
        Object.keys(data.facets).forEach(facetName => {
          const facetData = data.facets[facetName];
          if (typeof facetData === 'object' && facetData !== null) {
            if (Array.isArray(facetData)) {
              // Array of {value, count}
              transformedFacets[facetName] = {};
              facetData.forEach(item => {
                if (item.value !== undefined) {
                  transformedFacets[facetName][item.value] = item.count || 0;
                }
              });
            } else {
              // Direct object
              transformedFacets[facetName] = facetData;
            }
          }
        });
      }
      
      // Transform to InstantSearch format
      const result = {
        results: [{
          hits: transformedHits,
          nbHits: data.nbHits || 0,
          page: data.page || 0,
          nbPages: data.nbPages || 0,
          hitsPerPage: data.hitsPerPage || 24,
          processingTimeMS: data.processingTimeMS || 0,
          exhaustiveNbHits: true,
          query: query,
          params: params,
          index: indexName,
          facets: transformedFacets
        }]
      };
      
      console.log("Returning to InstantSearch:", { nbHits: result.results[0].nbHits, hitsCount: result.results[0].hits.length });
      return result;
    } catch (error) {
      console.error('Search error:', error);
      return { results: [{ hits: [], nbHits: 0, page: 0, nbPages: 0, hitsPerPage: 24 }] };
    }
  },
  searchForFacetValues: async () => ({ facetHits: [] })
});

// Available countries for filtering
const COUNTRIES = [
  { code: "ALL", name: "All Countries", flag: "🌎" },
  { code: "USA", name: "United States", flag: "🇺🇸" },
  { code: "Canada", name: "Canada", flag: "🇨🇦" },
  { code: "Mexico", name: "Mexico", flag: "🇲🇽" },
  { code: "Germany", name: "Germany", flag: "🇩🇪" },
  { code: "UK", name: "United Kingdom", flag: "🇬🇧" },
  { code: "France", name: "France", flag: "🇫🇷" },
  { code: "India", name: "India", flag: "🇮🇳" },
  { code: "China", name: "China", flag: "🇨🇳" },
  { code: "Japan", name: "Japan", flag: "🇯🇵" },
  { code: "Brazil", name: "Brazil", flag: "🇧🇷" },
  { code: "Australia", name: "Australia", flag: "🇦🇺" },
];

// Format price with currency symbol
const formatPrice = (price) => {
  if (!price || price === 0) return "Contact for Price";
  return `$${parseFloat(price).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

// Product Card Component with Dual Pricing Display
const ProductCard = ({ hit, onAddToCart, onViewDetails, viewMode }) => {
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const primaryImage = hit.primary_image || hit.images?.[0];
  const hasMultipleSuppliers = hit.supplier_count > 1;
  const isLowestPrice = hit.is_lowest_price;
  const hasDiscount = hit.discount_percentage > 0;

  if (viewMode === "list") {
    return (
      <Card
        className="group hover:shadow-lg transition-all duration-300 border-slate-200 hover:border-blue-300"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        data-testid={`product-card-${hit.objectID}`}
      >
        <CardContent className="p-4">
          <div className="flex gap-4">
            {/* Image */}
            <div className="w-32 h-32 flex-shrink-0 bg-slate-50 rounded-lg overflow-hidden">
              {primaryImage && !imageError ? (
                <img
                  src={primaryImage}
                  alt={hit.product_name}
                  className="w-full h-full object-contain"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300">
                  <Package className="w-12 h-12" />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  {/* Badges */}
                  <div className="flex flex-wrap gap-1 mb-2">
                    {isLowestPrice && (
                      <Badge className="bg-green-500 text-white text-xs">
                        <Award className="w-3 h-3 mr-1" />
                        Lowest Price
                      </Badge>
                    )}
                    {hasMultipleSuppliers && !isLowestPrice && (
                      <Badge variant="secondary" className="text-xs">
                        <Users className="w-3 h-3 mr-1" />
                        {hit.supplier_count} Suppliers
                      </Badge>
                    )}
                    {hit.in_stock && (
                      <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                        <Check className="w-3 h-3 mr-1" />
                        In Stock
                      </Badge>
                    )}
                    {hasDiscount && (
                      <Badge className="bg-orange-500 text-white text-xs">
                        <TrendingDown className="w-3 h-3 mr-1" />
                        Save {hit.discount_percentage}%
                      </Badge>
                    )}
                  </div>

                  {/* Title */}
                  <h3
                    className="font-semibold text-slate-900 line-clamp-2 cursor-pointer hover:text-blue-600"
                    onClick={() => onViewDetails(hit)}
                    dangerouslySetInnerHTML={{
                      __html: hit._highlightResult?.product_name?.value || hit.product_name,
                    }}
                  />

                  {/* Meta info */}
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-slate-500">
                    {hit.brand && (
                      <span className="flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        {hit.brand}
                      </span>
                    )}
                    {hit.part_number && (
                      <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">
                        {hit.part_number}
                      </span>
                    )}
                    {hit.supplier && (
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {hit.supplier}
                      </span>
                    )}
                    {hit.country && (
                      <span className="flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        {hit.country}
                      </span>
                    )}
                  </div>
                </div>

                {/* Price & Actions */}
                <div className="text-right flex-shrink-0 min-w-[140px]">
                  {/* Selling Price (Infosys Price) */}
                  <p className="text-2xl font-bold text-green-600" data-testid="selling-price">
                    {formatPrice(hit.selling_price || hit.price)}
                  </p>
                  
                  {/* List Price (strikethrough if discounted) */}
                  {hasDiscount && hit.list_price && (
                    <p className="text-sm text-slate-400 line-through" data-testid="list-price">
                      List: {formatPrice(hit.list_price)}
                    </p>
                  )}
                  
                  {hit.unit && (
                    <p className="text-xs text-slate-500">per {hit.unit}</p>
                  )}
                  
                  {hasDiscount && (
                    <p className="text-xs text-orange-600 font-medium mt-1">
                      You Save {formatPrice(hit.list_price - (hit.selling_price || hit.price))}
                    </p>
                  )}
                  
                  <Button
                    size="sm"
                    className="mt-3 bg-blue-600 hover:bg-blue-700"
                    onClick={() => onAddToCart(hit)}
                    data-testid={`add-to-cart-${hit.objectID}`}
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
    <Card
      className="group hover:shadow-xl transition-all duration-300 border-slate-200 hover:border-blue-300 overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid={`product-card-${hit.objectID}`}
    >
      {/* Image Container */}
      <div className="relative aspect-square bg-slate-50 overflow-hidden">
        {primaryImage && !imageError ? (
          <img
            src={primaryImage}
            alt={hit.product_name}
            className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300">
            <Package className="w-16 h-16" />
          </div>
        )}

        {/* Badges Overlay */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {isLowestPrice && (
            <Badge className="bg-green-500 text-white text-xs shadow-md">
              <Award className="w-3 h-3 mr-1" />
              Lowest Price
            </Badge>
          )}
          {hasMultipleSuppliers && !isLowestPrice && (
            <Badge className="bg-blue-500 text-white text-xs shadow-md">
              <Users className="w-3 h-3 mr-1" />
              {hit.supplier_count} Suppliers
            </Badge>
          )}
        </div>

        {/* Discount Badge - Top Right */}
        {hasDiscount && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-orange-500 text-white text-xs shadow-md font-bold">
              -{hit.discount_percentage}%
            </Badge>
          </div>
        )}

        {/* Quick Actions Overlay */}
        <div
          className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3 transform transition-all duration-300 ${
            isHovered ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
          }`}
        >
          <Button
            size="sm"
            className="w-full bg-white text-slate-900 hover:bg-slate-100"
            onClick={() => onViewDetails(hit)}
          >
            Quick View
          </Button>
        </div>
      </div>

      <CardContent className="p-4">
        {/* Brand & Supplier */}
        <div className="flex items-center justify-between mb-2">
          {hit.brand && (
            <span className="text-xs font-medium text-blue-600 uppercase tracking-wide">
              {hit.brand}
            </span>
          )}
          {hit.supplier && (
            <span className="text-xs text-slate-500">{hit.supplier}</span>
          )}
        </div>

        {/* Product Name */}
        <h3
          className="font-semibold text-slate-900 line-clamp-2 min-h-[48px] cursor-pointer hover:text-blue-600"
          onClick={() => onViewDetails(hit)}
          dangerouslySetInnerHTML={{
            __html: hit._highlightResult?.product_name?.value || hit.product_name,
          }}
        />

        {/* Part Number */}
        {hit.part_number && (
          <p className="text-xs font-mono text-slate-500 mt-1">
            Part #: {hit.part_number}
          </p>
        )}

        {/* Availability */}
        <div className="flex items-center gap-2 mt-2">
          {hit.in_stock ? (
            <span className="flex items-center text-xs text-emerald-600">
              <Check className="w-3 h-3 mr-1" />
              In Stock
            </span>
          ) : (
            <span className="text-xs text-amber-600">{hit.availability || "Check Availability"}</span>
          )}
        </div>

        {/* Price Section */}
        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="flex items-end justify-between">
            <div>
              {/* Infosys Selling Price */}
              <p className="text-2xl font-bold text-green-600" data-testid="selling-price">
                {formatPrice(hit.selling_price || hit.price)}
              </p>
              
              {/* Original List Price */}
              {hasDiscount && hit.list_price && (
                <p className="text-xs text-slate-400 line-through">
                  List: {formatPrice(hit.list_price)}
                </p>
              )}
              
              {hit.unit && <p className="text-xs text-slate-500">per {hit.unit}</p>}
            </div>
            
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => onAddToCart(hit)}
              data-testid={`add-to-cart-${hit.objectID}`}
            >
              <ShoppingCart className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Savings highlight */}
          {hasDiscount && (
            <p className="text-xs text-orange-600 font-medium mt-2 flex items-center gap-1">
              <TrendingDown className="w-3 h-3" />
              Save {formatPrice(hit.list_price - (hit.selling_price || hit.price))} ({hit.discount_percentage}%)
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Product Detail Modal with Dual Pricing
const ProductDetailModal = ({ product, isOpen, onClose, onAddToCart }) => {
  const [activeImage, setActiveImage] = useState(0);
  const [showSpecDoc, setShowSpecDoc] = useState(null);

  if (!product) return null;

  const images = product.images || [];
  const documents = product.documents || [];
  const specifications = product.specifications || {};
  const hasDiscount = product.discount_percentage > 0;
  const sellingPrice = product.selling_price || product.price;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{product.product_name}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          {/* Images */}
          <div>
            <div className="aspect-square bg-slate-50 rounded-lg overflow-hidden mb-3">
              {images.length > 0 ? (
                <img
                  src={images[activeImage]}
                  alt={product.product_name}
                  className="w-full h-full object-contain p-4"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300">
                  <Package className="w-24 h-24" />
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImage(idx)}
                    className={`w-16 h-16 flex-shrink-0 rounded border-2 overflow-hidden ${
                      idx === activeImage ? "border-blue-500" : "border-slate-200"
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-contain" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div>
            {/* Badges */}
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
              {product.country && (
                <Badge variant="outline">
                  <Globe className="w-3 h-3 mr-1" />
                  {product.country}
                </Badge>
              )}
            </div>

            {/* Pricing Section */}
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
              
              {hasDiscount && product.list_price && (
                <>
                  <p className="text-sm text-slate-500 mt-1">
                    <span className="line-through">List Price: {formatPrice(product.list_price)}</span>
                  </p>
                  <p className="text-sm text-green-700 font-medium mt-1">
                    Your Savings: {formatPrice(product.list_price - sellingPrice)}
                  </p>
                </>
              )}
              
              <p className="text-xs text-slate-500 mt-2">
                per {product.unit || "EA"} • Infosys Preferred Pricing
              </p>
            </div>

            {/* Key Info */}
            <div className="space-y-2 mb-4">
              {product.brand && (
                <p className="text-sm">
                  <span className="text-slate-500">Brand:</span>{" "}
                  <span className="font-medium">{product.brand}</span>
                </p>
              )}
              {product.part_number && (
                <p className="text-sm">
                  <span className="text-slate-500">Part Number:</span>{" "}
                  <span className="font-mono">{product.part_number}</span>
                </p>
              )}
              {product.sku && (
                <p className="text-sm">
                  <span className="text-slate-500">SKU:</span>{" "}
                  <span className="font-mono">{product.sku}</span>
                </p>
              )}
              {product.unspsc_code && (
                <p className="text-sm">
                  <span className="text-slate-500">UNSPSC:</span>{" "}
                  <span className="font-mono">{product.unspsc_code}</span>
                </p>
              )}
            </div>

            {/* Description */}
            {product.description && (
              <div className="mb-4">
                <h4 className="font-semibold text-slate-900 mb-2">Description</h4>
                <p className="text-sm text-slate-600">{product.description}</p>
              </div>
            )}

            {/* Add to Cart */}
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 mb-4"
              onClick={() => onAddToCart(product)}
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Add to Cart
            </Button>

            {/* Specification Documents */}
            {documents.length > 0 && (
              <div className="border-t pt-4">
                <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Specification Documents
                </h4>
                <div className="space-y-2">
                  {documents.map((doc, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => setShowSpecDoc(doc.url)}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      {doc.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Specifications Table */}
            {Object.keys(specifications).length > 0 && (
              <div className="border-t pt-4 mt-4">
                <h4 className="font-semibold text-slate-900 mb-2">Specifications</h4>
                <div className="bg-slate-50 rounded-lg p-3">
                  <table className="w-full text-sm">
                    <tbody>
                      {Object.entries(specifications).slice(0, 10).map(([key, value]) => (
                        <tr key={key} className="border-b border-slate-200 last:border-0">
                          <td className="py-2 text-slate-500">{key}</td>
                          <td className="py-2 font-medium text-right">{value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Spec Document Modal */}
        {showSpecDoc && (
          <Dialog open={!!showSpecDoc} onOpenChange={() => setShowSpecDoc(null)}>
            <DialogContent className="max-w-5xl h-[80vh]">
              <DialogHeader>
                <DialogTitle>Specification Document</DialogTitle>
              </DialogHeader>
              <iframe
                src={showSpecDoc}
                className="w-full h-full border-0 rounded"
                title="Specification Document"
              />
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
};

// Main Catalog Page Component
const AlgoliaCatalogPage = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const [viewMode, setViewMode] = useState("grid");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showFilters, setShowFilters] = useState(true);
  const [catalogStats, setCatalogStats] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState("ALL");
  const [loading, setLoading] = useState(false);

  // Fetch catalog stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get(`${API}/api/algolia/catalog/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCatalogStats(response.data);
      } catch (error) {
        console.error("Failed to fetch catalog stats:", error);
      }
    };

    if (token) {
      fetchStats();
    }
  }, [token]);

  const handleAddToCart = async (product) => {
    try {
      await axios.post(
        `${API}/api/cart/add`,
        {
          id: product.objectID,
          name: product.product_name,
          brand: product.brand,
          sku: product.sku || product.part_number,
          quantity: 1,
          unit_price: product.selling_price || product.price,
          total_price: product.selling_price || product.price,
          supplier: product.supplier,
          image: product.primary_image,
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

  // Create search client with user's token - must be before any early returns
  const searchClient = useMemo(
    () => createBackendSearchClient(API, token),
    [token]
  );

  if (!user) {
    navigate("/login");
    return null;
  }

  // Build country filter for Algolia
  const countryFilter = selectedCountry !== "ALL" ? `country:${selectedCountry}` : "";

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar activePage="algolia-catalog" />

      <main className="flex-1 p-6 overflow-auto">
        <InstantSearch
          searchClient={searchClient}
          indexName="omnisupply_products"
        >
          <Configure 
            hitsPerPage={24} 
            filters={countryFilter}
          />

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
                {/* Country Selector */}
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-slate-500" />
                  <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                    <SelectTrigger className="w-[180px]" data-testid="country-selector">
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

                {/* View Mode Toggle */}
                <div className="flex items-center gap-1 border rounded-lg p-1">
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                    data-testid="view-grid-btn"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                    data-testid="view-list-btn"
                  >
                    <LayoutList className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <SearchBox
                placeholder="Search by product name, part number, brand, or description..."
                classNames={{
                  root: "w-full",
                  form: "relative",
                  input:
                    "w-full h-12 pl-12 pr-4 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-0 text-lg",
                  submit: "absolute left-4 top-1/2 -translate-y-1/2",
                  submitIcon: "w-5 h-5 text-slate-400",
                  reset: "absolute right-4 top-1/2 -translate-y-1/2",
                  resetIcon: "w-4 h-4",
                }}
              />
            </div>

            {/* Active Refinements */}
            <div className="mt-3">
              <CurrentRefinements
                classNames={{
                  root: "flex flex-wrap gap-2",
                  item: "flex items-center gap-1 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm",
                  label: "font-medium",
                  delete: "ml-1 hover:text-blue-600",
                }}
              />
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
                    <ClearRefinements
                      classNames={{
                        button: "text-xs text-blue-600 hover:text-blue-800",
                      }}
                      translations={{ resetButtonText: "Clear All" }}
                    />
                  </CardHeader>
                  <CardContent className="p-4 space-y-6">
                    {/* Category Filter */}
                    <div>
                      <h4 className="font-semibold text-sm text-slate-900 mb-2">Category</h4>
                      <RefinementList
                        attribute="category"
                        limit={10}
                        showMore
                        showMoreLimit={50}
                        searchable
                        searchablePlaceholder="Search categories..."
                        classNames={{
                          root: "space-y-1",
                          item: "flex items-center gap-2",
                          checkbox:
                            "w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500",
                          label: "text-sm text-slate-700 cursor-pointer flex-1",
                          count: "text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full",
                          searchBox: "mb-2 text-sm",
                        }}
                      />
                    </div>

                    {/* Brand Filter */}
                    <div>
                      <h4 className="font-semibold text-sm text-slate-900 mb-2">Brand</h4>
                      <RefinementList
                        attribute="brand"
                        limit={10}
                        showMore
                        showMoreLimit={50}
                        searchable
                        searchablePlaceholder="Search brands..."
                        classNames={{
                          root: "space-y-1",
                          item: "flex items-center gap-2",
                          checkbox:
                            "w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500",
                          label: "text-sm text-slate-700 cursor-pointer flex-1",
                          count: "text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full",
                          searchBox: "mb-2 text-sm",
                        }}
                      />
                    </div>

                    {/* Supplier Filter */}
                    <div>
                      <h4 className="font-semibold text-sm text-slate-900 mb-2">Supplier</h4>
                      <RefinementList
                        attribute="supplier"
                        limit={10}
                        showMore
                        classNames={{
                          root: "space-y-1",
                          item: "flex items-center gap-2",
                          checkbox:
                            "w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500",
                          label: "text-sm text-slate-700 cursor-pointer flex-1",
                          count: "text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full",
                        }}
                      />
                    </div>

                    {/* Availability Filter */}
                    <div>
                      <h4 className="font-semibold text-sm text-slate-900 mb-2">Availability</h4>
                      <RefinementList
                        attribute="in_stock"
                        transformItems={(items) =>
                          items.map((item) => ({
                            ...item,
                            label: item.value === "true" ? "In Stock" : "Out of Stock",
                          }))
                        }
                        classNames={{
                          root: "space-y-1",
                          item: "flex items-center gap-2",
                          checkbox:
                            "w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500",
                          label: "text-sm text-slate-700 cursor-pointer flex-1",
                          count: "text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full",
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>
              </aside>
            )}

            {/* Results */}
            <div className="flex-1">
              {/* Results Header */}
              <div className="flex items-center justify-between mb-4">
                <Stats
                  classNames={{
                    root: "text-sm text-slate-500",
                  }}
                  translations={{
                    rootElementText({ nbHits, processingTimeMS }) {
                      return `${nbHits.toLocaleString()} results (${processingTimeMS}ms)`;
                    },
                  }}
                />

                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                    data-testid="toggle-filters-btn"
                  >
                    <Filter className="w-4 h-4 mr-1" />
                    {showFilters ? "Hide Filters" : "Show Filters"}
                  </Button>

                  <SortBy
                    items={[
                      { value: "omnisupply_products", label: "Relevance" },
                      { value: "omnisupply_products_price_asc", label: "Price: Low to High" },
                      { value: "omnisupply_products_price_desc", label: "Price: High to Low" },
                    ]}
                    classNames={{
                      select:
                        "h-9 px-3 rounded-md border border-slate-200 text-sm focus:border-blue-500",
                    }}
                  />
                </div>
              </div>

              {/* Product Grid/List */}
              <Hits
                hitComponent={({ hit }) => (
                  <ProductCard
                    hit={hit}
                    viewMode={viewMode}
                    onAddToCart={handleAddToCart}
                    onViewDetails={setSelectedProduct}
                  />
                )}
                classNames={{
                  root: "",
                  list:
                    viewMode === "grid"
                      ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                      : "space-y-4",
                }}
              />

              {/* Pagination */}
              <div className="mt-8 flex justify-center">
                <Pagination
                  padding={2}
                  showFirst={false}
                  showLast={false}
                  classNames={{
                    root: "flex items-center gap-1",
                    item: "w-10 h-10 flex items-center justify-center rounded-lg text-sm",
                    selectedItem: "bg-blue-600 text-white",
                    disabledItem: "text-slate-300 cursor-not-allowed",
                    link: "w-full h-full flex items-center justify-center hover:bg-slate-100 rounded-lg",
                  }}
                />
              </div>
            </div>
          </div>
        </InstantSearch>

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

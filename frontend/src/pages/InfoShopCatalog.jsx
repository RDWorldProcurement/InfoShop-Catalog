import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import {
  Search,
  ShoppingCart,
  Package,
  Filter,
  Grid3X3,
  List,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  X,
  Clock,
  Truck,
  Building2,
  Calendar,
  MapPin,
  User,
  AlertCircle,
  Star,
  ArrowUpDown,
  Globe,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { Toaster, toast } from "sonner";

// API Base URL
const API = process.env.REACT_APP_BACKEND_URL || "";

// ============================================
// INFOSYS BRANDING
// ============================================
const INFOSYS_LOGO = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMDAgNjAiPjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iNjAiIGZpbGw9IiMwMDdhYmYiLz48dGV4dCB4PSIxMCIgeT0iNDIiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIyOCIgZm9udC13ZWlnaHQ9ImJvbGQiIGZpbGw9IndoaXRlIj5JbmZvc3lzPC90ZXh0Pjwvc3ZnPg==";

const INFOSYS_COLORS = {
  primary: "#007abf",
  secondary: "#00a9e0",
  accent: "#e97300",
  dark: "#1a1a2e",
};

// ============================================
// NO PICTURE AVAILABLE COMPONENT
// ============================================
const NoPictureAvailable = () => (
  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg border-2 border-dashed border-slate-200 p-4">
    <div className="w-16 h-16 mb-3 flex items-center justify-center rounded-full bg-[#007abf]/10">
      <Package className="w-8 h-8 text-[#007abf]" />
    </div>
    <div className="text-center">
      <p className="text-sm font-semibold text-[#007abf]">No Picture</p>
      <p className="text-xs text-slate-500">Available</p>
    </div>
    <div className="mt-2 flex items-center gap-1">
      <span className="text-[10px] text-slate-400">Powered by</span>
      <span className="text-[10px] font-bold text-[#007abf]">Infosys</span>
    </div>
  </div>
);

// ============================================
// COPY BUTTON COMPONENT
// ============================================
const CopyPartNumber = ({ partNumber }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(partNumber);
      setCopied(true);
      toast.success(`Copied: ${partNumber}`);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy");
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded transition-colors"
      title="Copy InfoShop Part Number"
    >
      {copied ? (
        <Check className="w-3 h-3 text-green-600" />
      ) : (
        <Copy className="w-3 h-3 text-slate-600" />
      )}
      <span className="font-mono text-slate-700">{partNumber}</span>
    </button>
  );
};

// ============================================
// PRODUCT CARD COMPONENT
// ============================================
const ProductCard = ({ product, onAddToCart, punchoutMode }) => {
  const [imageError, setImageError] = useState(false);

  const hasValidImage = product.primary_image && !imageError && !product.use_placeholder;
  const hasPrice = product.danone_preferred_price > 0 || product.list_price > 0;

  const displayPrice = product.danone_preferred_price || product.list_price || 0;
  const listPrice = product.list_price || 0;
  const savings = product.customer_savings_percent || 0;

  return (
    <Card 
      className="group hover:shadow-xl transition-all duration-300 border border-slate-200 hover:border-[#007abf]/30 bg-white overflow-hidden h-full flex flex-col"
      data-testid={`product-card-${product.infoshop_part_number}`}
    >
      {/* Image Section */}
      <div className="relative aspect-square bg-white p-3 border-b border-slate-100">
        {hasValidImage ? (
          <img
            src={product.primary_image}
            alt={product.product_name}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
            onError={() => setImageError(true)}
          />
        ) : (
          <NoPictureAvailable />
        )}
        
        {savings > 0 && (
          <Badge className="absolute top-2 left-2 bg-green-600 text-white text-xs font-bold px-2 py-1">
            Save {savings.toFixed(1)}%
          </Badge>
        )}

        {product.in_stock && (
          <Badge className="absolute top-2 right-2 bg-emerald-500 text-white text-xs px-2 py-0.5">
            In Stock
          </Badge>
        )}
      </div>

      {/* Content Section */}
      <CardContent className="p-4 flex-1 flex flex-col">
        {/* Brand */}
        <p className="text-xs text-[#007abf] font-semibold uppercase tracking-wide mb-1">
          {product.brand || product.vendor}
        </p>

        {/* Product Name */}
        <h3 className="text-sm text-slate-800 font-medium line-clamp-2 mb-2 min-h-[40px]">
          {product.product_name}
        </h3>

        {/* Part Numbers Section */}
        <div className="space-y-1 mb-3 text-xs">
          {/* InfoShop Part Number with Copy */}
          <div className="flex items-center justify-between">
            <span className="text-slate-500">InfoShop #:</span>
            <CopyPartNumber partNumber={product.infoshop_part_number} />
          </div>
          
          {/* Mfg Part Number */}
          {product.mfg_part_number && (
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Mfg Part #:</span>
              <span className="font-mono text-slate-700">{product.mfg_part_number}</span>
            </div>
          )}
          
          {/* Partner Part Number */}
          {product.partner_part_number && (
            <div className="flex items-center justify-between">
              <span className="text-slate-500">{product.vendor} #:</span>
              <span className="font-mono text-slate-700">{product.partner_part_number}</span>
            </div>
          )}
        </div>

        {/* UNSPSC & Category */}
        <div className="flex flex-wrap gap-1 mb-3">
          {product.unspsc_code && (
            <Badge variant="outline" className="text-[10px] bg-slate-50">
              UNSPSC: {product.unspsc_code}
            </Badge>
          )}
          {product.category && (
            <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700">
              {product.category.length > 20 ? product.category.substring(0, 20) + "..." : product.category}
            </Badge>
          )}
        </div>

        {/* UOM & MoQ */}
        <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
          <span>UOM: <strong>{product.uom || "EA"}</strong></span>
          <span>MoQ: <strong>{product.moq || 1}</strong></span>
        </div>

        {/* Stock */}
        {product.stock_available !== null && product.stock_available !== undefined && (
          <div className="text-xs mb-3">
            {product.in_stock ? (
              <span className="text-emerald-600 font-medium flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                {typeof product.stock_available === "number" 
                  ? `${product.stock_available} in stock` 
                  : product.stock_available}
              </span>
            ) : (
              <span className="text-amber-600 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {product.stock_available || "Lead time applies"}
              </span>
            )}
          </div>
        )}

        {/* Pricing Section */}
        <div className="mb-3 mt-auto">
          {hasPrice ? (
            <div className="space-y-2">
              {/* Savings Badge - Prominent */}
              {listPrice > 0 && listPrice > displayPrice && (
                <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-1.5 rounded-lg text-center">
                  <span className="text-sm font-bold">
                    SAVE {((listPrice - displayPrice) / listPrice * 100).toFixed(1)}%
                  </span>
                  <span className="text-xs ml-2 opacity-90">
                    vs. Supplier List Price
                  </span>
                </div>
              )}
              
              {/* Danone Preferred Price */}
              <div className="flex items-baseline gap-1">
                <span className="text-xs text-slate-500">$</span>
                <span className="text-2xl font-bold text-[#007abf]">
                  {displayPrice.toFixed(2).split(".")[0]}
                </span>
                <span className="text-sm font-bold text-[#007abf]">
                  .{displayPrice.toFixed(2).split(".")[1]}
                </span>
                <span className="text-xs text-slate-500 ml-1">Danone Price</span>
              </div>
              
              {/* List Price (strikethrough) & Dollar Savings */}
              {listPrice > 0 && listPrice > displayPrice && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 line-through">
                    List: ${listPrice.toFixed(2)}
                  </span>
                  <span className="text-green-600 font-semibold">
                    Save ${(listPrice - displayPrice).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="p-2 bg-amber-50 border border-amber-200 rounded text-center">
              <p className="text-sm font-medium text-amber-700">Request Quote</p>
            </div>
          )}
        </div>

        {/* Vendor Tag */}
        <p className="text-xs text-slate-400 mb-3">
          Sold by <span className="font-medium text-slate-600">{product.vendor}</span>
        </p>

        {/* Add to Cart Button */}
        <Button
          className="w-full bg-[#e97300] hover:bg-[#d66900] text-white font-medium"
          onClick={() => onAddToCart(product)}
          disabled={!hasPrice}
          data-testid={`add-to-cart-${product.infoshop_part_number}`}
        >
          <ShoppingCart className="w-4 h-4 mr-2" />
          {punchoutMode ? "Add to Requisition" : "Add to Cart"}
        </Button>
      </CardContent>
    </Card>
  );
};

// ============================================
// PARTNER SELECTOR WITH COMING SOON
// ============================================
const PartnerSelector = ({ selectedPartner, onSelectPartner, partners, comingSoon }) => {
  const [showComingSoon, setShowComingSoon] = useState(false);

  return (
    <div className="relative">
      <select
        value={selectedPartner}
        onChange={(e) => onSelectPartner(e.target.value)}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-[#007abf] focus:border-transparent"
        data-testid="partner-selector"
      >
        <option value="ALL">All Active Partners</option>
        {partners.map((partner) => (
          <option key={partner} value={partner}>
            {partner}
          </option>
        ))}
        <option disabled>────────────────</option>
        <option disabled style={{ fontWeight: "bold", color: "#6b7280" }}>
          Coming Soon Partners:
        </option>
        {Object.entries(comingSoon).map(([region, regionPartners]) => (
          <optgroup key={region} label={region}>
            {regionPartners.map((partner) => (
              <option key={partner} value={partner} disabled>
                🔜 {partner}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
};

// ============================================
// SHIPPING FORM MODAL
// ============================================
const ShippingFormModal = ({ isOpen, onClose, onSubmit, minimumDate, cartTotal, itemCount }) => {
  const [formData, setFormData] = useState({
    shipping_address: "",
    delivery_attention: "",
    requested_delivery_date: minimumDate,
    special_instructions: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#007abf] to-[#00a9e0] p-6 text-white rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Truck className="w-8 h-8" />
              <div>
                <h2 className="text-xl font-bold">Shipping Information</h2>
                <p className="text-blue-100 text-sm">Required before transfer to Coupa</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-white/20 rounded">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-slate-50 p-4 border-b">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Items in Cart:</span>
            <span className="font-semibold">{itemCount}</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-slate-600">Cart Total:</span>
            <span className="font-bold text-[#007abf]">${cartTotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Shipping Address */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              <MapPin className="w-4 h-4 inline mr-1" />
              Shipping Address *
            </label>
            <textarea
              required
              rows={3}
              value={formData.shipping_address}
              onChange={(e) => setFormData({ ...formData, shipping_address: e.target.value })}
              placeholder="Enter complete shipping address including street, city, state, ZIP code"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#007abf] focus:border-transparent"
              data-testid="shipping-address-input"
            />
          </div>

          {/* Delivery Attention */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              <User className="w-4 h-4 inline mr-1" />
              Delivery Attention *
            </label>
            <Input
              required
              value={formData.delivery_attention}
              onChange={(e) => setFormData({ ...formData, delivery_attention: e.target.value })}
              placeholder="Recipient name or department"
              data-testid="delivery-attention-input"
            />
          </div>

          {/* Requested Delivery Date */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              <Calendar className="w-4 h-4 inline mr-1" />
              Requested Delivery Date *
            </label>
            <Input
              required
              type="date"
              min={minimumDate}
              value={formData.requested_delivery_date}
              onChange={(e) => setFormData({ ...formData, requested_delivery_date: e.target.value })}
              data-testid="delivery-date-input"
            />
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Minimum 2 business weeks lead time required
            </p>
          </div>

          {/* Special Instructions */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Special Instructions (Optional)
            </label>
            <textarea
              rows={2}
              value={formData.special_instructions}
              onChange={(e) => setFormData({ ...formData, special_instructions: e.target.value })}
              placeholder="Any special delivery instructions or notes"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#007abf] focus:border-transparent"
            />
          </div>

          {/* Delivery Note */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm text-amber-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>
                <strong>Note:</strong> Infosys will confirm the promised delivery date once 
                we receive confirmation from our partners (Grainger, MOTION, etc.).
              </span>
            </p>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#e97300] hover:bg-[#d66900] text-white py-3 font-semibold"
            data-testid="transfer-to-coupa-btn"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Preparing Transfer...
              </>
            ) : (
              <>
                <Truck className="w-4 h-4 mr-2" />
                Transfer to Coupa
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

// ============================================
// CART SIDEBAR
// ============================================
const CartSidebar = ({ 
  isOpen, 
  onClose, 
  items, 
  onRemoveItem, 
  onUpdateQuantity, 
  onProceedToCheckout,
  punchoutMode 
}) => {
  const total = items.reduce(
    (sum, item) => sum + (item.danone_preferred_price || item.list_price || 0) * item.quantity,
    0
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div 
        className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#007abf] to-[#00a9e0] p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-6 h-6" />
              <span className="font-bold text-lg">Your Cart</span>
              <Badge className="bg-white/20">{items.length} items</Badge>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-white/20 rounded">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p>Your cart is empty</p>
            </div>
          ) : (
            items.map((item, index) => (
              <div key={index} className="bg-slate-50 rounded-lg p-3">
                <div className="flex gap-3">
                  {/* Image */}
                  <div className="w-16 h-16 flex-shrink-0 bg-white rounded border">
                    {item.primary_image ? (
                      <img src={item.primary_image} alt="" className="w-full h-full object-contain" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-8 h-8 text-slate-300" />
                      </div>
                    )}
                  </div>
                  
                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 line-clamp-2">
                      {item.product_name}
                    </p>
                    <p className="text-xs text-slate-500 font-mono mt-1">
                      {item.infoshop_part_number}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onUpdateQuantity(index, Math.max(1, item.quantity - 1))}
                          className="w-6 h-6 rounded bg-white border text-slate-600 hover:bg-slate-100"
                        >
                          -
                        </button>
                        <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => onUpdateQuantity(index, item.quantity + 1)}
                          className="w-6 h-6 rounded bg-white border text-slate-600 hover:bg-slate-100"
                        >
                          +
                        </button>
                      </div>
                      <span className="font-bold text-[#007abf]">
                        ${((item.danone_preferred_price || item.list_price) * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Remove */}
                  <button
                    onClick={() => onRemoveItem(index)}
                    className="text-slate-400 hover:text-red-500"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t p-4 bg-white">
            <div className="flex justify-between items-center mb-4">
              <span className="text-slate-600">Total:</span>
              <span className="text-2xl font-bold text-[#007abf]">${total.toFixed(2)}</span>
            </div>
            <Button
              onClick={onProceedToCheckout}
              className="w-full bg-[#e97300] hover:bg-[#d66900] text-white py-3 font-semibold"
              data-testid="proceed-to-checkout-btn"
            >
              <Truck className="w-4 h-4 mr-2" />
              {punchoutMode ? "Proceed to Transfer" : "Proceed to Checkout"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// MAIN INFOSHOP CATALOG COMPONENT
// ============================================
const InfoShopCatalog = ({ punchoutSessionData, onBackToLanding }) => {
  // State
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [totalHits, setTotalHits] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  
  // Filters
  const [selectedPartner, setSelectedPartner] = useState("ALL");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [sortBy, setSortBy] = useState("relevance");
  
  // Partner data
  const [activePartners, setActivePartners] = useState(["Grainger", "MOTION"]);
  const [comingSoonPartners, setComingSoonPartners] = useState({});
  
  // Cart
  const [cartItems, setCartItems] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [showShippingForm, setShowShippingForm] = useState(false);
  const [minimumDeliveryDate, setMinimumDeliveryDate] = useState("");
  
  // PunchOut
  const [punchoutMode, setPunchoutMode] = useState(false);
  const [punchoutSession, setPunchoutSession] = useState(null);
  
  // Stats
  const [catalogStats, setCatalogStats] = useState(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch partners on mount
  useEffect(() => {
    const fetchPartners = async () => {
      try {
        const response = await axios.get(`${API}/api/infoshop/partners`);
        setActivePartners(response.data.active_partners || ["Grainger", "MOTION"]);
        setComingSoonPartners(response.data.coming_soon_partners || {});
      } catch (error) {
        console.error("Failed to fetch partners:", error);
      }
    };
    fetchPartners();
  }, []);

  // Fetch minimum delivery date
  useEffect(() => {
    const fetchMinDate = async () => {
      try {
        const response = await axios.get(`${API}/api/infoshop/delivery/minimum-date`);
        setMinimumDeliveryDate(response.data.minimum_delivery_date);
      } catch (error) {
        // Fallback: calculate locally (2 weeks from now)
        const date = new Date();
        date.setDate(date.getDate() + 14);
        setMinimumDeliveryDate(date.toISOString().split("T")[0]);
      }
    };
    fetchMinDate();
  }, []);

  // Check for PunchOut session - from props or URL
  useEffect(() => {
    // Check if coming from App.js with punchout session data
    if (punchoutSessionData?.token) {
      setPunchoutMode(true);
      setPunchoutSession(punchoutSessionData);
      
      // Verify session with backend
      axios.get(`${API}/api/punchout/session/${punchoutSessionData.token}`)
        .then((res) => {
          setPunchoutSession({ ...punchoutSessionData, ...res.data });
        })
        .catch((err) => {
          console.error("PunchOut session verification:", err);
          // Still keep punchout mode active - session might be new
        });
      return;
    }
    
    // Fallback: Check URL params directly
    const params = new URLSearchParams(window.location.search);
    const sessionToken = params.get("punchout_session") || params.get("session");
    
    if (sessionToken) {
      setPunchoutMode(true);
      setPunchoutSession({ token: sessionToken });
      
      // Verify session
      axios.get(`${API}/api/punchout/session/${sessionToken}`)
        .then((res) => {
          setPunchoutSession(res.data);
        })
        .catch((err) => {
          console.error("PunchOut session invalid:", err);
        });
    }
  }, [punchoutSessionData]);

  // Search products
  const searchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const filters = {};
      if (selectedPartner !== "ALL") filters.supplier = selectedPartner;
      if (selectedCategory) filters.category = selectedCategory;
      if (selectedBrand) filters.brand = selectedBrand;

      const response = await axios.post(`${API}/api/algolia/catalog/search`, {
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
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Failed to search products");
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, currentPage, selectedPartner, selectedCategory, selectedBrand, sortBy]);

  // Fetch on search change
  useEffect(() => {
    searchProducts();
  }, [searchProducts]);

  // Fetch stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get(`${API}/api/algolia/catalog/public-stats`);
        setCatalogStats(response.data);
      } catch (error) {
        console.error("Stats error:", error);
      }
    };
    fetchStats();
  }, []);

  // Add to cart
  const handleAddToCart = (product) => {
    const existingIndex = cartItems.findIndex(
      (item) => item.infoshop_part_number === product.infoshop_part_number
    );

    if (existingIndex >= 0) {
      const updated = [...cartItems];
      updated[existingIndex].quantity += 1;
      setCartItems(updated);
    } else {
      setCartItems([...cartItems, { ...product, quantity: 1 }]);
    }

    toast.success(`Added to cart: ${product.product_name.substring(0, 40)}...`);
  };

  // Remove from cart
  const handleRemoveFromCart = (index) => {
    const updated = [...cartItems];
    updated.splice(index, 1);
    setCartItems(updated);
  };

  // Update quantity
  const handleUpdateQuantity = (index, newQuantity) => {
    const updated = [...cartItems];
    updated[index].quantity = newQuantity;
    setCartItems(updated);
  };

  // Proceed to checkout
  const handleProceedToCheckout = () => {
    setCartOpen(false);
    setShowShippingForm(true);
  };

  // Submit shipping and transfer
  const handleShippingSubmit = async (shippingData) => {
    try {
      // Prepare cart transfer
      const response = await axios.post(`${API}/api/infoshop/cart/prepare-transfer`, {
        session_token: punchoutSession?.token || "direct-purchase",
        items: cartItems,
        shipping_info: shippingData,
      });

      if (response.data.success) {
        toast.success("Cart prepared for transfer!");
        
        if (punchoutMode && punchoutSession?.browser_form_post_url) {
          // Generate cXML and submit to Coupa
          const orderResponse = await axios.post(`${API}/api/punchout/order`, {
            session_token: punchoutSession.token,
            items: cartItems.map((item) => ({
              supplier_part_id: item.infoshop_part_number,
              quantity: item.quantity,
              unit_price: item.danone_preferred_price || item.list_price,
              uom: item.uom || "EA",
              description: item.product_name,
              classification: item.unspsc_code,
              manufacturer_name: item.brand,
              manufacturer_part_id: item.mfg_part_number,
            })),
          });

          // In a real implementation, this would POST to Coupa
          toast.success("Transferring to Coupa...");
          console.log("Order cXML:", orderResponse.data);
        }
        
        setShowShippingForm(false);
        setCartItems([]);
      }
    } catch (error) {
      console.error("Transfer error:", error);
      toast.error(error.response?.data?.detail || "Failed to prepare transfer");
    }
  };

  const cartTotal = cartItems.reduce(
    (sum, item) => sum + (item.danone_preferred_price || item.list_price || 0) * item.quantity,
    0
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <Toaster position="top-right" richColors />

      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
        {/* PunchOut Banner */}
        {punchoutMode && (
          <div className="bg-gradient-to-r from-[#007abf] to-[#00a9e0] text-white py-2 px-4">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                <span className="font-medium">PunchOut Session Active</span>
                {punchoutSession?.buyer_name && (
                  <Badge className="bg-white/20">{punchoutSession.buyer_name}</Badge>
                )}
              </div>
              <span className="text-sm text-blue-100">
                Connected to Coupa • Session secure
              </span>
            </div>
          </div>
        )}

        {/* Main Header */}
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="bg-[#007abf] text-white px-4 py-2 rounded-lg font-bold text-xl">
                InfoShop
              </div>
              <div className="hidden sm:block">
                <p className="text-xs text-slate-500">Powered by</p>
                <p className="text-sm font-bold text-[#007abf]">Infosys BPM</p>
              </div>
            </div>

            {/* Search */}
            <div className="flex-1 max-w-2xl">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search millions of industrial products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border-slate-300 focus:ring-[#007abf]"
                  data-testid="search-input"
                />
              </div>
            </div>

            {/* Cart */}
            <Button
              variant="outline"
              className="relative"
              onClick={() => setCartOpen(true)}
              data-testid="cart-button"
            >
              <ShoppingCart className="w-5 h-5" />
              {cartItems.length > 0 && (
                <Badge className="absolute -top-2 -right-2 bg-[#e97300] text-white text-xs px-1.5">
                  {cartItems.length}
                </Badge>
              )}
            </Button>
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-3 mt-4">
            {/* Partner Selector */}
            <div className="w-48">
              <PartnerSelector
                selectedPartner={selectedPartner}
                onSelectPartner={setSelectedPartner}
                partners={activePartners}
                comingSoon={comingSoonPartners}
              />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm"
              data-testid="category-filter"
            >
              <option value="">All Categories</option>
              {catalogStats?.top_categories?.map((cat) => (
                <option key={cat.name} value={cat.name}>
                  {cat.name} ({cat.count})
                </option>
              ))}
            </select>

            {/* Brand Filter */}
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm"
              data-testid="brand-filter"
            >
              <option value="">All Brands</option>
              {catalogStats?.top_brands?.map((brand) => (
                <option key={brand.name} value={brand.name}>
                  {brand.name} ({brand.count})
                </option>
              ))}
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm"
            >
              <option value="relevance">Sort: Relevance</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>

            {/* Results Count */}
            <div className="ml-auto text-sm text-slate-600">
              <span className="font-semibold text-[#007abf]">{totalHits.toLocaleString()}</span> products
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-[#007abf]" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <Package className="w-20 h-20 mx-auto text-slate-300 mb-4" />
            <h2 className="text-xl font-semibold text-slate-600">No products found</h2>
            <p className="text-slate-500 mt-2">Try adjusting your search or filters</p>
          </div>
        ) : (
          <>
            {/* Products Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <ProductCard
                  key={product.objectID || product.infoshop_part_number}
                  product={product}
                  onAddToCart={handleAddToCart}
                  punchoutMode={punchoutMode}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-8">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                <span className="text-sm text-slate-600">
                  Page <strong>{currentPage + 1}</strong> of <strong>{totalPages}</strong>
                </span>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={currentPage >= totalPages - 1}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-800 text-white py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-[#007abf] px-3 py-1 rounded font-bold">InfoShop</div>
                <span className="text-slate-400">by Infosys BPM</span>
              </div>
              <p className="text-sm text-slate-400">
                Enterprise B2B Catalog • PunchOut Enabled • {totalHits.toLocaleString()}+ Products
              </p>
            </div>
            <div className="text-right text-sm text-slate-400">
              <p>© {new Date().getFullYear()} Infosys Limited</p>
              <p>All rights reserved</p>
            </div>
          </div>
        </div>
      </footer>

      {/* Cart Sidebar */}
      <CartSidebar
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cartItems}
        onRemoveItem={handleRemoveFromCart}
        onUpdateQuantity={handleUpdateQuantity}
        onProceedToCheckout={handleProceedToCheckout}
        punchoutMode={punchoutMode}
      />

      {/* Shipping Form Modal */}
      <ShippingFormModal
        isOpen={showShippingForm}
        onClose={() => setShowShippingForm(false)}
        onSubmit={handleShippingSubmit}
        minimumDate={minimumDeliveryDate}
        cartTotal={cartTotal}
        itemCount={cartItems.length}
      />
    </div>
  );
};

export default InfoShopCatalog;

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, API } from "../App";
import { useLanguage } from "../i18n/LanguageContext";
import axios from "axios";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../components/ui/dialog";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { toast } from "sonner";
import {
  Package, History, Clock, CheckCircle, Truck, XCircle, FileText,
  ChevronRight, Calendar, ShoppingCart, Zap, AlertCircle, MessageSquare, ExternalLink
} from "lucide-react";
import Sidebar from "../components/Sidebar";

const OrderHistoryPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("orders");
  const [orders, setOrders] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [rfqs, setRfqs] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  
  // Cancel modal
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [itemToCancel, setItemToCancel] = useState(null);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [ordersRes, quotationsRes, rfqsRes, transfersRes] = await Promise.all([
        axios.get(`${API}/orders/history`),
        axios.get(`${API}/quotation/list`),
        axios.get(`${API}/rfq/list`),
        axios.get(`${API}/cart/transfers`)
      ]);
      
      setOrders(ordersRes.data.orders || []);
      setQuotations(quotationsRes.data.quotations || []);
      setRfqs(rfqsRes.data.rfqs || []);
      setTransfers(transfersRes.data.transfers || []);
    } catch (error) {
      console.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const addQuotationToCart = async (quotation) => {
    if (!quotation.response) return;
    
    try {
      const cartItem = {
        product_id: quotation.id,
        product_name: quotation.product_name,
        brand: quotation.response.supplier,
        sku: quotation.id,
        unspsc_code: "00000000",
        category: "Quoted Item",
        quantity: quotation.quantity,
        unit_price: quotation.response.unit_price,
        total_price: quotation.response.unit_price * quotation.quantity,
        currency_code: user?.currency?.code || "USD",
        is_service: false
      };
      
      await axios.post(`${API}/cart/add`, cartItem);
      toast.success("Added to cart from quotation!");
    } catch (error) {
      toast.error("Failed to add to cart");
    }
  };

  const cancelQuotation = async () => {
    if (!itemToCancel) return;
    
    try {
      await axios.post(`${API}/quotation/${itemToCancel.id}/respond`, {
        quotation_id: itemToCancel.id,
        action: "cancel",
        cancel_reason: cancelReason
      });
      toast.success("Quotation cancelled");
      setCancelModalOpen(false);
      setCancelReason("");
      setItemToCancel(null);
      fetchAllData();
    } catch (error) {
      toast.error("Failed to cancel quotation");
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      pending: { class: "bg-amber-100 text-amber-700", icon: Clock },
      confirmed: { class: "bg-blue-100 text-blue-700", icon: CheckCircle },
      shipped: { class: "bg-purple-100 text-purple-700", icon: Truck },
      delivered: { class: "bg-green-100 text-green-700", icon: CheckCircle },
      cancelled: { class: "bg-red-100 text-red-700", icon: XCircle },
      submitted: { class: "bg-blue-100 text-blue-700", icon: FileText },
      response_received: { class: "bg-green-100 text-green-700", icon: CheckCircle },
      accepted: { class: "bg-green-100 text-green-700", icon: CheckCircle },
      "Pending Customer PO": { class: "bg-amber-100 text-amber-700", icon: Clock },
    };
    const c = config[status] || config.pending;
    const Icon = c.icon;
    return (
      <Badge className={`${c.class} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </Badge>
    );
  };

  // Generate sample data if empty
  useEffect(() => {
    if (!loading && orders.length === 0) {
      const sampleOrders = [
        { id: "ORD-A7B2C9", items: [{ product_name: "SKF Ball Bearing 6205-2RS", quantity: 10, unit_price: 45.00, total_price: 450.00 },
          { product_name: "3M Industrial Safety Helmet", quantity: 5, unit_price: 35.00, total_price: 175.00 }],
          total_amount: 625.00, currency_code: user?.currency?.code || "USD", status: "delivered",
          created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          estimated_delivery: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
        { id: "ORD-D4E5F6", items: [{ product_name: "Bosch Professional Cordless Drill", quantity: 2, unit_price: 189.00, total_price: 378.00 }],
          total_amount: 378.00, currency_code: user?.currency?.code || "USD", status: "shipped",
          created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          estimated_delivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString() },
      ];
      setOrders(sampleOrders);
    }
    
    if (!loading && transfers.length === 0) {
      const sampleTransfers = [
        { id: "TRF-001", system: "Coupa", system_logo: "https://logo.clearbit.com/coupa.com",
          items: [{ product_name: "Parker Hydraulic Valve", quantity: 3 }], total_amount: 1650.00,
          status: "Pending Customer PO", transferred_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
        { id: "TRF-002", system: "SAP Ariba", system_logo: "https://logo.clearbit.com/ariba.com",
          items: [{ product_name: "Siemens Motor Drive", quantity: 1 }], total_amount: 2450.00,
          status: "Pending Customer PO", transferred_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString() },
      ];
      setTransfers(sampleTransfers);
    }
  }, [loading]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      <Sidebar activePage="orders" />

      <main className="flex-1 p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>{t.orders.title}</h1>
            <p className="text-slate-500 mt-1">{t.orders.subtitle}</p>
          </div>
          <Button onClick={() => navigate("/catalog")} className="bg-[#007CC3] hover:bg-[#00629B]" data-testid="new-order-btn">
            <Package className="w-4 h-4 mr-2" />
            {t.nav.catalog}
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-slate-100 p-1 rounded-xl mb-6">
            <TabsTrigger value="orders" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-white">
              <History className="w-4 h-4 mr-2" />
              {t.orders.tabs.orders}
            </TabsTrigger>
            <TabsTrigger value="transfers" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-white">
              <ExternalLink className="w-4 h-4 mr-2" />
              {t.orders.tabs.transfers}
            </TabsTrigger>
            <TabsTrigger value="quotations" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-white">
              <Zap className="w-4 h-4 mr-2" />
              {t.orders.tabs.quotations}
              {quotations.filter(q => q.status === 'response_received').length > 0 && (
                <Badge className="ml-2 bg-green-100 text-green-700">{quotations.filter(q => q.status === 'response_received').length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="rfqs" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-white">
              <FileText className="w-4 h-4 mr-2" />
              {t.orders.tabs.rfqs}
              {rfqs.filter(r => r.status === 'response_received').length > 0 && (
                <Badge className="ml-2 bg-green-100 text-green-700">{rfqs.filter(r => r.status === 'response_received').length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Orders Tab */}
          <TabsContent value="orders">
            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-white rounded-xl p-6 h-24 animate-pulse">
                    <div className="bg-slate-200 h-4 rounded w-1/4 mb-2"></div>
                    <div className="bg-slate-200 h-4 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : orders.length === 0 ? (
              <Card className="text-center py-16">
                <CardContent>
                  <History className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-slate-700 mb-2">No Orders Yet</h3>
                  <p className="text-slate-500 mb-6">Start shopping to see your order history</p>
                  <Button onClick={() => navigate("/catalog")} className="bg-[#007CC3] hover:bg-[#00629B]">Browse Catalog</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <Card key={order.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)} data-testid={`order-card-${order.id}`}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-[#007CC3]/10 rounded-xl flex items-center justify-center">
                            <Package className="w-6 h-6 text-[#007CC3]" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 font-mono">{order.id}</p>
                            <p className="text-sm text-slate-500">{new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg text-slate-900">{user?.currency?.symbol || '$'}{order.total_amount?.toFixed(2)}</p>
                          <p className="text-sm text-slate-500">{order.items?.length || 0} items</p>
                        </div>
                        {getStatusBadge(order.status)}
                        <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${selectedOrder?.id === order.id ? 'rotate-90' : ''}`} />
                      </div>

                      {selectedOrder?.id === order.id && (
                        <div className="mt-6 pt-6 border-t animate-in slide-in-from-top-2">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Product</TableHead>
                                <TableHead className="text-right">Qty</TableHead>
                                <TableHead className="text-right">Unit Price</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {order.items?.map((item, idx) => (
                                <TableRow key={idx}>
                                  <TableCell className="font-medium">{item.product_name}</TableCell>
                                  <TableCell className="text-right">{item.quantity}</TableCell>
                                  <TableCell className="text-right">{user?.currency?.symbol || '$'}{item.unit_price?.toFixed(2)}</TableCell>
                                  <TableCell className="text-right font-semibold">{user?.currency?.symbol || '$'}{item.total_price?.toFixed(2)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* PunchOut Transfers Tab */}
          <TabsContent value="transfers">
            {transfers.length === 0 ? (
              <Card className="text-center py-16">
                <CardContent>
                  <ExternalLink className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-slate-700 mb-2">No Transfers Yet</h3>
                  <p className="text-slate-500">PunchOut transfers will appear here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {transfers.map((transfer) => (
                  <Card key={transfer.id} className="hover:shadow-lg transition-shadow" data-testid={`transfer-card-${transfer.id}`}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <img src={transfer.system_logo} alt={transfer.system} className="w-10 h-10 object-contain" onError={(e) => e.target.style.display = 'none'} />
                          <div>
                            <p className="font-semibold text-slate-900">{transfer.system}</p>
                            <p className="text-sm text-slate-500 font-mono">{transfer.id}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg text-slate-900">{user?.currency?.symbol || '$'}{transfer.total_amount?.toFixed(2)}</p>
                          <p className="text-sm text-slate-500">{transfer.items?.length || 0} items</p>
                        </div>
                        {getStatusBadge(transfer.status)}
                        <div className="text-sm text-slate-500">
                          {new Date(transfer.transferred_at).toLocaleString()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Quotations Tab */}
          <TabsContent value="quotations">
            {quotations.length === 0 ? (
              <Card className="text-center py-16">
                <CardContent>
                  <Zap className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-slate-700 mb-2">No Quotation Requests</h3>
                  <p className="text-slate-500">Request instant quotations from the catalog</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {quotations.map((q) => (
                  <Card key={q.id} className={`hover:shadow-lg transition-shadow ${q.status === 'response_received' ? 'border-l-4 border-l-green-500' : ''}`} data-testid={`quotation-card-${q.id}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <p className="font-mono text-sm text-slate-500">{q.id}</p>
                            {getStatusBadge(q.status)}
                          </div>
                          <h4 className="font-semibold text-slate-900 mb-1">{q.product_name}</h4>
                          <p className="text-sm text-slate-500">Quantity: {q.quantity}</p>
                          <p className="text-xs text-slate-400 mt-1">{new Date(q.created_at).toLocaleDateString()}</p>
                        </div>
                        
                        {q.status === 'response_received' && q.response && (
                          <div className="bg-green-50 p-4 rounded-xl border border-green-200 ml-4">
                            <p className="text-xs text-green-600 font-medium mb-2">QUOTE RECEIVED</p>
                            <p className="text-sm text-slate-600">Supplier: <strong>{q.response.supplier}</strong></p>
                            <p className="text-2xl font-bold text-green-700 my-2">
                              {user?.currency?.symbol || '$'}{q.response.unit_price?.toFixed(2)}
                              <span className="text-sm font-normal text-slate-500">/unit</span>
                            </p>
                            <p className="text-sm text-slate-600">Lead time: {q.response.lead_time} days</p>
                            <p className="text-xs text-slate-400 mt-2">Valid until: {new Date(q.response.valid_until).toLocaleDateString()}</p>
                            
                            <div className="flex gap-2 mt-4">
                              <Button size="sm" className="bg-[#007CC3] hover:bg-[#00629B]" onClick={() => addQuotationToCart(q)} data-testid="add-quote-to-cart">
                                <ShoppingCart className="w-3 h-3 mr-1" />
                                Add to Cart
                              </Button>
                              <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => { setItemToCancel(q); setCancelModalOpen(true); }}>
                                <XCircle className="w-3 h-3 mr-1" />
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                        
                        {q.status === 'pending' && (
                          <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 ml-4">
                            <AlertCircle className="w-6 h-6 text-amber-500 mb-2" />
                            <p className="text-sm text-amber-700">Awaiting response from suppliers</p>
                            <p className="text-xs text-amber-600 mt-1">Expected within 4-8 hours</p>
                          </div>
                        )}
                        
                        {q.status === 'cancelled' && (
                          <div className="bg-red-50 p-4 rounded-xl border border-red-200 ml-4">
                            <XCircle className="w-6 h-6 text-red-500 mb-2" />
                            <p className="text-sm text-red-700">Cancelled</p>
                            {q.cancel_reason && <p className="text-xs text-red-600 mt-1">{q.cancel_reason}</p>}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* RFQs Tab */}
          <TabsContent value="rfqs">
            {rfqs.length === 0 ? (
              <Card className="text-center py-16">
                <CardContent>
                  <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-slate-700 mb-2">No RFQ Submissions</h3>
                  <p className="text-slate-500">Submit free text RFQs from the catalog</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {rfqs.map((rfq) => (
                  <Card key={rfq.id} className={`hover:shadow-lg transition-shadow ${rfq.status === 'response_received' ? 'border-l-4 border-l-green-500' : ''}`} data-testid={`rfq-card-${rfq.id}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <p className="font-mono text-sm text-slate-500">{rfq.id}</p>
                            {getStatusBadge(rfq.status)}
                          </div>
                          <h4 className="font-semibold text-slate-900 mb-1">{rfq.product_description}</h4>
                          <p className="text-sm text-slate-500">Quantity: {rfq.quantity}</p>
                          <p className="text-xs text-slate-400 mt-1">{new Date(rfq.created_at).toLocaleDateString()}</p>
                        </div>
                        
                        {rfq.status === 'response_received' && rfq.response && (
                          <div className="bg-green-50 p-4 rounded-xl border border-green-200 ml-4">
                            <p className="text-xs text-green-600 font-medium mb-2">RESPONSE RECEIVED</p>
                            <p className="text-sm text-slate-600">Supplier: <strong>{rfq.response.supplier}</strong></p>
                            <p className="text-2xl font-bold text-green-700 my-2">
                              {user?.currency?.symbol || '$'}{rfq.response.unit_price?.toFixed(2)}
                              <span className="text-sm font-normal text-slate-500">/unit</span>
                            </p>
                            <p className="text-sm text-slate-600">Lead time: {rfq.response.lead_time} days</p>
                            
                            <Button size="sm" className="mt-4 bg-[#007CC3] hover:bg-[#00629B]">
                              <ShoppingCart className="w-3 h-3 mr-1" />
                              Accept & Add to Cart
                            </Button>
                          </div>
                        )}
                        
                        {rfq.status === 'pending' && (
                          <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 ml-4">
                            <AlertCircle className="w-6 h-6 text-amber-500 mb-2" />
                            <p className="text-sm text-amber-700">Awaiting supplier responses</p>
                            <p className="text-xs text-amber-600 mt-1">Expected within 24-48 hours</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Cancel Modal */}
      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Quotation</DialogTitle>
            <DialogDescription>Please provide a reason for cancellation</DialogDescription>
          </DialogHeader>
          <div className="my-4">
            <Label>Reason (optional)</Label>
            <Textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="e.g., Found alternative supplier, No longer needed..." className="mt-2" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelModalOpen(false)}>Keep Quotation</Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={cancelQuotation}>Cancel Quotation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrderHistoryPage;

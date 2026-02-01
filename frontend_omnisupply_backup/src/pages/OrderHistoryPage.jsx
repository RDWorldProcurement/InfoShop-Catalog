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
      pending: { class: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock, label: "Pending" },
      confirmed: { class: "bg-blue-100 text-blue-700 border-blue-200", icon: CheckCircle, label: "Confirmed" },
      processing: { class: "bg-indigo-100 text-indigo-700 border-indigo-200", icon: Package, label: "Processing" },
      shipped: { class: "bg-purple-100 text-purple-700 border-purple-200", icon: Truck, label: "Shipped" },
      delivered: { class: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle, label: "Delivered" },
      cancelled: { class: "bg-red-100 text-red-700 border-red-200", icon: XCircle, label: "Cancelled" },
      submitted: { class: "bg-blue-100 text-blue-700 border-blue-200", icon: FileText, label: "Submitted" },
      response_received: { class: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle, label: "Response Received" },
      accepted: { class: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle, label: "Accepted" },
      "Pending Customer PO": { class: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock, label: "Pending Customer PO" },
    };
    const c = config[status] || config.pending;
    const Icon = c.icon;
    return (
      <Badge className={`${c.class} flex items-center gap-1 border`}>
        <Icon className="w-3 h-3" />
        {c.label || status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </Badge>
    );
  };

  // Order status timeline component
  const OrderStatusTimeline = ({ status }) => {
    const statuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
    const currentIndex = statuses.indexOf(status);
    
    return (
      <div className="flex items-center justify-between w-full mt-4 px-2">
        {statuses.map((s, index) => {
          const isCompleted = index <= currentIndex;
          const isCurrent = index === currentIndex;
          return (
            <div key={s} className="flex flex-col items-center relative flex-1">
              {index > 0 && (
                <div className={`absolute left-0 right-1/2 top-3 h-0.5 -translate-y-1/2 ${index <= currentIndex ? 'bg-[#007CC3]' : 'bg-slate-200'}`} style={{ left: '-50%', right: '50%' }} />
              )}
              <div className={`w-6 h-6 rounded-full flex items-center justify-center z-10 ${isCompleted ? 'bg-[#007CC3] text-white' : 'bg-slate-200 text-slate-400'} ${isCurrent ? 'ring-2 ring-[#007CC3] ring-offset-2' : ''}`}>
                {isCompleted ? <CheckCircle className="w-4 h-4" /> : <span className="text-xs">{index + 1}</span>}
              </div>
              <span className={`text-xs mt-1 capitalize ${isCurrent ? 'text-[#007CC3] font-semibold' : 'text-slate-400'}`}>{s}</span>
            </div>
          );
        })}
      </div>
    );
  };

  // Remove the sample data effect since backend now provides it

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
                  <h3 className="text-xl font-semibold text-slate-700 mb-2">{t.orders.noOrders}</h3>
                  <p className="text-slate-500 mb-6">Start shopping to see your order history</p>
                  <Button onClick={() => navigate("/catalog")} className="bg-[#007CC3] hover:bg-[#00629B]">{t.nav.catalog}</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <Card key={order.id} className={`hover:shadow-lg transition-shadow cursor-pointer ${order.status === 'delivered' ? 'border-l-4 border-l-green-500' : order.status === 'shipped' ? 'border-l-4 border-l-purple-500' : ''}`} onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)} data-testid={`order-card-${order.id}`}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            order.status === 'delivered' ? 'bg-green-100' : 
                            order.status === 'shipped' ? 'bg-purple-100' : 
                            order.status === 'processing' ? 'bg-indigo-100' :
                            order.status === 'confirmed' ? 'bg-blue-100' : 'bg-amber-100'
                          }`}>
                            {order.status === 'delivered' ? <CheckCircle className="w-6 h-6 text-green-600" /> :
                             order.status === 'shipped' ? <Truck className="w-6 h-6 text-purple-600" /> :
                             order.status === 'processing' ? <Package className="w-6 h-6 text-indigo-600" /> :
                             order.status === 'confirmed' ? <CheckCircle className="w-6 h-6 text-blue-600" /> :
                             <Clock className="w-6 h-6 text-amber-600" />}
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
                        <div className="flex flex-col items-end gap-1">
                          {getStatusBadge(order.status)}
                          {order.status_description && (
                            <span className="text-xs text-slate-500">{order.status_description}</span>
                          )}
                        </div>
                        <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${selectedOrder?.id === order.id ? 'rotate-90' : ''}`} />
                      </div>

                      {/* Tracking Info for Shipped Orders */}
                      {order.tracking_number && (
                        <div className="mt-3 p-3 bg-purple-50 rounded-lg flex items-center gap-3">
                          <Truck className="w-5 h-5 text-purple-600" />
                          <div>
                            <p className="text-sm font-medium text-purple-800">{order.carrier || 'Carrier'}</p>
                            <p className="text-xs text-purple-600 font-mono">{order.tracking_number}</p>
                          </div>
                          {order.estimated_delivery && order.status !== 'delivered' && (
                            <div className="ml-auto text-right">
                              <p className="text-xs text-purple-600">Est. Delivery</p>
                              <p className="text-sm font-medium text-purple-800">{new Date(order.estimated_delivery).toLocaleDateString()}</p>
                            </div>
                          )}
                          {order.status === 'delivered' && order.signed_by && (
                            <div className="ml-auto text-right">
                              <p className="text-xs text-green-600">Signed by</p>
                              <p className="text-sm font-medium text-green-800">{order.signed_by}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {selectedOrder?.id === order.id && (
                        <div className="mt-6 pt-6 border-t animate-in slide-in-from-top-2">
                          {/* Status Timeline */}
                          <OrderStatusTimeline status={order.status} />
                          
                          {/* Items Table */}
                          <div className="mt-6">
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
                                    <TableCell>
                                      <div className="flex items-center gap-3">
                                        {item.image_url && (
                                          <img src={item.image_url} alt="" className="w-10 h-10 object-contain rounded bg-slate-50" onError={(e) => e.target.style.display = 'none'} />
                                        )}
                                        <span className="font-medium">{item.product_name}</span>
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-right">{item.quantity}</TableCell>
                                    <TableCell className="text-right">{user?.currency?.symbol || '$'}{item.unit_price?.toFixed(2)}</TableCell>
                                    <TableCell className="text-right font-semibold">{user?.currency?.symbol || '$'}{item.total_price?.toFixed(2)}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>

                          {/* Order Summary */}
                          <div className="mt-4 p-4 bg-slate-50 rounded-lg flex justify-between items-center">
                            <div>
                              <p className="text-sm text-slate-500">Order placed on</p>
                              <p className="font-medium">{new Date(order.created_at).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-slate-500">Order Total</p>
                              <p className="text-xl font-bold text-[#007CC3]">{user?.currency?.symbol || '$'}{order.total_amount?.toFixed(2)}</p>
                            </div>
                          </div>
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

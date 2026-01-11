import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, API } from "../App";
import axios from "axios";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { toast } from "sonner";
import {
  Package, History, Clock, CheckCircle, Truck, XCircle,
  ChevronRight, ArrowLeft, Search, Filter, Calendar
} from "lucide-react";
import Sidebar from "../components/Sidebar";

const OrderHistoryPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${API}/orders/history`);
      setOrders(response.data.orders);
    } catch (error) {
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { class: "badge-warning", icon: Clock },
      confirmed: { class: "badge-info", icon: CheckCircle },
      shipped: { class: "badge-success", icon: Truck },
      delivered: { class: "badge-success", icon: CheckCircle },
      cancelled: { class: "badge-error", icon: XCircle }
    };
    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;
    return (
      <span className={`${config.class} inline-flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  // Generate sample orders if none exist
  useEffect(() => {
    if (!loading && orders.length === 0) {
      const sampleOrders = [
        {
          id: "ORD-001",
          items: [
            { product_name: "SKF Ball Bearing 6205", quantity: 10, unit_price: 45.00, total_price: 450.00 },
            { product_name: "3M Safety Helmet", quantity: 5, unit_price: 35.00, total_price: 175.00 }
          ],
          total_amount: 625.00,
          currency_code: user?.currency?.code || "USD",
          status: "delivered",
          created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          estimated_delivery: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: "ORD-002",
          items: [
            { product_name: "Bosch Cordless Drill", quantity: 2, unit_price: 189.00, total_price: 378.00 }
          ],
          total_amount: 378.00,
          currency_code: user?.currency?.code || "USD",
          status: "shipped",
          created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          estimated_delivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: "ORD-003",
          items: [
            { product_name: "Parker Hydraulic Valve", quantity: 1, unit_price: 550.00, total_price: 550.00 },
            { product_name: "Henkel Loctite 243", quantity: 20, unit_price: 12.00, total_price: 240.00 }
          ],
          total_amount: 790.00,
          currency_code: user?.currency?.code || "USD",
          status: "confirmed",
          created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          estimated_delivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];
      setOrders(sampleOrders);
    }
  }, [loading, orders.length, user]);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar activePage="orders" />

      <main className="flex-1 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
              Order History
            </h1>
            <p className="text-slate-500 mt-1">Track and manage your orders</p>
          </div>
          <Button 
            onClick={() => navigate("/catalog")}
            className="bg-[#007CC3] hover:bg-[#00629B]"
            data-testid="new-order-btn"
          >
            <Package className="w-4 h-4 mr-2" />
            New Order
          </Button>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg p-6 h-24">
                <div className="skeleton h-4 rounded w-1/4 mb-2"></div>
                <div className="skeleton h-4 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <History className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-700 mb-2">No Orders Yet</h3>
              <p className="text-slate-500 mb-6">Start shopping to see your order history here</p>
              <Button 
                onClick={() => navigate("/catalog")}
                className="bg-[#007CC3] hover:bg-[#00629B]"
              >
                Browse Catalog
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card 
                key={order.id} 
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
                data-testid={`order-card-${order.id}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-[#007CC3]/10 rounded-xl flex items-center justify-center">
                        <Package className="w-6 h-6 text-[#007CC3]" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 font-mono">{order.id}</p>
                        <p className="text-sm text-slate-500">
                          {new Date(order.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg text-slate-900">
                        {user?.currency?.symbol || '$'}{order.total_amount?.toFixed(2)}
                      </p>
                      <p className="text-sm text-slate-500">{order.items?.length || 0} items</p>
                    </div>
                    <div className="text-center">
                      {getStatusBadge(order.status)}
                    </div>
                    <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${selectedOrder?.id === order.id ? 'rotate-90' : ''}`} />
                  </div>

                  {/* Expanded Order Details */}
                  {selectedOrder?.id === order.id && (
                    <div className="mt-6 pt-6 border-t border-slate-200 animate-fade-in">
                      <Table>
                        <TableHeader>
                          <TableRow className="table-header">
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
                              <TableCell className="text-right">
                                {user?.currency?.symbol || '$'}{item.unit_price?.toFixed(2)}
                              </TableCell>
                              <TableCell className="text-right font-semibold">
                                {user?.currency?.symbol || '$'}{item.total_price?.toFixed(2)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      
                      <div className="mt-4 flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-slate-500">
                          <Calendar className="w-4 h-4" />
                          Est. Delivery: {order.estimated_delivery ? new Date(order.estimated_delivery).toLocaleDateString() : 'N/A'}
                        </div>
                        <Button variant="outline" size="sm" data-testid="track-order-btn">
                          <Truck className="w-4 h-4 mr-2" />
                          Track Order
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default OrderHistoryPage;

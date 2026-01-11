import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, API } from "../App";
import axios from "axios";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { toast } from "sonner";
import {
  RefreshCw, Plus, Calendar, Clock, Package, Trash2,
  CheckCircle, PauseCircle, PlayCircle
} from "lucide-react";
import Sidebar from "../components/Sidebar";

const RepeatOrdersPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [repeatOrders, setRepeatOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newOrder, setNewOrder] = useState({
    product_id: "",
    product_name: "",
    quantity: 1,
    frequency: "monthly"
  });

  useEffect(() => {
    fetchRepeatOrders();
  }, []);

  const fetchRepeatOrders = async () => {
    try {
      const response = await axios.get(`${API}/repeat-orders/list`);
      setRepeatOrders(response.data.repeat_orders);
    } catch (error) {
      toast.error("Failed to load repeat orders");
    } finally {
      setLoading(false);
    }
  };

  const cancelRepeatOrder = async (orderId) => {
    try {
      await axios.delete(`${API}/repeat-orders/${orderId}`);
      toast.success("Repeat order cancelled");
      fetchRepeatOrders();
    } catch (error) {
      toast.error("Failed to cancel repeat order");
    }
  };

  const createRepeatOrder = async () => {
    if (!newOrder.product_name || !newOrder.quantity) {
      toast.error("Please fill in all fields");
      return;
    }
    try {
      await axios.post(`${API}/repeat-orders/create`, null, {
        params: {
          product_id: newOrder.product_id || `PROD-${Date.now()}`,
          product_name: newOrder.product_name,
          quantity: newOrder.quantity,
          frequency: newOrder.frequency
        }
      });
      toast.success("Repeat order scheduled successfully!");
      setCreateModalOpen(false);
      setNewOrder({ product_id: "", product_name: "", quantity: 1, frequency: "monthly" });
      fetchRepeatOrders();
    } catch (error) {
      toast.error("Failed to create repeat order");
    }
  };

  // Sample data
  useEffect(() => {
    if (!loading && repeatOrders.length === 0) {
      const sampleOrders = [
        {
          id: "RPT-001",
          product_id: "SKF-BRG-001",
          product_name: "SKF Ball Bearing 6205-2RS",
          quantity: 50,
          frequency: "monthly",
          next_order_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
          is_active: true,
          created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: "RPT-002",
          product_id: "3M-TAPE-001",
          product_name: "3M Industrial Tape 2\"",
          quantity: 100,
          frequency: "weekly",
          next_order_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          is_active: true,
          created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: "RPT-003",
          product_id: "HNK-LUB-001",
          product_name: "Henkel Loctite 243 Thread Locker",
          quantity: 25,
          frequency: "quarterly",
          next_order_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
          is_active: true,
          created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];
      setRepeatOrders(sampleOrders);
    }
  }, [loading, repeatOrders.length]);

  const getFrequencyBadge = (frequency) => {
    const colors = {
      weekly: "bg-blue-100 text-blue-700",
      monthly: "bg-green-100 text-green-700",
      quarterly: "bg-purple-100 text-purple-700"
    };
    return (
      <Badge className={colors[frequency] || colors.monthly}>
        {frequency.charAt(0).toUpperCase() + frequency.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar activePage="repeat-orders" />

      <main className="flex-1 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
              Repeat Orders
            </h1>
            <p className="text-slate-500 mt-1">Schedule automatic reordering for products</p>
          </div>
          <Button 
            onClick={() => setCreateModalOpen(true)}
            className="bg-[#007CC3] hover:bg-[#00629B]"
            data-testid="create-repeat-order-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            Schedule Repeat Order
          </Button>
        </div>

        {/* Info Banner */}
        <Card className="mb-6 bg-[#007CC3]/5 border-[#007CC3]/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-[#007CC3]/10 rounded-full flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-[#007CC3]" />
            </div>
            <div>
              <p className="font-medium text-slate-900">Automate Your Procurement</p>
              <p className="text-sm text-slate-600">
                Set up weekly, monthly, or quarterly repeat orders and never run out of essential supplies.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Repeat Orders List */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg p-6 h-48">
                <div className="skeleton h-4 rounded w-3/4 mb-4"></div>
                <div className="skeleton h-4 rounded w-1/2 mb-2"></div>
                <div className="skeleton h-4 rounded w-1/3"></div>
              </div>
            ))}
          </div>
        ) : repeatOrders.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <RefreshCw className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-700 mb-2">No Repeat Orders</h3>
              <p className="text-slate-500 mb-6">Set up automatic reordering for your frequently used products</p>
              <Button 
                onClick={() => setCreateModalOpen(true)}
                className="bg-[#007CC3] hover:bg-[#00629B]"
              >
                Create Your First Repeat Order
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {repeatOrders.map((order) => (
              <Card key={order.id} className="hover:shadow-lg transition-shadow" data-testid={`repeat-order-${order.id}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#007CC3]/10 rounded-lg flex items-center justify-center">
                        <Package className="w-5 h-5 text-[#007CC3]" />
                      </div>
                      {order.is_active ? (
                        <Badge className="badge-success">Active</Badge>
                      ) : (
                        <Badge className="badge-warning">Paused</Badge>
                      )}
                    </div>
                    {getFrequencyBadge(order.frequency)}
                  </div>

                  <h3 className="font-semibold text-slate-900 mb-2 line-clamp-2">
                    {order.product_name}
                  </h3>
                  <p className="text-sm text-slate-500 font-mono mb-4">
                    Qty: {order.quantity} units
                  </p>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Calendar className="w-4 h-4" />
                      Next Order: {new Date(order.next_order_date).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Clock className="w-4 h-4" />
                      Created: {new Date(order.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => cancelRepeatOrder(order.id)}
                      data-testid="cancel-repeat-btn"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Cancel
                    </Button>
                    <Button 
                      size="sm" 
                      className="flex-1 bg-[#007CC3] hover:bg-[#00629B]"
                      data-testid="edit-repeat-btn"
                    >
                      Edit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Create Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Repeat Order</DialogTitle>
            <DialogDescription>
              Set up automatic reordering for products you need regularly
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Product Name *</Label>
              <Input
                value={newOrder.product_name}
                onChange={(e) => setNewOrder({...newOrder, product_name: e.target.value})}
                placeholder="Enter product name or SKU"
                className="mt-1"
                data-testid="repeat-product-name"
              />
            </div>
            <div>
              <Label>Quantity *</Label>
              <Input
                type="number"
                min="1"
                value={newOrder.quantity}
                onChange={(e) => setNewOrder({...newOrder, quantity: parseInt(e.target.value)})}
                className="mt-1"
                data-testid="repeat-quantity"
              />
            </div>
            <div>
              <Label>Frequency *</Label>
              <Select 
                value={newOrder.frequency} 
                onValueChange={(v) => setNewOrder({...newOrder, frequency: v})}
              >
                <SelectTrigger className="mt-1" data-testid="repeat-frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={createRepeatOrder}
              className="w-full bg-[#007CC3] hover:bg-[#00629B]"
              data-testid="submit-repeat-order"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Schedule Repeat Order
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RepeatOrdersPage;

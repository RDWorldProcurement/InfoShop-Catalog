import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, API } from "../App";
import axios from "axios";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../components/ui/dialog";
import { Progress } from "../components/ui/progress";
import { toast } from "sonner";
import {
  Coins, Award, Gift, Star, TrendingUp, ShoppingBag,
  Package, CheckCircle, ArrowRight
} from "lucide-react";
import Sidebar from "../components/Sidebar";

const InfoCoinsPage = () => {
  const navigate = useNavigate();
  const { user, updateCoins } = useAuth();
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReward, setSelectedReward] = useState(null);
  const [redeemModalOpen, setRedeemModalOpen] = useState(false);
  const [redeeming, setRedeeming] = useState(false);

  useEffect(() => {
    fetchRewards();
  }, []);

  const fetchRewards = async () => {
    try {
      const response = await axios.get(`${API}/infocoins/rewards`);
      setRewards(response.data.rewards);
    } catch (error) {
      toast.error("Failed to load rewards");
    } finally {
      setLoading(false);
    }
  };

  const redeemReward = async () => {
    if (!selectedReward) return;
    setRedeeming(true);
    try {
      const response = await axios.post(`${API}/infocoins/redeem/${selectedReward.id}`);
      toast.success(response.data.message);
      // Update local coins balance
      if (user) {
        updateCoins(user.info_coins - selectedReward.coins_required);
      }
      setRedeemModalOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Redemption failed");
    } finally {
      setRedeeming(false);
    }
  };

  const canRedeem = (reward) => {
    return (user?.info_coins || 0) >= reward.coins_required;
  };

  // Calculate level based on coins
  const getLevel = () => {
    const coins = user?.info_coins || 0;
    if (coins >= 10000) return { name: "Platinum", progress: 100, next: null };
    if (coins >= 5000) return { name: "Gold", progress: ((coins - 5000) / 5000) * 100, next: "Platinum" };
    if (coins >= 2000) return { name: "Silver", progress: ((coins - 2000) / 3000) * 100, next: "Gold" };
    return { name: "Bronze", progress: (coins / 2000) * 100, next: "Silver" };
  };

  const level = getLevel();

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar activePage="rewards" />

      <main className="flex-1 p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
            InfoCoins Rewards
          </h1>
          <p className="text-slate-500 mt-1">Earn coins on every purchase and redeem for exclusive gifts</p>
        </div>

        {/* Balance Card */}
        <Card className="mb-8 bg-gradient-to-r from-[#FFD700] via-[#FFA500] to-[#FF8C00] text-white overflow-hidden">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm mb-1">Your Balance</p>
                <div className="flex items-center gap-3">
                  <Coins className="w-10 h-10" />
                  <span className="text-5xl font-extrabold" style={{ fontFamily: 'Manrope' }}>
                    {user?.info_coins?.toLocaleString() || 0}
                  </span>
                </div>
                <p className="mt-4 text-white/80 text-sm">
                  Earn 1 InfoCoin for every $10 spent
                </p>
              </div>
              <div className="text-right">
                <Badge className="bg-white/20 text-white border-0 text-lg px-4 py-2">
                  <Star className="w-5 h-5 mr-2 fill-current" />
                  {level.name} Member
                </Badge>
                {level.next && (
                  <div className="mt-4">
                    <p className="text-white/80 text-xs mb-2">Progress to {level.next}</p>
                    <Progress value={level.progress} className="h-2 bg-white/20" />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* How to Earn */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-[#007CC3]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShoppingBag className="w-6 h-6 text-[#007CC3]" />
              </div>
              <h3 className="font-semibold mb-2">Shop & Earn</h3>
              <p className="text-sm text-slate-500">1 coin per $10 spent on orders</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-[#FF6B00]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="w-6 h-6 text-[#FF6B00]" />
              </div>
              <h3 className="font-semibold mb-2">Submit RFQs</h3>
              <p className="text-sm text-slate-500">50 coins per RFQ submission</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-[#10B981]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-6 h-6 text-[#10B981]" />
              </div>
              <h3 className="font-semibold mb-2">Level Up</h3>
              <p className="text-sm text-slate-500">Bonus coins at each tier</p>
            </CardContent>
          </Card>
        </div>

        {/* Rewards Grid */}
        <h2 className="text-xl font-bold text-slate-900 mb-4" style={{ fontFamily: 'Manrope' }}>
          Available Rewards
        </h2>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg p-6 h-64">
                <div className="skeleton h-32 rounded-lg mb-4"></div>
                <div className="skeleton h-4 rounded w-3/4 mb-2"></div>
                <div className="skeleton h-4 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rewards.map((reward) => (
              <Card 
                key={reward.id} 
                className={`overflow-hidden transition-all ${canRedeem(reward) ? 'hover:shadow-lg cursor-pointer' : 'opacity-75'}`}
                onClick={() => {
                  if (canRedeem(reward)) {
                    setSelectedReward(reward);
                    setRedeemModalOpen(true);
                  }
                }}
                data-testid={`reward-card-${reward.id}`}
              >
                <div className="aspect-video relative overflow-hidden bg-slate-100">
                  <img 
                    src={reward.image_url} 
                    alt={reward.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400";
                    }}
                  />
                  <Badge className="absolute top-2 right-2 bg-white/90 text-slate-900">
                    {reward.category}
                  </Badge>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-slate-900 mb-1">{reward.name}</h3>
                  <p className="text-sm text-slate-500 mb-4 line-clamp-2">{reward.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="infocoins-badge">
                      <Coins className="w-4 h-4" />
                      {reward.coins_required.toLocaleString()}
                    </div>
                    {canRedeem(reward) ? (
                      <Button size="sm" className="bg-[#007CC3] hover:bg-[#00629B]">
                        Redeem
                      </Button>
                    ) : (
                      <span className="text-xs text-slate-400">
                        Need {(reward.coins_required - (user?.info_coins || 0)).toLocaleString()} more
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Redeem Modal */}
      <Dialog open={redeemModalOpen} onOpenChange={setRedeemModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redeem Reward</DialogTitle>
            <DialogDescription>
              Confirm your reward redemption
            </DialogDescription>
          </DialogHeader>
          {selectedReward && (
            <div className="mt-4">
              <div className="flex gap-4 mb-6">
                <img 
                  src={selectedReward.image_url} 
                  alt={selectedReward.name}
                  className="w-24 h-24 object-cover rounded-lg"
                />
                <div>
                  <h3 className="font-semibold text-lg">{selectedReward.name}</h3>
                  <p className="text-sm text-slate-500">{selectedReward.description}</p>
                </div>
              </div>
              
              <div className="p-4 bg-slate-50 rounded-lg mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Cost:</span>
                  <div className="infocoins-badge">
                    <Coins className="w-4 h-4" />
                    {selectedReward.coins_required.toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-slate-600">Your Balance After:</span>
                  <span className="font-semibold">
                    {((user?.info_coins || 0) - selectedReward.coins_required).toLocaleString()} coins
                  </span>
                </div>
              </div>

              <Button 
                onClick={redeemReward}
                className="w-full bg-[#FF6B00] hover:bg-[#E65000]"
                disabled={redeeming}
                data-testid="confirm-redeem-btn"
              >
                {redeeming ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                    Processing...
                  </span>
                ) : (
                  <>
                    <Gift className="w-4 h-4 mr-2" />
                    Confirm Redemption
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InfoCoinsPage;

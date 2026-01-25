import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../App";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { toast } from "sonner";
import { 
  Package, Globe, Eye, EyeOff, Brain, FileUp, Target, 
  ShoppingCart, Handshake, Sparkles, ArrowRight, CheckCircle,
  Zap, BarChart3, Users, Shield
} from "lucide-react";

const COUNTRIES = [
  { name: "USA", flag: "🇺🇸" },
  { name: "Canada", flag: "🇨🇦" },
  { name: "Mexico", flag: "🇲🇽" },
  { name: "India", flag: "🇮🇳" },
  { name: "China", flag: "🇨🇳" },
  { name: "Germany", flag: "🇩🇪" },
  { name: "France", flag: "🇫🇷" },
  { name: "UK", flag: "🇬🇧" },
  { name: "Italy", flag: "🇮🇹" },
  { name: "Spain", flag: "🇪🇸" },
  { name: "Netherlands", flag: "🇳🇱" },
  { name: "Belgium", flag: "🇧🇪" },
  { name: "Poland", flag: "🇵🇱" },
  { name: "Switzerland", flag: "🇨🇭" },
  { name: "Sweden", flag: "🇸🇪" }
];

const LoginPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [country, setCountry] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!email || !password || !country) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      await login(email, password, country);
      toast.success("Welcome to OMNISupply.io!");
      
      // Check for redirect parameter, default to AI Agent (main entry point)
      const redirectTo = searchParams.get("redirect");
      if (redirectTo) {
        navigate(`/${redirectTo}`);
      } else {
        navigate("/ai-agent");  // New default: AI Procurement Agent
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setEmail("demo@infosys.com");
    setPassword("demo123");
    setCountry("USA");
    
    // Auto-submit after a short delay
    setLoading(true);
    try {
      await login("demo@infosys.com", "demo123", "USA");
      toast.success("Welcome to OMNISupply.io Demo!");
      navigate("/ai-agent");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - New Business Flow Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#007CC3] via-[#005A99] to-[#004C79] p-12 flex-col justify-between relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative z-10 space-y-6">
          {/* Infosys BPM Logo */}
          <div className="bg-white rounded-2xl p-5 inline-block shadow-lg">
            <img 
              src="https://customer-assets.emergentagent.com/job_infosys-mro/artifacts/5v2g4s4l_Infosys%20BPM%20Logo.png" 
              alt="Infosys BPM"
              className="h-12 drop-shadow-sm"
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <Package className="w-8 h-8 text-white" />
            </div>
            <span className="text-3xl font-bold text-white" style={{ fontFamily: 'Manrope' }}>
              OMNISupply.io
            </span>
          </div>
        </div>
        
        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-4" style={{ fontFamily: 'Manrope' }}>
              AI-Powered Intelligent Procurement
            </h1>
            <p className="text-xl text-white/90">
              Transform your procurement with conversational AI, automated price benchmarking, and intelligent negotiation
            </p>
          </div>
          
          {/* New Business Flow Features */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <span className="text-white font-semibold">AI Agent</span>
              </div>
              <p className="text-white/70 text-sm">ChatGPT-like procurement assistant powered by GPT-5.2, Claude & Gemini</p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                  <FileUp className="w-5 h-5 text-white" />
                </div>
                <span className="text-white font-semibold">Smart Quotations</span>
              </div>
              <p className="text-white/70 text-sm">Upload any quotation for AI extraction & price benchmarking</p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <span className="text-white font-semibold">Negotiation Agent</span>
              </div>
              <p className="text-white/70 text-sm">AI-generated negotiation strategies & emails</p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                  <Handshake className="w-5 h-5 text-white" />
                </div>
                <span className="text-white font-semibold">Buying Desk</span>
              </div>
              <p className="text-white/70 text-sm">Expert procurement support for complex sourcing</p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-8 pt-4">
            <div>
              <p className="text-3xl font-bold text-white">30M+</p>
              <p className="text-white/70 text-sm">Products</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-white">100K+</p>
              <p className="text-white/70 text-sm">Services</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-white">3 LLMs</p>
              <p className="text-white/70 text-sm">AI Engines</p>
            </div>
          </div>
        </div>

        <p className="relative z-10 text-white/60 text-sm">
          © {new Date().getFullYear()} Infosys BPM Limited
        </p>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-slate-50 to-slate-100">
        <Card className="w-full max-w-md shadow-2xl border-0 bg-white">
          <CardHeader className="text-center pb-2">
            <div className="lg:hidden flex items-center justify-center gap-3 mb-6">
              <div className="w-10 h-10 bg-[#007CC3] rounded-xl flex items-center justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
                OMNISupply.io
              </span>
            </div>
            <CardTitle className="text-2xl" style={{ fontFamily: 'Manrope' }}>Welcome to OMNISupply</CardTitle>
            <CardDescription>Sign in to access AI-powered procurement</CardDescription>
          </CardHeader>
          <CardContent>
            {/* PROMINENT Demo Login Button */}
            <div className="mb-6">
              <Button 
                onClick={handleDemoLogin}
                disabled={loading}
                className="w-full h-14 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all"
                data-testid="demo-login-btn"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></span>
                    Signing in...
                  </span>
                ) : (
                  <span className="flex items-center gap-3">
                    <Zap className="w-6 h-6" />
                    Try Demo - Instant Access
                    <ArrowRight className="w-5 h-5" />
                  </span>
                )}
              </Button>
              <p className="text-center text-xs text-slate-500 mt-2">
                No registration required • Full access to all features
              </p>
            </div>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-4 text-slate-500">or sign in with credentials</span>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11"
                  data-testid="login-email-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 pr-10"
                    data-testid="login-password-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    data-testid="toggle-password-btn"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger className="h-11" data-testid="country-select">
                    <SelectValue placeholder="Select your country" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c.name} value={c.name} data-testid={`country-option-${c.name}`}>
                        <span className="flex items-center gap-2">
                          <span>{c.flag}</span>
                          <span>{c.name}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">
                  Currency and pricing will be based on your country
                </p>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-[#007CC3] hover:bg-[#00629B] text-white font-semibold"
                disabled={loading}
                data-testid="login-submit-btn"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                    Signing in...
                  </span>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            {/* Admin Access Info - Smaller */}
            <div className="mt-6 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-xs text-slate-600 text-center">
                <span className="font-medium">Admin Access:</span> admin@omnisupply.io / admin123
              </p>
            </div>

            <div className="mt-4 text-center">
              <Button 
                variant="link" 
                onClick={() => navigate("/")}
                className="text-slate-500 text-sm"
                data-testid="back-to-home-btn"
              >
                ← Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;

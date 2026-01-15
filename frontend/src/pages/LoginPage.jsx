import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../App";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { toast } from "sonner";
import { Package, Globe, Info, Eye, EyeOff } from "lucide-react";

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
      
      // Check for redirect parameter
      const redirectTo = searchParams.get("redirect");
      if (redirectTo) {
        navigate(`/${redirectTo}`);
      } else {
        navigate("/catalog");
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCredentials = () => {
    setEmail("demo@infosys.com");
    setPassword("demo123");
    setCountry("USA");
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#007CC3] to-[#004C79] p-12 flex-col justify-between">
        <div className="space-y-6">
          {/* Prominent Infosys BPM Logo */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 inline-block">
            <img 
              src="https://customer-assets.emergentagent.com/job_infosys-mro/artifacts/5v2g4s4l_Infosys%20BPM%20Logo.png" 
              alt="Infosys BPM"
              className="h-14 brightness-200 drop-shadow-lg"
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Package className="w-7 h-7 text-white" />
            </div>
            <span className="text-2xl font-bold text-white" style={{ fontFamily: 'Manrope' }}>
              OMNISupply.io
            </span>
          </div>
        </div>
        
        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-4" style={{ fontFamily: 'Manrope' }}>
              Enterprise eCatalog
            </h1>
            <p className="text-xl text-white/80">
              Access 30M+ Industrial Products & 100K+ Services with Infosys Preferred Pricing
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center gap-4 text-white/90">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <Globe className="w-5 h-5" />
              </div>
              <span>Multi-currency support based on your location</span>
            </div>
            <div className="flex items-center gap-4 text-white/90">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5" />
              </div>
              <span>Real-time inventory & pricing from multiple partners</span>
            </div>
          </div>

          {/* Admin Access Info */}
          <div className="mt-8 p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-[#FF6B00] rounded-lg flex items-center justify-center">
                <Info className="w-4 h-4 text-white" />
              </div>
              <span className="text-white font-semibold text-sm">Admin Portal Access</span>
            </div>
            <div className="text-white/90 text-sm space-y-1.5">
              <p><span className="text-white/60">Email:</span> <span className="font-mono bg-white/10 px-2 py-0.5 rounded">admin@omnisupply.io</span></p>
              <p><span className="text-white/60">Password:</span> <span className="font-mono bg-white/10 px-2 py-0.5 rounded">admin123</span></p>
            </div>
            <p className="text-white/50 text-xs mt-2">For vendor catalog uploads & management</p>
          </div>
        </div>

        <p className="text-white/60 text-sm">
          © {new Date().getFullYear()} Infosys BPM Limited
        </p>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardHeader className="text-center pb-2">
            <div className="lg:hidden flex items-center justify-center gap-3 mb-6">
              <div className="w-10 h-10 bg-[#007CC3] rounded-xl flex items-center justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
                OMNISupply.io
              </span>
            </div>
            <CardTitle className="text-2xl" style={{ fontFamily: 'Manrope' }}>Welcome Back</CardTitle>
            <CardDescription>Sign in to access the eCatalog</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Demo Credentials Notice */}
            <div className="mb-6 p-4 bg-[#007CC3]/5 border border-[#007CC3]/20 rounded-lg">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-[#007CC3] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-[#007CC3]">Demo Credentials</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Email: <span className="font-mono">demo@infosys.com</span><br />
                    Password: <span className="font-mono">demo123</span>
                  </p>
                  <Button 
                    variant="link" 
                    className="text-[#007CC3] p-0 h-auto text-xs mt-1"
                    onClick={fillDemoCredentials}
                    data-testid="fill-demo-btn"
                  >
                    Click to fill demo credentials
                  </Button>
                </div>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
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
                  Currency and pricing will be shown based on your country
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

            <div className="mt-6 text-center">
              <Button 
                variant="link" 
                onClick={() => navigate("/")}
                className="text-slate-500"
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

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent } from "../components/ui/card";
import axios from "axios";
import { API } from "../App";
import {
  Package,
  Settings,
  ShieldCheck,
  Truck,
  Zap,
  Globe,
  ChevronRight,
  Building2,
  BarChart3,
  Users,
  CheckCircle,
  ArrowRight,
  Layers,
  Wrench,
  Cpu,
  HardHat,
  Cog,
  Droplet,
  Lightbulb,
  Shield
} from "lucide-react";

const BRANDS = [
  "SKF", "3M", "Henkel", "MARKEM", "IFM", "Avantor", "Donaldson", "Bosch",
  "Siemens", "ABB", "Honeywell", "Parker", "Emerson", "Rockwell", "Schneider"
];

const INTEGRATIONS = ["Coupa", "Ariba", "Ivalua", "SAP", "Oracle"];

const SERVICE_CATEGORIES = [
  "Corporate & Business Support Services",
  "Digital Marketing & Creative Agency Services",
  "Facilities Management & Workplace Services",
  "HSE, Quality & Compliance Services",
  "IT & Workplace Technology Services",
  "Logistics, Warehouse & Supply Chain Services",
  "Temp Labor across Technical Skilled Capabilities"
];

const MRO_CATEGORIES = [
  { name: "Bearings & Transmission", icon: Cog },
  { name: "Electrical & Lighting", icon: Lightbulb },
  { name: "Safety & PPE", icon: Shield },
  { name: "Tools & Equipment", icon: Wrench },
  { name: "Industrial Automation", icon: Cpu },
  { name: "Fluid Handling", icon: Droplet }
];

const LandingPage = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    total_products: "30M+",
    total_services: "100K+",
    total_categories: 35,
    total_brands: 50
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get(`${API}/stats`);
        setStats(response.data);
      } catch (error) {
        console.log("Using default stats");
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#007CC3] rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900" style={{ fontFamily: 'Manrope' }}>
              OMNI<span className="text-[#007CC3]">Supply</span>.io
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500">Powered by</span>
            <img 
              src="https://www.infosysbpm.com/content/dam/infosys-bpm/en/logo/infosysbpm-logo.svg" 
              alt="Infosys BPM"
              className="h-6"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "";
                e.target.style.display = "none";
              }}
            />
            <Button 
              onClick={() => navigate("/login")}
              className="bg-[#007CC3] hover:bg-[#00629B] text-white"
              data-testid="nav-access-catalog-btn"
            >
              Access Catalog
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 noise-overlay bg-gradient-to-br from-slate-900 via-slate-800 to-[#004C79]">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="animate-fade-in">
              <Badge className="bg-[#FF6B00]/10 text-[#FF6B00] mb-6 px-4 py-2 text-sm font-medium">
                Infosys Preferred Pricing
              </Badge>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-6" style={{ fontFamily: 'Manrope' }}>
                30M+ Industrial Products,
                <span className="text-[#007CC3]"> One Platform</span>
              </h1>
              <p className="text-lg text-slate-300 mb-8 max-w-xl">
                Access Millions of Industrial MRO Products, OEM Spare Parts, and Consumables 
                with exclusive Infosys pricing powered by global spend aggregation of billions of dollars.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button 
                  onClick={() => navigate("/login")}
                  className="bg-[#FF6B00] hover:bg-[#E65000] text-white px-8 py-6 text-lg font-bold animate-pulse-glow"
                  data-testid="hero-access-catalog-btn"
                >
                  Access Catalog <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button 
                  variant="outline" 
                  className="border-2 border-white/30 text-white hover:bg-white/10 px-8 py-6 text-lg"
                  data-testid="hero-learn-more-btn"
                >
                  Learn More
                </Button>
              </div>
            </div>
            <div className="hidden lg:block">
              <div className="relative">
                <img 
                  src="https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=600"
                  alt="Industrial Warehouse"
                  className="rounded-2xl shadow-2xl"
                />
                <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-xl shadow-xl">
                  <div className="flex items-center gap-4">
                    <div className="stat-number text-3xl">{stats.total_products}</div>
                    <div className="text-sm text-slate-500">Products<br/>Available</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-6 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center animate-fade-in stagger-1">
              <div className="stat-number">{stats.total_products}</div>
              <p className="text-slate-500 mt-2">Industrial Products</p>
            </div>
            <div className="text-center animate-fade-in stagger-2">
              <div className="stat-number">{stats.total_services}</div>
              <p className="text-slate-500 mt-2">Services Available</p>
            </div>
            <div className="text-center animate-fade-in stagger-3">
              <div className="stat-number">{stats.total_categories}+</div>
              <p className="text-slate-500 mt-2">MRO Categories</p>
            </div>
            <div className="text-center animate-fade-in stagger-4">
              <div className="stat-number">{stats.total_brands}+</div>
              <p className="text-slate-500 mt-2">Global Brands</p>
            </div>
          </div>
        </div>
      </section>

      {/* MRO Categories */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4" style={{ fontFamily: 'Manrope' }}>
              Industrial MRO Categories
            </h2>
            <p className="text-slate-500 max-w-2xl mx-auto">
              35+ categories of industrial products from world-class manufacturers
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {MRO_CATEGORIES.map((cat, idx) => {
              const IconComponent = cat.icon;
              return (
                <Card key={idx} className="card-feature cursor-pointer group" data-testid={`category-card-${idx}`}>
                  <CardContent className="p-6 text-center">
                    <div className="feature-icon mx-auto mb-4 group-hover:scale-110 transition-transform">
                      <IconComponent className="w-6 h-6" />
                    </div>
                    <p className="font-medium text-sm text-slate-700">{cat.name}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Brands Section */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4" style={{ fontFamily: 'Manrope' }}>
              Trusted Global Brands
            </h2>
            <p className="text-slate-500">Premium products from industry-leading manufacturers</p>
          </div>
          <div className="flex flex-wrap justify-center gap-6">
            {BRANDS.map((brand, idx) => (
              <div 
                key={idx} 
                className="brand-logo hover:border-[#007CC3] transition-colors"
                data-testid={`brand-logo-${idx}`}
              >
                {brand}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20 px-6 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <Badge className="bg-[#007CC3]/10 text-[#007CC3] mb-4">Rate Card Enabled Services</Badge>
              <h2 className="text-3xl font-bold text-slate-900 mb-6" style={{ fontFamily: 'Manrope' }}>
                100K+ Professional Services
              </h2>
              <p className="text-slate-500 mb-8">
                Beyond products, OMNISupply.io enables procurement of rate-card services 
                from vetted Infosys partners across multiple categories.
              </p>
              <div className="space-y-3">
                {SERVICE_CATEGORIES.map((service, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-100 hover:border-[#007CC3]/30 transition-colors"
                    data-testid={`service-category-${idx}`}
                  >
                    <CheckCircle className="w-5 h-5 text-[#10B981]" />
                    <span className="text-slate-700">{service}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Card className="card-feature col-span-2">
                <CardContent className="p-8">
                  <Settings className="w-10 h-10 text-[#007CC3] mb-4" />
                  <h3 className="text-xl font-bold mb-2">Facilities Management</h3>
                  <p className="text-slate-500 text-sm">Cleaning, security, maintenance, and workplace services</p>
                </CardContent>
              </Card>
              <Card className="card-feature">
                <CardContent className="p-6">
                  <Cpu className="w-8 h-8 text-[#007CC3] mb-3" />
                  <h3 className="font-bold mb-1">IT Services</h3>
                  <p className="text-slate-500 text-sm">Desktop support, infrastructure</p>
                </CardContent>
              </Card>
              <Card className="card-feature">
                <CardContent className="p-6">
                  <ShieldCheck className="w-8 h-8 text-[#007CC3] mb-3" />
                  <h3 className="font-bold mb-1">HSE & Compliance</h3>
                  <p className="text-slate-500 text-sm">Safety audits, certifications</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4" style={{ fontFamily: 'Manrope' }}>
              How OMNISupply.io Works
            </h2>
            <p className="text-slate-500 max-w-2xl mx-auto">
              Seamless integration with your existing procurement systems
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center animate-fade-in stagger-1">
              <div className="w-16 h-16 bg-[#007CC3]/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Building2 className="w-8 h-8 text-[#007CC3]" />
              </div>
              <h3 className="text-xl font-bold mb-3">1. ERP Integration</h3>
              <p className="text-slate-500">
                OMNISupply.io integrates within Coupa, Ariba, Ivalua, and other ERP systems via PunchOut catalogs
              </p>
            </div>
            <div className="text-center animate-fade-in stagger-2">
              <div className="w-16 h-16 bg-[#007CC3]/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Layers className="w-8 h-8 text-[#007CC3]" />
              </div>
              <h3 className="text-xl font-bold mb-3">2. Unified Catalog</h3>
              <p className="text-slate-500">
                Access state-of-the-art digital eCommerce catalogs for both Products and Services
              </p>
            </div>
            <div className="text-center animate-fade-in stagger-3">
              <div className="w-16 h-16 bg-[#007CC3]/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Zap className="w-8 h-8 text-[#007CC3]" />
              </div>
              <h3 className="text-xl font-bold mb-3">3. Preferred Pricing</h3>
              <p className="text-slate-500">
                Leverage Infosys global spend aggregation for exclusive pricing from strategic partners
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-4" style={{ fontFamily: 'Manrope' }}>
            Seamless ERP Integrations
          </h2>
          <p className="text-slate-500 mb-12">PunchOut enabled for all major procurement platforms</p>
          <div className="flex flex-wrap justify-center gap-4">
            {INTEGRATIONS.map((integration, idx) => (
              <div key={idx} className="integration-badge" data-testid={`integration-badge-${idx}`}>
                <Globe className="w-5 h-5 text-[#007CC3]" />
                <span className="font-semibold">{integration}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-r from-[#007CC3] to-[#004C79]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6" style={{ fontFamily: 'Manrope' }}>
            Ready to Transform Your Procurement?
          </h2>
          <p className="text-slate-200 text-lg mb-8">
            Join thousands of Infosys customers accessing millions of products with preferred pricing
          </p>
          <Button 
            onClick={() => navigate("/login")}
            className="bg-[#FF6B00] hover:bg-[#E65000] text-white px-10 py-6 text-lg font-bold"
            data-testid="cta-access-catalog-btn"
          >
            Access Catalog Now <ChevronRight className="ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-slate-900 text-slate-400">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#007CC3] rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-white" style={{ fontFamily: 'Manrope' }}>
                OMNISupply.io
              </span>
            </div>
            <p className="text-sm">
              © {new Date().getFullYear()} Infosys BPM Limited. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

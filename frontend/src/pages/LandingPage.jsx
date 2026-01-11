import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { useLanguage } from "../i18n/LanguageContext";
import axios from "axios";
import { API } from "../App";
import {
  Package, Settings, ShieldCheck, Truck, Zap, Globe, ChevronRight,
  Building2, BarChart3, Users, CheckCircle, ArrowRight, Layers,
  Wrench, Cpu, Cog, Droplet, Lightbulb, Shield, Briefcase,
  Palette, Monitor, Box, Factory, Languages, Play, Search, ShoppingCart, ExternalLink
} from "lucide-react";

// Realistic product images - using verified working Unsplash URLs
const PRODUCT_IMAGES = {
  bearings: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=400&h=400&fit=crop",
  tools: "https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=400&h=400&fit=crop",
  safety: "https://images.unsplash.com/photo-1618090584126-129cd1f3fbae?w=400&h=400&fit=crop",
  electrical: "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=400&h=400&fit=crop",
  motors: "https://images.unsplash.com/photo-1581093458791-9d42e3c2fd45?w=400&h=400&fit=crop",
  automation: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&h=400&fit=crop"
};

const SERVICE_IMAGES = {
  facilities: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=400&fit=crop",
  it: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=400&h=400&fit=crop",
  logistics: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400&h=400&fit=crop",
  marketing: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=400&fit=crop"
};

// Brand data with colors (no external logos - they get blocked)
const BRANDS = [
  { name: "SKF", color: "#005B94" },
  { name: "3M", color: "#FF0000" },
  { name: "Bosch", color: "#E30016" },
  { name: "Siemens", color: "#009999" },
  { name: "Honeywell", color: "#E31837" },
  { name: "ABB", color: "#FF000F" },
  { name: "Parker", color: "#004B87" },
  { name: "Schneider", color: "#3DCD58" },
  { name: "Fluke", color: "#FFC20E" },
  { name: "DeWalt", color: "#FEBD17" },
];

const INTEGRATIONS = [
  { name: "Coupa", color: "#0070C0" },
  { name: "SAP Ariba", color: "#F0AB00" },
  { name: "SAP ERP", color: "#0077B5" },
  { name: "Ivalua", color: "#00B2A9" },
  { name: "Oracle", color: "#F80000" },
];

const FEATURED_PRODUCTS = [
  { name: "SKF Deep Groove Ball Bearing 6205-2RS", sku: "SKF-6205-2RS", price: 24.50, image: PRODUCT_IMAGES.bearings, category: "Bearings", specs: "25x52x15mm, 14kN load" },
  { name: "Bosch GSB 18V-55 Cordless Drill", sku: "BOSCH-GSB18V55", price: 189.00, image: PRODUCT_IMAGES.tools, category: "Power Tools", specs: "18V, 55Nm torque" },
  { name: "3M SecureFit 400 Safety Glasses", sku: "3M-SF400", price: 12.99, image: PRODUCT_IMAGES.safety, category: "Safety & PPE", specs: "Anti-fog, UV protection" },
  { name: "Siemens SIRIUS 3RV2 Circuit Breaker", sku: "SIE-3RV2011", price: 78.50, image: PRODUCT_IMAGES.electrical, category: "Electrical", specs: "0.11-0.16A, Size S00" },
];

const FEATURED_SERVICES = [
  { name: "HVAC Preventive Maintenance", category: "Facilities Management", pricing: "Per Visit", price: 450, image: SERVICE_IMAGES.facilities },
  { name: "Desktop Support L1 - Remote", category: "IT Services", pricing: "Per Hour", price: 45, image: SERVICE_IMAGES.it },
  { name: "Warehouse Labor Services", category: "Logistics", pricing: "Per Hour", price: 28, image: SERVICE_IMAGES.logistics },
  { name: "Digital Marketing Strategy", category: "Marketing", pricing: "Per Month", price: 2500, image: SERVICE_IMAGES.marketing },
];

const LandingPage = () => {
  const navigate = useNavigate();
  const { t, language, changeLanguage, languageOptions } = useLanguage();
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
    <div className="min-h-screen bg-white">
      {/* Navigation - Infosys BPM Style */}
      <nav className="sticky top-0 z-50 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo Section */}
            <div className="flex items-center gap-6">
              <img 
                src="https://customer-assets.emergentagent.com/job_infosys-mro/artifacts/akkwm40y_Infosys%20BPM%20Logo.png" 
                alt="Infosys BPM"
                className="h-8"
              />
              <div className="h-6 w-px bg-slate-300"></div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#007CC3] rounded flex items-center justify-center">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-lg text-slate-900" style={{ fontFamily: 'Manrope' }}>
                  OMNISupply.io
                </span>
              </div>
            </div>
            
            {/* Right Section */}
            <div className="flex items-center gap-4">
              {/* Language Selector */}
              <Select value={language} onValueChange={changeLanguage}>
                <SelectTrigger className="w-32 h-9 bg-slate-50 border-slate-200" data-testid="language-selector">
                  <div className="flex items-center gap-2">
                    <Languages className="w-4 h-4 text-slate-500" />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {languageOptions.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code} data-testid={`lang-${lang.code}`}>
                      <span className="flex items-center gap-2">
                        <span>{lang.flag}</span>
                        <span>{lang.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button 
                onClick={() => navigate("/login")}
                className="bg-[#007CC3] hover:bg-[#00629B] text-white px-6"
                data-testid="nav-access-catalog-btn"
              >
                {t.nav.accessCatalog}
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section - Clean Infosys Style */}
      <section className="bg-gradient-to-b from-slate-50 to-white py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="bg-[#007CC3]/10 text-[#007CC3] border-0 mb-6 px-4 py-2">
                Infosys Preferred Pricing
              </Badge>
              <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 leading-tight mb-6" style={{ fontFamily: 'Manrope' }}>
                {t.landing.heroTitle}
              </h1>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                {t.landing.heroSubtitle}
              </p>
              <div className="flex flex-wrap gap-4">
                <Button 
                  onClick={() => navigate("/login")}
                  className="bg-[#007CC3] hover:bg-[#00629B] text-white px-8 py-6 text-lg"
                  data-testid="hero-cta-btn"
                >
                  {t.landing.cta} <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button 
                  variant="outline" 
                  className="border-slate-300 text-slate-700 px-8 py-6 text-lg"
                >
                  <Play className="mr-2 h-5 w-5" /> {t.landing.learnMore}
                </Button>
              </div>
            </div>
            
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: stats.total_products, label: t.landing.stats.products, icon: Package, color: "bg-blue-50 text-[#007CC3]" },
                { value: stats.total_services, label: t.landing.stats.services, icon: Settings, color: "bg-purple-50 text-purple-600" },
                { value: `${stats.total_categories}+`, label: t.landing.stats.categories, icon: Layers, color: "bg-green-50 text-green-600" },
                { value: `${stats.total_brands}+`, label: t.landing.stats.brands, icon: Factory, color: "bg-orange-50 text-orange-600" },
              ].map((stat, idx) => (
                <Card key={idx} className="border-slate-200 hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className={`w-12 h-12 rounded-lg ${stat.color} flex items-center justify-center mb-4`}>
                      <stat.icon className="w-6 h-6" />
                    </div>
                    <p className="text-3xl font-bold text-slate-900 mb-1" style={{ fontFamily: 'Manrope' }}>{stat.value}</p>
                    <p className="text-sm text-slate-500">{stat.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products - Grainger Style */}
      <section className="py-16 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
                {t.nav.products} Catalog
              </h2>
              <p className="text-slate-500 mt-1">Industrial MRO products from trusted manufacturers</p>
            </div>
            <Button variant="link" className="text-[#007CC3]" onClick={() => navigate("/login")}>
              View All Products <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURED_PRODUCTS.map((product, idx) => (
              <Card key={idx} className="border-slate-200 hover:shadow-xl hover:border-[#007CC3]/30 transition-all cursor-pointer group" data-testid={`featured-product-${idx}`}>
                <CardContent className="p-0">
                  <div className="aspect-square bg-slate-50 relative overflow-hidden">
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    <Badge className="absolute top-3 left-3 bg-white/90 text-slate-600 text-xs">{product.category}</Badge>
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-slate-400 font-mono mb-1">{product.sku}</p>
                    <h3 className="font-semibold text-slate-900 text-sm mb-2 line-clamp-2 group-hover:text-[#007CC3] transition-colors" style={{ fontFamily: 'IBM Plex Sans' }}>
                      {product.name}
                    </h3>
                    <p className="text-xs text-slate-500 mb-3">{product.specs}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-bold text-[#007CC3]">${product.price.toFixed(2)}</span>
                      <Badge className="bg-green-50 text-green-700 border-0">{t.catalog.inStock}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Services */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
                {t.landing.servicesTitle}
              </h2>
              <p className="text-slate-500 mt-1">{t.landing.servicesSubtitle}</p>
            </div>
            <Button variant="link" className="text-[#007CC3]" onClick={() => navigate("/login")}>
              View All Services <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURED_SERVICES.map((service, idx) => (
              <Card key={idx} className="border-slate-200 bg-white hover:shadow-xl transition-all cursor-pointer group" data-testid={`featured-service-${idx}`}>
                <CardContent className="p-0">
                  <div className="h-40 bg-slate-100 relative overflow-hidden">
                    <img src={service.image} alt={service.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" onError={(e) => e.target.style.display = 'none'} />
                    <Badge className="absolute top-3 left-3 bg-purple-600 text-white text-xs">{service.category}</Badge>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-slate-900 text-sm mb-2 group-hover:text-[#007CC3] transition-colors" style={{ fontFamily: 'IBM Plex Sans' }}>
                      {service.name}
                    </h3>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-purple-600">${service.price}</span>
                      <span className="text-xs text-slate-500">{service.pricing}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Brands Section */}
      <section className="py-12 bg-white border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-slate-500 mb-8">{t.landing.trustedBrands}</p>
          <div className="flex flex-wrap justify-center items-center gap-4">
            {BRANDS.map((brand, idx) => (
              <div key={idx} className="group" data-testid={`brand-logo-${idx}`}>
                <div 
                  className="px-6 py-3 rounded-lg border-2 font-bold text-lg transition-all hover:scale-105"
                  style={{ 
                    backgroundColor: `${brand.color}15`, 
                    borderColor: brand.color,
                    color: brand.color 
                  }}
                >
                  {brand.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-12" style={{ fontFamily: 'Manrope' }}>
            {t.landing.howItWorks}
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Search & Select", desc: "Find products from 30M+ items or services from 100K+ options using UNSPSC codes", icon: Search },
              { step: "2", title: "Add to Cart", desc: "Compare prices from multiple delivery partners and add items to your cart", icon: ShoppingCart },
              { step: "3", title: "PunchOut Transfer", desc: "Transfer your cart to Coupa, Ariba, SAP or Oracle with one click", icon: ExternalLink },
            ].map((item, idx) => (
              <div key={idx} className="text-center">
                <div className="w-16 h-16 bg-[#007CC3] rounded-full flex items-center justify-center mx-auto mb-6 text-white text-2xl font-bold">
                  {item.step}
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-3">{item.title}</h3>
                <p className="text-slate-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section className="py-12 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-xl font-bold text-slate-900 mb-2" style={{ fontFamily: 'Manrope' }}>
            {t.landing.integrationsTitle}
          </h2>
          <p className="text-slate-500 mb-8">{t.landing.integrationsSubtitle}</p>
          <div className="flex flex-wrap justify-center gap-4">
            {INTEGRATIONS.map((integration, idx) => (
              <div 
                key={idx} 
                className="flex items-center gap-3 px-6 py-4 bg-white border-2 rounded-lg hover:shadow-lg transition-all"
                style={{ borderColor: integration.color }}
              >
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm"
                  style={{ backgroundColor: integration.color }}
                >
                  {integration.name.charAt(0)}
                </div>
                <span className="font-medium text-slate-700">{integration.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-[#007CC3]">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-6" style={{ fontFamily: 'Manrope' }}>
            Ready to Transform Your Procurement?
          </h2>
          <p className="text-white/80 text-lg mb-8">
            Join thousands of Infosys customers with access to millions of products and services
          </p>
          <Button 
            onClick={() => navigate("/login")}
            className="bg-white text-[#007CC3] hover:bg-slate-100 px-10 py-6 text-lg font-semibold"
            data-testid="cta-btn"
          >
            {t.landing.cta} <ChevronRight className="ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-slate-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              <img 
                src="https://customer-assets.emergentagent.com/job_infosys-mro/artifacts/akkwm40y_Infosys%20BPM%20Logo.png" 
                alt="Infosys BPM"
                className="h-6 brightness-200"
              />
              <div className="h-4 w-px bg-slate-700"></div>
              <span className="font-semibold text-white" style={{ fontFamily: 'Manrope' }}>OMNISupply.io</span>
            </div>
            <p className="text-slate-400 text-sm">© {new Date().getFullYear()} Infosys BPM Limited. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

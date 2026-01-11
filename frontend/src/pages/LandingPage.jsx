import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent } from "../components/ui/card";
import axios from "axios";
import { API } from "../App";
import {
  Package, Settings, ShieldCheck, Truck, Zap, Globe, ChevronRight,
  Building2, BarChart3, Users, CheckCircle, ArrowRight, Layers,
  Wrench, Cpu, HardHat, Cog, Droplet, Lightbulb, Shield, Briefcase,
  Palette, Monitor, UserCheck, Box, Factory, Sparkles
} from "lucide-react";

const BRANDS = [
  { name: "SKF", logo: "https://logo.clearbit.com/skf.com" },
  { name: "3M", logo: "https://logo.clearbit.com/3m.com" },
  { name: "Henkel", logo: "https://logo.clearbit.com/henkel.com" },
  { name: "Bosch", logo: "https://logo.clearbit.com/bosch.com" },
  { name: "Siemens", logo: "https://logo.clearbit.com/siemens.com" },
  { name: "Honeywell", logo: "https://logo.clearbit.com/honeywell.com" },
  { name: "ABB", logo: "https://logo.clearbit.com/abb.com" },
  { name: "Parker", logo: "https://logo.clearbit.com/parker.com" },
  { name: "Emerson", logo: "https://logo.clearbit.com/emerson.com" },
  { name: "Schneider", logo: "https://logo.clearbit.com/se.com" },
];

const INTEGRATIONS = [
  { name: "Coupa", logo: "https://logo.clearbit.com/coupa.com" },
  { name: "SAP Ariba", logo: "https://logo.clearbit.com/ariba.com" },
  { name: "SAP ERP", logo: "https://logo.clearbit.com/sap.com" },
  { name: "Ivalua", logo: "https://logo.clearbit.com/ivalua.com" },
  { name: "Oracle", logo: "https://logo.clearbit.com/oracle.com" },
];

const SERVICE_CATEGORIES = [
  { name: "Corporate & Business Support", icon: Briefcase, color: "bg-blue-500" },
  { name: "Digital Marketing & Creative", icon: Palette, color: "bg-purple-500" },
  { name: "Facilities Management", icon: Building2, color: "bg-green-500" },
  { name: "HSE, Quality & Compliance", icon: ShieldCheck, color: "bg-orange-500" },
  { name: "IT & Workplace Technology", icon: Monitor, color: "bg-cyan-500" },
  { name: "Logistics & Supply Chain", icon: Truck, color: "bg-red-500" },
  { name: "Technical Staff Augmentation", icon: Users, color: "bg-indigo-500" },
];

const PRODUCT_CATEGORIES = [
  { name: "Bearings & Transmission", icon: Cog, unspsc: "31170000" },
  { name: "Electrical & Lighting", icon: Lightbulb, unspsc: "39110000" },
  { name: "Safety & PPE", icon: Shield, unspsc: "46180000" },
  { name: "Power Tools", icon: Zap, unspsc: "27112000" },
  { name: "Industrial Automation", icon: Cpu, unspsc: "32150000" },
  { name: "Material Handling", icon: Package, unspsc: "24100000" },
];

const LandingPage = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    total_products: "30M+",
    total_services: "100K+",
    total_categories: 35,
    total_brands: 50,
    service_categories: 7
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
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-white/90 border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img 
              src="https://customer-assets.emergentagent.com/job_infosys-mro/artifacts/5v2g4s4l_Infosys%20BPM%20Logo.png" 
              alt="Infosys BPM"
              className="h-8"
            />
            <div className="h-6 w-px bg-slate-300"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#007CC3] rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg tracking-tight text-slate-900" style={{ fontFamily: 'Manrope' }}>
                OMNI<span className="text-[#007CC3]">Supply</span>.io
              </span>
            </div>
          </div>
          <Button 
            onClick={() => navigate("/login")}
            className="bg-[#007CC3] hover:bg-[#00629B] text-white px-6"
            data-testid="nav-access-catalog-btn"
          >
            Access Catalog
          </Button>
        </div>
      </nav>

      {/* Hero Section - Redesigned */}
      <section className="pt-24 pb-0 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A]"></div>
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23007CC3' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>
        
        <div className="max-w-7xl mx-auto px-6 py-20 relative">
          <div className="text-center max-w-4xl mx-auto">
            <Badge className="bg-[#FF6B00]/20 text-[#FF6B00] border-[#FF6B00]/30 mb-6 px-4 py-2">
              <Sparkles className="w-4 h-4 mr-2" />
              Infosys Preferred Pricing
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-6" style={{ fontFamily: 'Manrope', letterSpacing: '-0.02em' }}>
              Enterprise Procurement,
              <span className="text-[#007CC3]"> Reimagined</span>
            </h1>
            <p className="text-xl text-slate-300 mb-10 max-w-3xl mx-auto leading-relaxed">
              Access <strong className="text-white">30M+ Industrial Products</strong> and <strong className="text-white">100K+ Professional Services</strong> with exclusive pricing powered by Infosys global spend aggregation.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button 
                onClick={() => navigate("/login")}
                className="bg-[#FF6B00] hover:bg-[#E65000] text-white px-10 py-6 text-lg font-bold shadow-xl shadow-orange-500/25 hover:shadow-orange-500/40 transition-all"
                data-testid="hero-access-catalog-btn"
              >
                Access eCatalog <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                variant="outline" 
                className="border-2 border-white/30 text-white hover:bg-white/10 px-10 py-6 text-lg bg-transparent"
                data-testid="hero-learn-more-btn"
              >
                Watch Demo
              </Button>
            </div>
          </div>

          {/* Stats Row */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { value: stats.total_products, label: "Industrial Products", icon: Package },
              { value: stats.total_services, label: "Services Available", icon: Settings },
              { value: `${stats.total_categories}+`, label: "MRO Categories", icon: Layers },
              { value: `${stats.total_brands}+`, label: "Global Brands", icon: Factory },
            ].map((stat, idx) => (
              <div key={idx} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 text-center hover:bg-white/10 transition-colors">
                <stat.icon className="w-8 h-8 text-[#007CC3] mx-auto mb-3" />
                <p className="text-3xl font-extrabold text-white mb-1" style={{ fontFamily: 'Manrope' }}>{stat.value}</p>
                <p className="text-slate-400 text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bento Grid - Products & Services */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4" style={{ fontFamily: 'Manrope' }}>
              One Platform, Complete Procurement
            </h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">
              From industrial MRO products to professional services - everything you need in one unified catalog
            </p>
          </div>

          {/* Bento Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Products Card - Large */}
            <div className="lg:col-span-2 bg-gradient-to-br from-[#007CC3] to-[#004C79] rounded-2xl p-8 text-white relative overflow-hidden group cursor-pointer hover:shadow-2xl transition-all"
                 onClick={() => navigate("/login")} data-testid="products-bento-card">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <div className="relative">
                <Badge className="bg-white/20 text-white border-0 mb-4">PRODUCTS</Badge>
                <h3 className="text-3xl font-bold mb-3" style={{ fontFamily: 'Manrope' }}>30M+ Industrial MRO Products</h3>
                <p className="text-white/80 mb-6 max-w-md">
                  Bearings, tools, electrical, safety equipment, automation components, and more from 50+ global brands
                </p>
                <div className="flex flex-wrap gap-2 mb-6">
                  {PRODUCT_CATEGORIES.slice(0, 4).map((cat, idx) => {
                    const IconComponent = cat.icon;
                    return (
                      <div key={idx} className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full text-sm">
                        <IconComponent className="w-4 h-4" />
                        {cat.name}
                      </div>
                    );
                  })}
                </div>
                <Button className="bg-white text-[#007CC3] hover:bg-white/90 group-hover:translate-x-1 transition-transform">
                  Browse Products <ChevronRight className="ml-1 w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Services Card - Large */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-8 text-white relative overflow-hidden group cursor-pointer hover:shadow-2xl transition-all"
                 onClick={() => navigate("/login")} data-testid="services-bento-card">
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#FF6B00]/20 rounded-full translate-y-1/2 -translate-x-1/2"></div>
              <div className="relative">
                <Badge className="bg-[#FF6B00]/20 text-[#FF6B00] border-0 mb-4">SERVICES</Badge>
                <h3 className="text-2xl font-bold mb-3" style={{ fontFamily: 'Manrope' }}>100K+ Professional Services</h3>
                <p className="text-white/70 mb-4 text-sm">
                  Rate-card enabled services from vetted Infosys partners
                </p>
                <div className="space-y-2">
                  {SERVICE_CATEGORIES.slice(0, 4).map((cat, idx) => {
                    const IconComponent = cat.icon;
                    return (
                      <div key={idx} className="flex items-center gap-2 text-sm text-white/80">
                        <div className={`w-6 h-6 ${cat.color} rounded flex items-center justify-center`}>
                          <IconComponent className="w-3 h-3 text-white" />
                        </div>
                        {cat.name}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Feature Cards */}
            <div className="bg-slate-50 rounded-2xl p-6 hover:bg-slate-100 transition-colors cursor-pointer" data-testid="feature-punchout">
              <Globe className="w-10 h-10 text-[#007CC3] mb-4" />
              <h4 className="font-bold text-lg mb-2">PunchOut Enabled</h4>
              <p className="text-slate-500 text-sm">Seamless integration with Coupa, Ariba, SAP, and more</p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-6 hover:bg-slate-100 transition-colors cursor-pointer" data-testid="feature-pricing">
              <BarChart3 className="w-10 h-10 text-[#FF6B00] mb-4" />
              <h4 className="font-bold text-lg mb-2">Preferred Pricing</h4>
              <p className="text-slate-500 text-sm">Leverage Infosys global spend for exclusive rates</p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-6 hover:bg-slate-100 transition-colors cursor-pointer" data-testid="feature-rfq">
              <Zap className="w-10 h-10 text-green-500 mb-4" />
              <h4 className="font-bold text-lg mb-2">Instant Quotations</h4>
              <p className="text-slate-500 text-sm">Get quotes from 100+ distributors in hours</p>
            </div>
          </div>
        </div>
      </section>

      {/* Brands Section */}
      <section className="py-16 px-6 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto">
          <p className="text-center text-slate-500 mb-8">Trusted products from industry-leading manufacturers</p>
          <div className="flex flex-wrap justify-center items-center gap-8">
            {BRANDS.map((brand, idx) => (
              <div key={idx} className="group cursor-pointer" data-testid={`brand-logo-${idx}`}>
                <div className="w-24 h-12 bg-white rounded-lg border border-slate-200 flex items-center justify-center p-2 group-hover:border-[#007CC3] group-hover:shadow-lg transition-all">
                  <img 
                    src={brand.logo} 
                    alt={brand.name}
                    className="max-h-8 max-w-full grayscale group-hover:grayscale-0 transition-all"
                    onError={(e) => {
                      e.target.style.display = "none";
                      e.target.parentElement.innerHTML = `<span class="text-xs font-bold text-slate-600">${brand.name}</span>`;
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Highlight Section */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <Badge className="bg-purple-100 text-purple-700 mb-4">SERVICES CATALOG</Badge>
              <h2 className="text-3xl font-bold text-slate-900 mb-6" style={{ fontFamily: 'Manrope' }}>
                100K+ Rate Card Services
              </h2>
              <p className="text-slate-500 mb-8 text-lg">
                Beyond products, OMNISupply.io enables procurement of professional services from vetted Infosys partners across 7 major categories with transparent pricing.
              </p>
              <div className="space-y-4">
                {SERVICE_CATEGORIES.map((service, idx) => {
                  const IconComponent = service.icon;
                  return (
                    <div key={idx} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer" data-testid={`service-category-${idx}`}>
                      <div className={`w-12 h-12 ${service.color} rounded-xl flex items-center justify-center`}>
                        <IconComponent className="w-6 h-6 text-white" />
                      </div>
                      <span className="font-medium text-slate-700">{service.name}</span>
                      <ChevronRight className="w-5 h-5 text-slate-400 ml-auto" />
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-3xl p-8 text-white">
                <h3 className="text-2xl font-bold mb-6" style={{ fontFamily: 'Manrope' }}>How Services Work</h3>
                <div className="space-y-6">
                  {[
                    { step: "1", title: "Search Services", desc: "Find from 100K+ services with UNSPSC codes" },
                    { step: "2", title: "Get Quotes", desc: "Receive rates from vetted Infosys partners" },
                    { step: "3", title: "Transfer via PunchOut", desc: "Send to your ERP system instantly" },
                  ].map((item, idx) => (
                    <div key={idx} className="flex gap-4">
                      <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                        {item.step}
                      </div>
                      <div>
                        <h4 className="font-semibold">{item.title}</h4>
                        <p className="text-white/70 text-sm">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section className="py-16 px-6 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-4" style={{ fontFamily: 'Manrope' }}>
            Seamless ERP Integrations
          </h2>
          <p className="text-slate-500 mb-10">PunchOut enabled for all major procurement platforms</p>
          <div className="flex flex-wrap justify-center gap-4">
            {INTEGRATIONS.map((integration, idx) => (
              <div key={idx} className="flex items-center gap-3 px-6 py-4 bg-white border border-slate-200 rounded-xl hover:border-[#007CC3] hover:shadow-lg transition-all cursor-pointer" data-testid={`integration-badge-${idx}`}>
                <img 
                  src={integration.logo} 
                  alt={integration.name}
                  className="w-8 h-8 object-contain"
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
                <span className="font-semibold text-slate-700">{integration.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-[#007CC3]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6" style={{ fontFamily: 'Manrope' }}>
            Ready to Transform Your Procurement?
          </h2>
          <p className="text-white/80 text-lg mb-10">
            Join thousands of Infosys customers accessing millions of products and services with preferred pricing
          </p>
          <Button 
            onClick={() => navigate("/login")}
            className="bg-[#FF6B00] hover:bg-[#E65000] text-white px-12 py-6 text-lg font-bold shadow-xl"
            data-testid="cta-access-catalog-btn"
          >
            Start Exploring <ChevronRight className="ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-slate-900 text-slate-400">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-4">
              <img 
                src="https://customer-assets.emergentagent.com/job_infosys-mro/artifacts/5v2g4s4l_Infosys%20BPM%20Logo.png" 
                alt="Infosys BPM"
                className="h-6 brightness-200"
              />
              <div className="h-4 w-px bg-slate-700"></div>
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-[#007CC3]" />
                <span className="font-bold text-white" style={{ fontFamily: 'Manrope' }}>OMNISupply.io</span>
              </div>
            </div>
            <p className="text-sm">© {new Date().getFullYear()} Infosys BPM Limited. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

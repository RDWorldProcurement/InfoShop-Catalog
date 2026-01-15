import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../components/ui/dialog";
import { useLanguage } from "../i18n/LanguageContext";
import axios from "axios";
import { API } from "../App";
import {
  Package, Settings, ShieldCheck, Truck, Zap, Globe, ChevronRight,
  Building2, BarChart3, Users, CheckCircle, ArrowRight, Layers,
  Wrench, Cpu, Cog, Droplet, Lightbulb, Shield, Briefcase,
  Palette, Monitor, Box, Factory, Languages, Play, Search, ShoppingCart, ExternalLink,
  X, ChevronLeft, LogIn, Award, RefreshCw, Upload, FileText, Coins,
  FileUp, Handshake, Brain, DollarSign, Calculator, Scale, Receipt,
  TrendingUp, Phone, Mail, Clock, Flag, Star
} from "lucide-react";

// Demo Walkthrough Slides
const DEMO_SLIDES = [
  {
    id: 1,
    title: "Welcome to OMNISupply.io",
    subtitle: "Your Complete Procurement Solution",
    description: "Access catalogs, upload quotations for AI analysis, or request end-to-end sourcing support. All in one unified platform powered by Infosys BPM.",
    icon: Package,
    color: "bg-[#007CC3]",
    features: [
      "30M+ MRO Products & 100K+ Services",
      "AI-Powered Quotation Analysis",
      "End-to-End Sourcing Support",
      "Multi-Language Support (8 Languages)"
    ]
  },
  {
    id: 2,
    title: "Three Ways to Procure",
    subtitle: "Choose Your Path",
    description: "Whether you need to browse catalogs, analyze existing quotations, or get full sourcing support - we've got you covered.",
    icon: Layers,
    color: "bg-green-600",
    steps: [
      { step: 1, title: "Browse Catalog", desc: "Search 30M+ products & services with preferred pricing" },
      { step: 2, title: "Upload Quotation", desc: "AI extracts data, benchmarks prices, verifies tax" },
      { step: 3, title: "Request Sourcing", desc: "Let Infosys handle end-to-end procurement" }
    ]
  },
  {
    id: 3,
    title: "AI-Powered Analysis",
    subtitle: "Intelligent Document Processing",
    description: "Our AI extracts data from quotations in 8 languages, automatically benchmarks prices for products and services against market data, and verifies tax compliance.",
    icon: Brain,
    color: "bg-purple-600",
    features: [
      "Automatic data extraction from any format",
      "Price benchmarking against market data",
      "Tax verification with Avalara integration",
      "Flag high-price items for negotiation"
    ]
  },
  {
    id: 4,
    title: "Flexible Payment Models",
    subtitle: "Choose How to Pay",
    description: "Select the payment model that works best for your organization.",
    icon: DollarSign,
    color: "bg-amber-600",
    options: [
      { icon: Building2, title: "Infosys Limited", desc: "One vendor model - simplified invoicing" },
      { icon: Globe, title: "ProPay World Wide Inc.", desc: "Global payment processing partner" },
      { icon: Receipt, title: "Direct Payment", desc: "You pay supplier directly after approval" }
    ]
  },
  {
    id: 5,
    title: "Enterprise Integration",
    subtitle: "Seamless ERP Connectivity",
    description: "Transfer approved purchases directly to your ERP system with one click.",
    icon: Zap,
    color: "bg-indigo-600",
    integrations: ["Coupa", "SAP Ariba", "SAP ERP", "Ivalua", "Oracle"],
    benefits: [
      "PunchOut Catalog Support",
      "Automated PO Generation",
      "Invoice Reconciliation",
      "Spend Analytics"
    ]
  }
];

// Stats data
const PLATFORM_STATS = [
  { value: "$2B+", label: "Annual Spend Managed", icon: TrendingUp },
  { value: "500+", label: "Enterprise Clients", icon: Building2 },
  { value: "35%", label: "Average Savings", icon: DollarSign },
  { value: "8", label: "Languages Supported", icon: Languages }
];

// AI Features
const AI_FEATURES = [
  {
    title: "AI Document Analysis",
    description: "Advanced AI extracts data from quotations in 8 languages with exceptional accuracy",
    icon: Brain,
    image: "https://static.prod-images.emergentagent.com/jobs/79f5bbcd-e8f5-438b-a126-c907b5b0d5c1/images/346c9a436d1d66f5e8563a435f94959de02b5c5bf41115e3286cdcecccd3c5f3.png"
  },
  {
    title: "Price Benchmarking",
    description: "Deep market research ensures competitive pricing for products and services",
    icon: Scale,
    image: "https://static.prod-images.emergentagent.com/jobs/79f5bbcd-e8f5-438b-a126-c907b5b0d5c1/images/306c05101cbe4df4c393745673f3a071a7c5f341ca6318db849abe2d96aa3f93.png"
  },
  {
    title: "Tax Intelligence",
    description: "Automated tax verification and exemption detection powered by Avalara",
    icon: Calculator,
    image: "https://static.prod-images.emergentagent.com/jobs/79f5bbcd-e8f5-438b-a126-c907b5b0d5c1/images/5db023814a718c6cca4ec68ea7e3bf6cd7ecd290fe6f51ccacd05a17d5766afa.png"
  },
  {
    title: "Tactical Sourcing",
    description: "Expert negotiation and supplier management by Infosys procurement specialists",
    icon: Handshake,
    image: "https://static.prod-images.emergentagent.com/jobs/79f5bbcd-e8f5-438b-a126-c907b5b0d5c1/images/7286e691789ed3cbf5871823fda4bb78123907ed075f04cb2d047cedad39f046.png"
  }
];

// How it works steps
const PROCESS_STEPS = [
  { step: "1", title: "Upload or Request", desc: "Upload your quotation or submit a sourcing request", icon: Upload },
  { step: "2", title: "AI Analysis", desc: "AI extracts data, verifies tax, benchmarks prices", icon: Brain },
  { step: "3", title: "Review & Negotiate", desc: "Review flags, request negotiations if needed", icon: Flag },
  { step: "4", title: "Add to Cart", desc: "Approve and transfer to your ERP system", icon: ShoppingCart }
];

// Payment models
const PAYMENT_MODELS = [
  {
    name: "Infosys Limited",
    subtitle: "One Vendor Model",
    description: "Customer issues PO to Infosys, Infosys issues PO to Supplier. Simplified vendor management and consolidated invoicing.",
    logo: "https://customer-assets.emergentagent.com/job_infosys-mro/artifacts/5v2g4s4l_Infosys%20BPM%20Logo.png",
    color: "#007CC3"
  },
  {
    name: "ProPay World Wide Inc.",
    subtitle: "Payment Processing Partner",
    description: "Customer issues PO to ProPay, ProPay issues PO to Supplier. Alternative payment processing with global coverage.",
    logo: "https://customer-assets.emergentagent.com/job_procure-ai-fusion/artifacts/tst2i955_ProPay.ai%20Logo%202.svg",
    color: "#10B981"
  },
  {
    name: "Customer Direct Payment",
    subtitle: "Infosys Sourcing, You Pay Directly",
    description: "Infosys provides full sourcing, negotiation, and AI-powered intelligence. Customer pays Supplier directly after approval.",
    logo: null,
    color: "#F59E0B"
  }
];

// Supported languages
const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "fr", name: "French", flag: "🇫🇷" },
  { code: "de", name: "German", flag: "🇩🇪" },
  { code: "es", name: "Spanish", flag: "🇪🇸" },
  { code: "it", name: "Italian", flag: "🇮🇹" },
  { code: "nl", name: "Dutch", flag: "🇳🇱" },
  { code: "zh", name: "Chinese", flag: "🇨🇳" },
  { code: "pt", name: "Portuguese", flag: "🇵🇹" }
];

const INTEGRATIONS = [
  { name: "Coupa", color: "#0070C0", logo: "https://static.prod-images.emergentagent.com/jobs/d1a8d9bf-4869-463a-9b82-69772febaffb/images/203af02878e8462b8b478e5a388300e13644b9c66a580240853a8c1b1b16421b.png" },
  { name: "SAP Ariba", color: "#F0AB00", logo: "https://static.prod-images.emergentagent.com/jobs/d1a8d9bf-4869-463a-9b82-69772febaffb/images/242c396695ed95e8c682ce4b9ab4fd164cefc30b4931d7acd112693b2b4be0bc.png" },
  { name: "SAP ERP", color: "#0077B5", logo: "https://static.prod-images.emergentagent.com/jobs/d1a8d9bf-4869-463a-9b82-69772febaffb/images/193fe369db8e5863b7e8cf1eef92e1169fc8cffa6c81ec14dc0438ca36ac2a22.png" },
  { name: "Ivalua", color: "#00B2A9", logo: "https://static.prod-images.emergentagent.com/jobs/d1a8d9bf-4869-463a-9b82-69772febaffb/images/16910d5da96ec608f2ab781af7b863dc269065f5f64d1996288d24be5423b5f1.png" },
  { name: "Oracle", color: "#F80000", logo: "https://static.prod-images.emergentagent.com/jobs/d1a8d9bf-4869-463a-9b82-69772febaffb/images/68bc01c43c6ce5e440fa07f6f3139ab989a0401f81edca69eb86dafb4a1b0870.png" },
];

// OMNISupply.io Logo (Icon Only - No Text)
const OMNISUPPLY_LOGO = "https://static.prod-images.emergentagent.com/jobs/d1a8d9bf-4869-463a-9b82-69772febaffb/images/5544120fa58b5db3f9b4ad8c6dafa2c32057f9ac5ad4be02779d98746bd4131d.png";

const LandingPage = () => {
  const navigate = useNavigate();
  const { t, language, changeLanguage, languageOptions } = useLanguage();
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img 
                src="https://customer-assets.emergentagent.com/job_infosys-mro/artifacts/5v2g4s4l_Infosys%20BPM%20Logo.png" 
                alt="Infosys BPM"
                className="h-8"
              />
              <div className="h-6 w-px bg-slate-300"></div>
              <div className="flex items-center gap-3">
                <img 
                  src={OMNISUPPLY_LOGO}
                  alt="OMNISupply.io"
                  className="h-12 w-12 object-contain"
                />
                <span className="font-bold text-xl text-slate-900" style={{ fontFamily: 'Manrope' }}>
                  OMNI<span className="text-[#007CC3]">Supply</span>.io
                </span>
              </div>
            </div>
            
            <div className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-slate-600 hover:text-[#007CC3] font-medium">{t.landing.navFeatures}</a>
              <a href="#how-it-works" className="text-slate-600 hover:text-[#007CC3] font-medium">{t.landing.navHowItWorks}</a>
              <a href="#payment" className="text-slate-600 hover:text-[#007CC3] font-medium">{t.landing.navPaymentOptions}</a>
              
              {/* Language Selector */}
              <Select value={language} onValueChange={changeLanguage}>
                <SelectTrigger className="w-[130px] border-slate-200">
                  <Globe className="w-4 h-4 mr-2 text-slate-500" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languageOptions.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      <span className="flex items-center gap-2">
                        <span>{lang.flag}</span>
                        <span>{lang.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button 
                variant="outline" 
                className="border-[#007CC3] text-[#007CC3] hover:bg-[#007CC3] hover:text-white"
                onClick={() => navigate("/login")}
              >
                {t.landing.signIn}
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section - 3 Options */}
      <section className="relative py-16 lg:py-24 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#007CC3]/5 via-white to-purple-50"></div>
        
        <div className="relative max-w-7xl mx-auto px-6">
          {/* Hero Header */}
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-[#007CC3]/10 text-[#007CC3] border-[#007CC3]/20 px-4 py-1">
              {t.landing.poweredBy}
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 mb-6" style={{ fontFamily: 'Manrope' }}>
              {t.landing.heroTitle}<br />
              <span className="text-[#007CC3]">{t.landing.heroTitleHighlight}</span>
            </h1>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto mb-8">
              {t.landing.heroSubtitle}
            </p>
            <div className="flex justify-center gap-4 mb-8">
              <Button 
                variant="outline"
                className="gap-2"
                onClick={() => { setCurrentSlide(0); setDemoModalOpen(true); }}
                data-testid="watch-demo-btn"
              >
                <Play className="w-4 h-4" /> {t.landing.watchDemo}
              </Button>
              <Button 
                className="bg-[#007CC3] hover:bg-[#00629B] gap-2"
                onClick={() => navigate("/login")}
              >
                {t.landing.getStarted} <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Three Option Cards */}
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Option 1: Browse Catalog */}
            <Card className="relative overflow-hidden group hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-[#007CC3]">
              <div className="absolute top-0 left-0 right-0 h-2 bg-[#007CC3]"></div>
              <CardContent className="p-6">
                <div className="w-14 h-14 bg-[#007CC3]/10 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Search className="w-7 h-7 text-[#007CC3]" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2" style={{ fontFamily: 'Manrope' }}>
                  {t.landing.browseCatalog}
                </h3>
                <p className="text-slate-600 mb-4 text-sm">
                  {t.landing.browseCatalogDesc}
                </p>
                <ul className="space-y-2 mb-6 text-sm">
                  <li className="flex items-center gap-2 text-slate-600">
                    <CheckCircle className="w-4 h-4 text-green-500" /> Multi-brand comparison
                  </li>
                  <li className="flex items-center gap-2 text-slate-600">
                    <CheckCircle className="w-4 h-4 text-green-500" /> Real-time inventory
                  </li>
                  <li className="flex items-center gap-2 text-slate-600">
                    <CheckCircle className="w-4 h-4 text-green-500" /> PunchOut to ERP
                  </li>
                </ul>
                <Button 
                  className="w-full bg-[#007CC3] hover:bg-[#00629B]"
                  onClick={() => navigate("/login")}
                  data-testid="browse-catalog-btn"
                >
                  <ShoppingCart className="w-4 h-4 mr-2" /> {t.landing.startBrowsing}
                </Button>
              </CardContent>
            </Card>

            {/* Option 2: Upload Quotation - One Off Purchases */}
            <Card className="relative overflow-hidden group hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-purple-500">
              <div className="absolute top-0 left-0 right-0 h-2 bg-purple-500"></div>
              <CardContent className="p-6">
                <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <FileUp className="w-7 h-7 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2" style={{ fontFamily: 'Manrope' }}>
                  {t.landing.oneOffPurchases}
                </h3>
                <p className="text-[#007CC3] font-semibold text-sm mb-2 flex items-center gap-1">
                  <Brain className="w-4 h-4" /> {t.landing.aiIntelligentBuying}
                </p>
                <p className="text-slate-600 mb-4 text-sm">
                  {t.landing.oneOffPurchasesDesc}
                </p>
                <ul className="space-y-2 mb-6 text-sm">
                  <li className="flex items-center gap-2 text-slate-600">
                    <CheckCircle className="w-4 h-4 text-green-500" /> {t.landing.aiDataExtraction}
                  </li>
                  <li className="flex items-center gap-2 text-slate-600">
                    <CheckCircle className="w-4 h-4 text-green-500" /> {t.landing.priceBenchmarking}
                  </li>
                  <li className="flex items-center gap-2 text-slate-600">
                    <CheckCircle className="w-4 h-4 text-green-500" /> {t.landing.taxVerification}
                  </li>
                </ul>
                <Button 
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  onClick={() => navigate("/login?redirect=upload-quotation")}
                  data-testid="upload-quotation-btn"
                >
                  <Upload className="w-4 h-4 mr-2" /> {t.landing.uploadQuotation}
                </Button>
              </CardContent>
            </Card>

            {/* Option 3: Managed Services / Buying Desk */}
            <Card className="relative overflow-hidden group hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-[#FF6B00]">
              <div className="absolute top-0 left-0 right-0 h-2 bg-[#FF6B00]"></div>
              <CardContent className="p-6">
                <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Handshake className="w-7 h-7 text-[#FF6B00]" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2" style={{ fontFamily: 'Manrope' }}>
                  {t.landing.managedServices}
                </h3>
                <p className="text-slate-600 mb-4 text-sm">
                  {t.landing.managedServicesDesc}
                </p>
                <ul className="space-y-2 mb-6 text-sm">
                  <li className="flex items-center gap-2 text-slate-600">
                    <CheckCircle className="w-4 h-4 text-green-500" /> {t.landing.supplierIdentification}
                  </li>
                  <li className="flex items-center gap-2 text-slate-600">
                    <CheckCircle className="w-4 h-4 text-green-500" /> {t.landing.rfqManagement}
                  </li>
                  <li className="flex items-center gap-2 text-slate-600">
                    <CheckCircle className="w-4 h-4 text-green-500" /> {t.landing.expertNegotiation}
                  </li>
                </ul>
                <Button 
                  className="w-full bg-[#FF6B00] hover:bg-[#E65000]"
                  onClick={() => navigate("/login?redirect=sourcing-support")}
                  data-testid="sourcing-support-btn"
                >
                  <Handshake className="w-4 h-4 mr-2" /> {t.landing.requestBuyingDesk}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-[#007CC3]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {PLATFORM_STATS.map((stat, idx) => (
              <div key={idx} className="text-center">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <p className="text-3xl md:text-4xl font-bold text-white mb-1" style={{ fontFamily: 'Manrope' }}>{stat.value}</p>
                <p className="text-white/80 text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Features Section */}
      <section id="features" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-purple-100 text-purple-700 border-purple-200">AI-Powered</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4" style={{ fontFamily: 'Manrope' }}>
              AI-Powered Procurement Intelligence
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Leverage cutting-edge AI technology combined with Infosys procurement expertise
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {AI_FEATURES.map((feature, idx) => (
              <Card key={idx} className="overflow-hidden hover:shadow-xl transition-shadow">
                <div className="h-40 overflow-hidden">
                  <img 
                    src={feature.image} 
                    alt={feature.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-[#007CC3]/10 rounded-lg flex items-center justify-center">
                      <feature.icon className="w-5 h-5 text-[#007CC3]" />
                    </div>
                    <h3 className="font-bold text-slate-900">{feature.title}</h3>
                  </div>
                  <p className="text-sm text-slate-600">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Multi-Language Support */}
      <section className="py-12 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-8">
            <h3 className="text-xl font-bold text-slate-900 mb-2" style={{ fontFamily: 'Manrope' }}>
              Multi-Language Document Support
            </h3>
            <p className="text-slate-600">
              Our AI processes quotations in 8 languages with exceptional accuracy
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {SUPPORTED_LANGUAGES.map((lang) => (
              <div 
                key={lang.code}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full hover:bg-[#007CC3]/10 transition-colors"
              >
                <span className="text-xl">{lang.flag}</span>
                <span className="font-medium text-slate-700">{lang.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-green-100 text-green-700 border-green-200">Simple Process</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4" style={{ fontFamily: 'Manrope' }}>
              How It Works
            </h2>
            <p className="text-lg text-slate-600">
              Simple, intelligent, and efficient procurement process
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {PROCESS_STEPS.map((step, idx) => (
              <div key={idx} className="relative text-center">
                {idx < PROCESS_STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-slate-200"></div>
                )}
                <div className="w-16 h-16 bg-[#007CC3] rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold relative z-10">
                  {step.step}
                </div>
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <step.icon className="w-6 h-6 text-[#007CC3]" />
                </div>
                <h3 className="font-bold text-slate-900 mb-2">{step.title}</h3>
                <p className="text-sm text-slate-600">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Payment Options */}
      <section id="payment" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-amber-100 text-amber-700 border-amber-200">Flexible Options</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4" style={{ fontFamily: 'Manrope' }}>
              Flexible Payment Options
            </h2>
            <p className="text-lg text-slate-600">
              Choose the paying agent model that works best for your organization
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {PAYMENT_MODELS.map((model, idx) => (
              <Card key={idx} className="overflow-hidden hover:shadow-xl transition-shadow">
                <div className="h-2" style={{ backgroundColor: model.color }}></div>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    {model.logo ? (
                      <img src={model.logo} alt={model.name} className="h-8" />
                    ) : (
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: model.color }}
                      >
                        {model.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-slate-900">{model.name}</h3>
                      <p className="text-sm text-slate-500">{model.subtitle}</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600">{model.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ERP Integrations */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h3 className="text-xl font-bold text-slate-900 mb-2" style={{ fontFamily: 'Manrope' }}>
            {t.landing.erpIntegration}
          </h3>
          <p className="text-slate-600 mb-8">{t.landing.erpIntegrationDesc}</p>
          <div className="flex flex-wrap justify-center gap-6">
            {INTEGRATIONS.map((integration, idx) => (
              <div 
                key={idx} 
                className="flex flex-col items-center gap-3 px-6 py-5 bg-white border-2 rounded-xl hover:shadow-lg transition-all min-w-[140px]"
                style={{ borderColor: integration.color }}
              >
                <img 
                  src={integration.logo}
                  alt={integration.name}
                  className="w-16 h-16 object-contain"
                />
                <span className="font-semibold text-slate-700 text-sm">{integration.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-[#007CC3] to-[#00629B]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6" style={{ fontFamily: 'Manrope' }}>
            {t.landing.readyToTransform}
          </h2>
          <p className="text-white/90 text-lg mb-8 max-w-2xl mx-auto">
            {t.landing.readyToTransformDesc}
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button 
              size="lg"
              className="bg-white text-[#007CC3] hover:bg-slate-100 px-8"
              onClick={() => navigate("/login")}
            >
              {t.landing.getStarted} <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button 
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white/10 px-8"
            >
              <Phone className="mr-2 w-5 h-5" /> Contact Sales
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-slate-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="bg-white px-3 py-2 rounded-lg">
                <img 
                  src="https://customer-assets.emergentagent.com/job_infosys-mro/artifacts/5v2g4s4l_Infosys%20BPM%20Logo.png" 
                  alt="Infosys BPM"
                  className="h-8"
                />
              </div>
              <div className="h-6 w-px bg-slate-700"></div>
              <div className="flex items-center gap-3">
                <img 
                  src={OMNISUPPLY_LOGO}
                  alt="OMNISupply.io"
                  className="h-12 w-12 object-contain"
                />
                <span className="font-bold text-white text-lg" style={{ fontFamily: 'Manrope' }}>OMNISupply.io</span>
              </div>
            </div>
            <div className="flex items-center gap-6 text-slate-400 text-sm">
              <a href="#" className="hover:text-white">Privacy Policy</a>
              <a href="#" className="hover:text-white">Terms of Service</a>
              <a href="#" className="hover:text-white">Contact Us</a>
            </div>
            <p className="text-slate-500 text-sm">© {new Date().getFullYear()} Infosys BPM Limited. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Demo Walkthrough Modal */}
      <Dialog open={demoModalOpen} onOpenChange={setDemoModalOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-white">
          <div className="relative">
            <button 
              onClick={() => setDemoModalOpen(false)}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/90 hover:bg-white shadow-lg flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="min-h-[500px]">
              {DEMO_SLIDES.map((slide, idx) => (
                <div key={slide.id} className={`${currentSlide === idx ? 'block' : 'hidden'}`}>
                  <div className={`${slide.color} p-8 text-white`}>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                        <slide.icon className="w-7 h-7" />
                      </div>
                      <div>
                        <p className="text-white/80 text-sm font-medium">{slide.subtitle}</p>
                        <h3 className="text-2xl font-bold" style={{ fontFamily: 'Manrope' }}>{slide.title}</h3>
                      </div>
                    </div>
                    <p className="text-white/90">{slide.description}</p>
                  </div>

                  <div className="p-8">
                    {slide.features && (
                      <div className="space-y-3">
                        {slide.features.map((feature, fIdx) => (
                          <div key={fIdx} className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-full ${slide.color} flex items-center justify-center`}>
                              <CheckCircle className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-slate-700">{feature}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {slide.steps && (
                      <div className="space-y-4">
                        {slide.steps.map((step) => (
                          <div key={step.step} className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl">
                            <div className={`w-10 h-10 ${slide.color} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`}>
                              {step.step}
                            </div>
                            <div>
                              <h4 className="font-semibold text-slate-900">{step.title}</h4>
                              <p className="text-slate-500 text-sm">{step.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {slide.options && (
                      <div className="grid grid-cols-3 gap-4">
                        {slide.options.map((option, oIdx) => (
                          <div key={oIdx} className="p-4 border border-slate-200 rounded-xl text-center">
                            <div className={`w-10 h-10 ${slide.color} rounded-lg flex items-center justify-center text-white mx-auto mb-3`}>
                              <option.icon className="w-5 h-5" />
                            </div>
                            <h4 className="font-semibold text-slate-900 mb-1 text-sm">{option.title}</h4>
                            <p className="text-slate-500 text-xs">{option.desc}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {slide.integrations && (
                      <div className="space-y-4">
                        <div className="flex flex-wrap gap-2 mb-4">
                          {slide.integrations.map((int, iIdx) => (
                            <Badge key={iIdx} variant="secondary" className="bg-indigo-100 text-indigo-700 px-3 py-1">
                              {int}
                            </Badge>
                          ))}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {slide.benefits.map((benefit, bIdx) => (
                            <div key={bIdx} className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-indigo-500" />
                              <span className="text-slate-700 text-sm">{benefit}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-200 p-4 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                {DEMO_SLIDES.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentSlide(idx)}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                      currentSlide === idx ? 'bg-[#007CC3] w-6' : 'bg-slate-300 hover:bg-slate-400'
                    }`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
                  disabled={currentSlide === 0}
                  className="gap-1"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </Button>
                
                {currentSlide < DEMO_SLIDES.length - 1 ? (
                  <Button
                    size="sm"
                    onClick={() => setCurrentSlide(currentSlide + 1)}
                    className="bg-[#007CC3] hover:bg-[#00629B] gap-1"
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => { setDemoModalOpen(false); navigate('/login'); }}
                    className="bg-[#FF9900] hover:bg-[#FF6B00] gap-1"
                  >
                    Get Started <ArrowRight className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LandingPage;

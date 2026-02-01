import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowRight, 
  Globe2, 
  Building2, 
  ShoppingCart, 
  Zap, 
  Shield, 
  TrendingDown,
  Users,
  CheckCircle,
  Play,
  ChevronDown
} from "lucide-react";
import { Button } from "../components/ui/button";

// ============================================
// BRAND ASSETS
// ============================================

const OMNISUPPLY_LOGO = "https://customer-assets.emergentagent.com/job_3d3497d4-96ce-45f6-9a33-f8d277c4c70e/artifacts/tt4qnc6b_OMNISupply.png";
// Use transparent/dark-friendly version of Infosys BPM logo or create a styled container
const INFOSYS_BPM_LOGO = "https://customer-assets.emergentagent.com/job_3d3497d4-96ce-45f6-9a33-f8d277c4c70e/artifacts/i0gp8i5o_InfosysBPM.png";

// Supplier Data with AI-generated logos
const SUPPLIERS = [
  { 
    name: "Grainger", 
    logo: "https://static.prod-images.emergentagent.com/jobs/3d3497d4-96ce-45f6-9a33-f8d277c4c70e/images/c0aa7f54b52fc1914890e0ceb1572e94023339c8c575e16b6ee7073438392034.png",
    color: "#C8102E" 
  },
  { 
    name: "MOTION", 
    logo: "https://static.prod-images.emergentagent.com/jobs/3d3497d4-96ce-45f6-9a33-f8d277c4c70e/images/4a9dfce8cdd9e6412455e1c2d31c280f3f724beaeff7a2b230b1371065257c84.png",
    color: "#003087" 
  },
  { 
    name: "BDI", 
    logo: "https://static.prod-images.emergentagent.com/jobs/3d3497d4-96ce-45f6-9a33-f8d277c4c70e/images/faea8b3b0bcc38e39236a401776e00c48ed255f6c2e5b5a43fc0a33511a19741.png",
    color: "#1E3A8A" 
  },
  { 
    name: "Fastenal", 
    logo: "https://static.prod-images.emergentagent.com/jobs/3d3497d4-96ce-45f6-9a33-f8d277c4c70e/images/f64c0515eecabe7b5d65a0e53879267a164f4ff20b51f4fb7d8b622d4bffa21d.png",
    color: "#00843D" 
  },
  { 
    name: "Donaldson", 
    logo: "https://static.prod-images.emergentagent.com/jobs/3d3497d4-96ce-45f6-9a33-f8d277c4c70e/images/a502c8d4141a49107460a5b68f254b3a9d0aa70023baec16b4d12ef9e079c9ac.png",
    color: "#0033A0" 
  },
  { 
    name: "Avantor VWR", 
    logo: "https://static.prod-images.emergentagent.com/jobs/3d3497d4-96ce-45f6-9a33-f8d277c4c70e/images/bf516738c5b7b5de2e7e9edcd62bef5955371cb32775f24c48ccd7cb945deec9.png",
    color: "#6B2D5B" 
  },
  { 
    name: "MARKEM", 
    logo: "https://static.prod-images.emergentagent.com/jobs/3d3497d4-96ce-45f6-9a33-f8d277c4c70e/images/356f6e7784c5a7d104a0f6eb7b8f5d5cf56b5f3ad3c86aea7cb39a08e330a9bb.png",
    color: "#FF6600" 
  },
  { 
    name: "VideoJet", 
    logo: "https://static.prod-images.emergentagent.com/jobs/3d3497d4-96ce-45f6-9a33-f8d277c4c70e/images/0f18ee277ae1b48f9a2e59999772ed1ff99c9b740aea4f93a1844ce433fd2dee.png",
    color: "#00529B" 
  },
  { 
    name: "Sonepar", 
    logo: "https://static.prod-images.emergentagent.com/jobs/3d3497d4-96ce-45f6-9a33-f8d277c4c70e/images/025bc34befa2a4da52b73571af0f19d06c7ad82fcdd30e2da7c2de4f9b0ce889.png",
    color: "#E4002B" 
  },
  { 
    name: "Cromwell", 
    logo: "https://static.prod-images.emergentagent.com/jobs/3d3497d4-96ce-45f6-9a33-f8d277c4c70e/images/692d901d97d7a222edf20f26848c2bcb7eb4cffc43d561fc8516bdf80414e83c.png",
    color: "#ED1C24" 
  },
  { 
    name: "NorthSky ZKH", 
    logo: "https://static.prod-images.emergentagent.com/jobs/3d3497d4-96ce-45f6-9a33-f8d277c4c70e/images/25a7d0a65e1882dba3e8337b1f4e9001e81c900926aa746126214147f2cd4263.png",
    color: "#C41E3A" 
  },
  { 
    name: "ProPay", 
    logo: "https://static.prod-images.emergentagent.com/jobs/3d3497d4-96ce-45f6-9a33-f8d277c4c70e/images/b32ad9763bf7545918655c0f1f258098b006edbd83e23fd0a2a55e1646420035.png",
    color: "#4A90D9" 
  },
];

// ============================================
// ANIMATED SUPPLIER CARD WITH LOGO
// ============================================
const SupplierCard = ({ supplier, index, isAnimating, targetPosition }) => {
  const [isConsolidated, setIsConsolidated] = useState(false);
  
  useEffect(() => {
    if (isAnimating) {
      const delay = index * 150 + Math.random() * 200;
      const timer = setTimeout(() => {
        setIsConsolidated(true);
      }, delay);
      return () => clearTimeout(timer);
    } else {
      setIsConsolidated(false);
    }
  }, [isAnimating, index]);

  const gridCol = index % 4;
  const gridRow = Math.floor(index / 4);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0 }}
      animate={
        isConsolidated
          ? { 
              opacity: 0, 
              scale: 0.2,
              x: targetPosition.x - (gridCol * 140) - 70,
              y: targetPosition.y - (gridRow * 120) - 60,
              transition: { duration: 0.8, ease: [0.43, 0.13, 0.23, 0.96] }
            }
          : { 
              opacity: 1, 
              scale: 1, 
              x: 0, 
              y: 0,
              transition: { delay: index * 0.08, duration: 0.5, ease: "easeOut" }
            }
      }
      className="relative"
    >
      <div 
        className="w-32 h-28 md:w-36 md:h-32 rounded-xl shadow-lg overflow-hidden bg-white border-2 border-slate-100 hover:shadow-xl transition-shadow"
      >
        {/* Logo */}
        <div className="h-20 md:h-24 flex items-center justify-center p-3 bg-white">
          <img 
            src={supplier.logo} 
            alt={supplier.name}
            className="max-w-full max-h-full object-contain"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
          <div className="hidden items-center justify-center w-full h-full">
            <span className="font-bold text-slate-600">{supplier.name}</span>
          </div>
        </div>
        {/* Name bar */}
        <div 
          className="h-8 flex items-center justify-center"
          style={{ backgroundColor: supplier.color }}
        >
          <span className="text-white text-xs font-medium truncate px-2">
            {supplier.name}
          </span>
        </div>
        {/* Shopping cart icon */}
        <div className="absolute -top-1 -right-1 w-6 h-6 bg-[#007ABF] rounded-full flex items-center justify-center shadow-md">
          <ShoppingCart className="w-3 h-3 text-white" />
        </div>
      </div>
    </motion.div>
  );
};

// ============================================
// INFOSHOP CENTRAL HUB
// ============================================
const InfoShopHub = ({ isActive, supplierCount }) => (
  <motion.div
    initial={{ scale: 0.9, opacity: 0.7 }}
    animate={
      isActive
        ? { scale: 1, opacity: 1 }
        : { scale: 0.95, opacity: 0.9 }
    }
    transition={{ duration: 0.5 }}
    className="relative"
  >
    {/* Pulsing rings when active */}
    {isActive && (
      <>
        <motion.div
          animate={{ scale: [1, 1.3], opacity: [0.6, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#007ABF] to-[#00A9E0]"
        />
        <motion.div
          animate={{ scale: [1, 1.5], opacity: [0.4, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
          className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#007ABF] to-[#00A9E0]"
        />
      </>
    )}
    
    <div className="relative w-48 h-48 md:w-64 md:h-64 rounded-2xl bg-gradient-to-br from-[#007ABF] via-[#0090D9] to-[#00A9E0] shadow-2xl flex flex-col items-center justify-center border-4 border-white/30 overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
          backgroundSize: '20px 20px'
        }} />
      </div>
      
      {/* Content */}
      <div className="relative z-10 text-center">
        <img 
          src={OMNISUPPLY_LOGO} 
          alt="OMNISupply.io" 
          className="h-10 md:h-14 mx-auto mb-2 drop-shadow-lg"
          style={{ filter: 'brightness(0) invert(1)' }}
        />
        <div className="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1 mb-2">
          <span className="text-white text-xs md:text-sm font-semibold">InfoShop Digital Catalog</span>
        </div>
        <Globe2 className="w-8 h-8 md:w-10 md:h-10 text-white/80 mx-auto" />
      </div>
      
      {/* Consolidated badge */}
      {isActive && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="absolute -bottom-4 bg-green-500 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg"
        >
          ✓ {supplierCount} Suppliers Consolidated
        </motion.div>
      )}
    </div>
  </motion.div>
);

// ============================================
// STATS CARD
// ============================================
const StatCard = ({ icon: Icon, value, label, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5 }}
    viewport={{ once: true }}
    className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-colors"
  >
    <Icon className="w-8 h-8 text-[#E97300] mb-3" />
    <div className="text-3xl font-bold text-white mb-1">{value}</div>
    <div className="text-white/70 text-sm">{label}</div>
  </motion.div>
);

// ============================================
// MAIN LANDING PAGE
// ============================================
const InfoShopLandingPage = ({ onEnterCatalog }) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [showCTA, setShowCTA] = useState(false);
  const animationRef = useRef(null);
  const hubRef = useRef(null);
  const [targetPosition, setTargetPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (isAnimating) {
      const timer = setTimeout(() => {
        setAnimationComplete(true);
        setTimeout(() => setShowCTA(true), 600);
      }, SUPPLIERS.length * 150 + 1000);
      return () => clearTimeout(timer);
    }
  }, [isAnimating]);

  const startAnimation = () => {
    setIsAnimating(true);
    setAnimationComplete(false);
    setShowCTA(false);
  };

  const resetAnimation = () => {
    setIsAnimating(false);
    setAnimationComplete(false);
    setShowCTA(false);
  };

  const scrollToAnimation = () => {
    animationRef.current?.scrollIntoView({ behavior: 'smooth' });
    setTimeout(startAnimation, 800);
  };

  return (
    <div className="min-h-screen bg-[#0D1B2A] overflow-x-hidden">
      {/* ============================================ */}
      {/* HERO SECTION */}
      {/* ============================================ */}
      <section className="relative min-h-screen flex flex-col">
        {/* Animated gradient background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0D1B2A] via-[#1B2838] to-[#0D1B2A]" />
          <motion.div
            animate={{ 
              backgroundPosition: ["0% 0%", "100% 100%"],
            }}
            transition={{ duration: 25, repeat: Infinity, repeatType: "reverse" }}
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage: `radial-gradient(ellipse at 20% 30%, #007ABF 0%, transparent 50%), 
                               radial-gradient(ellipse at 80% 70%, #00A9E0 0%, transparent 50%)`,
            }}
          />
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-5" style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }} />
        </div>

        {/* Header */}
        <header className="relative z-10 px-6 py-5">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-5">
              {/* OMNISupply.io Logo */}
              <img 
                src={OMNISUPPLY_LOGO} 
                alt="OMNISupply.io" 
                className="h-10 md:h-12"
              />
              <div className="hidden sm:block border-l-2 border-white/20 pl-5">
                <p className="text-[#00A9E0] text-xs font-medium tracking-wider">INFOSHOP</p>
                <p className="text-white/80 text-sm">Digital Catalog</p>
              </div>
            </div>
            
            {/* Infosys BPM Logo */}
            <div className="flex items-center gap-4">
              <div className="hidden md:block text-right">
                <p className="text-white/50 text-xs">Powered by</p>
              </div>
              <div className="bg-white rounded-lg px-3 py-1.5 shadow-md">
                <img 
                  src={INFOSYS_BPM_LOGO} 
                  alt="Infosys BPM" 
                  className="h-6 md:h-8"
                />
              </div>
            </div>
          </div>
        </header>

        {/* Hero Content */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center py-12">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-5xl"
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-5 py-2.5 rounded-full mb-8 border border-white/20">
              <Globe2 className="w-5 h-5 text-[#00A9E0]" />
              <span className="text-white/90 text-sm font-medium">Global Digital One Stop Shop</span>
            </div>
            
            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              <span className="text-white">You Deal with </span>
              <span className="bg-gradient-to-r from-[#007ABF] to-[#00A9E0] bg-clip-text text-transparent">One</span>
              <br />
              <span className="text-white">We Deal with </span>
              <span className="text-[#E97300]">Many</span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg md:text-xl text-white/70 max-w-3xl mx-auto mb-10 leading-relaxed">
              <span className="text-white font-semibold">InfoShop</span> consolidates{" "}
              <span className="text-[#00A9E0] font-semibold">hundreds of supplier webshops</span> across 
              categories and geographies into{" "}
              <span className="text-white font-semibold">one unified digital catalog</span>.
              <br className="hidden md:block" />
              Simplify procurement. Maximize savings. Zero complexity.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Button 
                onClick={scrollToAnimation}
                size="lg"
                className="bg-gradient-to-r from-[#007ABF] to-[#00A9E0] hover:from-[#006AA3] hover:to-[#0095C7] text-white font-semibold px-8 py-6 text-lg shadow-lg shadow-[#007ABF]/30 rounded-xl"
              >
                <Play className="w-5 h-5 mr-2" />
                See How It Works
              </Button>
              <Button 
                onClick={onEnterCatalog}
                size="lg"
                className="bg-[#E97300] hover:bg-[#D66900] text-white font-semibold px-8 py-6 text-lg rounded-xl"
              >
                Enter Catalog
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap items-center justify-center gap-8 text-white/50 text-sm">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#00A9E0]" />
                <span>Enterprise Security</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-[#E97300]" />
                <span>Coupa PunchOut Ready</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-green-400" />
                <span>Guaranteed Savings</span>
              </div>
            </div>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div 
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute bottom-8 cursor-pointer"
            onClick={scrollToAnimation}
          >
            <ChevronDown className="w-8 h-8 text-white/40" />
          </motion.div>
        </div>
      </section>

      {/* ============================================ */}
      {/* CONSOLIDATION ANIMATION SECTION */}
      {/* ============================================ */}
      <section ref={animationRef} className="relative py-24 px-6 bg-gradient-to-b from-[#0D1B2A] to-[#152238]">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
              From <span className="text-[#E97300]">Fragmented</span> to{" "}
              <span className="text-[#00A9E0]">Unified</span>
            </h2>
            <p className="text-white/60 text-lg max-w-2xl mx-auto">
              Watch how InfoShop consolidates multiple supplier webshops into one powerful digital catalog
            </p>
          </motion.div>

          {/* Animation Area */}
          <div className="relative min-h-[700px] flex items-center justify-center">
            {/* Supplier Grid */}
            <div className="absolute inset-0 flex flex-wrap items-center justify-center gap-4 md:gap-6 p-4 md:p-8">
              {SUPPLIERS.map((supplier, index) => (
                <SupplierCard
                  key={supplier.name}
                  supplier={supplier}
                  index={index}
                  isAnimating={isAnimating}
                  targetPosition={targetPosition}
                />
              ))}
            </div>

            {/* Central Hub */}
            <div ref={hubRef} className="relative z-10">
              <InfoShopHub 
                isActive={animationComplete} 
                supplierCount={SUPPLIERS.length}
              />
            </div>

            {/* Animation Controls */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-4">
              {!isAnimating && !animationComplete && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <Button
                    onClick={startAnimation}
                    size="lg"
                    className="bg-[#E97300] hover:bg-[#D66900] text-white font-semibold shadow-lg rounded-xl"
                  >
                    <Play className="w-5 h-5 mr-2" />
                    Start Consolidation
                  </Button>
                </motion.div>
              )}
              
              {animationComplete && !showCTA && (
                <Button
                  onClick={resetAnimation}
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10"
                >
                  Replay Animation
                </Button>
              )}
            </div>

            {/* Enter Catalog CTA */}
            <AnimatePresence>
              {showCTA && (
                <motion.div
                  initial={{ opacity: 0, y: 30, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3"
                >
                  <Button
                    onClick={onEnterCatalog}
                    size="lg"
                    className="bg-gradient-to-r from-[#007ABF] to-[#00A9E0] hover:from-[#006AA3] hover:to-[#0095C7] text-white font-bold px-12 py-7 text-lg shadow-xl shadow-[#007ABF]/40 rounded-xl"
                  >
                    <CheckCircle className="w-6 h-6 mr-2" />
                    Enter InfoShop Catalog
                    <ArrowRight className="w-6 h-6 ml-2" />
                  </Button>
                  <button 
                    onClick={resetAnimation}
                    className="text-white/50 hover:text-white/80 text-sm underline"
                  >
                    Watch again
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* STATS SECTION */}
      {/* ============================================ */}
      <section className="py-20 px-6 bg-[#152238]">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Enterprise Scale. <span className="text-[#00A9E0]">Simplified.</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <StatCard icon={Building2} value="26+" label="Partner Suppliers" delay={0} />
            <StatCard icon={ShoppingCart} value="3M+" label="Products Available" delay={0.1} />
            <StatCard icon={Globe2} value="4" label="Global Regions" delay={0.2} />
            <StatCard icon={TrendingDown} value="15-25%" label="Average Savings" delay={0.3} />
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* VALUE PROPS */}
      {/* ============================================ */}
      <section className="py-20 px-6 bg-gradient-to-b from-[#152238] to-[#0D1B2A]">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Zap,
                title: "Instant Access",
                description: "One login. One catalog. Millions of products from trusted suppliers worldwide."
              },
              {
                icon: TrendingDown,
                title: "Maximized Savings",
                description: "Benefit from Infosys-negotiated discounts and transparent Danone Preferred Pricing."
              },
              {
                icon: Shield,
                title: "Enterprise Ready",
                description: "Coupa PunchOut enabled. Zero training required. SOC2 compliant security."
              }
            ].map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 hover:border-[#007ABF]/50 transition-all hover:transform hover:-translate-y-1"
              >
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#007ABF] to-[#00A9E0] flex items-center justify-center mb-6 shadow-lg">
                  <item.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                <p className="text-white/60 leading-relaxed">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* FINAL CTA */}
      {/* ============================================ */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative rounded-3xl overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#007ABF] to-[#00A9E0]" />
            <div className="absolute inset-0 opacity-20" style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
              backgroundSize: '30px 30px'
            }} />
            
            <div className="relative px-8 py-16 md:px-16 text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Ready to Simplify Your Procurement?
              </h2>
              <p className="text-white/80 text-lg mb-8 max-w-2xl mx-auto">
                Join leading enterprises who've consolidated their supplier complexity into one streamlined catalog experience.
              </p>
              <Button
                onClick={onEnterCatalog}
                size="lg"
                className="bg-white text-[#007ABF] hover:bg-white/90 font-bold px-12 py-6 text-lg shadow-xl rounded-xl"
              >
                Start Browsing Now
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============================================ */}
      {/* FOOTER */}
      {/* ============================================ */}
      <footer className="py-12 px-6 border-t border-white/10 bg-[#0D1B2A]">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <img src={OMNISUPPLY_LOGO} alt="OMNISupply.io" className="h-8" />
              <div className="text-white/40 text-sm">
                InfoShop Digital Catalog
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-white/40 text-sm">Powered by</span>
              <div className="bg-white rounded-lg px-2 py-1">
                <img src={INFOSYS_BPM_LOGO} alt="Infosys BPM" className="h-5" />
              </div>
            </div>
            <div className="text-white/40 text-sm">
              © {new Date().getFullYear()} Infosys Limited. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default InfoShopLandingPage;

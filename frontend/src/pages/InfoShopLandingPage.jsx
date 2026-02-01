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
  CheckCircle,
  Play,
  ChevronDown,
  Folder,
  File,
  FileBox,
  Package,
  Boxes
} from "lucide-react";
import { Button } from "../components/ui/button";

// ============================================
// BRAND ASSETS
// ============================================
const OMNISUPPLY_LOGO = "https://customer-assets.emergentagent.com/job_3d3497d4-96ce-45f6-9a33-f8d277c4c70e/artifacts/tt4qnc6b_OMNISupply.png";
const INFOSYS_BPM_LOGO = "https://customer-assets.emergentagent.com/job_3d3497d4-96ce-45f6-9a33-f8d277c4c70e/artifacts/i0gp8i5o_InfosysBPM.png";

// Supplier data
const SUPPLIERS = [
  { name: "Grainger", color: "#C8102E", abbr: "GR" },
  { name: "MOTION", color: "#003087", abbr: "MO" },
  { name: "BDI", color: "#1E3A8A", abbr: "BD" },
  { name: "Fastenal", color: "#00843D", abbr: "FA" },
  { name: "Donaldson", color: "#0033A0", abbr: "DO" },
  { name: "Avantor", color: "#6B2D5B", abbr: "AV" },
  { name: "MARKEM", color: "#FF6600", abbr: "MK" },
  { name: "VideoJet", color: "#00529B", abbr: "VJ" },
  { name: "Sonepar", color: "#E4002B", abbr: "SP" },
  { name: "Cromwell", color: "#ED1C24", abbr: "CW" },
  { name: "NorthSky", color: "#C41E3A", abbr: "NS" },
  { name: "ProPay", color: "#4A90D9", abbr: "PP" },
];

// ============================================
// FILE DOCUMENT COMPONENT
// ============================================
const FileDocument = ({ supplier, index, phase, totalCount }) => {
  // Scattered positions around the left and top
  const getScatteredPosition = (idx) => {
    const positions = [
      { x: -380, y: -200 }, { x: -420, y: -80 }, { x: -360, y: 40 },
      { x: -400, y: 160 }, { x: -280, y: -160 }, { x: -320, y: 20 },
      { x: -260, y: 120 }, { x: -180, y: -120 }, { x: -220, y: 80 },
      { x: -140, y: -60 }, { x: -100, y: 60 }, { x: -160, y: 180 },
    ];
    return positions[idx % positions.length];
  };

  const startPos = getScatteredPosition(index);
  const dropDelay = index * 0.12;
  const rotationVariance = -8 + (index % 5) * 4;

  return (
    <motion.div
      initial={{ 
        x: startPos.x, 
        y: startPos.y, 
        opacity: 0, 
        scale: 0.6,
        rotate: rotationVariance
      }}
      animate={
        phase === "scattered"
          ? { 
              x: startPos.x, 
              y: startPos.y, 
              opacity: 1, 
              scale: 1,
              rotate: rotationVariance,
              transition: { 
                delay: index * 0.06, 
                duration: 0.5, 
                type: "spring",
                stiffness: 120
              }
            }
          : phase === "dropping"
          ? {
              x: 60 + (index % 3) * 8,
              y: 20,
              opacity: 0,
              scale: 0.15,
              rotate: 0,
              transition: { 
                delay: dropDelay, 
                duration: 0.7, 
                ease: [0.32, 0.72, 0, 1],
                opacity: { delay: dropDelay + 0.5, duration: 0.2 }
              }
            }
          : { 
              x: startPos.x, 
              y: startPos.y, 
              opacity: 0, 
              scale: 0.5 
            }
      }
      className="absolute"
      style={{ zIndex: totalCount - index }}
    >
      {/* File Document Design */}
      <div className="relative">
        {/* Shadow */}
        <div 
          className="absolute inset-0 bg-black/20 rounded-lg blur-md transform translate-y-2"
          style={{ width: '90px', height: '110px' }}
        />
        
        {/* File body */}
        <div 
          className="relative bg-white rounded-lg shadow-xl overflow-hidden border border-gray-100"
          style={{ width: '90px', height: '110px' }}
        >
          {/* Folded corner */}
          <div className="absolute top-0 right-0">
            <svg width="20" height="20" viewBox="0 0 20 20">
              <path d="M0 0 L20 0 L20 20 Z" fill="#f1f5f9" />
              <path d="M0 0 L20 20 L0 20 Z" fill="#e2e8f0" />
            </svg>
          </div>
          
          {/* Content */}
          <div className="p-2.5 h-full flex flex-col">
            {/* Icon & Brand */}
            <div 
              className="w-full h-12 rounded flex items-center justify-center mb-2"
              style={{ backgroundColor: `${supplier.color}15` }}
            >
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                style={{ backgroundColor: supplier.color }}
              >
                {supplier.abbr}
              </div>
            </div>
            
            {/* Fake lines */}
            <div className="flex-1 space-y-1.5">
              <div className="h-1.5 bg-gray-100 rounded w-full" />
              <div className="h-1.5 bg-gray-100 rounded w-4/5" />
              <div className="h-1.5 bg-gray-100 rounded w-3/4" />
            </div>
            
            {/* Vendor name */}
            <div 
              className="text-center text-[9px] font-bold mt-auto py-1 rounded text-white"
              style={{ backgroundColor: supplier.color }}
            >
              {supplier.name}
            </div>
          </div>
        </div>
        
        {/* File icon badge */}
        <div 
          className="absolute -top-1.5 -left-1.5 w-6 h-6 rounded-full flex items-center justify-center shadow-md border-2 border-white"
          style={{ backgroundColor: supplier.color }}
        >
          <File className="w-3 h-3 text-white" />
        </div>
      </div>
    </motion.div>
  );
};

// ============================================
// INFOSHOP FOLDER COMPONENT
// ============================================
const InfoShopFolder = ({ isReceiving, itemsCount }) => {
  return (
    <motion.div 
      className="relative"
      animate={isReceiving ? { scale: [1, 1.02, 1] } : { scale: 1 }}
      transition={{ duration: 0.4, repeat: isReceiving ? Infinity : 0 }}
    >
      {/* Glow effect */}
      <AnimatePresence>
        {isReceiving && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.15, 1] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="absolute inset-0 rounded-3xl"
            style={{
              background: 'radial-gradient(circle, rgba(0,122,191,0.5) 0%, transparent 70%)',
              filter: 'blur(30px)',
            }}
          />
        )}
      </AnimatePresence>

      {/* Main Folder */}
      <div className="relative w-72 h-52 md:w-80 md:h-56">
        {/* Folder Back Panel */}
        <div 
          className="absolute inset-0 rounded-2xl shadow-2xl"
          style={{ background: 'linear-gradient(135deg, #0077B6 0%, #005A8C 100%)' }}
        >
          {/* Folder Tab */}
          <div 
            className="absolute -top-5 left-8 w-28 h-6 rounded-t-xl"
            style={{ background: 'linear-gradient(90deg, #0090D9 0%, #007ABF 100%)' }}
          />
        </div>
        
        {/* Folder Front Panel (opening effect) */}
        <motion.div 
          className="absolute inset-x-0 bottom-0 h-[88%] rounded-b-2xl rounded-t-lg overflow-hidden"
          style={{ 
            background: 'linear-gradient(135deg, #0090D9 0%, #0077B6 100%)',
            transformOrigin: 'bottom'
          }}
          animate={isReceiving ? { rotateX: -8 } : { rotateX: 0 }}
        >
          {/* Inner content area */}
          <div className="absolute inset-3 bg-white/10 rounded-xl backdrop-blur-sm flex flex-col items-center justify-center p-4">
            {/* OMNISupply Logo */}
            <img 
              src={OMNISUPPLY_LOGO} 
              alt="OMNISupply.io" 
              className="h-10 md:h-12 mb-3"
            />
            
            {/* InfoShop badge */}
            <div className="flex items-center gap-2 mb-2">
              <div className="w-10 h-px bg-white/40" />
              <span className="text-white text-sm font-semibold tracking-[0.15em] uppercase">
                InfoShop
              </span>
              <div className="w-10 h-px bg-white/40" />
            </div>
            
            <span className="text-white/60 text-xs tracking-wide">
              Digital Catalog
            </span>
            
            {/* Counter */}
            <AnimatePresence>
              {itemsCount > 0 && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="mt-4 bg-white text-[#007ABF] px-5 py-2 rounded-full shadow-lg"
                >
                  <span className="font-bold text-sm">{itemsCount} Suppliers</span>
                  <span className="text-xs ml-1 text-gray-500">Unified</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
        
        {/* Folder icon */}
        <div className="absolute -top-1 right-6 bg-white rounded-full p-2 shadow-lg">
          <Folder className="w-5 h-5 text-[#007ABF]" />
        </div>
        
        {/* Boxes icon for consolidation concept */}
        <div className="absolute -bottom-3 -right-3 bg-[#E97300] rounded-full p-2.5 shadow-lg border-2 border-white">
          <Boxes className="w-5 h-5 text-white" />
        </div>
      </div>
    </motion.div>
  );
};

// ============================================
// STAT CARD
// ============================================
const StatCard = ({ icon: Icon, value, label, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5 }}
    viewport={{ once: true }}
    className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 hover:bg-white/10 transition-all hover:-translate-y-1"
  >
    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#007ABF] to-[#00A9E0] flex items-center justify-center mb-4 shadow-lg">
      <Icon className="w-6 h-6 text-white" />
    </div>
    <div className="text-3xl font-bold text-white mb-1">{value}</div>
    <div className="text-white/50 text-sm">{label}</div>
  </motion.div>
);

// ============================================
// MAIN LANDING PAGE
// ============================================
const InfoShopLandingPage = ({ onEnterCatalog }) => {
  const [animationPhase, setAnimationPhase] = useState("idle");
  const [itemsReceived, setItemsReceived] = useState(0);
  const animationRef = useRef(null);
  const [hasAnimated, setHasAnimated] = useState(false);

  const startAnimation = () => {
    if (animationPhase !== "idle") return;
    
    setAnimationPhase("scattered");
    setItemsReceived(0);
    
    // After files appear, start the drop animation
    setTimeout(() => {
      setAnimationPhase("dropping");
      
      // Increment counter as items drop
      SUPPLIERS.forEach((_, i) => {
        setTimeout(() => {
          setItemsReceived(prev => prev + 1);
        }, i * 120 + 300);
      });
    }, 1200);
  };

  const handleDropComplete = () => {
    setTimeout(() => {
      setAnimationPhase("complete");
      setHasAnimated(true);
    }, SUPPLIERS.length * 120 + 600);
  };

  // Auto-trigger animation when section is in view
  useEffect(() => {
    if (animationPhase === "dropping") {
      handleDropComplete();
    }
  }, [animationPhase]);

  const resetAnimation = () => {
    setAnimationPhase("idle");
    setItemsReceived(0);
    setTimeout(startAnimation, 300);
  };

  const scrollToAnimation = () => {
    animationRef.current?.scrollIntoView({ behavior: 'smooth' });
    setTimeout(startAnimation, 500);
  };

  return (
    <div className="min-h-screen bg-[#0a1628] overflow-x-hidden">
      {/* ============================================ */}
      {/* HERO SECTION */}
      {/* ============================================ */}
      <section className="relative min-h-screen flex flex-col">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a1628] via-[#0f2847] to-[#0a1628]" />
          <div 
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `radial-gradient(circle at 25% 25%, rgba(0,122,191,0.4) 0%, transparent 50%),
                               radial-gradient(circle at 75% 75%, rgba(233,115,0,0.3) 0%, transparent 50%)`,
            }}
          />
          {/* Subtle grid */}
          <div 
            className="absolute inset-0 opacity-[0.02]" 
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), 
                               linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)`,
              backgroundSize: '80px 80px'
            }} 
          />
        </div>

        {/* Header */}
        <header className="relative z-10 px-6 py-5">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-5">
              <img src={OMNISUPPLY_LOGO} alt="OMNISupply.io" className="h-10 md:h-12" />
              <div className="hidden sm:flex items-center gap-2 border-l border-white/20 pl-5">
                <div className="w-6 h-0.5 bg-[#00A9E0] rounded" />
                <span className="text-white/70 text-sm font-medium tracking-wider">InfoShop</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="hidden md:block text-white/30 text-xs uppercase tracking-wider">Powered by</span>
              <div className="bg-white rounded-xl px-3 py-2 shadow-lg">
                <img src={INFOSYS_BPM_LOGO} alt="Infosys BPM" className="h-6 md:h-7" />
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
            {/* Top Badge */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-[#007ABF]/20 to-[#00A9E0]/20 backdrop-blur-sm px-6 py-3 rounded-full mb-10 border border-[#007ABF]/30"
            >
              <Globe2 className="w-5 h-5 text-[#00A9E0]" />
              <span className="text-white/90 text-sm font-medium">Global Digital One Stop Shop</span>
            </motion.div>
            
            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-8 leading-tight">
              <span className="text-white">You Deal with </span>
              <span className="bg-gradient-to-r from-[#00A9E0] to-[#007ABF] bg-clip-text text-transparent">One</span>
              <br className="hidden sm:block" />
              <span className="text-white">We Deal with </span>
              <span className="text-[#E97300]">Many</span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg md:text-xl text-white/50 max-w-3xl mx-auto mb-12 leading-relaxed">
              Consolidate <span className="text-[#00A9E0] font-semibold">hundreds of supplier catalogs</span> into 
              one unified platform. <span className="text-white/70">Simplify procurement. Maximize savings.</span>
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
              <Button 
                onClick={scrollToAnimation}
                size="lg"
                className="group bg-gradient-to-r from-[#007ABF] to-[#00A9E0] hover:from-[#006AA3] hover:to-[#0095C7] text-white font-semibold px-8 py-6 text-lg shadow-xl shadow-[#007ABF]/20 rounded-xl transition-all hover:shadow-2xl hover:shadow-[#007ABF]/30"
              >
                <Play className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                Watch the Magic
              </Button>
              <Button 
                onClick={onEnterCatalog}
                size="lg"
                className="bg-[#E97300] hover:bg-[#D66900] text-white font-semibold px-8 py-6 text-lg rounded-xl shadow-xl shadow-[#E97300]/20"
              >
                Enter Catalog
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap items-center justify-center gap-8 text-white/40 text-sm">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#00A9E0]" />
                <span>Enterprise Security</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-[#E97300]" />
                <span>Coupa PunchOut</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-green-400" />
                <span>15-25% Average Savings</span>
              </div>
            </div>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div 
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute bottom-8 cursor-pointer"
            onClick={scrollToAnimation}
          >
            <ChevronDown className="w-8 h-8 text-white/20" />
          </motion.div>
        </div>
      </section>

      {/* ============================================ */}
      {/* ANIMATION SECTION */}
      {/* ============================================ */}
      <section 
        ref={animationRef} 
        className="relative py-28 px-6 bg-gradient-to-b from-[#0a1628] via-[#0f2847] to-[#0a1628] overflow-hidden"
      >
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-5">
              Multiple Catalogs <span className="text-[#E97300]">→</span> One Platform
            </h2>
            <p className="text-white/40 text-lg max-w-2xl mx-auto">
              Watch how supplier files consolidate into the InfoShop folder
            </p>
          </motion.div>

          {/* Animation Container */}
          <div className="relative h-[520px] md:h-[560px] flex items-center justify-center">
            {/* File Documents */}
            {SUPPLIERS.map((supplier, index) => (
              <FileDocument
                key={supplier.name}
                supplier={supplier}
                index={index}
                phase={animationPhase}
                totalCount={SUPPLIERS.length}
              />
            ))}

            {/* InfoShop Folder - Positioned right of center */}
            <div className="relative z-20" style={{ marginLeft: '140px' }}>
              <InfoShopFolder 
                isReceiving={animationPhase === "dropping"} 
                itemsCount={itemsReceived}
              />
            </div>

            {/* Arrow indicator during scattered phase */}
            <AnimatePresence>
              {animationPhase === "scattered" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, x: [0, 15, 0] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="absolute left-1/2 top-1/2 -translate-y-1/2 -translate-x-16 text-white/20"
                >
                  <ArrowRight className="w-14 h-14" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Controls */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4">
              {animationPhase === "idle" && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Button
                    onClick={startAnimation}
                    size="lg"
                    className="bg-[#E97300] hover:bg-[#D66900] text-white font-semibold shadow-xl rounded-xl px-8"
                  >
                    <Play className="w-5 h-5 mr-2" />
                    Start Consolidation
                  </Button>
                </motion.div>
              )}
              
              {animationPhase === "complete" && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center gap-4"
                >
                  <Button
                    onClick={onEnterCatalog}
                    size="lg"
                    className="bg-gradient-to-r from-[#007ABF] to-[#00A9E0] hover:from-[#006AA3] hover:to-[#0095C7] text-white font-bold px-12 py-6 text-lg shadow-2xl shadow-[#007ABF]/30 rounded-xl"
                  >
                    <CheckCircle className="w-6 h-6 mr-2" />
                    Enter InfoShop Catalog
                  </Button>
                  <button 
                    onClick={resetAnimation}
                    className="text-white/30 hover:text-white/60 text-sm transition-colors"
                  >
                    Watch again
                  </button>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* STATS SECTION */}
      {/* ============================================ */}
      <section className="py-20 px-6 bg-[#0f2847]">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <StatCard icon={Building2} value="26+" label="Partner Suppliers" delay={0} />
            <StatCard icon={Package} value="3M+" label="Products Available" delay={0.1} />
            <StatCard icon={Globe2} value="4" label="Global Regions" delay={0.2} />
            <StatCard icon={TrendingDown} value="17%" label="Average Savings" delay={0.3} />
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* VALUE PROPS */}
      {/* ============================================ */}
      <section className="py-20 px-6 bg-gradient-to-b from-[#0f2847] to-[#0a1628]">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { 
                icon: Zap, 
                title: "One Login", 
                description: "Access millions of products from trusted suppliers worldwide through a single portal." 
              },
              { 
                icon: TrendingDown, 
                title: "Real Savings", 
                description: "Infosys-negotiated discounts with transparent Danone Preferred Pricing on every item." 
              },
              { 
                icon: Shield, 
                title: "Enterprise Ready", 
                description: "Coupa PunchOut enabled. SOC2 compliant. Seamless integration with zero training." 
              }
            ].map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white/[0.03] backdrop-blur-sm rounded-2xl p-8 border border-white/5 hover:border-[#007ABF]/30 transition-all hover:-translate-y-2"
              >
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#007ABF] to-[#00A9E0] flex items-center justify-center mb-6 shadow-lg shadow-[#007ABF]/20">
                  <item.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                <p className="text-white/40 leading-relaxed">{item.description}</p>
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
            className="relative rounded-3xl overflow-hidden shadow-2xl"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#007ABF] to-[#00A9E0]" />
            <div className="relative px-8 py-20 md:px-16 text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-5">
                Ready to Simplify Procurement?
              </h2>
              <p className="text-white/80 text-lg mb-10 max-w-2xl mx-auto">
                Join enterprises saving 15-25% with consolidated supplier catalogs and transparent pricing.
              </p>
              <Button
                onClick={onEnterCatalog}
                size="lg"
                className="bg-white text-[#007ABF] hover:bg-white/90 font-bold px-12 py-6 text-lg shadow-xl rounded-xl"
              >
                Start Browsing
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============================================ */}
      {/* FOOTER */}
      {/* ============================================ */}
      <footer className="py-12 px-6 border-t border-white/5 bg-[#0a1628]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <img src={OMNISUPPLY_LOGO} alt="OMNISupply.io" className="h-8" />
            <span className="text-white/20 text-sm">InfoShop Digital Catalog</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-white/20 text-sm">Powered by</span>
            <div className="bg-white rounded-lg px-2 py-1">
              <img src={INFOSYS_BPM_LOGO} alt="Infosys BPM" className="h-5" />
            </div>
          </div>
          <div className="text-white/20 text-sm">
            © {new Date().getFullYear()} Infosys Limited
          </div>
        </div>
      </footer>
    </div>
  );
};

export default InfoShopLandingPage;

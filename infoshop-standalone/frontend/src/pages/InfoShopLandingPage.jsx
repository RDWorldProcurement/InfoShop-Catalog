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

// Infosys BPM Brand Colors
const BRAND = {
  primary: "#007ABF",      // Infosys Blue
  secondary: "#00A9E0",    // Light Blue
  accent: "#E97300",       // Orange
  dark: "#1A1A2E",         // Dark Navy
  gradient: "linear-gradient(135deg, #007ABF 0%, #00A9E0 50%, #007ABF 100%)",
};

// Supplier Data with colors for animation
const SUPPLIERS = [
  { name: "Grainger", color: "#C8102E", short: "GR" },
  { name: "MOTION", color: "#003087", short: "MO" },
  { name: "BDI", color: "#1E3A8A", short: "BD" },
  { name: "Fastenal", color: "#00843D", short: "FA" },
  { name: "Donaldson", color: "#0033A0", short: "DO" },
  { name: "Avantor", color: "#6B2D5B", short: "AV" },
  { name: "MARKEM", color: "#FF6600", short: "MK" },
  { name: "VideoJet", color: "#00529B", short: "VJ" },
  { name: "Sonepar", color: "#E4002B", short: "SO" },
  { name: "Cromwell", color: "#ED1C24", short: "CR" },
  { name: "NorthSky", color: "#C41E3A", short: "NS" },
  { name: "ProPay", color: "#4A90D9", short: "PP" },
];

// Animated Supplier Box Component
const SupplierBox = ({ supplier, index, isAnimating, onAnimationComplete }) => {
  const [isConsolidated, setIsConsolidated] = useState(false);
  
  useEffect(() => {
    if (isAnimating) {
      const delay = index * 200 + Math.random() * 300;
      const timer = setTimeout(() => {
        setIsConsolidated(true);
        if (index === SUPPLIERS.length - 1) {
          setTimeout(onAnimationComplete, 500);
        }
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [isAnimating, index, onAnimationComplete]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
      animate={
        isConsolidated
          ? { 
              opacity: 0, 
              scale: 0.3, 
              x: `calc(50vw - ${(index % 4) * 120 + 60}px)`,
              y: `calc(50vh - ${Math.floor(index / 4) * 100 + 50}px)`,
              transition: { duration: 0.8, ease: "easeInOut" }
            }
          : { 
              opacity: 1, 
              scale: 1, 
              x: 0, 
              y: 0,
              transition: { delay: index * 0.1, duration: 0.5 }
            }
      }
      className="relative"
    >
      <div 
        className="w-24 h-24 md:w-28 md:h-28 rounded-xl shadow-lg flex flex-col items-center justify-center p-2 border-2 border-white/20 backdrop-blur-sm"
        style={{ backgroundColor: supplier.color }}
      >
        <span className="text-white font-bold text-lg md:text-xl">{supplier.short}</span>
        <span className="text-white/80 text-[10px] md:text-xs mt-1 text-center leading-tight">
          {supplier.name}
        </span>
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center">
          <ShoppingCart className="w-2.5 h-2.5 text-slate-600" />
        </div>
      </div>
    </motion.div>
  );
};

// InfoShop Central Hub Component
const InfoShopHub = ({ isActive, supplierCount }) => (
  <motion.div
    initial={{ scale: 0.8, opacity: 0.5 }}
    animate={
      isActive
        ? { scale: 1.1, opacity: 1, boxShadow: "0 0 60px rgba(0, 122, 191, 0.5)" }
        : { scale: 1, opacity: 1 }
    }
    transition={{ duration: 0.5 }}
    className="relative"
  >
    <div className="w-40 h-40 md:w-56 md:h-56 rounded-2xl bg-gradient-to-br from-[#007ABF] to-[#00A9E0] shadow-2xl flex flex-col items-center justify-center border-4 border-white/30">
      <Globe2 className="w-12 h-12 md:w-16 md:h-16 text-white mb-2" />
      <span className="text-white font-bold text-xl md:text-2xl">InfoShop</span>
      <span className="text-white/80 text-xs md:text-sm">Global Digital Catalog</span>
      {isActive && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -bottom-8 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold"
        >
          {supplierCount} Suppliers Consolidated
        </motion.div>
      )}
    </div>
    
    {/* Pulsing rings */}
    {isActive && (
      <>
        <motion.div
          animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 rounded-2xl border-4 border-[#007ABF]"
        />
        <motion.div
          animate={{ scale: [1, 1.8], opacity: [0.3, 0] }}
          transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
          className="absolute inset-0 rounded-2xl border-4 border-[#00A9E0]"
        />
      </>
    )}
  </motion.div>
);

// Stats Card Component
const StatCard = ({ icon: Icon, value, label, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5 }}
    viewport={{ once: true }}
    className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20"
  >
    <Icon className="w-8 h-8 text-[#E97300] mb-3" />
    <div className="text-3xl font-bold text-white mb-1">{value}</div>
    <div className="text-white/70 text-sm">{label}</div>
  </motion.div>
);

// Main Landing Page Component
const InfoShopLandingPage = ({ onEnterCatalog }) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [showCTA, setShowCTA] = useState(false);
  const animationRef = useRef(null);

  const startAnimation = () => {
    setIsAnimating(true);
  };

  const handleAnimationComplete = () => {
    setAnimationComplete(true);
    setTimeout(() => setShowCTA(true), 500);
  };

  const scrollToAnimation = () => {
    animationRef.current?.scrollIntoView({ behavior: 'smooth' });
    setTimeout(startAnimation, 500);
  };

  return (
    <div className="min-h-screen bg-[#1A1A2E] overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#1A1A2E] via-[#0D1B2A] to-[#1A1A2E]" />
          <motion.div
            animate={{ 
              backgroundPosition: ["0% 0%", "100% 100%"],
            }}
            transition={{ duration: 20, repeat: Infinity, repeatType: "reverse" }}
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: `radial-gradient(circle at 20% 50%, #007ABF 0%, transparent 50%), 
                               radial-gradient(circle at 80% 50%, #00A9E0 0%, transparent 50%)`,
              backgroundSize: "100% 100%",
            }}
          />
          {/* Floating particles */}
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-white/10 rounded-full"
              initial={{ 
                x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000), 
                y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800) 
              }}
              animate={{ 
                y: [null, Math.random() * -200],
                opacity: [0.1, 0.5, 0.1]
              }}
              transition={{ 
                duration: 5 + Math.random() * 5, 
                repeat: Infinity,
                delay: Math.random() * 2
              }}
            />
          ))}
        </div>

        {/* Header */}
        <header className="relative z-10 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-r from-[#007ABF] to-[#00A9E0] text-white px-5 py-2.5 rounded-xl font-bold text-2xl shadow-lg">
                InfoShop
              </div>
              <div className="hidden sm:block border-l border-white/20 pl-4">
                <p className="text-white/60 text-xs">Powered by</p>
                <p className="text-white font-semibold text-sm">Infosys BPM</p>
              </div>
            </div>
            <Button 
              onClick={onEnterCatalog}
              className="bg-[#E97300] hover:bg-[#D66900] text-white font-semibold px-6"
            >
              Enter Catalog
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </header>

        {/* Hero Content */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full mb-6 border border-white/20">
              <Globe2 className="w-4 h-4 text-[#00A9E0]" />
              <span className="text-white/80 text-sm">Global Digital One Stop Shop</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
              <span className="bg-gradient-to-r from-white via-[#00A9E0] to-white bg-clip-text text-transparent">
                You Deal with One
              </span>
              <br />
              <span className="text-[#E97300]">We Deal with Many</span>
            </h1>

            <p className="text-lg md:text-xl text-white/70 max-w-3xl mx-auto mb-8 leading-relaxed">
              InfoShop consolidates <span className="text-[#00A9E0] font-semibold">hundreds of supplier webshops</span> across 
              categories and geographies into <span className="text-white font-semibold">one unified digital catalog</span>. 
              Simplify procurement. Maximize savings. Zero complexity.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Button 
                onClick={scrollToAnimation}
                size="lg"
                className="bg-gradient-to-r from-[#007ABF] to-[#00A9E0] hover:from-[#006AA3] hover:to-[#0095C7] text-white font-semibold px-8 py-6 text-lg shadow-lg shadow-[#007ABF]/30"
              >
                <Play className="w-5 h-5 mr-2" />
                See How It Works
              </Button>
              <Button 
                onClick={onEnterCatalog}
                size="lg"
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10 px-8 py-6 text-lg"
              >
                Browse Catalog
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-white/50 text-sm">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span>Enterprise Security</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                <span>Coupa PunchOut Ready</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4" />
                <span>Guaranteed Savings</span>
              </div>
            </div>
          </motion.div>

          {/* Scroll Indicator */}
          <motion.div 
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute bottom-8 cursor-pointer"
            onClick={scrollToAnimation}
          >
            <ChevronDown className="w-8 h-8 text-white/50" />
          </motion.div>
        </div>
      </section>

      {/* Consolidation Animation Section */}
      <section ref={animationRef} className="relative min-h-screen py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              From <span className="text-[#E97300]">Fragmented</span> to{" "}
              <span className="text-[#00A9E0]">Unified</span>
            </h2>
            <p className="text-white/60 text-lg max-w-2xl mx-auto">
              Watch how InfoShop brings together multiple supplier webshops into one powerful platform
            </p>
          </motion.div>

          {/* Animation Container */}
          <div className="relative min-h-[600px] flex items-center justify-center">
            {/* Supplier Boxes - Scattered */}
            <div className="absolute inset-0 flex flex-wrap items-center justify-center gap-4 p-8">
              {SUPPLIERS.map((supplier, index) => (
                <SupplierBox
                  key={supplier.name}
                  supplier={supplier}
                  index={index}
                  isAnimating={isAnimating}
                  onAnimationComplete={handleAnimationComplete}
                />
              ))}
            </div>

            {/* Central InfoShop Hub */}
            <div className="relative z-10">
              <InfoShopHub 
                isActive={animationComplete} 
                supplierCount={SUPPLIERS.length}
              />
            </div>

            {/* Start Animation Button */}
            {!isAnimating && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute bottom-0 left-1/2 -translate-x-1/2"
              >
                <Button
                  onClick={startAnimation}
                  size="lg"
                  className="bg-[#E97300] hover:bg-[#D66900] text-white font-semibold shadow-lg"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Start Consolidation
                </Button>
              </motion.div>
            )}

            {/* Enter Catalog CTA */}
            <AnimatePresence>
              {showCTA && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute bottom-0 left-1/2 -translate-x-1/2"
                >
                  <Button
                    onClick={onEnterCatalog}
                    size="lg"
                    className="bg-gradient-to-r from-[#007ABF] to-[#00A9E0] hover:from-[#006AA3] hover:to-[#0095C7] text-white font-bold px-10 py-6 text-lg shadow-xl shadow-[#007ABF]/40"
                  >
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Enter InfoShop Catalog
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-6 bg-gradient-to-b from-transparent to-[#0D1B2A]">
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

      {/* Value Props Section */}
      <section className="py-20 px-6">
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
                className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 hover:border-[#007ABF]/50 transition-colors"
              >
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#007ABF] to-[#00A9E0] flex items-center justify-center mb-6">
                  <item.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                <p className="text-white/60">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative rounded-3xl overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#007ABF] to-[#00A9E0]" />
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzBoLTZWMGg2djMwem0tNiAwSDI0VjBoNnYzMHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-20" />
            
            <div className="relative px-8 py-16 md:px-16 text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Ready to Simplify Your Procurement?
              </h2>
              <p className="text-white/80 text-lg mb-8 max-w-2xl mx-auto">
                Join leading enterprises who've consolidated their supplier chaos into one streamlined catalog experience.
              </p>
              <Button
                onClick={onEnterCatalog}
                size="lg"
                className="bg-white text-[#007ABF] hover:bg-white/90 font-bold px-10 py-6 text-lg shadow-xl"
              >
                Start Browsing Now
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-r from-[#007ABF] to-[#00A9E0] text-white px-4 py-2 rounded-lg font-bold text-xl">
                InfoShop
              </div>
              <div className="text-white/40 text-sm">
                Global Digital One Stop Shop Catalog
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white/40 text-sm">Powered by</span>
              <span className="text-white font-semibold">Infosys BPM</span>
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

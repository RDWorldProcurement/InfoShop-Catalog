import { useNavigate } from "react-router-dom";
import { useAuth } from "../App";
import { useLanguage } from "../i18n/LanguageContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import {
  Package, Search, History, RefreshCw, Upload, Award, LogOut, User, Coins, Languages,
  FileUp, Handshake, Building2, Brain
} from "lucide-react";

// NavItem component moved outside Sidebar to prevent re-creation on each render
const NavItem = ({ icon: Icon, label, path, id, activePage, navigate, badge, badgeColor }) => {
  const isActive = activePage === id;
  return (
    <button
      onClick={() => navigate(path)}
      className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all ${
        isActive 
          ? 'bg-[#007CC3]/10 text-[#007CC3] font-semibold' 
          : 'text-slate-600 hover:bg-slate-100'
      }`}
      data-testid={`nav-${id}`}
    >
      <Icon className="w-5 h-5" />
      <span className="flex-1 text-left">{label}</span>
      {badge && (
        <span className={`text-xs px-2 py-0.5 rounded-full ${badgeColor || 'bg-[#007CC3]/10 text-[#007CC3]'}`}>
          {badge}
        </span>
      )}
    </button>
  );
};

const Sidebar = ({ activePage }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { t, language, changeLanguage, languageOptions, currency } = useLanguage();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <aside className="w-72 bg-white border-r border-slate-200 flex-shrink-0 h-screen sticky top-0 hidden lg:block overflow-y-auto">
      <div className="p-6 min-h-full flex flex-col">
        {/* Logo Section */}
        <div className="mb-8">
          <img 
            src="https://customer-assets.emergentagent.com/job_infosys-mro/artifacts/5v2g4s4l_Infosys%20BPM%20Logo.png" 
            alt="Infosys BPM"
            className="h-7 mb-4"
          />
          <div 
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate("/ai-agent")}
            title="Go to AI Procurement Agent"
          >
            <img 
              src="https://static.prod-images.emergentagent.com/jobs/d1a8d9bf-4869-463a-9b82-69772febaffb/images/5544120fa58b5db3f9b4ad8c6dafa2c32057f9ac5ad4be02779d98746bd4131d.png"
              alt="OMNISupply.io"
              className="w-12 h-12 object-contain"
            />
            <span className="font-bold text-lg text-slate-900" style={{ fontFamily: 'Manrope' }}>
              OMNI<span className="text-[#007CC3]">Supply</span>.io
            </span>
          </div>
        </div>

        {/* User Info */}
        <div className="mb-6 p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border border-slate-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 bg-[#007CC3]/10 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-[#007CC3]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-900 truncate">{user?.name}</p>
              <p className="text-xs text-slate-500">{user?.country} • {user?.currency?.code}</p>
            </div>
          </div>
          <div className="flex items-center justify-between bg-gradient-to-r from-amber-400 to-orange-400 text-white px-4 py-2.5 rounded-xl">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5" />
              <span className="font-bold text-lg">{user?.info_coins?.toLocaleString() || 0}</span>
            </div>
            <span className="text-xs opacity-90">InfoCoins</span>
          </div>
        </div>

        {/* Navigation - Main */}
        <nav className="space-y-1 flex-1">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 mb-2">Catalog</p>
          <NavItem icon={Search} label={t.nav.catalog} path="/catalog" id="catalog" activePage={activePage} navigate={navigate} />
          
          <div className="py-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 mb-2">Procurement</p>
            <NavItem 
              icon={Brain} 
              label="AI Procurement Agent" 
              path="/ai-agent" 
              id="ai-agent" 
              activePage={activePage} 
              navigate={navigate}
              badge="NEW"
              badgeColor="bg-gradient-to-r from-purple-500 to-blue-500 text-white"
            />
            <NavItem 
              icon={Brain} 
              label="AI Enabled Intelligent Buying" 
              path="/upload-quotation" 
              id="upload-quotation" 
              activePage={activePage} 
              navigate={navigate}
              badge="AI"
              badgeColor="bg-purple-100 text-purple-700"
            />
            <NavItem 
              icon={Handshake} 
              label="Managed Services" 
              path="/sourcing-support" 
              id="sourcing-support" 
              activePage={activePage} 
              navigate={navigate}
              badge="Buying Desk"
              badgeColor="bg-orange-100 text-orange-700"
            />
            <NavItem 
              icon={Building2} 
              label="Buying Desk Tracker" 
              path="/buying-desk" 
              id="buying-desk" 
              activePage={activePage} 
              navigate={navigate}
              badge="Track"
              badgeColor="bg-[#007CC3]/10 text-[#007CC3]"
            />
          </div>

          <div className="py-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 mb-2">Orders</p>
            <NavItem icon={History} label={t.nav.orders} path="/orders" id="orders" activePage={activePage} navigate={navigate} />
            <NavItem icon={RefreshCw} label={t.nav.repeatOrders} path="/repeat-orders" id="repeat-orders" activePage={activePage} navigate={navigate} />
            <NavItem icon={Upload} label={t.nav.bulkUpload} path="/bulk-upload" id="bulk-upload" activePage={activePage} navigate={navigate} />
          </div>

          <div className="py-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 mb-2">Rewards</p>
            <NavItem icon={Award} label={t.nav.rewards} path="/rewards" id="rewards" activePage={activePage} navigate={navigate} />
          </div>
        </nav>

        {/* Language & Currency Selector */}
        <div className="py-4 border-t border-slate-200">
          <div className="px-4 space-y-3">
            <div>
              <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                <Languages className="w-3 h-3" /> Language & Currency
              </p>
              <Select value={language} onValueChange={changeLanguage}>
                <SelectTrigger className="h-10 bg-slate-50 border-slate-200" data-testid="sidebar-language-selector">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languageOptions.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code} data-testid={`sidebar-lang-${lang.code}`}>
                      <span className="flex items-center gap-2">
                        <span>{lang.flag}</span>
                        <span>{lang.name}</span>
                        <span className="text-xs text-slate-400">({lang.currency})</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Currency Display */}
            <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg border border-slate-200">
              <span className="text-xs text-slate-500">Currency</span>
              <span className="font-semibold text-slate-700" data-testid="sidebar-currency-display">
                {currency.symbol} {currency.code}
              </span>
            </div>
          </div>
        </div>

        {/* Logout */}
        <div className="pt-4 border-t border-slate-200">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-colors"
            data-testid="sidebar-logout-btn"
          >
            <LogOut className="w-5 h-5" />
            <span>{t.nav.logout}</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

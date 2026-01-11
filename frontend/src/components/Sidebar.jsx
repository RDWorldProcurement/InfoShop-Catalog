import { useNavigate } from "react-router-dom";
import { useAuth } from "../App";
import { useLanguage } from "../i18n/LanguageContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import {
  Package, Search, History, RefreshCw, Upload, Award, LogOut, User, Coins, Languages
} from "lucide-react";

// NavItem component moved outside Sidebar to prevent re-creation on each render
const NavItem = ({ icon: Icon, label, path, id, activePage, navigate }) => {
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
      <span>{label}</span>
    </button>
  );
};

const Sidebar = ({ activePage }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { t, language, changeLanguage, languageOptions } = useLanguage();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <aside className="w-72 bg-white border-r border-slate-200 flex-shrink-0 min-h-screen hidden lg:block">
      <div className="p-6 h-full flex flex-col">
        {/* Logo Section */}
        <div className="mb-8">
          <img 
            src="https://customer-assets.emergentagent.com/job_infosys-mro/artifacts/5v2g4s4l_Infosys%20BPM%20Logo.png" 
            alt="Infosys BPM"
            className="h-7 mb-4"
          />
          <div 
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => navigate("/")}
          >
            <div className="w-10 h-10 bg-[#007CC3] rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
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

        {/* Navigation */}
        <nav className="space-y-1 flex-1">
          <NavItem icon={Search} label={t.nav.catalog} path="/catalog" id="catalog" activePage={activePage} navigate={navigate} />
          <NavItem icon={History} label={t.nav.orders} path="/orders" id="orders" activePage={activePage} navigate={navigate} />
          <NavItem icon={RefreshCw} label={t.nav.repeatOrders} path="/repeat-orders" id="repeat-orders" activePage={activePage} navigate={navigate} />
          <NavItem icon={Upload} label={t.nav.bulkUpload} path="/bulk-upload" id="bulk-upload" activePage={activePage} navigate={navigate} />
          <NavItem icon={Award} label={t.nav.rewards} path="/rewards" id="rewards" activePage={activePage} navigate={navigate} />
        </nav>

        {/* Language Selector */}
        <div className="py-4 border-t border-slate-200">
          <div className="px-4">
            <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
              <Languages className="w-3 h-3" /> Language
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
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

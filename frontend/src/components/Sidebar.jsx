import { useNavigate } from "react-router-dom";
import { useAuth } from "../App";
import { Button } from "./ui/button";
import {
  Package, Search, History, RefreshCw, Upload, Award, LogOut, User, Coins
} from "lucide-react";

const Sidebar = ({ activePage }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const NavItem = ({ icon: Icon, label, path, id }) => {
    const isActive = activePage === id;
    return (
      <button
        onClick={() => navigate(path)}
        className={`sidebar-nav-item w-full ${isActive ? 'active' : ''}`}
        data-testid={`nav-${id}`}
      >
        <Icon className="w-5 h-5" />
        <span>{label}</span>
      </button>
    );
  };

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex-shrink-0 min-h-screen">
      <div className="p-6">
        {/* Logo */}
        <div 
          className="flex items-center gap-3 mb-8 cursor-pointer"
          onClick={() => navigate("/")}
        >
          <div className="w-10 h-10 bg-[#007CC3] rounded-lg flex items-center justify-center">
            <Package className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-lg text-slate-900" style={{ fontFamily: 'Manrope' }}>
            OMNI<span className="text-[#007CC3]">Supply</span>
          </span>
        </div>

        {/* User Info */}
        <div className="mb-6 p-4 bg-slate-50 rounded-xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-[#007CC3]/10 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-[#007CC3]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-900 truncate">{user?.name}</p>
              <p className="text-xs text-slate-500">{user?.country}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <div className="infocoins-badge text-sm">
              <Coins className="w-4 h-4" />
              {user?.info_coins || 0}
            </div>
            <span className="text-xs text-slate-500">InfoCoins</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="space-y-1">
          <NavItem icon={Search} label="Catalog" path="/catalog" id="catalog" />
          <NavItem icon={History} label="Order History" path="/orders" id="orders" />
          <NavItem icon={RefreshCw} label="Repeat Orders" path="/repeat-orders" id="repeat-orders" />
          <NavItem icon={Upload} label="Bulk Upload" path="/bulk-upload" id="bulk-upload" />
          <NavItem icon={Award} label="InfoCoins" path="/rewards" id="rewards" />
        </nav>

        {/* Logout */}
        <div className="mt-8 pt-6 border-t border-slate-200">
          <button
            onClick={handleLogout}
            className="sidebar-nav-item w-full text-red-500 hover:bg-red-50"
            data-testid="sidebar-logout-btn"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

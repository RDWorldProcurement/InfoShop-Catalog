import { useState, useEffect, createContext, useContext } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";

// Pages
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import CatalogPage from "./pages/CatalogPage";
import OrderHistoryPage from "./pages/OrderHistoryPage";
import RepeatOrdersPage from "./pages/RepeatOrdersPage";
import BulkUploadPage from "./pages/BulkUploadPage";
import InfoCoinsPage from "./pages/InfoCoinsPage";
import AdminPortalPage from "./pages/AdminPortalPage";
import UploadQuotationPage from "./pages/UploadQuotationPage";
import SourcingSupportPage from "./pages/SourcingSupportPage";

// Components
import ChatBot from "./components/ChatBot";
import { Toaster } from "./components/ui/sonner";

// Language
import { LanguageProvider } from "./i18n/LanguageContext";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState(() => {
    const storedToken = localStorage.getItem("omnisupply_token");
    const storedUser = localStorage.getItem("omnisupply_user");
    if (storedToken && storedUser) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${storedToken}`;
      return { user: JSON.parse(storedUser), token: storedToken, loading: false };
    }
    return { user: null, token: null, loading: false };
  });

  const { user, token, loading } = authState;

  const login = async (email, password, country) => {
    const response = await axios.post(`${API}/auth/login`, { email, password, country });
    const userData = response.data;
    localStorage.setItem("omnisupply_token", userData.token);
    localStorage.setItem("omnisupply_user", JSON.stringify(userData));
    axios.defaults.headers.common["Authorization"] = `Bearer ${userData.token}`;
    setAuthState({ user: userData, token: userData.token, loading: false });
    return userData;
  };

  const logout = () => {
    localStorage.removeItem("omnisupply_token");
    localStorage.removeItem("omnisupply_user");
    delete axios.defaults.headers.common["Authorization"];
    setAuthState({ user: null, token: null, loading: false });
  };

  const updateCoins = (newBalance) => {
    if (user) {
      const updatedUser = { ...user, info_coins: newBalance };
      setAuthState(prev => ({ ...prev, user: updatedUser }));
      localStorage.setItem("omnisupply_user", JSON.stringify(updatedUser));
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, updateCoins }}>
      {children}
    </AuthContext.Provider>
  );
};

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#007CC3] border-t-transparent"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <div className="App min-h-screen bg-[#F8F9FA]">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/catalog"
                element={
                  <ProtectedRoute>
                    <CatalogPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/orders"
                element={
                  <ProtectedRoute>
                    <OrderHistoryPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/repeat-orders"
                element={
                  <ProtectedRoute>
                    <RepeatOrdersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/bulk-upload"
                element={
                  <ProtectedRoute>
                    <BulkUploadPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/rewards"
                element={
                  <ProtectedRoute>
                    <InfoCoinsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/upload-quotation"
                element={
                  <ProtectedRoute>
                    <UploadQuotationPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sourcing-support"
                element={
                  <ProtectedRoute>
                    <SourcingSupportPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/admin" element={<AdminPortalPage />} />
            </Routes>
            <ChatBot />
            <Toaster position="top-right" richColors />
          </div>
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}

export default App;

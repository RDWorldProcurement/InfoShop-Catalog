import React, { useState } from 'react';
import { Toaster } from 'sonner';
import InfoShopLandingPage from './pages/InfoShopLandingPage';
import InfoShopCatalog from './pages/InfoShopCatalog';
import './index.css';

function App() {
  const [showCatalog, setShowCatalog] = useState(false);

  // Check URL for direct catalog access or PunchOut
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('punchout_session') || params.get('session') || params.get('catalog')) {
      setShowCatalog(true);
    }
  }, []);

  if (showCatalog) {
    return (
      <div className="min-h-screen bg-slate-50">
        <InfoShopCatalog />
        <Toaster position="top-right" richColors />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <InfoShopLandingPage onEnterCatalog={() => setShowCatalog(true)} />
      <Toaster position="top-right" richColors />
    </div>
  );
}

export default App;

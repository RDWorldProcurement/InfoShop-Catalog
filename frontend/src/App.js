import React, { useState, useEffect, useCallback } from 'react';
import { Toaster } from 'sonner';
import InfoShopLandingPage from './pages/InfoShopLandingPage';
import InfoShopCatalog from './pages/InfoShopCatalog';
import './index.css';

function App() {
  const [showCatalog, setShowCatalog] = useState(false);
  const [punchoutSession, setPunchoutSession] = useState(null);

  // Check URL for direct catalog access or PunchOut on initial load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isPunchout = params.get('punchout_session') || params.get('session');
    const isCatalog = params.get('catalog') === 'true';
    
    if (isPunchout) {
      // PunchOut mode - user coming from Coupa SSO
      setShowCatalog(true);
      setPunchoutSession({
        token: isPunchout,
        sso: true
      });
    } else if (isCatalog) {
      // Direct catalog access
      setShowCatalog(true);
    }
  }, []);

  // Update URL when entering catalog (persist state for refresh)
  const handleEnterCatalog = useCallback(() => {
    setShowCatalog(true);
    // Update URL to persist catalog state
    const url = new URL(window.location.href);
    url.searchParams.set('catalog', 'true');
    window.history.pushState({}, '', url.toString());
  }, []);

  // Handle going back to landing page
  const handleBackToLanding = useCallback(() => {
    setShowCatalog(false);
    // Remove catalog param from URL
    const url = new URL(window.location.href);
    url.searchParams.delete('catalog');
    window.history.pushState({}, '', url.toString());
  }, []);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const isPunchout = params.get('punchout_session') || params.get('session');
      const isCatalog = params.get('catalog') === 'true';
      
      setShowCatalog(isPunchout || isCatalog);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  if (showCatalog) {
    return (
      <div className="min-h-screen bg-slate-50">
        <InfoShopCatalog 
          punchoutSessionData={punchoutSession}
          onBackToLanding={handleBackToLanding}
        />
        <Toaster position="top-right" richColors />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <InfoShopLandingPage onEnterCatalog={handleEnterCatalog} />
      <Toaster position="top-right" richColors />
    </div>
  );
}

export default App;

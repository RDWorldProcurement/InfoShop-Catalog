import React from 'react';
import { Toaster } from 'sonner';
import InfoShopCatalog from './pages/InfoShopCatalog';
import './index.css';

function App() {
  return (
    <div className="min-h-screen bg-slate-100">
      <InfoShopCatalog />
      <Toaster position="top-right" richColors />
    </div>
  );
}

export default App;

import { createContext, useContext, useState, useEffect } from 'react';
import { translations, languageOptions } from './translations';

const LanguageContext = createContext(null);

export const useLanguage = () => useContext(LanguageContext);

// Currency mapping based on language/region
// EUR: French, German, Italian, Dutch, Spanish (Spain)
// MXN: Spanish (Mexico)
// USD: English (default)
const LANGUAGE_CURRENCY_MAP = {
  'en': { code: 'USD', symbol: '$', name: 'US Dollar', rate: 1.0 },
  'fr': { code: 'EUR', symbol: '€', name: 'Euro', rate: 0.92 },
  'de': { code: 'EUR', symbol: '€', name: 'Euro', rate: 0.92 },
  'it': { code: 'EUR', symbol: '€', name: 'Euro', rate: 0.92 },
  'nl': { code: 'EUR', symbol: '€', name: 'Euro', rate: 0.92 },
  'es-ES': { code: 'EUR', symbol: '€', name: 'Euro', rate: 0.92 },
  'es-MX': { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso', rate: 17.15 },
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('omnisupply_lang');
    return saved || 'en';
  });

  const [currency, setCurrency] = useState(() => {
    const savedLang = localStorage.getItem('omnisupply_lang') || 'en';
    return LANGUAGE_CURRENCY_MAP[savedLang] || LANGUAGE_CURRENCY_MAP['en'];
  });

  useEffect(() => {
    localStorage.setItem('omnisupply_lang', language);
    // Update currency when language changes
    const newCurrency = LANGUAGE_CURRENCY_MAP[language] || LANGUAGE_CURRENCY_MAP['en'];
    setCurrency(newCurrency);
  }, [language]);

  const t = translations[language] || translations[language.split('-')[0]] || translations.en;
  
  const changeLanguage = (lang) => {
    if (translations[lang] || translations[lang.split('-')[0]]) {
      setLanguage(lang);
    }
  };

  // Helper function to format price with correct currency
  const formatPrice = (price, options = {}) => {
    const { showCode = false } = options;
    const convertedPrice = (price * currency.rate).toFixed(2);
    if (showCode) {
      return `${currency.symbol}${convertedPrice} ${currency.code}`;
    }
    return `${currency.symbol}${convertedPrice}`;
  };

  // Helper to convert price (for API calls that need raw number)
  const convertPrice = (priceInUSD) => {
    return Number((priceInUSD * currency.rate).toFixed(2));
  };

  return (
    <LanguageContext.Provider value={{ 
      language, 
      t, 
      changeLanguage, 
      languageOptions,
      currency,
      formatPrice,
      convertPrice
    }}>
      {children}
    </LanguageContext.Provider>
  );
};

export default LanguageProvider;

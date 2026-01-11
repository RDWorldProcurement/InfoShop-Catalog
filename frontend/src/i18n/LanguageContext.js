import { createContext, useContext, useState, useEffect } from 'react';
import { translations, languageOptions } from './translations';

const LanguageContext = createContext(null);

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('omnisupply_lang');
    return saved || 'en';
  });

  useEffect(() => {
    localStorage.setItem('omnisupply_lang', language);
  }, [language]);

  const t = translations[language] || translations.en;
  
  const changeLanguage = (lang) => {
    if (translations[lang]) {
      setLanguage(lang);
    }
  };

  return (
    <LanguageContext.Provider value={{ language, t, changeLanguage, languageOptions }}>
      {children}
    </LanguageContext.Provider>
  );
};

export default LanguageProvider;

import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, translateNameToArabic, type Language } from './translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, fallback?: string) => string;
  tName: (name: string) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('ll_language');
    return (saved === 'ar' || saved === 'en') ? saved : 'en';
  });

  const isRTL = false; // Always keep LTR layout structure as requested

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('ll_language', lang);
  };

  useEffect(() => {
    document.documentElement.dir = 'ltr';
    document.documentElement.lang = language;
    document.body.classList.remove('rtl-mode');
  }, [language]);

  const t = (key: string, fallback?: string): string => {
    const langDict = translations[language];
    if (langDict && langDict[key]) {
      return langDict[key];
    }
    const enDict = translations['en'];
    if (enDict && enDict[key]) {
      return enDict[key];
    }
    return fallback || key;
  };

  const tName = (name: string): string => {
    if (!name) return '';
    if (language === 'ar') {
      return translateNameToArabic(name);
    }
    return name;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, tName, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

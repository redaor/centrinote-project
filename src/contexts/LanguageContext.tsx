import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useApp } from './AppContext';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface LanguageContextType {
  language: string;
  setLanguage: (language: string) => void;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { state, dispatch } = useApp();
  const { language } = state;
  const [storedLanguage, setStoredLanguage] = useLocalStorage('centrinote-language', 'en');

  // Initialiser la langue depuis localStorage au démarrage
  useEffect(() => {
    if (storedLanguage && storedLanguage !== language) {
      dispatch({ type: 'SET_LANGUAGE', payload: storedLanguage });
    }
  }, []);

  // Synchroniser avec localStorage quand la langue change
  useEffect(() => {
    if (language !== storedLanguage) {
      setStoredLanguage(language);
    }
  }, [language, storedLanguage, setStoredLanguage]);

  const setLanguage = (newLanguage: string) => {
    dispatch({ type: 'SET_LANGUAGE', payload: newLanguage });
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
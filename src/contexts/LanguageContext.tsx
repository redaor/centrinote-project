import React, { createContext, useContext, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useApp } from './AppContext';

interface LanguageContextType {
  language: string;
  setLanguage: (language: string) => void;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

const STORAGE_KEY = 'centrinote-language';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { state, dispatch } = useApp();
  const { language } = state;
  
  // Ref pour éviter l'initialisation multiple
  const isInitialized = useRef(false);

  // ✅ INITIALISATION : Charger depuis localStorage UNE SEULE FOIS au démarrage
  useEffect(() => {
    if (isInitialized.current) return;
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed !== language) {
          dispatch({ type: 'SET_LANGUAGE', payload: parsed });
        }
      }
    } catch (error) {
      console.error('[LanguageContext] Erreur lecture localStorage:', error);
    }
    
    isInitialized.current = true;
  }, []); // ← Array vide = exécution UNIQUE au mount

  // ✅ SYNCHRONISATION UNIDIRECTIONNELLE : language → localStorage
  // Seulement après l'initialisation (évite la synchronisation pendant l'init)
  useEffect(() => {
    if (!isInitialized.current) return;
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(language));
    } catch (error) {
      console.error('[LanguageContext] Erreur écriture localStorage:', error);
    }
  }, [language]); // ← Seulement language comme dépendance

  // ✅ Memoïser setLanguage pour éviter les re-renders inutiles
  const setLanguage = useCallback((newLanguage: string) => {
    if (newLanguage !== language) {
      dispatch({ type: 'SET_LANGUAGE', payload: newLanguage });
    }
  }, [language, dispatch]);

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
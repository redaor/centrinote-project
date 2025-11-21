import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { Note, VocabularyEntry, StudySession, User, Tag } from '../types';

// Debug flag - désactivé en production
const DEBUG = import.meta.env.DEV || import.meta.env.VITE_DEBUG === 'true';

interface AppState {
  user: User | null;
  documents: Note[];
  vocabulary: VocabularyEntry[];
  studySessions: StudySession[];
  darkMode: boolean;
  sidebarCollapsed: boolean;
  currentView: string;
  language: string;
  isOffline: boolean;
  lastSync: Date | null;
  notificationSettings: {
    studyReminders: boolean;
    collaborationUpdates: boolean;
    weeklyProgress: boolean;
    newFeatures: boolean;
  };
}

type AppAction = 
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'UPDATE_USER_PROFILE'; payload: Partial<User> }
  | { type: 'SET_DOCUMENTS'; payload: Note[] }
  | { type: 'ADD_DOCUMENT'; payload: Note }
  | { type: 'UPDATE_DOCUMENT'; payload: Note }
  | { type: 'DELETE_DOCUMENT'; payload: string }
  | { type: 'SET_VOCABULARY'; payload: VocabularyEntry[] }
  | { type: 'ADD_VOCABULARY'; payload: VocabularyEntry }
  | { type: 'UPDATE_VOCABULARY'; payload: VocabularyEntry }
  | { type: 'DELETE_VOCABULARY'; payload: string }
  | { type: 'SET_STUDY_SESSIONS'; payload: StudySession[] }
  | { type: 'ADD_STUDY_SESSION'; payload: StudySession }
  | { type: 'TOGGLE_DARK_MODE' }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'SET_CURRENT_VIEW'; payload: string }
  | { type: 'SET_LANGUAGE'; payload: string }
  | { type: 'SET_OFFLINE'; payload: boolean }
  | { type: 'SET_LAST_SYNC'; payload: Date }
  | { type: 'UPDATE_NOTIFICATIONS'; payload: Partial<AppState['notificationSettings']> };

const initialState: AppState = {
  user: null,
  documents: [],
  vocabulary: [],
  studySessions: [],
  darkMode: false,
  sidebarCollapsed: false,
  currentView: 'dashboard',
  language: 'fr',
  isOffline: false,
  lastSync: null,
  notificationSettings: {
    studyReminders: true,
    collaborationUpdates: true,
    weeklyProgress: true,
    newFeatures: false
  }
};

function appReducer(state: AppState, action: AppAction): AppState {
  // Logs pour débugger les changements d'état (uniquement en dev)
  if (DEBUG && action.type === 'SET_CURRENT_VIEW') {
    console.log('🔄 [APP-CONTEXT] Action SET_CURRENT_VIEW:', {
      currentView: state.currentView,
      newView: action.payload,
      willUpdate: state.currentView !== action.payload
    });
  }
  
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'UPDATE_USER_PROFILE':
      return { 
        ...state, 
        user: state.user ? { ...state.user, ...action.payload } : null 
      };
    case 'SET_DOCUMENTS':
      return { ...state, documents: action.payload };
    case 'ADD_DOCUMENT':
      return { ...state, documents: [...state.documents, action.payload] };
    case 'UPDATE_DOCUMENT':
      return {
        ...state,
        documents: state.documents.map(doc =>
          doc.id === action.payload.id ? action.payload : doc
        ),
      };
    case 'DELETE_DOCUMENT':
      return {
        ...state,
        documents: state.documents.filter(doc => doc.id !== action.payload),
      };
    case 'SET_VOCABULARY':
      return { ...state, vocabulary: action.payload };
    case 'ADD_VOCABULARY':
      return { ...state, vocabulary: [...state.vocabulary, action.payload] };
    case 'UPDATE_VOCABULARY':
      return {
        ...state,
        vocabulary: state.vocabulary.map(entry =>
          entry.id === action.payload.id ? action.payload : entry
        ),
      };
    case 'DELETE_VOCABULARY':
      return {
        ...state,
        vocabulary: state.vocabulary.filter(entry => entry.id !== action.payload),
      };
    case 'SET_STUDY_SESSIONS':
      return { ...state, studySessions: action.payload };
    case 'ADD_STUDY_SESSION':
      return { ...state, studySessions: [...state.studySessions, action.payload] };
    case 'TOGGLE_DARK_MODE':
      return { ...state, darkMode: !state.darkMode };
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarCollapsed: !state.sidebarCollapsed };
    case 'UPDATE_NOTIFICATIONS':
      return { 
        ...state, 
        notificationSettings: { ...state.notificationSettings, ...action.payload } 
      };
    case 'SET_CURRENT_VIEW':
      // Empêcher les mises à jour redondantes
      if (state.currentView === action.payload) {
        DEBUG && console.log('ℹ️ [APP-CONTEXT] Vue déjà active, pas de mise à jour');
        return state;
      }
      DEBUG && console.log('✅ [APP-CONTEXT] Changement de vue effectué:', action.payload);
      return { ...state, currentView: action.payload };
    case 'SET_LANGUAGE':
      return { ...state, language: action.payload };
    case 'SET_OFFLINE':
      return { ...state, isOffline: action.payload };
    case 'SET_LAST_SYNC':
      return { ...state, lastSync: action.payload };
    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // ✅ SYNCHRONISATION : Initialiser depuis le thème de useTheme (source unique de vérité)
  useEffect(() => {
    const storedTheme = localStorage.getItem('centrinote-theme');

    // Déterminer si on doit être en mode sombre
    let shouldBeDark = false;

    if (storedTheme === 'dark') {
      shouldBeDark = true;
    } else if (storedTheme === 'system' || !storedTheme) {
      // Mode système : vérifier les préférences système
      shouldBeDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    // Mettre à jour si nécessaire
    if (shouldBeDark !== state.darkMode) {
      dispatch({ type: 'TOGGLE_DARK_MODE' });
    }
  }, []);

  // ✅ SYNCHRONISATION : Écouter les changements du thème (cross-tab ET same-tab)
  useEffect(() => {
    // Helper pour calculer si le mode sombre doit être activé
    const calculateDarkMode = (themeValue: string): boolean => {
      if (themeValue === 'dark') {
        return true;
      } else if (themeValue === 'system') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
      return false;
    };

    // Handler pour l'événement 'storage' (cross-tab uniquement)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'centrinote-theme' && e.newValue) {
        const shouldBeDark = calculateDarkMode(e.newValue);

        if (shouldBeDark !== state.darkMode) {
          dispatch({ type: 'TOGGLE_DARK_MODE' });
        }
      }
    };

    // ✅ Handler pour l'événement custom 'theme-changed' (same-tab)
    const handleThemeChanged = (e: Event) => {
      const customEvent = e as CustomEvent<{ theme: string }>;
      const newTheme = customEvent.detail.theme;
      const shouldBeDark = calculateDarkMode(newTheme);

      if (shouldBeDark !== state.darkMode) {
        dispatch({ type: 'TOGGLE_DARK_MODE' });
      }
    };

    // Écouter les deux événements
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('theme-changed', handleThemeChanged);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('theme-changed', handleThemeChanged);
    };
  }, [state.darkMode]);

  // Gérer l'état de connexion
  useEffect(() => {
    const handleOnline = () => dispatch({ type: 'SET_OFFLINE', payload: false });
    const handleOffline = () => dispatch({ type: 'SET_OFFLINE', payload: true });

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}
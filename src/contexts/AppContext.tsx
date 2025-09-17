import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { Note, VocabularyEntry, StudySession, User, Tag } from '../types';

interface AppState {
  user: User | null;
  documents: Note[];
  vocabulary: VocabularyEntry[];
  studySessions: StudySession[];
  darkMode: boolean;
  currentView: string;
  language: string;
  isOffline: boolean;
  lastSync: Date | null;
}

type AppAction = 
  | { type: 'SET_USER'; payload: User | null }
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
  | { type: 'SET_CURRENT_VIEW'; payload: string }
  | { type: 'SET_LANGUAGE'; payload: string }
  | { type: 'SET_OFFLINE'; payload: boolean }
  | { type: 'SET_LAST_SYNC'; payload: Date };

const initialState: AppState = {
  user: null,
  documents: [],
  vocabulary: [],
  studySessions: [],
  darkMode: false,
  currentView: 'dashboard',
  language: 'fr',
  isOffline: false,
  lastSync: null,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload };
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
    case 'SET_CURRENT_VIEW':
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

  // Initialiser le mode sombre depuis localStorage
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('centrinote-dark-mode');
    if (savedDarkMode === 'true') {
      dispatch({ type: 'TOGGLE_DARK_MODE' });
    }
  }, []);

  // Sauvegarder le mode sombre dans localStorage
  useEffect(() => {
    localStorage.setItem('centrinote-dark-mode', state.darkMode.toString());
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
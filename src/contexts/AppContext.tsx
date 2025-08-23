import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { User, Document, VocabularyEntry, StudySession, Collaboration } from '../types';

interface NotificationSettings {
  studyReminders: boolean;
  collaborationUpdates: boolean;
  weeklyProgress: boolean;
  newFeatures: boolean;
}

interface AppState {
  user: User | null;
  documents: Document[];
  vocabulary: VocabularyEntry[];
  studySessions: StudySession[];
  collaborations: Collaboration[];
  darkMode: boolean;
  sidebarCollapsed: boolean;
  currentView: string;
  language: string;
  notificationSettings: NotificationSettings;
}

type AppAction =
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'ADD_DOCUMENT'; payload: Document }
  | { type: 'SET_VOCABULARY'; payload: VocabularyEntry[] }
  | { type: 'UPDATE_DOCUMENT'; payload: Document }
  | { type: 'DELETE_DOCUMENT'; payload: string }
  | { type: 'ADD_VOCABULARY'; payload: VocabularyEntry }
  | { type: 'UPDATE_VOCABULARY'; payload: VocabularyEntry }
  | { type: 'DELETE_VOCABULARY'; payload: string }
  | { type: 'TOGGLE_DARK_MODE' }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'SET_CURRENT_VIEW'; payload: string }
  | { type: 'SET_LANGUAGE'; payload: string }
  | { type: 'UPDATE_NOTIFICATION_SETTING'; payload: { key: keyof NotificationSettings; value: boolean } }
  | { type: 'ADD_STUDY_SESSION'; payload: StudySession }
  | { type: 'UPDATE_STUDY_SESSION'; payload: StudySession }
  ;

const initialState: AppState = {
  user: null, // Initialisé à null, sera rempli par Supabase Auth
  documents: [
    {
      id: '1',
      title: 'Introduction to Machine Learning',
      content: 'Machine learning is a subset of artificial intelligence...',
      type: 'pdf',
      size: 2048000,
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-20'),
      tags: ['AI', 'Machine Learning', 'Computer Science'],
      folder: 'Studies',
      isShared: false,
      collaborators: []
    },
    {
      id: '2',
      title: 'Project Meeting Notes',
      content: 'Meeting agenda and key decisions...',
      type: 'note',
      size: 15000,
      createdAt: new Date('2024-01-18'),
      updatedAt: new Date('2024-01-18'),
      tags: ['Meeting', 'Project'],
      isShared: true,
      collaborators: ['user2', 'user3']
    }
  ],
  vocabulary: [
    {
      id: '1',
      word: 'Algorithm',
      definition: 'A set of rules or instructions given to a computer to help it learn on its own',
      category: 'Computer Science',
      language: 'English',
      examples: ['The sorting algorithm arranges data in order'],
      difficulty: 3,
      mastery: 75,
      lastReviewed: new Date('2024-01-19'),
      timesReviewed: 5
    },
    {
      id: '2',
      word: 'Neural Network',
      definition: 'A computing system inspired by biological neural networks',
      category: 'AI/ML',
      language: 'English',
      examples: ['Neural networks are used in deep learning applications'],
      difficulty: 4,
      mastery: 60,
      lastReviewed: new Date('2024-01-17'),
      timesReviewed: 3
    }
  ],
  studySessions: [
    {
      id: '1',
      title: 'Daily Vocabulary Review',
      type: 'vocabulary',
      scheduledFor: new Date('2024-01-21T09:00:00'),
      duration: 30,
      completed: false,
      progress: 0,
      items: ['1', '2']
    }
  ],
  collaborations: [],
  darkMode: false,
  sidebarCollapsed: false,
  currentView: 'dashboard',
  language: 'en',
  notificationSettings: {
    studyReminders: true,
    collaborationUpdates: true,
    weeklyProgress: false,
    newFeatures: true
  }
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'ADD_DOCUMENT':
      return { ...state, documents: [...state.documents, action.payload] };
    case 'UPDATE_DOCUMENT':
      return {
        ...state,
        documents: state.documents.map(doc =>
          doc.id === action.payload.id ? action.payload : doc
        )
      };
    case 'DELETE_DOCUMENT':
      return {
        ...state,
        documents: state.documents.filter(doc => doc.id !== action.payload)
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
        )
      };
    case 'DELETE_VOCABULARY':
      return {
        ...state,
        vocabulary: state.vocabulary.filter(entry => entry.id !== action.payload)
      };
    case 'TOGGLE_DARK_MODE':
      return { ...state, darkMode: !state.darkMode };
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarCollapsed: !state.sidebarCollapsed };
    case 'SET_CURRENT_VIEW':
      return { ...state, currentView: action.payload };
    case 'SET_LANGUAGE':
      return { ...state, language: action.payload };
    case 'UPDATE_NOTIFICATION_SETTING':
      return {
        ...state,
        notificationSettings: {
          ...state.notificationSettings,
          [action.payload.key]: action.payload.value
        }
      };
    case 'ADD_STUDY_SESSION':
      return { ...state, studySessions: [...state.studySessions, action.payload] };
    case 'UPDATE_STUDY_SESSION':
      return {
        ...state,
        studySessions: state.studySessions.map(session =>
          session.id === action.payload.id ? action.payload : session
        )
      };
    case 'SET_AI_SERVICE_STATUS':
      return {
        ...state,
        aiServiceStatus: action.payload
      };
    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
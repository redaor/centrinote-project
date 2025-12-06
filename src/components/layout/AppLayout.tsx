import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../AuthProvider';
import { useTheme } from '../../hooks/useTheme';
import { useTextSize } from '../../hooks/useTextSize';
import { settingsService } from '../../services/settings/settingsService';
import { Sidebar } from './Sidebar';
import { AppHeader } from './AppHeader';
import { Dashboard } from '../dashboard/Dashboard';
import { NeuroDashboard } from '../dashboard/NeuroDashboard';
import { ModernNotesManager } from '../documents/ModernNotesManager';
import { VocabularyNotebook } from '../vocabulary/VocabularyNotebook';
import { NeuroVocabulary } from '../vocabulary/NeuroVocabulary';
import { AISearchPage } from '../../pages/AISearchPage';
import { PlanPage } from '../../pages/PlanPage';
import { StudyPlanning } from '../planning/StudyPlanning';
import { NeuroPlanning } from '../planning/NeuroPlanning';
import { Settings } from '../settings/Settings';
import { Help } from '../help/Help';
import { AutomationManager } from '../automation/AutomationManager';
import { MeetingList } from '../meetings/MeetingList';
import { MeetingScheduler } from '../meetings/MeetingScheduler';
import { MeetingRoom } from '../meetings/MeetingRoom';
import { MeetingSummary } from '../meetings/MeetingSummary';
import { AdminFloatingButton } from '../admin/AdminFloatingButton';
import { NavigationDebugger } from '../debug/NavigationDebugger';
import { useNavigationGuard } from '../../hooks/useNavigationGuard';
import { useUserSync } from '../../hooks/useUserSync';
import { SupportMessagesPage } from '../../pages/admin/SupportMessagesPage';

// Debug flag pour réduire les logs en production
const DEBUG = import.meta.env.DEV;

export function AppLayout() {
  const { state, dispatch } = useApp();
  const { darkMode, currentView } = state;
  const { user: authUser } = useAuth();
  const { setTheme } = useTheme();
  const { setTextSize } = useTextSize();
  const location = useLocation();
  const navigate = useNavigate();

  // Utiliser le guard de navigation pour prévenir les blocages
  useNavigationGuard();

  // Activer la synchronisation du profil utilisateur
  useUserSync();

  // Synchroniser l'utilisateur du contexte Auth avec le contexte App
  useEffect(() => {
    if (authUser && (!state.user || state.user.id !== authUser.id)) {
      dispatch({ type: 'SET_USER', payload: authUser });
    } else if (!authUser && state.user) {
      dispatch({ type: 'SET_USER', payload: null });
    }
  }, [authUser, state.user, dispatch]);

  // ✅ SYNCHRONISATION : Charger depuis BDD en arrière-plan et synchroniser si différent
  useEffect(() => {
    if (!authUser?.id) return;

    const syncSettingsFromDatabase = async () => {
      try {
        // Récupérer les valeurs locales actuelles (déjà chargées depuis localStorage)
        const localTheme = localStorage.getItem('centrinote-theme') as 'system' | 'light' | 'dark' | null;
        const localTextSize = localStorage.getItem('centrinote-text-size') as 's' | 'm' | 'l' | null;

        // Charger depuis la BDD en arrière-plan
        const settings = await settingsService.getSettings(authUser.id);
        const dbTheme = settings?.appearance?.theme;
        const dbTextSize = settings?.appearance?.textSize;

        // Synchroniser le thème uniquement si différent
        if (dbTheme && dbTheme !== localTheme) {
          DEBUG && console.log('[AppLayout] Sync thème BDD → local:', { from: localTheme, to: dbTheme });
          setTheme(dbTheme);
        }

        // Synchroniser la taille du texte uniquement si différent
        if (dbTextSize && dbTextSize !== localTextSize) {
          DEBUG && console.log('[AppLayout] Sync textSize BDD → local:', { from: localTextSize, to: dbTextSize });
          setTextSize(dbTextSize);
        }

        DEBUG && console.log('[AppLayout] Settings synchronisés depuis BDD');
      } catch (error) {
        DEBUG && console.error('[AppLayout] Erreur sync settings:', error);
        // Ne pas bloquer, les hooks ont déjà chargé depuis localStorage
      }
    };

    // Lancer la synchronisation en arrière-plan après un court délai
    // pour ne pas ralentir le rendu initial
    const timeoutId = setTimeout(syncSettingsFromDatabase, 100);
    return () => clearTimeout(timeoutId);
  }, [authUser?.id, setTheme, setTextSize]);

  // Synchronisation URL → State (unidirectionnel)
  useEffect(() => {
    const path = location.pathname.slice(1);

    DEBUG && console.log('🏗️ [APP-LAYOUT] URL Change:', {
      pathname: location.pathname,
      path,
      currentView,
      timestamp: new Date().toISOString()
    });

    // Ignorer les routes spéciales (salles de réunion)
    if (location.pathname.startsWith('/meeting/')) {
      DEBUG && console.log('ℹ️ [APP-LAYOUT] Route spéciale /meeting/xxx ignorée');
      return;
    }

    const validViews = [
      'dashboard', 'notes', 'vocabulary', 'meetings',
      'search', 'plan', 'planning', 'automation', 'settings', 'help', 'admin/support'
    ];

    // Synchroniser le state avec l'URL actuelle
    let targetView = path;

    // Cas spéciaux
    if (path === '' || path === '/') {
      targetView = 'dashboard';
      navigate('/dashboard', { replace: true });
      return;
    }

    // ✅ FIX: Gérer toutes les routes /meetings/* correctement
    if (path === 'meetings' || path.startsWith('meetings/')) {
      targetView = 'meetings';
      DEBUG && console.log('✅ [APP-LAYOUT] Route meetings détectée:', { path, targetView });
    }

    // ✅ Gérer les routes /admin/*
    if (path === 'admin/support' || path.startsWith('admin/')) {
      targetView = 'admin/support';
      DEBUG && console.log('✅ [APP-LAYOUT] Route admin détectée:', { path, targetView });
    }

    // Mettre à jour le state si nécessaire
    if (validViews.includes(targetView)) {
      if (currentView !== targetView) {
        DEBUG && console.log('✅ [APP-LAYOUT] Sync state:', { from: currentView, to: targetView });
        dispatch({ type: 'SET_CURRENT_VIEW', payload: targetView });
      }
    } else {
      DEBUG && console.warn('⚠️ [APP-LAYOUT] Invalid route:', path, '→ Redirect to dashboard');
      navigate('/dashboard', { replace: true });
    }
  }, [location.pathname, dispatch, navigate]); // Dépendances fixes sans currentView

  const renderContent = () => {
    const path = location.pathname.slice(1); // Enlever le '/' initial

    DEBUG && console.log('🎨 [APP-LAYOUT] Rendu pour path:', path);

    // Gestion des routes admin spéciales
    if (location.pathname.startsWith('/admin')) {
      DEBUG && console.log('✅ [APP-LAYOUT] Route /admin détectée, rendu de SupportMessagesPage');
      return <SupportMessagesPage key={`admin-support-${Date.now()}`} />;
    }

    // Gestion des routes meetings spéciales
    if (location.pathname.startsWith('/meetings')) {
      if (location.pathname === '/meetings/new') {
        return <MeetingScheduler key="meeting-scheduler" />;
      } else if (location.pathname.match(/\/meetings\/[a-f0-9-]+\/summary$/)) {
        return <MeetingSummary key="meeting-summary" />;
      } else if (location.pathname.match(/\/meetings\/[a-f0-9-]+$/)) {
        return <MeetingRoom key="meeting-room" />;
      }

      // ✅ FIX: Si /meetings ou /meetings?xxx, retourner MeetingList
      // Cela gère le cas /meetings?completed=xxx
      DEBUG && console.log('✅ [APP-LAYOUT] Route /meetings détectée, rendu de MeetingList');
      return <MeetingList key={`meetings-${Date.now()}`} />;
    }

    // Utiliser directement le path pour déterminer le composant
    // Cela évite toute désynchronisation avec le state
    switch (path) {
      case 'dashboard':
      case '':
        return <NeuroDashboard key={`dashboard-${Date.now()}`} />;
      case 'notes':
        return <ModernNotesManager key={`notes-${Date.now()}`} />;
      case 'vocabulary':
        return <NeuroVocabulary key={`vocabulary-${Date.now()}`} />;
      case 'meetings':
        return <MeetingList key={`meetings-${Date.now()}`} />;
      case 'search':
        return <AISearchPage key="search" />;
      case 'plan':
        return <PlanPage key={`plan-${Date.now()}`} />;
      case 'planning':
        return <NeuroPlanning key={`planning-${Date.now()}`} />;
      case 'settings':
        return <Settings key={`settings-${Date.now()}`} />;
      case 'help':
        return <Help key={`help-${Date.now()}`} />;
      case 'automation':
        return <AutomationManager key={`automation-${Date.now()}`} />;
      case 'admin/support':
        return <SupportMessagesPage key={`admin-support-${Date.now()}`} />;
      default:
        DEBUG && console.warn('⚠️ [APP-LAYOUT] Route non reconnue:', path);
        return <NeuroDashboard key={`fallback-${Date.now()}`} />;
    }
  };

  return (
    <LanguageProvider>
      <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <AppHeader />
            <main className="flex-1 overflow-y-auto">
              {renderContent()}
            </main>
          </div>
        </div>
        
        {/* Bouton Admin Flottant - SEULEMENT pour reda_sahraoui@outlook.fr */}
        <AdminFloatingButton user={authUser} />
        
        {/* Debugger Navigation (Ctrl+Shift+D pour afficher) */}
        <NavigationDebugger />
      </div>
    </LanguageProvider>
  );
}
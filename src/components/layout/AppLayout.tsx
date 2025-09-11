import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../AuthProvider';
import { Sidebar } from './Sidebar';
import { AppHeader } from './AppHeader';
import { Dashboard } from '../dashboard/Dashboard';
import { ModernNotesManager } from '../documents/ModernNotesManager';
import { VocabularyNotebook } from '../vocabulary/VocabularyNotebook';
import { Collaboration } from '../collaboration/Collaboration';
import { ModernAISearch } from '../search/ModernAISearch';
import { StudyPlanning } from '../planning/StudyPlanning';
import { Settings } from '../settings/Settings';
import { Help } from '../help/Help';
import { AutomationManager } from '../automation/AutomationManager';
import { ZoomManager } from '../zoom/ZoomManager';
import { GoogleMeetManager } from '../google-meet/GoogleMeetManager';
import { AdminFloatingButton } from '../admin/AdminFloatingButton';

export function AppLayout() {
  const { state, dispatch } = useApp();
  const { darkMode, currentView } = state;
  const { user: authUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Synchroniser l'utilisateur du contexte Auth avec le contexte App
  useEffect(() => {
    if (authUser && (!state.user || state.user.id !== authUser.id)) {
      dispatch({ type: 'SET_USER', payload: authUser });
    } else if (!authUser && state.user) {
      dispatch({ type: 'SET_USER', payload: null });
    }
  }, [authUser, state.user, dispatch]);

  // Synchroniser la vue actuelle avec l'URL
  useEffect(() => {
    const path = location.pathname.slice(1); // Enlever le '/' initial
    const validViews = [
      'dashboard', 'notes', 'vocabulary', 'collaboration', 'zoom', 'google-meet',
      'search', 'planning', 'automation', 'settings', 'help'
    ];
    
    if (validViews.includes(path)) {
      dispatch({ type: 'SET_CURRENT_VIEW', payload: path });
    } else {
      // Rediriger vers dashboard si la route n'est pas valide
      navigate('/dashboard', { replace: true });
    }
  }, [location.pathname, dispatch, navigate]);

  // Mettre à jour l'URL quand la vue change
  useEffect(() => {
    const currentPath = location.pathname.slice(1);
    if (currentPath !== currentView) {
      navigate(`/${currentView}`, { replace: true });
    }
  }, [currentView, location.pathname, navigate]);

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'notes':
        return <ModernNotesManager />;
      case 'vocabulary':
        return <VocabularyNotebook />;
      case 'collaboration':
        return <Collaboration />;
      case 'zoom':
        return <ZoomManager />;
      case 'google-meet':
        return <GoogleMeetManager />;
      case 'search':
        return <ModernAISearch />;
      case 'planning':
        return <StudyPlanning />;
      case 'settings':
        return <Settings />;
      case 'help':
        return <Help />;
      case 'automation':
        return <AutomationManager />;
      default:
        return <Dashboard />;
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
        {console.log("🔧 AppLayout - AuthUser:", authUser?.email)}
        <AdminFloatingButton user={authUser} />
      </div>
    </LanguageProvider>
  );
}
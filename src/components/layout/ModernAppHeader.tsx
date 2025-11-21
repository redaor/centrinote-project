import React, { useState, useRef, useEffect } from 'react';
import { 
  Menu, 
  Search as SearchIcon, 
  Bell, 
  Moon, 
  Sun, 
  LogOut, 
  User,
  Settings,
  X
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useTranslation } from '../../hooks/useTranslation';
import { Button } from '../ui/Button';
import { supabase } from '../../lib/supabase';
import { useNotify } from '../../externals/centinote-notify';

function NotificationBell() {
  const { notify } = useNotify();
  const [notificationCount] = useState(0); // TODO: Connecter avec un vrai système de notifications

  const handleClick = () => {
    console.log('🔔 Bouton cloche cliqué');
    
    try {
      notify({
        level: 'info',
        title: 'Notifications',
        body: notificationCount > 0 
          ? `Vous avez ${notificationCount} nouvelle${notificationCount > 1 ? 's' : ''} notification${notificationCount > 1 ? 's' : ''}`
          : 'Aucune nouvelle notification pour le moment',
        icon: '🔔',
        actions: notificationCount > 0 ? [
          {
            label: 'Voir',
            onClick: () => {
              console.log('Voir les notifications');
            },
          },
        ] : undefined,
      });
      console.log('✅ Notification déclenchée');
    } catch (error) {
      console.error('❌ Erreur lors de l\'envoi de la notification:', error);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="p-2 relative"
      aria-label="Notifications"
      onClick={handleClick}
    >
      <Bell className="w-5 h-5" />
      {notificationCount > 0 && (
        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
      )}
    </Button>
  );
}

export function ModernAppHeader() {
  const { state, dispatch } = useApp();
  const { darkMode, user, sidebarCollapsed } = state;
  const { t } = useTranslation();
  
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Fermeture menu utilisateur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  const toggleSidebar = () => {
    dispatch({ type: 'TOGGLE_SIDEBAR' });
  };

  const toggleDarkMode = () => {
    dispatch({ type: 'TOGGLE_DARK_MODE' });
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    
    setIsLoggingOut(true);
    setShowUserMenu(false);
    
    try {
      dispatch({ type: 'SET_USER', payload: null });
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      
      if (error) {
        console.warn('Erreur déconnexion:', error.message);
      }
      
      // Nettoyage localStorage
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') || key.includes('supabase') || key.includes('centrinote')) {
          localStorage.removeItem(key);
        }
      });
      
      window.location.href = '/';
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      {/* Header Principal */}
      <header className="sticky top-0 z-30 border-b bg-white/95 backdrop-blur-sm dark:bg-gray-900/95 border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-4 py-3">
          
          {/* Left: Menu + Titre */}
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            {/* Menu Hamburger - Mobile */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSidebar}
              className="lg:hidden p-2"
              aria-label="Menu"
            >
              <Menu className="w-5 h-5" />
            </Button>

            {/* Logo/Titre */}
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Centrinote
              </h1>
            </div>
          </div>

          {/* Center: Barre de recherche - Desktop */}
          <div className="hidden md:flex flex-1 max-w-2xl mx-6">
            <div className="relative w-full">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                id="modern-search-input"
                name="modern-search"
                type="text"
                placeholder="Rechercher notes, vocabulaire..."
                className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-500"
                aria-label="Recherche dans les notes et vocabulaire"
              />
            </div>
          </div>
          
          {/* Right: Actions */}
          <div className="flex items-center space-x-2">
            {/* Recherche Mobile */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMobileSearch(true)}
              className="md:hidden p-2"
              aria-label="Recherche"
            >
              <SearchIcon className="w-5 h-5" />
            </Button>

            {/* Dark Mode Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleDarkMode}
              className="p-2"
              aria-label={darkMode ? 'Mode clair' : 'Mode sombre'}
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>

            {/* Notifications */}
            <NotificationBell />

            {/* Menu Utilisateur */}
            <div className="relative" ref={userMenuRef}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="p-2"
                aria-label="Menu utilisateur"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-teal-500 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
              </Button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-2 z-50">
                  <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {user?.email}
                    </p>
                  </div>
                  
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      dispatch({ type: 'SET_CURRENT_VIEW', payload: 'settings' });
                    }}
                    className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 min-h-touch"
                  >
                    <Settings className="w-4 h-4 mr-3" />
                    Paramètres
                  </button>
                  
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 min-h-touch disabled:opacity-50"
                  >
                    <LogOut className="w-4 h-4 mr-3" />
                    {isLoggingOut ? 'Déconnexion...' : 'Se déconnecter'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Modal Recherche Mobile */}
      {showMobileSearch && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowMobileSearch(false)} />
          <div className="relative bg-white dark:bg-gray-900 p-4">
            <div className="flex items-center space-x-3">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  autoFocus
                  className="w-full pl-11 pr-4 py-3 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMobileSearch(false)}
                className="p-2"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
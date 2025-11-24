import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  Moon,
  Sun,
  Search as SearchIcon,
  Menu,
  LogOut,
  User,
  Settings,
  HelpCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import { useTheme } from '../../hooks/useTheme';
import { useSettings } from '../../hooks/settings/useSettings';
import { useTranslation } from '../../hooks/useTranslation';
import { ConfirmModal } from '../settings/modals/ConfirmModal';
import { useNotifications } from '../../hooks/useNotifications';
import { NotificationDropdown } from '../notifications/NotificationDropdown';

export function AppHeader() {
  const { state, dispatch } = useApp();
  const { darkMode, currentView, user } = state;
  const { toggleTheme } = useTheme();
  const { updateAppearance, logout } = useSettings(user?.id);
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  // 🔔 Hook de notifications
  const { notifications, unreadCount, loading: notificationsLoading } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);
  
  // 🔍 DEBUG: Afficher les notifications dans la console
  useEffect(() => {
    console.log('🔔 [APP-HEADER] Notifications:', {
      count: notifications.length,
      unreadCount,
      loading: notificationsLoading,
      user: user?.id
    });
  }, [notifications, unreadCount, notificationsLoading, user?.id]);

  // États pour les menus
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  // Référence pour le menu utilisateur
  const userMenuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Fermer le menu utilisateur quand on clique à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      // ✅ FIX: Ignorer les clics sur le bouton toggle lui-même
      if (buttonRef.current && buttonRef.current.contains(target)) {
        return;
      }

      // Fermer si clic à l'extérieur du menu
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
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

  // ✅ Utiliser toggleTheme de useTheme + sauvegarder en BDD (non-bloquant)
  const handleToggleDarkMode = () => {
    toggleTheme(); // Applique immédiatement le thème

    // Calculer le nouveau thème après le toggle
    const newTheme = darkMode ? 'light' : 'dark';

    // ⚡ Sauvegarder en BDD en arrière-plan (fire-and-forget)
    // Ne pas bloquer l'UI avec await
    updateAppearance({ theme: newTheme }).catch(error => {
      console.error('[AppHeader] Erreur sauvegarde thème:', error);
    });
  };

  const toggleSidebar = () => {
    dispatch({ type: 'TOGGLE_SIDEBAR' });
  };

  // ✅ Fonction de déconnexion simplifiée - utilise le service de useSettings
  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);

    try {
      // Fermer les menus
      setShowLogoutConfirm(false);
      setShowUserMenu(false);

      // Utiliser le service logout de useSettings (même logique que SecuritySection)
      await logout();

      // Redirection
      navigate('/login');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      // En cas d'erreur, rediriger quand même
      navigate('/login');
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Navigation vers les paramètres
  const handleSettingsClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🔄 Navigation vers les paramètres...');
    
    setShowUserMenu(false);
    dispatch({ type: 'SET_CURRENT_VIEW', payload: 'settings' });
    navigate('/settings');
  };

  // Navigation vers l'aide
  const handleHelpClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🔄 Navigation vers l\'aide...');

    setShowUserMenu(false);
    dispatch({ type: 'SET_CURRENT_VIEW', payload: 'help' });
    navigate('/help');
  };

  // Ouvrir le modal de confirmation de déconnexion
  const handleLogoutClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setShowUserMenu(false);
    setShowLogoutConfirm(true);
  };

  const getViewTitle = () => {
    const titles: Record<string, string> = {
      dashboard: t('dashboard'),
      notes: 'Notes',
      vocabulary: t('vocabulary'),
      collaboration: t('collaboration'),
      zoom: 'Zoom',
      'google-meet': 'Google Meet',
      search: t('search'),
      planning: t('planning'),
      automation: 'Automatisation',
      settings: t('settings'),
      help: t('help')
    };
    return titles[currentView] || 'Centrinote';
  };

  const shouldShowGlobalSearch = currentView !== 'search';

  return (
    <>
      <header className={`
        ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}
        border-b px-4 lg:px-6 py-3 lg:py-4 flex items-center justify-between
        sticky top-0 z-30
      `}>
        <div className="flex items-center space-x-3 lg:space-x-0 min-w-0 flex-1">
          {/* Bouton menu mobile */}
          <button
            id="mobile-menu-toggle"
            name="mobile-menu"
            onClick={toggleSidebar}
            className={`
              lg:hidden p-2 rounded-lg transition-colors min-w-[2.5rem] min-h-[2.5rem]
              ${darkMode
                ? 'hover:bg-gray-800 text-gray-400 hover:text-white'
                : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
              }
            `}
            aria-label="Ouvrir le menu"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="min-w-0 flex-1">
            <h1 className={`text-xl lg:text-2xl font-bold truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {getViewTitle()}
            </h1>
            <p className={`text-sm lg:text-sm hidden sm:block ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {t('welcome')}, {user?.name}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 lg:space-x-4">
          {/* Recherche globale */}
          {shouldShowGlobalSearch && (
            <div className="relative hidden md:block">
              <SearchIcon className={`
                absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4
                ${darkMode ? 'text-gray-400' : 'text-gray-500'}
              `} />
              <input
                id="global-search-input"
                name="global-search"
                type="text"
                placeholder={t('search_placeholder')}
                className={`
                  pl-10 pr-4 py-2 w-64 lg:w-80 rounded-lg border transition-colors text-sm
                  ${darkMode 
                    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500' 
                    : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                  }
                  focus:outline-none focus:ring-2 focus:ring-blue-500/20
                `}
                aria-label="Recherche globale"
              />
            </div>
          )}

          {/* Bouton de recherche mobile */}
          {shouldShowGlobalSearch && (
            <button
              id="mobile-search-button"
              name="mobile-search"
              className={`
                md:hidden p-2 rounded-lg transition-colors min-w-[2.5rem] min-h-[2.5rem]
                ${darkMode
                  ? 'hover:bg-gray-800 text-gray-400 hover:text-white'
                  : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                }
              `}
              aria-label="Ouvrir la recherche"
            >
              <SearchIcon className="w-5 h-5" />
            </button>
          )}

          {/* Notifications */}
          <div className="relative">
            <button
              id="notifications-button"
              name="notifications"
              onClick={() => {
                console.log('🔔 [APP-HEADER] Bouton cloche cliqué', {
                  unreadCount,
                  totalCount: notifications.length,
                  notifications: notifications.map(n => ({ id: n.id, title: n.title, is_read: n.is_read }))
                });
                setShowNotifications(!showNotifications);
              }}
              className={`
                p-2 rounded-lg transition-colors relative min-w-[2.5rem] min-h-[2.5rem]
                ${darkMode
                  ? 'hover:bg-gray-800 text-gray-400 hover:text-white'
                  : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                }
              `}
              aria-label="Voir les notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" aria-hidden="true">
                  <span className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75"></span>
                </span>
              )}
              {/* 🔍 DEBUG: Afficher le nombre total même si 0 non lues */}
              {notifications.length > 0 && unreadCount === 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-gray-400 rounded-full" aria-hidden="true" title={`${notifications.length} notifications`}></span>
              )}
            </button>
            <NotificationDropdown 
              isOpen={showNotifications} 
              onClose={() => setShowNotifications(false)} 
            />
          </div>

          {/* Dark Mode Toggle */}
          <button
            id="dark-mode-toggle"
            name="dark-mode"
            onClick={handleToggleDarkMode}
            className={`
              p-2 rounded-lg transition-colors min-w-[2.5rem] min-h-[2.5rem]
              ${darkMode
                ? 'hover:bg-gray-800 text-gray-400 hover:text-white'
                : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
              }
            `}
            aria-label={darkMode ? 'Activer le mode clair' : 'Activer le mode sombre'}
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* User Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              ref={buttonRef}
              id="user-menu-button"
              name="user-menu"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔄 Toggle user menu, état actuel:', showUserMenu);
                setShowUserMenu(!showUserMenu);
              }}
              className={`
                flex items-center space-x-2 p-2 rounded-lg transition-colors
                ${darkMode
                  ? 'hover:bg-gray-800 text-gray-400 hover:text-white'
                  : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                }
              `}
              aria-label="Ouvrir le menu utilisateur"
              aria-expanded={showUserMenu}
              aria-haspopup="true"
            >
              <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name || 'Avatar'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white font-semibold text-sm">
                    {user?.name?.split(' ').map(n => n[0]).join('') || 'U'}
                  </span>
                )}
              </div>
              <span className="hidden lg:block font-medium">
                {user?.name}
              </span>
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div className={`
                absolute right-0 mt-2 w-64 rounded-xl shadow-lg border z-50
                ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
              `}>
                {/* Header du menu */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                      {user?.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.name || 'Avatar'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-white font-semibold">
                          {user?.name?.split(' ').map(n => n[0]).join('') || 'U'}
                        </span>
                      )}
                    </div>
                    <div>
                      <div className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {user?.name}
                      </div>
                      <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {user?.email}
                      </div>
                      <div className={`text-xs px-2 py-1 rounded-full mt-1 inline-block ${
                        user?.subscription === 'premium'
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                          : user?.subscription === 'basic'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                      }`}>
                        Plan {user?.subscription}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Menu items */}
                <div className="py-2">
                  {/* Bouton Paramètres */}
                  <button
                    id="user-menu-settings"
                    name="settings"
                    type="button"
                    onClick={handleSettingsClick}
                    className={`
                      w-full flex items-center space-x-3 px-4 py-3 text-left transition-colors
                      ${darkMode
                        ? 'text-gray-300 hover:bg-gray-700 hover:text-white'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      }
                    `}
                    aria-label="Ouvrir les paramètres"
                  >
                    <Settings className="w-5 h-5" />
                    <span>Paramètres</span>
                  </button>

                  {/* Bouton Aide & Support */}
                  <button
                    id="user-menu-help"
                    name="help"
                    type="button"
                    onClick={handleHelpClick}
                    className={`
                      w-full flex items-center space-x-3 px-4 py-3 text-left transition-colors
                      ${darkMode
                        ? 'text-gray-300 hover:bg-gray-700 hover:text-white'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      }
                    `}
                    aria-label="Ouvrir l'aide et le support"
                  >
                    <HelpCircle className="w-5 h-5" />
                    <span>Aide & Support</span>
                  </button>

                  {/* Séparateur */}
                  <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>

                  {/* Bouton Se déconnecter */}
                  <button
                    id="user-menu-logout"
                    name="logout"
                    type="button"
                    onClick={handleLogoutClick}
                    disabled={isLoggingOut}
                    className={`
                      w-full flex items-center space-x-3 px-4 py-3 text-left transition-colors
                      ${isLoggingOut
                        ? 'opacity-50 cursor-not-allowed'
                        : darkMode
                          ? 'text-red-400 hover:bg-red-900/20 hover:text-red-300'
                          : 'text-red-600 hover:bg-red-50 hover:text-red-700'
                      }
                    `}
                    aria-label="Se déconnecter du compte"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>{isLoggingOut ? 'Déconnexion...' : 'Se déconnecter'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ✅ Modal de confirmation de déconnexion - utilise le composant réutilisable */}
      <ConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
        title="Se déconnecter"
        message="Êtes-vous sûr de vouloir vous déconnecter de votre compte ?"
        confirmText="Se déconnecter"
        cancelText="Annuler"
        type="info"
        isLoading={isLoggingOut}
        isDark={darkMode}
      />
    </>
  );
}
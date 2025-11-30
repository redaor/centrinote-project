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
  HelpCircle,
  Shield
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import { useTheme } from '../../hooks/useTheme';
import { useSettings } from '../../hooks/settings/useSettings';
import { useTranslation } from '../../hooks/useTranslation';
import { ConfirmModal } from '../settings/modals/ConfirmModal';
import { useNotifications } from '../../hooks/useNotifications';
import { logger } from '../../utils/logger';
import { BadgePulse, NotificationPanel } from '../notifications/NotificationVisuals2025';

// Fonction pour formater le temps relatif
const formatTime = (dateString: string) => {
  if (!dateString) return 'Date inconnue';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `Il y a ${minutes} min`;
    if (hours < 24) return `Il y a ${hours}h`;
    if (days < 7) return `Il y a ${days}j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  } catch (error) {
    logger.error('Erreur formatTime', error instanceof Error ? error : new Error(String(error)));
    return 'Date inconnue';
  }
};

export function AppHeader() {
  const { state, dispatch } = useApp();
  const { darkMode, currentView, user } = state;
  const { toggleTheme } = useTheme();
  const { updateAppearance, logout } = useSettings(user?.id);
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  // 🔔 Hook de notifications
  const { notifications, unreadCount, loading: notificationsLoading, markAsRead, deleteNotification } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);
  
  // 🔍 DEBUG: Afficher les notifications dans la console
  useEffect(() => {
    logger.debug('Notifications dans AppHeader', {
      count: notifications.length,
      unreadCount,
      loading: notificationsLoading
    });
  }, [notifications, unreadCount, notificationsLoading]);

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
      logger.error('Erreur lors de la déconnexion', error instanceof Error ? error : new Error(String(error)));
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
    logger.debug('Navigation vers les paramètres');
    
    setShowUserMenu(false);
    dispatch({ type: 'SET_CURRENT_VIEW', payload: 'settings' });
    navigate('/settings');
  };

  // Navigation vers l'aide
  const handleHelpClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    logger.debug('Navigation vers l\'aide');

    setShowUserMenu(false);
    dispatch({ type: 'SET_CURRENT_VIEW', payload: 'help' });
    navigate('/help');
  };

  // Navigation vers l'admin (visible uniquement pour les admins)
  const handleAdminClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    logger.debug('Navigation vers l\'admin');

    setShowUserMenu(false);
    dispatch({ type: 'SET_CURRENT_VIEW', payload: 'admin' });
    navigate('/admin/support');
  };

  // Vérifier si l'utilisateur est admin
  const isAdmin =
    user?.email === 'contact@centrinote.fr' ||
    user?.email === 'reda_sahraoui@outlook.fr' ||
    user?.role === 'admin';

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
            <BadgePulse
              count={unreadCount}
              darkMode={darkMode}
              onClick={() => {
                logger.debug('Badge notifications cliqué', { unreadCount, totalCount: notifications.length });
                setShowNotifications(!showNotifications);
              }}
            />
            <NotificationPanel
              isOpen={showNotifications}
              darkMode={darkMode}
              onClose={() => setShowNotifications(false)}
              onDelete={(id) => deleteNotification(id)}
              onMarkAsRead={(id) => markAsRead(id)}
              notifications={notifications.map(n => ({
                id: n.id,
                title: n.title,
                message: n.message,
                time: formatTime(n.sent_at || n.created_at),
                isRead: n.is_read,
                type: n.type
              }))}
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
                logger.debug('Toggle user menu');
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

                  {/* Bouton Admin (visible uniquement pour les admins) */}
                  {isAdmin && (
                    <button
                      id="user-menu-admin"
                      name="admin"
                      type="button"
                      onClick={handleAdminClick}
                      className={`
                        w-full flex items-center space-x-3 px-4 py-3 text-left transition-colors
                        ${darkMode
                          ? 'text-purple-400 hover:bg-purple-900/20 hover:text-purple-300'
                          : 'text-purple-600 hover:bg-purple-50 hover:text-purple-700'
                        }
                      `}
                      aria-label="Ouvrir le panneau d'administration"
                    >
                      <Shield className="w-5 h-5" />
                      <span>👨‍💼 Administration</span>
                    </button>
                  )}

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
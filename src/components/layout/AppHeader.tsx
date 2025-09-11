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
import { useTranslation } from '../../hooks/useTranslation';
import { supabase } from '../../lib/supabase';

export function AppHeader() {
  const { state, dispatch } = useApp();
  const { darkMode, currentView, sidebarCollapsed, user } = state;
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  // États pour les menus
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  // Référence pour le menu utilisateur
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Fermer le menu utilisateur quand on clique à l'extérieur
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

  const toggleDarkMode = () => {
    dispatch({ type: 'TOGGLE_DARK_MODE' });
  };

  const toggleSidebar = () => {
    dispatch({ type: 'TOGGLE_SIDEBAR' });
  };

  // Fonction de déconnexion robuste
  const handleLogout = async () => {
    if (isLoggingOut) return;
    
    console.log('🔄 Début de la déconnexion...');
    setIsLoggingOut(true);
    
    try {
      // Étape 1: Fermer tous les menus immédiatement
      setShowLogoutConfirm(false);
      setShowUserMenu(false);
      
      // Étape 2: Nettoyer l'état local AVANT Supabase
      console.log('🧹 Nettoyage de l\'état local...');
      dispatch({ type: 'SET_USER', payload: null });
      
      // Étape 3: Déconnexion Supabase
      console.log('🔄 Déconnexion Supabase...');
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      
      if (error) {
        console.warn('⚠️ Erreur Supabase (non bloquante):', error.message);
      } else {
        console.log('✅ Déconnexion Supabase réussie');
      }
      
      // Étape 4: Nettoyage manuel du localStorage
      console.log('🧹 Nettoyage manuel du localStorage...');
      try {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('sb-') || key.includes('supabase') || key.includes('centrinote')) {
            localStorage.removeItem(key);
            console.log(`🗑️ Supprimé: ${key}`);
          }
        });
        sessionStorage.clear();
      } catch (storageError) {
        console.warn('⚠️ Erreur nettoyage storage:', storageError);
      }
      
      // Étape 5: Redirection forcée
      console.log('🔄 Redirection forcée vers la page d\'accueil...');
      setTimeout(() => {
        window.location.href = '/';
      }, 100);
      
    } catch (error) {
      console.error('❌ Erreur lors de la déconnexion:', error);
      
      // Même en cas d'erreur totale, forcer la déconnexion
      dispatch({ type: 'SET_USER', payload: null });
      setShowLogoutConfirm(false);
      setShowUserMenu(false);
      
      setTimeout(() => {
        window.location.href = '/';
      }, 100);
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
    console.log('🔄 Clic sur Se déconnecter - ouverture modal');
    
    setShowUserMenu(false);
    setShowLogoutConfirm(true);
  };

  // Confirmer la déconnexion
  const confirmLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🔄 Confirmation de déconnexion');
    
    handleLogout();
  };

  // Annuler la déconnexion
  const cancelLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🔄 Annulation de déconnexion');
    
    setShowLogoutConfirm(false);
  };

  const getViewTitle = () => {
    const titles: Record<string, string> = {
      dashboard: t('dashboard'),
      notes: 'Notes',
      vocabulary: t('vocabulary'),
      collaboration: t('collaboration'),
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
            onClick={toggleSidebar}
            className={`
              lg:hidden p-2 rounded-lg transition-colors min-w-[2.5rem] min-h-[2.5rem]
              ${darkMode 
                ? 'hover:bg-gray-800 text-gray-400 hover:text-white' 
                : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
              }
            `}
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
              />
            </div>
          )}

          {/* Bouton de recherche mobile */}
          {shouldShowGlobalSearch && (
            <button className={`
              md:hidden p-2 rounded-lg transition-colors min-w-[2.5rem] min-h-[2.5rem]
              ${darkMode 
                ? 'hover:bg-gray-800 text-gray-400 hover:text-white' 
                : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
              }
            `}>
              <SearchIcon className="w-5 h-5" />
            </button>
          )}

          {/* Notifications */}
          <button className={`
            p-2 rounded-lg transition-colors relative min-w-[2.5rem] min-h-[2.5rem]
            ${darkMode 
              ? 'hover:bg-gray-800 text-gray-400 hover:text-white' 
              : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
            }
          `}>
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
          </button>

          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className={`
              p-2 rounded-lg transition-colors min-w-[2.5rem] min-h-[2.5rem]
              ${darkMode 
                ? 'hover:bg-gray-800 text-gray-400 hover:text-white' 
                : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
              }
            `}
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* User Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
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
            >
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
                  {user?.name?.split(' ').map(n => n[0]).join('') || 'U'}
                </span>
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
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold">
                        {user?.name?.split(' ').map(n => n[0]).join('') || 'U'}
                      </span>
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
                    type="button"
                    onClick={handleSettingsClick}
                    className={`
                      w-full flex items-center space-x-3 px-4 py-3 text-left transition-colors
                      ${darkMode 
                        ? 'text-gray-300 hover:bg-gray-700 hover:text-white' 
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      }
                    `}
                  >
                    <Settings className="w-5 h-5" />
                    <span>Paramètres</span>
                  </button>

                  {/* Bouton Aide & Support */}
                  <button
                    type="button"
                    onClick={handleHelpClick}
                    className={`
                      w-full flex items-center space-x-3 px-4 py-3 text-left transition-colors
                      ${darkMode 
                        ? 'text-gray-300 hover:bg-gray-700 hover:text-white' 
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      }
                    `}
                  >
                    <HelpCircle className="w-5 h-5" />
                    <span>Aide & Support</span>
                  </button>

                  {/* Séparateur */}
                  <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>

                  {/* Bouton Se déconnecter */}
                  <button
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

      {/* Modal de confirmation de déconnexion */}
      {showLogoutConfirm && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50" 
            onClick={cancelLogout}
          />
          <div className={`
            fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50
            ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-xl p-6 w-96 max-w-[90vw]
          `}>
            <div className="text-center">
              <div className={`
                w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center
                ${darkMode ? 'bg-red-900/30' : 'bg-red-100'}
              `}>
                <LogOut className={`w-8 h-8 ${darkMode ? 'text-red-400' : 'text-red-600'}`} />
              </div>
              
              <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Confirmer la déconnexion
              </h3>
              
              <p className={`mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Êtes-vous sûr de vouloir vous déconnecter de votre compte ?
              </p>
              
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={cancelLogout}
                  disabled={isLoggingOut}
                  className={`
                    flex-1 px-4 py-2 rounded-lg border transition-colors
                    ${isLoggingOut 
                      ? 'opacity-50 cursor-not-allowed'
                      : darkMode 
                        ? 'border-gray-600 text-gray-400 hover:text-white hover:bg-gray-700'
                        : 'border-gray-300 text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }
                  `}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={confirmLogout}
                  disabled={isLoggingOut}
                  className={`
                    flex-1 px-4 py-2 rounded-lg transition-colors flex items-center justify-center space-x-2
                    ${isLoggingOut 
                      ? 'bg-red-400 cursor-not-allowed'
                      : 'bg-red-500 hover:bg-red-600'
                    }
                    text-white
                  `}
                >
                  {isLoggingOut ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Déconnexion...</span>
                    </>
                  ) : (
                    <span>Se déconnecter</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home,
  FileText,
  BookOpen,
  Users,
  Video,
  Search,
  Calendar,
  Settings,
  HelpCircle,
  Menu,
  X,
  Zap,
  StickyNote,
  CreditCard,
  Shield
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useTranslation } from '../../hooks/useTranslation';

// Debug flag
const DEBUG = import.meta.env.DEV;

const menuItems = [
  { id: 'dashboard', label: 'dashboard', icon: Home },
  { id: 'notes', label: 'Notes', icon: StickyNote },
  { id: 'vocabulary', label: 'vocabulary', icon: BookOpen },
  { id: 'meetings', label: 'Réunions', icon: Video },
  { id: 'search', label: 'search', icon: Search },
  { id: 'planning', label: 'planning', icon: Calendar },
  { id: 'automation', label: 'Automatisation', icon: Zap },
  { id: 'plan', label: 'Plan', icon: CreditCard },
  { id: 'settings', label: 'settings', icon: Settings },
  { id: 'help', label: 'help', icon: HelpCircle }
];

export function Sidebar() {
  const { state, dispatch } = useApp();
  const { sidebarCollapsed, currentView, user } = state;
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Vérifier si l'utilisateur est admin
  const isAdmin = useMemo(() => {
    return (
      user?.email === 'contact@centrinote.fr' ||
      user?.email === 'reda_sahraoui@outlook.fr' ||
      user?.role === 'admin'
    );
  }, [user?.email, user?.role]);

  // Menu items dynamiques (avec Admin si utilisateur est admin)
  const dynamicMenuItems = useMemo(() => {
    const items = [...menuItems];

    // Insérer l'onglet Admin avant Settings si l'utilisateur est admin
    if (isAdmin) {
      const settingsIndex = items.findIndex(item => item.id === 'settings');
      items.splice(settingsIndex, 0, {
        id: 'admin',
        label: 'Administration',
        icon: Shield
      });
    }

    return items;
  }, [isAdmin]);

  const handleViewChange = (viewId: string) => {
    DEBUG && console.log('🎯 [SIDEBAR] Click navigation:', viewId);

    // Navigation spéciale pour Admin
    if (viewId === 'admin') {
      navigate('/admin/support');
    } else {
      // Toujours naviguer, même si on est déjà sur la page
      // Cela force un rafraîchissement si nécessaire
      navigate(`/${viewId}`);
    }

    // Fermer sidebar sur mobile
    if (window.innerWidth < 1024) {
      dispatch({ type: 'TOGGLE_SIDEBAR' });
    }
  };

  const toggleSidebar = () => {
    dispatch({ type: 'TOGGLE_SIDEBAR' });
  };

  return (
    <>
      {/* Overlay pour mobile */}
      {!sidebarCollapsed && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          ${sidebarCollapsed ? '-translate-x-full lg:translate-x-0 lg:w-16' : 'translate-x-0 w-80 lg:w-64'}
          fixed lg:relative inset-y-0 left-0 z-50 lg:z-auto
          transition-all duration-300 ease-in-out
          flex flex-col h-full
        `}
      >
        {/* Conteneur séparé pour les couleurs et bordures */}
        <div className="w-full h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 lg:p-4 border-b border-gray-200 dark:border-gray-700 min-h-[4rem]">
            {!sidebarCollapsed && (
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 lg:w-8 lg:h-8 bg-gradient-to-br from-blue-500 to-teal-500 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-5 h-5 lg:w-5 lg:h-5 text-white" />
                </div>
                <h1 className="text-xl lg:text-xl font-bold text-gray-900 dark:text-white">
                  Centrinote
                </h1>
              </div>
            )}
            <button
              onClick={toggleSidebar}
              className="p-3 lg:p-2 rounded-lg transition-colors min-w-[3rem] min-h-[3rem] lg:min-w-0 lg:min-h-0 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              {sidebarCollapsed ? <Menu className="w-6 h-6 lg:w-5 lg:h-5" /> : <X className="w-6 h-6 lg:w-5 lg:h-5" />}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 lg:p-4 overflow-y-auto">
            <ul className="space-y-3 lg:space-y-2">
              {dynamicMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id || (item.id === 'admin' && window.location.pathname.startsWith('/admin'));
                
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => handleViewChange(item.id)}
                      className={`
                        w-full flex items-center space-x-4 lg:space-x-3 px-4 lg:px-3 py-4 lg:py-2.5 rounded-lg
                        transition-all duration-200 ease-in-out text-left min-h-[3.5rem] lg:min-h-0
                        hover:scale-[1.02] active:scale-[0.98] transform
                        ${isActive
                          ? 'bg-gradient-to-r from-blue-500 to-teal-500 text-white shadow-lg scale-[1.02]'
                          : 'text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                        }
                      `}
                    >
                      <Icon className="w-6 h-6 lg:w-5 lg:h-5 flex-shrink-0" />
                      {!sidebarCollapsed && (
                        <span className="font-medium text-base lg:text-sm">
                          {item.id === 'automation' || item.id === 'meetings' || item.id === 'admin' || item.id === 'notes' ? item.label : t(item.label as any)}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* User Profile */}
          {!sidebarCollapsed && user && (
            <div className="p-4 lg:p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 lg:w-10 lg:h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-base lg:text-sm">
                    {user.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base lg:text-sm font-medium truncate text-gray-900 dark:text-white">
                    {user.name}
                  </p>
                  <p className="text-sm lg:text-xs truncate text-gray-500 dark:text-gray-400">
                    {user.role === 'admin' ? 'Plan Admin' : `Plan ${user.subscription}`}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home,
  FileText,
  BookOpen,
  Users,
  Search,
  Calendar,
  Settings,
  HelpCircle,
  Menu,
  X,
  Zap,
  StickyNote,
  Video
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useTranslation } from '../../hooks/useTranslation';

const menuItems = [
  { id: 'dashboard', label: 'dashboard', icon: Home },
  { id: 'notes', label: 'notes', icon: StickyNote },
  { id: 'vocabulary', label: 'vocabulary', icon: BookOpen },
  { id: 'collaboration', label: 'collaboration', icon: Users },
  { id: 'zoom', label: 'Zoom', icon: Video },
  { id: 'search', label: 'search', icon: Search },
  { id: 'planning', label: 'planning', icon: Calendar },
  { id: 'automation', label: 'Automatisation', icon: Zap },
  { id: 'settings', label: 'settings', icon: Settings },
  { id: 'help', label: 'help', icon: HelpCircle }
];

export function Sidebar() {
  const { state, dispatch } = useApp();
  const { sidebarCollapsed, currentView, darkMode, user } = state;
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleViewChange = (viewId: string) => {
    dispatch({ type: 'SET_CURRENT_VIEW', payload: viewId });
    navigate(`/${viewId}`);
    // Fermer automatiquement la sidebar sur mobile après sélection
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
          ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}
          fixed lg:relative inset-y-0 left-0 z-50 lg:z-auto
          border-r transition-all duration-300 ease-in-out
          flex flex-col h-full
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 lg:p-4 border-b border-inherit min-h-[4rem]">
          {!sidebarCollapsed && (
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 lg:w-8 lg:h-8 bg-gradient-to-br from-blue-500 to-teal-500 rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 lg:w-5 lg:h-5 text-white" />
              </div>
              <h1 className={`text-xl lg:text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Centrinote
              </h1>
            </div>
          )}
          <button
            onClick={toggleSidebar}
            className={`
              p-3 lg:p-2 rounded-lg transition-colors min-w-[3rem] min-h-[3rem] lg:min-w-0 lg:min-h-0
              ${darkMode 
                ? 'hover:bg-gray-800 text-gray-400 hover:text-white' 
                : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
              }
            `}
          >
            {sidebarCollapsed ? <Menu className="w-6 h-6 lg:w-5 lg:h-5" /> : <X className="w-6 h-6 lg:w-5 lg:h-5" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 lg:p-4 overflow-y-auto">
          <ul className="space-y-3 lg:space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              
              return (
                <li key={item.id}>
                  <button
                    onClick={() => handleViewChange(item.id)}
                    className={`
                      w-full flex items-center space-x-4 lg:space-x-3 px-4 lg:px-3 py-4 lg:py-2.5 rounded-lg
                      transition-all duration-200 ease-in-out text-left min-h-[3.5rem] lg:min-h-0
                      ${isActive
                        ? 'bg-gradient-to-r from-blue-500 to-teal-500 text-white shadow-lg'
                        : darkMode
                          ? 'text-gray-400 hover:text-white hover:bg-gray-800'
                          : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                      }
                    `}
                  >
                    <Icon className="w-6 h-6 lg:w-5 lg:h-5 flex-shrink-0" />
                    {!sidebarCollapsed && (
                      <span className="font-medium text-base lg:text-sm">
                        {item.id === 'automation' ? item.label : t(item.label)}
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
          <div className={`p-4 lg:p-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 lg:w-10 lg:h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-base lg:text-sm">
                  {user.name.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-base lg:text-sm font-medium truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {user.name}
                </p>
                <p className={`text-sm lg:text-xs truncate ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Plan {user.subscription}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
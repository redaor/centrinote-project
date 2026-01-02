import React, { useState, useRef, useEffect } from 'react';
import { Bell, X, Check, CheckCheck, Trash2 } from 'lucide-react';
import { useNotifications, type Notification } from '../../hooks/useNotifications';
import { useApp } from '../../contexts/AppContext';
import { motion, AnimatePresence } from 'framer-motion';

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationDropdown({ isOpen, onClose }: NotificationDropdownProps) {
  const { state } = useApp();
  const { darkMode } = state;
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 🔍 DEBUG: Log quand le dropdown s'ouvre
  useEffect(() => {
    if (isOpen) {
      console.log('🔔 [NotificationDropdown] Dropdown ouvert', {
        isOpen,
        notificationsCount: notifications.length,
        unreadCount,
        notifications: notifications.map(n => ({ id: n.id, title: n.title, is_read: n.is_read, created_at: n.created_at }))
      });
    }
  }, [isOpen, notifications, unreadCount]);

  // Fermer quand on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const getTypeColor = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return 'text-green-500';
      case 'warning':
        return 'text-yellow-500';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-blue-500';
    }
  };

  const getTypeBg = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return darkMode ? 'bg-green-500/20' : 'bg-green-50';
      case 'warning':
        return darkMode ? 'bg-yellow-500/20' : 'bg-yellow-50';
      case 'error':
        return darkMode ? 'bg-red-500/20' : 'bg-red-50';
      default:
        return darkMode ? 'bg-blue-500/20' : 'bg-blue-50';
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedNotifications(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedNotifications.size === notifications.length) {
      setSelectedNotifications(new Set());
    } else {
      setSelectedNotifications(new Set(notifications.map(n => n.id)));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedNotifications.size === 0) return;
    const idsToDelete = Array.from(selectedNotifications);
    deleteMultipleNotifications(idsToDelete);
    setSelectedNotifications(new Set());
  };

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
      console.error('Erreur formatTime:', error);
      return 'Date inconnue';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          ref={dropdownRef}
          className={`
            absolute top-full right-0 mt-2 w-96 max-w-[calc(100vw-2rem)]
            ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
            border rounded-xl shadow-2xl z-50
            max-h-[600px] flex flex-col
          `}
        >
          {/* Header */}
          <div className={`
            flex items-center justify-between p-4 border-b
            ${darkMode ? 'border-gray-700' : 'border-gray-200'}
          `}>
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              <h3 className="font-semibold">Notifications</h3>
              {unreadCount > 0 && (
                <span className={`
                  px-2 py-0.5 rounded-full text-xs font-medium
                  ${darkMode ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-700'}
                `}>
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {selectedNotifications.size > 0 && (
                <button
                  onClick={handleDeleteSelected}
                  className={`
                    flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors
                    bg-red-500 hover:bg-red-600 text-white text-sm font-medium
                    focus:outline-none focus:ring-2 focus:ring-red-400
                  `}
                  aria-label={`Supprimer ${selectedNotifications.size} notification${selectedNotifications.size > 1 ? 's' : ''}`}
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Supprimer ({selectedNotifications.size})</span>
                </button>
              )}
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className={`
                    p-1.5 rounded-lg transition-colors
                    ${darkMode 
                      ? 'hover:bg-gray-700 text-gray-300' 
                      : 'hover:bg-gray-100 text-gray-600'
                    }
                  `}
                  title="Tout marquer comme lu"
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={onClose}
                className={`
                  p-1.5 rounded-lg transition-colors
                  ${darkMode 
                    ? 'hover:bg-gray-700 text-gray-300' 
                    : 'hover:bg-gray-100 text-gray-600'
                  }
                `}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className={`
                p-8 text-center
                ${darkMode ? 'text-gray-400' : 'text-gray-500'}
              `}>
                <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Aucune notification</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {/* Bouton sélectionner tout */}
                {notifications.length > 0 && (
                  <div className={`
                    px-4 py-2 border-b
                    ${darkMode ? 'border-gray-700' : 'border-gray-200'}
                    flex items-center gap-2
                  `}>
                    <input
                      type="checkbox"
                      checked={selectedNotifications.size === notifications.length && notifications.length > 0}
                      onChange={handleSelectAll}
                      className={`
                        w-4 h-4 rounded
                        ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}
                        focus:ring-2 focus:ring-purple-500
                        cursor-pointer
                      `}
                      aria-label="Sélectionner toutes les notifications"
                    />
                    <label className={`
                      text-sm cursor-pointer
                      ${darkMode ? 'text-gray-300' : 'text-gray-600'}
                    `}>
                      {selectedNotifications.size === notifications.length && notifications.length > 0
                        ? 'Tout désélectionner'
                        : 'Tout sélectionner'}
                    </label>
                  </div>
                )}
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => !notification.is_read && markAsRead(notification.id)}
                    className={`
                      p-4 transition-colors
                      ${notification.is_read 
                        ? darkMode ? 'bg-gray-800/50' : 'bg-white'
                        : getTypeBg(notification.type)
                      }
                      ${selectedNotifications.has(notification.id)
                        ? darkMode ? 'bg-purple-500/20 border-purple-500/30' : 'bg-purple-50 border-purple-200'
                        : darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                      }
                      ${!notification.is_read ? 'cursor-pointer' : ''}
                    `}
                  >
                    <div className="flex items-start gap-3">
                      {/* Checkbox de sélection */}
                      <input
                        type="checkbox"
                        checked={selectedNotifications.has(notification.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleToggleSelect(notification.id);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className={`
                          flex-shrink-0 w-4 h-4 mt-2 rounded
                          ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}
                          focus:ring-2 focus:ring-purple-500
                          cursor-pointer
                        `}
                        aria-label={`Sélectionner ${notification.title}`}
                      />
                      <div className={`
                        flex-shrink-0 w-2 h-2 rounded-full mt-2
                        ${notification.is_read ? 'opacity-0' : getTypeColor(notification.type)}
                      `} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className={`
                            font-semibold text-sm
                            ${darkMode ? 'text-gray-100' : 'text-gray-900'}
                          `}>
                            {notification.title}
                          </h4>
                          {!notification.is_read && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notification.id);
                              }}
                              className={`
                                p-1 rounded transition-colors
                                ${darkMode 
                                  ? 'hover:bg-gray-600 text-gray-400' 
                                  : 'hover:bg-gray-200 text-gray-500'
                                }
                              `}
                              title="Marquer comme lu"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <p className={`
                          text-sm mt-1
                          ${darkMode ? 'text-gray-300' : 'text-gray-600'}
                        `}>
                          {notification.message}
                        </p>
                        <p className={`
                          text-xs mt-2
                          ${darkMode ? 'text-gray-500' : 'text-gray-400'}
                        `}>
                          {formatTime(notification.sent_at || notification.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}


import React, { useEffect, useState } from 'react';
import type { Notification, NotificationAction } from './types';

interface DynamicIslandProps {
  notification: Notification | null;
  aggregated: Notification[];
  isRetracted: boolean;
  isVisible: boolean;
  onRetract: () => void;
  onExpand: () => void;
  onRemove: (id: string) => void;
  onClearAggregated: () => void;
  theme?: 'light' | 'dark';
}

export function DynamicIsland({
  notification,
  aggregated,
  isRetracted,
  isVisible,
  onRetract,
  onExpand,
  onRemove,
  onClearAggregated,
  theme = 'light',
}: DynamicIslandProps) {
  // Debug logs - TOUJOURS afficher en dev
  console.log('🔔 [DynamicIsland] Render:', {
    hasNotification: !!notification,
    aggregatedCount: aggregated.length,
    isVisible,
    isRetracted,
    notificationTitle: notification?.title,
    notificationId: notification?.id,
  });

  // Si rien à afficher, ne rien rendre
  if (!isVisible && !isRetracted && !notification && aggregated.length === 0) {
    if (import.meta.env.DEV) {
      console.log('🔔 [DynamicIsland] Rien à afficher, retour null');
    }
    return null;
  }

  const isDark = theme === 'dark';
  const bgColor = isDark
    ? 'bg-gray-900/90 border-gray-700/50'
    : 'bg-white/90 border-gray-200/50';
  const textColor = isDark ? 'text-gray-100' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-600';

  // Retracted state (small island)
  if (isRetracted && !notification && aggregated.length === 0) {
    return (
      <div
        className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 ease-out ${
          isVisible ? 'opacity-60' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onExpand}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onExpand();
          }
        }}
        aria-label="Expand notification"
      >
        <div
          className={`${bgColor} backdrop-blur-xl border rounded-full px-4 py-2 shadow-2xl ${textColor} cursor-pointer hover:opacity-80 transition-opacity`}
          style={{ width: '80px', height: '12px' }}
        />
      </div>
    );
  }

  // Aggregated notifications
  if (aggregated.length > 0) {
    if (import.meta.env.DEV) {
      console.log('🔔 [DynamicIsland] Rendu notifications agrégées:', aggregated.length);
    }
    return (
      <div
        className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] transition-all duration-300 ease-out ${
          isVisible
            ? 'translate-y-0 opacity-100'
            : 'translate-y-[-100%] opacity-0'
        }`}
        role="alert"
        aria-live="polite"
        aria-atomic="true"
      >
        <div
          className={`${bgColor} backdrop-blur-xl border ${textColor} rounded-3xl px-6 py-4 shadow-2xl max-w-md min-w-[320px]`}
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-sm">{aggregated.length} notifications</h3>
            <button
              onClick={onClearAggregated}
              className={`${textSecondary} hover:${textColor} transition-colors text-xs`}
              aria-label="Clear notifications"
            >
              ✕
            </button>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {aggregated.map((notif) => (
              <div
                key={notif.id}
                className={`${textSecondary} text-xs py-1 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'} last:border-0`}
              >
                <div className="font-medium">{notif.title}</div>
                <div className="text-xs mt-0.5">{notif.body}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Single notification
  if (!notification) {
    if (import.meta.env.DEV) {
      console.log('🔔 [DynamicIsland] Pas de notification à afficher');
    }
    return null;
  }

  if (import.meta.env.DEV) {
    console.log('🔔 [DynamicIsland] Rendu notification unique:', {
      title: notification.title,
      isVisible,
      isRetracted,
    });
  }

  const levelColors = {
    info: isDark ? 'border-blue-500/30' : 'border-blue-500/30',
    success: isDark ? 'border-green-500/30' : 'border-green-500/30',
    warning: isDark ? 'border-yellow-500/30' : 'border-yellow-500/30',
    error: isDark ? 'border-red-500/30' : 'border-red-500/30',
    automation: isDark ? 'border-purple-500/30' : 'border-purple-500/30',
  };

  return (
    <div
      className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] transition-all duration-300 ease-out ${
        isVisible && !isRetracted
          ? 'translate-y-0 opacity-100'
          : isRetracted
          ? 'translate-y-0 opacity-60'
          : 'translate-y-[-100%] opacity-0'
      }`}
      role="alert"
      aria-live="polite"
      aria-atomic="true"
      style={{ pointerEvents: 'auto' }}
    >
      <div
        className={`${bgColor} backdrop-blur-xl border ${levelColors[notification.level]} ${textColor} rounded-3xl px-6 py-4 shadow-2xl max-w-md min-w-[320px]`}
      >
        <div className="flex items-start gap-3">
          {notification.icon && (
            <div className="text-2xl flex-shrink-0" aria-hidden="true">
              {notification.icon}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm mb-1">{notification.title}</h3>
            <p className={`${textSecondary} text-sm leading-relaxed`}>{notification.body}</p>
            {notification.actions && notification.actions.length > 0 && (
              <div className="flex gap-2 mt-3">
                {notification.actions.slice(0, 2).map((action: NotificationAction, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => {
                      action.onClick();
                      onRemove(notification.id);
                    }}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      action.primary
                        ? isDark
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                        : isDark
                        ? 'bg-gray-700 text-gray-100 hover:bg-gray-600'
                        : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                    }`}
                    aria-label={action.label}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => onRemove(notification.id)}
            className={`${textSecondary} hover:${textColor} transition-colors flex-shrink-0`}
            aria-label="Close notification"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}


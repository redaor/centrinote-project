/**
 * Section Notifications
 * Conformément au cahier des charges - Section 4
 */

import React from 'react';
import { Bell } from 'lucide-react';
import { SettingsCard } from '../ui/SettingsCard';
import { Toggle } from '../ui/Toggle';
import { NotificationSettings } from '../../../types/settings.types';

interface NotificationsSectionProps {
  notifications: NotificationSettings;
  onUpdate: (updates: Partial<NotificationSettings>) => Promise<void>;
  isDark?: boolean;
}

export function NotificationsSection({
  notifications,
  onUpdate,
  isDark = false
}: NotificationsSectionProps) {
  const handleToggle = async (key: keyof Omit<NotificationSettings, 'quietHours' | 'emailTime'>, value: boolean) => {
    await onUpdate({ [key]: value });
  };

  const handleQuietHoursToggle = async (enabled: boolean) => {
    await onUpdate({
      quietHours: { ...notifications.quietHours, enabled }
    });
  };

  const handleQuietHoursChange = async (field: 'start' | 'end', value: string) => {
    await onUpdate({
      quietHours: { ...notifications.quietHours, [field]: value }
    });
  };

  return (
    <SettingsCard
      icon={Bell}
      title="Notifications"
      description="Configurez vos préférences de notification"
      isDark={isDark}
    >
      <div className="space-y-6">
        {/* Emails */}
        <Toggle
          checked={notifications.emails}
          onChange={(checked) => handleToggle('emails', checked)}
          label="Notifications par email"
          description="Recevoir des notifications importantes par email"
          isDark={isDark}
          id="notif-emails"
        />

        {/* Note explicative pour les heures d'envoi */}
        {notifications.emails && (
          <div
            className={`
              pl-6 border-l-2 space-y-2
              ${isDark ? 'border-blue-500/30' : 'border-blue-500/50'}
              animate-slideDown
            `}
          >
            <p
              className={`
                text-sm
                ${isDark ? 'text-gray-400' : 'text-gray-600'}
              `}
            >
              💡 <strong>Astuce :</strong> Configurez l'heure d'envoi de chaque automation individuellement dans le Dashboard des Automations (icône ⋮ sur chaque carte).
            </p>
          </div>
        )}

        {/* Rappels */}
        <Toggle
          checked={notifications.reminders}
          onChange={(checked) => handleToggle('reminders', checked)}
          label="Rappels"
          description="Notifications pour vos tâches et échéances"
          isDark={isDark}
          id="notif-reminders"
        />

        {/* Push */}
        <Toggle
          checked={notifications.push}
          onChange={(checked) => handleToggle('push', checked)}
          label="Notifications push"
          description="Recevoir des notifications push sur votre appareil"
          isDark={isDark}
          id="notif-push"
        />

        {/* Heures calmes */}
        <div
          className={`
            pt-6 border-t
            ${isDark ? 'border-gray-700' : 'border-gray-200'}
          `}
        >
          <Toggle
            checked={notifications.quietHours.enabled}
            onChange={handleQuietHoursToggle}
            label="Heures calmes"
            description="Ne pas déranger pendant certaines heures"
            isDark={isDark}
            id="notif-quiet-hours"
          />

          {/* Configuration des heures calmes */}
          {notifications.quietHours.enabled && (
            <div
              className={`
                mt-6 p-4 rounded-lg
                ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}
                space-y-4
                animate-slideDown
              `}
            >
              <div className="grid grid-cols-2 gap-4">
                {/* Heure de début */}
                <div>
                  <label
                    htmlFor="quiet-start"
                    className={`
                      block text-sm font-medium mb-2
                      ${isDark ? 'text-gray-300' : 'text-gray-700'}
                    `}
                  >
                    Début
                  </label>
                  <input
                    id="quiet-start"
                    type="time"
                    value={notifications.quietHours.start}
                    onChange={(e) => handleQuietHoursChange('start', e.target.value)}
                    className={`
                      w-full px-4 py-3 rounded-lg border
                      ${isDark
                        ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500'
                        : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                      }
                      focus:outline-none focus:ring-4 focus:ring-blue-500/20
                      transition-all
                    `}
                    aria-label="Heure de début des heures calmes"
                  />
                </div>

                {/* Heure de fin */}
                <div>
                  <label
                    htmlFor="quiet-end"
                    className={`
                      block text-sm font-medium mb-2
                      ${isDark ? 'text-gray-300' : 'text-gray-700'}
                    `}
                  >
                    Fin
                  </label>
                  <input
                    id="quiet-end"
                    type="time"
                    value={notifications.quietHours.end}
                    onChange={(e) => handleQuietHoursChange('end', e.target.value)}
                    className={`
                      w-full px-4 py-3 rounded-lg border
                      ${isDark
                        ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500'
                        : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                      }
                      focus:outline-none focus:ring-4 focus:ring-blue-500/20
                      transition-all
                    `}
                    aria-label="Heure de fin des heures calmes"
                  />
                </div>
              </div>

              <p
                className={`
                  text-xs
                  ${isDark ? 'text-gray-400' : 'text-gray-600'}
                `}
              >
                Aucune notification ne sera envoyée pendant cette période
              </p>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideDown {
          animation: slideDown 200ms ease-out;
        }
      `}</style>
    </SettingsCard>
  );
}

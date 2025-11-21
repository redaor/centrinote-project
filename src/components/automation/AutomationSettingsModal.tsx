import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Clock, Trophy, BookOpen, Bell, Mail, Calendar, Save, Star, Settings } from 'lucide-react';

interface AutomationSettings {
  hour?: string;
  milestone?: number;
  delayDays?: number;
  studyHour?: string;
  breakDuration?: number;
  breakDelayMinutes?: number;
  emailDay?: string;
  emailHour?: string;
  backupHour?: string;
  quoteTime?: string;
}

interface SimpleAutomation {
  id: string;
  title: string;
  description: string;
  category: string;
  trigger: string;
  action: string;
  isActive: boolean;
  icon: string;
  color: string;
  settings?: AutomationSettings;
}

interface AutomationSettingsModalProps {
  isOpen: boolean;
  darkMode: boolean;
  automation: SimpleAutomation | null;
  settings: AutomationSettings;
  onSettingsChange: (settings: AutomationSettings) => void;
  onSave: () => void;
  onClose: () => void;
}

export function AutomationSettingsModal({
  isOpen,
  darkMode,
  automation,
  settings,
  onSettingsChange,
  onSave,
  onClose
}: AutomationSettingsModalProps) {
  if (!automation) return null;

  const renderSettingsFields = () => {
    switch (automation.id) {
      case 'daily-review':
        return (
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Heure du rappel
            </label>
            <input
              type="time"
              value={settings.hour || '09:00'}
              onChange={(e) => onSettingsChange({ ...settings, hour: e.target.value })}
              className={`w-full px-4 py-2 rounded-lg border ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            />
            <p className={`text-xs mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Choisissez l'heure à laquelle vous souhaitez recevoir votre rappel quotidien
            </p>
          </div>
        );

      case 'vocab-milestone':
        return (
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Nombre de mots à atteindre
            </label>
            <select
              value={settings.milestone || 50}
              onChange={(e) => onSettingsChange({ ...settings, milestone: parseInt(e.target.value) })}
              className={`w-full px-4 py-2 rounded-lg border ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            >
              <option value={25}>25 mots</option>
              <option value={50}>50 mots</option>
              <option value={100}>100 mots</option>
              <option value={200}>200 mots</option>
              <option value={500}>500 mots</option>
            </select>
            <p className={`text-xs mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Vous serez félicité lorsque vous atteignez ce nombre de mots
            </p>
          </div>
        );

      case 'forgotten-notes':
        return (
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Délai avant rappel (jours)
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="range"
                min="1"
                max="30"
                value={settings.delayDays || 7}
                onChange={(e) => onSettingsChange({ ...settings, delayDays: parseInt(e.target.value) })}
                className="flex-1"
              />
              <span className={`px-3 py-1 rounded-lg font-medium ${
                darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
              }`}>
                {settings.delayDays || 7} jours
              </span>
            </div>
            <p className={`text-xs mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Recevez un rappel si une note n'a pas été consultée pendant ce délai
            </p>
          </div>
        );

      case 'study-reminder':
        return (
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Heure du rappel d'étude
            </label>
            <input
              type="time"
              value={settings.studyHour || '18:00'}
              onChange={(e) => onSettingsChange({ ...settings, studyHour: e.target.value })}
              className={`w-full px-4 py-2 rounded-lg border ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            />
            <p className={`text-xs mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Heure à laquelle vous recevrez le rappel "C'est l'heure d'étudier !"
            </p>
          </div>
        );

      case 'break-reminder':
        return (
          <div className="space-y-6">
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Durée minimale de session (minutes)
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="range"
                min="30"
                max="180"
                step="15"
                value={settings.breakDuration || 120}
                onChange={(e) => onSettingsChange({ ...settings, breakDuration: parseInt(e.target.value) })}
                className="flex-1"
              />
              <span className={`px-3 py-1 rounded-lg font-medium ${
                darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
              }`}>
                {settings.breakDuration || 120} min
              </span>
            </div>
            <p className={`text-xs mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              La session doit durer au moins ce temps avant de déclencher le rappel
            </p>
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Délai après la fin de session (minutes)
              </label>
              <input
                type="number"
                min={1}
                max={180}
                step={1}
                value={settings.breakDelayMinutes ?? 30}
                onChange={(e) => {
                  const parsed = parseInt(e.target.value, 10);
                  onSettingsChange({
                    ...settings,
                    breakDelayMinutes: Number.isNaN(parsed) ? 1 : Math.max(1, Math.min(parsed, 180))
                  });
                }}
                className={`w-full px-4 py-2 rounded-lg border ${
                  darkMode
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              />
              <p className={`text-xs mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Astuce&nbsp;: testez 2 ou 5 minutes pour vos essais, puis passez à 30 minutes une fois validé.
              </p>
            </div>
          </div>
        );

      case 'weekly-summary':
        return (
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Jour de la semaine
              </label>
              <select
                value={settings.emailDay || 'vendredi'}
                onChange={(e) => onSettingsChange({ ...settings, emailDay: e.target.value })}
                className={`w-full px-4 py-2 rounded-lg border ${
                  darkMode
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              >
                <option value="lundi">Lundi</option>
                <option value="mardi">Mardi</option>
                <option value="mercredi">Mercredi</option>
                <option value="jeudi">Jeudi</option>
                <option value="vendredi">Vendredi</option>
                <option value="samedi">Samedi</option>
                <option value="dimanche">Dimanche</option>
              </select>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Heure d'envoi
              </label>
              <input
                type="time"
                value={settings.emailHour || '17:00'}
                onChange={(e) => onSettingsChange({ ...settings, emailHour: e.target.value })}
                className={`w-full px-4 py-2 rounded-lg border ${
                  darkMode
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              />
            </div>
          </div>
        );

      case 'monthly-report':
      case 'daily-backup':
        return (
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Heure d'exécution
            </label>
            <input
              type="time"
              value={automation.id === 'monthly-report' ? (settings.emailHour || '09:00') : (settings.backupHour || '02:00')}
              onChange={(e) => onSettingsChange({
                ...settings,
                [automation.id === 'monthly-report' ? 'emailHour' : 'backupHour']: e.target.value
              })}
              className={`w-full px-4 py-2 rounded-lg border ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            />
          </div>
        );

      case 'break_time':
        return (
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Durée minimale de session (minutes)
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="range"
                min="30"
                max="120"
                step="15"
                value={settings.breakDuration || 45}
                onChange={(e) => onSettingsChange({ ...settings, breakDuration: parseInt(e.target.value) })}
                className="flex-1"
              />
              <span className={`px-3 py-1 rounded-lg font-medium ${
                darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
              }`}>
                {settings.breakDuration || 45} min
              </span>
            </div>
            <p className={`text-xs mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              La session doit durer au moins ce temps pour déclencher l'email de pause
            </p>
          </div>
        );

      case 'daily_quote':
        return (
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Heure d'envoi de la citation
            </label>
            <input
              type="time"
              value={settings.quoteTime || '08:00'}
              onChange={(e) => onSettingsChange({ ...settings, quoteTime: e.target.value })}
              className={`w-full px-4 py-2 rounded-lg border ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            />
            <p className={`text-xs mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Recevez votre citation motivante chaque matin à cette heure
            </p>
          </div>
        );

      default:
        return (
          <div className={`text-center py-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Aucun paramètre personnalisable pour cette automatisation
          </div>
        );
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              className={`${
                darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              } border rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg`} style={{ backgroundColor: `${automation.color}20` }}>
                      <Settings className="w-5 h-5" style={{ color: automation.color }} />
                    </div>
                    <div>
                      <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        Paramètres
                      </h2>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {automation.title}
                      </p>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={onClose}
                    className={`p-2 rounded-lg ${
                      darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                    } transition-colors`}
                  >
                    <X className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                  </motion.button>
                </div>
              </div>

              {/* Body */}
              <div className="px-6 py-6 overflow-y-auto max-h-[60vh]">
                {renderSettingsFields()}
              </div>

              {/* Footer */}
              <div className={`px-6 py-4 border-t ${darkMode ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'} flex justify-end space-x-3`}>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onClose}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    darkMode
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  } transition-colors`}
                >
                  Annuler
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onSave}
                  className="px-4 py-2 rounded-lg font-medium bg-blue-500 hover:bg-blue-600 text-white transition-colors flex items-center space-x-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Enregistrer</span>
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

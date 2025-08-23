import React, { useState, useEffect } from 'react';
import {
  User,
  Bell,
  Shield,
  Palette,
  Globe,
  Download,
  Upload,
  Trash2,
  Save,
  Eye,
  EyeOff,
  X,
  Camera,
  CreditCard,
  Check,
  AlertCircle,
  Mail,
  Lock
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useTranslation } from '../../hooks/useTranslation';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { SecuritySection } from './security/SecuritySection';
import { DataPrivacySection } from './data/DataPrivacySection';
import { ProfileSection } from './ProfileSection';
import { SubscriptionSection } from './subscription/SubscriptionSection';
import { WebhookTestPanel } from '../debug/WebhookTestPanel';
import { APIConnectionTest } from '../debug/APIConnectionTest';
import { ZoomConfigurationDebug } from '../debug/ZoomConfigurationDebug';

export function Settings() {
  const { state, dispatch } = useApp();
  const { darkMode, user, notificationSettings } = state;
  const { language, setLanguage } = useLanguage();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'profile' | 'subscription' | 'preferences' | 'security' | 'data' | 'debug'>('profile');
  
  // Synchroniser les préférences avec localStorage
  const [, setStoredNotifications] = useLocalStorage('centrinote-notifications', notificationSettings);
  const [, setStoredDarkMode] = useLocalStorage('centrinote-dark-mode', darkMode);
  
  // États pour les notifications et messages
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Synchroniser les changements de notifications avec localStorage
  useEffect(() => {
    setStoredNotifications(notificationSettings);
  }, [notificationSettings, setStoredNotifications]);

  // Synchroniser les changements de mode sombre avec localStorage
  useEffect(() => {
    setStoredDarkMode(darkMode);
  }, [darkMode, setStoredDarkMode]);

  const tabs = [
    { id: 'profile', label: t('profile'), icon: User },
    { id: 'subscription', label: 'Abonnement', icon: CreditCard },
    { id: 'preferences', label: t('preferences'), icon: Palette },
    { id: 'security', label: t('security'), icon: Shield },
    { id: 'data', label: t('data_privacy'), icon: Download },
    { id: 'debug', label: 'Debug & API', icon: AlertCircle }
  ];

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  // Fonction pour changer la langue
  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    showMessage('success', t('notification_setting_updated'));
  };

  // Fonction pour changer les paramètres de notification
  const handleNotificationToggle = (key: keyof typeof notificationSettings) => {
    const newValue = !notificationSettings[key];
    dispatch({ 
      type: 'UPDATE_NOTIFICATION_SETTING', 
      payload: { key, value: newValue } 
    });
    showMessage('success', t('notification_setting_updated'));
  };

  const PreferencesSettings = () => (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header moderne */}
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Palette className="w-8 h-8 text-white" />
        </div>
        <h2 className={`text-3xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Préférences
        </h2>
        <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Personnalisez votre expérience
        </p>
      </div>

      {/* Apparence */}
      <div className={`
        ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
        border rounded-2xl p-8 space-y-6
      `}>
        <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Apparence
        </h3>
        
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <label className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Mode sombre
              </label>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Basculer entre les thèmes clair et sombre
              </p>
            </div>
            <button
              onClick={() => dispatch({ type: 'TOGGLE_DARK_MODE' })}
              className={`
                relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                ${darkMode ? 'bg-blue-600' : 'bg-gray-200'}
              `}
            >
              <span
                className={`
                  inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                  ${darkMode ? 'translate-x-6' : 'translate-x-1'}
                `}
              />
            </button>
          </div>
          
          <div>
            <label className={`block text-sm font-medium mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Langue
            </label>
            <select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className={`
                w-full max-w-xs px-4 py-3 rounded-xl border-2 transition-all duration-200
                ${darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' 
                  : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                }
                focus:outline-none focus:ring-4 focus:ring-blue-500/20
              `}
            >
              <option value="en">English</option>
              <option value="fr">Français</option>
              <option value="es">Español</option>
              <option value="de">Deutsch</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className={`
        ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
        border rounded-2xl p-8 space-y-6
      `}>
        <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Notifications
        </h3>
        
        <div className="space-y-6">
          {[
            { 
              key: 'studyReminders' as const, 
              label: t('study_reminders'), 
              description: t('study_reminders_description') 
            },
            { 
              key: 'collaborationUpdates' as const, 
              label: t('collaboration_updates'), 
              description: t('collaboration_updates_description') 
            },
            { 
              key: 'weeklyProgress' as const, 
              label: t('weekly_progress'), 
              description: t('weekly_progress_description') 
            },
            { 
              key: 'newFeatures' as const, 
              label: t('new_features'), 
              description: t('new_features_description') 
            }
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between">
              <div>
                <label className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {item.label}
                </label>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {item.description}
                </p>
              </div>
              <button
                onClick={() => handleNotificationToggle(item.key)}
                className={`
                  relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                  ${notificationSettings[item.key] ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}
                `}
              >
                <span
                  className={`
                    inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                    ${notificationSettings[item.key] ? 'translate-x-6' : 'translate-x-1'}
                  `}
                />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6">
      {/* Message de notification */}
      {message && (
        <div className={`
          fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2
          ${message.type === 'success' 
            ? darkMode ? 'bg-green-800 text-green-200 border border-green-700' : 'bg-green-100 text-green-800 border border-green-200'
            : darkMode ? 'bg-red-800 text-red-200 border border-red-700' : 'bg-red-100 text-red-800 border border-red-200'
          }
        `}>
          {message.type === 'success' ? (
            <Check className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {t('settings')}
          </h1>
          <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Gérez vos paramètres et préférences
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-64">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`
                      w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors
                      ${isActive
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                        : darkMode
                          ? 'text-gray-400 hover:text-white hover:bg-gray-800'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1">
            {/* Sections indépendantes pour éviter les problèmes de re-render */}
            {activeTab === 'profile' && <ProfileSection darkMode={darkMode} />}
            {activeTab === 'subscription' && <SubscriptionSection darkMode={darkMode} />}
            {activeTab === 'preferences' && <PreferencesSettings />}
            {activeTab === 'security' && <SecuritySection darkMode={darkMode} />}
            {activeTab === 'data' && <DataPrivacySection darkMode={darkMode} />}
            {activeTab === 'debug' && (
              <div className="space-y-8">
                <APIConnectionTest />
                <ZoomConfigurationDebug />
                <WebhookTestPanel />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
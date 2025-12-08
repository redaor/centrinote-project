/**
 * Page principale des paramètres
 * Conformément au cahier des charges complet
 */

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useSettings } from '../../hooks/settings/useSettings';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { ProfileSection } from './sections/ProfileSection';
import { AppearanceSection } from './sections/AppearanceSection';
import { NotificationsSection } from './sections/NotificationsSection';
import { SecuritySection } from './sections/SecuritySection';
import { QuotaTester } from '../admin/QuotaTester';

export function Settings() {
  const navigate = useNavigate();
  const { state } = useApp();
  const { user } = state || {};
  const { setTheme } = useTheme();
  const { t } = useTranslation();
  const isDark = state?.darkMode ?? false;

  const {
    settings,
    isLoading,
    updateProfile,
    updateAppearance,
    updateNotifications,
    uploadAvatar,
    deleteAvatar,
    logout,
    deleteAccount
  } = useSettings(user?.id);

  // ✅ SUPPRIMÉ : useEffect redondant qui appliquait le thème après chaque changement
  // Le thème est maintenant appliqué directement dans AppearanceSection.handleThemeChange()
  // via setTheme(), ce qui évite les doubles appels et la désynchronisation

  // État de chargement initial
  if (!settings) {
    return (
      <div
        className={`
          min-h-screen flex items-center justify-center
          ${isDark ? 'bg-gray-900' : 'bg-gray-50'}
        `}
      >
        <div className="text-center">
          <Loader2
            className={`
              w-12 h-12 animate-spin mx-auto mb-4
              ${isDark ? 'text-blue-400' : 'text-blue-600'}
            `}
          />
          <p
            className={`
              text-lg font-medium
              ${isDark ? 'text-gray-300' : 'text-gray-700'}
            `}
          >
            {t('settings_loading')}
          </p>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleDeleteAccount = async (password: string) => {
    await deleteAccount(password);
    navigate('/');
  };

  return (
    <div
      className={`
        min-h-screen transition-colors duration-300
        ${isDark ? 'bg-gray-900' : 'bg-gray-50'}
      `}
    >
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 animate-fadeInDown">
          <div>
            <h1
              className={`
                text-3xl font-bold mb-2
                ${isDark ? 'text-white' : 'text-gray-900'}
              `}
            >
              {t('settings_title')}
            </h1>
            <p
              className={`
                text-sm
                ${isDark ? 'text-gray-400' : 'text-gray-600'}
              `}
            >
              {t('settings_subtitle')}
            </p>
          </div>

          <button
            onClick={() => navigate('/dashboard')}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-xl border
              font-medium transition-all duration-200
              ${isDark
                ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 border-gray-700'
                : 'bg-white text-gray-700 hover:bg-gray-100 border-gray-200'
              }
              focus:outline-none focus:ring-4 focus:ring-blue-500/20
              transform hover:scale-105 active:scale-95
            `}
            aria-label={t('back')}
            style={{ minHeight: '44px' }}
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">{t('back')}</span>
          </button>
        </div>

        {/* Sections */}
        <div className="space-y-6 animate-fadeInUp">
          {/* Profil */}
          <ProfileSection
            profile={settings.profile}
            onUpdateProfile={updateProfile}
            onUploadAvatar={uploadAvatar}
            onDeleteAvatar={deleteAvatar}
            isDark={isDark}
          />

          {/* Apparence & Langue */}
          <AppearanceSection
            appearance={settings.appearance}
            onUpdate={updateAppearance}
            isDark={isDark}
          />

          {/* Notifications */}
          <NotificationsSection
            notifications={settings.notifications}
            onUpdate={updateNotifications}
            isDark={isDark}
          />

          {/* Sécurité & Support */}
          <SecuritySection
            onLogout={handleLogout}
            onDeleteAccount={handleDeleteAccount}
            isLoading={isLoading}
            isDark={isDark}
          />

          {/* Testeur de Quotas (Admin uniquement) */}
          {(user?.email === 'redasahraoui1@gmail.com' || user?.email === 'reda_sahraoui@outlook.fr') && (
            <div className="mt-8">
              <QuotaTester testEmail="redasahraoui1@gmail.com" />
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={`
            mt-8 pt-6 border-t text-center text-sm
            ${isDark ? 'border-gray-800 text-gray-500' : 'border-gray-200 text-gray-500'}
            animate-fadeIn
          `}
        >
          <p>
            Centrinote v1.0.0 · {new Date().getFullYear()}
          </p>
        </div>
      </div>

      {/* Styles pour les animations */}
      <style jsx>{`
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fadeInDown {
          animation: fadeInDown 400ms ease-out;
        }
        .animate-fadeInUp {
          animation: fadeInUp 400ms ease-out 100ms both;
        }
        .animate-fadeIn {
          animation: fadeIn 400ms ease-out 200ms both;
        }
      `}</style>
    </div>
  );
}

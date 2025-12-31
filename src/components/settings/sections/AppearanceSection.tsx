/**
 * Section Apparence & Langue
 * Conformément au cahier des charges - Section 4
 */

import React, { useState, useEffect } from 'react';
import { Palette } from 'lucide-react';
import { SettingsCard } from '../ui/SettingsCard';
import { AppearanceSettings } from '../../../types/settings.types';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useThemeSync } from '../../../hooks/useThemeSync';
import { useTextSize } from '../../../hooks/useTextSize';
import { useTranslation } from '../../../hooks/useTranslation';

interface AppearanceSectionProps {
  appearance: AppearanceSettings;
  onUpdate: (updates: Partial<AppearanceSettings>) => Promise<void>;
  isDark?: boolean;
}

export function AppearanceSection({
  appearance,
  onUpdate,
  isDark = false
}: AppearanceSectionProps) {
  const { theme, setTheme } = useThemeSync(); // ✅ Utiliser useThemeSync pour synchronisation garantie
  const { textSize, setTextSize } = useTextSize(); // ✅ Lire et modifier via useTextSize pour la synchronisation
  const { language, setLanguage } = useLanguage(); // ✅ Lire ET modifier la langue
  const { t } = useTranslation(); // ✅ Utiliser les traductions
  const [languageUpdateSuccess, setLanguageUpdateSuccess] = useState(false);
  const [textSizeUpdateSuccess, setTextSizeUpdateSuccess] = useState(false);
  const textSizes = [
    { value: 's' as const, label: t('text_size_small'), example: 'text-sm' },
    { value: 'm' as const, label: t('text_size_medium'), example: 'text-base' },
    { value: 'l' as const, label: t('text_size_large'), example: 'text-lg' }
  ];

  const languages = [
    { value: 'fr' as const, label: t('language_french'), flag: '🇫🇷' },
    { value: 'en' as const, label: t('language_english'), flag: '🇬🇧' },
    { value: 'es' as const, label: t('language_spanish'), flag: '🇪🇸' }
  ];

  // ✅ SYNCHRONISATION : Appliquer le textSize depuis les paramètres chargés (Supabase → LocalStorage)
  useEffect(() => {
    if (appearance.textSize && appearance.textSize !== textSize) {
      setTextSize(appearance.textSize);
    }
  }, [appearance.textSize, textSize, setTextSize]);

  // ✅ SYNCHRONISATION : Appliquer la langue depuis les paramètres chargés (Supabase → LocalStorage)
  useEffect(() => {
    if (appearance.language && appearance.language !== language) {
      setLanguage(appearance.language);
    }
  }, [appearance.language, language, setLanguage]);

  // ✅ SYNCHRONISATION : Appliquer le thème via useTheme (source unique de vérité)
  const handleThemeChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const theme = e.target.value as AppearanceSettings['theme'];

    // 1. Appliquer immédiatement via useTheme (met à jour le DOM + localStorage)
    setTheme(theme);

    // 2. Sauvegarder dans les paramètres utilisateur
    await onUpdate({ theme });
  };

  const handleTextSizeChange = async (size: 's' | 'm' | 'l') => {
    try {
      console.log('[AppearanceSection] Changement de taille demandé:', size);
      
      // 1. Appliquer immédiatement via useTextSize (mise à jour DOM + localStorage)
      setTextSize(size);

      // Vérification immédiate après application
      setTimeout(() => {
        const htmlEl = document.documentElement;
        const appliedSize = htmlEl.style.fontSize || getComputedStyle(htmlEl).fontSize;
        console.log('[AppearanceSection] Taille appliquée sur html:', appliedSize);
        console.log('[AppearanceSection] Classes html:', htmlEl.className);
      }, 50);

      // 2. Sauvegarder dans les paramètres utilisateur (synchronisation BDD)
      await onUpdate({ textSize: size });

      setTextSizeUpdateSuccess(true);
      setTimeout(() => setTextSizeUpdateSuccess(false), 2000);
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la taille du texte:', error);
      // En cas d'erreur, on pourrait restaurer la valeur précédente si nécessaire
    }
  };

  const handleLanguageChange = async (lang: 'fr' | 'en' | 'es') => {
    try {
      // 1. Appliquer immédiatement via setLanguage (mise à jour contexte + localStorage)
      setLanguage(lang);

      // 2. Sauvegarder dans les paramètres utilisateur (synchronisation BDD)
      await onUpdate({ language: lang });

      setLanguageUpdateSuccess(true);
      setTimeout(() => setLanguageUpdateSuccess(false), 3000);
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la langue:', error);
    }
  };

  return (
    <SettingsCard
      icon={Palette}
      title={t('appearance_and_language')}
      description={t('appearance_description')}
      isDark={isDark}
    >
      <div className="space-y-6">
        {/* Thème */}
        <div>
          <label
            htmlFor="theme-select"
            className={`
              block text-sm font-medium mb-3
              ${isDark ? 'text-gray-300' : 'text-gray-700'}
            `}
          >
            {t('theme')}
          </label>
          <select
            id="theme-select"
            name="theme"
            value={theme} // ✅ Utiliser theme de useThemeSync (source de vérité)
            onChange={handleThemeChange}
            className={`
              w-full px-4 py-3 rounded-lg border
              ${isDark
                ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500'
                : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
              }
              focus:outline-none focus:ring-4 focus:ring-blue-500/20
              transition-all cursor-pointer
            `}
            aria-label={t('theme')}
          >
            <option value="system">🖥️ {t('theme_system')}</option>
            <option value="light">☀️ {t('theme_light')}</option>
            <option value="dark">🌙 {t('theme_dark')}</option>
          </select>
        </div>

        {/* Taille du texte */}
        <div>
          <label
            className={`
              block text-sm font-medium mb-3
              ${isDark ? 'text-gray-300' : 'text-gray-700'}
            `}
          >
            {t('text_size')}
          </label>
          <div className="grid grid-cols-3 gap-3" role="radiogroup" aria-label={t('text_size')}>
            {textSizes.map((size) => (
              <button
                key={size.value}
                id={`text-size-${size.value}`}
                name="text-size"
                type="button"
                onClick={() => handleTextSizeChange(size.value)}
                className={`
                  px-4 py-3 rounded-lg border
                  font-medium transition-all duration-200
                  ${textSize === size.value
                    ? isDark
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-blue-50 border-blue-500 text-blue-700'
                    : isDark
                      ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }
                  focus:outline-none focus:ring-4 focus:ring-blue-500/20
                  transform hover:scale-105 active:scale-95
                `}
                role="radio"
                aria-checked={textSize === size.value}
                aria-label={`Taille ${size.label}`}
                style={{ minHeight: '44px' }}
              >
                <span className={size.example}>{size.label}</span>
              </button>
            ))}
          </div>
          {textSizeUpdateSuccess && (
            <p className="text-sm text-green-500 mt-2" role="status">
              ✓ {t('text_size_updated')}
            </p>
          )}
        </div>

        {/* Langue */}
        <div>
          <label
            htmlFor="language-select"
            className={`
              block text-sm font-medium mb-3
              ${isDark ? 'text-gray-300' : 'text-gray-700'}
            `}
          >
            {t('language')}
          </label>
          <select
            id="language-select"
            name="language"
            value={appearance.language}
            onChange={(e) => handleLanguageChange(e.target.value as AppearanceSettings['language'])}
            className={`
              w-full px-4 py-3 rounded-lg border
              ${isDark
                ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500'
                : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
              }
              focus:outline-none focus:ring-4 focus:ring-blue-500/20
              transition-all cursor-pointer
            `}
            aria-label={t('language')}
          >
            {languages.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.flag} {lang.label}
              </option>
            ))}
          </select>
          {languageUpdateSuccess && (
            <p className="text-sm text-green-500 mt-2" role="status">
              ✓ {t('language_updated')}
            </p>
          )}
          <p
            className={`
              text-xs mt-2
              ${isDark ? 'text-gray-500' : 'text-gray-500'}
            `}
          >
            {t('language_applied_note')}
          </p>
        </div>
      </div>
    </SettingsCard>
  );
}

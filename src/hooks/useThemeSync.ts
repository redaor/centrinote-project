/**
 * Hook de synchronisation du thème
 * Garantit que tous les composants utilisent la même source de vérité
 * et sont synchronisés entre eux
 */

import { useEffect, useState } from 'react';
import { useTheme, type Theme } from './useTheme';

interface UseThemeSyncReturn {
  theme: Theme;
  isDarkMode: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  mounted: boolean;
}

export function useThemeSync(): UseThemeSyncReturn {
  const { theme, isDarkMode, setTheme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Marquer comme monté pour éviter le flash de contenu
  useEffect(() => {
    setMounted(true);
  }, []);

  // ✅ Écouter les changements de thème depuis d'autres composants (same-tab)
  useEffect(() => {
    const handleThemeChange = (event: CustomEvent<{ theme: Theme }>) => {
      // Le thème a été changé par un autre composant
      // useTheme gère déjà la mise à jour, on log juste pour debug
      if (import.meta.env.DEV) {
        console.log('🔄 [THEME-SYNC] Thème changé par un autre composant:', event.detail.theme);
      }
    };

    window.addEventListener('theme-changed', handleThemeChange as EventListener);

    return () => {
      window.removeEventListener('theme-changed', handleThemeChange as EventListener);
    };
  }, []);

  // ✅ Debug en développement
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('🔍 [THEME-SYNC] État actuel:', {
        theme,
        isDarkMode,
        localStorage: localStorage.getItem('centrinote-theme'),
        hasDarkClass: document.documentElement.classList.contains('dark'),
        timestamp: new Date().toISOString()
      });
    }
  }, [theme, isDarkMode]);

  return {
    theme,
    isDarkMode,
    setTheme,
    toggleTheme,
    mounted
  };
}


import { useState, useEffect, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';

export type Theme = 'system' | 'light' | 'dark';

interface UseThemeReturn {
  theme: Theme;
  isDarkMode: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export function useTheme(): UseThemeReturn {
  const [storedTheme, setStoredTheme] = useLocalStorage<Theme>('centrinote-theme', 'system');
  const [theme, setTheme] = useState<Theme>(storedTheme);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Fonction pour appliquer le thème
  const applyTheme = useCallback((newTheme: Theme) => {
    const root = document.documentElement;
    
    if (newTheme === 'dark') {
      root.classList.add('dark');
      setIsDarkMode(true);
    } else if (newTheme === 'light') {
      root.classList.remove('dark');
      setIsDarkMode(false);
    } else {
      // System theme - suivre les préférences système
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
        setIsDarkMode(true);
      } else {
        root.classList.remove('dark');
        setIsDarkMode(false);
      }
    }
  }, []);

  // Fonction pour détecter les changements de préférences système
  const handleSystemThemeChange = useCallback((e: MediaQueryListEvent) => {
    if (theme === 'system') {
      applyTheme('system');
    }
  }, [theme, applyTheme]);

  // Initialiser le thème au montage
  useEffect(() => {
    applyTheme(theme);
    
    // Écouter les changements de préférences système
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', handleSystemThemeChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, [theme, applyTheme, handleSystemThemeChange]);

  // Fonction pour changer le thème
  const handleSetTheme = useCallback((newTheme: Theme) => {
    setTheme(newTheme);
    setStoredTheme(newTheme);
    applyTheme(newTheme);

    // ✅ Dispatcher un événement custom pour synchronisation same-tab
    // L'événement 'storage' natif ne se déclenche QUE pour les autres onglets
    window.dispatchEvent(new CustomEvent('theme-changed', {
      detail: { theme: newTheme }
    }));
  }, [setStoredTheme, applyTheme]);

  // Fonction pour basculer entre clair/sombre (ignore system)
  const toggleTheme = useCallback(() => {
    const newTheme = isDarkMode ? 'light' : 'dark';
    handleSetTheme(newTheme);
  }, [isDarkMode, handleSetTheme]);

  return {
    theme,
    isDarkMode,
    setTheme: handleSetTheme,
    toggleTheme
  };
}

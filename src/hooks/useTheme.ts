import { useState, useEffect, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';

export type Theme = 'system' | 'light' | 'dark';

interface UseThemeReturn {
  theme: Theme;
  isDarkMode: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

// Variable pour éviter les boucles infinies lors de la synchronisation
let isInternalUpdate = false;

export function useTheme(): UseThemeReturn {
  // ✅ Lire directement le localStorage au démarrage pour éviter les désynchronisations
  const getInitialTheme = (): Theme => {
    if (typeof window === 'undefined') return 'system';
    try {
      const stored = localStorage.getItem('centrinote-theme');
      if (stored) {
        // useLocalStorage stocke avec JSON.stringify, donc on doit parser
        const parsed = JSON.parse(stored);
        if (parsed === 'dark' || parsed === 'light' || parsed === 'system') {
          return parsed as Theme;
        }
      }
    } catch (error) {
      // Si erreur de parsing, essayer de lire directement (pour compatibilité)
      const stored = localStorage.getItem('centrinote-theme');
      if (stored === 'dark' || stored === 'light' || stored === 'system') {
        return stored as Theme;
      }
    }
    return 'system';
  };

  const [storedTheme, setStoredTheme] = useLocalStorage<Theme>('centrinote-theme', 'system');
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // ✅ Initialiser isDarkMode en fonction du thème réel du localStorage
    const initialTheme = getInitialTheme();
    if (initialTheme === 'dark') return true;
    if (initialTheme === 'light') return false;
    // System theme
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

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

  // ✅ FORCER la synchronisation au montage (priorité absolue)
  useEffect(() => {
    // Lire directement le localStorage (sans passer par useLocalStorage qui peut être désynchronisé)
    let initialTheme: Theme = 'system';
    try {
      const raw = localStorage.getItem('centrinote-theme');
      if (raw) {
        // Essayer de parser comme JSON (format de useLocalStorage)
        try {
          const parsed = JSON.parse(raw);
          if (parsed === 'dark' || parsed === 'light' || parsed === 'system') {
            initialTheme = parsed;
          }
        } catch {
          // Si ce n'est pas du JSON, utiliser directement (compatibilité)
          if (raw === 'dark' || raw === 'light' || raw === 'system') {
            initialTheme = raw as Theme;
          }
        }
      }
    } catch (error) {
      console.error('[THEME] Erreur lecture localStorage:', error);
    }

    // Vérifier la cohérence avec le DOM
    const hasDarkClass = document.documentElement.classList.contains('dark');
    const shouldBeDark = initialTheme === 'dark' || (initialTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (import.meta.env.DEV) {
      console.log('🔍 [THEME] Synchronisation forcée:', {
        initialTheme,
        currentTheme: theme,
        localStorage: localStorage.getItem('centrinote-theme'),
        hasDarkClass,
        shouldBeDark,
        isDarkMode
      });
    }

    // FORCER la synchronisation complète
    if (initialTheme !== theme) {
      setTheme(initialTheme);
      setStoredTheme(initialTheme);
    }

    // FORCER la classe dark sur le DOM si nécessaire
    if (shouldBeDark && !hasDarkClass) {
      document.documentElement.classList.add('dark');
      setIsDarkMode(true);
    } else if (!shouldBeDark && hasDarkClass) {
      document.documentElement.classList.remove('dark');
      setIsDarkMode(false);
    } else {
      // Appliquer le thème normalement
      applyTheme(initialTheme);
    }
  }, []); // Seulement au montage

  // ✅ Script de réparation : DÉSACTIVÉ pour éviter les boucles infinies
  // Le thème est géré directement par applyTheme() qui est appelé lors des changements
  // Pas besoin de MutationObserver qui crée des boucles infinies

  // Écouter les changements de préférences système (uniquement pour le thème 'system')
  useEffect(() => {
    if (theme !== 'system') return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', handleSystemThemeChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, [theme, handleSystemThemeChange]);

  // ✅ Écouter les changements de thème depuis d'autres instances (same-tab)
  useEffect(() => {
    const handleThemeChangeEvent = (event: CustomEvent<{ theme: Theme }>) => {
      // Ignorer si c'est une mise à jour interne pour éviter les boucles
      if (isInternalUpdate) {
        return;
      }

      // Si le thème a changé depuis un autre composant, mettre à jour notre état
      const newTheme = event.detail.theme;
      if (newTheme !== theme) {
        // Mettre à jour l'état local sans déclencher un nouvel événement
        isInternalUpdate = true;
        setTheme(newTheme);
        setStoredTheme(newTheme);
        applyTheme(newTheme);
        
        setTimeout(() => {
          isInternalUpdate = false;
        }, 100);
      }
    };

    window.addEventListener('theme-changed', handleThemeChangeEvent as EventListener);

    return () => {
      window.removeEventListener('theme-changed', handleThemeChangeEvent as EventListener);
    };
  }, [theme, setStoredTheme, applyTheme]);

  // Fonction pour changer le thème
  const handleSetTheme = useCallback((newTheme: Theme) => {
    if (import.meta.env.DEV) {
      console.log('🎨 [THEME] Changement de thème demandé:', {
        from: theme,
        to: newTheme,
        currentIsDarkMode: isDarkMode
      });
    }

    // Marquer comme mise à jour interne pour éviter les boucles
    isInternalUpdate = true;
    
    // 1. Mettre à jour l'état React
    setTheme(newTheme);
    setStoredTheme(newTheme);
    
    // 2. Appliquer immédiatement sur le DOM
    applyTheme(newTheme);

    // 3. Dispatcher un événement custom pour synchronisation same-tab
    // L'événement 'storage' natif ne se déclenche QUE pour les autres onglets
    window.dispatchEvent(new CustomEvent('theme-changed', {
      detail: { theme: newTheme }
    }));

    // Réinitialiser le flag après un court délai
    setTimeout(() => {
      isInternalUpdate = false;
    }, 100);
  }, [setStoredTheme, applyTheme, theme, isDarkMode]);

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

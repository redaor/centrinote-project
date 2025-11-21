/**
 * 🎣 Hook React pour Console Error Interceptor
 *
 * Permet de contrôler facilement l'interception des console.error
 * depuis n'importe quel composant React.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { enable, disable, isEnabled, stats } = useConsoleInterceptor();
 *
 *   return (
 *     <button onClick={() => enable({ blockedKeywords: ['navigation'] })}>
 *       Bloquer erreurs navigation
 *     </button>
 *   );
 * }
 * ```
 */

import { useEffect, useState, useCallback } from 'react';
import {
  getConsoleInterceptor,
  enableConsoleInterception,
  disableConsoleInterception,
  blockAllConsoleErrors,
  blockErrorsWithKeywords,
  allowOnlyErrorsWithKeywords,
  blockNavigationErrors,
  blockLoopErrors,
  blockCorsErrors,
  enableDebugMode,
  type ConsoleInterceptorConfig,
} from '../utils/consoleInterceptor';

interface UseConsoleInterceptorReturn {
  /** Active l'interception avec config optionnelle */
  enable: (config?: Partial<ConsoleInterceptorConfig>) => void;

  /** Désactive l'interception */
  disable: () => void;

  /** Toggle activation/désactivation */
  toggle: () => void;

  /** État actuel (activé/désactivé) */
  isEnabled: boolean;

  /** Statistiques d'interception */
  stats: {
    blocked: number;
    allowed: number;
  };

  /** Presets rapides */
  presets: {
    blockAll: () => void;
    blockNavigation: () => void;
    blockLoops: () => void;
    blockCors: () => void;
    enableDebug: () => void;
    blockKeywords: (keywords: string[]) => void;
    allowKeywords: (keywords: string[]) => void;
  };

  /** Appelle console.error original (bypass) */
  callOriginal: (...args: any[]) => void;
}

/**
 * 🎣 Hook pour gérer l'interception des console.error
 *
 * @param autoEnable - Active automatiquement au montage du composant
 * @param autoConfig - Configuration automatique si autoEnable = true
 */
export function useConsoleInterceptor(
  autoEnable: boolean = false,
  autoConfig?: Partial<ConsoleInterceptorConfig>
): UseConsoleInterceptorReturn {
  const interceptor = getConsoleInterceptor();

  // État local pour forcer le re-render
  const [isEnabled, setIsEnabled] = useState(() => interceptor.getState().enabled);
  const [stats, setStats] = useState(() => interceptor.getState().stats || { blocked: 0, allowed: 0 });

  // Mise à jour de l'état depuis l'intercepteur
  const updateState = useCallback(() => {
    const state = interceptor.getState();
    setIsEnabled(state.enabled);
    setStats(state.stats || { blocked: 0, allowed: 0 });
  }, [interceptor]);

  // Enable avec mise à jour d'état
  const enable = useCallback(
    (config?: Partial<ConsoleInterceptorConfig>) => {
      enableConsoleInterception(config);
      updateState();
    },
    [updateState]
  );

  // Disable avec mise à jour d'état
  const disable = useCallback(() => {
    disableConsoleInterception();
    updateState();
  }, [updateState]);

  // Toggle
  const toggle = useCallback(() => {
    if (isEnabled) {
      disable();
    } else {
      enable();
    }
  }, [isEnabled, enable, disable]);

  // Presets
  const presets = {
    blockAll: useCallback(() => {
      blockAllConsoleErrors();
      updateState();
    }, [updateState]),

    blockNavigation: useCallback(() => {
      blockNavigationErrors();
      updateState();
    }, [updateState]),

    blockLoops: useCallback(() => {
      blockLoopErrors();
      updateState();
    }, [updateState]),

    blockCors: useCallback(() => {
      blockCorsErrors();
      updateState();
    }, [updateState]),

    enableDebug: useCallback(() => {
      enableDebugMode();
      updateState();
    }, [updateState]),

    blockKeywords: useCallback(
      (keywords: string[]) => {
        blockErrorsWithKeywords(keywords);
        updateState();
      },
      [updateState]
    ),

    allowKeywords: useCallback(
      (keywords: string[]) => {
        allowOnlyErrorsWithKeywords(keywords);
        updateState();
      },
      [updateState]
    ),
  };

  // Bypass
  const callOriginal = useCallback((...args: any[]) => {
    interceptor.callOriginal(...args);
  }, [interceptor]);

  // Auto-enable au montage si demandé
  useEffect(() => {
    if (autoEnable) {
      enable(autoConfig);
    }

    // Cleanup : désactiver au démontage pour éviter les fuites
    return () => {
      if (autoEnable) {
        disable();
      }
    };
  }, [autoEnable]); // Volontairement pas de dépendances sur enable/disable pour éviter boucle

  // Polling pour mettre à jour les stats (optionnel, toutes les 2 secondes)
  useEffect(() => {
    const interval = setInterval(updateState, 2000);
    return () => clearInterval(interval);
  }, [updateState]);

  return {
    enable,
    disable,
    toggle,
    isEnabled,
    stats,
    presets,
    callOriginal,
  };
}

/**
 * 🎣 Hook simple pour activer automatiquement l'interception
 *
 * @example
 * ```tsx
 * function App() {
 *   // Bloque automatiquement les erreurs de navigation
 *   useAutoBlockErrors({ blockedKeywords: ['navigation', 'router'] });
 *
 *   return <div>...</div>;
 * }
 * ```
 */
export function useAutoBlockErrors(config: Partial<ConsoleInterceptorConfig>) {
  useEffect(() => {
    enableConsoleInterception(config);

    return () => {
      disableConsoleInterception();
    };
  }, []); // Pas de dépendances pour éviter réactivation
}

/**
 * 🎣 Hook pour debugging : log toutes les erreurs dans un state
 *
 * @example
 * ```tsx
 * function DebugPanel() {
 *   const errors = useErrorLogger();
 *
 *   return (
 *     <div>
 *       {errors.map((err, i) => <div key={i}>{err}</div>)}
 *     </div>
 *   );
 * }
 * ```
 */
export function useErrorLogger(maxErrors: number = 50) {
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    enableConsoleInterception({
      onError: (message) => {
        setErrors(prev => {
          const newErrors = [...prev, message];
          return newErrors.slice(-maxErrors); // Garder seulement les N dernières
        });
      },
    });

    return () => {
      disableConsoleInterception();
    };
  }, [maxErrors]);

  return errors;
}

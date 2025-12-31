/**
 * Composant de debug pour vérifier la synchronisation du thème
 * Affiche l'état actuel du thème et vérifie la cohérence
 */

import { useEffect, useState } from 'react';
import { useThemeSync } from '../../hooks/useThemeSync';

export function ThemeSyncDebug() {
  const { theme, isDarkMode, mounted } = useThemeSync();
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    const updateDebugInfo = () => {
      const root = document.documentElement;
      const hasDarkClass = root.classList.contains('dark');
      const storedTheme = localStorage.getItem('centrinote-theme');
      
      setDebugInfo({
        theme,
        isDarkMode,
        hasDarkClass,
        storedTheme,
        matches: hasDarkClass === isDarkMode,
        mounted,
        timestamp: new Date().toISOString()
      });
    };

    updateDebugInfo();

    // Mettre à jour toutes les 500ms pour voir les changements en temps réel
    const interval = setInterval(updateDebugInfo, 500);

    // Observer les changements de classe sur l'élément root
    const observer = new MutationObserver(() => {
      updateDebugInfo();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    // Écouter les événements de changement de thème
    const handleThemeChange = () => {
      updateDebugInfo();
    };

    window.addEventListener('theme-changed', handleThemeChange);

    return () => {
      clearInterval(interval);
      observer.disconnect();
      window.removeEventListener('theme-changed', handleThemeChange);
    };
  }, [theme, isDarkMode, mounted]);

  // Ne s'affiche qu'en mode développement
  if (import.meta.env.PROD) {
    return null;
  }

  const isInSync = debugInfo.matches && debugInfo.storedTheme === theme;

  return (
    <div className="fixed top-4 right-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 max-w-sm z-50 text-xs">
      <h3 className="font-bold mb-2 text-gray-900 dark:text-white">🎨 Debug Synchronisation Thème</h3>
      <div className="space-y-1 text-gray-700 dark:text-gray-300">
        <div>
          <strong>Thème:</strong> <span className="font-mono">{debugInfo.theme || 'loading...'}</span>
        </div>
        <div>
          <strong>isDarkMode:</strong> {debugInfo.isDarkMode ? '✅ Oui' : '❌ Non'}
        </div>
        <div>
          <strong>Classe dark:</strong> {debugInfo.hasDarkClass ? '✅ Présente' : '❌ Absente'}
        </div>
        <div>
          <strong>localStorage:</strong> <span className="font-mono">{debugInfo.storedTheme || 'null'}</span>
        </div>
        <div>
          <strong>Mounted:</strong> {debugInfo.mounted ? '✅' : '⏳'}
        </div>
        <div className={`mt-2 p-2 rounded ${isInSync ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'}`}>
          <strong>Synchronisation:</strong> {isInSync ? '✅ OK' : '❌ DÉSYNCHRONISÉ'}
        </div>
        {!isInSync && (
          <div className="mt-1 text-xs text-red-600 dark:text-red-400">
            ⚠️ Incohérence détectée ! Vérifiez les deux boutons de thème.
          </div>
        )}
      </div>
    </div>
  );
}

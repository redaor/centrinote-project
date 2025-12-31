/**
 * Composant de diagnostic pour le mode sombre
 * Aide à identifier les problèmes de mode sombre partiel
 */

import { useEffect, useState } from 'react';
import { useTheme } from '../../hooks/useTheme';

export function DarkModeDiagnostic() {
  const { theme, isDarkMode } = useTheme();
  const [diagnostics, setDiagnostics] = useState<any>({});

  useEffect(() => {
    const runDiagnostics = () => {
      const root = document.documentElement;
      const hasDarkClass = root.classList.contains('dark');
      const storedTheme = localStorage.getItem('centrinote-theme');
      
      // Vérifier les éléments avec classes dark:
      const darkElements = document.querySelectorAll('[class*="dark:"]');
      
      // Trouver les éléments problématiques (devraient être dark mais ne le sont pas)
      const problematicElements: any[] = [];
      darkElements.forEach((el, index) => {
        if (index < 10) { // Limiter à 10 pour éviter la surcharge
          const computedStyle = window.getComputedStyle(el);
          const bgColor = computedStyle.backgroundColor;
          const textColor = computedStyle.color;
          
          // Vérifier si l'élément a un fond blanc en mode sombre
          if (hasDarkClass && bgColor.includes('rgb(255, 255, 255)')) {
            problematicElements.push({
              element: el.tagName,
              className: el.className.substring(0, 100),
              backgroundColor: bgColor,
              textColor: textColor
            });
          }
        }
      });

      setDiagnostics({
        theme,
        isDarkMode,
        hasDarkClass,
        storedTheme,
        darkElementsCount: darkElements.length,
        problematicElements: problematicElements.slice(0, 5), // Limiter à 5
        rootClasses: root.className,
        timestamp: new Date().toISOString()
      });
    };

    // Exécuter immédiatement
    runDiagnostics();

    // Réexécuter après un court délai pour capturer les changements
    const timeout = setTimeout(runDiagnostics, 500);

    // Observer les changements de classe sur l'élément root
    const observer = new MutationObserver(() => {
      runDiagnostics();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => {
      clearTimeout(timeout);
      observer.disconnect();
    };
  }, [theme, isDarkMode]);

  // Ne s'affiche qu'en mode développement
  if (import.meta.env.PROD) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 max-w-md z-50 text-xs">
      <h3 className="font-bold mb-2 text-gray-900 dark:text-white">🔍 Diagnostic Mode Sombre</h3>
      <div className="space-y-1 text-gray-700 dark:text-gray-300">
        <div>
          <strong>Thème:</strong> {diagnostics.theme}
        </div>
        <div>
          <strong>isDarkMode:</strong> {diagnostics.isDarkMode ? '✅' : '❌'}
        </div>
        <div>
          <strong>Classe dark:</strong> {diagnostics.hasDarkClass ? '✅ Présente' : '❌ Absente'}
        </div>
        <div>
          <strong>localStorage:</strong> {diagnostics.storedTheme || 'non défini'}
        </div>
        <div>
          <strong>Éléments avec dark:</strong> {diagnostics.darkElementsCount}
        </div>
        {diagnostics.problematicElements && diagnostics.problematicElements.length > 0 && (
          <div className="mt-2">
            <strong className="text-red-600 dark:text-red-400">⚠️ Éléments problématiques:</strong>
            <ul className="list-disc list-inside mt-1">
              {diagnostics.problematicElements.map((item: any, idx: number) => (
                <li key={idx} className="text-xs">
                  {item.element}: {item.className.substring(0, 50)}...
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 🔬 PRIVACY ISOLATION PANEL - Diagnostic Non-Destructif
 *
 * Permet d'isoler les sous-composants de l'onglet "Données & Confidentialité"
 * pour identifier le coupable du freeze/scroll bloqué.
 *
 * Utilisation: /settings → onglet "Données" → ?iso=privacy
 *
 * ⚠️ RÈGLE: Ne rien supprimer, seulement isoler temporairement
 */

import React, { useState, useEffect, useCallback } from 'react';
import { X, Power, RefreshCw, Check, AlertCircle, Activity, Zap } from 'lucide-react';
import { useScrollDiagnostics, type ScrollDiagnosticsData } from './scrollDiagnostics';

const DEBUG = import.meta.env.DEV;

interface IsolationGroup {
  key: string;
  label: string;
  color: string;
  selectors: string[];
  description: string;
  canUnmount: boolean; // Si true, on peut unmount le composant (via prop/context)
}

// Groupes d'éléments à isoler dans Privacy
const PRIVACY_GROUPS: IsolationGroup[] = [
  {
    key: 'export',
    label: 'Export Data',
    color: '#3b82f6',
    selectors: [
      'button:has(.lucide-download)',
      '[data-privacy="export"]',
      '.export-section'
    ],
    description: 'Bouton export de données',
    canUnmount: false
  },
  {
    key: 'import',
    label: 'Import Data',
    color: '#14b8a6',
    selectors: [
      'button:has(.lucide-upload)',
      '[data-privacy="import"]',
      '.import-section'
    ],
    description: 'Bouton import de données',
    canUnmount: false
  },
  {
    key: 'delete',
    label: 'Delete Account',
    color: '#ef4444',
    selectors: [
      'button:has(.lucide-trash-2)',
      '[data-privacy="delete"]',
      '.delete-section'
    ],
    description: 'Bouton suppression de compte',
    canUnmount: false
  },
  {
    key: 'modal',
    label: 'Delete Modal',
    color: '#f59e0b',
    selectors: [
      '.fixed.inset-0.bg-black',
      '.fixed.top-1\\/2.left-1\\/2',
      '[data-portal]'
    ],
    description: 'Modal de confirmation suppression',
    canUnmount: false
  },
  {
    key: 'messages',
    label: 'Toast Messages',
    color: '#8b5cf6',
    selectors: [
      '.fixed.top-4.right-4',
      '.animate-fade-in',
      '[role="status"]',
      '[role="alert"]'
    ],
    description: 'Messages de notification (success/error)',
    canUnmount: false
  },
  {
    key: 'stats',
    label: 'Statistics Counter',
    color: '#10b981',
    selectors: [
      '.text-4xl.font-bold',
      '.text-center:has(.text-4xl)',
      '[data-privacy="stats"]'
    ],
    description: 'Compteur d\'éléments (docs, mots)',
    canUnmount: false
  },
  {
    key: 'overlays',
    label: 'All Overlays',
    color: '#06b6d4',
    selectors: [
      '.absolute.inset-0',
      '.fixed.inset-0',
      '[class*="overlay"]'
    ],
    description: 'Tous les overlays/backdrops',
    canUnmount: false
  }
];

// Context pour partager l'état d'isolation avec DataPrivacySection
export const PrivacyIsolationContext = React.createContext<{
  disabled: Set<string>;
  isIsolationActive: boolean;
}>({
  disabled: new Set(),
  isIsolationActive: false
});

export function PrivacyIsolation() {
  const [isOpen, setIsOpen] = useState(true);
  const [disabledGroups, setDisabledGroups] = useState<Set<string>>(new Set());
  const [elementCounts, setElementCounts] = useState<Record<string, number>>({});
  const [lastAction, setLastAction] = useState<string>('');
  const [showDiagnostics, setShowDiagnostics] = useState(true);

  // Hook de diagnostics de scroll
  const diagnostics = useScrollDiagnostics(showDiagnostics, '[PRIVACY]');

  // Charger depuis localStorage au montage
  useEffect(() => {
    const stored = localStorage.getItem('PRIVACY_ISO');
    if (stored) {
      try {
        const keys = stored.split(',').filter(Boolean);
        setDisabledGroups(new Set(keys));
        DEBUG && console.log('[PRIVACY_ISO] ✅ Chargé depuis localStorage:', keys);
      } catch (e) {
        console.error('[PRIVACY_ISO] Erreur lecture localStorage:', e);
      }
    }
  }, []);

  // Compter les éléments pour chaque groupe
  useEffect(() => {
    const counts: Record<string, number> = {};
    PRIVACY_GROUPS.forEach(group => {
      let count = 0;
      group.selectors.forEach(selector => {
        try {
          count += document.querySelectorAll(selector).length;
        } catch (e) {
          // Sélecteur invalide
        }
      });
      counts[group.key] = count;
    });
    setElementCounts(counts);
  }, [disabledGroups]); // Re-compter quand on isole/désisole

  // Appliquer/retirer les styles d'isolation
  useEffect(() => {
    PRIVACY_GROUPS.forEach(group => {
      const isDisabled = disabledGroups.has(group.key);

      group.selectors.forEach(selector => {
        try {
          const elements = document.querySelectorAll(selector);
          elements.forEach((el: Element) => {
            const htmlEl = el as HTMLElement;
            if (isDisabled) {
              // Mode isolation: désactiver visibilité et interactions
              htmlEl.style.pointerEvents = 'none';
              htmlEl.style.opacity = '0.25';
              htmlEl.style.filter = 'grayscale(100%)';
              htmlEl.setAttribute('data-privacy-isolated', 'true');
              htmlEl.setAttribute('data-privacy-group', group.key);
            } else {
              // Restaurer uniquement si c'était isolé par ce groupe
              if (htmlEl.getAttribute('data-privacy-isolated') === 'true' &&
                  htmlEl.getAttribute('data-privacy-group') === group.key) {
                htmlEl.style.pointerEvents = '';
                htmlEl.style.opacity = '';
                htmlEl.style.filter = '';
                htmlEl.removeAttribute('data-privacy-isolated');
                htmlEl.removeAttribute('data-privacy-group');
              }
            }
          });
        } catch (e) {
          // Sélecteur invalide
        }
      });
    });
  }, [disabledGroups]);

  const toggleGroup = useCallback((groupKey: string) => {
    const newDisabled = new Set(disabledGroups);
    if (newDisabled.has(groupKey)) {
      newDisabled.delete(groupKey);
      const action = `✅ Réactivé: ${PRIVACY_GROUPS.find(g => g.key === groupKey)?.label}`;
      console.log(`[PRIVACY_ISO] ${action}`);
      setLastAction(action);
    } else {
      newDisabled.add(groupKey);
      const action = `🚫 Isolé: ${PRIVACY_GROUPS.find(g => g.key === groupKey)?.label}`;
      console.log(`[PRIVACY_ISO] ${action}`);
      setLastAction(action);
    }
    setDisabledGroups(newDisabled);

    // Sauvegarder dans localStorage
    localStorage.setItem('PRIVACY_ISO', Array.from(newDisabled).join(','));
  }, [disabledGroups]);

  const resetAll = useCallback(() => {
    console.log('[PRIVACY_ISO] 🔄 Reset: Tous les groupes réactivés');
    setDisabledGroups(new Set());
    setLastAction('🔄 Reset: Tous les groupes réactivés');
    localStorage.removeItem('PRIVACY_ISO');
  }, []);

  const disableAll = useCallback(() => {
    console.log('[PRIVACY_ISO] 🚫 Tous les groupes isolés');
    setDisabledGroups(new Set(PRIVACY_GROUPS.map(g => g.key)));
    setLastAction('🚫 Tous les groupes isolés');
    localStorage.setItem('PRIVACY_ISO', PRIVACY_GROUPS.map(g => g.key).join(','));
  }, []);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 right-4 z-[9999] bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-full shadow-2xl transition-all border-2 border-purple-400 pointer-events-auto"
        title="Ouvrir Privacy Isolation"
      >
        <Power className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed top-4 right-4 z-[9999] bg-white dark:bg-gray-900 rounded-xl shadow-2xl border-2 border-purple-500 w-96 max-h-[90vh] overflow-hidden flex flex-col pointer-events-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Power className="w-5 h-5" />
            <h2 className="text-lg font-bold">Privacy Isolation</h2>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="hover:bg-white/20 p-1 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-purple-100">
          Diagnostic scroll freeze - <code>/settings?iso=privacy</code>
        </p>
      </div>

      {/* Last Action */}
      {lastAction && (
        <div className="bg-purple-50 dark:bg-purple-900/20 border-b border-purple-200 dark:border-purple-700 p-2">
          <div className="flex items-center space-x-2 text-xs text-purple-700 dark:text-purple-300">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{lastAction}</span>
          </div>
        </div>
      )}

      {/* Diagnostics HUD */}
      {showDiagnostics && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-700 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
              Diagnostics Scroll
            </span>
            <button
              onClick={() => setShowDiagnostics(false)}
              className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-200"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center space-x-1">
              <Activity className="w-3 h-3 text-blue-600 dark:text-blue-400" />
              <span className="text-blue-700 dark:text-blue-300">
                FPS: <strong className={diagnostics.fps < 45 ? 'text-red-600' : ''}>{diagnostics.fps}</strong>
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <Zap className="w-3 h-3 text-blue-600 dark:text-blue-400" />
              <span className="text-blue-700 dark:text-blue-300">
                Listeners: <strong>{diagnostics.scrollListeners}</strong>
              </span>
            </div>
          </div>
          {diagnostics.fps < 45 && (
            <div className="mt-2 text-xs text-red-600 dark:text-red-400 font-medium">
              ⚠️ FPS bas détecté - Freeze probable
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex space-x-2 p-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={resetAll}
          className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Check className="w-4 h-4" />
          <span>Reset</span>
        </button>
        <button
          onClick={disableAll}
          className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <X className="w-4 h-4" />
          <span>Isoler Tout</span>
        </button>
      </div>

      {/* Groups List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {PRIVACY_GROUPS.map(group => {
          const isDisabled = disabledGroups.has(group.key);
          const count = elementCounts[group.key] || 0;

          return (
            <div
              key={group.key}
              className={`border-2 rounded-lg p-3 transition-all ${
                isDisabled
                  ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
              }`}
            >
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDisabled}
                  onChange={() => toggleGroup(group.key)}
                  className="mt-1 w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: group.color }}
                    />
                    <span className="font-medium text-sm text-gray-900 dark:text-white">
                      {group.label}
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded-full text-gray-700 dark:text-gray-300">
                      {count}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {group.description}
                  </p>
                  {isDisabled && (
                    <div className="mt-2 text-xs text-red-600 dark:text-red-400 font-medium">
                      🚫 Isolé - pointer-events: none
                    </div>
                  )}
                </div>
              </label>
            </div>
          );
        })}
      </div>

      {/* Footer Instructions */}
      <div className="bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-3">
        <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-purple-500 rounded-full" />
            <span>Isole un élément pour tester le scroll</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span>Si scroll OK après isolation → coupable identifié!</span>
          </div>
        </div>
      </div>

      {/* Debug Info */}
      <div className="bg-purple-100 dark:bg-purple-900/30 border-t border-purple-200 dark:border-purple-700 p-2">
        <div className="text-xs text-purple-700 dark:text-purple-300 font-mono">
          Actifs: {PRIVACY_GROUPS.length - disabledGroups.size} | Isolés: {disabledGroups.size}
        </div>
      </div>
    </div>
  );
}

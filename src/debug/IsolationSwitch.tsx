/**
 * 🔬 ISOLATION SWITCH - Diagnostic Non-Destructif
 *
 * Permet de désactiver temporairement des groupes d'éléments pour identifier
 * celui qui bloque les clics sur les onglets Settings.
 *
 * Utilisation: /settings?iso=1
 */

import React, { useState, useEffect } from 'react';
import { X, Power, RefreshCw, Check, AlertCircle } from 'lucide-react';

interface IsolationGroup {
  id: string;
  label: string;
  color: string;
  selectors: string[];
  description: string;
}

const ISOLATION_GROUPS: IsolationGroup[] = [
  {
    id: 'topbar',
    label: 'Topbar / AppHeader',
    color: '#22c55e',
    selectors: [
      'header',
      '[role="banner"]',
      '.app-header',
      '.modern-app-header',
      '.top-bar'
    ],
    description: 'En-têtes de page et navigation supérieure'
  },
  {
    id: 'floating',
    label: 'Boutons Flottants (FAB)',
    color: '#eab308',
    selectors: [
      '.fab-admin-wrapper',
      '.floating',
      '[class*="floating-button"]',
      '[class*="fab-"]',
      '.fixed.bottom-6.right-6',
      'button[class*="fixed"][class*="bottom"]'
    ],
    description: 'Boutons flottants (Admin, aide, etc.)'
  },
  {
    id: 'modals',
    label: 'Modals / Dialogs / Overlays',
    color: '#3b82f6',
    selectors: [
      '[role="dialog"]',
      '.modal',
      '.dialog',
      '[class*="modal"]',
      '[class*="dialog"]',
      '.fixed.inset-0[class*="bg-black"]',
      '.backdrop',
      '[aria-modal="true"]'
    ],
    description: 'Modales et overlays de fond'
  },
  {
    id: 'notifications',
    label: 'Toasts / Notifications',
    color: '#a855f7',
    selectors: [
      '.toast',
      '.sonner',
      '.notification',
      '[class*="toast"]',
      '[class*="notification"]',
      '[role="alert"]',
      '[role="status"]'
    ],
    description: 'Notifications et messages temporaires'
  },
  {
    id: 'ai',
    label: 'IA / Assistants',
    color: '#f97316',
    selectors: [
      '.ai-badge',
      '.assistant',
      '.modern-ai-search',
      '[class*="ai-"]',
      '[class*="assistant"]',
      '.ai-search-container'
    ],
    description: 'Composants IA et assistants'
  },
  {
    id: 'animations',
    label: 'Animations (pulse, spin, bounce)',
    color: '#ec4899',
    selectors: [
      '[class*="animate-pulse"]',
      '[class*="animate-spin"]',
      '[class*="animate-bounce"]',
      '[class*="animate-ping"]'
    ],
    description: 'Éléments avec animations CSS'
  },
  {
    id: 'overlays',
    label: 'Overlays Décoratifs',
    color: '#06b6d4',
    selectors: [
      '.absolute.inset-0:not([role="dialog"])',
      '.fixed.inset-0:not([role="dialog"])',
      '[class*="overlay"]'
    ],
    description: 'Overlays décoratifs (gradients, effets visuels)'
  }
];

export function IsolationSwitch() {
  const [isOpen, setIsOpen] = useState(true);
  const [disabledGroups, setDisabledGroups] = useState<Set<string>>(new Set());
  const [elementCounts, setElementCounts] = useState<Record<string, number>>({});
  const [lastAction, setLastAction] = useState<string>('');

  // Compter les éléments pour chaque groupe
  useEffect(() => {
    const counts: Record<string, number> = {};
    ISOLATION_GROUPS.forEach(group => {
      let count = 0;
      group.selectors.forEach(selector => {
        try {
          count += document.querySelectorAll(selector).length;
        } catch (e) {
          // Sélecteur invalide
        }
      });
      counts[group.id] = count;
    });
    setElementCounts(counts);
  }, [disabledGroups]);

  // Appliquer/retirer les styles d'isolation
  useEffect(() => {
    ISOLATION_GROUPS.forEach(group => {
      const isDisabled = disabledGroups.has(group.id);

      group.selectors.forEach(selector => {
        try {
          const elements = document.querySelectorAll(selector);
          elements.forEach((el: Element) => {
            const htmlEl = el as HTMLElement;
            if (isDisabled) {
              htmlEl.style.pointerEvents = 'none';
              htmlEl.style.opacity = '0.25';
              htmlEl.style.filter = 'grayscale(100%)';
              htmlEl.setAttribute('data-isolated', 'true');
            } else {
              if (htmlEl.getAttribute('data-isolated') === 'true') {
                htmlEl.style.pointerEvents = '';
                htmlEl.style.opacity = '';
                htmlEl.style.filter = '';
                htmlEl.removeAttribute('data-isolated');
              }
            }
          });
        } catch (e) {
          // Sélecteur invalide
        }
      });
    });
  }, [disabledGroups]);

  const toggleGroup = (groupId: string) => {
    const newDisabled = new Set(disabledGroups);
    if (newDisabled.has(groupId)) {
      newDisabled.delete(groupId);
      const action = `✅ Réactivé: ${ISOLATION_GROUPS.find(g => g.id === groupId)?.label}`;
      console.log(`[ISOLATION] ${action}`);
      setLastAction(action);
    } else {
      newDisabled.add(groupId);
      const action = `🚫 Isolé: ${ISOLATION_GROUPS.find(g => g.id === groupId)?.label}`;
      console.log(`[ISOLATION] ${action}`);
      setLastAction(action);
    }
    setDisabledGroups(newDisabled);
  };

  const resetAll = () => {
    console.log('[ISOLATION] 🔄 Reset: Tous les groupes réactivés');
    setDisabledGroups(new Set());
    setLastAction('🔄 Reset: Tous les groupes réactivés');
  };

  const disableAll = () => {
    console.log('[ISOLATION] 🚫 Tous les groupes isolés');
    setDisabledGroups(new Set(ISOLATION_GROUPS.map(g => g.id)));
    setLastAction('🚫 Tous les groupes isolés');
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 right-4 z-[99999] bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-full shadow-2xl transition-all border-2 border-purple-400"
        title="Ouvrir Isolation Switch"
      >
        <Power className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed top-4 right-4 z-[99999] bg-white dark:bg-gray-900 rounded-xl shadow-2xl border-2 border-purple-500 w-96 max-h-[90vh] overflow-hidden flex flex-col pointer-events-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Power className="w-5 h-5" />
            <h2 className="text-lg font-bold">Isolation Switch</h2>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="hover:bg-white/20 p-1 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-purple-100">
          Diagnostic non-destructif - Mode: <code>/settings?iso=1</code>
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
        {ISOLATION_GROUPS.map(group => {
          const isDisabled = disabledGroups.has(group.id);
          const count = elementCounts[group.id] || 0;

          return (
            <div
              key={group.id}
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
                  onChange={() => toggleGroup(group.id)}
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
            <span>Coche une case pour isoler un groupe</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span>Si les onglets deviennent cliquables → coupable identifié!</span>
          </div>
        </div>
      </div>

      {/* Debug Info */}
      <div className="bg-purple-100 dark:bg-purple-900/30 border-t border-purple-200 dark:border-purple-700 p-2">
        <div className="text-xs text-purple-700 dark:text-purple-300 font-mono">
          Actifs: {ISOLATION_GROUPS.length - disabledGroups.size} | Isolés: {disabledGroups.size}
        </div>
      </div>
    </div>
  );
}

/**
 * 🛡️ useDisableAIOverlay - Hook pour désactiver overlay IA sur /settings
 *
 * Garantit programmatiquement que AUCUN overlay IA ne peut bloquer
 * les interactions utilisateur sur la page Settings.
 *
 * Usage:
 * ```tsx
 * function Settings() {
 *   useDisableAIOverlay(); // Active la protection
 *   return <div>...</div>;
 * }
 * ```
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const DEBUG = import.meta.env.DEV;

export function useDisableAIOverlay() {
  const location = useLocation();
  const isSettingsPage = location.pathname.startsWith('/settings');

  useEffect(() => {
    // ✅ FIX 1: Désactiver complètement en production (pas de MutationObserver)
    if (import.meta.env.PROD) {
      if (!isSettingsPage) return;

      // En prod, on désactive juste une fois sans observer
      const disableOnce = () => {
        const selectors = [
          '[class*="ai-"]',
          '[class*="AI-"]',
          '[data-ai]',
          '.ai-badge',
          '.ai-overlay',
          '[class*="centrinote-ai"]',
          '.fixed.top-2.right-2.z-50'
        ];

        selectors.forEach(selector => {
          try {
            document.querySelectorAll(selector).forEach((el: Element) => {
              const htmlEl = el as HTMLElement;
              htmlEl.style.pointerEvents = 'none';
              htmlEl.style.display = 'none';
            });
          } catch (e) {
            // Sélecteur invalide
          }
        });
      };

      disableOnce();
      return; // ✅ Pas d'observer en prod
    }

    // Mode DEV: Observer actif avec protections anti-boucle
    if (!isSettingsPage) return;

    DEBUG && console.log('🛡️ [useDisableAIOverlay] Activation protection Settings (DEV)');

    // Sélecteurs d'overlay IA à désactiver
    const AI_OVERLAY_SELECTORS = [
      '[class*="ai-"]',
      '[class*="AI-"]',
      '[data-ai]',
      '.ai-badge',
      '.ai-overlay',
      '[class*="centrinote-ai"]',
      '.fixed.top-2.right-2.z-50' // Debug HUD
    ];

    // Fonction pour désactiver un élément
    const disableElement = (el: HTMLElement) => {
      el.style.pointerEvents = 'none';
      el.style.display = 'none';
      el.setAttribute('data-disabled-by-settings', 'true');
    };

    // Fonction pour réactiver un élément
    const enableElement = (el: HTMLElement) => {
      if (el.getAttribute('data-disabled-by-settings') === 'true') {
        el.style.pointerEvents = '';
        el.style.display = '';
        el.removeAttribute('data-disabled-by-settings');
      }
    };

    // Désactiver tous les overlays IA existants
    const disableExistingOverlays = () => {
      AI_OVERLAY_SELECTORS.forEach(selector => {
        try {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            // Ne pas désactiver les panneaux de debug en mode dev
            if (DEBUG && el.hasAttribute('data-debug-allowed')) {
              return;
            }
            disableElement(el as HTMLElement);
          });

          if (elements.length > 0) {
            DEBUG && console.log(`🛡️ [useDisableAIOverlay] Désactivé ${elements.length} éléments: ${selector}`);
          }
        } catch (e) {
          // Sélecteur invalide, ignorer
        }
      });
    };

    // Désactiver immédiatement
    disableExistingOverlays();

    // ✅ FIX 2: Debounce avec requestAnimationFrame pour éviter spam
    let rafId: number | null = null;
    const debouncedDisable = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      rafId = requestAnimationFrame(() => {
        disableExistingOverlays();
        rafId = null;
      });
    };

    // ✅ FIX 3: Observer avec disconnect/reconnect pour éviter boucle récursive
    const observer = new MutationObserver((mutations) => {
      let hasNewOverlays = false;

      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node instanceof HTMLElement) {
            // Vérifier si le nouvel élément est un overlay IA
            AI_OVERLAY_SELECTORS.forEach(selector => {
              try {
                if (node.matches(selector) || node.querySelector(selector)) {
                  hasNewOverlays = true;
                }
              } catch (e) {
                // Sélecteur invalide
              }
            });
          }
        });
      });

      if (hasNewOverlays) {
        DEBUG && console.warn('🛡️ [useDisableAIOverlay] Nouveaux overlays IA détectés, désactivation...');

        // ✅ FIX 4: Déconnecter avant de modifier le DOM
        observer.disconnect();

        // Utiliser le debounce au lieu d'appeler directement
        debouncedDisable();

        // ✅ FIX 5: Reconnecter après un délai pour éviter spam
        setTimeout(() => {
          // ✅ FIX 6: Observer seulement la section Settings au lieu de document.body
          const settingsContainer = document.querySelector('.settings-page, [class*="settings"]') || document.body;
          observer.observe(settingsContainer, {
            childList: true,
            subtree: true
          });
        }, 100);
      }
    });

    // ✅ FIX 7: Observer seulement la section Settings au lieu de document.body
    const settingsContainer = document.querySelector('.settings-page, [class*="settings"]') || document.body;
    observer.observe(settingsContainer, {
      childList: true,
      subtree: true
    });

    DEBUG && console.log('✅ [useDisableAIOverlay] Protection active + MutationObserver (avec protections anti-boucle)');

    // Cleanup
    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      observer.disconnect();

      // Réactiver les éléments désactivés
      AI_OVERLAY_SELECTORS.forEach(selector => {
        try {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => enableElement(el as HTMLElement));
        } catch (e) {
          // Sélecteur invalide
        }
      });

      DEBUG && console.log('🧹 [useDisableAIOverlay] Protection désactivée');
    };
  }, [isSettingsPage]);
}

/**
 * Utilitaire: Vérifier quel élément bloque un point (x, y)
 *
 * Usage dans la console:
 * ```js
 * checkBlockingElements(100, 200)
 * ```
 */
export function checkBlockingElements(x: number, y: number) {
  const elements = document.elementsFromPoint(x, y);

  console.group('🔍 Éléments à position (' + x + ', ' + y + ')');
  elements.forEach((el, index) => {
    const computed = window.getComputedStyle(el);
    console.log(`[${index}]`, {
      tag: el.tagName,
      classes: el.className,
      id: el.id,
      zIndex: computed.zIndex,
      position: computed.position,
      pointerEvents: computed.pointerEvents,
      element: el
    });
  });
  console.groupEnd();

  return elements;
}

// Exposer dans window pour debug manuel
if (import.meta.env.DEV) {
  (window as any).__checkBlockingElements = checkBlockingElements;
}

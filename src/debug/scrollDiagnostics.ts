/**
 * 🔍 Scroll Diagnostics - Anti-Freeze Instrumentation
 *
 * Outils pour détecter et corriger les problèmes de scroll/freeze
 * dans les composants React, notamment l'onglet Privacy.
 *
 * Actif UNIQUEMENT en mode debug ou avec ?iso=privacy
 */

const DEBUG = import.meta.env.DEV;

// =============================================================================
// 1. PATCH: Listeners Passifs
// =============================================================================

/**
 * Patch addEventListener pour forcer les listeners passifs sur scroll/wheel/touch
 * et détecter les listeners non-passifs qui causent des freezes
 */
export function patchPassiveListeners(scope = '[PRIVACY]') {
  const orig = EventTarget.prototype.addEventListener;
  const warnings: string[] = [];

  // @ts-ignore
  EventTarget.prototype.addEventListener = function (type: any, listener: any, opts: any) {
    // Détecter les événements critiques pour le scroll
    if (/(scroll|wheel|touchmove|touchstart|mousemove)/.test(type)) {
      const passive = typeof opts === 'boolean' ? false : !!opts?.passive;

      if (!passive) {
        const target = this instanceof Element ? this.tagName : 'Window';
        const warning = `${scope} ⚠️ Non-passive listener: ${type} on ${target}`;

        if (!warnings.includes(warning)) {
          console.warn(warning, {
            target: this,
            type,
            listener: listener.name || 'anonymous'
          });
          warnings.push(warning);
        }
      }

      // Force passive:true par défaut sur scroll/wheel/touchmove
      if (/(scroll|wheel|touchmove)/.test(type)) {
        if (!opts || typeof opts === 'boolean') {
          opts = { passive: true };
        } else {
          opts = { ...opts, passive: true };
        }
      }
    }

    return orig.call(this, type, listener, opts);
  };

  DEBUG && console.log(`${scope} ✅ Passive listeners patch activé`);

  // Retourner fonction de cleanup
  return () => {
    EventTarget.prototype.addEventListener = orig;
    DEBUG && console.log(`${scope} 🧹 Passive listeners patch désactivé`);
  };
}

// =============================================================================
// 2. THROTTLE avec requestAnimationFrame
// =============================================================================

/**
 * Wrapper pour throttle les handlers lourds avec requestAnimationFrame
 * Empêche les re-renders abusifs sur chaque pixel de scroll
 */
export const withRAF = <T extends (...args: any[]) => void>(fn: T, scope = '[PRIVACY]'): ((...args: Parameters<T>) => void) => {
  let ticking = false;
  let lastArgs: Parameters<T>;

  return (...args: Parameters<T>) => {
    lastArgs = args;

    if (!ticking) {
      requestAnimationFrame(() => {
        ticking = false;
        fn(...lastArgs);
      });
      ticking = true;
    }
  };
};

/**
 * Throttle classique avec délai (fallback si rAF n'est pas approprié)
 */
export const throttle = <T extends (...args: any[]) => void>(fn: T, delay: number): ((...args: Parameters<T>) => void) => {
  let lastCall = 0;

  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      fn(...args);
    }
  };
};

// =============================================================================
// 3. DÉTECTION DE preventDefault ABUSIF
// =============================================================================

/**
 * Patch preventDefault pour détecter les preventDefault() sur scroll/wheel/touch
 * qui bloquent le scroll natif
 */
export function warnPreventDefault(scope = '[PRIVACY]') {
  const orig = Event.prototype.preventDefault;
  const warnings: string[] = [];

  Event.prototype.preventDefault = function () {
    if (/(scroll|wheel|touchmove)/.test(this.type)) {
      const warning = `${scope} ⚠️ preventDefault on ${this.type}`;

      if (!warnings.includes(warning)) {
        console.warn(warning, {
          type: this.type,
          target: this.target,
          defaultPrevented: this.defaultPrevented,
          stackTrace: new Error().stack
        });
        warnings.push(warning);
      }
    }

    // @ts-ignore
    return orig.apply(this, arguments);
  };

  DEBUG && console.log(`${scope} ✅ preventDefault warning activé`);

  return () => {
    Event.prototype.preventDefault = orig;
    DEBUG && console.log(`${scope} 🧹 preventDefault warning désactivé`);
  };
}

// =============================================================================
// 4. FPS MONITOR
// =============================================================================

interface FPSMonitorOptions {
  onUpdate?: (fps: number) => void;
  threshold?: number; // Avertir si FPS < threshold
  scope?: string;
}

/**
 * Moniteur de FPS pour détecter les freezes/lags
 */
export class FPSMonitor {
  private frames = 0;
  private lastTime = performance.now();
  private fps = 60;
  private rafId: number | null = null;
  private interval: number | null = null;
  private options: FPSMonitorOptions;

  constructor(options: FPSMonitorOptions = {}) {
    this.options = {
      threshold: 45,
      scope: '[PRIVACY]',
      ...options
    };
  }

  start() {
    this.frames = 0;
    this.lastTime = performance.now();

    const measure = () => {
      this.frames++;
      this.rafId = requestAnimationFrame(measure);
    };

    this.rafId = requestAnimationFrame(measure);

    // Calculer FPS chaque seconde
    this.interval = window.setInterval(() => {
      const now = performance.now();
      const delta = now - this.lastTime;
      this.fps = Math.round((this.frames * 1000) / delta);

      if (this.options.onUpdate) {
        this.options.onUpdate(this.fps);
      }

      if (this.fps < (this.options.threshold || 45)) {
        console.warn(`${this.options.scope} ⚠️ Low FPS detected: ${this.fps} FPS`);
      }

      this.frames = 0;
      this.lastTime = now;
    }, 1000);

    DEBUG && console.log(`${this.options.scope} ✅ FPS Monitor démarré`);
  }

  stop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    DEBUG && console.log(`${this.options.scope} 🧹 FPS Monitor arrêté`);
  }

  getCurrentFPS() {
    return this.fps;
  }
}

// =============================================================================
// 5. LISTENER COUNTER
// =============================================================================

/**
 * Compte les event listeners actifs pour un type donné
 */
export function countActiveListeners(type: string): number {
  // Note: getEventListeners n'existe que dans la console Chrome
  // Cette fonction est un approximatif pour le debug
  let count = 0;

  // Compter sur window
  // @ts-ignore
  if (typeof getEventListeners !== 'undefined') {
    // @ts-ignore
    const windowListeners = getEventListeners(window);
    count += windowListeners[type]?.length || 0;
  }

  // Compter sur document
  // @ts-ignore
  if (typeof getEventListeners !== 'undefined') {
    // @ts-ignore
    const docListeners = getEventListeners(document);
    count += docListeners[type]?.length || 0;
  }

  return count;
}

// =============================================================================
// 6. SCROLL DIAGNOSTICS HUD
// =============================================================================

export interface ScrollDiagnosticsData {
  fps: number;
  scrollListeners: number;
  lastPreventDefault: string | null;
  warnings: string[];
}

/**
 * Hook pour gérer les diagnostics de scroll dans un composant React
 */
export function useScrollDiagnostics(enabled: boolean, scope = '[PRIVACY]') {
  const [data, setData] = React.useState<ScrollDiagnosticsData>({
    fps: 60,
    scrollListeners: 0,
    lastPreventDefault: null,
    warnings: []
  });

  const [cleanupFns, setCleanupFns] = React.useState<Array<() => void>>([]);

  React.useEffect(() => {
    if (!enabled) return;

    const fns: Array<() => void> = [];

    // FPS Monitor
    const fpsMonitor = new FPSMonitor({
      scope,
      onUpdate: (fps) => {
        setData(prev => ({ ...prev, fps }));
      }
    });
    fpsMonitor.start();
    fns.push(() => fpsMonitor.stop());

    // Passive Listeners Patch
    const cleanupPassive = patchPassiveListeners(scope);
    fns.push(cleanupPassive);

    // PreventDefault Warning
    const cleanupPreventDefault = warnPreventDefault(scope);
    fns.push(cleanupPreventDefault);

    // Update scroll listeners count (approx)
    const updateInterval = setInterval(() => {
      const count = countActiveListeners('scroll');
      setData(prev => ({ ...prev, scrollListeners: count }));
    }, 2000);
    fns.push(() => clearInterval(updateInterval));

    setCleanupFns(fns);

    return () => {
      fns.forEach(fn => fn());
    };
  }, [enabled, scope]);

  return data;
}

// Import React pour le hook
import React from 'react';

// =============================================================================
// 7. CSS HELPERS (pour isolation)
// =============================================================================

/**
 * Applique des styles anti-freeze sur un élément
 */
export function applyScrollOptimizations(element: HTMLElement) {
  element.style.contain = 'content';
  element.style.willChange = 'auto';
}

/**
 * Force pointer-events: none sur overlays/portals
 */
export function disableOverlayPointerEvents(selector: string) {
  const elements = document.querySelectorAll(selector);
  elements.forEach((el: Element) => {
    (el as HTMLElement).style.pointerEvents = 'none';
  });
  DEBUG && console.log(`[PRIVACY] ✅ Disabled pointer-events on ${elements.length} overlays`);
}

/**
 * Restaure pointer-events sur overlays/portals
 */
export function enableOverlayPointerEvents(selector: string) {
  const elements = document.querySelectorAll(selector);
  elements.forEach((el: Element) => {
    (el as HTMLElement).style.pointerEvents = '';
  });
  DEBUG && console.log(`[PRIVACY] ✅ Enabled pointer-events on ${elements.length} overlays`);
}

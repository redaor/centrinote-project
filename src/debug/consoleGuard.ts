/**
 * 🛡️ CONSOLE GUARD - Dé-duplication + Throttle pour logs console
 *
 * Empêche l'incrémentation infinie des mêmes messages console
 * Utile pour diagnostiquer les boucles infinies de logs
 *
 * USAGE:
 * ```typescript
 * import { installConsoleGuard, getConsoleStats } from './consoleGuard';
 *
 * // Installer au démarrage
 * installConsoleGuard({ throttleMs: 1000, maxDuplicates: 1 });
 *
 * // Récupérer les stats
 * const stats = getConsoleStats();
 * console.log(`Total: ${stats.total}, Blocked: ${stats.blocked}`);
 * ```
 */

interface ConsoleGuardOptions {
  /** Temps minimum entre 2 logs identiques (ms) */
  throttleMs?: number;
  /** Nombre max de logs identiques autorisés */
  maxDuplicates?: number;
  /** Activer le guard */
  enabled?: boolean;
}

interface ConsoleStats {
  total: number;
  blocked: number;
  uniqueMessages: number;
  messageMap: Map<string, { count: number; lastTime: number }>;
}

class ConsoleGuardManager {
  private options: Required<ConsoleGuardOptions>;
  private stats: ConsoleStats;
  private originalConsole: {
    log: typeof console.log;
    warn: typeof console.warn;
    error: typeof console.error;
    group: typeof console.group;
    groupEnd: typeof console.groupEnd;
  };
  private installed = false;

  constructor() {
    this.options = {
      throttleMs: 1000,
      maxDuplicates: 1,
      enabled: false
    };

    this.stats = {
      total: 0,
      blocked: 0,
      uniqueMessages: 0,
      messageMap: new Map()
    };

    this.originalConsole = {
      log: console.log.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console),
      group: console.group.bind(console),
      groupEnd: console.groupEnd.bind(console)
    };
  }

  /**
   * Créer une clé unique pour un message
   */
  private getMessageKey(args: any[]): string {
    return args.map(arg => {
      if (typeof arg === 'string') return arg;
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    }).join('|');
  }

  /**
   * Vérifier si un message doit être bloqué
   */
  private shouldBlock(messageKey: string): boolean {
    if (!this.options.enabled) return false;

    const now = Date.now();
    const existing = this.stats.messageMap.get(messageKey);

    if (!existing) {
      // Premier message, le laisser passer
      this.stats.messageMap.set(messageKey, { count: 1, lastTime: now });
      this.stats.uniqueMessages++;
      return false;
    }

    // Vérifier throttle
    const timeSinceLastLog = now - existing.lastTime;
    if (timeSinceLastLog < this.options.throttleMs) {
      existing.count++;
      return true;
    }

    // Vérifier max duplicates
    if (existing.count >= this.options.maxDuplicates) {
      existing.count++;
      existing.lastTime = now;
      return true;
    }

    // Laisser passer et mettre à jour
    existing.count++;
    existing.lastTime = now;
    return false;
  }

  /**
   * Wrapper pour console.log
   */
  private createGuardedMethod(originalMethod: Function, _methodName: string) {
    return (...args: any[]) => {
      this.stats.total++;

      const messageKey = this.getMessageKey(args);

      if (this.shouldBlock(messageKey)) {
        this.stats.blocked++;

        // Log silencieux dans la vraie console (pour debugging du guard lui-même)
        if (import.meta.env.DEV) {
          const existing = this.stats.messageMap.get(messageKey);
          if (existing && existing.count % 100 === 0) {
            this.originalConsole.warn(
              `[ConsoleGuard] Blocked ${existing.count} duplicates of: ${messageKey.slice(0, 100)}...`
            );
          }
        }
        return;
      }

      // Laisser passer le message
      originalMethod.apply(console, args);
    };
  }

  /**
   * Installer le guard
   */
  install(options?: ConsoleGuardOptions): void {
    if (this.installed) {
      this.originalConsole.warn('[ConsoleGuard] Already installed');
      return;
    }

    // Merge options
    this.options = {
      ...this.options,
      ...options,
      enabled: true
    };

    // Override console methods
    console.log = this.createGuardedMethod(this.originalConsole.log, 'log');
    console.warn = this.createGuardedMethod(this.originalConsole.warn, 'warn');
    console.error = this.createGuardedMethod(this.originalConsole.error, 'error');

    this.installed = true;

    this.originalConsole.log(
      '%c[ConsoleGuard] ✅ Installed',
      'color: #10b981; font-weight: bold',
      `throttle: ${this.options.throttleMs}ms, maxDuplicates: ${this.options.maxDuplicates}`
    );
  }

  /**
   * Désinstaller le guard
   */
  uninstall(): void {
    if (!this.installed) {
      console.warn('[ConsoleGuard] Not installed');
      return;
    }

    console.log = this.originalConsole.log;
    console.warn = this.originalConsole.warn;
    console.error = this.originalConsole.error;

    this.installed = false;

    this.originalConsole.log(
      '%c[ConsoleGuard] ❌ Uninstalled',
      'color: #ef4444; font-weight: bold'
    );
  }

  /**
   * Récupérer les statistiques
   */
  getStats(): ConsoleStats {
    return {
      ...this.stats,
      messageMap: new Map(this.stats.messageMap) // Clone pour éviter modifications externes
    };
  }

  /**
   * Reset les statistiques
   */
  resetStats(): void {
    this.stats = {
      total: 0,
      blocked: 0,
      uniqueMessages: 0,
      messageMap: new Map()
    };
    this.originalConsole.log('[ConsoleGuard] Stats reset');
  }

  /**
   * Activer/désactiver sans réinstaller
   */
  setEnabled(enabled: boolean): void {
    this.options.enabled = enabled;
    this.originalConsole.log(
      `[ConsoleGuard] ${enabled ? 'Enabled' : 'Disabled'}`
    );
  }

  /**
   * Afficher le top des messages bloqués
   */
  showTopBlocked(limit = 10): void {
    const sorted = Array.from(this.stats.messageMap.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, limit);

    this.originalConsole.group('📊 Top Messages Bloqués');
    sorted.forEach(([message, data], index) => {
      this.originalConsole.log(
        `${index + 1}. Count: ${data.count}`,
        message.slice(0, 100) + (message.length > 100 ? '...' : '')
      );
    });
    this.originalConsole.groupEnd();
  }
}

// Singleton instance
const guardManager = new ConsoleGuardManager();

// Exports publics
export function installConsoleGuard(options?: ConsoleGuardOptions): void {
  guardManager.install(options);
}

export function uninstallConsoleGuard(): void {
  guardManager.uninstall();
}

export function getConsoleStats(): ConsoleStats {
  return guardManager.getStats();
}

export function resetConsoleStats(): void {
  guardManager.resetStats();
}

export function setConsoleGuardEnabled(enabled: boolean): void {
  guardManager.setEnabled(enabled);
}

export function showTopBlockedMessages(limit?: number): void {
  guardManager.showTopBlocked(limit);
}

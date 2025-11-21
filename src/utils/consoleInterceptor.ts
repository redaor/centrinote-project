/**
 * 🛡️ Console Error Interceptor
 *
 * Système d'interception temporaire des erreurs console pour le debugging.
 * Permet de filtrer, bloquer ou logger de manière conditionnelle les console.error().
 *
 * @author Claude Code
 * @version 1.0.0
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ConsoleInterceptorConfig {
  /** Active/désactive l'interception complète */
  enabled: boolean;

  /** Bloque complètement toutes les erreurs console */
  blockAll?: boolean;

  /** Filtres de mots-clés à bloquer (ex: ["navigation", "loop"]) */
  blockedKeywords?: string[];

  /** Filtres de mots-clés à autoriser (priorité sur blockedKeywords) */
  allowedKeywords?: string[];

  /** Fonction de callback appelée avant chaque console.error */
  onError?: (message: string, ...args: any[]) => void;

  /** Affiche un log de remplacement quand une erreur est bloquée */
  showBlockedLog?: boolean;

  /** Mode debug : affiche des logs d'interception */
  debug?: boolean;
}

export interface ConsoleInterceptor {
  /** Active l'interception avec une config */
  enable: (config?: Partial<ConsoleInterceptorConfig>) => void;

  /** Désactive l'interception et restaure console.error original */
  disable: () => void;

  /** Met à jour la config sans désactiver */
  updateConfig: (config: Partial<ConsoleInterceptorConfig>) => void;

  /** Retourne l'état actuel */
  getState: () => { enabled: boolean; config: ConsoleInterceptorConfig };

  /** Restaure temporairement console.error pour un seul appel */
  callOriginal: (...args: any[]) => void;
}

// ============================================================================
// CONFIGURATION PAR DÉFAUT
// ============================================================================

const DEFAULT_CONFIG: ConsoleInterceptorConfig = {
  enabled: true,
  blockAll: false,
  blockedKeywords: [],
  allowedKeywords: [],
  showBlockedLog: true,
  debug: false,
};

// ============================================================================
// IMPLÉMENTATION
// ============================================================================

class ConsoleErrorInterceptor implements ConsoleInterceptor {
  private originalError: typeof console.error;
  private config: ConsoleInterceptorConfig;
  private isEnabled: boolean = false;
  private blockedCount: number = 0;
  private allowedCount: number = 0;

  constructor() {
    // 💾 Sauvegarder la méthode console.error originale
    this.originalError = console.error.bind(console);
    this.config = { ...DEFAULT_CONFIG };
  }

  /**
   * ✅ Active l'interception des erreurs console
   */
  enable(config: Partial<ConsoleInterceptorConfig> = {}): void {
    if (this.isEnabled) {
      this.updateConfig(config);
      return;
    }

    // Fusionner avec la config par défaut
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.isEnabled = true;
    this.blockedCount = 0;
    this.allowedCount = 0;

    if (this.config.debug) {
      this.originalError('🛡️ [INTERCEPTOR] Console.error interception ACTIVÉE', this.config);
    }

    // 🔧 Redéfinir console.error avec notre intercepteur
    console.error = (...args: any[]) => {
      this.interceptError(...args);
    };
  }

  /**
   * ❌ Désactive l'interception et restaure console.error original
   */
  disable(): void {
    if (!this.isEnabled) return;

    // 🔄 Restaurer la méthode originale
    console.error = this.originalError;
    this.isEnabled = false;

    if (this.config.debug) {
      this.originalError('🛡️ [INTERCEPTOR] Console.error interception DÉSACTIVÉE', {
        blockedCount: this.blockedCount,
        allowedCount: this.allowedCount,
      });
    }
  }

  /**
   * 🔧 Met à jour la configuration sans désactiver
   */
  updateConfig(config: Partial<ConsoleInterceptorConfig>): void {
    this.config = { ...this.config, ...config };

    if (this.config.debug) {
      this.originalError('🔧 [INTERCEPTOR] Configuration mise à jour', this.config);
    }
  }

  /**
   * 📊 Retourne l'état actuel de l'intercepteur
   */
  getState() {
    return {
      enabled: this.isEnabled,
      config: { ...this.config },
      stats: {
        blocked: this.blockedCount,
        allowed: this.allowedCount,
      },
    };
  }

  /**
   * 🔓 Appelle console.error original (bypass l'interception)
   */
  callOriginal(...args: any[]): void {
    this.originalError(...args);
  }

  /**
   * 🎯 Logique d'interception principale
   */
  private interceptError(...args: any[]): void {
    // Convertir tous les arguments en string pour la recherche de mots-clés
    const fullMessage = args
      .map(arg => {
        if (typeof arg === 'string') return arg;
        if (arg instanceof Error) return arg.message;
        try {
          return JSON.stringify(arg);
        } catch {
          return String(arg);
        }
      })
      .join(' ');

    // 📞 Callback personnalisé (avant filtrage)
    if (this.config.onError) {
      try {
        this.config.onError(fullMessage, ...args);
      } catch (err) {
        this.originalError('❌ [INTERCEPTOR] Erreur dans onError callback:', err);
      }
    }

    // 🚫 Mode "bloquer tout"
    if (this.config.blockAll) {
      this.blockedCount++;

      if (this.config.showBlockedLog) {
        this.originalError(
          `🚫 [BLOCKED] Console.error bloquée (${this.blockedCount} total):`,
          fullMessage.substring(0, 100)
        );
      }

      return; // Ne pas afficher l'erreur
    }

    // ✅ Vérifier les mots-clés autorisés (priorité)
    if (this.config.allowedKeywords && this.config.allowedKeywords.length > 0) {
      const isAllowed = this.config.allowedKeywords.some(keyword =>
        fullMessage.toLowerCase().includes(keyword.toLowerCase())
      );

      if (isAllowed) {
        this.allowedCount++;

        if (this.config.debug) {
          this.originalError(`✅ [ALLOWED] Erreur autorisée (mot-clé trouvé)`);
        }

        this.originalError(...args); // Afficher l'erreur normalement
        return;
      }
    }

    // 🚫 Vérifier les mots-clés bloqués
    if (this.config.blockedKeywords && this.config.blockedKeywords.length > 0) {
      const isBlocked = this.config.blockedKeywords.some(keyword =>
        fullMessage.toLowerCase().includes(keyword.toLowerCase())
      );

      if (isBlocked) {
        this.blockedCount++;

        if (this.config.showBlockedLog) {
          this.originalError(
            `🚫 [BLOCKED] Erreur bloquée par mot-clé (${this.blockedCount} total):`,
            fullMessage.substring(0, 100)
          );
        }

        return; // Ne pas afficher l'erreur
      }
    }

    // ✅ Par défaut : afficher l'erreur normalement
    this.allowedCount++;
    this.originalError(...args);
  }
}

// ============================================================================
// INSTANCE SINGLETON
// ============================================================================

let interceptorInstance: ConsoleErrorInterceptor | null = null;

/**
 * 🎯 Obtient l'instance singleton de l'intercepteur
 */
export function getConsoleInterceptor(): ConsoleInterceptor {
  if (!interceptorInstance) {
    interceptorInstance = new ConsoleErrorInterceptor();
  }
  return interceptorInstance;
}

// ============================================================================
// RACCOURCIS PRATIQUES
// ============================================================================

/**
 * ⚡ Active rapidement l'interception avec config
 */
export function enableConsoleInterception(config?: Partial<ConsoleInterceptorConfig>): void {
  getConsoleInterceptor().enable(config);
}

/**
 * ⚡ Désactive rapidement l'interception
 */
export function disableConsoleInterception(): void {
  getConsoleInterceptor().disable();
}

/**
 * ⚡ Bloque TOUTES les erreurs console (mode silence total)
 */
export function blockAllConsoleErrors(): void {
  getConsoleInterceptor().enable({ blockAll: true, showBlockedLog: false });
}

/**
 * ⚡ Bloque uniquement les erreurs contenant certains mots-clés
 */
export function blockErrorsWithKeywords(keywords: string[]): void {
  getConsoleInterceptor().enable({
    blockAll: false,
    blockedKeywords: keywords,
    showBlockedLog: true,
  });
}

/**
 * ⚡ N'autorise QUE les erreurs contenant certains mots-clés
 */
export function allowOnlyErrorsWithKeywords(keywords: string[]): void {
  getConsoleInterceptor().enable({
    blockAll: false,
    allowedKeywords: keywords,
    showBlockedLog: true,
  });
}

// ============================================================================
// PRESETS COMMUNS
// ============================================================================

/**
 * 🎛️ Preset : Bloquer les erreurs de navigation React Router
 */
export function blockNavigationErrors(): void {
  blockErrorsWithKeywords(['navigation', 'router', 'redirect', 'route']);
}

/**
 * 🎛️ Preset : Bloquer les erreurs de boucle infinie
 */
export function blockLoopErrors(): void {
  blockErrorsWithKeywords(['loop', 'infinite', 'recursion', 'stack overflow']);
}

/**
 * 🎛️ Preset : Bloquer les erreurs CORS
 */
export function blockCorsErrors(): void {
  blockErrorsWithKeywords(['cors', 'cross-origin', 'access control']);
}

/**
 * 🎛️ Preset : Mode Debug (tous les logs d'interception visibles)
 */
export function enableDebugMode(): void {
  getConsoleInterceptor().enable({
    debug: true,
    showBlockedLog: true,
  });
}

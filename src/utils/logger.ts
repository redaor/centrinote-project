// =====================================================
// LOGGER SÉCURISÉ - Sanitise les données sensibles
// =====================================================

import { supabase } from '../lib/supabase';

// Patterns pour détecter les données sensibles
const SENSITIVE_PATTERNS = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  uuid: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
  token: /\b(eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)\b/g, // JWT
  password: /password["\s:=]+([^"}\s,]+)/gi,
  apiKey: /(api[_-]?key|apikey|secret[_-]?key)["\s:=]+([^"}\s,]+)/gi,
  bearer: /bearer\s+([^\s]+)/gi,
};

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogOptions {
  level?: LogLevel;
  meta?: Record<string, any>;
  source?: string;
  stack?: string;
  url?: string;
}

/**
 * Sanitise une chaîne de caractères en remplaçant les données sensibles
 */
function sanitizeString(str: string): string {
  let sanitized = str;

  // Remplacer les emails
  sanitized = sanitized.replace(SENSITIVE_PATTERNS.email, '[REDACTED_EMAIL]');

  // Remplacer les UUIDs
  sanitized = sanitized.replace(SENSITIVE_PATTERNS.uuid, '[REDACTED_UUID]');

  // Remplacer les tokens JWT
  sanitized = sanitized.replace(SENSITIVE_PATTERNS.token, '[REDACTED_TOKEN]');

  // Remplacer les mots de passe
  sanitized = sanitized.replace(SENSITIVE_PATTERNS.password, 'password="[REDACTED]"');

  // Remplacer les clés API
  sanitized = sanitized.replace(SENSITIVE_PATTERNS.apiKey, '$1="[REDACTED]"');

  // Remplacer les Bearer tokens
  sanitized = sanitized.replace(SENSITIVE_PATTERNS.bearer, 'bearer [REDACTED]');

  return sanitized;
}

/**
 * Sanitise un objet récursivement
 */
function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  if (typeof obj === 'object') {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      // Ne pas logger certaines clés sensibles
      if (['password', 'token', 'apiKey', 'secret', 'authorization', 'cookie', 'email', 'user_id', 'userId', 'id'].includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeObject(value);
      }
    }
    return sanitized;
  }

  return obj;
}

/**
 * Récupère l'URL actuelle (frontend uniquement)
 */
function getCurrentUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.href;
  }
  return '';
}

/**
 * Récupère le User-Agent (frontend uniquement)
 */
function getUserAgent(): string {
  if (typeof window !== 'undefined' && window.navigator) {
    return window.navigator.userAgent;
  }
  return '';
}

/**
 * Récupère la stack trace si disponible
 */
function getStackTrace(error?: Error): string | undefined {
  if (error?.stack) {
    return sanitizeString(error.stack);
  }
  return undefined;
}

/**
 * Logger sécurisé avec backoff pour éviter les boucles d'erreur
 */
class SecureLogger {
  private isDev: boolean;
  private lastErrorTime: number = 0;
  private backoffDuration: number = 60000; // 1 minute
  private isBackoffActive: boolean = false;

  constructor() {
    this.isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';
  }

  /**
   * Vérifie si on est en période de backoff (éviter les boucles d'erreur)
   */
  private isInBackoff(): boolean {
    if (!this.isBackoffActive) {
      return false;
    }
    
    const now = Date.now();
    if (now - this.lastErrorTime > this.backoffDuration) {
      this.isBackoffActive = false;
      return false;
    }
    
    return true;
  }

  /**
   * Active le backoff après une erreur
   */
  private activateBackoff(): void {
    this.lastErrorTime = Date.now();
    this.isBackoffActive = true;
  }

  /**
   * Log un message (silencieux - Edge Function uniquement)
   * ❌ NE JAMAIS LOGGER DANS LA CONSOLE (même en dev)
   */
  async log(
    message: string,
    options: LogOptions = {}
  ): Promise<void> {
    const {
      level = 'info',
      meta = {},
      source = 'frontend',
      stack,
      url
    } = options;

    // Sanitiser le message et les métadonnées
    const sanitizedMessage = sanitizeString(message);
    const sanitizedMeta = sanitizeObject(meta);
    const sanitizedStack = stack ? sanitizeString(stack) : undefined;

    // ❌ NE JAMAIS LOGGER DANS LA CONSOLE (même en dev)
    // Tous les logs passent par l'Edge Function silencieusement

    // Vérifier le backoff
    if (this.isInBackoff()) {
      // En backoff, ne rien faire
      return;
    }

    // Envoyer silencieusement à l'Edge Function
    // Utiliser .then().catch() au lieu de try/catch pour éviter les erreurs dans la console
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        const token = session?.access_token || null;
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://wjzlicokhxitmeoxkjzv.supabase.co';
        
        // Utiliser fetch avec .catch() silencieux pour éviter les erreurs CORS dans la console
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
        
        // Appel silencieux avec gestion d'erreur pour éviter les erreurs dans la console
        fetch(`${supabaseUrl}/functions/v1/log-error`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            message: sanitizedMessage,
            level,
            meta: sanitizedMeta,
            source,
            stack_trace: sanitizedStack,
            url: url || getCurrentUrl(),
            user_agent: getUserAgent(),
          }),
          signal: controller.signal
        })
        .then((response) => {
          clearTimeout(timeoutId);
          
          // Si erreur 5xx ou CORS, activer le backoff
          if (!response.ok && (response.status >= 500 || response.status === 0)) {
            this.activateBackoff();
          } else {
            // Succès, réinitialiser le backoff
            this.isBackoffActive = false;
          }
        })
        .catch(() => {
          clearTimeout(timeoutId);
          // Erreur réseau/CORS, activer le backoff
          this.activateBackoff();
        });
      })
      .catch(() => {
        // Erreur de session, activer le backoff
        this.activateBackoff();
      });
  }

  /**
   * Log info
   */
  info(message: string, meta?: Record<string, any>): void {
    this.log(message, { level: 'info', meta });
  }

  /**
   * Log warning
   */
  warn(message: string, meta?: Record<string, any>): void {
    this.log(message, { level: 'warn', meta });
  }

  /**
   * Log error
   */
  error(message: string, error?: Error, meta?: Record<string, any>): void {
    this.log(message, {
      level: 'error',
      meta: {
        ...meta,
        errorName: error?.name,
        errorMessage: error?.message,
      },
      stack: getStackTrace(error),
    });
  }

  /**
   * Log debug (silencieux - toujours envoyé à l'Edge Function)
   */
  debug(message: string, meta?: Record<string, any>): void {
    this.log(message, { level: 'debug', meta });
  }
}

// Export singleton
export const logger = new SecureLogger();

// Export pour compatibilité
export default logger;

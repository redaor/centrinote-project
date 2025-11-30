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
      if (['password', 'token', 'apiKey', 'secret', 'authorization', 'cookie'].includes(key.toLowerCase())) {
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
 * Logger sécurisé
 */
class SecureLogger {
  private isDev: boolean;

  constructor() {
    this.isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';
  }

  /**
   * Log un message (console + Supabase)
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

    // Log dans la console uniquement en mode dev
    if (this.isDev) {
      const consoleMethod = console[level] || console.log;
      consoleMethod(`[${level.toUpperCase()}]`, sanitizedMessage, sanitizedMeta);
    }

    // Envoyer à Supabase uniquement si VITE_ENABLE_ERROR_LOGGING est true (ou en prod)
    const shouldLogToSupabase = import.meta.env.VITE_ENABLE_ERROR_LOGGING === 'true' || !this.isDev;
    
    if (shouldLogToSupabase) {
      try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase.from('error_logs').insert({
        user_id: user?.id || null,
        message: sanitizedMessage,
        level,
        meta: sanitizedMeta,
        source,
        stack_trace: sanitizedStack,
        url: url || getCurrentUrl(),
        user_agent: getUserAgent(),
      });
      } catch (error) {
        // Ne pas faire échouer l'application si le log échoue
        if (this.isDev) {
          console.error('❌ Failed to log to Supabase:', error);
        }
      }
    }
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
   * Log debug (uniquement en dev)
   */
  debug(message: string, meta?: Record<string, any>): void {
    if (this.isDev) {
      this.log(message, { level: 'debug', meta });
    }
  }
}

// Export singleton
export const logger = new SecureLogger();

// Export pour compatibilité
export default logger;

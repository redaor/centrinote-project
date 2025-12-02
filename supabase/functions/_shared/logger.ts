/**
 * Logger pour Edge Functions
 * 
 * - En DEV: utilise console.log/error (visible dans les logs Supabase)
 * - En PROD: envoie silencieusement à l'Edge Function log-error
 */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const IS_DEV = Deno.env.get("ENVIRONMENT") === "development" || 
               Deno.env.get("DENO_ENV") === "development" ||
               !Deno.env.get("SUPABASE_URL"); // Fallback si URL non définie

type LogLevel = "info" | "warn" | "error" | "debug";

interface LogOptions {
  level?: LogLevel;
  meta?: Record<string, any>;
  source?: string;
  error?: Error;
}

/**
 * Sanitise les données sensibles (emails, tokens, UUIDs, etc.)
 */
function sanitizeData(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === "string") {
    // Masquer les emails
    data = data.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, "[REDACTED_EMAIL]");
    // Masquer les tokens JWT
    data = data.replace(/\b(eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)\b/g, "[REDACTED_TOKEN]");
    // Masquer les UUIDs (partiellement)
    data = data.replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, (match) => {
      return match.substring(0, 8) + "...";
    });
    // Masquer les clés API
    data = data.replace(/(api[_-]?key|apikey|secret[_-]?key)["\s:=]+([^"}\s,]+)/gi, '$1="[REDACTED]"');
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item));
  }

  if (typeof data === "object") {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      // Masquer les clés sensibles
      if (["password", "token", "apiKey", "secret", "authorization", "cookie", "email", "user_id", "userId", "id"].includes(key.toLowerCase())) {
        sanitized[key] = "[REDACTED]";
      } else {
        sanitized[key] = sanitizeData(value);
      }
    }
    return sanitized;
  }

  return data;
}

/**
 * Envoie un log à l'Edge Function log-error (production uniquement)
 */
async function sendToLogError(
  message: string,
  level: LogLevel,
  options: LogOptions = {}
): Promise<void> {
  if (IS_DEV) {
    return; // En dev, on utilise console.log directement
  }

  try {
    const sanitizedMessage = sanitizeData(message);
    const sanitizedMeta = options.meta ? sanitizeData(options.meta) : {};

    const payload = {
      message: sanitizedMessage,
      level: level,
      meta: {
        ...sanitizedMeta,
        source: options.source || "edge-function",
        function_name: Deno.env.get("SUPABASE_FUNCTION_NAME") || "unknown",
        errorName: options.error?.name,
        errorMessage: options.error?.message,
      },
      stack_trace: options.error?.stack ? sanitizeData(options.error.stack) : undefined,
    };

    // Appel asynchrone non bloquant (fire and forget)
    fetch(`${SUPABASE_URL}/functions/v1/log-error`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""}`,
      },
      body: JSON.stringify(payload),
    }).catch(() => {
      // Ignorer les erreurs de réseau (ne pas bloquer le flux principal)
    });
  } catch (err) {
    // Ignorer les erreurs de logging (ne pas bloquer le flux principal)
  }
}

/**
 * Logger pour Edge Functions
 */
export const logger = {
  /**
   * Log info
   */
  info: (message: string, meta?: Record<string, any>) => {
    if (IS_DEV) {
      console.log(`ℹ️ [INFO] ${message}`, meta || "");
    } else {
      sendToLogError(message, "info", { meta });
    }
  },

  /**
   * Log warning
   */
  warn: (message: string, meta?: Record<string, any>) => {
    if (IS_DEV) {
      console.warn(`⚠️ [WARN] ${message}`, meta || "");
    } else {
      sendToLogError(message, "warn", { meta });
    }
  },

  /**
   * Log error
   */
  error: (message: string, error?: Error, meta?: Record<string, any>) => {
    if (IS_DEV) {
      console.error(`❌ [ERROR] ${message}`, error || "", meta || "");
    } else {
      sendToLogError(message, "error", { error, meta });
    }
  },

  /**
   * Log debug
   */
  debug: (message: string, meta?: Record<string, any>) => {
    if (IS_DEV) {
      console.log(`🔍 [DEBUG] ${message}`, meta || "");
    } else {
      sendToLogError(message, "debug", { meta });
    }
  },
};


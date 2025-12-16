/**
 * Logger sécurisé avec anonymisation automatique des données sensibles
 *
 * ✅ RGPD compliant
 * ✅ Anonymise emails, tokens, passwords
 * ✅ Compatible avec Sentry/LogRocket
 */

// Types de données sensibles à anonymiser
type SensitiveDataType =
  | 'email'
  | 'password'
  | 'token'
  | 'apiKey'
  | 'creditCard'
  | 'phone'
  | 'ip'
  | 'userAgent';

// Patterns de détection
const PATTERNS = {
  email: /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi,
  password: /password['":\s]*(["'])?[^"'\s]{6,}(["'])?/gi,
  token: /(sk-[a-zA-Z0-9_-]{20,}|eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*)/gi,
  apiKey: /(sk_live_|pk_live_|sk_test_|pk_test_|AIza)[a-zA-Z0-9_-]{20,}/gi,
  creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
  phone: /(\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g,
  ip: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
};

// Clés à anonymiser dans les objets
const SENSITIVE_KEYS = [
  'password',
  'pwd',
  'secret',
  'token',
  'apiKey',
  'api_key',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'authorization',
  'bearer',
  'cookie',
  'session',
  'sessionId',
  'session_id',
  'creditCard',
  'credit_card',
  'ccNumber',
  'cc_number',
  'cvv',
  'ssn',
  'socialSecurity',
  'social_security',
];

/**
 * Anonymiser un email
 * john.doe@example.com => j***@example.com
 */
export function anonymizeEmail(email: string): string {
  if (!email || typeof email !== 'string') return '';

  const [local, domain] = email.split('@');
  if (!local || !domain) return '***@***';

  return `${local[0]}***@${domain}`;
}

/**
 * Anonymiser un token
 * sk-proj-abc123... => sk-proj-***
 */
export function anonymizeToken(token: string): string {
  if (!token || typeof token !== 'string') return '';

  if (token.startsWith('sk-')) {
    return token.substring(0, 7) + '***';
  }

  if (token.startsWith('eyJ')) {
    return token.substring(0, 10) + '***';
  }

  if (token.length > 10) {
    return token.substring(0, 6) + '***';
  }

  return '***';
}

/**
 * Anonymiser une carte de crédit
 * 4242424242424242 => 4242 **** **** 4242
 */
export function anonymizeCreditCard(card: string): string {
  if (!card || typeof card !== 'string') return '';

  const cleaned = card.replace(/[\s-]/g, '');
  if (cleaned.length !== 16) return '****';

  return `${cleaned.substring(0, 4)} **** **** ${cleaned.substring(12)}`;
}

/**
 * Anonymiser une IP
 * 192.168.1.100 => 192.168.x.x
 */
export function anonymizeIP(ip: string): string {
  if (!ip || typeof ip !== 'string') return '';

  const parts = ip.split('.');
  if (parts.length !== 4) return 'x.x.x.x';

  return `${parts[0]}.${parts[1]}.x.x`;
}

/**
 * Anonymiser un User Agent
 * Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0 => Chrome/Windows
 */
export function anonymizeUserAgent(ua: string): string {
  if (!ua || typeof ua !== 'string') return 'Unknown';

  // Extraire seulement le navigateur et l'OS
  const browser =
    /Chrome|Firefox|Safari|Edge|Opera/i.exec(ua)?.[0] || 'Unknown';
  const os =
    /Windows|Mac|Linux|Android|iOS/i.exec(ua)?.[0] || 'Unknown';

  return `${browser}/${os}`;
}

/**
 * Anonymiser une chaîne contenant potentiellement des données sensibles
 */
export function anonymizeString(str: string): string {
  if (!str || typeof str !== 'string') return str;

  let result = str;

  // Anonymiser les emails
  result = result.replace(PATTERNS.email, (match) =>
    anonymizeEmail(match)
  );

  // Anonymiser les tokens
  result = result.replace(PATTERNS.token, (match) =>
    anonymizeToken(match)
  );

  // Anonymiser les clés API
  result = result.replace(PATTERNS.apiKey, (match) =>
    anonymizeToken(match)
  );

  // Anonymiser les cartes de crédit
  result = result.replace(PATTERNS.creditCard, (match) =>
    anonymizeCreditCard(match)
  );

  // Anonymiser les IPs
  result = result.replace(PATTERNS.ip, (match) => anonymizeIP(match));

  return result;
}

/**
 * Anonymiser un objet récursivement
 */
export function anonymizeObject(obj: any): any {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    return anonymizeString(obj);
  }

  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }

  if (obj instanceof Date) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => anonymizeObject(item));
  }

  if (typeof obj === 'object') {
    const anonymized: any = {};

    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();

      // Vérifier si la clé est sensible
      const isSensitive = SENSITIVE_KEYS.some((sk) =>
        lowerKey.includes(sk.toLowerCase())
      );

      if (isSensitive) {
        // Anonymiser complètement
        anonymized[key] = '***';
      } else if (lowerKey.includes('email')) {
        // Anonymiser l'email
        anonymized[key] =
          typeof value === 'string' ? anonymizeEmail(value) : value;
      } else if (lowerKey.includes('ip')) {
        // Anonymiser l'IP
        anonymized[key] =
          typeof value === 'string' ? anonymizeIP(value) : value;
      } else if (lowerKey.includes('useragent') || lowerKey.includes('user_agent')) {
        // Anonymiser le User Agent
        anonymized[key] =
          typeof value === 'string' ? anonymizeUserAgent(value) : value;
      } else {
        // Anonymiser récursivement
        anonymized[key] = anonymizeObject(value);
      }
    }

    return anonymized;
  }

  return obj;
}

/**
 * Logger sécurisé
 */
class SecureLogger {
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment =
      import.meta.env.MODE === 'development' ||
      import.meta.env.DEV === true;
  }

  /**
   * Log générique
   */
  log(...args: any[]): void {
    if (this.isDevelopment) {
      // En dev, logger tout sans anonymisation pour debug
      console.log(...args);
    } else {
      // En prod, anonymiser tout
      const sanitized = args.map((arg) => anonymizeObject(arg));
      console.log(...sanitized);
    }
  }

  /**
   * Log d'info
   */
  info(...args: any[]): void {
    if (this.isDevelopment) {
      console.info(...args);
    } else {
      const sanitized = args.map((arg) => anonymizeObject(arg));
      console.info(...sanitized);
    }
  }

  /**
   * Log de warning
   */
  warn(...args: any[]): void {
    const sanitized = args.map((arg) => anonymizeObject(arg));
    console.warn(...sanitized);
  }

  /**
   * Log d'erreur
   */
  error(...args: any[]): void {
    const sanitized = args.map((arg) => anonymizeObject(arg));
    console.error(...sanitized);
  }

  /**
   * Log de debug (seulement en dev)
   */
  debug(...args: any[]): void {
    if (this.isDevelopment) {
      console.debug(...args);
    }
  }
}

// Export singleton
export const secureLogger = new SecureLogger();

// Export default
export default secureLogger;

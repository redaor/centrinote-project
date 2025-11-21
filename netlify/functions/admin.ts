/**
 * ⚠️ NETLIFY FUNCTION SÉCURISÉE - ADMIN OPERATIONS
 *
 * Cette fonction gère toutes les opérations admin nécessitant la SUPABASE_SERVICE_ROLE_KEY.
 * Elle N'EST JAMAIS exposée côté client.
 *
 * Sécurité :
 * - Utilise process.env.* (jamais VITE_*)
 * - Protégé par header secret (x-admin-secret)
 * - Rate-limiting basique (10 req/min par IP)
 * - Validation des entrées (Zod)
 * - Logger anonymisant les données sensibles
 */

import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface AdminResponse {
  success: boolean;
  data?: any;
  error?: string;
}

interface ConfirmEmailBody {
  userId: string;
  email: string;
}

interface CreateTokenBody {
  userId: string;
  email: string;
}

interface UseTokenBody {
  token: string;
}

interface CanResendBody {
  email: string;
}

interface InvalidateTokensBody {
  userId: string;
}

// ============================================================================
// CONFIGURATION & CONSTANTS
// ============================================================================

const RATE_LIMIT_MAX = 10; // Max requêtes par fenêtre
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute en millisecondes
const RESEND_COOLDOWN_MS = 60 * 1000; // 1 minute entre deux envois

// ============================================================================
// RATE LIMITING
// ============================================================================

const rateLimitStore = new Map<string, RateLimitEntry>();

function getRateLimitKey(ip: string, action: string): string {
  return `${ip}:${action}`;
}

function checkRateLimit(ip: string, action: string): boolean {
  const key = getRateLimitKey(ip, action);
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    // Nouvelle fenêtre
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW
    });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false; // Rate limit dépassé
  }

  entry.count++;
  return true;
}

// Nettoyage périodique du store (éviter la croissance infinie)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000); // Toutes les 5 minutes

// ============================================================================
// LOGGER SÉCURISÉ
// ============================================================================

function anonymizeEmail(email: string): string {
  if (!email || !email.includes('@')) return '***';
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

function secureLog(level: 'info' | 'warn' | 'error', message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const sanitizedData = data ? JSON.stringify(data).replace(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, (email) => anonymizeEmail(email)) : '';
  console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`, sanitizedData || '');
}

// ============================================================================
// SUPABASE ADMIN CLIENT
// ============================================================================

let supabaseAdmin: SupabaseClient | null = null;

function getSupabaseAdmin(): SupabaseClient {
  if (supabaseAdmin) return supabaseAdmin;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  }

  supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  secureLog('info', 'Supabase Admin client initialized');
  return supabaseAdmin;
}

// ============================================================================
// VALIDATION DES ENTRÉES
// ============================================================================

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validateUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

function validateToken(token: string): boolean {
  // Token doit être une chaîne de 32+ caractères alphanumériques
  return typeof token === 'string' && token.length >= 32 && /^[a-zA-Z0-9]+$/.test(token);
}

// ============================================================================
// FONCTIONS ADMIN
// ============================================================================

/**
 * Confirmer l'email d'un utilisateur directement (admin only)
 */
async function confirmUserEmail(userId: string, email: string): Promise<AdminResponse> {
  try {
    secureLog('info', 'Confirming user email', { userId, email: anonymizeEmail(email) });

    const supabase = getSupabaseAdmin();

    // Vérifier que l'utilisateur existe
    const { data: user, error: userError } = await supabase.auth.admin.getUserById(userId);

    if (userError || !user) {
      secureLog('error', 'User not found', { userId, error: userError?.message });
      return { success: false, error: 'User not found' };
    }

    // Mettre à jour email_confirmed_at
    const { data, error } = await supabase.auth.admin.updateUserById(userId, {
      email_confirmed_at: new Date().toISOString()
    });

    if (error) {
      secureLog('error', 'Failed to confirm email', { userId, error: error.message });
      return { success: false, error: error.message };
    }

    secureLog('info', 'Email confirmed successfully', { userId });
    return { success: true, data };
  } catch (error: any) {
    secureLog('error', 'Exception in confirmUserEmail', { error: error.message });
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Créer un token de confirmation personnalisé
 */
async function createConfirmationToken(userId: string, email: string): Promise<AdminResponse> {
  try {
    secureLog('info', 'Creating confirmation token', { userId, email: anonymizeEmail(email) });

    const supabase = getSupabaseAdmin();

    // Générer un token aléatoire sécurisé
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 heures

    // Insérer dans user_confirmations
    const { data, error } = await supabase
      .from('user_confirmations')
      .insert({
        user_id: userId,
        email,
        token,
        expires_at: expiresAt.toISOString(),
        used: false
      })
      .select()
      .single();

    if (error) {
      secureLog('error', 'Failed to create token', { userId, error: error.message });
      return { success: false, error: error.message };
    }

    secureLog('info', 'Token created successfully', { userId, tokenId: data.id });
    return { success: true, data: { token, expiresAt: data.expires_at } };
  } catch (error: any) {
    secureLog('error', 'Exception in createConfirmationToken', { error: error.message });
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Utiliser un token de confirmation
 */
async function useConfirmationToken(token: string): Promise<AdminResponse> {
  try {
    secureLog('info', 'Using confirmation token', { token: token.substring(0, 8) + '...' });

    const supabase = getSupabaseAdmin();

    // Trouver le token
    const { data: tokenData, error: findError } = await supabase
      .from('user_confirmations')
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .single();

    if (findError || !tokenData) {
      secureLog('warn', 'Token not found or already used');
      return { success: false, error: 'Invalid or expired token' };
    }

    // Vérifier l'expiration
    if (new Date(tokenData.expires_at) < new Date()) {
      secureLog('warn', 'Token expired', { expiresAt: tokenData.expires_at });
      return { success: false, error: 'Token expired' };
    }

    // Marquer comme utilisé
    const { error: updateError } = await supabase
      .from('user_confirmations')
      .update({ used: true, used_at: new Date().toISOString() })
      .eq('id', tokenData.id);

    if (updateError) {
      secureLog('error', 'Failed to mark token as used', { error: updateError.message });
      return { success: false, error: updateError.message };
    }

    // Confirmer l'email de l'utilisateur
    const confirmResult = await confirmUserEmail(tokenData.user_id, tokenData.email);

    if (!confirmResult.success) {
      secureLog('error', 'Failed to confirm email after token validation');
      return confirmResult;
    }

    secureLog('info', 'Token used successfully', { userId: tokenData.user_id });
    return { success: true, data: { userId: tokenData.user_id, email: tokenData.email } };
  } catch (error: any) {
    secureLog('error', 'Exception in useConfirmationToken', { error: error.message });
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Vérifier si un utilisateur peut renvoyer un email de confirmation
 */
async function canResendConfirmation(email: string): Promise<AdminResponse> {
  try {
    secureLog('info', 'Checking resend eligibility', { email: anonymizeEmail(email) });

    const supabase = getSupabaseAdmin();

    // Chercher le dernier token créé pour cet email
    const { data, error } = await supabase
      .from('user_confirmations')
      .select('created_at')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = aucun résultat (OK, peut envoyer)
      secureLog('error', 'Failed to check resend eligibility', { error: error.message });
      return { success: false, error: error.message };
    }

    if (!data) {
      // Aucun token précédent, peut envoyer
      return { success: true, data: { canResend: true } };
    }

    const lastCreatedAt = new Date(data.created_at).getTime();
    const now = Date.now();
    const canResend = (now - lastCreatedAt) > RESEND_COOLDOWN_MS;

    const nextResendAt = canResend ? null : new Date(lastCreatedAt + RESEND_COOLDOWN_MS).toISOString();

    secureLog('info', 'Resend eligibility checked', { canResend, nextResendAt });
    return { success: true, data: { canResend, nextResendAt } };
  } catch (error: any) {
    secureLog('error', 'Exception in canResendConfirmation', { error: error.message });
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Invalider tous les tokens d'un utilisateur
 */
async function invalidateOldTokens(userId: string): Promise<AdminResponse> {
  try {
    secureLog('info', 'Invalidating old tokens', { userId });

    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from('user_confirmations')
      .update({ used: true })
      .eq('user_id', userId)
      .eq('used', false);

    if (error) {
      secureLog('error', 'Failed to invalidate tokens', { userId, error: error.message });
      return { success: false, error: error.message };
    }

    secureLog('info', 'Tokens invalidated successfully', { userId });
    return { success: true };
  } catch (error: any) {
    secureLog('error', 'Exception in invalidateOldTokens', { error: error.message });
    return { success: false, error: 'Internal server error' };
  }
}

// ============================================================================
// HANDLER PRINCIPAL
// ============================================================================

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  const startTime = Date.now();

  // Headers CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-admin-secret',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Gérer OPTIONS (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    // Vérifier le secret admin
    const adminSecret = event.headers['x-admin-secret'];
    const expectedSecret = process.env.ADMIN_SECRET;

    if (!expectedSecret) {
      secureLog('error', 'ADMIN_SECRET not configured');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ success: false, error: 'Server misconfiguration' })
      };
    }

    if (!adminSecret || adminSecret !== expectedSecret) {
      secureLog('warn', 'Unauthorized access attempt', { ip: event.headers['x-forwarded-for'] || 'unknown' });
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ success: false, error: 'Forbidden' })
      };
    }

    // Rate limiting
    const clientIp = event.headers['x-forwarded-for']?.split(',')[0] || 'unknown';
    const path = event.path.replace('/.netlify/functions/admin', '');

    if (!checkRateLimit(clientIp, path)) {
      secureLog('warn', 'Rate limit exceeded', { ip: clientIp, path });
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({ success: false, error: 'Too many requests. Please try again later.' })
      };
    }

    // Router vers les différentes actions
    let result: AdminResponse;

    switch (path) {
      case '/confirm-email': {
        if (event.httpMethod !== 'POST') {
          return { statusCode: 405, headers, body: JSON.stringify({ success: false, error: 'Method not allowed' }) };
        }

        const body: ConfirmEmailBody = JSON.parse(event.body || '{}');

        if (!body.userId || !validateUUID(body.userId)) {
          return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Invalid userId' }) };
        }

        if (!body.email || !validateEmail(body.email)) {
          return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Invalid email' }) };
        }

        result = await confirmUserEmail(body.userId, body.email);
        break;
      }

      case '/create-token': {
        if (event.httpMethod !== 'POST') {
          return { statusCode: 405, headers, body: JSON.stringify({ success: false, error: 'Method not allowed' }) };
        }

        const body: CreateTokenBody = JSON.parse(event.body || '{}');

        if (!body.userId || !validateUUID(body.userId)) {
          return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Invalid userId' }) };
        }

        if (!body.email || !validateEmail(body.email)) {
          return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Invalid email' }) };
        }

        result = await createConfirmationToken(body.userId, body.email);
        break;
      }

      case '/use-token': {
        if (event.httpMethod !== 'POST') {
          return { statusCode: 405, headers, body: JSON.stringify({ success: false, error: 'Method not allowed' }) };
        }

        const body: UseTokenBody = JSON.parse(event.body || '{}');

        if (!body.token || !validateToken(body.token)) {
          return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Invalid token' }) };
        }

        result = await useConfirmationToken(body.token);
        break;
      }

      case '/can-resend': {
        if (event.httpMethod !== 'POST') {
          return { statusCode: 405, headers, body: JSON.stringify({ success: false, error: 'Method not allowed' }) };
        }

        const body: CanResendBody = JSON.parse(event.body || '{}');

        if (!body.email || !validateEmail(body.email)) {
          return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Invalid email' }) };
        }

        result = await canResendConfirmation(body.email);
        break;
      }

      case '/invalidate-tokens': {
        if (event.httpMethod !== 'POST') {
          return { statusCode: 405, headers, body: JSON.stringify({ success: false, error: 'Method not allowed' }) };
        }

        const body: InvalidateTokensBody = JSON.parse(event.body || '{}');

        if (!body.userId || !validateUUID(body.userId)) {
          return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Invalid userId' }) };
        }

        result = await invalidateOldTokens(body.userId);
        break;
      }

      default:
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ success: false, error: 'Endpoint not found' })
        };
    }

    const duration = Date.now() - startTime;
    secureLog('info', `Request completed in ${duration}ms`, { path, success: result.success });

    return {
      statusCode: result.success ? 200 : 400,
      headers,
      body: JSON.stringify(result)
    };

  } catch (error: any) {
    const duration = Date.now() - startTime;
    secureLog('error', `Request failed after ${duration}ms`, { error: error.message });

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: 'Internal server error' })
    };
  }
};

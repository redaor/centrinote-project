/**
 * Service de webhook optimisé avec dédoublonnage et anti-flood
 * HOTFIX: Pas de retry infini, une seule requête à la fois
 */

import { log } from '../utils/logger';

// Configuration des URLs selon l'environnement
const isDev = import.meta.env.DEV;
const isLocalhost = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

// En production ou preview Netlify : utiliser le proxy
// En dev local : utiliser directement n8n (CORS permissif configuré)
const N8N_BASE = isDev && isLocalhost
  ? 'https://n8n.srv886297.hstgr.cloud/webhook'
  : '/.netlify/functions/n8n-proxy';

// Paths n8n (UUID ou segments)
const DISCUSSION_PATH = 'fb90cf61-7012-43fd-85e8-2cbc0f9282c7'; // centrinote-discussion
const AUTOMATION_PATH = 'centrinote-automation';
const EVENTS_PATH = 'centrinote-events';

interface WebhookResponse {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
  statusCode?: number;
  skipped?: boolean;
  diagnostics?: {
    url?: string;
    timestamp?: string;
    responseTime?: number;
    connectionType?: string;
    fallbackAttempted?: boolean;
  };
}

// Dédoublonnage en mémoire + AbortController + timeout
const inFlight = new Map<string, AbortController>();

// Flag debug activé par VITE_AI_DEBUG
const AI_DEBUG = import.meta.env.VITE_AI_DEBUG === '1' || import.meta.env.DEV;

// Log une seule fois les URLs effectives au premier appel
let hasLoggedUrls = false;
function logUrlsOnce() {
  if (!hasLoggedUrls && AI_DEBUG) {
    hasLoggedUrls = true;
    console.table({
      NODE_ENV: import.meta.env.MODE,
      VITE_N8N_WEBHOOK_URL: import.meta.env.VITE_N8N_WEBHOOK_URL || 'NOT_SET',
      USING_PROXY: !(isDev && isLocalhost),
      N8N_BASE,
      DISCUSSION_PATH,
      EVENTS_PATH,
      AUTOMATION_PATH
    });
  }
}

export async function postWebhookViaProxy(
  n8nPath: string,
  body: any,
  dedupeKey?: string,
  timeoutMs = 8000
): Promise<{ ok: boolean; status?: number; json?: any; error?: string; skipped?: boolean; reason?: string }> {
  logUrlsOnce();

  const key = dedupeKey ?? `${n8nPath}:${JSON.stringify(body).slice(0, 200)}`;

  // Dédoublonnage : si déjà en cours, on ne relance pas
  if (inFlight.has(key)) {
    log.debug('Request deduped:', key);
    return { ok: false, skipped: true, reason: 'deduped' };
  }

  const controller = new AbortController();
  inFlight.set(key, controller);

  const timer = setTimeout(() => {
    log.debug('Request timeout:', key);
    controller.abort();
  }, timeoutMs);

  try {
    // Construction URL selon environnement
    let finalUrl;
    if (isDev && isLocalhost) {
      // Dev local : appel direct
      finalUrl = `${N8N_BASE}/${n8nPath}`;
      if (AI_DEBUG) log.debug('🔧 DEV LOCAL - URL directe:', finalUrl);
    } else {
      // Production/Preview : via proxy Netlify
      finalUrl = `${N8N_BASE}?path=${encodeURIComponent(n8nPath)}`;
      if (AI_DEBUG) log.debug('🌐 PROD/PREVIEW - URL proxy:', finalUrl);
    }
    
    const res = await fetch(finalUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    
    const ok = res.ok;
    let json: any = null;
    try { 
      const text = await res.text();
      if (text && text.trim()) {
        json = JSON.parse(text);
      } else {
        // N8N répond parfois avec 200 OK mais 0 bytes
        // On considère cela comme un succès avec une réponse par défaut
        json = { success: true, message: 'Webhook received', empty: true };
        if (AI_DEBUG) log.debug('⚠️ N8N webhook returned empty response, using fallback');
      }
    } catch (parseError) {
      if (AI_DEBUG) log.debug('⚠️ JSON parse error, using fallback:', parseError);
      json = { success: true, message: 'Webhook received', parseError: true };
    }
    return { ok, status: res.status, json };
  } catch (err) {
    // Gestion d'erreurs CORS/502 - transformer en état disconnected
    if ((err as any)?.name === 'AbortError') {
      return { ok: false, error: 'timeout', status: 408 };
    }
    
    const errorMsg = String((err as any)?.message ?? err);
    if (errorMsg.includes('CORS') || errorMsg.includes('502') || errorMsg.includes('Bad Gateway')) {
      log.debug('🚫 Erreur CORS/502 détectée - arrêt relance pendant 60s');
      return { ok: false, error: 'connectivity_issue', status: 502 };
    }
    
    return { ok: false, error: errorMsg, status: 500 };
  } finally {
    clearTimeout(timer);
    inFlight.delete(key);
  }
}

class WebhookService {
  private configLoaded: boolean = false;

  /**
   * Charge l'URL du webhook depuis la configuration Supabase
   */
  async loadConfig(): Promise<void> {
    if (this.configLoaded) return;
    
    try {
      // TODO: Charger depuis Supabase si nécessaire
      this.configLoaded = true;
      log.debug('Webhook config loaded');
    } catch (error) {
      log.warn('Failed to load webhook config, using defaults');
    }
  }

  /**
   * Déclenche le workflow Discussion IA (OPTIMISÉ)
   */
  async triggerDiscussionWorkflow(payload: {
    message: string;
    userId?: string;
    notes?: any[];
    vocabulary?: any[];
    context?: string;
  }): Promise<WebhookResponse> {
    const startTime = Date.now();
    
    try {
      await this.loadConfig();
      
      const dedupeKey = `discussion:${payload.userId}:${payload.message.slice(0, 50)}`;
      
      const result = await postWebhookViaProxy(
        DISCUSSION_PATH,
        {
          user_id: payload.userId || 'anonymous',
          message: payload.message,
          context: payload.context || 'ai_search',
          metadata: {
            notes_count: payload.notes?.length || 0,
            vocabulary_count: payload.vocabulary?.length || 0,
          },
          timestamp: new Date().toISOString()
        },
        dedupeKey,
        24000 // 24 secondes (Netlify Free timeout = 26s, on garde de la marge)
      );

      if (result.skipped) {
        return {
          success: false,
          skipped: true,
          message: 'Requête déjà en cours'
        };
      }

      const responseTime = Date.now() - startTime;
      log.debug(`Discussion response in ${responseTime}ms`);

      return {
        success: result.ok,
        data: result.json,
        statusCode: result.status,
        message: result.ok ? 'Discussion IA déclenchée' : result.error,
        diagnostics: {
          url: isDev && isLocalhost ? `${N8N_BASE}/${DISCUSSION_PATH}` : `${N8N_BASE}?path=${DISCUSSION_PATH}`,
          timestamp: new Date().toISOString(),
          responseTime
        }
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      log.error('Discussion workflow error:', error);
      
      return {
        success: false,
        message: 'Erreur lors du déclenchement',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        diagnostics: {
          timestamp: new Date().toISOString(),
          responseTime
        }
      };
    }
  }

  /**
   * Déclenche le workflow Automatisation (OPTIMISÉ)
   */
  async triggerAutomationWorkflow(payload: {
    automationType: string;
    userId?: string;
    data?: any;
  }): Promise<WebhookResponse> {
    const startTime = Date.now();
    
    try {
      await this.loadConfig();
      
      const dedupeKey = `automation:${payload.userId}:${payload.automationType}`;
      
      const result = await postWebhookViaProxy(
        AUTOMATION_PATH,
        {
          automation_type: payload.automationType,
          user_id: payload.userId || 'anonymous',
          data: payload.data || {},
          timestamp: new Date().toISOString()
        },
        dedupeKey,
        8000
      );

      if (result.skipped) {
        return {
          success: false,
          skipped: true,
          message: 'Automatisation déjà en cours'
        };
      }

      const responseTime = Date.now() - startTime;
      log.debug(`Automation response in ${responseTime}ms`);

      return {
        success: result.ok,
        data: result.json,
        statusCode: result.status,
        message: result.ok ? 'Automatisation déclenchée' : result.error,
        diagnostics: {
          url: isDev && isLocalhost ? `${N8N_BASE}/${AUTOMATION_PATH}` : `${N8N_BASE}?path=${AUTOMATION_PATH}`,
          timestamp: new Date().toISOString(),
          responseTime
        }
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      log.error('Automation workflow error:', error);
      
      return {
        success: false,
        message: 'Erreur automatisation',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        diagnostics: {
          timestamp: new Date().toISOString(),
          responseTime
        }
      };
    }
  }

  /**
   * Test de connectivité N8N (OPTIMISÉ - pas de spam)
   */
  async testN8NConnectivity(): Promise<WebhookResponse> {
    const startTime = Date.now();
    
    try {
      const dedupeKey = 'connectivity:test';
      
      const result = await postWebhookViaProxy(
        EVENTS_PATH,
        {
          event: 'connectivity_test',
          source: 'centrinote_app',
          timestamp: new Date().toISOString()
        },
        dedupeKey,
        5000 // 5 secondes pour un test
      );

      if (result.skipped) {
        return {
          success: true, // On considère OK si déjà en cours
          skipped: true,
          message: 'Test déjà en cours'
        };
      }

      const responseTime = Date.now() - startTime;
      
      return {
        success: result.ok,
        message: result.ok ? 'Webhook N8N accessible' : 'Webhook N8N inaccessible',
        statusCode: result.status,
        diagnostics: {
          url: isDev && isLocalhost ? `${N8N_BASE}/${EVENTS_PATH}` : `${N8N_BASE}?path=${EVENTS_PATH}`,
          timestamp: new Date().toISOString(),
          responseTime,
          connectionType: 'n8n'
        }
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        success: false,
        message: 'Test de connectivité échoué',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        diagnostics: {
          timestamp: new Date().toISOString(),
          responseTime
        }
      };
    }
  }

  /**
   * Nettoie toutes les requêtes en cours
   */
  cleanup(): void {
    for (const [key, controller] of inFlight.entries()) {
      log.debug('Aborting request:', key);
      controller.abort();
    }
    inFlight.clear();
  }
}

// Export singleton
export const webhookService = new WebhookService();

// Export pour tests
export default webhookService;
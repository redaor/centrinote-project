// ❌ ANCIEN SYSTÈME OAUTH - DÉSACTIVÉ
// Remplacé par Supabase OAuth natif - voir supabaseZoomAuth.ts
// ===================================================================

/* SYSTÈME DÉSACTIVÉ - UTILISER supabaseZoomAuth.ts À LA PLACE

interface ZoomOAuthConfig {
  clientId: string;
  redirectUri: string;
  scope?: string;
}

interface ZoomOAuthUrl {
  url: string;
  state: string;
  timestamp: number;
}

/**
 * Génère dynamiquement l'URL d'autorisation OAuth Zoom avec state unique
 * @param config Configuration OAuth (client_id, redirect_uri, scope)
 * @returns Objet contenant l'URL complète et le state généré
 */
function generateZoomOAuthUrlDisabled(config: ZoomOAuthConfig): ZoomOAuthUrl {
  console.log('🔐 Génération URL OAuth Zoom dynamique...');
  
  // Validation des paramètres requis
  if (!config.clientId) {
    throw new Error('❌ client_id Zoom requis pour générer l\'URL OAuth');
  }
  
  if (!config.redirectUri) {
    throw new Error('❌ redirect_uri requis pour générer l\'URL OAuth');
  }
  
  // Générer un state unique et sécurisé (UUID v4)
  const uniqueState = crypto.randomUUID();
  
  // Scope par défaut si non spécifié
  const defaultScope = 'meeting:write meeting:read user:read recording:read';
  const oauthScope = config.scope || defaultScope;
  
  // Construire les paramètres OAuth selon la documentation Zoom
  const oauthParams = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    state: uniqueState,
    scope: oauthScope
  });
  
  // URL d'autorisation Zoom complète
  const authUrl = `https://zoom.us/oauth/authorize?${oauthParams.toString()}`;
  
  const result = {
    url: authUrl,
    state: uniqueState,
    timestamp: Date.now()
  };
  
  console.log('✅ URL OAuth générée:', {
    clientId: config.clientId.substring(0, 8) + '...',
    redirectUri: config.redirectUri,
    state: uniqueState.substring(0, 16) + '...',
    scope: oauthScope,
    timestamp: result.timestamp
  });
  
  return result;
}

/**
 * Génère un state OAuth alternatif avec Math.random() si crypto.randomUUID() non disponible
 * @returns String state unique
 */
export function generateOAuthState(): string {
  // Priorité à crypto.randomUUID() si disponible (plus sécurisé)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback avec Math.random() + timestamp pour unicité
  const randomPart = Math.random().toString(36).substring(2);
  const timestampPart = Date.now().toString(36);
  
  console.warn('⚠️ crypto.randomUUID() non disponible, utilisation de Math.random()');
  
  return `${randomPart}_${timestampPart}`;
}

/**
 * Valide un state OAuth (format et longueur)
 * @param state State à valider
 * @returns true si valide
 */
export function validateOAuthState(state: string): boolean {
  if (!state || typeof state !== 'string') {
    return false;
  }
  
  // UUID format: 8-4-4-4-12 characters (avec tirets)
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  // Math.random format: contient underscore
  const mathRandomPattern = /^[a-z0-9]+_[a-z0-9]+$/;
  
  return uuidPattern.test(state) || mathRandomPattern.test(state);
}

*/

// ⚠️ ANCIEN SYSTÈME DÉSACTIVÉ - UTILISEZ supabaseZoomAuth.ts
// Ce fichier générait les URLs zoom.us/oauth/authorize (ancien système)

export function generateZoomOAuthUrl(): never {
  throw new Error('❌ Ancien système OAuth désactivé - utilisez supabaseZoomAuth.signInWithZoomOAuth() à la place');
}

export function generateOAuthState(): never {
  throw new Error('❌ Ancien système OAuth désactivé - utilisez supabaseZoomAuth.signInWithZoomOAuth() à la place');
}

export function validateOAuthState(): never {
  throw new Error('❌ Ancien système OAuth désactivé - utilisez supabaseZoomAuth.signInWithZoomOAuth() à la place');
}

export const CENTRINOTE_ZOOM_CONFIG = {
  warning: '❌ Configuration désactivée - utilisez supabaseZoomAuth.ts'
};
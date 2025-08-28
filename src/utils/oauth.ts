// src/utils/oauth.ts
// Utilitaire OAuth Zoom avec PKCE et cookies sécurisés

/**
 * Génère un code verifier PKCE aléatoirement
 */
function generateCodeVerifier(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => ('0' + b.toString(16)).slice(-2))
    .join('');
}

/**
 * Génère un code challenge à partir du code verifier (SHA256 + Base64URL)
 */
async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  
  // Conversion Base64URL
  const base64url = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  
  return base64url;
}

/**
 * Démarre le flux OAuth Zoom avec PKCE et stockage en cookies sécurisés
 */
export async function startZoomOAuth(): Promise<void> {
  console.log('🚀 Démarrage OAuth Zoom avec PKCE et cookies');
  
  // Génération state et PKCE
  const state = crypto.randomUUID();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  
  console.log('🔐 State généré:', state.substring(0, 16) + '...');
  console.log('🔐 PKCE Code Verifier généré:', codeVerifier.substring(0, 16) + '...');
  console.log('🔐 PKCE Code Challenge généré:', codeChallenge.substring(0, 16) + '...');
  
  // Stockage en cookies sécurisés (Max-Age=300 = 5 minutes)
  const cookieOptions = 'Max-Age=300; Path=/; Secure; SameSite=Lax';
  document.cookie = `zoom_oauth_state=${state}; ${cookieOptions}`;
  document.cookie = `zoom_pkce_verifier=${codeVerifier}; ${cookieOptions}`;
  
  console.log('🍪 Cookies OAuth stockés avec succès');
  
  // Construction de l'URL d'autorisation
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: import.meta.env.VITE_ZOOM_CLIENT_ID,
    redirect_uri: `${import.meta.env.VITE_APP_URL}/zoom-callback`,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256'
  });
  
  const authUrl = `${import.meta.env.VITE_ZOOM_AUTH_URL}?${params.toString()}`;
  
  console.log('🔗 Redirect URI:', `${import.meta.env.VITE_APP_URL}/zoom-callback`);
  console.log('🔗 URL d\'autorisation construite:', authUrl.substring(0, 100) + '...');
  console.log('🔄 Redirection vers Zoom OAuth...');
  
  // Redirection vers Zoom
  window.location.href = authUrl;
}

/**
 * Récupère une valeur de cookie par son nom
 */
export function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

/**
 * Supprime un cookie
 */
export function deleteCookie(name: string): void {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax; Secure`;
}

/**
 * Nettoie tous les cookies OAuth
 */
export function clearOAuthCookies(): void {
  deleteCookie('zoom_oauth_state');
  deleteCookie('zoom_pkce_verifier');
  console.log('🧹 Cookies OAuth nettoyés');
}
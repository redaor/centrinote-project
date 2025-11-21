// netlify/functions/auth-me.ts
import type { Handler } from '@netlify/functions';

/**
 * Endpoint minimal pour /auth/me
 *
 * Dans une vraie implémentation:
 * - Lire le token JWT depuis le cookie ou Authorization header
 * - Vérifier le token avec Supabase
 * - Retourner les infos user
 *
 * Pour l'instant: retourne un état minimal pour éviter l'erreur HTML
 */
export const handler: Handler = async (event) => {
  const origin = event.headers.origin || event.headers.Origin;

  // OPTIONS pour CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': origin || '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Cache-Control': 'no-store'
      },
      body: ''
    };
  }

  // Pour l'instant: retourne un état "non authentifié"
  // TODO: Intégrer avec Supabase si nécessaire
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': origin || '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Cache-Control': 'no-store'
    },
    body: JSON.stringify({
      authenticated: false,
      message: 'Auth handled client-side via Supabase',
      note: 'This endpoint exists to prevent SPA routing errors'
    })
  };
};

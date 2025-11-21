/**
 * Daily.co Webhook Test Endpoint
 *
 * Edge function ultra-rapide (<200ms) pour passer la validation Daily.co
 * Répond instantanément sans traitement ni appel externe
 */

export default async (request: Request) => {
  // CORS headers pour Daily.co
  const headers = {
    'Content-Type': 'text/plain',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // OPTIONS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  // POST webhook
  if (request.method === 'POST') {
    // Répondre immédiatement sans traiter le body
    return new Response('OK', { status: 200, headers });
  }

  // Autres méthodes
  return new Response('Method Not Allowed', { status: 405, headers });
};

export const config = { path: '/daily-webhook-test' };

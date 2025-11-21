// netlify/functions/n8n-proxy.ts
import type { Handler } from '@netlify/functions';

const N8N_URL = 'https://n8n.srv886297.hstgr.cloud/webhook';
// Autoriser localhost en dev ET centrinote.fr en prod
const ALLOWED_ORIGINS = [
  'https://centrinote.fr',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174'
];

export const handler: Handler = async (event, context) => {
  const origin = event.headers.origin || event.headers.Origin;
  const requestId = context.requestId || 'unknown';

  // OPTIONS pour CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders(origin),
      body: '',
    };
  }

  // Autoriser GET et POST (health checks utilisent GET)
  if (event.httpMethod !== 'POST' && event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: corsHeaders(origin),
      body: JSON.stringify({ error: 'Method Not Allowed', allowedMethods: ['GET', 'POST'] }),
    };
  }

  // Chemin n8n: /api/n8n?path=<uuid-ou-segment>
  const path = event.queryStringParameters?.path;
  if (!path) {
    return {
      statusCode: 400,
      headers: corsHeaders(origin),
      body: JSON.stringify({ error: 'missing path parameter' })
    };
  }

  // Timeout configuré à 25s (limite Netlify Free tier = 26s, on garde 1s de marge)
  // Pour l'IA qui nécessite plus de temps, on devra upgrader le plan Netlify ou utiliser un autre proxy
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);

  const startTime = Date.now();

  try {
    // Log request (seulement en dev pour éviter spam)
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[n8n-proxy] ${event.httpMethod} ${path} - requestId: ${requestId}`);
    }

    const res = await fetch(`${N8N_URL}/${encodeURIComponent(path)}`, {
      method: event.httpMethod,
      headers: { 'Content-Type': 'application/json' },
      body: event.httpMethod === 'POST' ? (event.body ?? '{}') : undefined,
      signal: controller.signal,
    });

    const text = await res.text();
    const duration = Date.now() - startTime;

    // Log response headers pour debug
    const responseHeaders = corsHeaders(origin);
    responseHeaders['X-NF-Request-Id'] = requestId;
    responseHeaders['X-Response-Time'] = `${duration}ms`;
    responseHeaders['X-N8N-Status'] = String(res.status);

    // Log success (seulement en dev)
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[n8n-proxy] ${event.httpMethod} ${path} - ${res.status} in ${duration}ms`);
    }

    return {
      statusCode: res.status,
      headers: responseHeaders,
      body: text,
    };
  } catch (e: any) {
    const duration = Date.now() - startTime;
    const isTimeout = e?.name === 'AbortError';

    // Log error avec détails
    console.error(`[n8n-proxy] ERROR ${event.httpMethod} ${path} - ${isTimeout ? 'TIMEOUT' : e?.message} after ${duration}ms`);

    const errorHeaders = corsHeaders(origin);
    errorHeaders['X-NF-Request-Id'] = requestId;
    errorHeaders['X-Response-Time'] = `${duration}ms`;
    errorHeaders['X-Error-Type'] = isTimeout ? 'timeout' : 'network';

    return {
      statusCode: isTimeout ? 408 : 502,
      headers: errorHeaders,
      body: JSON.stringify({
        error: isTimeout ? 'timeout' : 'bad_gateway',
        errorType: isTimeout ? 'AbortError' : e?.name,
        message: String(e?.message ?? e).slice(0, 200),
        duration: `${duration}ms`,
        requestId
      }),
    };
  } finally {
    clearTimeout(timer);
  }
};

function corsHeaders(origin?: string | null): Record<string, string> {
  // Autoriser l'origine si elle est dans la liste
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Expose-Headers': 'X-NF-Request-Id, X-Response-Time, X-N8N-Status, X-Error-Type',
    'Vary': 'Origin',
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
  };
}
// netlify/functions/healthz.ts
import type { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  const origin = event.headers.origin || event.headers.Origin;

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': origin || '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'no-store'
    },
    body: JSON.stringify({
      ok: true,
      status: 'healthy',
      env: process.env.NODE_ENV || 'production',
      timestamp: new Date().toISOString(),
      service: 'centrinote-api'
    })
  };
};

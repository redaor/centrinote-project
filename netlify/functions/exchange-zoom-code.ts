// netlify/functions/exchange-zoom-code.ts
// Edge Function Netlify pour échanger le code OAuth Zoom

import type { Handler } from '@netlify/functions';

interface ExchangeRequest {
  code?: string;
  redirect_uri?: string;
  code_verifier?: string;
}

export const handler: Handler = async (event) => {
  console.log('🚀 Exchange Zoom Code - Début');
  console.log('📋 Method:', event.httpMethod);
  console.log('📋 Headers:', JSON.stringify(event.headers, null, 2));
  
  // Headers CORS
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Gérer OPTIONS (preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: 'OK'
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    if (!event.body) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Request body required' })
      };
    }

    const { code, redirect_uri, code_verifier } = JSON.parse(event.body) as ExchangeRequest;
    
    console.log('📝 Paramètres reçus:', {
      code: code ? code.substring(0, 10) + '...' : null,
      redirect_uri,
      code_verifier: code_verifier ? code_verifier.substring(0, 16) + '...' : null
    });

    // Validation des paramètres requis
    if (!code || !redirect_uri) {
      console.error('❌ Paramètres manquants');
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'missing code or redirect_uri' })
      };
    }

    console.log('✅ Paramètres validés');

    // Configuration Zoom
    const clientId = process.env.ZOOM_CLIENT_ID;
    const clientSecret = process.env.ZOOM_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      console.error('❌ Configuration Zoom manquante');
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Zoom configuration missing' })
      };
    }

    // Préparation de la requête vers Zoom
    const tokenUrl = 'https://zoom.us/oauth/token';
    const tokenData = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri
    });

    // Ajout du code_verifier si PKCE
    if (code_verifier) {
      tokenData.append('code_verifier', code_verifier);
      console.log('🔐 PKCE code_verifier ajouté');
    }

    console.log('🔗 Appel Zoom API Token Exchange...');

    // Échange du code contre les tokens
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: tokenData.toString()
    });

    console.log('📡 Réponse Zoom API:', {
      status: tokenResponse.status,
      statusText: tokenResponse.statusText
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('❌ Erreur Zoom API:', errorText);
      return {
        statusCode: 502,
        headers: corsHeaders,
        body: JSON.stringify({ error: `Zoom API error: ${errorText}` })
      };
    }

    const tokenResult = await tokenResponse.json();
    
    // Ne pas logguer les tokens pour la sécurité
    console.log('✅ Tokens reçus de Zoom API');
    console.log('📋 Token info:', {
      token_type: tokenResult.token_type,
      expires_in: tokenResult.expires_in,
      scope: tokenResult.scope
    });

    // TODO: Ici vous pourriez sauvegarder les tokens en DB via N8N
    // const n8nWebhookUrl = process.env.N8N_ZOOM_OAUTH_WEBHOOK;
    // if (n8nWebhookUrl) {
    //   const n8nResponse = await fetch(n8nWebhookUrl, {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({
    //       access_token: tokenResult.access_token,
    //       refresh_token: tokenResult.refresh_token,
    //       expires_in: tokenResult.expires_in,
    //       user_id: 'current-user-id' // À récupérer du contexte
    //     })
    //   });
    //   console.log('📡 N8N Response:', n8nResponse.status);
    // }

    console.log('✅ Échange de code réussi');

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ 
        ok: true,
        message: 'Tokens exchanged successfully'
      })
    };

  } catch (error: any) {
    console.error('❌ Erreur dans exchange-zoom-code:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'internal error',
        message: error?.message || 'Unknown error'
      })
    };
  }
};
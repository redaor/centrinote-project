// 🏓 Edge Function pour tester la connectivité N8N
// =================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

Deno.serve(async (req) => {
  console.log('🏓 Ping N8N - Requête reçue');
  console.log('📋 Method:', req.method);
  console.log('📋 URL:', req.url);

  // Gérer CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST' && req.method !== 'GET') {
      console.error('❌ Méthode non autorisée:', req.method);
      return new Response(
        JSON.stringify({ error: 'Seules les méthodes GET et POST sont autorisées' }),
        { 
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Récupérer les variables d'environnement
    const n8nWebhookUrl = Deno.env.get('N8N_ZOOM_OAUTH_WEBHOOK');
    const pingSecret = Deno.env.get('N8N_PING_SECRET');
    
    console.log('🔍 Configuration:', {
      hasWebhookUrl: !!n8nWebhookUrl,
      hasPingSecret: !!pingSecret,
      webhookPreview: n8nWebhookUrl?.substring(0, 50) + '...'
    });

    if (!n8nWebhookUrl || !pingSecret) {
      console.error('❌ Variables d\'environnement manquantes');
      return new Response(
        JSON.stringify({ 
          error: 'Configuration manquante: N8N_ZOOM_OAUTH_WEBHOOK ou N8N_PING_SECRET non défini',
          hasWebhookUrl: !!n8nWebhookUrl,
          hasPingSecret: !!pingSecret
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Construire l'URL de ping avec paramètre
    const pingUrl = `${n8nWebhookUrl}?ping=1`;
    console.log('🚀 Test ping vers:', pingUrl.substring(0, 60) + '...');

    // Envoyer la requête de ping avec header secret
    const n8nResponse = await fetch(pingUrl, {
      method: 'GET',
      headers: {
        'x-n8n-ping-secret': pingSecret,
        'User-Agent': 'Supabase-Ping-Function/1.0'
      }
    });

    console.log('📡 Réponse N8N - Status:', n8nResponse.status, n8nResponse.statusText);

    // Lire le body de la réponse
    let responseBody = '';
    try {
      responseBody = await n8nResponse.text();
      console.log('📄 Body N8N:', responseBody);
    } catch (e) {
      console.warn('⚠️ Impossible de lire le body N8N:', e);
      responseBody = 'Impossible de lire la réponse';
    }

    // Analyser la réponse
    if (!n8nResponse.ok) {
      console.error('❌ N8N a retourné une erreur:', n8nResponse.status);
      
      return new Response(
        JSON.stringify({ 
          ok: false, 
          status: n8nResponse.status,
          statusText: n8nResponse.statusText,
          body: responseBody,
          error: `Webhook N8N indisponible (HTTP ${n8nResponse.status})`
        }),
        { 
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Succès
    console.log('✅ Ping N8N réussi');
    
    return new Response(
      JSON.stringify({ 
        ok: true, 
        status: n8nResponse.status,
        statusText: n8nResponse.statusText,
        body: responseBody,
        message: 'Connexion N8N opérationnelle',
        tested_at: new Date().toISOString()
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Erreur inattendue dans ping N8N:', error);
    
    return new Response(
      JSON.stringify({ 
        ok: false, 
        error: 'Erreur interne lors du test de connectivité',
        details: error instanceof Error ? error.message : String(error)
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
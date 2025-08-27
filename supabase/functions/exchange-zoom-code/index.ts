// 🔄 Edge Function pour échanger le code Zoom via N8N
// ================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface ZoomCallbackRequest {
  code: string;
  state: string;
  user_id: string;
}

serve(async (req) => {
  console.log('🚀 Edge Function exchange-zoom-code démarrée');
  console.log('🔗 URL:', req.url);
  console.log('📋 Method:', req.method);
  console.log('📋 Headers:', Object.fromEntries(req.headers.entries()));

  // Gérer CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('✅ Réponse OPTIONS CORS');
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    console.error('❌ Méthode non supportée:', req.method);
    return new Response(
      JSON.stringify({ error: 'Seules les requêtes POST sont acceptées' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  try {
    // 1. Lire et valider le body
    const body = await req.text();
    console.log('📄 Body brut reçu:', body);

    let requestData: ZoomCallbackRequest;
    try {
      requestData = JSON.parse(body);
    } catch (parseError) {
      console.error('❌ Erreur parsing JSON:', parseError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Body JSON invalide' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('📝 Données reçues:', {
      hasCode: !!requestData.code,
      hasState: !!requestData.state,
      hasUserId: !!requestData.user_id,
      codePreview: requestData.code?.substring(0, 10) + '...',
      statePreview: requestData.state?.substring(0, 16) + '...',
      userId: requestData.user_id
    });

    // 2. Validation des paramètres requis
    if (!requestData.code) {
      console.error('❌ Code OAuth manquant');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Code d\'autorisation manquant' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!requestData.state) {
      console.error('❌ State OAuth manquant');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Paramètre state manquant' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!requestData.user_id) {
      console.error('❌ User ID manquant');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'ID utilisateur manquant' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('✅ Validation des paramètres réussie');

    // 3. Récupérer l'URL webhook N8N
    const n8nWebhookUrl = Deno.env.get('N8N_ZOOM_OAUTH_WEBHOOK');
    
    if (!n8nWebhookUrl) {
      console.error('❌ Variable N8N_ZOOM_OAUTH_WEBHOOK manquante dans les secrets Supabase');
      console.log('💡 Utilisez: supabase secrets set N8N_ZOOM_OAUTH_WEBHOOK=https://n8n.srv886297.hstgr.cloud/webhook/...');
      
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Configuration N8N manquante' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('🔗 URL N8N webhook:', n8nWebhookUrl.substring(0, 60) + '...');

    // 4. Préparer le payload pour N8N (format minimal requis)
    const n8nPayload = {
      code: requestData.code,
      state: requestData.state,
      user_id: requestData.user_id
    };

    console.log('📦 Payload pour N8N:', {
      code: n8nPayload.code.substring(0, 10) + '...',
      state: n8nPayload.state.substring(0, 16) + '...',
      user_id: n8nPayload.user_id
    });

    // 5. Appeler le webhook N8N
    console.log('🚀 Envoi vers N8N...');
    
    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Supabase-Edge-Function/1.0',
        'X-Source': 'centrinote-oauth-callback'
      },
      body: JSON.stringify(n8nPayload)
    });

    console.log('📡 Réponse N8N - Status:', n8nResponse.status, n8nResponse.statusText);

    // 6. Traiter la réponse N8N
    if (!n8nResponse.ok) {
      console.error('❌ Erreur N8N - Status:', n8nResponse.status);
      
      let errorText = 'Erreur inconnue';
      try {
        errorText = await n8nResponse.text();
        console.error('❌ Détails erreur N8N:', errorText);
      } catch (e) {
        console.error('❌ Impossible de lire l\'erreur N8N:', e);
      }

      return new Response(
        JSON.stringify({ 
          success: false,
          error: `Erreur N8N (${n8nResponse.status}): ${errorText}`,
          n8n_status: n8nResponse.status
        }),
        { 
          status: 502, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 7. Lire la réponse de N8N
    let n8nData;
    try {
      const n8nText = await n8nResponse.text();
      console.log('📄 Réponse N8N brute:', n8nText);
      
      n8nData = JSON.parse(n8nText);
      console.log('📋 Réponse N8N parsée:', n8nData);
      
    } catch (parseError) {
      console.error('❌ Erreur parsing réponse N8N:', parseError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Réponse N8N invalide (JSON malformé)'
        }),
        { 
          status: 502, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 8. Retourner le résultat au frontend
    if (n8nData.success) {
      console.log('✅ Succès N8N - Tokens stockés');
      
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Tokens Zoom sauvegardés avec succès',
          user_id: requestData.user_id,
          processed_at: new Date().toISOString()
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } else {
      console.error('❌ Échec N8N:', n8nData);
      
      return new Response(
        JSON.stringify({
          success: false,
          error: n8nData.error || n8nData.message || 'Erreur inconnue N8N',
          details: n8nData
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error) {
    console.error('❌ Erreur inattendue dans Edge Function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
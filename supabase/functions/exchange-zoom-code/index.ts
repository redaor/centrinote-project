// 🔄 Edge Function pour échanger le code Zoom - ÉCHANGE DIRECT AVEC ZOOM API
// ================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface ZoomCallbackRequest {
  code: string;
  state?: string;
  redirect_uri?: string;
}

interface ZoomTokenResponse {
  access_token: string;
  token_type: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
}

serve(async (req) => {
  console.log('🚀 Edge Function exchange-zoom-code avec échange direct Zoom');
  console.log('📋 Method:', req.method);

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
    // 1. Initialiser Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

    // 2. Vérifier l'authentification JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ JWT manquant dans Authorization header');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Authentification requise - JWT manquant' 
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const jwt = authHeader.replace('Bearer ', '');
    console.log('🔑 JWT reçu:', jwt.substring(0, 20) + '...');
    console.log('🔑 JWT longueur:', jwt.length);
    console.log('🔑 JWT structure:', jwt.split('.').map((part, i) => `Part${i}: ${part.length} chars`));

    // 3. Extraire l'user_id du JWT
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(jwt);
    
    if (userError || !user) {
      console.error('❌ JWT invalide:', userError);
      console.error('❌ JWT détails pour debug:', {
        hasUser: !!user,
        errorMessage: userError?.message,
        errorCode: userError?.status,
        jwtPreview: jwt.substring(0, 50) + '...'
      });
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'JWT invalide ou utilisateur non authentifié' 
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const userId = user.id;
    console.log('✅ User authentifié:', userId);

    // 4. Lire le payload
    const body = await req.text();
    let requestData: ZoomCallbackRequest;
    
    try {
      requestData = JSON.parse(body);
    } catch (parseError) {
      console.error('❌ Body JSON invalide:', parseError);
      return new Response(
        JSON.stringify({ success: false, error: 'Body JSON invalide' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📝 Données reçues:', {
      hasCode: !!requestData.code,
      hasState: !!requestData.state,
      hasRedirectUri: !!requestData.redirect_uri,
      userId: userId
    });

    // 5. Validation du code OAuth
    if (!requestData.code) {
      console.error('❌ Code OAuth manquant');
      return new Response(
        JSON.stringify({ success: false, error: 'Code OAuth manquant' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Récupérer les credentials Zoom depuis les secrets
    const zoomClientId = Deno.env.get('ZOOM_CLIENT_ID');
    const zoomClientSecret = Deno.env.get('ZOOM_CLIENT_SECRET');
    
    if (!zoomClientId || !zoomClientSecret) {
      console.error('❌ Credentials Zoom manquants dans les secrets');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Configuration Zoom manquante - credentials non configurés' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Credentials Zoom récupérés:', {
      clientId: zoomClientId.substring(0, 8) + '...',
      hasSecret: !!zoomClientSecret
    });

    // 7. ÉCHANGE DIRECT AVEC ZOOM API - Format requis par la doc Zoom
    console.log('🔄 DÉBUT échange code avec Zoom API...');
    
    // Encoder les credentials en Base64 pour Authorization header
    const authString = `${zoomClientId}:${zoomClientSecret}`;
    const base64Auth = btoa(authString);
    
    // Préparer les données form-urlencoded (requis par Zoom)
    const zoomTokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      code: requestData.code,
      redirect_uri: requestData.redirect_uri || 'https://centrinote.fr/zoom/callback'
    });

    console.log('📋 Paramètres pour Zoom:', {
      grant_type: 'authorization_code',
      code: requestData.code.substring(0, 10) + '...',
      redirect_uri: requestData.redirect_uri || 'https://centrinote.fr/zoom/callback',
      authHeader: 'Basic ' + base64Auth.substring(0, 20) + '...'
    });

    // 8. Appel conforme à la doc Zoom OAuth et récupération tokens
    let zoomTokens: ZoomTokenResponse;
    
    try {
      // Appel conforme à la doc Zoom OAuth
      const zoomResponse = await fetch('https://zoom.us/oauth/token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${base64Auth}`, // ✅ Basic auth requis
          'Content-Type': 'application/x-www-form-urlencoded', // ✅ Form-urlencoded requis
          'User-Agent': 'Centrinote-OAuth/1.0'
        },
        body: zoomTokenParams.toString() // ✅ Format form-urlencoded
      });

      console.log('📡 Réponse Zoom API - Status:', zoomResponse.status);
      console.log('📡 Headers Zoom API:', Object.fromEntries(zoomResponse.headers.entries()));
      
      // Lire la réponse brute pour diagnostic complet
      const zoomResponseText = await zoomResponse.text();
      console.log('📋 RÉPONSE BRUTE ZOOM API:', zoomResponseText);

      if (!zoomResponse.ok) {
        console.error('❌ Erreur Zoom API:', zoomResponse.status, zoomResponseText);
        
        return new Response(
          JSON.stringify({ 
            success: false,
            error: `Erreur Zoom API (${zoomResponse.status})`,
            details: zoomResponseText
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 9. Récupérer les tokens de la réponse Zoom
      try {
        zoomTokens = JSON.parse(zoomResponseText);
        console.log('✅ JSON Zoom parsé avec succès');
      } catch (parseError) {
        console.error('❌ Erreur parsing JSON Zoom:', parseError);
        console.error('📋 Contenu non-JSON reçu:', zoomResponseText);
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'Réponse Zoom invalide (non-JSON)',
            details: zoomResponseText
          }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log('✅ Tokens reçus de Zoom:', {
        hasAccessToken: !!zoomTokens.access_token,
        hasRefreshToken: !!zoomTokens.refresh_token,
        expiresIn: zoomTokens.expires_in,
        scope: zoomTokens.scope
      });

      // 10. Calculer la date d'expiration
      const expiresAt = new Date(Date.now() + (zoomTokens.expires_in * 1000));
      console.log('📅 Token expire le:', expiresAt.toISOString());

    } catch (zoomApiError) {
      console.error('❌ Erreur appel Zoom API:', zoomApiError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Erreur lors de l\'appel à l\'API Zoom',
          details: zoomApiError instanceof Error ? zoomApiError.message : 'Erreur inconnue'
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 10. Préparer le payload enrichi pour N8N
    const n8nPayload = {
      user_id: userId,
      access_token: zoomTokens.access_token,
      refresh_token: zoomTokens.refresh_token,
      expires_at: new Date(Date.now() + (zoomTokens.expires_in * 1000)).toISOString(),
      scope: zoomTokens.scope,
      token_type: zoomTokens.token_type,
      original_code: requestData.code,
      original_state: requestData.state
    };

    console.log('📦 Payload enrichi pour N8N:', {
      user_id: n8nPayload.user_id,
      hasAccessToken: !!n8nPayload.access_token,
      hasRefreshToken: !!n8nPayload.refresh_token,
      expires_at: n8nPayload.expires_at,
      scope: n8nPayload.scope
    });

    // 11. Récupérer l'URL webhook N8N
    const n8nWebhookUrl = Deno.env.get('N8N_ZOOM_OAUTH_WEBHOOK');
    
    if (!n8nWebhookUrl) {
      console.error('❌ Variable N8N_ZOOM_OAUTH_WEBHOOK manquante');
      return new Response(
        JSON.stringify({ success: false, error: 'Configuration N8N manquante' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 12. Transmettre les tokens à N8N pour stockage
    console.log('🚀 Envoi tokens vers N8N pour stockage...');
    
    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Supabase-Edge-Function/2.0',
        'X-Source': 'centrinote-zoom-tokens',
        'X-User-ID': userId
      },
      body: JSON.stringify(n8nPayload)
    });

    console.log('📡 Réponse N8N stockage - Status:', n8nResponse.status);

    // 13. Traiter la réponse N8N
    if (!n8nResponse.ok) {
      const n8nError = await n8nResponse.text();
      console.error('❌ Erreur stockage N8N:', n8nResponse.status, n8nError);
      
      return new Response(
        JSON.stringify({ 
          success: false,
          error: `Erreur stockage N8N (${n8nResponse.status})`,
          details: n8nError
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 14. Lire la réponse N8N
    let n8nData;
    try {
      const n8nText = await n8nResponse.text();
      console.log('📄 Réponse N8N stockage:', n8nText);
      n8nData = JSON.parse(n8nText);
    } catch (parseError) {
      console.error('❌ Erreur parsing N8N:', parseError);
      return new Response(
        JSON.stringify({ success: false, error: 'Réponse N8N invalide' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 15. Retourner le résultat final
    if (n8nData.success) {
      console.log('✅ SUCCÈS COMPLET - Tokens Zoom échangés et stockés');
      
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Connexion Zoom réussie - tokens sauvegardés',
          user_id: userId,
          expires_at: new Date(Date.now() + (zoomTokens.expires_in * 1000)).toISOString(),
          processed_at: new Date().toISOString()
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.error('❌ Échec stockage N8N:', n8nData);
      
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Erreur lors du stockage des tokens',
          details: n8nData
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
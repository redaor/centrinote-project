// 🔐 Edge Function - Génération URL OAuth Zoom sécurisée
// ================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface OAuthUrlRequest {
  redirect_uri?: string;
  scope?: string;
}

interface OAuthUrlResponse {
  success: boolean;
  url: string;
  state: string;
  timestamp: number;
  user_id: string;
}

serve(async (req) => {
  console.log('🔐 Edge Function generate-zoom-oauth-url - Génération URL sécurisée');
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
    // 1. Initialiser Supabase admin
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
    console.log('🔑 JWT reçu pour génération URL:', jwt.substring(0, 20) + '...');

    // 3. Extraire l'user_id du JWT
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(jwt);
    
    if (userError || !user) {
      console.error('❌ JWT invalide:', userError);
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
    console.log('✅ User authentifié pour génération URL:', userId);

    // 4. Lire le payload (optionnel)
    let requestData: OAuthUrlRequest = {};
    
    if (req.headers.get('content-length') !== '0') {
      const body = await req.text();
      try {
        requestData = JSON.parse(body);
      } catch (parseError) {
        console.warn('⚠️ Body JSON invalide, utilisation des valeurs par défaut:', parseError);
      }
    }

    // 5. Récupérer la configuration Zoom depuis les secrets
    const zoomClientId = Deno.env.get('ZOOM_CLIENT_ID');
    const appUrl = Deno.env.get('VITE_APP_URL') || 'https://centrinote.fr';
    
    if (!zoomClientId) {
      console.error('❌ ZOOM_CLIENT_ID manquant dans les secrets');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Configuration Zoom manquante - client_id non configuré' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Paramètres OAuth par défaut et personnalisés
    const redirectUri = requestData.redirect_uri || `${appUrl}/zoom/callback`;
    const scope = requestData.scope || 'meeting:write meeting:read user:read recording:read';
    
    // 7. Générer un state unique et sécurisé (UUID v4)
    const secureState = crypto.randomUUID();
    const timestamp = Date.now();
    
    console.log('🔐 Génération state sécurisé:', secureState.substring(0, 16) + '...');
    
    // 8. Construire l'URL OAuth selon la documentation Zoom
    const oauthParams = new URLSearchParams({
      response_type: 'code',
      client_id: zoomClientId,
      redirect_uri: redirectUri,
      state: secureState,
      scope: scope
    });
    
    const oauthUrl = `https://zoom.us/oauth/authorize?${oauthParams.toString()}`;
    
    console.log('📋 Paramètres OAuth générés:', {
      clientId: zoomClientId.substring(0, 8) + '...',
      redirectUri,
      state: secureState.substring(0, 16) + '...',
      scope,
      userId
    });
    
    // 9. Optionnel: Stocker le state en base pour validation ultérieure
    try {
      const { error: insertError } = await supabaseAdmin
        .from('oauth_states')
        .insert({
          user_id: userId,
          state: secureState,
          provider: 'zoom',
          redirect_uri: redirectUri,
          expires_at: new Date(timestamp + 10 * 60 * 1000).toISOString(), // 10 minutes
          created_at: new Date().toISOString()
        });
      
      if (insertError) {
        console.warn('⚠️ Impossible de stocker le state en DB (continuons quand même):', insertError);
      } else {
        console.log('💾 State OAuth stocké en base pour validation');
      }
    } catch (dbError) {
      console.warn('⚠️ Erreur stockage state (continuons):', dbError);
    }
    
    // 10. Retourner l'URL OAuth générée
    const response: OAuthUrlResponse = {
      success: true,
      url: oauthUrl,
      state: secureState,
      timestamp,
      user_id: userId
    };
    
    console.log('✅ URL OAuth générée avec succès');
    console.log('🔗 URL:', oauthUrl.substring(0, 100) + '...');
    
    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erreur inattendue dans génération URL OAuth:', error);
    
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
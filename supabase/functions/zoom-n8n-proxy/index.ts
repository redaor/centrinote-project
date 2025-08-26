import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface N8NProxyRequest {
  action: string;
  code?: string;
  user_id?: string;
  redirect_uri?: string;
  state?: string; // Ajouter le support du state
  timestamp?: string;
  callback_url?: string;
  [key: string]: any;
}

serve(async (req) => {
  // Gérer les requêtes OPTIONS pour CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Seules les requêtes POST sont acceptées' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }

  try {
    console.log('🔄 Proxy N8N - Requête reçue')
    
    // Récupérer l'URL du webhook N8N depuis les variables d'environnement
    const n8nWebhookUrl = Deno.env.get('N8N_ZOOM_OAUTH_WEBHOOK')
    
    if (!n8nWebhookUrl) {
      console.error('❌ Variable N8N_ZOOM_OAUTH_WEBHOOK manquante')
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Configuration N8N manquante - N8N_ZOOM_OAUTH_WEBHOOK non défini' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Lire le body de la requête
    const requestBody: N8NProxyRequest = await req.json()
    
    console.log('📝 Données reçues par le proxy:', {
      action: requestBody.action,
      user_id: requestBody.user_id,
      code: requestBody.code ? `${requestBody.code.substring(0, 10)}...` : 'N/A',
      redirect_uri: requestBody.redirect_uri,
      state: requestBody.state ? `${requestBody.state.substring(0, 16)}...` : 'N/A',
      timestamp: requestBody.timestamp,
      callback_url: requestBody.callback_url
    })

    // Validation renforcée des données OAuth
    if (!requestBody.action) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Le paramètre action est requis' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
    // Validation spécifique pour oauth_callback
    if (requestBody.action === 'oauth_callback') {
      if (!requestBody.code) {
        console.error('❌ Code OAuth manquant');
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'Code d\'autorisation OAuth manquant' 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
      
      if (!requestBody.state) {
        console.error('❌ State OAuth manquant');
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'Paramètre state OAuth manquant - requis pour la sécurité' 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
      
      if (!requestBody.user_id) {
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
        )
      }
      
      console.log('✅ Validation OAuth réussie - tous les paramètres présents');
    }

    // Relayer la requête vers N8N
    console.log('🚀 Relais vers N8N:', n8nWebhookUrl.substring(0, 50) + '...')
    
    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Ajouter des headers personnalisés si nécessaire
        'User-Agent': 'Supabase-Edge-Function-Proxy/1.0',
        'X-Forwarded-For': req.headers.get('x-forwarded-for') || 'unknown',
      },
      body: JSON.stringify(requestBody)
    })

    // Vérifier la réponse de N8N
    if (!n8nResponse.ok) {
      console.error('❌ Erreur N8N - Status:', n8nResponse.status)
      
      let errorMessage = 'Erreur du serveur N8N'
      let errorDetails = null
      
      try {
        const errorText = await n8nResponse.text()
        errorDetails = errorText
        console.error('❌ Détails erreur N8N:', errorText)
      } catch (e) {
        console.error('❌ Impossible de lire la réponse d\'erreur N8N:', e)
      }

      return new Response(
        JSON.stringify({ 
          success: false,
          error: errorMessage,
          details: errorDetails,
          status: n8nResponse.status
        }),
        { 
          status: n8nResponse.status >= 500 ? 502 : n8nResponse.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Lire et relayer la réponse de N8N
    const n8nData = await n8nResponse.json()
    
    console.log('✅ Réponse reçue de N8N:', {
      success: n8nData.success,
      hasError: !!n8nData.error,
      hasTokenInfo: !!n8nData.token_info,
      state: n8nData.state ? `${n8nData.state.substring(0, 16)}...` : 'N/A',
      userId: n8nData.user_id
    })
    
    // S'assurer que le state est préservé dans la réponse
    const responseData = {
      ...n8nData,
      state: requestBody.state, // Préserver le state original
      processed_at: new Date().toISOString()
    };

    // Relayer la réponse avec le state préservé
    return new Response(
      JSON.stringify(responseData),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Erreur dans le proxy N8N:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Erreur interne du proxy',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
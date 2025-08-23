import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

interface ZoomTokenResponse {
  access_token: string;
  token_type: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
}

serve(async (req) => {
  // Gérer les requêtes OPTIONS pour CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Récupérer les variables d'environnement Zoom
    const zoomClientId = Deno.env.get('ZOOM_CLIENT_ID')
    const zoomClientSecret = Deno.env.get('ZOOM_CLIENT_SECRET')
    const zoomRedirectUri = Deno.env.get('ZOOM_REDIRECT_URI')
    
    console.log('🔧 Configuration Zoom OAuth:', {
      client_id: zoomClientId ? `${zoomClientId.substring(0, 8)}...` : 'MANQUANT',
      client_secret: zoomClientSecret ? 'CONFIGURÉ' : 'MANQUANT',
      redirect_uri: zoomRedirectUri || 'MANQUANT'
    });
    
    if (!zoomClientId || !zoomClientSecret || !zoomRedirectUri) {
      console.error('❌ Variables d\'environnement Zoom manquantes:', {
        ZOOM_CLIENT_ID: !!zoomClientId,
        ZOOM_CLIENT_SECRET: !!zoomClientSecret,
        ZOOM_REDIRECT_URI: !!zoomRedirectUri
      });
      
      return new Response(
        JSON.stringify({ error: 'Configuration Zoom OAuth manquante' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Créer le client Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (req.method === 'GET') {
      // Gérer le callback OAuth de Zoom
      const url = new URL(req.url)
      const code = url.searchParams.get('code')
      const state = url.searchParams.get('state') // Contient l'user_id
      const error = url.searchParams.get('error')

      if (error) {
        console.error('Erreur OAuth Zoom:', error)
        return new Response(
          `<html><body><script>window.close();</script><p>Erreur d'autorisation Zoom: ${error}</p></body></html>`,
          { headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
        )
      }

      if (!code || !state) {
        return new Response(
          '<html><body><script>window.close();</script><p>Paramètres manquants</p></body></html>',
          { headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
        )
      }

      console.log('🔄 Échange du code OAuth pour les tokens...')

      // Échanger le code contre les tokens
      const tokenResponse = await fetch('https://zoom.us/oauth/token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${zoomClientId}:${zoomClientSecret}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: zoomRedirectUri,
        }),
      })

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text()
        console.error('Erreur lors de l\'échange de tokens:', errorText)
        return new Response(
          '<html><body><script>window.close();</script><p>Erreur lors de l\'obtention des tokens</p></body></html>',
          { headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
        )
      }

      const tokens: ZoomTokenResponse = await tokenResponse.json()
      console.log('✅ Tokens reçus de Zoom')

      // Calculer la date d'expiration
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)

      // Stocker les tokens dans Supabase
      const { error: insertError } = await supabase
        .from('zoom_tokens')
        .upsert({
          user_id: state, // L'user_id était dans le paramètre state
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: expiresAt.toISOString(),
          scope: tokens.scope,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })

      if (insertError) {
        console.error('Erreur lors du stockage des tokens:', insertError)
        return new Response(
          '<html><body><script>window.close();</script><p>Erreur lors du stockage des tokens</p></body></html>',
          { headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
        )
      }

      console.log('✅ Tokens stockés avec succès')

      // Retourner une page de succès qui ferme la popup
      return new Response(
        `<html>
          <body>
            <script>
              // Notifier la fenêtre parent du succès
              if (window.opener) {
                window.opener.postMessage({ type: 'zoom_auth_success' }, '*');
              }
              window.close();
            </script>
            <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
              <h2>✅ Connexion Zoom réussie !</h2>
              <p>Vous pouvez fermer cette fenêtre.</p>
              <script>setTimeout(() => window.close(), 2000);</script>
            </div>
          </body>
        </html>`,
        { headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
      )
    }

    if (req.method === 'POST') {
      // API pour rafraîchir les tokens
      const { userId } = await req.json()

      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'userId requis' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Récupérer le token actuel
      const { data: tokenData, error: fetchError } = await supabase
        .from('zoom_tokens')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (fetchError || !tokenData) {
        return new Response(
          JSON.stringify({ error: 'Token non trouvé' }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Vérifier si le token a expiré
      const now = new Date()
      const expiresAt = new Date(tokenData.expires_at)

      if (now < expiresAt) {
        // Token encore valide
        return new Response(
          JSON.stringify({ 
            access_token: tokenData.access_token,
            expires_at: tokenData.expires_at 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Rafraîchir le token
      console.log('🔄 Rafraîchissement du token Zoom...')

      const refreshResponse = await fetch('https://zoom.us/oauth/token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${zoomClientId}:${zoomClientSecret}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: tokenData.refresh_token,
        }),
      })

      if (!refreshResponse.ok) {
        const errorText = await refreshResponse.text()
        console.error('Erreur lors du rafraîchissement:', errorText)
        return new Response(
          JSON.stringify({ error: 'Erreur lors du rafraîchissement du token' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      const newTokens: ZoomTokenResponse = await refreshResponse.json()
      const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000)

      // Mettre à jour les tokens
      const { error: updateError } = await supabase
        .from('zoom_tokens')
        .update({
          access_token: newTokens.access_token,
          refresh_token: newTokens.refresh_token,
          expires_at: newExpiresAt.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)

      if (updateError) {
        console.error('Erreur lors de la mise à jour des tokens:', updateError)
        return new Response(
          JSON.stringify({ error: 'Erreur lors de la mise à jour des tokens' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      console.log('✅ Token rafraîchi avec succès')

      return new Response(
        JSON.stringify({ 
          access_token: newTokens.access_token,
          expires_at: newExpiresAt.toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Méthode non supportée' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Erreur dans zoom-oauth-callback:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
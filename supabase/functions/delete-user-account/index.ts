import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface DeleteAccountRequest {
  confirmation: string;
}

serve(async (req) => {
  // Gérer les requêtes OPTIONS pour CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Vérifier que c'est une requête POST
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Méthode non autorisée' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Récupérer le token d'autorisation
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Token d\'autorisation manquant' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Créer le client Supabase avec les privilèges service_role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Créer le client Supabase normal pour vérifier l'utilisateur
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        global: {
          headers: {
            Authorization: authHeader
          }
        }
      }
    )

    // Vérifier l'utilisateur authentifié
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('Erreur d\'authentification:', userError)
      return new Response(
        JSON.stringify({ error: 'Utilisateur non authentifié' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parser le body de la requête
    const { confirmation }: DeleteAccountRequest = await req.json()

    // Vérifier la confirmation
    if (confirmation !== 'SUPPRIMER') {
      return new Response(
        JSON.stringify({ error: 'Confirmation invalide' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const userId = user.id
    console.log(`🗑️ Début de la suppression du compte utilisateur: ${userId}`)

    // Étape 1: Supprimer toutes les données utilisateur dans les tables personnalisées
    console.log('📄 Suppression des documents...')
    const { error: documentsError } = await supabaseAdmin
      .from('documents')
      .delete()
      .eq('user_id', userId)

    if (documentsError) {
      console.warn('Erreur suppression documents:', documentsError)
    }

    console.log('📚 Suppression du vocabulaire...')
    const { error: vocabularyError } = await supabaseAdmin
      .from('vocabulary')
      .delete()
      .eq('user_id', userId)

    if (vocabularyError) {
      console.warn('Erreur suppression vocabulaire:', vocabularyError)
    }

    console.log('📅 Suppression des sessions d\'étude...')
    const { error: sessionsError } = await supabaseAdmin
      .from('study_sessions')
      .delete()
      .eq('user_id', userId)

    if (sessionsError) {
      console.warn('Erreur suppression sessions:', sessionsError)
    }

    console.log('⚙️ Suppression des paramètres utilisateur...')
    const { error: settingsError } = await supabaseAdmin
      .from('user_settings')
      .delete()
      .eq('user_id', userId)

    if (settingsError) {
      console.warn('Erreur suppression paramètres:', settingsError)
    }

    console.log('🤝 Suppression des collaborations...')
    const { error: collaborationsError } = await supabaseAdmin
      .from('collaborations')
      .delete()
      .eq('user_id', userId)

    if (collaborationsError) {
      console.warn('Erreur suppression collaborations:', collaborationsError)
    }

    // Étape 2: Supprimer le compte utilisateur de la table auth.users
    console.log('👤 Suppression du compte utilisateur...')
    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (deleteUserError) {
      console.error('Erreur suppression utilisateur:', deleteUserError)
      return new Response(
        JSON.stringify({ 
          error: 'Erreur lors de la suppression du compte utilisateur',
          details: deleteUserError.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('✅ Compte utilisateur supprimé avec succès')

    // Retourner une réponse de succès
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Compte supprimé avec succès',
        userId: userId,
        deletedAt: new Date().toISOString()
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Erreur lors de la suppression:', error)
    
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
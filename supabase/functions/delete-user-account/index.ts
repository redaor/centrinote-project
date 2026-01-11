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
    // ORDRE IMPORTANT: Supprimer les tables enfants AVANT les tables parentes
    // NOTE: On ignore toutes les erreurs pour les tables qui n'existent pas ou sont vides

    // Liste des tables à supprimer
    const tablesToDelete = [
      'user_quotas',
      'user_subscriptions',
      'notes',
      'documents',
      'vocabulary',
      'study_sessions',
      'meetings',
      'ai_conversations',
      'user_automations',
      'user_settings',
      'collaborations',
      'tasks'
    ]

    // Supprimer toutes les tables en ignorant les erreurs
    for (const table of tablesToDelete) {
      try {
        console.log(`🗑️ Suppression de ${table}...`)
        const { error } = await supabaseAdmin
          .from(table)
          .delete()
          .eq('user_id', userId)

        if (error) {
          console.warn(`⚠️ Erreur ${table}:`, error.message)
        }
      } catch (e) {
        console.warn(`⚠️ Exception ${table}:`, e instanceof Error ? e.message : String(e))
      }
    }

    // Étape 2: Supprimer le compte utilisateur de la table auth.users
    console.log('👤 Suppression du compte utilisateur de auth.users...')
    try {
      const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(userId)

      if (deleteUserError) {
        console.error('❌ Erreur auth.admin.deleteUser:', deleteUserError)
        return new Response(
          JSON.stringify({
            error: 'Erreur lors de la suppression du compte utilisateur',
            details: deleteUserError.message,
            code: deleteUserError.status || 500
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      console.log('✅ Compte utilisateur supprimé avec succès de auth.users')
    } catch (authError) {
      console.error('❌ Exception lors de auth.admin.deleteUser:', authError)
      return new Response(
        JSON.stringify({
          error: 'Exception lors de la suppression du compte',
          details: authError instanceof Error ? authError.message : String(authError)
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

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
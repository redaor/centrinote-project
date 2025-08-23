import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface SubscriptionRequest {
  userId: string;
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

    // Récupérer les variables d'environnement
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!stripeSecretKey || !supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Configuration manquante' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Créer le client Supabase
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parser le body de la requête
    const { userId }: SubscriptionRequest = await req.json()

    // Validation des paramètres
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Paramètre manquant: userId requis' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`🔍 Récupération de l'abonnement pour l'utilisateur: ${userId}`)

    // Récupérer le profil utilisateur pour obtenir le customer_id Stripe
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id, stripe_subscription_id, subscription')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      console.error('❌ Erreur récupération profil:', profileError)
      return new Response(
        JSON.stringify({ error: 'Profil utilisateur non trouvé' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Si l'utilisateur n'a pas d'abonnement Stripe
    if (!profile.stripe_subscription_id) {
      console.log('ℹ️ Utilisateur sans abonnement Stripe')
      return new Response(
        JSON.stringify({ 
          subscription: null,
          plan: profile.subscription || 'free'
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Récupérer les informations d'abonnement depuis Stripe
    const stripeResponse = await fetch(
      `https://api.stripe.com/v1/subscriptions/${profile.stripe_subscription_id}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${stripeSecretKey}`,
          'Content-Type': 'application/json',
        }
      }
    )

    if (!stripeResponse.ok) {
      const errorData = await stripeResponse.text()
      console.error('❌ Erreur Stripe:', errorData)
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la récupération de l\'abonnement Stripe' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const subscription = await stripeResponse.json()
    console.log('✅ Abonnement récupéré:', subscription.id)

    // Retourner les informations d'abonnement
    return new Response(
      JSON.stringify({ 
        subscription,
        plan: profile.subscription
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Erreur lors de la récupération de l\'abonnement:', error)
    
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
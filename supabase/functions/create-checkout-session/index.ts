import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface CheckoutRequest {
  priceId: string;
  customerEmail: string;
  successUrl?: string;
  cancelUrl?: string;
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

    // Récupérer la clé secrète Stripe
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeSecretKey) {
      return new Response(
        JSON.stringify({ error: 'Configuration Stripe manquante' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parser le body de la requête
    const { priceId, customerEmail, successUrl, cancelUrl }: CheckoutRequest = await req.json()

    // Validation des paramètres
    if (!priceId || !customerEmail) {
      return new Response(
        JSON.stringify({ error: 'Paramètres manquants: priceId et customerEmail requis' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`🛒 Création session checkout pour: ${customerEmail}, prix: ${priceId}`)

    // Créer la session de checkout Stripe
    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'payment_method_types[]': 'card',
        'line_items[0][price]': priceId,
        'line_items[0][quantity]': '1',
        'mode': 'subscription',
        'customer_email': customerEmail,
        'success_url': successUrl || `${req.headers.get('origin')}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
        'cancel_url': cancelUrl || `${req.headers.get('origin')}/subscription/cancel`,
        'allow_promotion_codes': 'true',
        'billing_address_collection': 'required',
        'customer_creation': 'always',
        'metadata[source]': 'centrinote_app',
        'subscription_data[metadata][source]': 'centrinote_app'
      })
    })

    if (!stripeResponse.ok) {
      const errorData = await stripeResponse.text()
      console.error('❌ Erreur Stripe:', errorData)
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la création de la session Stripe' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const session = await stripeResponse.json()
    console.log('✅ Session créée:', session.id)

    // Retourner l'URL de checkout
    return new Response(
      JSON.stringify({ 
        url: session.url,
        sessionId: session.id
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Erreur lors de la création de la session:', error)
    
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
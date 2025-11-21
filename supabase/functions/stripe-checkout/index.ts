import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    })
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: corsHeaders
    })
  }

  try {
    // Lazy load dependencies only when needed
    const { default: Stripe } = await import('https://esm.sh/stripe@14.0.0?target=deno')
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')

    const STRIPE_SECRET = Deno.env.get('STRIPE_SECRET_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!STRIPE_SECRET) {
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const stripe = new Stripe(STRIPE_SECRET, { apiVersion: '2024-06-20' })
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // 🔐 AUTHENTICATION: Verify user from JWT token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: getUserError } = await supabase.auth.getUser(token)

    if (getUserError || !user) {
      return new Response(JSON.stringify({ error: 'Failed to authenticate user' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const payload = await req.json()
    const priceId = payload.price_id || payload.priceId
    const customerEmail = payload.customer_email || payload.customerEmail || user.email
    const successUrl = payload.success_url
    const cancelUrl = payload.cancel_url
    const mode = payload.mode === 'payment' ? 'payment' : 'subscription'

    if (!priceId || !successUrl || !cancelUrl) {
      return new Response(JSON.stringify({
        error: 'Missing required parameters',
        required: ['price_id', 'success_url', 'cancel_url']
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode,
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: customerEmail,
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      metadata: {
        user_id: user.id
      }
    })

    return new Response(JSON.stringify({ id: session.id, url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (e) {
    console.error('Stripe checkout error:', e)
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

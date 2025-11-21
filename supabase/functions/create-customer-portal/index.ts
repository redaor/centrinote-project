import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface PortalRequest {
  customerId?: string;
  returnUrl?: string;
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

    // Parser le body de la requête avec gestion d'erreur
    let requestBody: PortalRequest = {};
    try {
      requestBody = await req.json();
      console.log('[create-customer-portal] Request body:', JSON.stringify(requestBody));
    } catch (jsonError) {
      console.error('[create-customer-portal] JSON parse error:', jsonError);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { customerId: providedCustomerId, returnUrl } = requestBody;

    // Chercher le customer Stripe par email de l'utilisateur
    let customerId = providedCustomerId;

    if (!customerId) {
      // D'abord chercher dans profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('stripe_customer_id')
        .eq('id', user.id)
        .maybeSingle();

      if (profile?.stripe_customer_id) {
        customerId = profile.stripe_customer_id;
        console.log(`✅ Customer trouvé dans profiles: ${customerId}`);
      }
    }

    // Si toujours pas de customer_id, chercher par email dans Stripe
    if (!customerId && user.email) {
      console.log(`🔍 Recherche customer Stripe par email: ${user.email}`);

      // Lazy load Stripe
      const { default: Stripe } = await import('https://esm.sh/stripe@14.0.0?target=deno')
      const stripe = new Stripe(STRIPE_SECRET, { apiVersion: '2024-06-20' })

      const customers = await stripe.customers.list({
        email: user.email,
        limit: 1
      });

      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        console.log(`✅ Customer trouvé: ${customerId}`);
      } else {
        return new Response(
          JSON.stringify({ error: 'Aucun compte de facturation trouvé. Veuillez d\'abord souscrire à un plan.' }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
    }

    if (!customerId) {
      return new Response(
        JSON.stringify({ error: 'Impossible de trouver le compte de facturation' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`🏪 Création portail client pour: ${customerId}`)

    // Créer la session du portail client Stripe
    let stripeResponse;
    try {
      stripeResponse = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${STRIPE_SECRET}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          'customer': customerId,
          'return_url': returnUrl || req.headers.get('origin') || 'https://app.centrinote.com'
        })
      });
    } catch (fetchError) {
      console.error('[create-customer-portal] Stripe API fetch error:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to connect to Stripe API' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!stripeResponse.ok) {
      const errorData = await stripeResponse.text()
      console.error('[create-customer-portal] Stripe API error:', {
        status: stripeResponse.status,
        statusText: stripeResponse.statusText,
        error: errorData
      });
      return new Response(
        JSON.stringify({ error: `Stripe error: ${errorData || stripeResponse.statusText}` }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const session = await stripeResponse.json()
    console.log('[create-customer-portal] Portal created:', session.id)

    // Retourner l'URL du portail
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
    console.error('[create-customer-portal] Unexpected error:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      type: typeof error
    });

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
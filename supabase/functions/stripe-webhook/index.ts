import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
const stripe = new Stripe(stripeSecret, {
  appInfo: {
    name: 'Bolt Integration',
    version: '1.0.0',
  },
});

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

Deno.serve(async (req) => {
  try {
    // Handle OPTIONS request for CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204 });
    }

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // get the signature from the header
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return new Response('No signature found', { status: 400 });
    }

    // get the raw body
    const body = await req.text();

    // verify the webhook signature
    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, stripeWebhookSecret);
    } catch (error: any) {
      console.error(`Webhook signature verification failed: ${error.message}`);
      return new Response(`Webhook signature verification failed: ${error.message}`, { status: 400 });
    }

    EdgeRuntime.waitUntil(handleEvent(event));

    return Response.json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function handleEvent(event: Stripe.Event) {
  const stripeData = event?.data?.object ?? {};

  if (!stripeData) {
    return;
  }

  if (!('customer' in stripeData)) {
    return;
  }

  // for one time payments, we only listen for the checkout.session.completed event
  if (event.type === 'payment_intent.succeeded' && event.data.object.invoice === null) {
    return;
  }

  const { customer: customerId } = stripeData;

  if (!customerId || typeof customerId !== 'string') {
    console.error(`No customer received on event: ${JSON.stringify(event)}`);
  } else {
    let isSubscription = true;

    if (event.type === 'checkout.session.completed') {
      const { mode } = stripeData as Stripe.Checkout.Session;

      isSubscription = mode === 'subscription';

      console.info(`Processing ${isSubscription ? 'subscription' : 'one-time payment'} checkout session`);
    }

    const { mode, payment_status } = stripeData as Stripe.Checkout.Session;

    if (isSubscription) {
      console.info(`Starting subscription sync for customer: ${customerId}`);
      await syncCustomerFromStripe(customerId);
    } else if (mode === 'payment' && payment_status === 'paid') {
      try {
        // Extract the necessary information from the session
        const {
          id: checkout_session_id,
          payment_intent,
          amount_subtotal,
          amount_total,
          currency,
        } = stripeData as Stripe.Checkout.Session;

        // Insert the order into the stripe_orders table
        const { error: orderError } = await supabase.from('stripe_orders').insert({
          checkout_session_id,
          payment_intent_id: payment_intent,
          customer_id: customerId,
          amount_subtotal,
          amount_total,
          currency,
          payment_status,
          status: 'completed', // assuming we want to mark it as completed since payment is successful
        });

        if (orderError) {
          console.error('Error inserting order:', orderError);
          return;
        }
        console.info(`Successfully processed one-time payment for session: ${checkout_session_id}`);
      } catch (error) {
        console.error('Error processing one-time payment:', error);
      }
    }
  }
}

// based on the excellent https://github.com/t3dotgg/stripe-recommendations
async function syncCustomerFromStripe(customerId: string) {
  try {
    // fetch latest subscription data from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1,
      status: 'all',
      expand: ['data.default_payment_method'],
    });

    // TODO verify if needed
    if (subscriptions.data.length === 0) {
      console.info(`No active subscriptions found for customer: ${customerId}`);
      const { error: noSubError } = await supabase.from('stripe_subscriptions').upsert(
        {
          customer_id: customerId,
          subscription_status: 'not_started',
        },
        {
          onConflict: 'customer_id',
        },
      );

      if (noSubError) {
        console.error('Error updating subscription status:', noSubError);
        throw new Error('Failed to update subscription status in database');
      }
    }

    // assumes that a customer can only have a single subscription
    const subscription = subscriptions.data[0];

    // store subscription state
    const { error: subError } = await supabase.from('stripe_subscriptions').upsert(
      {
        customer_id: customerId,
        subscription_id: subscription.id,
        price_id: subscription.items.data[0].price.id,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        cancel_at_period_end: subscription.cancel_at_period_end,
        ...(subscription.default_payment_method && typeof subscription.default_payment_method !== 'string'
          ? {
              payment_method_brand: subscription.default_payment_method.card?.brand ?? null,
              payment_method_last4: subscription.default_payment_method.card?.last4 ?? null,
            }
          : {}),
        status: subscription.status,
      },
      {
        onConflict: 'customer_id',
      },
    );

    if (subError) {
      console.error('Error syncing subscription:', subError);
      throw new Error('Failed to sync subscription in database');
    }
    console.info(`Successfully synced subscription for customer: ${customerId}`);

    // ========================================
    // NOUVEAU: Connecter user_subscriptions après paiement
    // ========================================
    if (subscription.status === 'active' || subscription.status === 'trialing') {
      const priceId = subscription.items.data[0].price.id;
      
        // ========================================
        // Mapping price_id → plan via stripe_price_mapping
        // ========================================
        try {
          // Chercher dans stripe_customers pour obtenir user_id
          const { data: customerData, error: customerError } = await supabase
            .from('stripe_customers')
            .select('user_id')
            .eq('customer_id', customerId)
            .single();

          if (customerError || !customerData) {
            console.warn(`⚠️ Customer not found in stripe_customers for ${customerId}, skipping user_subscriptions update`);
            return;
          }

          const userId = customerData.user_id;

          // Chercher le plan via metadata de la subscription, stripe_price_mapping, ou STRIPE_PRICES
          let planName = 'free'; // Fallback par défaut
          
          // Option 1: Utiliser metadata de la subscription si disponible
          if (subscription.metadata && subscription.metadata.planName) {
            planName = subscription.metadata.planName;
            console.info(`📋 Plan name from subscription metadata: ${planName}`);
          } else {
            // Option 2: Chercher via stripe_price_mapping
            const { data: mappingData, error: mappingError } = await supabase
              .from('stripe_price_mapping')
              .select('plan_name')
              .eq('price_id', priceId)
              .single();

            if (!mappingError && mappingData) {
              planName = mappingData.plan_name;
              console.info(`📋 Plan name from mapping table: ${planName}`);
            } else {
              // Option 3: Chercher via STRIPE_PRICES (variables d'environnement)
              const STRIPE_PRICES = {
                starter: {
                  normal: Deno.env.get('VITE_PRICE_ID_starter_normal') || '',
                  promo: Deno.env.get('VITE_PRICE_ID_starter_promo') || '',
                },
                pro: {
                  normal: Deno.env.get('VITE_PRICE_ID_PRO_normal') || '',
                  promo: Deno.env.get('VITE_PRICE_ID_pro_promo') || '',
                },
                teams: {
                  normal: Deno.env.get('VITE_PRICE_ID_teams_normal') || '',
                  promo: Deno.env.get('VITE_PRICE_ID_teams_promo') || '',
                },
              };

              // Chercher dans STRIPE_PRICES (méthode stylisée)
              const foundPlan = Object.entries(STRIPE_PRICES)
                .find(([, prices]) => 
                  Object.values(prices).includes(priceId)
                )?.[0];

              if (foundPlan) {
                planName = foundPlan;
                console.info(`📋 Plan name from STRIPE_PRICES: ${planName}`);
              }

              if (planName === 'free') {
                console.warn(`⚠️ Price ID ${priceId} not found in metadata, mapping, or STRIPE_PRICES, using free as fallback`);
              }
            }
          }

          // Récupérer le plan depuis subscription_plans
          const { data: planData, error: planError } = await supabase
            .from('subscription_plans')
            .select('id, name')
            .eq('name', planName)
            .single();

          if (planError || !planData) {
            console.warn(`⚠️ Plan "${planName}" not found, using free as fallback`);
            const { data: freePlan } = await supabase
              .from('subscription_plans')
              .select('id')
              .eq('name', 'free')
              .single();
            
            if (freePlan) {
              await supabase.from('user_subscriptions').upsert({
                user_id: userId,
                plan_id: freePlan.id,
                status: 'active',
                started_at: new Date(subscription.current_period_start * 1000).toISOString(),
                expires_at: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
              }, { onConflict: 'user_id' });
            }
            return;
          }

          // Mettre à jour ou créer user_subscriptions
          const { error: userSubError } = await supabase.from('user_subscriptions').upsert({
            user_id: userId,
            plan_id: planData.id,
            status: subscription.status === 'active' ? 'active' : subscription.status === 'trialing' ? 'trialing' : 'active',
            started_at: new Date(subscription.current_period_start * 1000).toISOString(),
            expires_at: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
          }, { onConflict: 'user_id' });

          if (userSubError) {
            console.error('❌ Error updating user_subscriptions:', userSubError);
          } else {
            console.info(`✅ Successfully updated user_subscriptions for user ${userId} with plan ${planData.name}`);
          }
        } catch (linkError) {
          console.error('❌ Error linking user_subscriptions:', linkError);
          // Ne pas faire échouer le webhook si la liaison échoue
        }
    }
  } catch (error) {
    console.error(`Failed to sync subscription for customer ${customerId}:`, error);
    throw error;
  }
}
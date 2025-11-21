/**
 * 🧪 Test de l'Edge Function Stripe
 */

import { supabase } from '../lib/supabase';

export async function testStripeFunction() {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

  console.log('🧪 Test de l\'Edge Function Stripe');
  console.log('=====================================');

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Variables Supabase manquantes');
    return;
  }

  // 🔐 Récupérer le token JWT de l'utilisateur connecté
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    console.warn('⚠️ Aucun utilisateur connecté - test ignoré');
    console.warn('   Veuillez vous connecter pour tester l\'Edge Function');
    return;
  }

  console.log('✅ Utilisateur authentifié:', session.user?.email);

  const testPayload = {
    price_id: 'price_1Rbo6rLalEotrAUvDy2s3aub', // Format snake_case (comme le backend)
    customer_email: session.user?.email || 'test@example.com',
    success_url: 'https://centrinote.netlify.app/plan?status=success',
    cancel_url: 'https://centrinote.netlify.app/plan?status=canceled',
    mode: 'subscription'
  };

  console.log('📡 Envoi du payload de test:');
  console.log('   URL:', `${SUPABASE_URL}/functions/v1/stripe-checkout`);
  console.log('   Payload:', testPayload);
  console.log('   Token:', session.access_token.substring(0, 20) + '...');

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/stripe-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify(testPayload)
    });
    
    console.log('📡 Response status:', response.status);
    console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('📡 Response body:', responseText);
    
    if (response.ok) {
      console.log('✅ Edge Function répond correctement');
      try {
        const data = JSON.parse(responseText);
        console.log('✅ Session créée:', data);
      } catch (e) {
        console.log('⚠️ Response non-JSON:', responseText);
      }
    } else {
      console.log('❌ Edge Function erreur:', response.status, responseText);
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

/**
 * 🔍 Vérification des variables d'environnement côté frontend
 */

export function checkEnvironmentVariables() {
  const env = {
    // Variables Stripe
    VITE_STRIPE_PUBLISHABLE_KEY: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
    
    // Price IDs depuis les variables d'environnement
    VITE_Free_ID: import.meta.env.VITE_Free_ID,
    VITE_PRO_PRICE_ID: import.meta.env.VITE_PRO_PRICE_ID,
    VITE_Focus_ID: import.meta.env.VITE_Focus_ID,
    
    // Variables Supabase
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  };

  console.log('🔍 Variables d\'environnement côté frontend:');
  console.log('=====================================');
  
  // Vérifier VITE_STRIPE_PUBLISHABLE_KEY
  if (env.VITE_STRIPE_PUBLISHABLE_KEY) {
    console.log('✅ VITE_STRIPE_PUBLISHABLE_KEY:', env.VITE_STRIPE_PUBLISHABLE_KEY.substring(0, 20) + '...');
    console.log('   Mode:', env.VITE_STRIPE_PUBLISHABLE_KEY.startsWith('pk_test_') ? 'TEST' : 'LIVE');
  } else {
    console.log('❌ VITE_STRIPE_PUBLISHABLE_KEY: MANQUANTE');
  }
  
  // Vérifier les Price IDs
  console.log('');
  console.log('🔍 Price IDs depuis les variables d\'environnement:');
  console.log('   VITE_Free_ID:', env.VITE_Free_ID || '❌ MANQUANTE');
  console.log('   VITE_PRO_PRICE_ID:', env.VITE_PRO_PRICE_ID || '❌ MANQUANTE');
  console.log('   VITE_Focus_ID:', env.VITE_Focus_ID || '❌ MANQUANTE');
  
  // Vérifier VITE_SUPABASE_URL
  if (env.VITE_SUPABASE_URL) {
    console.log('');
    console.log('✅ VITE_SUPABASE_URL:', env.VITE_SUPABASE_URL);
  } else {
    console.log('');
    console.log('❌ VITE_SUPABASE_URL: MANQUANTE');
  }
  
  // Vérifier VITE_SUPABASE_ANON_KEY
  if (env.VITE_SUPABASE_ANON_KEY) {
    console.log('✅ VITE_SUPABASE_ANON_KEY:', env.VITE_SUPABASE_ANON_KEY.substring(0, 20) + '...');
  } else {
    console.log('❌ VITE_SUPABASE_ANON_KEY: MANQUANTE');
  }
  
  // Vérifier la cohérence TEST/LIVE
  const stripeMode = env.VITE_STRIPE_PUBLISHABLE_KEY?.startsWith('pk_test_') ? 'TEST' : 'LIVE';
  console.log('');
  console.log('🔍 Mode Stripe:', stripeMode);
  console.log('   ⚠️  Assurez-vous que tous les Price IDs correspondent au mode', stripeMode);
  
  return env;
}

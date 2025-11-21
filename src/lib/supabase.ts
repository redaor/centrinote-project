import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables. Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  },
  global: {
    headers: {
      'apikey': supabaseKey,
      'x-client-info': 'centrinote-web/1.0'
    }
  },
  db: {
    schema: 'public'
  },
  // ⚡ Optimisations Performances
  realtime: {
    params: {
      eventsPerSecond: 2  // Réduit de 10 à 2 pour économiser la bande passante
    }
  },
  // 🔧 Connection pooling et timeouts
  options: {
    db: {
      pooling: {
        max: 15,              // Max 15 connexions simultanées
        idleTimeoutMillis: 30000,  // 30s timeout inactif
        connectionTimeoutMillis: 2000  // 2s timeout connexion
      }
    },
    // Cache des requêtes identiques
    cache: {
      ttl: 60 // Cache 60 secondes
    }
  }
}
);

// 🔍 DEBUG: Exposer le client Supabase dans window pour tests console (DEV only)
if (import.meta.env.DEV) {
  (window as any).supabase = supabase;
  console.log('🔍 [DEBUG] Client Supabase exposé dans window.supabase pour tests');
}
import { createClient } from '@supabase/supabase-js';

// Debug flag - désactivé en production
const DEBUG = import.meta.env.DEV || import.meta.env.VITE_DEBUG === 'true';

// Validation des variables d'environnement
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set');
}

// Validation format URL (pas de trailing slash)
const cleanUrl = supabaseUrl.replace(/\/$/, '');

// Singleton client Supabase
export const supabaseClient = createClient(cleanUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: window.localStorage,
    storageKey: 'centrinote-auth',
    debug: DEBUG
  },
  
  global: {
    headers: {
      'x-client-info': 'centrinote-web/1.0'
    }
  },
  
  db: {
    schema: 'public'
  },
  
  // Désactiver Realtime par défaut (on l'active manuellement si besoin)
  realtime: {
    params: {
      eventsPerSecond: 1 // Réduit au minimum
    },
    timeout: 10000, // 10s timeout
    heartbeatIntervalMs: 30000, // 30s heartbeat
    reconnectAfterMs: (attempts: number) => {
      // Exponential backoff avec max 30s
      return Math.min(1000 * Math.pow(2, attempts), 30000);
    }
  }
});

// Helper pour requêtes sécurisées avec gestion d'erreur HTML
export async function supabaseFetch(
  path: string,
  options: RequestInit = {}
): Promise<any> {
  const url = `${cleanUrl}${path}`;
  
  try {
    const session = await supabaseClient.auth.getSession();
    const token = session.data?.session?.access_token;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': token ? `Bearer ${token}` : `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers
      }
    });
    
    // Vérifier le content-type de la réponse
    const contentType = response.headers.get('content-type') || '';
    
    if (!response.ok) {
      const text = await response.text();
      DEBUG && console.error(`❌ API Error ${response.status}:`, text.slice(0, 200));
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    // Détecter les réponses HTML inattendues
    if (!contentType.includes('application/json')) {
      const preview = await response.text();
      console.error(`❌ Expected JSON but got ${contentType}:`, preview.slice(0, 200));
      throw new Error(`Invalid response type: ${contentType}`);
    }
    
    return await response.json();
  } catch (error) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error('Network error - check your connection and CORS settings');
    }
    throw error;
  }
}

// Export par défaut pour compatibilité
export default supabaseClient;
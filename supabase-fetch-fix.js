// ✅ CORRECTION SUPABASE REST API - Headers requis

const { data, error } = await fetch(
  `https://<project>.supabase.co/rest/v1/zoom_tokens?select=access_token,expires_at&user_id=eq.${userId}`,
  {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'apikey': 'your-supabase-anon-key-here',
      'Authorization': `Bearer your-supabase-anon-key-here`
    }
  }
);

if (error) {
  console.error('❌ Erreur Supabase:', error);
} else {
  console.log('✅ Données récupérées:', data);
}

// ==========================================
// VERSION AVEC VARIABLES D'ENVIRONNEMENT
// ==========================================

const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-supabase-anon-key';

const { data, error } = await fetch(
  `${SUPABASE_URL}/rest/v1/zoom_tokens?select=access_token,expires_at&user_id=eq.${userId}`,
  {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    }
  }
);

// ==========================================
// VERSION AVEC GESTION D'ERREUR COMPLÈTE
// ==========================================

async function getZoomTokens(userId) {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/zoom_tokens?select=access_token,expires_at&user_id=eq.${userId}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      }
    );

    // Vérifier le status HTTP
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Parser la réponse JSON
    const data = await response.json();
    
    console.log('✅ Tokens récupérés:', data);
    return { data, error: null };
    
  } catch (err) {
    console.error('❌ Erreur lors de la récupération:', err);
    return { data: null, error: err.message };
  }
}

// Utilisation
const result = await getZoomTokens(userId);
if (result.error) {
  console.error('Erreur:', result.error);
} else {
  console.log('Données:', result.data);
}

// ==========================================
// VERSION POUR REACT/VITE AVEC ENV VARS
// ==========================================

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const response = await fetch(
  `${SUPABASE_URL}/rest/v1/zoom_tokens?select=access_token,expires_at&user_id=eq.${userId}`,
  {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    }
  }
);

const data = await response.json();
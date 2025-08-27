// ==========================================
// 🔐 GÉNÉRATEUR D'URL OAUTH ZOOM SÉCURISÉ
// ==========================================

import { randomUUID } from 'crypto';

// ==========================================
// 1. GÉNÉRATION DE L'URL OAUTH ZOOM
// ==========================================

function generateZoomOAuthURL() {
  // Générer un state aléatoire unique
  const state = randomUUID();
  
  // Configuration OAuth
  const config = {
    response_type: 'code',
    client_id: process.env.ZOOM_CLIENT_ID, // Variable d'environnement
    redirect_uri: 'https://centrinote.fr/zoom/callback',
    state: state,
    scope: 'meeting:write meeting:read user:read' // Optionnel mais recommandé
  };
  
  // Construire l'URL avec URLSearchParams pour éviter les erreurs d'encodage
  const baseUrl = 'https://zoom.us/oauth/authorize';
  const params = new URLSearchParams(config);
  const oauthUrl = `${baseUrl}?${params.toString()}`;
  
  console.log('🔐 State généré:', state);
  console.log('🔗 URL OAuth générée:', oauthUrl);
  
  // Sauvegarder le state pour validation ultérieure
  // En session ou database selon votre architecture
  storeState(state);
  
  return {
    url: oauthUrl,
    state: state
  };
}

// ==========================================
// 2. VERSION REACT COMPONENT
// ==========================================

import React, { useState } from 'react';

function ZoomOAuthButton() {
  const [loading, setLoading] = useState(false);
  
  const handleLogin = () => {
    setLoading(true);
    
    try {
      // Générer le state aléatoire
      const state = crypto.randomUUID(); // crypto API disponible dans le navigateur
      
      // Sauvegarder en sessionStorage (côté client)
      sessionStorage.setItem('zoom_oauth_state', state);
      
      // Configuration OAuth
      const oauthParams = {
        response_type: 'code',
        client_id: process.env.REACT_APP_ZOOM_CLIENT_ID, // React env var
        redirect_uri: 'https://centrinote.fr/zoom/callback',
        state: state
      };
      
      // Construire l'URL
      const baseUrl = 'https://zoom.us/oauth/authorize';
      const params = new URLSearchParams(oauthParams);
      const oauthUrl = `${baseUrl}?${params.toString()}`;
      
      console.log('🔐 State sauvegardé:', state);
      console.log('🚀 Redirection vers Zoom...');
      
      // Rediriger l'utilisateur
      window.location.href = oauthUrl;
      
    } catch (error) {
      console.error('❌ Erreur génération OAuth:', error);
      setLoading(false);
    }
  };
  
  return (
    <button onClick={handleLogin} disabled={loading}>
      {loading ? '🔄 Redirection...' : '🔐 Se connecter avec Zoom'}
    </button>
  );
}

// ==========================================
// 3. VERSION VITE/MODERNE (import.meta.env)
// ==========================================

function generateModernZoomOAuth() {
  // State aléatoire
  const state = crypto.randomUUID();
  
  // Configuration avec Vite env vars
  const oauthConfig = {
    response_type: 'code',
    client_id: import.meta.env.VITE_ZOOM_CLIENT_ID,
    redirect_uri: 'https://centrinote.fr/zoom/callback',
    state: state
  };
  
  // Validation de la configuration
  if (!oauthConfig.client_id) {
    throw new Error('❌ VITE_ZOOM_CLIENT_ID non défini dans .env');
  }
  
  // Construction URL
  const oauthUrl = 'https://zoom.us/oauth/authorize?' + 
    Object.entries(oauthConfig)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');
  
  // Stockage sécurisé
  sessionStorage.setItem('zoom_oauth_state', state);
  sessionStorage.setItem('zoom_oauth_timestamp', Date.now().toString());
  
  console.log('✅ OAuth URL générée:', oauthUrl.substring(0, 100) + '...');
  
  return { url: oauthUrl, state };
}

// ==========================================
// 4. STOCKAGE DU STATE (CÔTÉ SERVEUR)
// ==========================================

// Option A: En mémoire (simple mais non-persistant)
const stateStore = new Map();

function storeState(state, userId = null) {
  const stateData = {
    state: state,
    userId: userId,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
  };
  
  stateStore.set(state, stateData);
  
  // Nettoyage automatique des states expirés
  setTimeout(() => {
    stateStore.delete(state);
  }, 10 * 60 * 1000);
}

// Option B: Base de données (Redis, PostgreSQL, etc.)
async function storeStateInDB(state, userId) {
  // Exemple avec Supabase
  const { error } = await supabase
    .from('oauth_states')
    .insert({
      state: state,
      user_id: userId,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
    });
    
  if (error) {
    throw new Error('Impossible de sauvegarder le state OAuth');
  }
}

// ==========================================
// 5. VALIDATION DU STATE AU CALLBACK
// ==========================================

// Version côté client (dans la page de callback)
function validateStateClient() {
  // Récupérer les paramètres URL
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  const receivedState = urlParams.get('state');
  
  // Récupérer le state stocké
  const savedState = sessionStorage.getItem('zoom_oauth_state');
  const timestamp = sessionStorage.getItem('zoom_oauth_timestamp');
  
  console.log('🔍 Validation du state:', {
    received: receivedState?.substring(0, 8) + '...',
    saved: savedState?.substring(0, 8) + '...',
    match: receivedState === savedState
  });
  
  // Vérifications de sécurité
  if (!receivedState) {
    throw new Error('❌ State manquant dans la réponse OAuth');
  }
  
  if (!savedState) {
    throw new Error('❌ State non trouvé en sessionStorage - session expirée');
  }
  
  if (receivedState !== savedState) {
    throw new Error('❌ State invalide - possible attaque CSRF');
  }
  
  // Vérifier l'expiration (optionnel)
  const now = Date.now();
  const createdAt = parseInt(timestamp);
  const maxAge = 10 * 60 * 1000; // 10 minutes
  
  if (now - createdAt > maxAge) {
    throw new Error('❌ State expiré - recommencez l\'authentification');
  }
  
  console.log('✅ State validé avec succès');
  
  // Nettoyer le storage
  sessionStorage.removeItem('zoom_oauth_state');
  sessionStorage.removeItem('zoom_oauth_timestamp');
  
  return { code, state: receivedState };
}

// Version côté serveur (API endpoint)
async function validateStateServer(receivedState, receivedCode) {
  // Récupérer depuis le store
  const stateData = stateStore.get(receivedState);
  
  if (!stateData) {
    throw new Error('State non trouvé ou expiré');
  }
  
  if (stateData.expiresAt < new Date()) {
    stateStore.delete(receivedState);
    throw new Error('State expiré');
  }
  
  // Nettoyer après validation réussie
  stateStore.delete(receivedState);
  
  console.log('✅ State serveur validé pour utilisateur:', stateData.userId);
  
  return {
    isValid: true,
    userId: stateData.userId,
    code: receivedCode
  };
}

// ==========================================
// 6. EXEMPLE COMPLET D'USAGE
// ==========================================

// Dans votre composant React
function MyZoomAuth() {
  const initiateOAuth = () => {
    try {
      const { url, state } = generateModernZoomOAuth();
      console.log('🚀 Redirection OAuth initiée');
      window.location.href = url;
    } catch (error) {
      alert('Erreur: ' + error.message);
    }
  };
  
  return (
    <div>
      <button onClick={initiateOAuth}>
        🔐 Connexion Zoom Sécurisée
      </button>
    </div>
  );
}

// Dans votre page de callback
function handleCallback() {
  try {
    const { code, state } = validateStateClient();
    
    // Envoyer le code au backend pour l'échange de tokens
    fetch('/api/zoom/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, state })
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        console.log('✅ Authentification Zoom réussie');
        window.location.href = '/dashboard';
      } else {
        throw new Error(data.error);
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur callback:', error.message);
    alert('Erreur d\'authentification: ' + error.message);
  }
}

// ==========================================
// 7. VARIABLES D'ENVIRONNEMENT REQUISES
// ==========================================

/*
Dans votre fichier .env :

# Pour React (Create React App)
REACT_APP_ZOOM_CLIENT_ID=your_zoom_client_id

# Pour Vite
VITE_ZOOM_CLIENT_ID=your_zoom_client_id

# Pour Node.js
ZOOM_CLIENT_ID=your_zoom_client_id
*/

export {
  generateZoomOAuthURL,
  ZoomOAuthButton,
  generateModernZoomOAuth,
  validateStateClient,
  validateStateServer,
  storeState
};
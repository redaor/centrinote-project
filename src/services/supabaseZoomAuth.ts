// 🚀 Service d'authentification Zoom via Supabase OAuth intégré
// Remplace la gestion manuelle OAuth complexe par l'API native Supabase
// =================================================================

import { supabase } from '../lib/supabase';

interface ZoomAuthResult {
  success: boolean;
  error?: string;
  user?: any;
  session?: any;
}

interface ZoomTokens {
  provider_token?: string;
  provider_refresh_token?: string;
  expires_at?: number;
}

/**
 * 🔐 Authentification Zoom via Supabase OAuth (méthode simple et fiable)
 * Remplace toute la logique manuelle par un appel natif Supabase
 */
export const signInWithZoomOAuth = async (): Promise<ZoomAuthResult> => {
  console.log('🚀 Démarrage authentification Zoom via Supabase OAuth...');
  
  try {
    // Utiliser l'API OAuth native de Supabase pour Zoom
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'zoom',
      options: {
        scopes: 'meeting:write meeting:read user:read recording:read',
        redirectTo: `${window.location.origin}/dashboard`, // Redirection directe
        queryParams: {
          // Paramètres additionnels si nécessaire
          access_type: 'offline' // Pour obtenir un refresh token
        }
      }
    });

    if (error) {
      console.error('❌ Erreur Supabase OAuth Zoom:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors de l\'authentification Zoom'
      };
    }

    console.log('✅ Authentification Zoom initiée via Supabase OAuth');
    console.log('🔄 Redirection vers Zoom en cours...');
    
    return {
      success: true,
      user: data.user,
      session: data.session
    };

  } catch (err) {
    console.error('❌ Erreur inattendue authentification Zoom:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erreur inconnue'
    };
  }
};

/**
 * 📱 Récupérer les tokens Zoom depuis la session Supabase
 * Les tokens sont automatiquement gérés par Supabase (stockage, refresh, expiration)
 */
export const getZoomTokensFromSession = async (): Promise<ZoomTokens | null> => {
  console.log('🔍 Récupération tokens Zoom depuis session Supabase...');
  
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('❌ Erreur récupération session:', error);
      return null;
    }
    
    if (!session) {
      console.log('ℹ️ Aucune session active');
      return null;
    }
    
    // Vérifier si l'utilisateur est connecté via Zoom
    const user = session.user;
    const isZoomProvider = user.app_metadata?.provider === 'zoom' || 
                          user.identities?.some(identity => identity.provider === 'zoom');
    
    if (!isZoomProvider) {
      console.log('ℹ️ Utilisateur non connecté via Zoom OAuth');
      return null;
    }
    
    // Extraire les tokens Zoom de la session
    const zoomTokens = {
      provider_token: session.provider_token,
      provider_refresh_token: session.provider_refresh_token,
      expires_at: session.expires_at
    };
    
    console.log('✅ Tokens Zoom récupérés:', {
      hasAccessToken: !!zoomTokens.provider_token,
      hasRefreshToken: !!zoomTokens.provider_refresh_token,
      expiresAt: zoomTokens.expires_at
    });
    
    return zoomTokens;
    
  } catch (err) {
    console.error('❌ Erreur récupération tokens Zoom:', err);
    return null;
  }
};

/**
 * ✅ Vérifier si l'utilisateur est connecté à Zoom via Supabase OAuth
 */
export const isZoomConnected = async (): Promise<boolean> => {
  const tokens = await getZoomTokensFromSession();
  return !!tokens?.provider_token;
};

/**
 * 🔄 Rafraîchir les tokens Zoom (géré automatiquement par Supabase)
 * Supabase s'occupe automatiquement du refresh, mais on peut forcer un refresh si nécessaire
 */
export const refreshZoomTokens = async (): Promise<ZoomAuthResult> => {
  console.log('🔄 Rafraîchissement tokens Zoom via Supabase...');
  
  try {
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error) {
      console.error('❌ Erreur refresh session:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors du rafraîchissement des tokens'
      };
    }
    
    console.log('✅ Tokens Zoom rafraîchis automatiquement par Supabase');
    
    return {
      success: true,
      user: data.user,
      session: data.session
    };
    
  } catch (err) {
    console.error('❌ Erreur refresh tokens Zoom:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erreur inconnue'
    };
  }
};

/**
 * 🔌 Déconnecter Zoom (déconnexion complète de Supabase)
 */
export const disconnectZoom = async (): Promise<ZoomAuthResult> => {
  console.log('🔌 Déconnexion Zoom via Supabase...');
  
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('❌ Erreur déconnexion Zoom:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors de la déconnexion'
      };
    }
    
    console.log('✅ Déconnexion Zoom réussie');
    
    return {
      success: true
    };
    
  } catch (err) {
    console.error('❌ Erreur déconnexion Zoom:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erreur inconnue'
    };
  }
};

/**
 * 🛠️ Utilitaire pour utiliser les tokens Zoom dans les appels API
 * Les tokens sont automatiquement valides et rafraîchis par Supabase
 */
export const makeZoomApiCall = async (endpoint: string, options: RequestInit = {}): Promise<Response> => {
  console.log(`🔗 Appel API Zoom: ${endpoint}`);
  
  const tokens = await getZoomTokensFromSession();
  
  if (!tokens?.provider_token) {
    throw new Error('Tokens Zoom non disponibles - reconnexion requise');
  }
  
  const response = await fetch(`https://api.zoom.us/v2${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${tokens.provider_token}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  
  // Si le token est expiré, Supabase le rafraîchira automatiquement
  if (response.status === 401) {
    console.log('🔄 Token expiré, refresh automatique...');
    await refreshZoomTokens();
    
    // Retry avec nouveau token
    const newTokens = await getZoomTokensFromSession();
    if (newTokens?.provider_token) {
      return fetch(`https://api.zoom.us/v2${endpoint}`, {
        ...options,
        headers: {
          'Authorization': `Bearer ${newTokens.provider_token}`,
          'Content-Type': 'application/json',
          ...options.headers
        }
      });
    }
  }
  
  return response;
};

// Export par défaut avec toutes les fonctions
export default {
  signInWithZoomOAuth,
  getZoomTokensFromSession,
  isZoomConnected,
  refreshZoomTokens,
  disconnectZoom,
  makeZoomApiCall
};
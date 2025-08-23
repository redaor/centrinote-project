// Helper JavaScript BFF pour gérer l'authentification Zoom côté frontend
// Pattern Backend-for-Frontend - Session-based auth

class ZoomAuthBFF {
  constructor(backendUrl = 'http://zoomapp.local:5174') {
    this.backendUrl = backendUrl;
    this.user = null;
    this.authenticated = false;
  }

  // Vérifier le statut d'authentification auprès du serveur BFF
  async checkAuthStatus() {
    try {
      console.log('🔍 BFF Vérification statut authentification...');
      
      const response = await fetch(`${this.backendUrl}/auth/session`, {
        method: 'GET',
        credentials: 'include', // Important pour les cookies de session
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && data.authenticated) {
        this.user = data.user;
        this.authenticated = true;
        console.log('✅ Session BFF valide:', data.user.email);
        return data.user;
      } else {
        this.user = null;
        this.authenticated = false;
        console.log('❌ Session BFF non authentifiée:', data.error);
        return null;
      }
    } catch (error) {
      console.error('❌ Erreur vérification session BFF:', error);
      this.user = null;
      this.authenticated = false;
      return null;
    }
  }

  // Récupérer l'utilisateur actuel depuis le cache local
  getUser() {
    return this.user;
  }

  // Vérifier si l'utilisateur est authentifié (cache local)
  isAuthenticated() {
    return this.authenticated;
  }

  // Initier la connexion OAuth BFF
  async startOAuth() {
    try {
      console.log('🔄 Démarrage OAuth BFF...');
      
      const response = await fetch(`${this.backendUrl}/auth/zoom`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.authUrl) {
        console.log('✅ URL OAuth BFF générée');
        console.log('🌐 Redirection vers Zoom OAuth...');
        
        // Rediriger vers Zoom OAuth
        window.location.href = data.authUrl;
      } else {
        throw new Error(data.error || 'Erreur génération URL OAuth BFF');
      }
    } catch (error) {
      console.error('❌ Erreur initiation OAuth BFF:', error);
      throw new Error(`Impossible de contacter le serveur BFF: ${error.message}`);
    }
  }

  // Faire une requête authentifiée vers le backend BFF
  async authenticatedFetch(endpoint, options = {}) {
    if (!this.authenticated) {
      throw new Error('Non authentifié - Session BFF requise');
    }

    try {
      const response = await fetch(`${this.backendUrl}${endpoint}`, {
        ...options,
        credentials: 'include', // Cookies de session BFF
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      if (response.status === 401) {
        // Session expirée, mettre à jour le statut local
        this.user = null;
        this.authenticated = false;
        throw new Error('Session BFF expirée, reconnexion requise');
      }

      return response;
    } catch (error) {
      if (error.name === 'TypeError') {
        throw new Error('Erreur de connexion au serveur BFF');
      }
      throw error;
    }
  }

  // Déconnexion BFF
  async logout() {
    try {
      console.log('🔄 Déconnexion BFF...');
      
      const response = await fetch(`${this.backendUrl}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Déconnexion BFF réussie');
      } else {
        console.warn('⚠️ Problème lors de la déconnexion BFF:', data.error);
      }
    } catch (error) {
      console.error('❌ Erreur déconnexion BFF:', error);
    } finally {
      // Nettoyer l'état local dans tous les cas
      this.user = null;
      this.authenticated = false;
    }
  }

  // Gérer le retour du callback OAuth BFF
  handleCallbackReturn() {
    const params = new URLSearchParams(window.location.search);
    const authStatus = params.get('auth');
    const message = params.get('message');

    if (authStatus === 'success') {
      console.log('✅ Callback OAuth BFF réussi');
      // Nettoyer l'URL
      window.history.replaceState({}, document.title, window.location.pathname);
      return { success: true };
    } else if (authStatus === 'error') {
      console.error('❌ Erreur callback OAuth BFF:', message);
      // Nettoyer l'URL
      window.history.replaceState({}, document.title, window.location.pathname);
      return { success: false, error: message };
    }

    return null; // Pas de callback
  }

  // Nettoyer les données d'authentification legacy (localStorage)
  clearLegacyAuth() {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('zoom_user');
      localStorage.removeItem('zoom_authenticated');
      console.log('🧹 Données localStorage legacy nettoyées');
    }
  }
}

// Instance globale BFF
window.zoomAuthBFF = new ZoomAuthBFF();

// Auto-initialisation BFF
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🔐 Zoom Auth BFF Manager initialisé');
  
  // Nettoyer les données legacy
  window.zoomAuthBFF.clearLegacyAuth();
  
  // Gérer le retour du callback
  const callbackResult = window.zoomAuthBFF.handleCallbackReturn();
  
  if (callbackResult) {
    if (callbackResult.success) {
      // Vérifier le statut après callback réussi
      const user = await window.zoomAuthBFF.checkAuthStatus();
      if (user) {
        console.log('👤 Utilisateur BFF authentifié:', user);
        window.dispatchEvent(new CustomEvent('zoom-auth-bff-success', { detail: user }));
      }
    } else {
      // Erreur de callback
      window.dispatchEvent(new CustomEvent('zoom-auth-bff-error', { detail: callbackResult.error }));
    }
  } else {
    // Vérification normale du statut au chargement
    await window.zoomAuthBFF.checkAuthStatus();
  }
});

console.log('🔐 Zoom Auth BFF Helper chargé');
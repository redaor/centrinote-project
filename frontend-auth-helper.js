// Helper JavaScript pour gérer l'authentification Zoom côté frontend
// À inclure dans votre application frontend

class ZoomAuthManager {
  constructor(backendUrl = 'http://localhost:5174') {
    this.backendUrl = backendUrl;
  }

  // Récupérer le token JWT stocké
  getToken() {
    return localStorage.getItem('auth_token');
  }

  // Récupérer les infos utilisateur stockées
  getUser() {
    const userStr = localStorage.getItem('zoom_user');
    return userStr ? JSON.parse(userStr) : null;
  }

  // Vérifier si l'utilisateur est authentifié
  isAuthenticated() {
    return localStorage.getItem('zoom_authenticated') === 'true' && this.getToken();
  }

  // Faire une requête authentifiée vers le backend
  async authenticatedFetch(endpoint, options = {}) {
    const token = this.getToken();
    
    if (!token) {
      throw new Error('Non authentifié');
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers
    };

    try {
      const response = await fetch(`${this.backendUrl}${endpoint}`, {
        ...options,
        headers,
        credentials: 'include', // Pour les cookies aussi
        mode: 'cors' // Explicite pour CORS
      });

      if (response.status === 401) {
        // Token expiré ou invalide, nettoyer et forcer reconnexion
        this.clearAuth();
        throw new Error('Session expirée, reconnexion requise');
      }

      return response;
    } catch (error) {
      // Gestion des erreurs CORS/réseau
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Erreur de connexion au serveur - Vérifiez que le serveur backend est démarré');
      }
      throw error;
    }
  }

  // Vérifier le statut d'authentification auprès du serveur
  async checkAuthStatus() {
    try {
      const response = await this.authenticatedFetch('/auth/me');
      const data = await response.json();
      
      if (data.success) {
        return data.user;
      } else {
        this.clearAuth();
        return null;
      }
    } catch (error) {
      console.warn('Vérification auth échouée:', error);
      this.clearAuth();
      return null;
    }
  }

  // Initier la connexion OAuth
  async startOAuth() {
    try {
      const response = await fetch(`${this.backendUrl}/auth/zoom`, {
        credentials: 'include',
        mode: 'cors'
      });
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Rediriger vers Zoom OAuth
        window.location.href = data.authUrl;
      } else {
        throw new Error(data.error || 'Erreur génération URL OAuth');
      }
    } catch (error) {
      console.error('Erreur initiation OAuth:', error);
      
      // Messages d'erreur plus clairs
      if (error.name === 'TypeError') {
        throw new Error('Impossible de contacter le serveur backend. Vérifiez qu\'il fonctionne sur ' + this.backendUrl);
      }
      throw error;
    }
  }

  // Nettoyer l'authentification
  clearAuth() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('zoom_user');
    localStorage.removeItem('zoom_authenticated');
  }

  // Déconnexion
  async logout() {
    try {
      await this.authenticatedFetch('/auth/logout', { method: 'POST' });
    } catch (error) {
      console.warn('Erreur déconnexion serveur:', error);
    } finally {
      this.clearAuth();
    }
  }

  // Gérer le retour du callback OAuth
  handleCallbackReturn() {
    const params = new URLSearchParams(window.location.search);
    const authStatus = params.get('auth');
    const message = params.get('message');

    if (authStatus === 'success') {
      console.log('✅ Authentification Zoom réussie');
      // Nettoyer l'URL
      window.history.replaceState({}, document.title, window.location.pathname);
      return { success: true };
    } else if (authStatus === 'error') {
      console.error('❌ Erreur authentification:', message);
      this.clearAuth();
      return { success: false, error: message };
    }

    return null; // Pas de callback
  }
}

// Instance globale
window.zoomAuth = new ZoomAuthManager();

// Auto-initialisation
document.addEventListener('DOMContentLoaded', () => {
  // Gérer le retour du callback
  const callbackResult = window.zoomAuth.handleCallbackReturn();
  
  if (callbackResult) {
    if (callbackResult.success) {
      // Authentification réussie, vérifier le statut
      window.zoomAuth.checkAuthStatus().then(user => {
        if (user) {
          console.log('👤 Utilisateur authentifié:', user);
          // Déclencher événement personnalisé pour l'app
          window.dispatchEvent(new CustomEvent('zoom-auth-success', { detail: user }));
        }
      });
    } else {
      // Erreur d'authentification
      window.dispatchEvent(new CustomEvent('zoom-auth-error', { detail: callbackResult.error }));
    }
  }
});

console.log('🔐 Zoom Auth Manager initialisé');
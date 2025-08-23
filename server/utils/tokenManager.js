import crypto from 'crypto';
import axios from 'axios';

/**
 * Gestionnaire sécurisé pour les tokens OAuth Zoom
 * Stockage en mémoire avec chiffrement (pour demo - utiliser Redis/DB en production)
 */
export class TokenManager {
  constructor() {
    // Stockage en mémoire des tokens (remplacer par Redis/DB en production)
    this.tokens = new Map();
    
    // Clé de chiffrement pour les tokens (générer automatiquement)
    this.encryptionKey = process.env.TOKEN_ENCRYPTION_KEY || this.generateEncryptionKey();
    
    console.log('🔐 TokenManager initialisé');
  }
  
  /**
   * Générer une clé de chiffrement aléatoire
   */
  generateEncryptionKey() {
    return crypto.randomBytes(32).toString('hex');
  }
  
  /**
   * Chiffrer des données sensibles
   */
  encrypt(text) {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(this.encryptionKey.substring(0, 32)), iv);
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      console.error('❌ Erreur chiffrement:', error);
      throw new Error('Erreur de chiffrement');
    }
  }
  
  /**
   * Déchiffrer des données
   */
  decrypt(encryptedText) {
    try {
      const textParts = encryptedText.split(':');
      const iv = Buffer.from(textParts.shift(), 'hex');
      const encrypted = textParts.join(':');
      const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(this.encryptionKey.substring(0, 32)), iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      console.error('❌ Erreur déchiffrement:', error);
      throw new Error('Erreur de déchiffrement');
    }
  }
  
  /**
   * Stocker les tokens de manière sécurisée
   */
  async storeTokens(zoomUserId, tokenData) {
    try {
      console.log('💾 Stockage tokens pour utilisateur:', zoomUserId);
      
      const encryptedTokens = {
        accessToken: this.encrypt(tokenData.accessToken),
        refreshToken: this.encrypt(tokenData.refreshToken),
        expiresAt: new Date(Date.now() + (tokenData.expiresIn * 1000)).toISOString(),
        storedAt: new Date().toISOString(),
        userInfo: tokenData.userInfo,
        scopes: 'meeting:read meeting:write user:read' // Scopes accordés
      };
      
      this.tokens.set(zoomUserId, encryptedTokens);
      
      console.log('✅ Tokens stockés avec succès');
      return true;
    } catch (error) {
      console.error('❌ Erreur stockage tokens:', error);
      throw new Error('Impossible de stocker les tokens');
    }
  }
  
  /**
   * Récupérer les tokens stockés
   */
  async getTokens(zoomUserId) {
    try {
      const encryptedTokens = this.tokens.get(zoomUserId);
      
      if (!encryptedTokens) {
        console.log('❌ Aucun token trouvé pour utilisateur:', zoomUserId);
        return null;
      }
      
      return {
        accessToken: this.decrypt(encryptedTokens.accessToken),
        refreshToken: this.decrypt(encryptedTokens.refreshToken),
        expiresAt: encryptedTokens.expiresAt,
        storedAt: encryptedTokens.storedAt,
        userInfo: encryptedTokens.userInfo,
        scopes: encryptedTokens.scopes
      };
    } catch (error) {
      console.error('❌ Erreur récupération tokens:', error);
      return null;
    }
  }
  
  /**
   * Obtenir un token d'accès valide (avec refresh automatique si nécessaire)
   */
  async getValidAccessToken(zoomUserId) {
    try {
      const tokens = await this.getTokens(zoomUserId);
      
      if (!tokens) {
        console.log('❌ Aucun token disponible pour:', zoomUserId);
        return null;
      }
      
      const now = Date.now();
      const expiry = new Date(tokens.expiresAt).getTime();
      const timeUntilExpiry = expiry - now;
      
      // Si le token expire dans moins de 5 minutes, le rafraîchir
      if (timeUntilExpiry < 5 * 60 * 1000) {
        console.log('🔄 Token proche de l\'expiration, rafraîchissement...');
        
        const refreshed = await this.refreshAccessToken(zoomUserId);
        if (!refreshed) {
          console.error('❌ Impossible de rafraîchir le token');
          return null;
        }
        
        // Récupérer le nouveau token
        const newTokens = await this.getTokens(zoomUserId);
        return newTokens?.accessToken || null;
      }
      
      return tokens.accessToken;
    } catch (error) {
      console.error('❌ Erreur obtention token valide:', error);
      return null;
    }
  }
  
  /**
   * Rafraîchir le token d'accès
   */
  async refreshAccessToken(zoomUserId) {
    try {
      console.log('🔄 Rafraîchissement token pour utilisateur:', zoomUserId);
      
      const tokens = await this.getTokens(zoomUserId);
      if (!tokens || !tokens.refreshToken) {
        console.error('❌ Refresh token non disponible');
        return false;
      }
      
      // Appel API Zoom pour rafraîchir le token
      const response = await axios.post('https://zoom.us/oauth/token', {
        grant_type: 'refresh_token',
        refresh_token: tokens.refreshToken
      }, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      const { access_token, refresh_token, expires_in } = response.data;
      
      // Stocker les nouveaux tokens
      await this.storeTokens(zoomUserId, {
        accessToken: access_token,
        refreshToken: refresh_token || tokens.refreshToken, // Garder l'ancien si pas de nouveau
        expiresIn: expires_in,
        userInfo: tokens.userInfo
      });
      
      console.log('✅ Token rafraîchi avec succès');
      return true;
    } catch (error) {
      console.error('❌ Erreur rafraîchissement token:', error);
      
      // Si le refresh token est invalide, supprimer tous les tokens
      if (error.response?.status === 400) {
        console.log('🗑️ Refresh token invalide, suppression des tokens');
        this.tokens.delete(zoomUserId);
      }
      
      return false;
    }
  }
  
  /**
   * Révoquer et supprimer tous les tokens d'un utilisateur
   */
  async revokeTokens(zoomUserId) {
    try {
      console.log('🗑️ Révocation tokens pour utilisateur:', zoomUserId);
      
      const tokens = await this.getTokens(zoomUserId);
      
      if (tokens?.accessToken) {
        try {
          // Révoquer le token auprès de Zoom
          await axios.post('https://zoom.us/oauth/revoke', {
            token: tokens.accessToken
          }, {
            headers: {
              'Authorization': `Basic ${Buffer.from(`${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`).toString('base64')}`,
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          });
          
          console.log('✅ Token révoqué auprès de Zoom');
        } catch (revokeError) {
          console.warn('⚠️ Erreur révocation Zoom (token possiblement déjà expiré):', revokeError.response?.data);
        }
      }
      
      // Supprimer les tokens du stockage local
      this.tokens.delete(zoomUserId);
      
      console.log('✅ Tokens supprimés du stockage');
      return true;
    } catch (error) {
      console.error('❌ Erreur révocation tokens:', error);
      return false;
    }
  }
  
  /**
   * Nettoyer les tokens expirés (tâche de maintenance)
   */
  async cleanupExpiredTokens() {
    try {
      console.log('🧹 Nettoyage des tokens expirés...');
      
      const now = Date.now();
      let cleanedCount = 0;
      
      for (const [userId, tokenData] of this.tokens) {
        const expiry = new Date(tokenData.expiresAt).getTime();
        
        // Supprimer les tokens expirés depuis plus d'1 heure
        if (now - expiry > 60 * 60 * 1000) {
          this.tokens.delete(userId);
          cleanedCount++;
          console.log(`🗑️ Token expiré supprimé pour utilisateur: ${userId}`);
        }
      }
      
      if (cleanedCount > 0) {
        console.log(`✅ ${cleanedCount} tokens expirés nettoyés`);
      }
      
      return cleanedCount;
    } catch (error) {
      console.error('❌ Erreur nettoyage tokens:', error);
      return 0;
    }
  }
  
  /**
   * Obtenir des statistiques sur les tokens stockés
   */
  getTokenStats() {
    const now = Date.now();
    let totalTokens = 0;
    let validTokens = 0;
    let expiredTokens = 0;
    
    for (const [userId, tokenData] of this.tokens) {
      totalTokens++;
      
      const expiry = new Date(tokenData.expiresAt).getTime();
      if (now < expiry) {
        validTokens++;
      } else {
        expiredTokens++;
      }
    }
    
    return {
      total: totalTokens,
      valid: validTokens,
      expired: expiredTokens,
      storageType: 'memory'
    };
  }
}

// Nettoyer automatiquement les tokens expirés toutes les heures
setInterval(() => {
  const tokenManager = new TokenManager();
  tokenManager.cleanupExpiredTokens();
}, 60 * 60 * 1000);
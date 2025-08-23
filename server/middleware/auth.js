import jwt from 'jsonwebtoken';
import { TokenManager } from '../utils/tokenManager.js';

const tokenManager = new TokenManager();

/**
 * Middleware d'authentification JWT
 * Vérifie la validité du token et l'existence des tokens Zoom
 */
export const authMiddleware = async (req, res, next) => {
  try {
    // Récupérer le token depuis les cookies
    const authToken = req.cookies.auth_token;
    
    if (!authToken) {
      return res.status(401).json({
        success: false,
        error: 'Token d\'authentification manquant',
        requiresAuth: true
      });
    }
    
    // Vérifier et décoder le token JWT
    let decoded;
    try {
      decoded = jwt.verify(authToken, process.env.JWT_SECRET);
    } catch (jwtError) {
      console.error('❌ Token JWT invalide:', jwtError.message);
      
      // Supprimer le cookie invalide sur tous ports localhost
      res.clearCookie('auth_token', { domain: 'localhost' });
      
      return res.status(401).json({
        success: false,
        error: 'Token d\'authentification invalide',
        requiresAuth: true
      });
    }
    
    // Vérifier l'existence des tokens Zoom pour cet utilisateur
    const zoomTokens = await tokenManager.getTokens(decoded.zoomUserId);
    
    if (!zoomTokens) {
      console.error('❌ Tokens Zoom non trouvés pour utilisateur:', decoded.email);
      
      // Supprimer le cookie car les tokens Zoom sont manquants
      res.clearCookie('auth_token', { domain: 'localhost' });
      
      return res.status(401).json({
        success: false,
        error: 'Session Zoom expirée, reconnexion requise',
        requiresAuth: true,
        zoomTokensMissing: true
      });
    }
    
    // Vérifier si le token d'accès est encore valide
    const now = Date.now();
    const tokenExpiry = new Date(zoomTokens.expiresAt).getTime();
    
    if (now >= tokenExpiry) {
      console.log('⏰ Token d\'accès Zoom expiré, tentative de refresh...');
      
      // Essayer de rafraîchir le token automatiquement
      try {
        const refreshed = await tokenManager.refreshAccessToken(decoded.zoomUserId);
        
        if (!refreshed) {
          console.error('❌ Impossible de rafraîchir le token Zoom');
          
          res.clearCookie('auth_token', { domain: 'localhost' });
          
          return res.status(401).json({
            success: false,
            error: 'Token Zoom expiré et impossible à rafraîchir',
            requiresAuth: true,
            needsReconnection: true
          });
        }
        
        console.log('✅ Token Zoom rafraîchi automatiquement');
      } catch (refreshError) {
        console.error('❌ Erreur lors du refresh automatique:', refreshError);
        
        res.clearCookie('auth_token');
        
        return res.status(401).json({
          success: false,
          error: 'Erreur lors du rafraîchissement du token',
          requiresAuth: true,
          needsReconnection: true
        });
      }
    }
    
    // Ajouter les informations utilisateur à la requête
    req.user = {
      zoomUserId: decoded.zoomUserId,
      email: decoded.email,
      displayName: decoded.displayName,
      accountId: decoded.accountId
    };
    
    // Log de l'activité utilisateur (optionnel)
    console.log(`🔐 Utilisateur authentifié: ${decoded.email} (${req.method} ${req.path})`);
    
    next();
    
  } catch (error) {
    console.error('❌ Erreur middleware authentification:', error);
    
    res.status(500).json({
      success: false,
      error: 'Erreur interne d\'authentification'
    });
  }
};

/**
 * Middleware optionnel - n'échoue pas si non authentifié
 * Utile pour des endpoints qui fonctionnent avec ou sans authentification
 */
export const optionalAuthMiddleware = async (req, res, next) => {
  try {
    const authToken = req.cookies.auth_token;
    
    if (!authToken) {
      req.user = null;
      return next();
    }
    
    try {
      const decoded = jwt.verify(authToken, process.env.JWT_SECRET);
      const zoomTokens = await tokenManager.getTokens(decoded.zoomUserId);
      
      if (zoomTokens) {
        req.user = {
          zoomUserId: decoded.zoomUserId,
          email: decoded.email,
          displayName: decoded.displayName,
          accountId: decoded.accountId
        };
      } else {
        req.user = null;
      }
      
    } catch (jwtError) {
      req.user = null;
    }
    
    next();
    
  } catch (error) {
    console.error('❌ Erreur middleware authentification optionnelle:', error);
    req.user = null;
    next();
  }
};

/**
 * Middleware pour vérifier les permissions spécifiques
 */
export const requirePermissions = (permissions = []) => {
  return async (req, res, next) => {
    try {
      // Ce middleware doit être utilisé après authMiddleware
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentification requise'
        });
      }
      
      // Récupérer les tokens pour vérifier les scopes
      const tokens = await tokenManager.getTokens(req.user.zoomUserId);
      
      if (!tokens || !tokens.scopes) {
        return res.status(403).json({
          success: false,
          error: 'Permissions insuffisantes'
        });
      }
      
      // Vérifier que tous les permissions requises sont présentes
      const userScopes = tokens.scopes.split(' ');
      const missingPermissions = permissions.filter(permission => !userScopes.includes(permission));
      
      if (missingPermissions.length > 0) {
        return res.status(403).json({
          success: false,
          error: 'Permissions insuffisantes',
          missing: missingPermissions,
          required: permissions
        });
      }
      
      next();
      
    } catch (error) {
      console.error('❌ Erreur vérification permissions:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la vérification des permissions'
      });
    }
  };
};

/**
 * Middleware pour limiter le taux de requêtes par utilisateur
 */
export const rateLimitMiddleware = (maxRequests = 100, windowMs = 60 * 1000) => {
  const requestCounts = new Map();
  
  return (req, res, next) => {
    const userId = req.user?.zoomUserId || req.ip;
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Nettoyer les anciens compteurs
    requestCounts.forEach((timestamps, key) => {
      const validTimestamps = timestamps.filter(timestamp => timestamp > windowStart);
      if (validTimestamps.length === 0) {
        requestCounts.delete(key);
      } else {
        requestCounts.set(key, validTimestamps);
      }
    });
    
    // Vérifier le taux pour cet utilisateur
    const userRequests = requestCounts.get(userId) || [];
    const recentRequests = userRequests.filter(timestamp => timestamp > windowStart);
    
    if (recentRequests.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        error: 'Trop de requêtes',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
    
    // Ajouter cette requête au compteur
    recentRequests.push(now);
    requestCounts.set(userId, recentRequests);
    
    // Ajouter des headers informatifs
    res.set({
      'X-RateLimit-Limit': maxRequests,
      'X-RateLimit-Remaining': Math.max(0, maxRequests - recentRequests.length - 1),
      'X-RateLimit-Reset': new Date(now + windowMs).toISOString()
    });
    
    next();
  };
};
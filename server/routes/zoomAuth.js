import express from 'express';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { TokenManager } from '../utils/tokenManager.js';

const router = express.Router();
const tokenManager = new TokenManager();

/**
 * GET /auth/zoom - Générer l'URL d'autorisation OAuth Zoom
 */
router.get('/zoom', (req, res) => {
  try {
    console.log('📨 Génération URL OAuth Zoom...');
    console.log('🔍 VALIDATION REDIRECT_URI:', process.env.ZOOM_REDIRECT_URI);
    
    const state = Math.random().toString(36).substring(2, 15);
    req.session.oauthState = state;
    
    const authUrl = new URL('https://zoom.us/oauth/authorize');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', process.env.ZOOM_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', process.env.ZOOM_REDIRECT_URI);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('scope', 'meeting:read meeting:write user:read');
    
    console.log('✅ URL OAuth générée:', authUrl.toString());
    console.log('🎯 REDIRECT_URI envoyé à Zoom:', process.env.ZOOM_REDIRECT_URI);
    
    res.json({
      success: true,
      authUrl: authUrl.toString(),
      state
    });
  } catch (error) {
    console.error('❌ Erreur génération URL OAuth:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la generation de URL OAuth'
    });
  }
});

/**
 * GET /auth/callback - BFF OAuth Callback - Traite le callback Zoom directement
 * Zoom redirige ici avec code et state dans query params
 */
router.get('/callback', async (req, res) => {
  // Définir baseUrl en dehors du try/catch
  const baseUrl = process.env.APP_PUBLIC_URL || 'http://localhost:5174';
  
  try {
    const { code, state, error } = req.query;
    
    console.log('🔄 BFF OAuth Callback reçu:', { 
      code: code?.substring(0, 10) + '...', 
      state, 
      error,
      origin: req.get('Origin'),
      referer: req.get('Referer')
    });
    
    // Gestion des erreurs OAuth de Zoom
    
    if (error) {
      console.error('❌ Erreur OAuth Zoom:', error);
      return res.redirect(`${baseUrl}/test?auth=error&message=${encodeURIComponent(error)}`);
    }
    
    if (!code) {
      console.error('❌ Code autorisation manquant');
      return res.redirect(`${baseUrl}/test?auth=error&message=missing_code`);
    }
    
    // Vérifier l'état CSRF
    if (state !== req.session.oauthState) {
      console.error('❌ État CSRF invalide', { reçu: state, attendu: req.session.oauthState });
      return res.redirect(`${baseUrl}/test?auth=error&message=invalid_csrf`);
    }
    
    // Échanger le code contre un token
    console.log('🔄 Échange token avec Zoom...');
    console.log('🎯 REDIRECT_URI utilisé pour échange:', process.env.ZOOM_REDIRECT_URI);
    
    const tokenData = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.ZOOM_REDIRECT_URI
    });
    
    const tokenResponse = await axios.post('https://zoom.us/oauth/token', tokenData, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    const { access_token, refresh_token, expires_in } = tokenResponse.data;
    console.log('✅ Tokens OAuth obtenus via BFF');
    
    // Obtenir les informations utilisateur Zoom
    const userResponse = await axios.get('https://api.zoom.us/v2/users/me', {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });
    
    const zoomUser = userResponse.data;
    console.log('✅ Infos utilisateur Zoom BFF:', zoomUser.email);
    
    // Stocker les tokens de manière sécurisée côté serveur
    await tokenManager.storeTokens(zoomUser.id, {
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresIn: expires_in,
      userInfo: zoomUser
    });
    
    // Stocker l'utilisateur dans la session (BFF Pattern)
    req.session.zoomUser = {
      id: zoomUser.id,
      email: zoomUser.email,
      displayName: zoomUser.display_name,
      accountId: zoomUser.account_id,
      accountType: zoomUser.type,
      authenticated: true,
      authenticatedAt: new Date().toISOString()
    };
    
    // Nettoyer l'état CSRF
    delete req.session.oauthState;
    
    console.log('✅ Session BFF créée pour utilisateur:', zoomUser.email);
    
    // Redirection vers l'interface avec succès
    res.redirect(`${baseUrl}/test?auth=success`);
    
  } catch (error) {
    console.error('❌ Erreur BFF OAuth callback:', error);
    
    if (error.response) {
      console.error('❌ Réponse erreur Zoom BFF:', error.response.data);
    }
    
    res.redirect(`${baseUrl}/test?auth=error&message=oauth_exchange_failed`);
  }
});

/**
 * POST /auth/callback - Ancien endpoint pour rétrocompatibilité
 */
router.post('/callback', async (req, res) => {
  try {
    const { code, state } = req.body;
    
    console.log('🔄 Échange code autorisation...', { code: code?.substring(0, 10) + '...', state });
    
    // Vérifier l'état CSRF
    if (state !== req.session.oauthState) {
      console.error('❌ État CSRF invalide');
      return res.status(400).json({
        success: false,
        error: 'État CSRF invalide'
      });
    }
    
    if (!code) {
      console.error('❌ Code autorisation manquant');
      return res.status(400).json({
        success: false,
        error: 'Code autorisation manquant'
      });
    }
    
    // Échanger le code contre un token (Legacy)
    console.log('🔄 Échange token avec Zoom (Legacy)...');
    console.log('🎯 REDIRECT_URI utilisé pour échange:', process.env.ZOOM_REDIRECT_URI);
    
    const tokenData = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.ZOOM_REDIRECT_URI
    });
    
    const tokenResponse = await axios.post('https://zoom.us/oauth/token', tokenData, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    const { access_token, refresh_token, expires_in } = tokenResponse.data;
    console.log('✅ Tokens OAuth obtenus');
    
    // Obtenir les informations utilisateur Zoom
    const userResponse = await axios.get('https://api.zoom.us/v2/users/me', {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });
    
    const zoomUser = userResponse.data;
    console.log('✅ Infos utilisateur Zoom:', zoomUser.email);
    
    // Créer un token JWT pour l'utilisateur
    const userToken = jwt.sign(
      { 
        zoomUserId: zoomUser.id,
        email: zoomUser.email,
        displayName: zoomUser.display_name,
        accountId: zoomUser.account_id
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Stocker les tokens de manière sécurisée
    await tokenManager.storeTokens(zoomUser.id, {
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresIn: expires_in,
      userInfo: zoomUser
    });
    
    // Nettoyer l'état de session
    delete req.session.oauthState;
    
    // Définir le cookie d'authentification partagé entre ports
    res.cookie('auth_token', userToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      domain: 'localhost', // Partagé entre tous ports localhost
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 jours
    });
    
    res.json({
      success: true,
      user: {
        id: zoomUser.id,
        email: zoomUser.email,
        displayName: zoomUser.display_name,
        accountId: zoomUser.account_id,
        accountType: zoomUser.type
      },
      token: userToken, // Retourner token pour localStorage
      message: 'Authentification réussie'
    });
    
  } catch (error) {
    console.error('❌ Erreur échange token:', error);
    
    if (error.response) {
      console.error('❌ Réponse erreur Zoom:', error.response.data);
      return res.status(400).json({
        success: false,
        error: 'Erreur authentification Zoom',
        details: error.response.data
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Erreur lors de echange du token'
    });
  }
});

/**
 * GET /auth/session - BFF Endpoint - Vérifier session utilisateur
 * Pattern BFF : Frontend interroge le backend pour le statut auth
 */
router.get('/session', async (req, res) => {
  try {
    console.log('🔍 BFF Vérification session...', { 
      sessionId: req.sessionID,
      hasZoomUser: !!req.session.zoomUser 
    });
    
    if (!req.session.zoomUser || !req.session.zoomUser.authenticated) {
      return res.json({
        success: false,
        authenticated: false,
        error: 'Session non authentifiée'
      });
    }
    
    const sessionUser = req.session.zoomUser;
    
    // Vérifier que les tokens Zoom sont encore valides
    const tokens = await tokenManager.getTokens(sessionUser.id);
    
    if (!tokens) {
      // Tokens expirés, nettoyer la session
      delete req.session.zoomUser;
      return res.json({
        success: false,
        authenticated: false,
        error: 'Tokens expirés, reconnexion requise'
      });
    }
    
    console.log('✅ Session BFF valide pour:', sessionUser.email);
    
    res.json({
      success: true,
      authenticated: true,
      user: {
        id: sessionUser.id,
        email: sessionUser.email,
        displayName: sessionUser.displayName,
        accountId: sessionUser.accountId,
        accountType: sessionUser.accountType,
        authenticatedAt: sessionUser.authenticatedAt
      },
      sessionValid: true
    });
    
  } catch (error) {
    console.error('❌ Erreur vérification session BFF:', error);
    res.status(500).json({
      success: false,
      authenticated: false,
      error: 'Erreur serveur lors de la vérification'
    });
  }
});

/**
 * GET /auth/me - Obtenir les informations de l'utilisateur connecté
 * Supporte token depuis cookies OU headers Authorization OU session BFF
 */
router.get('/me', async (req, res) => {
  try {
    // Récupérer token depuis cookies OU header Authorization
    let authToken = req.cookies.auth_token;
    
    if (!authToken) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        authToken = authHeader.substring(7);
      }
    }
    
    if (!authToken) {
      return res.status(401).json({
        success: false,
        error: 'Non authentifié'
      });
    }
    
    const decoded = jwt.verify(authToken, process.env.JWT_SECRET);
    const tokens = await tokenManager.getTokens(decoded.zoomUserId);
    
    if (!tokens) {
      return res.status(401).json({
        success: false,
        error: 'Tokens non trouvés'
      });
    }
    
    res.json({
      success: true,
      user: {
        id: decoded.zoomUserId,
        email: decoded.email,
        displayName: decoded.displayName,
        accountId: decoded.accountId
      },
      authenticated: true
    });
    
  } catch (error) {
    console.error('❌ Erreur vérification authentification:', error);
    res.status(401).json({
      success: false,
      error: 'Token invalide'
    });
  }
});

/**
 * POST /auth/logout - BFF Déconnexion - Nettoie session et tokens
 */
router.post('/logout', async (req, res) => {
  try {
    console.log('🔄 BFF Déconnexion...', { 
      sessionId: req.sessionID,
      hasZoomUser: !!req.session.zoomUser 
    });
    
    // Révoquer les tokens Zoom si session existe
    if (req.session.zoomUser?.id) {
      try {
        await tokenManager.revokeTokens(req.session.zoomUser.id);
        console.log('✅ Tokens révoqués pour utilisateur BFF:', req.session.zoomUser.email);
      } catch (error) {
        console.warn('⚠️ Erreur lors de la révocation des tokens BFF:', error);
      }
    }
    
    // Nettoyer la session
    if (req.session.zoomUser) {
      delete req.session.zoomUser;
    }
    
    // Optionnel: Détruire complètement la session
    req.session.destroy((err) => {
      if (err) {
        console.warn('⚠️ Erreur destruction session BFF:', err);
      }
    });
    
    // Supprimer les cookies d'authentification legacy
    res.clearCookie('auth_token', { domain: 'localhost' });
    res.clearCookie('auth_token', { domain: 'zoomapp.local' });
    
    console.log('✅ Déconnexion BFF réussie');
    
    res.json({
      success: true,
      authenticated: false,
      message: 'Déconnexion BFF réussie'
    });
    
  } catch (error) {
    console.error('❌ Erreur déconnexion BFF:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la déconnexion BFF'
    });
  }
});

/**
 * POST /auth/logout-legacy - Ancien endpoint pour rétrocompatibilité
 */
router.post('/logout-legacy', async (req, res) => {
  try {
    const authToken = req.cookies.auth_token;
    
    if (authToken) {
      try {
        const decoded = jwt.verify(authToken, process.env.JWT_SECRET);
        await tokenManager.revokeTokens(decoded.zoomUserId);
        console.log('✅ Tokens révoqués pour utilisateur:', decoded.email);
      } catch (error) {
        console.warn('⚠️ Erreur lors de la révocation des tokens:', error);
      }
    }
    
    // Supprimer le cookie d'authentification sur tous ports localhost
    res.clearCookie('auth_token', { domain: 'localhost' });
    
    res.json({
      success: true,
      message: 'Déconnexion réussie'
    });
    
  } catch (error) {
    console.error('❌ Erreur déconnexion:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la déconnexion'
    });
  }
});

export default router;
// 🪝 Hook React pour gérer l'authentification Zoom
// Hook personnalisé pour l'état de connexion Zoom avec Supabase OAuth
// ====================================================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { zoomOAuthService } from '../services/zoomOAuthService';
import { ZoomAuthState, ZoomUser } from '../types/zoom';

interface UseZoomAuthReturn {
  // État
  isConnected: boolean;
  isLoading: boolean;
  user: ZoomUser | null;
  error: string | null;
  session: any | null;

  // Actions
  connect: () => Promise<boolean>;
  disconnect: () => Promise<boolean>;
  refresh: () => Promise<void>;
  getUserInfo: () => Promise<ZoomUser | null>;
  sendTokensToN8n: () => Promise<boolean>;

  // Utilitaires
  getTokens: () => Promise<any>;
  checkConnection: () => Promise<boolean>;
}

/**
 * 🪝 Hook principal pour l'authentification Zoom
 * Gère automatiquement l'état et fournit les méthodes nécessaires
 */
export const useZoomAuth = (): UseZoomAuthReturn => {
  const [state, setState] = useState<ZoomAuthState>({
    isConnected: false,
    isLoading: true,
    user: null,
    error: null,
    session: null
  });

  // Mettre à jour l'état
  const updateState = useCallback((updates: Partial<ZoomAuthState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Vérifier la connexion existante
  const checkConnection = useCallback(async (): Promise<boolean> => {
    try {
      updateState({ isLoading: true, error: null });
      
      const session = await zoomOAuthService.getCurrentZoomSession();
      const isConnected = !!session?.provider_token;
      
      if (isConnected && session) {
        // Récupérer les infos utilisateur si connecté
        const userInfo = await zoomOAuthService.getZoomUserInfo();
        
        updateState({
          isConnected: true,
          user: userInfo,
          session: session,
          error: null,
          isLoading: false
        });
      } else {
        updateState({
          isConnected: false,
          user: null,
          session: null,
          error: null,
          isLoading: false
        });
      }
      
      return isConnected;
    } catch (err) {
      console.error('❌ Erreur vérification connexion Zoom:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur de vérification';
      
      updateState({
        isConnected: false,
        user: null,
        session: null,
        error: errorMessage,
        isLoading: false
      });
      
      return false;
    }
  }, [updateState]);

  // Se connecter à Zoom
  const connect = useCallback(async (): Promise<boolean> => {
    try {
      updateState({ isLoading: true, error: null });
      
      const result = await zoomOAuthService.signInWithZoom();
      
      if (result.success) {
        console.log('✅ Connexion Zoom initiée');
        
        // La vérification se fera après la redirection OAuth
        updateState({ 
          isLoading: false,
          error: null 
        });
        
        return true;
      } else {
        updateState({
          isLoading: false,
          error: result.error || 'Erreur de connexion'
        });
        
        return false;
      }
    } catch (err) {
      console.error('❌ Erreur connexion Zoom:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur de connexion';
      
      updateState({
        isLoading: false,
        error: errorMessage
      });
      
      return false;
    }
  }, [updateState]);

  // Se déconnecter de Zoom
  const disconnect = useCallback(async (): Promise<boolean> => {
    try {
      updateState({ isLoading: true, error: null });
      
      const success = await zoomOAuthService.signOutFromZoom();
      
      if (success) {
        updateState({
          isConnected: false,
          user: null,
          session: null,
          error: null,
          isLoading: false
        });
        
        console.log('✅ Déconnexion Zoom réussie');
        return true;
      } else {
        updateState({
          isLoading: false,
          error: 'Erreur de déconnexion'
        });
        
        return false;
      }
    } catch (err) {
      console.error('❌ Erreur déconnexion Zoom:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur de déconnexion';
      
      updateState({
        isLoading: false,
        error: errorMessage
      });
      
      return false;
    }
  }, [updateState]);

  // Rafraîchir les tokens
  const refresh = useCallback(async (): Promise<void> => {
    try {
      updateState({ isLoading: true, error: null });
      
      const result = await zoomOAuthService.refreshTokens();
      
      if (result.success) {
        await checkConnection();
        console.log('✅ Tokens rafraîchis');
      } else {
        updateState({
          isLoading: false,
          error: result.error || 'Erreur de rafraîchissement'
        });
      }
    } catch (err) {
      console.error('❌ Erreur rafraîchissement tokens:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur de rafraîchissement';
      
      updateState({
        isLoading: false,
        error: errorMessage
      });
    }
  }, [updateState, checkConnection]);

  // Obtenir les informations utilisateur
  const getUserInfo = useCallback(async (): Promise<ZoomUser | null> => {
    try {
      const userInfo = await zoomOAuthService.getZoomUserInfo();
      
      if (userInfo) {
        updateState({ user: userInfo });
      }
      
      return userInfo;
    } catch (err) {
      console.error('❌ Erreur récupération info utilisateur:', err);
      return null;
    }
  }, [updateState]);

  // Envoyer les tokens à n8n
  const sendTokensToN8n = useCallback(async (): Promise<boolean> => {
    try {
      const success = await zoomOAuthService.sendTokensToN8n();
      
      if (success) {
        console.log('✅ Tokens envoyés à n8n');
      } else {
        console.log('❌ Échec envoi tokens à n8n');
      }
      
      return success;
    } catch (err) {
      console.error('❌ Erreur envoi tokens n8n:', err);
      return false;
    }
  }, []);

  // Obtenir les tokens
  const getTokens = useCallback(async () => {
    try {
      return await zoomOAuthService.getZoomTokens();
    } catch (err) {
      console.error('❌ Erreur récupération tokens:', err);
      return null;
    }
  }, []);

  // Vérifier la connexion au montage du composant
  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  // Écouter les changements de session Supabase
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Changement auth Supabase:', event);
      
      if (event === 'SIGNED_IN' && session?.provider_token) {
        // Nouvelle connexion OAuth
        await checkConnection();
        
        // Envoyer automatiquement les tokens à n8n
        setTimeout(async () => {
          await sendTokensToN8n();
        }, 1000);
      } else if (event === 'SIGNED_OUT') {
        // Déconnexion
        updateState({
          isConnected: false,
          user: null,
          session: null,
          error: null,
          isLoading: false
        });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [checkConnection, sendTokensToN8n, updateState]);

  return {
    // État
    isConnected: state.isConnected,
    isLoading: state.isLoading,
    user: state.user,
    error: state.error,
    session: state.session,

    // Actions
    connect,
    disconnect,
    refresh,
    getUserInfo,
    sendTokensToN8n,

    // Utilitaires
    getTokens,
    checkConnection
  };
};
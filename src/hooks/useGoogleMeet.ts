// 🪝 Hook React pour gérer Google Meet
// Hook personnalisé pour l'état de connexion et réunions Google Meet
// ===================================================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { googleMeetService } from '../services/googleMeetService';
import { 
  GoogleAuthState, 
  GoogleUser, 
  GoogleCalendarEvent,
  CreateMeetingRequest,
  GoogleMeetingResponse
} from '../types/google-meet';

interface UseGoogleMeetReturn {
  // État
  isConnected: boolean;
  isLoading: boolean;
  user: GoogleUser | null;
  error: string | null;
  session: any | null;

  // Actions
  connect: () => Promise<boolean>;
  disconnect: () => Promise<boolean>;
  refresh: () => Promise<void>;
  getUserInfo: () => Promise<GoogleUser | null>;
  sendTokensToN8n: () => Promise<boolean>;

  // Réunions
  createMeeting: (request: CreateMeetingRequest) => Promise<GoogleMeetingResponse>;
  getMeetings: (maxResults?: number) => Promise<GoogleCalendarEvent[]>;
  deleteMeeting: (eventId: string) => Promise<boolean>;

  // Utilitaires
  getTokens: () => Promise<any>;
  checkConnection: () => Promise<boolean>;
}

/**
 * 🪝 Hook principal pour Google Meet
 * Gère automatiquement l'état et fournit les méthodes nécessaires
 */
export const useGoogleMeet = (): UseGoogleMeetReturn => {
  const [state, setState] = useState<GoogleAuthState>({
    isConnected: false,
    isLoading: true,
    user: null,
    error: null,
    session: null
  });

  // Mettre à jour l'état
  const updateState = useCallback((updates: Partial<GoogleAuthState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Vérifier la connexion existante
  const checkConnection = useCallback(async (): Promise<boolean> => {
    try {
      updateState({ isLoading: true, error: null });
      
      const session = await googleMeetService.getCurrentGoogleSession();
      const isConnected = !!session?.access_token;
      
      if (isConnected && session) {
        // Récupérer les infos utilisateur si connecté
        const userInfo = await googleMeetService.getGoogleUserInfo();
        
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
      console.error('❌ Erreur vérification connexion Google:', err);
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

  // Se connecter à Google Meet
  const connect = useCallback(async (): Promise<boolean> => {
    try {
      updateState({ isLoading: true, error: null });
      
      const result = await googleMeetService.signInWithGoogle();
      
      if (result.success) {
        console.log('✅ Connexion Google Meet initiée');
        
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
      console.error('❌ Erreur connexion Google:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur de connexion';
      
      updateState({
        isLoading: false,
        error: errorMessage
      });
      
      return false;
    }
  }, [updateState]);

  // Se déconnecter de Google Meet
  const disconnect = useCallback(async (): Promise<boolean> => {
    try {
      updateState({ isLoading: true, error: null });
      
      const success = await googleMeetService.signOutFromGoogle();
      
      if (success) {
        updateState({
          isConnected: false,
          user: null,
          session: null,
          error: null,
          isLoading: false
        });
        
        console.log('✅ Déconnexion Google Meet réussie');
        return true;
      } else {
        updateState({
          isLoading: false,
          error: 'Erreur de déconnexion'
        });
        
        return false;
      }
    } catch (err) {
      console.error('❌ Erreur déconnexion Google:', err);
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
      
      const result = await googleMeetService.refreshTokens();
      
      if (result.success) {
        await checkConnection();
        console.log('✅ Tokens Google rafraîchis');
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
  const getUserInfo = useCallback(async (): Promise<GoogleUser | null> => {
    try {
      const userInfo = await googleMeetService.getGoogleUserInfo();
      
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
      const success = await googleMeetService.sendTokensToN8n();
      
      if (success) {
        console.log('✅ Tokens Google envoyés à n8n');
      } else {
        console.log('❌ Échec envoi tokens Google à n8n');
      }
      
      return success;
    } catch (err) {
      console.error('❌ Erreur envoi tokens Google n8n:', err);
      return false;
    }
  }, []);

  // Créer une réunion Google Meet
  const createMeeting = useCallback(async (request: CreateMeetingRequest): Promise<GoogleMeetingResponse> => {
    try {
      if (!state.isConnected) {
        return {
          success: false,
          error: 'Non connecté à Google'
        };
      }

      const result = await googleMeetService.createMeeting(request);
      
      if (result.success) {
        console.log('✅ Réunion Google Meet créée:', result.meetingUrl);
      }
      
      return result;
    } catch (err) {
      console.error('❌ Erreur création réunion:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Erreur de création'
      };
    }
  }, [state.isConnected]);

  // Récupérer les réunions
  const getMeetings = useCallback(async (maxResults: number = 10): Promise<GoogleCalendarEvent[]> => {
    try {
      if (!state.isConnected) {
        return [];
      }

      return await googleMeetService.getMeetings(maxResults);
    } catch (err) {
      console.error('❌ Erreur récupération réunions:', err);
      return [];
    }
  }, [state.isConnected]);

  // Supprimer une réunion
  const deleteMeeting = useCallback(async (eventId: string): Promise<boolean> => {
    try {
      if (!state.isConnected) {
        return false;
      }

      const success = await googleMeetService.deleteMeeting(eventId);
      
      if (success) {
        console.log('✅ Réunion supprimée');
      }
      
      return success;
    } catch (err) {
      console.error('❌ Erreur suppression réunion:', err);
      return false;
    }
  }, [state.isConnected]);

  // Obtenir les tokens
  const getTokens = useCallback(async () => {
    try {
      return await googleMeetService.getGoogleTokens();
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
      console.log('🔄 Changement auth Supabase (Google):', event);
      
      if (event === 'SIGNED_IN' && session?.provider_token && session?.user?.app_metadata?.provider === 'google') {
        // Nouvelle connexion OAuth Google
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

    // Réunions
    createMeeting,
    getMeetings,
    deleteMeeting,

    // Utilitaires
    getTokens,
    checkConnection
  };
};
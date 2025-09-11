// 🎣 Hook React pour gestion Zoom via Supabase OAuth
// Remplace les hooks complexes existants par une interface simplifiée
// ================================================================

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../components/AuthProvider';
import { 
  isZoomConnected,
  getZoomTokensFromSession,
  makeZoomApiCall,
  signInWithZoomOAuth,
  disconnectZoom
} from '../services/supabaseZoomAuth';

interface ZoomUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  account_id: string;
}

interface ZoomMeeting {
  id: number;
  topic: string;
  start_time: string;
  duration: number;
  join_url: string;
  password?: string;
}

interface UseSupabaseZoomReturn {
  // État
  isConnected: boolean;
  loading: boolean;
  error: string | null;
  user: ZoomUser | null;
  tokens: any;
  
  // Actions
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  refresh: () => Promise<void>;
  
  // API Zoom
  createMeeting: (topic: string, startTime?: Date, duration?: number) => Promise<ZoomMeeting>;
  getMeetings: () => Promise<ZoomMeeting[]>;
  getUser: () => Promise<ZoomUser>;
}

/**
 * 🎣 Hook pour gestion complète de Zoom via Supabase OAuth
 * Interface simple et unifiée remplaçant tous les hooks existants
 */
export const useSupabaseZoom = (): UseSupabaseZoomReturn => {
  const { user: authUser } = useAuth();
  
  // État local
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoomUser, setZoomUser] = useState<ZoomUser | null>(null);
  const [tokens, setTokens] = useState<any>(null);

  // Initialisation et vérification de l'état
  useEffect(() => {
    if (authUser) {
      checkConnectionState();
    } else {
      resetState();
    }
  }, [authUser]);

  // Réinitialiser l'état
  const resetState = useCallback(() => {
    setIsConnected(false);
    setZoomUser(null);
    setTokens(null);
    setError(null);
  }, []);

  // Vérifier l'état de connexion
  const checkConnectionState = useCallback(async () => {
    if (!authUser) return;

    try {
      setLoading(true);
      setError(null);
      
      const connected = await isZoomConnected();
      setIsConnected(connected);
      
      if (connected) {
        const sessionTokens = await getZoomTokensFromSession();
        setTokens(sessionTokens);
        
        // Récupérer les infos utilisateur Zoom
        try {
          const userInfo = await getUser();
          setZoomUser(userInfo);
        } catch (userError) {
          console.warn('⚠️ Erreur récupération user Zoom (non bloquant):', userError);
        }
      }
      
    } catch (err) {
      console.error('❌ Erreur vérification connexion Zoom:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  }, [authUser]);

  // Connecter Zoom
  const connect = useCallback(async () => {
    if (!authUser) {
      throw new Error('Utilisateur non authentifié');
    }

    try {
      setLoading(true);
      setError(null);
      
      const result = await signInWithZoomOAuth();
      
      if (!result.success) {
        throw new Error(result.error || 'Erreur connexion Zoom');
      }
      
      // L'état sera mis à jour après redirection
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur connexion Zoom';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [authUser]);

  // Déconnecter Zoom
  const disconnect = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await disconnectZoom();
      
      if (!result.success) {
        throw new Error(result.error || 'Erreur déconnexion Zoom');
      }
      
      resetState();
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur déconnexion Zoom';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [resetState]);

  // Actualiser l'état
  const refresh = useCallback(async () => {
    await checkConnectionState();
  }, [checkConnectionState]);

  // Récupérer les informations utilisateur Zoom
  const getUser = useCallback(async (): Promise<ZoomUser> => {
    if (!isConnected) {
      throw new Error('Zoom non connecté');
    }

    try {
      const response = await makeZoomApiCall('/users/me');
      
      if (!response.ok) {
        throw new Error(`Erreur API Zoom: ${response.status}`);
      }
      
      const userData = await response.json();
      
      const user: ZoomUser = {
        id: userData.id,
        first_name: userData.first_name,
        last_name: userData.last_name,
        email: userData.email,
        account_id: userData.account_id
      };
      
      return user;
      
    } catch (err) {
      console.error('❌ Erreur récupération user Zoom:', err);
      throw err;
    }
  }, [isConnected]);

  // Créer une réunion Zoom
  const createMeeting = useCallback(async (
    topic: string, 
    startTime?: Date, 
    duration: number = 60
  ): Promise<ZoomMeeting> => {
    if (!isConnected) {
      throw new Error('Zoom non connecté');
    }

    try {
      const meetingData = {
        topic,
        type: startTime ? 2 : 1, // 1=instant, 2=scheduled
        start_time: startTime?.toISOString(),
        duration,
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: false,
          mute_upon_entry: true
        }
      };

      const response = await makeZoomApiCall('/users/me/meetings', {
        method: 'POST',
        body: JSON.stringify(meetingData)
      });
      
      if (!response.ok) {
        throw new Error(`Erreur création meeting: ${response.status}`);
      }
      
      const meeting = await response.json();
      
      return {
        id: meeting.id,
        topic: meeting.topic,
        start_time: meeting.start_time,
        duration: meeting.duration,
        join_url: meeting.join_url,
        password: meeting.password
      };
      
    } catch (err) {
      console.error('❌ Erreur création meeting Zoom:', err);
      throw err;
    }
  }, [isConnected]);

  // Récupérer les réunions
  const getMeetings = useCallback(async (): Promise<ZoomMeeting[]> => {
    if (!isConnected) {
      throw new Error('Zoom non connecté');
    }

    try {
      const response = await makeZoomApiCall('/users/me/meetings');
      
      if (!response.ok) {
        throw new Error(`Erreur récupération meetings: ${response.status}`);
      }
      
      const data = await response.json();
      
      return data.meetings?.map((meeting: any) => ({
        id: meeting.id,
        topic: meeting.topic,
        start_time: meeting.start_time,
        duration: meeting.duration,
        join_url: meeting.join_url,
        password: meeting.password
      })) || [];
      
    } catch (err) {
      console.error('❌ Erreur récupération meetings Zoom:', err);
      throw err;
    }
  }, [isConnected]);

  return {
    // État
    isConnected,
    loading,
    error,
    user: zoomUser,
    tokens,
    
    // Actions
    connect,
    disconnect,
    refresh,
    
    // API Zoom
    createMeeting,
    getMeetings,
    getUser
  };
};

export default useSupabaseZoom;
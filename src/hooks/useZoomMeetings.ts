// 🪝 Hook React pour la gestion des réunions Zoom
// Gestion complète des réunions Zoom avec intégration n8n
// ======================================================

import { useState, useCallback } from 'react';
import { useZoomAuth } from './useZoomAuth';
import { ZoomMeeting, ZoomMeetingCreateRequest } from '../types/zoom';

interface UseZoomMeetingsReturn {
  // État
  meetings: ZoomMeeting[];
  isLoading: boolean;
  error: string | null;

  // Actions
  createMeeting: (meetingData: ZoomMeetingCreateRequest) => Promise<ZoomMeeting | null>;
  getMeetings: () => Promise<ZoomMeeting[]>;
  getMeeting: (meetingId: string) => Promise<ZoomMeeting | null>;
  updateMeeting: (meetingId: string, updates: Partial<ZoomMeetingCreateRequest>) => Promise<boolean>;
  deleteMeeting: (meetingId: string) => Promise<boolean>;
  
  // Utilitaires
  refresh: () => Promise<void>;
  sendMeetingToN8n: (meeting: ZoomMeeting, action: string) => Promise<boolean>;
}

/**
 * 🪝 Hook pour la gestion des réunions Zoom
 * Utilise l'API Zoom avec les tokens gérés par useZoomAuth
 */
export const useZoomMeetings = (): UseZoomMeetingsReturn => {
  const { isConnected, getTokens } = useZoomAuth();
  const [meetings, setMeetings] = useState<ZoomMeeting[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Effectuer une requête API Zoom authentifiée
  const makeZoomApiRequest = useCallback(async (
    endpoint: string,
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
    body?: any
  ): Promise<any> => {
    if (!isConnected) {
      throw new Error('Non connecté à Zoom');
    }

    const tokens = await getTokens();
    if (!tokens?.access_token) {
      throw new Error('Tokens Zoom non disponibles');
    }

    const response = await fetch(`https://api.zoom.us/v2${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Erreur API Zoom: ${response.status}`);
    }

    return await response.json();
  }, [isConnected, getTokens]);

  // Créer une nouvelle réunion
  const createMeeting = useCallback(async (
    meetingData: ZoomMeetingCreateRequest
  ): Promise<ZoomMeeting | null> => {
    try {
      setIsLoading(true);
      setError(null);

      const meetingPayload = {
        topic: meetingData.topic,
        type: meetingData.type || 2, // Scheduled meeting par défaut
        start_time: meetingData.start_time,
        duration: meetingData.duration || 60,
        timezone: meetingData.timezone || 'Europe/Paris',
        password: meetingData.password,
        agenda: meetingData.agenda,
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: false,
          mute_upon_entry: false,
          watermark: false,
          use_pmi: false,
          approval_type: 2,
          audio: 'both',
          auto_recording: 'none',
          waiting_room: true,
          ...meetingData.settings
        }
      };

      const response = await makeZoomApiRequest('/users/me/meetings', 'POST', meetingPayload);
      
      const newMeeting = response as ZoomMeeting;
      setMeetings(prev => [newMeeting, ...prev]);
      
      // Envoyer à n8n pour les workflows
      await sendMeetingToN8n(newMeeting, 'created');
      
      console.log('✅ Réunion créée:', newMeeting.id);
      return newMeeting;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur création réunion';
      console.error('❌ Erreur création réunion:', err);
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [makeZoomApiRequest]);

  // Récupérer la liste des réunions
  const getMeetings = useCallback(async (): Promise<ZoomMeeting[]> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await makeZoomApiRequest('/users/me/meetings?type=scheduled');
      const meetingsList = response.meetings || [];
      
      setMeetings(meetingsList);
      console.log(`✅ ${meetingsList.length} réunions récupérées`);
      
      return meetingsList;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur récupération réunions';
      console.error('❌ Erreur récupération réunions:', err);
      setError(errorMessage);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [makeZoomApiRequest]);

  // Récupérer une réunion spécifique
  const getMeeting = useCallback(async (meetingId: string): Promise<ZoomMeeting | null> => {
    try {
      setIsLoading(true);
      setError(null);

      const meeting = await makeZoomApiRequest(`/meetings/${meetingId}`);
      console.log('✅ Réunion récupérée:', meetingId);
      
      return meeting;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur récupération réunion';
      console.error('❌ Erreur récupération réunion:', err);
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [makeZoomApiRequest]);

  // Mettre à jour une réunion
  const updateMeeting = useCallback(async (
    meetingId: string, 
    updates: Partial<ZoomMeetingCreateRequest>
  ): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      await makeZoomApiRequest(`/meetings/${meetingId}`, 'PATCH', updates);
      
      // Mettre à jour la liste locale
      setMeetings(prev => prev.map(meeting => 
        meeting.id === meetingId 
          ? { ...meeting, ...updates }
          : meeting
      ));
      
      console.log('✅ Réunion mise à jour:', meetingId);
      return true;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur mise à jour réunion';
      console.error('❌ Erreur mise à jour réunion:', err);
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [makeZoomApiRequest]);

  // Supprimer une réunion
  const deleteMeeting = useCallback(async (meetingId: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      await makeZoomApiRequest(`/meetings/${meetingId}`, 'DELETE');
      
      // Retirer de la liste locale
      setMeetings(prev => prev.filter(meeting => meeting.id !== meetingId));
      
      console.log('✅ Réunion supprimée:', meetingId);
      return true;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur suppression réunion';
      console.error('❌ Erreur suppression réunion:', err);
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [makeZoomApiRequest]);

  // Envoyer les données de réunion à n8n
  const sendMeetingToN8n = useCallback(async (
    meeting: ZoomMeeting, 
    action: string
  ): Promise<boolean> => {
    try {
      const webhookUrl = import.meta.env.VITE_N8N_ZOOM_WEBHOOK;
      if (!webhookUrl) {
        console.log('❌ URL webhook n8n non configurée');
        return false;
      }

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          event: `meeting_${action}`,
          meeting: meeting,
          action: action,
          timestamp: new Date().toISOString(),
          source: 'centrinote_zoom_meetings'
        })
      });

      if (!response.ok) {
        throw new Error(`Erreur webhook n8n: ${response.status}`);
      }

      console.log(`✅ Réunion ${action} envoyée à n8n:`, meeting.id);
      return true;

    } catch (err) {
      console.error('❌ Erreur envoi réunion à n8n:', err);
      return false;
    }
  }, []);

  // Rafraîchir la liste
  const refresh = useCallback(async (): Promise<void> => {
    await getMeetings();
  }, [getMeetings]);

  return {
    // État
    meetings,
    isLoading,
    error,

    // Actions
    createMeeting,
    getMeetings,
    getMeeting,
    updateMeeting,
    deleteMeeting,
    
    // Utilitaires
    refresh,
    sendMeetingToN8n
  };
};
// 🎥 Hook pour gérer les réunions Daily.co avec Supabase
import { useState, useEffect, useCallback, useMemo, useRef, createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthProvider';

export interface Meeting {
  id: string;
  room_name: string;
  room_url: string;
  title: string;
  description?: string;
  scheduled_at?: string;
  duration_minutes: number;
  participants: string[];
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  started_at?: string;
  ended_at?: string;
  recording_url?: string;
  recording_id?: string;
  transcript?: string;
  ai_summary?: any;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateMeetingData {
  title: string;
  description?: string;
  scheduled_at?: string;
  duration_minutes?: number;
  participants?: string[] | MeetingParticipant[]; // Supporte les deux formats pour compatibilité
  enable_ai_summary?: boolean; // Activer l'enregistrement et le résumé automatique
}

export interface UpdateMeetingData {
  title?: string;
  description?: string;
  scheduled_at?: string;
  duration_minutes?: number;
  participants?: string[];
  status?: Meeting['status'];
  started_at?: string;
  ended_at?: string;
  recording_url?: string;
  recording_id?: string;
  transcript?: string;
  ai_summary?: any;
}

// 🔧 HELPERS HOISTÉS (function declarations pour éviter TDZ)

async function fetchMeetingsHelper(
  user: any, 
  setLoading: (loading: boolean) => void,
  setError: (error: string | null) => void,
  setMeetings: (meetings: Meeting[]) => void
) {
  if (!user) {
    console.log('❌ [MEETINGS] fetchMeetings appelé sans utilisateur');
    return;
  }
  
  setLoading(true);
  setError(null);

  try {
    // Vérifier la session avant l'appel
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return fetchMeetingsHelper(user, setLoading, setError, setMeetings); // Retry une fois
    }

    // 🚀 PERFORMANCE: Optimiser la requête Supabase
    const { data, error: fetchError } = await supabase
      .from('meetings')
      .select(`
        id, room_name, room_url, title, description, scheduled_at,
        duration_minutes, participants, status, started_at, ended_at,
        recording_url, recording_id, transcript, ai_summary,
        created_by, created_at, updated_at
      `)
      .eq('created_by', user.id)
      .order('created_at', { ascending: false })
      .limit(50); // Limiter à 50 réunions récentes

    if (fetchError) {
      // Si erreur d'auth, attendre et retry
      if (fetchError.message.includes('401') || fetchError.message.includes('JWT')) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return fetchMeetingsHelper(user, setLoading, setError, setMeetings);
      }

      throw fetchError;
    }

    setMeetings(data || []);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Erreur de chargement';
    setError(errorMsg);
    console.error('❌ [MEETINGS] Erreur chargement:', err);
  } finally {
    setLoading(false);
  }
}

function setupRealtimeSubscriptionHelper(user: any, setMeetings: (fn: (prev: Meeting[]) => Meeting[]) => void) {
  if (!user) return;

  const subscription = supabase
    .channel('meetings_channel')
    .on('postgres_changes', 
      { 
        event: '*', 
        schema: 'public', 
        table: 'meetings',
        filter: `created_by=eq.${user.id}`
      },
      (payload) => {
        console.log('🔄 [MEETINGS] Changement temps réel:', payload);
        
        if (payload.eventType === 'INSERT') {
          setMeetings(prev => [payload.new as Meeting, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setMeetings(prev => prev.map(m => 
            m.id === payload.new.id ? payload.new as Meeting : m
          ));
        } else if (payload.eventType === 'DELETE') {
          setMeetings(prev => prev.filter(m => m.id !== payload.old.id));
        }
      }
    )
    .subscribe();

  return () => subscription.unsubscribe();
}

async function createMeetingHelper(
  meetingData: CreateMeetingData,
  user: any,
  setError: (error: string | null) => void
) {
  if (!user) {
    throw new Error('Utilisateur non connecté');
  }

  setError(null);
  
  try {
    // Normaliser le format des participants si nécessaire
    // create-meeting-v3 attend: [{name, email, role}]
    let normalizedParticipants = meetingData.participants;
    if (normalizedParticipants && normalizedParticipants.length > 0) {
      // Si c'est un tableau de strings (emails), convertir en objets
      if (typeof normalizedParticipants[0] === 'string') {
        console.log(`📋 [MEETINGS] Conversion participants strings → objets:`, normalizedParticipants);
        normalizedParticipants = (normalizedParticipants as string[]).map(email => ({
          name: email.split('@')[0], // Nom par défaut depuis l'email
          email: email,
          role: 'guest' as const
        }));
      }
    }
    
    const payload = {
      ...meetingData,
      participants: normalizedParticipants || [],
      created_by: user.id
    };
    
    console.log(`📤 [MEETINGS] Payload envoyé à create-meeting-v3:`, {
      title: payload.title,
      participantsCount: payload.participants?.length || 0,
      participants: payload.participants
    });
    
    // Appeler la fonction Netlify pour créer la salle Daily.co + entrée Supabase
    const response = await fetch('/.netlify/functions/create-meeting-v3', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    
    if (!data.success) {
      console.error('[DAILY] create failed detail:', data);
      throw new Error(`Erreur Daily (${response.status}): ${data.detail || data.reason || 'inconnue'}`);
    }

    const result = data;
    console.log('✅ [MEETINGS] Réunion créée:', result);
    
    return result;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Erreur création réunion';
    setError(errorMsg);
    console.error('❌ [MEETINGS] Erreur création:', err);
    throw err;
  }
}

async function updateMeetingHelper(
  id: string,
  updates: UpdateMeetingData,
  user: any,
  setError: (error: string | null) => void
) {
  if (!user) {
    throw new Error('Utilisateur non connecté');
  }

  setError(null);
  
  try {
    // Préparer les données de mise à jour
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    console.log('📝 [MEETINGS] Mise à jour réunion:', { id, updateData, userId: user.id });
    
    // Première requête : UPDATE
    const { error: updateError } = await supabase
      .from('meetings')
      .update(updateData)
      .eq('id', id)
      .eq('created_by', user.id);
    
    if (updateError) {
      console.error('❌ [MEETINGS] Erreur UPDATE:', updateError);
      throw updateError;
    }
    
    // Deuxième requête : SELECT pour récupérer les données mises à jour
    const { data, error: selectError } = await supabase
      .from('meetings')
      .select('*')
      .eq('id', id)
      .eq('created_by', user.id)
      .single();
    
    if (selectError) {
      console.error('❌ [MEETINGS] Erreur SELECT après UPDATE:', selectError);
      // Ne pas échouer si la sélection échoue, l'update a réussi
      console.warn('⚠️ [MEETINGS] UPDATE réussi mais SELECT échoué, continuation...');
      return { data: null, error: null }; // L'update a réussi même si le select échoue
    }
    
    console.log('✅ [MEETINGS] Réunion mise à jour:', data);
    return { data, error: null };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Erreur mise à jour réunion';
    const errorDetails = err instanceof Error ? err.toString() : String(err);
    console.error('❌ [MEETINGS] Erreur mise à jour:', { errorMsg, errorDetails, err });
    setError(errorMsg);
    return { data: null, error: errorMsg };
  }
}

async function deleteMeetingHelper(
  id: string,
  user: any,
  setError: (error: string | null) => void
) {
  if (!user) {
    throw new Error('Utilisateur non connecté');
  }

  setError(null);
  
  try {
    // Appeler la fonction Netlify pour supprimer la salle Daily.co + entrée Supabase
    const response = await fetch('/.netlify/functions/delete-meeting', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ meetingId: id })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erreur suppression réunion');
    }

    console.log('✅ [MEETINGS] Réunion supprimée:', id);
    return { error: null };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Erreur suppression réunion';
    setError(errorMsg);
    console.error('❌ [MEETINGS] Erreur suppression:', err);
    return { error: errorMsg };
  }
}

interface MeetingsContextValue {
  meetings: Meeting[];
  loading: boolean;
  error: string | null;
  createMeeting: (meetingData: CreateMeetingData) => Promise<any>;
  updateMeeting: (id: string, updates: UpdateMeetingData) => Promise<{ data: any; error: string | null }>;
  deleteMeeting: (id: string) => Promise<{ error: string | null }>;
  startMeeting: (id: string) => Promise<{ data: any; error: string | null }>;
  endMeeting: (id: string) => Promise<{ data: any; error: string | null }>;
  cancelMeeting: (id: string) => Promise<{ data: any; error: string | null }>;
  refresh: () => Promise<void>;
  scheduledMeetings: Meeting[];
  activeMeetings: Meeting[];
  completedMeetings: Meeting[];
  upcomingMeetings: Meeting[];
  totalMeetings: number;
  activeCount: number;
  completedCount: number;
  setMeetings: React.Dispatch<React.SetStateAction<Meeting[]>>;
}

const MeetingsContext = createContext<MeetingsContextValue | undefined>(undefined);

export function MeetingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const fetchInProgressRef = useRef(false);

  const fetchMeetings = useCallback(async () => {
    if (!user) {
      setMeetings([]);
      setLoading(false);
      return;
    }

    if (fetchInProgressRef.current) {
      console.log('[MEETINGS] Fetch déjà en cours, skip');
      return;
    }

    fetchInProgressRef.current = true;
    try {
      await fetchMeetingsHelper(user, setLoading, setError, setMeetings);
    } finally {
      fetchInProgressRef.current = false;
    }
  }, [user]);

  // 🚀 PERFORMANCE: Utiliser un ref pour éviter les re-fetches inutiles
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!user) {
      setMeetings([]);
      setLoading(false);
      initializedRef.current = false;
      return;
    }

    // Fetch seulement si pas encore initialisé
    if (!initializedRef.current) {
      initializedRef.current = true;
      setLoading(true);
      fetchMeetings();
    }
  }, [user, fetchMeetings]);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = setupRealtimeSubscriptionHelper(user, setMeetings);
    return () => {
      try {
        unsubscribe?.();
      } catch (e) {
        console.debug('[MEETINGS] Erreur désabonnement realtime:', e);
      }
    };
  }, [user]);

  const createMeeting = useCallback(async (meetingData: CreateMeetingData) => {
    const result = await createMeetingHelper(meetingData, user, setError);

    if (result?.success) {
      const newMeeting = result.meeting || result.meetingData;
      if (newMeeting) {
        setMeetings(prev => [newMeeting, ...prev]);
      }
    }

    return result;
  }, [user]);

  const updateMeeting = useCallback(async (id: string, updates: UpdateMeetingData) => {
    const result = await updateMeetingHelper(id, updates, user, setError);

    if (!result.error) {
      if (result.data) {
        setMeetings(prev => prev.map(m => (m.id === id ? result.data as Meeting : m)));
      } else {
        setMeetings(prev => prev.map(m => (m.id === id ? { ...m, ...updates } as Meeting : m)));
      }
    }

    return result;
  }, [user]);

  const deleteMeeting = useCallback(async (id: string) => {
    const result = await deleteMeetingHelper(id, user, setError);

    if (!result.error) {
      setMeetings(prev => prev.filter(m => m.id !== id));
    }

    return result;
  }, [user]);

  const startMeeting = useCallback((id: string) => {
    return updateMeeting(id, {
      status: 'active',
      started_at: new Date().toISOString()
    });
  }, [updateMeeting]);

  const endMeeting = useCallback((id: string) => {
    return updateMeeting(id, {
      status: 'completed',
      ended_at: new Date().toISOString()
    });
  }, [updateMeeting]);

  const cancelMeeting = useCallback((id: string) => {
    return updateMeeting(id, {
      status: 'cancelled'
    });
  }, [updateMeeting]);

  const scheduledMeetings = useMemo(() => meetings.filter(m => m.status === 'scheduled'), [meetings]);
  const activeMeetings = useMemo(() => meetings.filter(m => m.status === 'active'), [meetings]);
  const completedMeetings = useMemo(
    () => meetings.filter(m => m.status === 'completed' || m.status === 'ended'),
    [meetings]
  );
  const upcomingMeetings = useMemo(
    () =>
      meetings.filter(
        m =>
          m.status === 'scheduled' &&
          m.scheduled_at &&
          new Date(m.scheduled_at) > new Date()
      ),
    [meetings]
  );

  const contextValue = useMemo<MeetingsContextValue>(() => ({
    meetings,
    loading,
    error,
    createMeeting,
    updateMeeting,
    deleteMeeting,
    startMeeting,
    endMeeting,
    cancelMeeting,
    refresh: fetchMeetings,
    scheduledMeetings,
    activeMeetings,
    completedMeetings,
    upcomingMeetings,
    totalMeetings: meetings.length,
    activeCount: activeMeetings.length,
    completedCount: completedMeetings.length,
    setMeetings
  }), [
    meetings,
    loading,
    error,
    createMeeting,
    updateMeeting,
    deleteMeeting,
    startMeeting,
    endMeeting,
    cancelMeeting,
    fetchMeetings,
    scheduledMeetings,
    activeMeetings,
    completedMeetings,
    upcomingMeetings
  ]);

  return (
    <MeetingsContext.Provider value={contextValue}>
      {children}
    </MeetingsContext.Provider>
  );
}

export function useMeetings() {
  const context = useContext(MeetingsContext);
  if (!context) {
    throw new Error('useMeetings must be used within a MeetingsProvider');
  }
  return context;
}
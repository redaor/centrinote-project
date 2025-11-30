// =====================================================
// HOOK useErrorLogs - Écoute les erreurs en temps réel
// =====================================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface ErrorLog {
  id: string;
  user_id: string | null;
  message: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  meta: Record<string, any>;
  source: string | null;
  stack_trace: string | null;
  url: string | null;
  user_agent: string | null;
  created_at: string;
}

interface UseErrorLogsOptions {
  limit?: number;
  level?: ErrorLog['level'];
  userId?: string;
  realtime?: boolean;
}

interface UseErrorLogsReturn {
  logs: ErrorLog[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  clearLogs: () => Promise<void>;
}

export function useErrorLogs(options: UseErrorLogsOptions = {}): UseErrorLogsReturn {
  const {
    limit = 100,
    level,
    userId,
    realtime = true,
  } = options;

  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  // Charger les logs initiaux
  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('error_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      // Filtrer par niveau si spécifié
      if (level) {
        query = query.eq('level', level);
      }

      // Filtrer par utilisateur si spécifié
      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      setLogs(data || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch error logs'));
      logger.error('Error fetching logs', err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [limit, level, userId]);

  // Écouter les nouveaux logs en temps réel
  useEffect(() => {
    if (!realtime) {
      return;
    }

    // S'abonner aux nouveaux logs
    const newChannel = supabase
      .channel('error_logs_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'error_logs',
        },
        (payload) => {
          const newLog = payload.new as ErrorLog;
          
          // Appliquer les filtres côté client
          if (level && newLog.level !== level) {
            return;
          }
          if (userId && newLog.user_id !== userId) {
            return;
          }

          // Ajouter le nouveau log en haut de la liste
          setLogs((prevLogs) => {
            // Éviter les doublons
            if (prevLogs.some(log => log.id === newLog.id)) {
              return prevLogs;
            }
            return [newLog, ...prevLogs].slice(0, limit);
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logger.debug('Subscribed to error_logs realtime');
        } else if (status === 'CHANNEL_ERROR') {
          logger.error('Error subscribing to error_logs realtime', new Error('Channel error'));
        }
      });

    setChannel(newChannel);

    return () => {
      if (newChannel) {
        supabase.removeChannel(newChannel);
      }
    };
  }, [realtime, level, userId, limit]);

  // Charger les logs au montage
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Fonction pour rafraîchir les logs
  const refresh = useCallback(async () => {
    await fetchLogs();
  }, [fetchLogs]);

  // Fonction pour supprimer les logs (admin uniquement)
  const clearLogs = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Vérifier si l'utilisateur est admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, email')
        .eq('id', user.id)
        .single();

      const isAdmin = profile?.role === 'admin' || 
                     profile?.email === 'contact@centrinote.fr' || 
                     profile?.email === 'reda_sahraoui@outlook.fr';

      let deleteQuery = supabase.from('error_logs').delete();

      // Si admin, supprimer tous les logs, sinon seulement ceux de l'utilisateur
      if (isAdmin) {
        // Admin peut supprimer tous les logs
        // Pas de filtre, supprime tout
      } else {
        // Utilisateur normal : supprimer uniquement ses logs
        deleteQuery = deleteQuery.eq('user_id', user.id);
      }

      const { error: deleteError } = await deleteQuery;

      if (deleteError) {
        throw deleteError;
      }

      logger.info('Logs cleared', { isAdmin, userId: user.id });

      // Rafraîchir la liste
      await fetchLogs();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to clear logs'));
      logger.error('Error clearing logs', err instanceof Error ? err : new Error(String(err)));
      throw err; // Re-throw pour que le composant puisse afficher l'erreur
    }
  }, [fetchLogs]);

  return {
    logs,
    loading,
    error,
    refresh,
    clearLogs,
  };
}


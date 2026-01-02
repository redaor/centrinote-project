import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useApp } from '../contexts/AppContext';
import { logger } from '../utils/logger';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  action_url?: string | null;
  metadata: Record<string, any>;
  is_read: boolean;
  read_at: string | null;
  sent_at: string | null;
  created_at: string;
}

export function useNotifications() {
  const { state } = useApp();
  const { user } = state;
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // 1. Chargement initial des notifications
  useEffect(() => {
    if (!user?.id) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    const loadNotifications = async () => {
      try {
        setLoading(true);
        logger.debug('Chargement des notifications');
        
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) {
          logger.error('Erreur lors du chargement des notifications', error instanceof Error ? error : new Error(String(error)));
          return;
        }

        logger.debug('Notifications chargées', { count: data?.length || 0 });
        setNotifications(data || []);
        const unread = (data || []).filter(n => !n.is_read).length;
        setUnreadCount(unread);
        logger.debug('Notifications chargées', { total: data?.length || 0, unread });
        if (unread === 0 && (data || []).length > 0) {
          logger.warn('Toutes les notifications sont marquées comme lues');
        }
      } catch (error) {
        logger.error('Erreur lors du chargement des notifications', error instanceof Error ? error : new Error(String(error)));
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();
  }, [user?.id]);

  // 2. Compteur de notifications non lues
  useEffect(() => {
    const unread = notifications.filter(n => !n.is_read).length;
    logger.debug('Calcul unreadCount', { total: notifications.length, unread });
    setUnreadCount(unread);
  }, [notifications]);

  // 3. Écouter les nouvelles notifications en temps réel + polling de secours
  useEffect(() => {
    if (!user?.id) {
      logger.debug('Pas d\'utilisateur, pas d\'écoute Realtime');
      return;
    }

    logger.debug('Écoute des nouvelles notifications en temps réel');

    // État du Realtime pour contrôler le polling
    let realtimeStatus: 'SUBSCRIBED' | 'CLOSED' | 'ERROR' = 'CLOSED';
    let pollInterval: NodeJS.Timeout | null = null;

    // A. Souscription Realtime
    const channelName = `notifications:${user.id}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          logger.debug('Nouvelle notification reçue via Realtime');
          const newNotification = payload.new as Notification;
          setNotifications(prev => {
            // Éviter les doublons
            if (prev.some(n => n.id === newNotification.id)) {
              logger.debug('Notification déjà présente, ignorée');
              return prev;
            }
            logger.debug('Nouvelle notification ajoutée à la liste');
            return [newNotification, ...prev];
          });
          if (!newNotification.is_read) {
            setUnreadCount(prev => prev + 1);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          logger.debug('Notification mise à jour via Realtime');
          setNotifications(prev =>
            prev.map(n => (n.id === payload.new.id ? (payload.new as Notification) : n))
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          logger.debug('Notification supprimée via Realtime');
          const deletedId = payload.old.id;
          setNotifications(prev => {
            const filtered = prev.filter(n => n.id !== deletedId);
            logger.debug('Notification supprimée du state local', { deletedId, remaining: filtered.length });
            return filtered;
          });
          // Mettre à jour le compteur si nécessaire
          setUnreadCount(prev => {
            const deletedNotification = prev > 0 ? 1 : 0; // Approximation, sera recalculé par l'effet
            return Math.max(0, prev - deletedNotification);
          });
        }
      )
      .subscribe((status) => {
        logger.debug('Statut de la souscription Realtime', { status });
        if (status === 'SUBSCRIBED') {
          realtimeStatus = 'SUBSCRIBED';
          logger.debug('Abonné aux notifications en temps réel');
          // ⚡ PERFORMANCE: Désactiver le polling si Realtime fonctionne
          if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
            logger.debug('Polling de secours désactivé (Realtime actif)');
          }
        } else if (status === 'CHANNEL_ERROR') {
          realtimeStatus = 'ERROR';
          logger.warn('Erreur de canal Realtime - Le polling de secours prendra le relais');
          // Activer le polling si pas déjà actif
          if (!pollInterval) {
            startPolling();
          }
        } else if (status === 'TIMED_OUT') {
          realtimeStatus = 'ERROR';
          logger.warn('Timeout de connexion Realtime - Le polling de secours prendra le relais');
          if (!pollInterval) {
            startPolling();
          }
        } else if (status === 'CLOSED') {
          realtimeStatus = 'CLOSED';
          logger.warn('Canal Realtime fermé - Le polling de secours prendra le relais');
          if (!pollInterval) {
            startPolling();
          }
        }
      });

    // B. Polling de secours UNIQUEMENT si Realtime ne fonctionne pas
    const startPolling = () => {
      if (pollInterval) {
        return; // Déjà actif
      }

      logger.debug('Démarrage du polling de secours pour les notifications');
      pollInterval = setInterval(async () => {
        try {
          const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(50);

          if (error) {
            logger.error('Erreur lors du polling des notifications', error instanceof Error ? error : new Error(String(error)));
            return;
          }

          // Synchroniser avec la base : ajouter les nouvelles et supprimer celles qui n'existent plus
          setNotifications(prev => {
            const currentIds = new Set(prev.map(n => n.id));
            const dbIds = new Set((data || []).map(n => n.id));
            
            // Nouvelles notifications à ajouter
            const newNotifications = (data || []).filter(n => !currentIds.has(n.id));
            
            // Notifications supprimées en base (présentes localement mais absentes de la DB)
            const deletedIds = prev.filter(n => !dbIds.has(n.id)).map(n => n.id);
            
            if (newNotifications.length > 0) {
              logger.debug('Nouvelles notifications détectées via polling', { count: newNotifications.length });
            }
            if (deletedIds.length > 0) {
              logger.debug('Notifications supprimées détectées via polling', { count: deletedIds.length, ids: deletedIds });
            }
            
            // Retourner les notifications de la DB (source de vérité)
            return data || [];
          });
        } catch (error) {
          logger.error('Erreur lors du polling', error instanceof Error ? error : new Error(String(error)));
        }
      }, 10000); // ⚡ PERFORMANCE: Augmenté à 10 secondes au lieu de 5
    };

    // Ne démarrer le polling que si Realtime n'est pas SUBSCRIBED après 2 secondes
    const initialPollingTimeout = setTimeout(() => {
      if (realtimeStatus !== 'SUBSCRIBED' && !pollInterval) {
        startPolling();
      }
    }, 2000);

    return () => {
      logger.debug('Désabonnement des notifications');
      supabase.removeChannel(channel);
      if (pollInterval) {
        clearInterval(pollInterval);
      }
      clearTimeout(initialPollingTimeout);
    };
  }, [user?.id]);

  // 4. Marquer une notification comme lue
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      logger.debug('Marquer notification comme lue');
      const { error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('id', notificationId)
        .eq('user_id', user?.id); // Sécurité supplémentaire

      if (error) {
        logger.error('Erreur lors de la mise à jour de la notification', error instanceof Error ? error : new Error(String(error)));
        return;
      }

      // Mettre à jour l'état local
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, is_read: true, read_at: new Date().toISOString() }
            : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      logger.debug('Notification marquée comme lue');
    } catch (error) {
      logger.error('Erreur lors de la mise à jour de la notification', error instanceof Error ? error : new Error(String(error)));
    }
  }, [user?.id]);

  // 5. Marquer toutes les notifications comme lues
  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;

    try {
      logger.debug('Marquer toutes les notifications comme lues');
      const { error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) {
        logger.error('Erreur lors de la mise à jour des notifications', error instanceof Error ? error : new Error(String(error)));
        return;
      }

      // Mettre à jour l'état local
      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      );
      setUnreadCount(0);
      logger.debug('Toutes les notifications marquées comme lues');
    } catch (error) {
      logger.error('Erreur lors de la mise à jour des notifications', error instanceof Error ? error : new Error(String(error)));
    }
  }, [user?.id]);

  // 6. Supprimer plusieurs notifications en une fois
  const deleteMultipleNotifications = useCallback(async (notificationIds: string[]) => {
    if (!notificationIds || notificationIds.length === 0) {
      logger.warn('Aucune notification à supprimer');
      return;
    }

    try {
      logger.debug('Suppression de plusieurs notifications', { count: notificationIds.length });

      // Sauvegarder les notifications à supprimer (pour rollback si erreur)
      const notificationsToDelete = notifications.filter(n => notificationIds.includes(n.id));
      const unreadCountToRemove = notificationsToDelete.filter(n => !n.is_read).length;

      // Mettre à jour l'UI immédiatement (optimistic update)
      setNotifications(prev => prev.filter(n => !notificationIds.includes(n.id)));
      if (unreadCountToRemove > 0) {
        setUnreadCount(prev => Math.max(0, prev - unreadCountToRemove));
      }

      // Supprimer de la base de données
      const { data, error } = await supabase
        .from('notifications')
        .delete()
        .in('id', notificationIds)
        .eq('user_id', user?.id) // Sécurité supplémentaire
        .select(); // Retourner les données supprimées pour vérification

      if (error) {
        logger.error('Erreur lors de la suppression multiple des notifications', error instanceof Error ? error : new Error(String(error)));
        // Rollback en cas d'erreur
        if (notificationsToDelete.length > 0) {
          setNotifications(prev => [...notificationsToDelete, ...prev].sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          ));
          if (unreadCountToRemove > 0) {
            setUnreadCount(prev => prev + unreadCountToRemove);
          }
        }
        return;
      }

      // Vérifier que la suppression a bien été effectuée
      if (!data || data.length === 0) {
        logger.warn('⚠️ Aucune notification supprimée - peut-être déjà supprimées ou permissions refusées', { notificationIds });
        // Ne pas faire de rollback car les notifications n'existent peut-être plus
        return;
      }

      logger.debug('Notifications supprimées avec succès de la base de données', { 
        requested: notificationIds.length, 
        deleted: data.length 
      });
    } catch (error) {
      logger.error('Erreur lors de la suppression multiple des notifications', error instanceof Error ? error : new Error(String(error)));
    }
  }, [user?.id, notifications]);

  // 7. Supprimer une notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      logger.debug('Suppression de la notification');

      // Sauvegarder l'état de la notification avant suppression (pour rollback si erreur)
      const notificationToDelete = notifications.find(n => n.id === notificationId);
      const wasUnread = notificationToDelete && !notificationToDelete.is_read;

      // Mettre à jour l'UI immédiatement (optimistic update)
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      if (wasUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }

      // Supprimer de la base de données
      const { data, error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', user?.id) // Sécurité supplémentaire
        .select(); // Retourner les données supprimées pour vérification

      if (error) {
        logger.error('Erreur lors de la suppression de la notification', error instanceof Error ? error : new Error(String(error)));
        // Rollback en cas d'erreur
        if (notificationToDelete) {
          setNotifications(prev => [notificationToDelete, ...prev].sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          ));
          if (wasUnread) {
            setUnreadCount(prev => prev + 1);
          }
        }
        return;
      }

      // Vérifier que la suppression a bien été effectuée
      if (!data || data.length === 0) {
        logger.warn('⚠️ Aucune notification supprimée - peut-être déjà supprimée ou permission refusée', { notificationId });
        // Ne pas faire de rollback car la notification n'existe peut-être plus
        // La suppression du state local reste valide
        return;
      }

      logger.debug('Notification supprimée avec succès de la base de données', { notificationId, deletedCount: data.length });
    } catch (error) {
      logger.error('Erreur lors de la suppression de la notification', error instanceof Error ? error : new Error(String(error)));
    }
  }, [user?.id, notifications]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteMultipleNotifications
  };
}


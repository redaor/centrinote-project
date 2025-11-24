import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useApp } from '../contexts/AppContext';

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
        console.log('🔔 Chargement des notifications pour user:', user.id);
        
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) {
          console.error('❌ Erreur lors du chargement des notifications:', error);
          console.error('❌ Détails de l\'erreur:', JSON.stringify(error, null, 2));
          return;
        }

        console.log('✅ Notifications chargées:', data?.length || 0);
        console.log('🔍 [useNotifications] Détail des notifications:', data?.map(n => ({ 
          id: n.id, 
          title: n.title, 
          is_read: n.is_read,
          created_at: n.created_at 
        })));
        setNotifications(data || []);
        const unread = (data || []).filter(n => !n.is_read).length;
        setUnreadCount(unread);
        console.log(`✅ ${data?.length || 0} notifications chargées, ${unread} non lues`);
        if (unread === 0 && (data || []).length > 0) {
          console.warn('⚠️ [useNotifications] Toutes les notifications sont marquées comme lues !');
        }
      } catch (error) {
        console.error('❌ Erreur lors du chargement des notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();
  }, [user?.id]);

  // 2. Compteur de notifications non lues
  useEffect(() => {
    const unread = notifications.filter(n => !n.is_read).length;
    console.log('🔔 [useNotifications] Calcul unreadCount:', {
      total: notifications.length,
      unread,
      notifications: notifications.map(n => ({ id: n.id, title: n.title, is_read: n.is_read }))
    });
    setUnreadCount(unread);
  }, [notifications]);

  // 3. Écouter les nouvelles notifications en temps réel + polling de secours
  useEffect(() => {
    if (!user?.id) {
      console.log('🔔 Pas d\'utilisateur, pas d\'écoute Realtime');
      return;
    }

    console.log('🔔 Écoute des nouvelles notifications pour user:', user.id);

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
          console.log('🔔 Nouvelle notification reçue via Realtime:', payload.new);
          const newNotification = payload.new as Notification;
          setNotifications(prev => {
            // Éviter les doublons
            if (prev.some(n => n.id === newNotification.id)) {
              console.log('⚠️ Notification déjà présente, ignorée');
              return prev;
            }
            console.log('✅ Nouvelle notification ajoutée à la liste');
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
          console.log('🔔 Notification mise à jour via Realtime:', payload.new);
          setNotifications(prev =>
            prev.map(n => (n.id === payload.new.id ? (payload.new as Notification) : n))
          );
        }
      )
      .subscribe((status) => {
        console.log('🔔 Statut de la souscription Realtime:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Abonné aux notifications en temps réel');
        } else if (status === 'CHANNEL_ERROR') {
          console.warn('⚠️ Erreur de canal Realtime - Le polling de secours prendra le relais');
        } else if (status === 'TIMED_OUT') {
          console.warn('⚠️ Timeout de connexion Realtime - Le polling de secours prendra le relais');
        } else if (status === 'CLOSED') {
          console.warn('⚠️ Canal Realtime fermé - Le polling de secours prendra le relais');
        }
      });

    // B. Polling de secours toutes les 5 secondes (si Realtime ne fonctionne pas)
    const pollInterval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) {
          console.error('❌ Erreur lors du polling des notifications:', error);
          return;
        }

        // Comparer avec l'état actuel pour détecter les nouvelles notifications
        setNotifications(prev => {
          const currentIds = new Set(prev.map(n => n.id));
          const newNotifications = (data || []).filter(n => !currentIds.has(n.id));
          
          if (newNotifications.length > 0) {
            console.log(`🔄 [POLLING] ${newNotifications.length} nouvelle(s) notification(s) détectée(s)`);
            return [...newNotifications, ...prev];
          }
          return prev;
        });
      } catch (error) {
        console.error('❌ Erreur lors du polling:', error);
      }
    }, 5000); // Toutes les 5 secondes

    return () => {
      console.log('🔔 Désabonnement des notifications');
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [user?.id]);

  // 4. Marquer une notification comme lue
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      console.log('🔔 Marquer notification comme lue:', notificationId);
      const { error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('id', notificationId)
        .eq('user_id', user?.id); // Sécurité supplémentaire

      if (error) {
        console.error('❌ Erreur lors de la mise à jour de la notification:', error);
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
      console.log('✅ Notification marquée comme lue');
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour de la notification:', error);
    }
  }, [user?.id]);

  // 5. Marquer toutes les notifications comme lues
  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;

    try {
      console.log('🔔 Marquer toutes les notifications comme lues');
      const { error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) {
        console.error('❌ Erreur lors de la mise à jour des notifications:', error);
        return;
      }

      // Mettre à jour l'état local
      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      );
      setUnreadCount(0);
      console.log('✅ Toutes les notifications marquées comme lues');
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour des notifications:', error);
    }
  }, [user?.id]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead
  };
}


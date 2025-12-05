import { useEffect, useCallback, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import { planningService } from '../services/planningService';
import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';

interface TaskNotification {
  taskId: string;
  title: string;
  startTime: Date;
  reminderTime: Date;
  notified: boolean;
}

/**
 * Hook pour gérer les notifications de tâches planifiées
 * - Vérifie périodiquement les rappels
 * - Envoie des notifications browser
 * - Crée des notifications dans la BDD
 * - Gère les rappels avant échéance
 */
export function useTaskNotifications() {
  const { state } = useApp();
  const { user } = state;
  const notifiedTasksRef = useRef<Set<string>>(new Set());
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isCheckingRef = useRef<boolean>(false); // Verrouillage pour empêcher les appels simultanés

  // Demander la permission pour les notifications browser
  const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      logger.warn('Les notifications ne sont pas supportées par ce navigateur');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      logger.warn('Permission de notification refusée par l\'utilisateur');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      logger.error('Erreur lors de la demande de permission', error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }, []);

  // Créer une notification dans la BDD avec vérification de doublon
  const createNotification = useCallback(async (
    title: string,
    message: string,
    type: 'info' | 'success' | 'warning' | 'error' = 'info',
    actionUrl?: string,
    metadata?: Record<string, any>
  ) => {
    if (!user?.id) return;

    try {
      // Créer une clé unique pour cette notification
      const notificationKey = metadata?.taskId && metadata?.reminderType
        ? `${metadata.taskId}-${metadata.reminderType}`
        : metadata?.type && metadata?.milestone
          ? `${metadata.type}-${metadata.milestone}`
          : null;

      // Vérifier si une notification similaire a déjà été envoyée dans les 5 dernières minutes
      if (notificationKey) {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const { data: existingNotifications } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', user.id)
          .eq('title', title)
          .gte('created_at', fiveMinutesAgo)
          .limit(1);

        if (existingNotifications && existingNotifications.length > 0) {
          logger.debug('Notification déjà envoyée récemment, ignorée', { notificationKey, title });
          return; // Ne pas créer de doublon
        }
      }

      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          title,
          message,
          type,
          priority: type === 'error' ? 'high' : type === 'warning' ? 'normal' : 'low',
          action_url: actionUrl || null,
          metadata: metadata || {},
          is_read: false,
          sent_at: new Date().toISOString()
        });

      if (error) {
        logger.error('Erreur lors de la création de la notification', error instanceof Error ? error : new Error(String(error)));
      } else if (notificationKey) {
        // Marquer comme envoyée dans le ref
        notifiedTasksRef.current.add(notificationKey);
      }
    } catch (error) {
      logger.error('Erreur lors de la création de la notification', error instanceof Error ? error : new Error(String(error)));
    }
  }, [user?.id]);

  // Envoyer une notification browser
  const sendBrowserNotification = useCallback(async (
    title: string,
    options: NotificationOptions = {}
  ) => {
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) return;

    try {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: options.tag || 'task-reminder',
        requireInteraction: false,
        ...options
      });

      // Fermer automatiquement après 5 secondes
      setTimeout(() => {
        notification.close();
      }, 5000);

      // Gérer le clic sur la notification
      notification.onclick = () => {
        window.focus();
        notification.close();
        if (options.data?.url) {
          window.location.href = options.data.url;
        }
      };
    } catch (error) {
      logger.error('Erreur lors de l\'envoi de la notification browser', error instanceof Error ? error : new Error(String(error)));
    }
  }, [requestNotificationPermission]);

  // Vérifier les tâches avec rappels
  const checkTaskReminders = useCallback(async () => {
    if (!user?.id) return;
    
    // Verrouillage pour empêcher les appels simultanés
    if (isCheckingRef.current) {
      logger.debug('Vérification déjà en cours, ignorée');
      return;
    }

    isCheckingRef.current = true;

    try {
      // Récupérer toutes les tâches avec rappels pour aujourd'hui et demain
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Récupérer les tâches avec rappels
      const tasksWithReminders = await planningService.getTasksWithReminders(user.id);
      
      const now = new Date();
      const reminderOffset = 15 * 60 * 1000; // 15 minutes avant

      for (const task of tasksWithReminders) {
        const taskId = task.id;
        const startTime = new Date(task.start_time);
        const reminderTime = new Date(startTime.getTime() - reminderOffset);

        // Vérifier si on doit envoyer la notification (dans les 15 minutes avant le début)
        const timeUntilReminder = reminderTime.getTime() - now.getTime();
        const timeUntilStart = startTime.getTime() - now.getTime();

        // Notification 15 min avant
        if (
          timeUntilReminder <= 60000 && // Dans la prochaine minute
          timeUntilReminder > -60000 && // Pas plus d'une minute en retard
          !notifiedTasksRef.current.has(`${taskId}-15min`)
        ) {
          const notificationTitle = `🔔 Rappel: ${task.title}`;
          const notificationMessage = `Commence dans 15 minutes à ${startTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;

          // Marquer immédiatement pour éviter les doublons
          notifiedTasksRef.current.add(`${taskId}-15min`);

          // Notification browser (avec tag unique pour éviter les doublons)
          await sendBrowserNotification(notificationTitle, {
            body: notificationMessage,
            tag: `task-reminder-${taskId}-15min-${Math.floor(reminderTime.getTime() / 60000)}`, // Tag unique avec timestamp
            data: { url: '/planning' }
          });

          // Notification dans la BDD (avec vérification de doublon intégrée)
          await createNotification(
            notificationTitle,
            notificationMessage,
            'info',
            '/planning',
            { taskId, reminderType: '15min', startTime: startTime.toISOString() }
          );

          logger.debug('Notification de rappel envoyée', { taskId, type: '15min' });
        }

        // Notification à l'heure de début
        if (
          timeUntilStart <= 60000 && // Dans la prochaine minute
          timeUntilStart > -60000 && // Pas plus d'une minute en retard
          !notifiedTasksRef.current.has(`${taskId}-start`)
        ) {
          const notificationTitle = `⏰ C'est l'heure: ${task.title}`;
          const notificationMessage = task.description || 'Votre tâche commence maintenant';

          // Marquer immédiatement pour éviter les doublons
          notifiedTasksRef.current.add(`${taskId}-start`);

          // Notification browser (avec tag unique pour éviter les doublons)
          await sendBrowserNotification(notificationTitle, {
            body: notificationMessage,
            tag: `task-start-${taskId}-${Math.floor(startTime.getTime() / 60000)}`, // Tag unique avec timestamp
            data: { url: '/planning' }
          });

          // Notification dans la BDD (avec vérification de doublon intégrée)
          await createNotification(
            notificationTitle,
            notificationMessage,
            'warning',
            '/planning',
            { taskId, reminderType: 'start', startTime: startTime.toISOString() }
          );

          logger.debug('Notification de début envoyée', { taskId, type: 'start' });
        }
      }
    } catch (error) {
      logger.error('Erreur lors de la vérification des rappels', error instanceof Error ? error : new Error(String(error)));
    } finally {
      isCheckingRef.current = false;
    }
  }, [user?.id, sendBrowserNotification, createNotification]);

  // Vérifier les notifications de productivité
  const checkProductivityNotifications = useCallback(async () => {
    if (!user?.id) return;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Récupérer les tâches d'aujourd'hui
      const tasks = await planningService.getTasks(user.id, {
        startDate: today,
        endDate: tomorrow
      });

      const completedTasks = tasks.filter(t => t.completed).length;
      const totalTasks = tasks.length;
      const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

      // Notification si 5 tâches complétées
      if (completedTasks === 5 && !notifiedTasksRef.current.has('productivity-5')) {
        // Marquer immédiatement pour éviter les doublons
        notifiedTasksRef.current.add('productivity-5');
        
        await createNotification(
          '🏆 Excellent travail!',
          'Vous avez complété 5 tâches aujourd\'hui! Continuez comme ça!',
          'success',
          '/planning',
          { type: 'productivity', milestone: 5 }
        );
      }

      // Notification si 100% de complétion
      if (completionRate === 100 && totalTasks > 0 && !notifiedTasksRef.current.has('productivity-100')) {
        // Marquer immédiatement pour éviter les doublons
        notifiedTasksRef.current.add('productivity-100');
        
        await createNotification(
          '🎉 Journée parfaite!',
          `Toutes vos ${totalTasks} tâches sont complétées! Félicitations!`,
          'success',
          '/planning',
          { type: 'productivity', milestone: 100, totalTasks }
        );
      }
    } catch (error) {
      logger.error('Erreur lors de la vérification de productivité', error instanceof Error ? error : new Error(String(error)));
    }
  }, [user?.id, createNotification]);

  // Initialiser le système de notifications
  useEffect(() => {
    if (!user?.id) return;

    // Demander la permission au chargement
    requestNotificationPermission();

    // Vérifier immédiatement
    checkTaskReminders();
    checkProductivityNotifications();

    // Vérifier toutes les minutes
    checkIntervalRef.current = setInterval(() => {
      checkTaskReminders();
      checkProductivityNotifications();
    }, 60000); // Toutes les minutes

    // Nettoyer les notifications envoyées toutes les heures (pour permettre les récurrences)
    const cleanupInterval = setInterval(() => {
      // Garder seulement les notifications des dernières 2 heures
      const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
      notifiedTasksRef.current.forEach((key) => {
        // Pour les clés avec timestamp, vérifier si elles sont trop anciennes
        if (key.includes('-')) {
          const parts = key.split('-');
          if (parts.length > 1) {
            // Pour les notifications de productivité, on les garde pour la journée
            if (key.startsWith('productivity-')) {
              // Ne rien faire, on les garde pour la journée
            } else {
              // Pour les autres, on peut les nettoyer si nécessaire
            }
          }
        }
      });
    }, 60 * 60 * 1000); // Toutes les heures

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
      clearInterval(cleanupInterval);
    };
  }, [user?.id, checkTaskReminders, checkProductivityNotifications, requestNotificationPermission]);

  // Réinitialiser les notifications envoyées au changement de jour
  useEffect(() => {
    const resetAtMidnight = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      const msUntilMidnight = tomorrow.getTime() - now.getTime();
      
      setTimeout(() => {
        notifiedTasksRef.current.clear();
        logger.debug('Notifications réinitialisées pour le nouveau jour');
        resetAtMidnight(); // Programmer pour le prochain minuit
      }, msUntilMidnight);
    };

    resetAtMidnight();
  }, []);

  return {
    requestNotificationPermission,
    checkTaskReminders,
    checkProductivityNotifications
  };
}


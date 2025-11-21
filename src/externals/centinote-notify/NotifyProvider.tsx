import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import type { Notification, NotificationState, NotificationActionType, NotificationLevel, NotificationAction } from './types';

interface NotifyContextType {
  notify: (params: {
    level: NotificationLevel;
    title: string;
    body: string;
    actions?: NotificationAction[];
    icon?: string;
  }) => void;
  removeNotification: (id: string) => void;
  clearAggregated: () => void;
  state: NotificationState;
  dispatch: React.Dispatch<NotificationActionType>;
}

const NotifyContext = createContext<NotifyContextType | null>(null);

const initialState: NotificationState = {
  notifications: [],
  aggregated: [],
  isRetracted: false,
  isVisible: false,
};

function notificationReducer(
  state: NotificationState,
  action: NotificationActionType
): NotificationState {
  switch (action.type) {
    case 'ADD': {
      const newNotification: Notification = {
        ...action.payload,
        id: action.notificationId || `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
      };
      console.log('🔔 [REDUCER] Notification ajoutée avec ID:', newNotification.id);
      return {
        ...state,
        notifications: [...state.notifications, newNotification],
        isVisible: true,
        isRetracted: false,
      };
    }
    case 'REMOVE': {
      // ✅ PATCH: Ne pas supprimer immédiatement si la notification est en train de sortir
      // On la garde dans le state pendant l'animation CSS (300ms) pour éviter removeChild error
      const notificationToRemove = state.notifications.find((n) => n.id === action.payload);
      if (notificationToRemove?.exiting) {
        // La notification est en train de sortir, on la garde encore un peu
        // Elle sera supprimée par FORCE_REMOVE après l'animation
        console.log('🔔 [REDUCER] REMOVE différé - notification en cours de sortie, ID:', action.payload);
        return state; // Ne rien changer pour l'instant
      }
      const filtered = state.notifications.filter((n) => n.id !== action.payload);
      return {
        ...state,
        notifications: filtered,
        isVisible: filtered.length > 0 || state.aggregated.length > 0,
      };
    }
    case 'FORCE_REMOVE': {
      // Suppression forcée après l'animation CSS
      const filtered = state.notifications.filter((n) => n.id !== action.payload);
      console.log('🔔 [REDUCER] FORCE_REMOVE - suppression définitive, ID:', action.payload);
      return {
        ...state,
        notifications: filtered,
        isVisible: filtered.length > 0 || state.aggregated.length > 0,
      };
    }
    case 'SET_EXITING': {
      return {
        ...state,
        notifications: state.notifications.map((n) =>
          n.id === action.payload ? { ...n, exiting: true } : n
        ),
      };
    }
    case 'AGGREGATE': {
      return {
        ...state,
        aggregated: action.payload,
        notifications: [],
        isVisible: true,
      };
    }
    case 'CLEAR_AGGREGATED': {
      return {
        ...state,
        aggregated: [],
        isVisible: state.notifications.length > 0,
      };
    }
    case 'RETRACT': {
      return {
        ...state,
        isRetracted: true,
      };
    }
    case 'EXPAND': {
      return {
        ...state,
        isRetracted: false,
      };
    }
    case 'HIDE': {
      return {
        ...state,
        isVisible: false,
      };
    }
    case 'SHOW': {
      return {
        ...state,
        isVisible: true,
      };
    }
    default:
      return state;
  }
}

interface NotifyProviderProps {
  children: React.ReactNode;
  aggregationWindow?: number; // ms
}

export function NotifyProvider({
  children,
  aggregationWindow = 5000,
}: NotifyProviderProps) {
  const [state, dispatch] = useReducer(notificationReducer, initialState);
  const aggregationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingNotificationsRef = useRef<Notification[]>([]);

  const notify = useCallback(
    (params: {
      level: NotificationLevel;
      title: string;
      body: string;
      actions?: NotificationAction[];
      icon?: string;
    }) => {
      console.log('🔔 [NOTIFY] Notification déclenchée:', params);
      
      // Générer un ID unique qui sera utilisé à la fois dans pendingNotifications et dans le reducer
      const notificationId = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newNotification: Notification = {
        ...params,
        id: notificationId,
        timestamp: Date.now(),
      };

      pendingNotificationsRef.current.push(newNotification);

      // Clear existing timer
      if (aggregationTimerRef.current) {
        clearTimeout(aggregationTimerRef.current);
      }

      // If this is the first notification, show it immediately
      if (pendingNotificationsRef.current.length === 1) {
        console.log('🔔 [NOTIFY] Ajout de la première notification immédiatement, ID:', notificationId);
        dispatch({ type: 'ADD', payload: params, notificationId });
        
        // Auto-remove after 5 seconds (unless it's an automation notification which has its own retract logic)
        // ✅ PATCH: On démarre l'animation de sortie à 4.5s, puis on supprime à 5.3s (après la fin de l'animation CSS de 300ms)
        if (params.level !== 'automation') {
          // Début de l'animation de sortie (fade-out)
          setTimeout(() => {
            console.log('🔔 [NOTIFY] Début animation de sortie, ID:', notificationId);
            dispatch({ type: 'SET_EXITING', payload: notificationId });
          }, 4500);
          
          // Suppression réelle après l'animation CSS (300ms) + marge de sécurité
          setTimeout(() => {
            console.log('🔔 [NOTIFY] Tentative de suppression de la notification, ID:', notificationId);
            dispatch({ type: 'REMOVE', payload: notificationId });
            
            // ✅ PATCH: Nettoyage final après l'animation CSS (300ms)
            // On supprime vraiment la notification du state après que l'animation soit terminée
            setTimeout(() => {
              console.log('🔔 [NOTIFY] Nettoyage final de la notification après animation, ID:', notificationId);
              dispatch({ type: 'FORCE_REMOVE', payload: notificationId });
            }, 400); // 300ms animation + 100ms marge
          }, 5300); // 4.5s + 0.8s (300ms animation + 500ms marge)
        }
      }

      // Set timer to aggregate if more notifications arrive
      aggregationTimerRef.current = setTimeout(() => {
        if (pendingNotificationsRef.current.length > 1) {
          console.log(`🔔 [NOTIFY] Agrégation de ${pendingNotificationsRef.current.length} notifications`);
          dispatch({ type: 'AGGREGATE', payload: [...pendingNotificationsRef.current] });
        }
        pendingNotificationsRef.current = [];
      }, aggregationWindow);
    },
    [aggregationWindow, dispatch]
  );

  const removeNotification = useCallback((id: string) => {
    dispatch({ type: 'REMOVE', payload: id });
  }, []);

  // Auto-retract for automation notifications
  useEffect(() => {
    const automationNotif = state.notifications.find((n) => n.level === 'automation');
    if (automationNotif && !state.isRetracted) {
      const timer = setTimeout(() => {
        dispatch({ type: 'RETRACT' });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [state.notifications, state.isRetracted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (aggregationTimerRef.current) {
        clearTimeout(aggregationTimerRef.current);
      }
    };
  }, []);

  const clearAggregated = useCallback(() => {
    dispatch({ type: 'CLEAR_AGGREGATED' });
  }, []);

  // Exposer notify globalement pour les tests (dev uniquement)
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    (window as any).__CENTINOTE_NOTIFY__ = { notify };
  }

  return (
    <NotifyContext.Provider value={{ notify, removeNotification, clearAggregated, state, dispatch }}>
      {children}
    </NotifyContext.Provider>
  );
}

export function useNotifyContext() {
  const context = useContext(NotifyContext);
  if (!context) {
    throw new Error('useNotifyContext must be used within NotifyProvider');
  }
  return context;
}


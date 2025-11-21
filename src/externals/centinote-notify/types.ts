// Types pour Centinote-Notify
export type NotificationLevel = 'info' | 'success' | 'warning' | 'error' | 'automation';

export interface NotificationAction {
  label: string;
  onClick: () => void;
  primary?: boolean;
}

export interface Notification {
  id: string;
  level: NotificationLevel;
  title: string;
  body: string;
  actions?: NotificationAction[];
  icon?: string;
  timestamp: number;
  exiting?: boolean; // Flag pour l'animation de sortie
}

export interface NotificationState {
  notifications: Notification[];
  aggregated: Notification[];
  isRetracted: boolean;
  isVisible: boolean;
}

export type NotificationActionType =
  | { type: 'ADD'; payload: Omit<Notification, 'id' | 'timestamp' | 'exiting'>; notificationId?: string }
  | { type: 'REMOVE'; payload: string }
  | { type: 'SET_EXITING'; payload: string } // Nouvelle action pour l'animation de sortie
  | { type: 'AGGREGATE'; payload: Notification[] }
  | { type: 'CLEAR_AGGREGATED' }
  | { type: 'RETRACT' }
  | { type: 'EXPAND' }
  | { type: 'HIDE' }
  | { type: 'SHOW' };


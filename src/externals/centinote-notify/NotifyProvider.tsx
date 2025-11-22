import React, { createContext, useContext, useCallback, useState } from 'react';
import { v4 as uuid } from 'uuid';
import type { ReactNode } from 'react';

export type Level = 'info' | 'success' | 'warning' | 'error' | 'automation';

export interface Notification {
  id: string;
  level: Level;
  title: string;
  body?: string;
  icon?: string;
  actions?: { label: string; onClick: () => void }[];
}

interface NotifyCtx {
  notify: (n: Omit<Notification, 'id'>) => void;
  remove: (id: string) => void;
  notifications: Notification[];
}

const ctx = createContext<NotifyCtx | undefined>(undefined);

export const NotifyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const notify = useCallback((payload: Omit<Notification, 'id'>) => {
    const id = uuid();
    setNotifications((prev) => [...prev, { ...payload, id }]);
  }, []);

  const remove = useCallback((id: string) => {
    // ✅ PATCH: Protection contre les erreurs de suppression
    try {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (error) {
      console.error('❌ Erreur lors de la suppression de la notification:', error);
      // Forcer la suppression même en cas d'erreur
      setNotifications((prev) => {
        const filtered = prev.filter((n) => n.id !== id);
        if (filtered.length === prev.length) {
          // Si la notification n'a pas été supprimée, forcer la mise à jour
          return [...prev].filter((n) => n.id !== id);
        }
        return filtered;
      });
    }
  }, []);

  // Exposer notify globalement pour les tests (dev uniquement)
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    (window as any).__CENTINOTE_NOTIFY__ = { notify };
  }

  return <ctx.Provider value={{ notify, remove, notifications }}>{children}</ctx.Provider>;
};

export const useNotifyCtx = () => {
  const c = useContext(ctx);
  if (!c) throw new Error('useNotifyCtx must be used inside NotifyProvider');
  return c;
};

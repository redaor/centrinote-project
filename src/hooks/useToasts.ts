// 🍞 Hook pour gérer les toasts avec feedback immédiat
import { useState, useCallback } from 'react';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  duration?: number; // ms, défaut 4000
  icon?: React.ReactNode;
}

export interface ToastState {
  toasts: Toast[];
  showToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

export function useToasts(): ToastState {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((toastData: Omit<Toast, 'id'>) => {
    const id = crypto.randomUUID();
    const toast: Toast = {
      id,
      duration: 4000,
      ...toastData
    };

    setToasts(prev => [...prev, toast]);

    // Auto-dismiss après duration
    if (toast.duration && toast.duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, toast.duration);
    }

    console.log('🍞 [TOAST] Showing:', toast);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    console.log('🍞 [TOAST] Removed:', id);
  }, []);

  const clearAll = useCallback(() => {
    setToasts([]);
    console.log('🍞 [TOAST] Cleared all');
  }, []);

  return {
    toasts,
    showToast,
    removeToast,
    clearAll
  };
}

// Helper functions pour les toasts communs
export const createSuccessToast = (title: string, message?: string): Omit<Toast, 'id'> => ({
  type: 'success',
  title,
  message,
  duration: 3000
});

export const createErrorToast = (title: string, message?: string): Omit<Toast, 'id'> => ({
  type: 'error',
  title,
  message,
  duration: 5000
});

export const createInfoToast = (title: string, message?: string): Omit<Toast, 'id'> => ({
  type: 'info',
  title,
  message,
  duration: 4000
});
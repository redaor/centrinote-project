import { useState, useCallback } from 'react';
import type { ToastType, ToastProps } from '../components/ui/Toast';

let toastId = 0;

export function useToast() {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const showToast = useCallback((
    type: ToastType,
    title: string,
    message: string,
    duration = 5000
  ) => {
    const id = `toast-${toastId++}`;

    const toast: ToastProps = {
      id,
      type,
      title,
      message,
      duration,
      onClose: () => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      },
    };

    setToasts((prev) => [...prev, toast]);

    return id;
  }, []);

  const success = useCallback((title: string, message: string, duration?: number) => {
    return showToast('success', title, message, duration);
  }, [showToast]);

  const error = useCallback((title: string, message: string, duration?: number) => {
    return showToast('error', title, message, duration);
  }, [showToast]);

  const warning = useCallback((title: string, message: string, duration?: number) => {
    return showToast('warning', title, message, duration);
  }, [showToast]);

  const info = useCallback((title: string, message: string, duration?: number) => {
    return showToast('info', title, message, duration);
  }, [showToast]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  return {
    toasts,
    showToast,
    success,
    error,
    warning,
    info,
    dismiss,
    dismissAll,
  };
}

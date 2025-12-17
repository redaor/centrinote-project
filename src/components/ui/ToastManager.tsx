import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (toast: Omit<Toast, 'id'>) => void;
  hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

interface ToastProviderProps {
  children: ReactNode;
  darkMode?: boolean;
}

export function ToastProvider({ children, darkMode = false }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: Toast = {
      id,
      duration: 4000,
      ...toast
    };

    setToasts(prev => [...prev, newToast]);

    // Auto-hide after duration
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        hideToast(id);
      }, newToast.duration);
    }
  }, [hideToast]);

  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const getToastStyles = (type: Toast['type']) => {
    switch (type) {
      case 'success':
        return {
          bg: darkMode ? 'bg-green-800' : 'bg-green-50',
          border: darkMode ? 'border-green-700' : 'border-green-200',
          text: darkMode ? 'text-green-200' : 'text-green-800',
          icon: CheckCircle,
          iconColor: darkMode ? 'text-green-400' : 'text-green-600'
        };
      case 'error':
        return {
          bg: darkMode ? 'bg-red-800' : 'bg-red-50',
          border: darkMode ? 'border-red-700' : 'border-red-200',
          text: darkMode ? 'text-red-200' : 'text-red-800',
          icon: AlertCircle,
          iconColor: darkMode ? 'text-red-400' : 'text-red-600'
        };
      case 'warning':
        return {
          bg: darkMode ? 'bg-yellow-800' : 'bg-yellow-50',
          border: darkMode ? 'border-yellow-700' : 'border-yellow-200',
          text: darkMode ? 'text-yellow-200' : 'text-yellow-800',
          icon: AlertCircle,
          iconColor: darkMode ? 'text-yellow-400' : 'text-yellow-600'
        };
      default:
        return {
          bg: darkMode ? 'bg-blue-800' : 'bg-blue-50',
          border: darkMode ? 'border-blue-700' : 'border-blue-200',
          text: darkMode ? 'text-blue-200' : 'text-blue-800',
          icon: AlertCircle,
          iconColor: darkMode ? 'text-blue-400' : 'text-blue-600'
        };
    }
  };

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => {
          const styles = getToastStyles(toast.type);
          const Icon = styles.icon;
          
          return (
            <div
              key={toast.id}
              className={`
                ${styles.bg} ${styles.border} ${styles.text}
                border rounded-xl p-4 shadow-lg max-w-sm
                animate-slide-down flex items-start space-x-3
              `}
              role="alert"
              aria-live="polite"
            >
              <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${styles.iconColor}`} />
              
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm">
                  {toast.title}
                </h4>
                {toast.message && (
                  <p className="text-sm opacity-90 mt-1">
                    {toast.message}
                  </p>
                )}
              </div>
              
              <button
                onClick={() => hideToast(toast.id)}
                className={`
                  flex-shrink-0 p-1 rounded-lg transition-colors
                  ${darkMode 
                    ? 'hover:bg-white/10' 
                    : 'hover:bg-black/5'
                  }
                `}
                aria-label="Fermer la notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

// Convenience hooks for common toast types
export function useToastHelpers() {
  const { showToast } = useToast();

  return {
    success: (title: string, message?: string) => 
      showToast({ type: 'success', title, message }),
    error: (title: string, message?: string) => 
      showToast({ type: 'error', title, message }),
    warning: (title: string, message?: string) => 
      showToast({ type: 'warning', title, message }),
    info: (title: string, message?: string) => 
      showToast({ type: 'info', title, message })
  };
}

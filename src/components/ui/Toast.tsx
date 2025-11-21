import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  duration?: number;
  onClose: () => void;
}

const ICONS = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

const COLORS = {
  success: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-800',
    icon: 'text-green-600 dark:text-green-400',
    title: 'text-green-900 dark:text-green-100',
    message: 'text-green-700 dark:text-green-300',
  },
  error: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
    icon: 'text-red-600 dark:text-red-400',
    title: 'text-red-900 dark:text-red-100',
    message: 'text-red-700 dark:text-red-300',
  },
  warning: {
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    border: 'border-yellow-200 dark:border-yellow-800',
    icon: 'text-yellow-600 dark:text-yellow-400',
    title: 'text-yellow-900 dark:text-yellow-100',
    message: 'text-yellow-700 dark:text-yellow-300',
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    icon: 'text-blue-600 dark:text-blue-400',
    title: 'text-blue-900 dark:text-blue-100',
    message: 'text-blue-700 dark:text-blue-300',
  },
};

export function Toast({ id, type, title, message, duration = 5000, onClose }: ToastProps) {
  const Icon = ICONS[type];
  const colors = COLORS[type];

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`
        relative flex items-start gap-3 p-4 rounded-xl border shadow-lg max-w-md w-full
        ${colors.bg} ${colors.border}
      `}
    >
      {/* Icône */}
      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${colors.icon}`} />

      {/* Contenu */}
      <div className="flex-1 min-w-0">
        <p className={`font-semibold text-sm ${colors.title}`}>{title}</p>
        <p className={`text-sm mt-1 ${colors.message}`}>{message}</p>
      </div>

      {/* Bouton fermer */}
      <button
        onClick={onClose}
        className={`
          flex-shrink-0 p-1 rounded-lg transition-colors
          hover:bg-black/10 dark:hover:bg-white/10
          ${colors.icon}
        `}
        aria-label="Fermer la notification"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

export interface ToastContainerProps {
  toasts: ToastProps[];
}

export function ToastContainer({ toasts }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
      <div className="pointer-events-auto">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <div key={toast.id} className="mb-3">
              <Toast {...toast} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

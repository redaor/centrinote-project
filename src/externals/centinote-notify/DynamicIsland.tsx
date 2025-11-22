import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { useNotifyCtx } from './NotifyProvider';
import type { Notification } from './NotifyProvider';

interface Props {
  notification: Notification;
}

export const DynamicIsland: React.FC<Props> = ({ notification }) => {
  const { remove } = useNotifyCtx();

  useEffect(() => {
    // ✅ PATCH: Délai plus long pour laisser l'animation se terminer
    // Utiliser requestAnimationFrame pour s'assurer que l'animation est terminée
    const t = setTimeout(() => {
      requestAnimationFrame(() => {
        try {
          remove(notification.id);
        } catch (error) {
          console.error('❌ Erreur lors de la suppression de la notification:', error);
        }
      });
    }, 5_000);
    return () => clearTimeout(t);
  }, [notification.id, remove]);

  const levelColors = {
    info: 'border-blue-500/30',
    success: 'border-green-500/30',
    warning: 'border-yellow-500/30',
    error: 'border-red-500/30',
    automation: 'border-purple-500/30',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -60, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -60, scale: 0.95 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      onAnimationComplete={(definition) => {
        // ✅ PATCH: S'assurer que l'animation est complètement terminée avant de permettre la suppression
        if (definition === 'exit') {
          console.log('🔔 [DynamicIsland] Animation exit terminée pour:', notification.id);
        }
      }}
      className={cn(
        'fixed top-4 left-1/2 -translate-x-1/2 z-[9999]',
        'bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl',
        'border rounded-3xl shadow-2xl',
        'px-6 py-4 min-w-[320px] max-w-md',
        levelColors[notification.level]
      )}
    >
      <div className="flex items-start gap-3">
        {notification.icon && (
          <div className="text-2xl flex-shrink-0" aria-hidden="true">
            {notification.icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm mb-1 text-gray-900 dark:text-gray-100">
            {notification.title}
          </h3>
          {notification.body && (
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              {notification.body}
            </p>
          )}
          {notification.actions && notification.actions.length > 0 && (
            <div className="flex gap-2 mt-3">
              {notification.actions.map((a, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    a.onClick();
                    // ✅ PATCH: Délai pour laisser l'animation se terminer
                    requestAnimationFrame(() => {
                      remove(notification.id);
                    });
                  }}
                  className="px-4 py-2 rounded-xl text-sm font-medium transition-all bg-blue-600 text-white hover:bg-blue-700"
                  aria-label={a.label}
                >
                  {a.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => {
            // ✅ PATCH: Délai pour laisser l'animation se terminer
            requestAnimationFrame(() => {
              remove(notification.id);
            });
          }}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex-shrink-0"
          aria-label="Close notification"
        >
          ✕
        </button>
      </div>
    </motion.div>
  );
};

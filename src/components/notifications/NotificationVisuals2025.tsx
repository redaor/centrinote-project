/**
 * 🎨 NOTIFICATION VISUALS 2025
 * Composants purement visuels pour habiller les notifications
 * ZERO logique métier - uniquement des effets visuels tendance
 */

import React, { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ==========================================
// 1️⃣ BADGE PULSANT (cloche + pastille rouge)
// ==========================================

interface BadgePulseProps {
  /** Nombre de notifications non lues */
  count?: number;
  /** Dark mode actif */
  darkMode?: boolean;
  /** Callback au clic */
  onClick?: () => void;
}

export function BadgePulse({ count = 0, darkMode = false, onClick }: BadgePulseProps) {
  const [shouldPulse, setShouldPulse] = useState(false);

  // Pulse une seule fois au montage si count > 0
  useEffect(() => {
    if (count > 0) {
      setShouldPulse(true);
      const timer = setTimeout(() => setShouldPulse(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [count]);

  return (
    <button
      onClick={onClick}
      className={`
        relative p-2 rounded-lg transition-all duration-200
        ${darkMode
          ? 'hover:bg-gray-700 text-gray-300'
          : 'hover:bg-gray-100 text-gray-600'
        }
        focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2
        ${darkMode ? 'focus:ring-offset-gray-800' : 'focus:ring-offset-white'}
      `}
      aria-label={`Notifications ${count > 0 ? `(${count} non lues)` : ''}`}
      type="button"
    >
      {/* Icône cloche */}
      <Bell className="w-5 h-5" />

      {/* Badge avec pulse */}
      {count > 0 && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{
            scale: 1,
            ...(shouldPulse ? {
              scale: [1, 1.2, 1],
              transition: { duration: 0.6, ease: 'easeInOut' }
            } : {})
          }}
          className={`
            absolute -top-1 -right-1
            min-w-[18px] h-[18px] px-1
            flex items-center justify-center
            bg-gradient-to-br from-red-500 to-pink-600
            text-white text-xs font-bold rounded-full
            shadow-lg
          `}
          style={{
            willChange: shouldPulse ? 'transform' : 'auto'
          }}
        >
          {count > 99 ? '99+' : count}
        </motion.span>
      )}

      {/* Glow effect quand pulse */}
      {shouldPulse && (
        <motion.div
          initial={{ scale: 1, opacity: 0.5 }}
          animate={{ scale: 2, opacity: 0 }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="absolute -top-1 -right-1 w-[18px] h-[18px] bg-red-500 rounded-full"
          style={{ pointerEvents: 'none' }}
        />
      )}
    </button>
  );
}

// ==========================================
// 2️⃣ MINI-TOAST (aperçu discret bas-droite)
// ==========================================

interface MiniToastProps {
  /** Message à afficher */
  message?: string;
  /** Afficher ou non */
  show?: boolean;
  /** Callback quand le toast se ferme */
  onClose?: () => void;
  /** Durée d'affichage en ms */
  duration?: number;
  /** Dark mode */
  darkMode?: boolean;
}

export function MiniToast({
  message = '3 nouvelles révisions',
  show = false,
  onClose,
  duration = 3000,
  darkMode = false
}: MiniToastProps) {
  useEffect(() => {
    if (show && onClose) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [show, onClose, duration]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className={`
            fixed bottom-6 right-6 z-50
            px-5 py-3 rounded-2xl
            shadow-2xl backdrop-blur-xl
            ${darkMode
              ? 'bg-gray-800/90 border border-gray-700/50 text-gray-100'
              : 'bg-white/90 border border-gray-200/50 text-gray-800'
            }
            flex items-center gap-3
            max-w-[calc(100vw-3rem)]
          `}
          role="alert"
          aria-live="polite"
        >
          {/* Icône */}
          <div className={`
            flex-shrink-0 w-8 h-8 rounded-full
            flex items-center justify-center
            ${darkMode ? 'bg-purple-500/20' : 'bg-purple-100'}
          `}>
            <Bell className={`w-4 h-4 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
          </div>

          {/* Message */}
          <p className="text-sm font-medium">
            {message}
          </p>

          {/* Barre de progression */}
          <motion.div
            initial={{ width: '100%' }}
            animate={{ width: '0%' }}
            transition={{ duration: duration / 1000, ease: 'linear' }}
            className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ==========================================
// 3️⃣ NOTIFICATION PANEL (dropdown amélioré)
// ==========================================

interface NotificationPanelProps {
  /** Panneau ouvert ou fermé */
  isOpen?: boolean;
  /** Notifications */
  notifications?: Array<{
    id: string;
    title: string;
    message: string;
    time: string;
    isRead: boolean;
    type: 'info' | 'success' | 'warning' | 'error';
  }>;
  /** Dark mode */
  darkMode?: boolean;
  /** Callback fermeture */
  onClose?: () => void;
  /** Callback suppression */
  onDelete?: (id: string) => void;
  /** Callback marquer comme lu */
  onMarkAsRead?: (id: string) => void;
}

export function NotificationPanel({
  isOpen = false,
  notifications = [],
  darkMode = false,
  onClose,
  onDelete,
  onMarkAsRead
}: NotificationPanelProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const handleDelete = (id: string) => {
    if (prefersReducedMotion) {
      onDelete?.(id);
    } else {
      setDeletingId(id);
      setTimeout(() => {
        onDelete?.(id);
        setDeletingId(null);
      }, 200);
    }
  };

  const getTypeColors = (type: string, isRead: boolean) => {
    if (isRead) return darkMode ? 'bg-gray-800/50' : 'bg-white';

    switch (type) {
      case 'success':
        return darkMode ? 'bg-green-500/10' : 'bg-green-50';
      case 'warning':
        return darkMode ? 'bg-yellow-500/10' : 'bg-yellow-50';
      case 'error':
        return darkMode ? 'bg-red-500/10' : 'bg-red-50';
      default:
        return darkMode ? 'bg-blue-500/10' : 'bg-blue-50';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40 backdrop-blur-[2px]"
            onClick={onClose}
            style={{
              background: darkMode
                ? 'rgba(0, 0, 0, 0.2)'
                : 'rgba(0, 0, 0, 0.05)'
            }}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            className={`
              absolute top-full right-0 mt-2 w-96 max-w-[calc(100vw-2rem)]
              ${darkMode
                ? 'bg-gray-800/95 border-gray-700/50'
                : 'bg-white/95 border-gray-200/50'
              }
              border rounded-2xl shadow-2xl z-50
              max-h-[600px] flex flex-col
              backdrop-blur-xl
            `}
            role="dialog"
            aria-label="Notifications"
          >
            {/* Header */}
            <div className={`
              flex items-center justify-between p-4 border-b
              ${darkMode ? 'border-gray-700/50' : 'border-gray-200/50'}
            `}>
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                <h3 className="font-semibold">Notifications</h3>
                {notifications.filter(n => !n.isRead).length > 0 && (
                  <span className={`
                    px-2 py-0.5 rounded-full text-xs font-medium
                    bg-gradient-to-r from-purple-500 to-pink-500
                    text-white
                  `}>
                    {notifications.filter(n => !n.isRead).length}
                  </span>
                )}
              </div>
              <button
                onClick={onClose}
                className={`
                  p-1.5 rounded-lg transition-colors
                  ${darkMode
                    ? 'hover:bg-gray-700 text-gray-300'
                    : 'hover:bg-gray-100 text-gray-600'
                  }
                `}
                aria-label="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Liste avec scroll */}
            <div className="overflow-y-auto flex-1">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Aucune notification</p>
                </div>
              ) : (
                <div>
                  <AnimatePresence>
                    {notifications.map((notif, index) => (
                      <motion.div
                        key={notif.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{
                          opacity: deletingId === notif.id ? 0 : 1,
                          scale: deletingId === notif.id ? 0.95 : 1,
                          x: 0
                        }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: index * 0.05, duration: prefersReducedMotion ? 0 : 0.2 }}
                        whileHover={{
                          scale: deletingId === notif.id ? 0.95 : 1.02,
                          transition: { duration: 0.2 }
                        }}
                        className={`
                          relative p-4 cursor-pointer transition-all duration-200
                          ${getTypeColors(notif.type, notif.isRead)}
                          ${darkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'}
                          border-b last:border-b-0
                          ${darkMode ? 'border-gray-700/30' : 'border-gray-200/30'}
                          overflow-hidden
                        `}
                        onClick={() => !notif.isRead && onMarkAsRead?.(notif.id)}
                      >
                        {/* Glow effect on hover */}
                        {!notif.isRead && (
                          <motion.div
                            className="absolute inset-0 pointer-events-none"
                            initial={{ opacity: 0 }}
                            whileHover={{ opacity: 0.05 }}
                            style={{
                              background: 'radial-gradient(circle at center, rgba(147, 51, 234, 0.3), transparent 70%)'
                            }}
                          />
                        )}

                        <div className="flex items-start gap-3 relative z-10">
                          {/* Dot indicateur */}
                          <div className={`
                            flex-shrink-0 w-2 h-2 rounded-full mt-2
                            ${notif.isRead ? 'opacity-0' : 'bg-gradient-to-br from-purple-500 to-pink-500'}
                          `} />

                          {/* Contenu */}
                          <div className="flex-1 min-w-0 pr-8">
                            <h4 className={`
                              font-semibold text-sm
                              ${darkMode ? 'text-gray-100' : 'text-gray-900'}
                            `}>
                              {notif.title}
                            </h4>
                            <p className={`
                              text-sm mt-1
                              ${darkMode ? 'text-gray-300' : 'text-gray-600'}
                            `}>
                              {notif.message}
                            </p>
                            <p className={`
                              text-xs mt-2
                              ${darkMode ? 'text-gray-500' : 'text-gray-400'}
                            `}>
                              {notif.time}
                            </p>
                          </div>

                          {/* Bouton supprimer */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(notif.id);
                            }}
                            aria-label="Supprimer la notification"
                            className={`
                              absolute top-2 right-2 w-8 h-8
                              flex items-center justify-center
                              rounded-full transition-all duration-200
                              ${darkMode
                                ? 'bg-gray-700/50 hover:bg-gray-600 text-gray-400 hover:text-white'
                                : 'bg-gray-100/80 hover:bg-gray-200 text-gray-500 hover:text-gray-700'
                              }
                              focus:outline-none focus:ring-2 focus:ring-rose-400
                              opacity-0 group-hover:opacity-100
                            `}
                            style={{ minWidth: '44px', minHeight: '44px' }}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ==========================================
// 4️⃣ PROGRESS HINT (barre discrète haut écran)
// ==========================================

interface ProgressHintProps {
  /** Afficher ou non */
  show?: boolean;
  /** Durée de remplissage en ms */
  duration?: number;
  /** Dark mode */
  darkMode?: boolean;
}

export function ProgressHint({
  show = false,
  duration = 2000,
  darkMode = false
}: ProgressHintProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 0.6 }}
          exit={{ opacity: 0 }}
          transition={{
            scaleX: { duration: duration / 1000, ease: 'easeInOut' },
            opacity: { duration: 0.3 }
          }}
          className={`
            fixed top-0 left-0 right-0 z-50
            h-[3px] origin-left
            bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500
            shadow-lg shadow-purple-500/50
          `}
          style={{
            transformOrigin: 'left'
          }}
          role="progressbar"
          aria-label="Chargement des notifications"
        />
      )}
    </AnimatePresence>
  );
}

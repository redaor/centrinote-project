/**
 * Composant: MessageBubbleUser
 *
 * Affiche une bulle de message envoyée par l'utilisateur avec:
 * - Avatar utilisateur (image ou fallback 👤)
 * - Contenu du message
 * - Style gradient bleu-violet
 * - Animations framer-motion
 *
 * Composant présentationnel pur (aucun état externe, aucun appel API).
 * L'état de l'avatar (erreur de chargement) est géré localement pour l'UI.
 *
 * @example
 * <MessageBubbleUser
 *   message={userMessage}
 *   darkMode={false}
 *   user={{ id: '123', name: 'John', avatar: 'https://...' }}
 * />
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';

/**
 * Message interface
 */
interface Message {
  id: string;
  type: 'user' | 'ai' | 'error' | 'code';
  content: string;
  timestamp: Date;
  metadata?: {
    executionTime?: number;
    securityScore?: number;
    isValid?: boolean;
    isFileContext?: boolean;
    hasFileContext?: boolean;
    fullText?: string;
    isSegmented?: boolean;
  };
}

/**
 * User interface
 */
interface User {
  id: string;
  name?: string;
  avatar?: string;
}

/**
 * Props du composant MessageBubbleUser
 */
interface MessageBubbleUserProps {
  /** Message à afficher */
  message: Message;
  /** Mode sombre activé */
  darkMode: boolean;
  /** Informations utilisateur */
  user: User | null;
}

/**
 * Composant Avatar Utilisateur
 * Gère l'affichage de l'avatar avec fallback en cas d'erreur
 */
function UserAvatar({ user }: { user: User | null }) {
  const [imgError, setImgError] = useState(false);

  return (
    <motion.div
      className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center overflow-hidden"
      whileHover={{ scale: 1.05 }}
    >
      {user?.avatar && !imgError ? (
        <img
          src={user.avatar}
          alt={user.name || 'Utilisateur'}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="text-white text-xs">👤</span>
      )}
    </motion.div>
  );
}

/**
 * Composant MessageBubbleUser
 */
export function MessageBubbleUser({
  message,
  darkMode,
  user,
}: MessageBubbleUserProps) {
  return (
    <motion.div
      key={message.id}
      className="flex justify-center gap-2.5 w-full"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {/* Bulle de message - Gradient vibrant avec glow effect */}
      <div className="flex justify-center w-full">
        <div className="max-w-3xl w-full">
          <motion.div
            className="relative bg-gradient-to-r from-blue-500 via-blue-600 to-purple-600 text-white rounded-xl shadow-lg shadow-blue-500/20 dark:shadow-blue-500/30 px-4 py-3.5 mb-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, ease: "easeOut" }}
          >
            {/* Glow effect subtil */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-400/20 to-purple-400/20 blur-xl -z-10" />

            {/* Contenu du message - Typography cohérente */}
            <div className="prose prose-sm prose-invert max-w-none">
              <div className="whitespace-pre-wrap leading-relaxed break-words">
                {message.content}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

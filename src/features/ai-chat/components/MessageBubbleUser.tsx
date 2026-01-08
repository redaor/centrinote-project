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
  /** Informations utilisateur */
  user: User | null;
}

/**
 * Composant MessageBubbleUser
 */
export function MessageBubbleUser({
  message,
  user,
}: MessageBubbleUserProps) {
  return (
    <motion.div
      key={message.id}
      className="w-full mb-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="flex justify-end">
        <div className="max-w-[80%]">
          <div className="bg-stone-200 dark:bg-stone-700 rounded-lg px-4 py-3">
            <div className="text-sm leading-relaxed whitespace-pre-wrap break-words text-stone-900 dark:text-stone-100">
              {message.content}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

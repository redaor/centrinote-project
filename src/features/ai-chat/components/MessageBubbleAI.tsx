/**
 * Composant: MessageBubbleAI
 *
 * Affiche une bulle de message générée par l'IA avec:
 * - Avatar Brain animé
 * - Contenu du message avec formatage Tailwind Prose
 * - Barre d'actions (Copier, Régénérer, J'aime)
 * - Animations framer-motion
 *
 * Composant présentationnel pur (aucun état, aucun appel API).
 * Toutes les actions sont gérées via callbacks passées en props.
 *
 * @example
 * <MessageBubbleAI
 *   message={aiMessage}
 *   darkMode={false}
 *   onCopy={() => navigator.clipboard.writeText(message.content)}
 *   onRegenerate={() => handleRegenerate(message.id)}
 *   onLike={() => handleLike(message.id)}
 * />
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Copy, RefreshCw, ThumbsUp } from 'lucide-react';

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
 * Props du composant MessageBubbleAI
 */
interface MessageBubbleAIProps {
  /** Message à afficher */
  message: Message;
  /** Callback pour copier le message */
  onCopy: () => void;
  /** Callback pour régénérer le message */
  onRegenerate: () => void;
  /** Callback pour liker le message */
  onLike: () => void;
}

/**
 * Composant MessageBubbleAI
 */
export function MessageBubbleAI({
  message,
  onCopy,
  onRegenerate,
  onLike,
}: MessageBubbleAIProps) {
  return (
    <motion.div
      key={message.id}
      className="w-full mb-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="flex justify-start">
        <div className="max-w-[80%]">
          <div className="text-sm leading-relaxed whitespace-pre-wrap break-words text-stone-800 dark:text-stone-200">
            {message.content}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

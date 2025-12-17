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
  /** Mode sombre activé */
  darkMode: boolean;
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
  darkMode,
  onCopy,
  onRegenerate,
  onLike,
}: MessageBubbleAIProps) {
  return (
    <motion.div
      key={message.id}
      className="flex justify-center gap-2 w-full"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Avatar Brain */}
      <motion.div
        className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center"
        whileHover={{ scale: 1.05 }}
      >
        <Brain className="w-3.5 h-3.5 text-white" />
      </motion.div>

      {/* Bulle de message */}
      <div className="flex justify-center w-full">
        <div className="max-w-3xl w-full">
          <motion.div
            className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-2xl shadow-sm"
            style={{ padding: '1rem', marginBottom: '1rem' }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            {/* Contenu structuré avec Tailwind Prose */}
            <div
              className="prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-ul:my-2 prose-li:my-1"
              style={{
                lineHeight: '1.6',
                wordBreak: 'break-word',
                overflowWrap: 'break-word',
                whiteSpace: 'pre-wrap'
              }}
            >
              {message.content}
            </div>

            {/* Barre d'actions */}
            <div
              className="flex items-center justify-end gap-1.5 border-t border-gray-100 dark:border-gray-700"
              style={{ marginTop: '0.75rem', paddingTop: '0.5rem' }}
            >
              {/* Bouton Copier */}
              <motion.button
                className="p-1.5 rounded transition-all duration-150 opacity-60 hover:opacity-100 hover:bg-gray-100 dark:hover:bg-gray-700"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                title="Copier"
                onClick={onCopy}
              >
                <Copy className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </motion.button>

              {/* Bouton Régénérer */}
              <motion.button
                className="p-1.5 rounded transition-all duration-150 opacity-60 hover:opacity-100 hover:bg-gray-100 dark:hover:bg-gray-700"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                title="Régénérer"
                onClick={onRegenerate}
              >
                <RefreshCw className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </motion.button>

              {/* Bouton J'aime */}
              <motion.button
                className="p-1.5 rounded transition-all duration-150 opacity-60 hover:opacity-100 hover:bg-gray-100 dark:hover:bg-gray-700"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                title="J'aime"
                onClick={onLike}
              >
                <ThumbsUp className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

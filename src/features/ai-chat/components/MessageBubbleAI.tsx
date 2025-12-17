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
      className="flex justify-center gap-2.5 w-full"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {/* Avatar Brain - Plus grand et plus visible */}
      <motion.div
        className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center shadow-sm"
        whileHover={{ scale: 1.1 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
      >
        <Brain className="w-4 h-4 text-white" />
      </motion.div>

      {/* Bulle de message - Design moderne et aéré */}
      <div className="flex justify-center w-full">
        <div className="max-w-3xl w-full">
          <motion.div
            className="bg-slate-50/80 dark:bg-gray-800/60 text-gray-900 dark:text-gray-100 rounded-xl shadow-md shadow-slate-200/50 dark:shadow-gray-900/30 border border-slate-100/80 dark:border-gray-700/30 backdrop-blur-sm px-4 py-3.5 mb-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, ease: "easeOut" }}
          >
            {/* Contenu structuré avec Tailwind Prose - Spacing amélioré */}
            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-3 prose-p:leading-relaxed prose-ul:my-3 prose-li:my-1.5 prose-li:leading-relaxed leading-relaxed break-words whitespace-pre-wrap">
              {message.content}
            </div>

            {/* Barre d'actions - Plus visible et élégante */}
            <div className="flex items-center justify-end gap-1.5 border-t border-slate-200/60 dark:border-gray-700/40 mt-3 pt-2.5">
              {/* Bouton Copier */}
              <motion.button
                className="p-2 rounded-lg transition-all duration-200 ease-out opacity-75 hover:opacity-100 hover:bg-slate-200/60 dark:hover:bg-gray-700/60"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                title="Copier"
                onClick={onCopy}
              >
                <Copy className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </motion.button>

              {/* Bouton Régénérer */}
              <motion.button
                className="p-2 rounded-lg transition-all duration-200 ease-out opacity-75 hover:opacity-100 hover:bg-slate-200/60 dark:hover:bg-gray-700/60"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                title="Régénérer"
                onClick={onRegenerate}
              >
                <RefreshCw className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </motion.button>

              {/* Bouton J'aime */}
              <motion.button
                className="p-2 rounded-lg transition-all duration-200 ease-out opacity-75 hover:opacity-100 hover:bg-slate-200/60 dark:hover:bg-gray-700/60"
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

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
      className="w-full mb-8"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <div className="flex items-start gap-4">
        {/* Avatar Brain - Minimaliste */}
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
          <Brain className="w-4 h-4 text-white" />
        </div>

        {/* Contenu du message - Texte fluide type Kimi */}
        <div className="flex-1 min-w-0">
          {/* Texte naturel sans bordure */}
          <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-3 prose-p:leading-relaxed prose-ul:my-3 prose-ul:list-outside prose-ul:pl-5 prose-li:my-1.5 prose-li:leading-relaxed prose-li:pl-0 prose-ol:my-3 prose-ol:list-outside prose-ol:pl-5 leading-relaxed break-words whitespace-pre-wrap text-gray-800 dark:text-gray-200">
            {message.content}
          </div>

          {/* Barre d'actions - Ultra discrète */}
          <div className="flex items-center gap-2 mt-3">
            <button
              className="p-1 opacity-30 hover:opacity-100 transition-opacity"
              title="Copier"
              onClick={onCopy}
            >
              <Copy className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
            </button>

            <button
              className="p-1 opacity-30 hover:opacity-100 transition-opacity"
              title="Régénérer"
              onClick={onRegenerate}
            >
              <RefreshCw className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
            </button>

            <button
              className="p-1 opacity-30 hover:opacity-100 transition-opacity"
              title="J'aime"
              onClick={onLike}
            >
              <ThumbsUp className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Composant: MessagesContainer
 *
 * Zone scrollable d'affichage des messages avec:
 * - État de chargement
 * - État vide (aucun message)
 * - Affichage des segments progressifs
 * - Rendu des messages (user, ai, error, code)
 * - Support NoteoMessageWrapper pour messages améliorés
 * - Indicateur de chargement
 * - Ref pour auto-scroll
 *
 * Composant présentationnel pur (aucun état métier, aucun appel API).
 * Tous les événements sont gérés via callbacks.
 *
 * @example
 * <MessagesContainer
 *   messages={messages}
 *   segments={segments}
 *   isLoadingMessages={isLoadingMessages}
 *   isLoading={isLoading}
 *   darkMode={false}
 *   user={user}
 *   messagesEndRef={messagesEndRef}
 *   onCopyMessage={(content) => navigator.clipboard.writeText(content)}
 *   onRegenerateMessage={(messageId) => handleRegenerate(messageId)}
 *   onLikeMessage={(messageId) => handleLike(messageId)}
 * />
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Loader2, AlertCircle } from 'lucide-react';
import { SegmentedMessage } from '../../../components/ai/SegmentedMessage';
import { MessageBubbleAI } from './MessageBubbleAI';
import { MessageBubbleUser } from './MessageBubbleUser';
import type { ChatSegment } from '../../../hooks/useChatSegmentation';

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
 * Props du composant MessagesContainer
 */
interface MessagesContainerProps {
  /** Liste des messages à afficher */
  messages: Message[];
  /** Segments de messages pour affichage progressif */
  segments: ChatSegment[];
  /** État de chargement des messages sauvegardés */
  isLoadingMessages: boolean;
  /** État de chargement d'une nouvelle réponse */
  isLoading: boolean;
  /** Utilisateur courant */
  user: User | null;
  /** Ref pour auto-scroll vers le dernier message */
  messagesEndRef: React.RefObject<HTMLDivElement>;
  /** Callback pour copier un message */
  onCopyMessage: (content: string) => void;
  /** Callback pour régénérer un message */
  onRegenerateMessage: (messageId: string) => void;
  /** Callback pour liker un message */
  onLikeMessage: (messageId: string) => void;
}

/**
 * Composant MessagesContainer
 */
export function MessagesContainer({
  messages,
  segments,
  isLoadingMessages,
  isLoading,
  user,
  messagesEndRef,
  onCopyMessage,
  onRegenerateMessage,
  onLikeMessage,
}: MessagesContainerProps) {
  return (
    <motion.div
      className="flex-1 overflow-y-auto"
      style={{ minHeight: '150px' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="max-w-4xl mx-auto px-8 py-12 flex flex-col">
        {/* État de chargement */}
        {isLoadingMessages ? (
          <motion.div
            className="flex items-center justify-center py-12"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
              <p className="text-sm text-slate-600 dark:text-gray-400">Chargement...</p>
            </div>
          </motion.div>
        ) : messages.length === 0 && segments.length === 0 ? (
          // État vide
          <motion.div
            className="flex items-center justify-center h-full min-h-[300px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="text-center">
              <motion.div
                className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center"
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                <Brain className="w-8 h-8 text-white" />
              </motion.div>
              <p className="text-slate-600 dark:text-gray-400">
                Aucun message pour le moment. Posez votre question ci-dessous !
              </p>
            </div>
          </motion.div>
        ) : null}

        {/* Afficher les segments de message si disponibles */}
        {segments.length > 0 && (
          <AnimatePresence>
            {segments.map((segment, index) => (
              <SegmentedMessage
                key={segment.id}
                segment={segment}
                index={index}
              />
            ))}
          </AnimatePresence>
        )}

        {/* Afficher les messages */}
        <AnimatePresence>
          {messages.map((message) => {
            if (!message.content || message.content.trim().length === 0) {
              return null;
            }

            // Message AI (afficher si pas segmenté OU si les segments sont vides)
            if (message.type === 'ai' && (!message.metadata?.isSegmented || segments.length === 0)) {
              // Utiliser toujours le format minimaliste MessageBubbleAI
              return (
                <MessageBubbleAI
                  key={message.id}
                  message={message}
                  onCopy={() => onCopyMessage(message.content)}
                  onRegenerate={() => onRegenerateMessage(message.id)}
                  onLike={() => onLikeMessage(message.id)}
                />
              );
            }

            // Message User
            if (message.type === 'user') {
              return (
                <MessageBubbleUser
                  key={message.id}
                  message={message}
                  user={user}
                />
              );
            }

            // Message Error
            if (message.type === 'error') {
              return (
                <motion.div
                  key={message.id}
                  className="w-full mb-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="flex justify-start">
                    <div className="max-w-[80%]">
                      <div className="bg-red-50 dark:bg-red-900/20 rounded-lg px-4 py-3 border border-red-200 dark:border-red-800">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words text-red-700 dark:text-red-400">
                          {message.content}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            }

            // Message Code
            if (message.type === 'code') {
              return (
                <motion.div
                  key={message.id}
                  className="w-full mb-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="flex justify-start">
                    <div className="max-w-[80%]">
                      <div className="bg-stone-100 dark:bg-stone-800 rounded-lg px-4 py-3">
                        <pre className="text-sm leading-relaxed font-mono whitespace-pre-wrap break-all text-stone-800 dark:text-stone-200">
                          <code>{message.content}</code>
                        </pre>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            }

            return null;
          })}
        </AnimatePresence>

        {/* Indicateur de chargement - Minimaliste */}
        {isLoading && (
          <motion.div
            className="w-full mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="flex justify-start">
              <div className="max-w-[80%]">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-stone-500 dark:text-stone-400" />
                  <span className="text-sm leading-relaxed text-stone-600 dark:text-stone-400">
                    L'IA réfléchit...
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Anchor pour auto-scroll */}
        <div ref={messagesEndRef} />
      </div>
    </motion.div>
  );
}

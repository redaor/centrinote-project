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
import { NoteoMessageWrapper } from '../../../components/ai/NoteoMessageWrapper';
import { analyzeMessage } from '../../../utils/noteoMessageDetector';
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
  /** Mode sombre activé */
  darkMode: boolean;
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
  darkMode,
  user,
  messagesEndRef,
  onCopyMessage,
  onRegenerateMessage,
  onLikeMessage,
}: MessagesContainerProps) {
  return (
    <motion.div
      className="flex-1 overflow-y-auto px-4 py-4 bg-gradient-to-b from-transparent to-slate-50/50 dark:to-gray-900/50"
      style={{ minHeight: '150px' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="max-w-4xl mx-auto flex flex-col gap-6 px-4">
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
                darkMode={darkMode}
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
              // Détecter si le message doit utiliser le format EnhancedNoteoMessage
              const messageAnalysis = analyzeMessage(message.content);

              if (messageAnalysis.shouldUseEnhanced) {
                return (
                  <motion.div
                    key={message.id}
                    className="flex justify-center gap-2 w-full"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <motion.div
                      className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center"
                      whileHover={{ scale: 1.05 }}
                    >
                      <Brain className="w-3.5 h-3.5 text-white" />
                    </motion.div>
                    <div className="flex justify-center w-full">
                      <div className="max-w-3xl w-full">
                        <div className="mb-4">
                          <NoteoMessageWrapper
                            content={message.content}
                            problemType={messageAnalysis.problemType || 'general'}
                            userName={user?.name}
                            darkMode={darkMode}
                            onSuccess={() => {
                              console.log('✅ Problème résolu');
                            }}
                            onFailure={() => {
                              console.log('❌ Problème persiste');
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              }

              // Format standard pour les messages sans étapes
              return (
                <MessageBubbleAI
                  key={message.id}
                  message={message}
                  darkMode={darkMode}
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
                  darkMode={darkMode}
                  user={user}
                />
              );
            }

            // Message Error
            if (message.type === 'error') {
              return (
                <motion.div
                  key={message.id}
                  className="flex justify-center w-full"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="max-w-3xl w-full">
                    <div
                      className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl"
                      style={{ padding: '1rem', marginBottom: '1rem' }}
                    >
                      <div className="flex items-start gap-2" style={{ marginBottom: '0.5rem' }}>
                        <AlertCircle
                          className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0"
                          style={{ marginTop: '0.125rem' }}
                        />
                        <span
                          className="text-sm font-medium text-red-800 dark:text-red-200"
                          style={{ lineHeight: '1.45' }}
                        >
                          Erreur
                        </span>
                      </div>
                      <p
                        className="text-sm text-red-700 dark:text-red-300 whitespace-pre-wrap"
                        style={{ lineHeight: '1.45', textAlign: 'left' }}
                      >
                        {message.content}
                      </p>
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
                  className="flex justify-center w-full"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="max-w-3xl w-full">
                    <div
                      className="bg-slate-900 dark:bg-gray-950 border border-slate-700 dark:border-gray-800 rounded-2xl overflow-x-auto"
                      style={{ padding: '1rem', marginBottom: '1rem' }}
                    >
                      <pre
                        className="text-sm text-slate-100 font-mono whitespace-pre-wrap"
                        style={{ lineHeight: '1.45' }}
                      >
                        <code>{message.content}</code>
                      </pre>
                    </div>
                  </div>
                </motion.div>
              );
            }

            return null;
          })}
        </AnimatePresence>

        {/* Indicateur de chargement */}
        {isLoading && (
          <div className="flex justify-center w-full">
            <div className="max-w-3xl w-full">
              <motion.div
                className="flex gap-2 w-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <Brain className="w-3.5 h-3.5 text-white" />
                </div>
                <div
                  className="bg-[#f1f1f1] dark:bg-gray-800/60 rounded-lg border border-slate-200/50 dark:border-gray-700/50"
                  style={{ padding: '1rem' }}
                >
                  <div className="flex items-start gap-2">
                    <Loader2
                      className="w-3.5 h-3.5 animate-spin text-blue-600 dark:text-blue-400 flex-shrink-0"
                      style={{ marginTop: '0.125rem' }}
                    />
                    <span
                      className="text-sm text-slate-600 dark:text-gray-400"
                      style={{ lineHeight: '1.45' }}
                    >
                      L'IA réfléchit...
                    </span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        )}

        {/* Anchor pour auto-scroll */}
        <div ref={messagesEndRef} />
      </div>
    </motion.div>
  );
}

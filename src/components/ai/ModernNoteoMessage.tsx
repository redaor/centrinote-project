/**
 * Composant de message Noteo avec style chat moderne
 * Messages segmentés, horodatés avec emojis numériques
 * Format conversationnel moderne selon les spécifications
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Brain } from 'lucide-react';

export interface ModernSegment {
  id: string;
  time: string;
  emoji: string;
  title?: string;
  content: string;
  isSummary?: boolean;
  isWelcome?: boolean;
  isIntro?: boolean;
}

export interface ModernNoteoMessageProps {
  segments: ModernSegment[];
  onSuccess?: () => void;
  onFailure?: () => void;
  userName?: string;
  showProgressively?: boolean;
  segmentDelay?: number;
  darkMode?: boolean;
}

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Mapping des numéros vers les emojis numériques
const numberToEmoji: Record<number, string> = {
  1: '1️⃣',
  2: '2️⃣',
  3: '3️⃣',
  4: '4️⃣',
  5: '5️⃣',
  6: '6️⃣',
  7: '7️⃣',
  8: '8️⃣',
  9: '9️⃣',
  10: '🔟',
};

// Détecter si un emoji est un numéro
const isNumberEmoji = (emoji: string): boolean => {
  return Object.values(numberToEmoji).includes(emoji);
};

export function ModernNoteoMessage({
  segments,
  onSuccess,
  onFailure,
  userName,
  showProgressively = true,
  segmentDelay = 1500,
  darkMode = false,
}: ModernNoteoMessageProps) {
  const [visibleSegments, setVisibleSegments] = useState<number[]>([]);
  const [userResponse, setUserResponse] = useState<'success' | 'failure' | null>(null);

  useEffect(() => {
    if (showProgressively) {
      // Affichage progressif rapide
      segments.forEach((_, index) => {
        setTimeout(() => {
          setVisibleSegments(prev => [...prev, index]);
        }, segmentDelay * index);
      });
    } else {
      // Affichage instantané (pour le chatbot)
      setVisibleSegments(segments.map((_, index) => index));
    }
  }, [segments, showProgressively, segmentDelay]);

  const handleSuccess = () => {
    setUserResponse('success');
    onSuccess?.();
  };

  const handleFailure = () => {
    setUserResponse('failure');
    onFailure?.();
  };

  return (
    <div className={`w-full space-y-3 ${darkMode ? 'dark' : ''}`}>
      <AnimatePresence>
        {segments.map((segment, index) => {
          const isVisible = visibleSegments.includes(index);
          const isNumericStep = isNumberEmoji(segment.emoji);

          return (
            <motion.div
              key={segment.id}
              initial={showProgressively ? { opacity: 0, y: 10, scale: 0.98 } : { opacity: 1, y: 0, scale: 1 }}
              animate={isVisible ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 10, scale: 0.98 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{
                duration: showProgressively ? 0.2 : 0.1, // Animation plus rapide
                delay: 0, // Pas de délai supplémentaire
                ease: 'easeOut'
              }}
              className="w-full"
            >
              {/* Message bubble style chat moderne */}
              <div className="flex gap-3 w-full">
                {/* Avatar Noteo */}
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center shadow-md">
                  <Brain className="w-4 h-4 text-white" />
                </div>

                {/* Message content */}
                <div className="flex-1 min-w-0">
                  {/* Message bubble */}
                  <div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-2xl rounded-tl-sm shadow-sm relative" style={{ padding: '1rem', paddingLeft: '1.25rem' }}>
                    <div 
                      className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
                      style={{
                        background: 'linear-gradient(to bottom, #60a5fa, #a78bfa)'
                      }}
                    />
                    {/* Header avec horodatage moderne */}
                    <div className="flex items-start gap-2" style={{ lineHeight: '1.45', textAlign: 'left', marginBottom: '1rem' }}>
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400" style={{ lineHeight: '1.45' }}>
                        {segment.time}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500" style={{ lineHeight: '1.45' }}>-</span>
                      <div className="flex items-start gap-2" style={{ lineHeight: '1.45' }}>
                        {segment.isWelcome ? (
                          <Brain className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" style={{ marginTop: '0.125rem' }} />
                        ) : segment.isSummary ? (
                          <span className="text-sm" style={{ lineHeight: '1.45', verticalAlign: 'middle' }}>📊</span>
                        ) : segment.isIntro ? (
                          <span className="text-sm" style={{ lineHeight: '1.45', verticalAlign: 'middle' }}>📚</span>
                        ) : (
                          <span className="text-sm" style={{ lineHeight: '1.45', verticalAlign: 'middle' }}>{segment.emoji}</span>
                        )}
                        <span className="text-sm font-semibold text-blue-600 dark:text-blue-400" style={{ lineHeight: '1.45', textAlign: 'left' }}>
                          {segment.isWelcome
                            ? 'Assistant Centrinote'
                            : segment.isSummary
                              ? 'Résumé'
                              : segment.isIntro
                                ? 'Introduction'
                                : segment.title || (isNumericStep ? segment.content.split('\n')[0].substring(0, 30) + '...' : 'Noteo')}
                        </span>
                      </div>
                    </div>

                    {/* Contenu du message */}
                    <div className="text-sm text-gray-900 dark:text-gray-100" style={{ lineHeight: '1.45', textAlign: 'left' }}>
                      {/* Si c'est une étape numérotée, afficher le titre en gras */}
                      {isNumericStep && segment.title ? (
                        <>
                          <div className="font-semibold" style={{ lineHeight: '1.45', textAlign: 'left', marginBottom: '0.5rem' }}>
                            <span className="text-sm" style={{ lineHeight: '1.45', verticalAlign: 'middle' }}>{segment.emoji}</span> {segment.title}
                          </div>
                          <div className="whitespace-pre-wrap" style={{ lineHeight: '1.45', textAlign: 'left' }}>
                            {segment.content}
                          </div>
                        </>
                      ) : (
                        <div className="whitespace-pre-wrap" style={{ lineHeight: '1.45', textAlign: 'left' }}>
                          {segment.content}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Boutons de résultat (affichés après le dernier segment) - UNIQUEMENT si onSuccess/onFailure sont fournis */}
      {visibleSegments.length === segments.length && (onSuccess || onFailure) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: segmentDelay * segments.length + 300 }}
          className={`
            rounded-xl shadow-sm border
            ${darkMode
              ? 'bg-gray-800 border-gray-700'
              : 'bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200'
            }
          `}
          style={{ padding: '1rem' }}
        >
          <div className="flex items-start justify-between" style={{ marginBottom: '1rem' }}>
            <span className={`
              text-xs font-medium
              ${darkMode ? 'text-gray-400' : 'text-gray-600'}
            `} style={{ lineHeight: '1.45' }}>
              {formatTime(new Date())} - 📊 Résultat
            </span>
            <span className={`
              text-xs
              ${darkMode ? 'text-gray-400' : 'text-gray-600'}
            `} style={{ lineHeight: '1.45' }}>
              Est-ce que votre problème est résolu ?
            </span>
          </div>
          
          <div className="flex items-start gap-3">
            <motion.button
              onClick={handleSuccess}
              disabled={userResponse !== null}
              className={`
                flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg
                text-sm font-medium transition-all
                ${userResponse === 'success'
                  ? 'bg-green-500 text-white shadow-md'
                  : userResponse === 'failure'
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-300 dark:hover:border-green-700 hover:text-green-700 dark:hover:text-green-300'
                }
              `}
              whileHover={userResponse === null ? { scale: 1.02 } : {}}
              whileTap={userResponse === null ? { scale: 0.98 } : {}}
            >
              <CheckCircle className={`w-4 h-4 ${userResponse === 'success' ? 'text-white' : 'text-green-600 dark:text-green-400'}`} />
              <span>Oui, c'est réglé</span>
            </motion.button>

            <motion.button
              onClick={handleFailure}
              disabled={userResponse !== null}
              className={`
                flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg
                text-sm font-medium transition-all
                ${userResponse === 'failure'
                  ? 'bg-red-500 text-white shadow-md'
                  : userResponse === 'success'
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300 dark:hover:border-red-700 hover:text-red-700 dark:hover:text-red-300'
                }
              `}
              whileHover={userResponse === null ? { scale: 1.02 } : {}}
              whileTap={userResponse === null ? { scale: 0.98 } : {}}
            >
              <XCircle className={`w-4 h-4 ${userResponse === 'failure' ? 'text-white' : 'text-red-600 dark:text-red-400'}`} />
              <span>Non, toujours bloqué</span>
            </motion.button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

/**
 * Helper pour convertir un numéro en emoji numérique
 */
export function getNumberEmoji(num: number): string {
  return numberToEmoji[num] || `${num}.`;
}


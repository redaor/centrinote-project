/**
 * Composant de message Noteo avec design élégant et moderne
 * Affiche les messages de l'assistant avec des cartes d'étapes stylisées
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Clock, Lightbulb, Wifi, RefreshCw, Shield, Navigation } from 'lucide-react';

export interface Step {
  id: string;
  number: number;
  emoji: string;
  title: string;
  content: string;
  hint?: string;
}

export interface EnhancedNoteoMessageProps {
  welcomeMessage: string;
  steps: Step[];
  followUpMessage?: string;
  onSuccess?: () => void;
  onFailure?: () => void;
  userName?: string;
  problemType?: string;
  showStepsProgressively?: boolean;
  stepDelay?: number;
}

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('fr-FR', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

const getEmojiIcon = (emoji: string) => {
  const emojiMap: Record<string, React.ReactNode> = {
    '🌐': <Wifi className="w-4 h-4" />,
    '🔄': <RefreshCw className="w-4 h-4" />,
    '🔒': <Shield className="w-4 h-4" />,
    '🧭': <Navigation className="w-4 h-4" />,
    '💡': <Lightbulb className="w-4 h-4" />,
  };
  return emojiMap[emoji] || <span className="text-lg">{emoji}</span>;
};

export function EnhancedNoteoMessage({
  welcomeMessage,
  steps,
  followUpMessage = "Faites-moi savoir si l'une de ces étapes aide à résoudre votre problème !",
  onSuccess,
  onFailure,
  userName,
  showStepsProgressively = true,
  stepDelay = 500,
}: EnhancedNoteoMessageProps) {
  const [currentTime] = useState(() => formatTime(new Date()));
  const [visibleSteps, setVisibleSteps] = useState<number[]>([]);
  const [userResponse, setUserResponse] = useState<'success' | 'failure' | null>(null);

  useEffect(() => {
    if (showStepsProgressively) {
      steps.forEach((_, index) => {
        setTimeout(() => {
          setVisibleSteps(prev => [...prev, index]);
        }, stepDelay * (index + 1));
      });
    } else {
      setVisibleSteps(steps.map((_, index) => index));
    }
  }, [steps, showStepsProgressively, stepDelay]);

  const handleSuccess = () => {
    setUserResponse('success');
    onSuccess?.();
  };

  const handleFailure = () => {
    setUserResponse('failure');
    onFailure?.();
  };

  return (
    <motion.div
      className="w-full max-w-2xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Container Principal */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header avec horodatage */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-md">
                <Lightbulb className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    {currentTime}
                  </span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    Noteo
                  </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Assistant IA Centrinote
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Message de bienvenue */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50">
          <motion.p
            className="text-gray-900 dark:text-gray-100 text-sm leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {welcomeMessage}
          </motion.p>
        </div>

        {/* Container des étapes */}
        <div className="px-6 py-4 space-y-3">
          <AnimatePresence>
            {steps.map((step, index) => {
              const isVisible = visibleSteps.includes(index);
              
              return (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={isVisible ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 20, scale: 0.95 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ 
                    duration: 0.4,
                    delay: isVisible ? index * 0.1 : 0,
                    ease: [0.4, 0, 0.2, 1]
                  }}
                >
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-700 dark:to-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-600 shadow-sm hover:shadow-md transition-shadow">
                    {/* Header de l'étape */}
                    <div className="flex items-start gap-3 mb-2">
                      {/* Numéro de l'étape */}
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shadow-md">
                        {step.number}
                      </div>
                      
                      {/* Titre avec emoji */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{step.emoji}</span>
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                            {step.title}
                          </h3>
                        </div>
                      </div>
                    </div>

                    {/* Contenu de l'étape */}
                    <div className="ml-11">
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
                        {step.content}
                      </p>
                      
                      {/* Astuce si présente */}
                      {step.hint && (
                        <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border-l-2 border-yellow-400 dark:border-yellow-600">
                          <div className="flex items-start gap-2">
                            <Lightbulb className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-yellow-800 dark:text-yellow-200 italic">
                              {step.hint}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Message de suivi */}
        {followUpMessage && (
          <motion.div
            className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: steps.length * stepDelay + 300 }}
          >
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              {followUpMessage}
            </p>
          </motion.div>
        )}

        {/* Section de résultat avec boutons */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
              {currentTime} - 📊 Résultat
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-500">
              Est-ce que votre problème est résolu ?
            </span>
          </div>
          
          <div className="flex items-center gap-3">
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
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Helper pour créer des étapes depuis un texte
 */
export function createStepsFromText(text: string): Step[] {
  // Cette fonction peut être étendue pour parser automatiquement le texte
  // Pour l'instant, on retourne un exemple
  return [];
}

/**
 * Étapes prédéfinies pour le problème de sauvegarde
 */
export const SAVE_BUTTON_STEPS: Step[] = [
  {
    id: 'step-1',
    number: 1,
    emoji: '🌐',
    title: 'Connexion Internet',
    content: 'Vérifiez que vous êtes bien connecté à Internet. Parfois, une connexion instable peut empêcher l\'enregistrement.',
    hint: 'Astuce : Testez votre connexion sur un autre site pour confirmer',
  },
  {
    id: 'step-2',
    number: 2,
    emoji: '🔄',
    title: 'Actualisation',
    content: 'Actualisez la page (F5 ou le bouton ↻), puis réessayez d\'enregistrer votre note.',
    hint: 'Astuce : Utilisez Ctrl+F5 pour un rafraîchissement complet',
  },
  {
    id: 'step-3',
    number: 3,
    emoji: '🔒',
    title: 'Permissions',
    content: 'Vérifiez que Centrinote a les permissions nécessaires dans votre navigateur (cookies et données).',
    hint: 'Astuce : Vérifiez les paramètres de confidentialité de votre navigateur',
  },
  {
    id: 'step-4',
    number: 4,
    emoji: '🧭',
    title: 'Navigateur',
    content: 'Si le problème persiste, essayez d\'accéder à Centrinote avec un autre navigateur pour isoler le problème.',
    hint: 'Astuce : Chrome, Firefox et Edge sont tous compatibles',
  },
];



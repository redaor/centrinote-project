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
  return emojiMap[emoji] || <span className="text-sm" style={{ lineHeight: '1.45', verticalAlign: 'middle' }}>{emoji}</span>;
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
      className="w-full max-w-xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* UNE SEULE CARTE FUSIONNÉE */}
      <div className="bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-8">

        {/* Icône unique 🎯 (grande) */}
        <div className="flex justify-center mb-6">
          <div className="text-6xl">🎯</div>
        </div>

        {/* Message de bienvenue */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <p className="text-sm leading-relaxed text-stone-800 dark:text-stone-200">
            {welcomeMessage}
          </p>
        </motion.div>

        {/* Liste numérotée unique (toutes les étapes) */}
        <div className="space-y-6 mb-8">
          <AnimatePresence>
            {steps.map((step, index) => {
              const isVisible = visibleSteps.includes(index);

              return (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                  transition={{ duration: 0.3 }}
                  className="border-l-2 border-stone-300 dark:border-stone-600 pl-6"
                >
                  {/* Numéro + Titre */}
                  <div className="flex items-baseline gap-3 mb-2">
                    <span className="text-lg font-semibold text-stone-900 dark:text-stone-100">
                      {step.number}.
                    </span>
                    <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                      {step.title}
                    </h3>
                  </div>

                  {/* Contenu */}
                  <p className="text-sm leading-relaxed text-stone-700 dark:text-stone-300 ml-7">
                    {step.content}
                  </p>

                  {/* Astuce optionnelle */}
                  {step.hint && (
                    <div className="mt-3 ml-7 p-3 bg-amber-50 dark:bg-amber-900/20 border-l-2 border-amber-400 dark:border-amber-600 rounded">
                      <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-200 italic">
                        💡 {step.hint}
                      </p>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Message de suivi */}
        {followUpMessage && (
          <motion.div
            className="text-center pt-6 mb-6 border-t border-stone-200 dark:border-stone-700"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: steps.length * 0.3 }}
          >
            <p className="text-sm leading-relaxed text-stone-700 dark:text-stone-300">
              {followUpMessage}
            </p>
          </motion.div>
        )}

        {/* Boutons Oui/Non - Version minimaliste */}
        <div className="flex items-center gap-3 pt-6 border-t border-stone-200 dark:border-stone-700">
          <button
            onClick={handleSuccess}
            disabled={userResponse !== null}
            className={`
              flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg
              text-sm font-medium transition-colors
              ${userResponse === 'success'
                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border border-green-300 dark:border-green-700'
                : userResponse === 'failure'
                  ? 'bg-stone-100 dark:bg-stone-700 text-stone-400 dark:text-stone-500 border border-stone-200 dark:border-stone-600 cursor-not-allowed'
                  : 'bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-600 hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-300 dark:hover:border-green-700 hover:text-green-700 dark:hover:text-green-300'
              }
            `}
          >
            <CheckCircle className="w-4 h-4" />
            <span>Oui, c'est réglé</span>
          </button>

          <button
            onClick={handleFailure}
            disabled={userResponse !== null}
            className={`
              flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg
              text-sm font-medium transition-colors
              ${userResponse === 'failure'
                ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border border-red-300 dark:border-red-700'
                : userResponse === 'success'
                  ? 'bg-stone-100 dark:bg-stone-700 text-stone-400 dark:text-stone-500 border border-stone-200 dark:border-stone-600 cursor-not-allowed'
                  : 'bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-600 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300 dark:hover:border-red-700 hover:text-red-700 dark:hover:text-red-300'
              }
            `}
          >
            <XCircle className="w-4 h-4" />
            <span>Non, toujours bloqué</span>
          </button>
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



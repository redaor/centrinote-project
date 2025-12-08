/**
 * 🚫 Modal pour afficher les messages de limite de quota
 * Avec redirection vers la page d'upgrade
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Crown, X, ArrowRight, Zap, Users, FileText, Brain, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface QuotaLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature: 'meeting' | 'summary' | 'ai_tokens' | 'vocab' | 'automation' | 'ai_chat' | 'ai_help';
  currentUsage: number;
  limit: number | 'unlimited' | null;
  planName: string;
  darkMode?: boolean;
}

const featureConfig = {
  meeting: {
    icon: Users,
    title: 'Limite de réunions atteinte',
    description: 'Vous avez atteint votre quota de réunions pour ce mois.',
    upgradeBenefit: 'Créez plus de réunions avec un plan supérieur',
    featureName: 'réunions'
  },
  summary: {
    icon: FileText,
    title: 'Limite de résumés IA atteinte',
    description: 'Vous avez atteint votre quota de résumés automatiques pour ce mois.',
    upgradeBenefit: 'Générez des résumés illimités avec un plan supérieur',
    featureName: 'résumés IA'
  },
  ai_tokens: {
    icon: Brain,
    title: 'Quota de tokens IA épuisé',
    description: 'Vous avez utilisé tous vos tokens IA disponibles ce mois.',
    upgradeBenefit: 'Obtenez plus de tokens IA avec un plan supérieur',
    featureName: 'tokens IA'
  },
  vocab: {
    icon: Zap,
    title: 'Limite de vocabulaire atteinte',
    description: 'Vous avez atteint votre quota de mots de vocabulaire.',
    upgradeBenefit: 'Ajoutez plus de mots avec un plan supérieur',
    featureName: 'mots de vocabulaire'
  },
  automation: {
    icon: Settings,
    title: 'Limite d\'automatisations atteinte',
    description: 'Vous avez atteint votre quota d\'automatisations actives.',
    upgradeBenefit: 'Activez plus d\'automatisations avec un plan supérieur',
    featureName: 'automatisations'
  },
  ai_chat: {
    icon: Brain,
    title: 'Accès IA Discussion restreint',
    description: 'Cette fonctionnalité nécessite un plan supérieur.',
    upgradeBenefit: 'Accédez à l\'IA Discussion avec un plan supérieur',
    featureName: 'IA Discussion'
  },
  ai_help: {
    icon: Brain,
    title: 'Limite d\'Aide IA atteinte',
    description: 'Vous avez utilisé toutes vos utilisations d\'Aide IA (3 pour le plan Free).',
    upgradeBenefit: 'Obtenez plus d\'utilisations avec un plan supérieur',
    featureName: 'Aide IA'
  }
};

export function QuotaLimitModal({
  isOpen,
  onClose,
  feature,
  currentUsage,
  limit,
  planName,
  darkMode = false
}: QuotaLimitModalProps) {
  const navigate = useNavigate();
  const config = featureConfig[feature];
  const Icon = config.icon;
  const isUnlimited = limit === 'unlimited' || limit === null;
  const percentage = isUnlimited ? 0 : limit === 0 ? 100 : Math.round((currentUsage / limit) * 100);

  const handleUpgrade = () => {
    onClose();
    navigate('/launch'); // Redirection vers la page de plans
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={`fixed inset-0 z-50 flex items-center justify-center p-4`}
          >
            <div
              className={`
                relative w-full max-w-md rounded-2xl shadow-2xl
                ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}
              `}
            >
              {/* Close button */}
              <button
                onClick={onClose}
                className={`
                  absolute top-4 right-4 p-2 rounded-lg transition-colors
                  ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}
                `}
              >
                <X className="w-5 h-5" />
              </button>

              {/* Content */}
              <div className="p-6">
                {/* Icon & Title */}
                <div className="flex items-start gap-4 mb-4">
                  <div className={`
                    p-3 rounded-xl
                    ${feature === 'ai_tokens' || feature === 'ai_chat' || feature === 'ai_help'
                      ? 'bg-red-100 dark:bg-red-900/20'
                      : 'bg-orange-100 dark:bg-orange-900/20'
                    }
                  `}>
                    <Icon className={`
                      w-6 h-6
                      ${feature === 'ai_tokens' || feature === 'ai_chat' || feature === 'ai_help'
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-orange-600 dark:text-orange-400'
                      }
                    `} />
                  </div>
                  <div className="flex-1">
                    <h3 className={`
                      text-xl font-bold mb-1
                      ${darkMode ? 'text-white' : 'text-gray-900'}
                    `}>
                      {config.title}
                    </h3>
                    <p className={`
                      text-sm
                      ${darkMode ? 'text-gray-400' : 'text-gray-600'}
                    `}>
                      {config.description}
                    </p>
                  </div>
                </div>

                {/* Quota info */}
                {!isUnlimited && (
                  <div className={`
                    mb-4 p-4 rounded-lg
                    ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}
                  `}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`
                        text-sm font-medium
                        ${darkMode ? 'text-gray-300' : 'text-gray-700'}
                      `}>
                        Utilisation actuelle
                      </span>
                      <span className={`
                        text-sm font-bold
                        ${percentage >= 100 ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'}
                      `}>
                        {currentUsage} / {limit} {config.featureName}
                      </span>
                    </div>
                    <div className={`
                      w-full h-2 rounded-full overflow-hidden
                      ${darkMode ? 'bg-gray-600' : 'bg-gray-200'}
                    `}>
                      <div
                        className={`
                          h-full transition-all
                          ${percentage >= 100 ? 'bg-red-500' : 'bg-orange-500'}
                        `}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Plan info */}
                <div className={`
                  mb-4 p-3 rounded-lg flex items-center gap-2
                  ${darkMode ? 'bg-gray-700/50' : 'bg-blue-50'}
                `}>
                  <AlertCircle className={`
                    w-5 h-5 flex-shrink-0
                    ${darkMode ? 'text-blue-400' : 'text-blue-600'}
                  `} />
                  <p className={`
                    text-sm
                    ${darkMode ? 'text-blue-300' : 'text-blue-800'}
                  `}>
                    Limite du plan <strong>{planName}</strong> atteinte
                  </p>
                </div>

                {/* Upgrade benefit */}
                <div className={`
                  mb-6 p-4 rounded-lg
                  ${darkMode ? 'bg-gradient-to-r from-amber-900/30 to-orange-900/30 border border-amber-700' : 'bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200'}
                `}>
                  <div className="flex items-start gap-3">
                    <Crown className={`
                      w-5 h-5 flex-shrink-0 mt-0.5
                      ${darkMode ? 'text-amber-400' : 'text-amber-600'}
                    `} />
                    <div>
                      <p className={`
                        text-sm font-semibold mb-1
                        ${darkMode ? 'text-amber-300' : 'text-amber-900'}
                      `}>
                        Débloquez cette fonctionnalité
                      </p>
                      <p className={`
                        text-xs
                        ${darkMode ? 'text-amber-400' : 'text-amber-700'}
                      `}>
                        {config.upgradeBenefit}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className={`
                      flex-1 px-4 py-3 rounded-lg font-medium transition-colors
                      ${darkMode
                        ? 'bg-gray-700 hover:bg-gray-600 text-white'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                      }
                    `}
                  >
                    Plus tard
                  </button>
                  <button
                    onClick={handleUpgrade}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white rounded-lg font-medium transition-all transform hover:scale-105 shadow-lg flex items-center justify-center gap-2"
                  >
                    <Crown className="w-4 h-4" />
                    Voir les plans
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}


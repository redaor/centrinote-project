/**
 * Composant moderne pour le formulaire de création de réunion
 * Design élégant avec animations fluides et sections groupées
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Users, Zap, RefreshCw, Sparkles, Mail, AlertCircle, Crown } from 'lucide-react';
import { MeetingParticipant } from '../../types/meetings';
import { ParticipantsFormV2 } from './ParticipantsFormV2';
import { useQuotaCheck } from '../../hooks/useQuotaCheck';
import { usePlanLimits } from '../../hooks/usePlanLimits';

export interface ModernMeetingFormProps {
  onSubmit: (data: {
    title: string;
    description: string;
    participants: MeetingParticipant[];
    enableAiSummary: boolean;
  }) => void;
  onReset?: () => void;
  organizer?: {
    name: string;
    email: string;
  };
  darkMode?: boolean;
  isLoading?: boolean;
}

export function ModernMeetingForm({
  onSubmit,
  onReset,
  organizer,
  darkMode = false,
  isLoading = false
}: ModernMeetingFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [participants, setParticipants] = useState<MeetingParticipant[]>(
    organizer ? [{
      id: crypto.randomUUID(),
      name: organizer.name,
      email: organizer.email,
      role: 'organizer'
    }] : []
  );
  const [autoSummary, setAutoSummary] = useState(false);
  const [summaryQuotaCheck, setSummaryQuotaCheck] = useState<any>(null);
  const [checkingQuota, setCheckingQuota] = useState(true);
  
  const { check: checkQuota } = useQuotaCheck();
  const { limits } = usePlanLimits();

  // Vérifier le quota de résumés au chargement
  useEffect(() => {
    const verifySummaryQuota = async () => {
      try {
        setCheckingQuota(true);
        const result = await checkQuota('summary_count', 1);
        setSummaryQuotaCheck(result);
        // Si le quota est disponible, activer par défaut si le plan le permet
        if (result.allowed && limits?.summary_count_limit !== null) {
          setAutoSummary(true);
        }
      } catch (error) {
        console.error('Erreur vérification quota résumé:', error);
        setSummaryQuotaCheck({ allowed: false });
      } finally {
        setCheckingQuota(false);
      }
    };
    verifySummaryQuota();
  }, [checkQuota, limits]);

  const handleToggleSummary = async () => {
    if (autoSummary) {
      // Désactiver directement
      setAutoSummary(false);
      return;
    }

    // Vérifier le quota avant d'activer
    try {
      const result = await checkQuota('summary_count', 1);
      if (result.allowed) {
        setAutoSummary(true);
      } else {
        // Afficher un message d'erreur ou proposer l'upgrade
        alert(`Quota de résumés épuisé (${result.usage}/${result.limit}). Veuillez upgrader votre plan pour générer plus de résumés.`);
      }
    } catch (error) {
      console.error('Erreur vérification quota:', error);
      alert('Erreur lors de la vérification du quota. Veuillez réessayer.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      participants,
      enableAiSummary: autoSummary
    });
  };

  const handleReset = () => {
    setTitle('');
    setDescription('');
    setAutoSummary(true);
    if (organizer) {
      setParticipants([{
        id: crypto.randomUUID(),
        name: organizer.name,
        email: organizer.email,
        role: 'organizer'
      }]);
    }
    onReset?.();
  };

  const canSubmit = title.trim().length > 0 && !isLoading;
  const participantsCount = participants.length;
  const guestsCount = participants.filter(p => p.role !== 'organizer').length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className={`
        rounded-xl p-5 mb-6
        ${darkMode
          ? 'bg-gray-800 border border-gray-700'
          : 'bg-white border border-gray-200'
        }
        shadow-sm
      `}
    >
      {/* Header */}
      <div className="text-center mb-5">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 300 }}
          className="inline-block mb-2"
        >
          <Sparkles className={`w-6 h-6 ${darkMode ? 'text-yellow-400' : 'text-yellow-500'}`} />
        </motion.div>
        <h2 className={`
          text-xl font-semibold mb-1
          ${darkMode ? 'text-white' : 'text-gray-900'}
        `}>
          Nouvelle Réunion
        </h2>
        <p className={`
          text-xs
          ${darkMode ? 'text-gray-400' : 'text-gray-600'}
        `}>
          Organisez votre réunion en quelques clics
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Section 1: Informations Générales */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <FileText className={`w-4 h-4 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            <h3 className={`
              text-base font-semibold
              ${darkMode ? 'text-white' : 'text-gray-900'}
            `}>
              Informations Générales
            </h3>
          </div>

          <div className="space-y-3">
            {/* Titre */}
            <div>
              <label className={`
                block text-xs font-medium mb-1.5
                ${darkMode ? 'text-gray-300' : 'text-gray-700'}
              `}>
                📝 Titre de la réunion *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Réunion équipe marketing"
                required
                className={`
                  w-full px-3 py-2 rounded-lg border
                  transition-all duration-200 text-sm
                  ${darkMode
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }
                  focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10
                  focus:outline-none
                `}
              />
            </div>

            {/* Description */}
            <div>
              <label className={`
                block text-xs font-medium mb-1.5
                ${darkMode ? 'text-gray-300' : 'text-gray-700'}
              `}>
                🎯 Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Décrivez l'objectif et l'ordre du jour de la réunion"
                rows={3}
                className={`
                  w-full px-3 py-2 rounded-lg border resize-none
                  transition-all duration-200 text-sm
                  ${darkMode
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }
                  focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10
                  focus:outline-none
                `}
              />
            </div>
          </div>
        </motion.div>

        {/* Section 2: Participants */}
        {organizer && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Users className={`w-4 h-4 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
              <h3 className={`
                text-base font-semibold
                ${darkMode ? 'text-white' : 'text-gray-900'}
              `}>
                Participants
              </h3>
            </div>

            <div className={`
              rounded-lg p-3
              ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}
            `}>
              <ParticipantsFormV2
                participants={participants}
                onChange={setParticipants}
                organizer={organizer}
                darkMode={darkMode}
              />
              
              {/* Info participants */}
              <div className={`
                mt-2 text-xs
                ${darkMode ? 'text-gray-400' : 'text-gray-600'}
              `}>
                {participantsCount}/20 participants · {guestsCount} invité{guestsCount > 1 ? 's' : ''}
              </div>
            </div>
          </motion.div>
        )}

        {/* Section 3: Options Avancées */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Zap className={`w-4 h-4 ${darkMode ? 'text-amber-400' : 'text-amber-600'}`} />
            <h3 className={`
              text-base font-semibold
              ${darkMode ? 'text-white' : 'text-gray-900'}
            `}>
              Options Avancées
            </h3>
          </div>

          <motion.div
            whileHover={summaryQuotaCheck?.allowed !== false ? { scale: 1.005 } : {}}
            whileTap={summaryQuotaCheck?.allowed !== false ? { scale: 0.995 } : {}}
            onClick={summaryQuotaCheck?.allowed !== false ? handleToggleSummary : undefined}
            className={`
              rounded-lg p-3 border transition-all duration-200
              ${summaryQuotaCheck?.allowed === false
                ? 'opacity-60 cursor-not-allowed'
                : 'cursor-pointer'
              }
              ${autoSummary
                ? darkMode
                  ? 'bg-blue-900/20 border-blue-600'
                  : 'bg-blue-50 border-blue-300'
                : darkMode
                  ? 'bg-gray-700/50 border-gray-600'
                  : 'bg-gray-50 border-gray-300'
              }
            `}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <div className="text-lg">🎥</div>
                <div className="flex-1">
                  <div className={`
                    font-medium text-sm mb-0.5
                    ${darkMode ? 'text-white' : 'text-gray-900'}
                  `}>
                    Générer résumé automatique
                  </div>
                  <div className={`
                    text-xs
                    ${darkMode ? 'text-gray-400' : 'text-gray-600'}
                  `}>
                    {checkingQuota 
                      ? 'Vérification du quota...'
                      : summaryQuotaCheck?.allowed === false
                      ? `Quota épuisé (${summaryQuotaCheck?.usage || 0}/${summaryQuotaCheck?.limit || 0})`
                      : autoSummary 
                      ? 'Active · Génération IA incluse' 
                      : 'Inactive · Pas de résumé généré'
                    }
                  </div>
                  {summaryQuotaCheck?.allowed === false && (
                    <div className="flex items-center gap-1 mt-1">
                      <Crown className="w-3 h-3 text-amber-500" />
                      <span className="text-xs text-amber-600 dark:text-amber-400">
                        Upgrade requis
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Toggle Switch */}
              <div className={`
                relative w-10 h-5 rounded-full transition-colors duration-200
                ${autoSummary
                  ? 'bg-blue-500'
                  : darkMode ? 'bg-gray-600' : 'bg-gray-300'
                }
              `}>
                <motion.div
                  className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm"
                  animate={{
                    x: autoSummary ? 20 : 2
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 500,
                    damping: 30
                  }}
                />
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700"
        >
          <motion.button
            type="button"
            onClick={handleReset}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg
              font-medium text-sm
              transition-all duration-200
              ${darkMode
                ? 'bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-600'
                : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300'
              }
            `}
          >
            <RefreshCw className="w-4 h-4" />
            Réinitialiser
          </motion.button>

          <motion.button
            type="submit"
            disabled={!canSubmit}
            whileHover={canSubmit ? { scale: 1.02 } : {}}
            whileTap={canSubmit ? { scale: 0.98 } : {}}
            className={`
              flex items-center gap-2 px-5 py-2 rounded-lg
              font-semibold text-sm
              transition-all duration-200
              ${canSubmit
                ? darkMode
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-sm shadow-blue-500/20'
                : darkMode
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            <Sparkles className="w-4 h-4" />
            {isLoading ? 'Création...' : 'Créer la réunion'}
          </motion.button>
        </motion.div>
      </form>
    </motion.div>
  );
}


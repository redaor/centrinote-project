/**
 * Composant de barre de progression moderne pour les réunions
 * Remplace les éléments statiques par des barres dynamiques
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle, Clock, Pause, X, FileText, Download } from 'lucide-react';

export interface MeetingProgressProps {
  status: 'generating' | 'processing' | 'completed' | 'error';
  percentage?: number; // 0-100
  eta?: number; // secondes restantes
  currentStep?: number; // pour multi-step
  steps?: string[]; // noms des étapes
  onCancel?: () => void;
  onPause?: () => void;
  onComplete?: () => void;
  darkMode?: boolean;
  meetingId?: string;
}

export function MeetingProgress({
  status,
  percentage = 0,
  eta,
  currentStep = 0,
  steps = [],
  onCancel,
  onPause,
  onComplete,
  darkMode = false,
  meetingId
}: MeetingProgressProps) {
  const [animatedPercentage, setAnimatedPercentage] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(eta || null);

  // Animation fluide du pourcentage
  useEffect(() => {
    if (status === 'generating' || status === 'processing') {
      const duration = 500; // ms
      const start = animatedPercentage;
      const end = percentage;
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const current = start + (end - start) * progress;
        setAnimatedPercentage(Math.round(current));

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setAnimatedPercentage(end);
        }
      };

      requestAnimationFrame(animate);
    } else {
      setAnimatedPercentage(percentage);
    }
  }, [percentage, status]);

  // Compte à rebours ETA
  useEffect(() => {
    if (timeRemaining !== null && timeRemaining > 0 && (status === 'generating' || status === 'processing')) {
      const interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev === null || prev <= 1) {
            return null;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [timeRemaining, status]);

  // Formatage du temps
  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  // Déterminer le type de progression selon le statut
  const getProgressType = () => {
    if (status === 'generating') return 'generating';
    if (status === 'processing') return 'processing';
    if (status === 'completed') return 'completed';
    return 'error';
  };

  const progressType = getProgressType();

  // Couleurs selon le type
  const getColors = () => {
    switch (progressType) {
      case 'generating':
        return {
          bg: darkMode ? 'bg-amber-500/10' : 'bg-amber-50/80',
          border: darkMode ? 'border-amber-500/30' : 'border-amber-200/60',
          text: darkMode ? 'text-amber-300' : 'text-amber-800',
          icon: darkMode ? 'text-amber-400' : 'text-amber-600',
          gradient: 'from-amber-500 to-orange-500',
          glow: 'shadow-amber-500/30'
        };
      case 'processing':
        return {
          bg: darkMode ? 'bg-blue-500/10' : 'bg-blue-50/80',
          border: darkMode ? 'border-blue-500/30' : 'border-blue-200/60',
          text: darkMode ? 'text-blue-300' : 'text-blue-800',
          icon: darkMode ? 'text-blue-400' : 'text-blue-600',
          gradient: 'from-blue-500 to-purple-600',
          glow: 'shadow-blue-500/30'
        };
      case 'completed':
        return {
          bg: darkMode ? 'bg-emerald-500/10' : 'bg-emerald-50/80',
          border: darkMode ? 'border-emerald-500/30' : 'border-emerald-200/60',
          text: darkMode ? 'text-emerald-300' : 'text-emerald-800',
          icon: darkMode ? 'text-emerald-400' : 'text-emerald-600',
          gradient: 'from-emerald-500 to-green-500',
          glow: 'shadow-emerald-500/30'
        };
      default:
        return {
          bg: darkMode ? 'bg-red-500/10' : 'bg-red-50/80',
          border: darkMode ? 'border-red-500/30' : 'border-red-200/60',
          text: darkMode ? 'text-red-300' : 'text-red-800',
          icon: darkMode ? 'text-red-400' : 'text-red-600',
          gradient: 'from-red-500 to-pink-500',
          glow: 'shadow-red-500/30'
        };
    }
  };

  const colors = getColors();

  // Texte selon le statut
  const getStatusText = () => {
    switch (status) {
      case 'generating':
        return 'Génération du résumé...';
      case 'processing':
        return 'Traitement de la réunion...';
      case 'completed':
        return 'Terminé avec succès!';
      case 'error':
        return 'Erreur lors du traitement';
      default:
        return 'En cours...';
    }
  };

  // Icône selon le statut
  const getStatusIcon = () => {
    switch (status) {
      case 'generating':
      case 'processing':
        return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <X className="w-4 h-4" />;
    }
  };

  return (
    <motion.div
      className={`mb-4 p-4 rounded-xl border backdrop-blur-sm ${colors.bg} ${colors.border}`}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
    >
      {/* En-tête avec icône et texte */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2.5">
          <motion.div
            className={colors.icon}
            animate={status === 'generating' || status === 'processing' ? {
              rotate: [0, 360],
            } : {}}
            transition={status === 'generating' || status === 'processing' ? {
              duration: 2,
              repeat: Infinity,
              ease: "linear"
            } : {}}
          >
            {getStatusIcon()}
          </motion.div>
          <span className={`text-sm font-medium ${colors.text}`}>
            {getStatusText()}
          </span>
        </div>

        {/* Actions */}
        {(status === 'generating' || status === 'processing') && (
          <div className="flex items-center gap-2">
            {onPause && (
              <motion.button
                onClick={onPause}
                className={`p-1.5 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-700/60' : 'hover:bg-gray-100'}`}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                title="Pause"
              >
                <Pause className={`w-3.5 h-3.5 ${colors.icon}`} />
              </motion.button>
            )}
            {onCancel && (
              <motion.button
                onClick={onCancel}
                className={`p-1.5 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-700/60' : 'hover:bg-gray-100'}`}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                title="Annuler"
              >
                <X className={`w-3.5 h-3.5 ${colors.icon}`} />
              </motion.button>
            )}
          </div>
        )}
      </div>

      {/* Barre de progression principale */}
      {(status === 'generating' || status === 'processing') && (
        <div className="space-y-2">
          <div className={`relative h-3 rounded-full overflow-hidden ${darkMode ? 'bg-gray-700/50' : 'bg-gray-200'}`}>
            <motion.div
              className={`h-full bg-gradient-to-r ${colors.gradient} rounded-full ${colors.glow} shadow-lg`}
              initial={{ width: 0 }}
              animate={{ width: `${animatedPercentage}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              style={{
                boxShadow: status === 'processing' && animatedPercentage > 90
                  ? `0 0 20px ${darkMode ? 'rgba(59, 130, 246, 0.6)' : 'rgba(59, 130, 246, 0.4)'}`
                  : undefined
              }}
            >
              {animatedPercentage > 20 && (
                <motion.span
                  className="absolute inset-0 flex items-center justify-end pr-2 text-xs font-semibold text-white"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {animatedPercentage}%
                </motion.span>
              )}
            </motion.div>
          </div>

          {/* Informations supplémentaires */}
          <div className="flex items-center justify-between text-xs">
            {timeRemaining !== null && timeRemaining > 0 ? (
              <div className={`flex items-center gap-1.5 ${colors.text}`}>
                <Clock className="w-3 h-3" />
                <span>Temps estimé : {formatTime(timeRemaining)} restantes</span>
              </div>
            ) : (
              <div className={`${colors.text} opacity-70`}>
                {animatedPercentage < 50 ? 'Démarrage...' : animatedPercentage < 90 ? 'Traitement en cours...' : 'Finalisation...'}
              </div>
            )}
            {animatedPercentage > 90 && (
              <motion.div
                className={`${colors.text} font-medium`}
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                ⚡ Accélération en cours
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* Multi-step progress (si étapes définies) */}
      {steps.length > 0 && (status === 'generating' || status === 'processing') && (
        <div className="mt-3 space-y-2">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              className="flex items-center gap-2 text-xs"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                {index < currentStep ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  >
                    <CheckCircle className={`w-4 h-4 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                  </motion.div>
                ) : index === currentStep ? (
                  <Loader2 className={`w-4 h-4 animate-spin ${colors.icon}`} />
                ) : (
                  <div className={`w-2 h-2 rounded-full ${darkMode ? 'bg-gray-600' : 'bg-gray-300'}`} />
                )}
              </div>
              <span className={`${index <= currentStep ? colors.text : darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                {step}
              </span>
            </motion.div>
          ))}
        </div>
      )}

      {/* État terminé */}
      {status === 'completed' && (
        <motion.div
          className="space-y-3"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              >
                <CheckCircle className={`w-5 h-5 ${colors.icon}`} />
              </motion.div>
              <span className={`text-sm font-medium ${colors.text}`}>
                Résumé généré avec succès
              </span>
            </div>
            {onComplete && (
              <div className="flex items-center gap-2">
                <motion.button
                  onClick={onComplete}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    darkMode
                      ? 'bg-emerald-600/80 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                      : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Voir le résumé</span>
                </motion.button>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* État erreur */}
      {status === 'error' && (
        <motion.div
          className="flex items-center gap-2 text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <X className={`w-4 h-4 ${colors.icon}`} />
          <span className={colors.text}>
            Une erreur est survenue. Veuillez réessayer.
          </span>
        </motion.div>
      )}
    </motion.div>
  );
}


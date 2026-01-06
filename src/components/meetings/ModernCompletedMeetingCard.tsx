/**
 * Composant moderne pour afficher les réunions terminées
 * Design élégant avec animations fluides et informations détaillées
 */

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  Clock, 
  Users, 
  FileText, 
  Download, 
  CheckCircle, 
  Loader2,
  RefreshCw,
  AlertCircle,
  Zap
} from 'lucide-react';
import { Meeting } from '../../types/meetings';
import { useSummary } from '../../hooks/useSummary';

export interface ModernCompletedMeetingCardProps {
  meeting: Meeting;
  darkMode?: boolean;
  onViewSummary?: (meetingId: string) => void;
  onDownloadSummary?: (meetingId: string) => void;
  onRefresh?: () => void;
  index?: number;
}

type MeetingStatus = 'completed' | 'generating' | 'pending' | 'error';

interface MeetingStatusInfo {
  status: MeetingStatus;
  progress: number;
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
}

export function ModernCompletedMeetingCard({
  meeting,
  darkMode = false,
  onViewSummary,
  onDownloadSummary,
  onRefresh,
  index = 0
}: ModernCompletedMeetingCardProps) {
  // Vérifier si la réunion est terminée ou a des données
  const hasRecording = !!meeting.recording_url;
  const hasTranscript = !!meeting.transcript;
  // ✅ Vérifier si ai_summary existe et n'est pas vide
  const hasSummary = meeting.ai_summary && 
    (typeof meeting.ai_summary === 'string' ? meeting.ai_summary.trim() !== '' : 
     typeof meeting.ai_summary === 'object' ? Object.keys(meeting.ai_summary).length > 0 : false);
  const isOver = meeting.status === 'completed' || !!meeting.ended_at || hasRecording || hasTranscript || hasSummary;

  // Récupérer le résumé
  const { summary, loading: summaryLoading, error: summaryError } = useSummary(
    isOver ? meeting.id : null,
    {
      enabled: isOver,
      refetchInterval: isOver ? 5000 : undefined
    }
  );

  // ✅ DEBUG: Log pour comprendre pourquoi le résumé ne s'affiche pas
  if (isOver && !summary && !summaryLoading) {
    console.log('🔍 [CARD] Résumé non trouvé pour:', {
      meetingId: meeting.id,
      meetingTitle: meeting.title,
      hasAiSummary: !!meeting.ai_summary,
      aiSummaryType: meeting.ai_summary ? typeof meeting.ai_summary : 'null',
      isOver,
      summaryError
    });
  }

  // Calculer le statut et la progression
  const getMeetingStatus = (): MeetingStatusInfo => {
    // Si erreur, afficher l'état d'erreur
    if (summaryError) {
      return {
        status: 'error',
        progress: 0,
        label: 'Erreur',
        icon: <AlertCircle className="w-4 h-4" />,
        color: '#ef4444',
        bgColor: darkMode ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.1)',
        borderColor: darkMode ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.3)',
        textColor: darkMode ? '#f87171' : '#dc2626'
      };
    }

    // Si résumé disponible, réunion terminée
    if (summary) {
      return {
        status: 'completed',
        progress: 100,
        label: 'Terminée',
        icon: <CheckCircle className="w-4 h-4" />,
        color: '#10b981',
        bgColor: darkMode ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.1)',
        borderColor: darkMode ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.3)',
        textColor: darkMode ? '#34d399' : '#059669'
      };
    }

    // Si réunion terminée mais pas encore de résumé, génération en cours
    if (isOver && !summary) {
      // Calculer la progression basée sur le temps écoulé
      const endTime = meeting.ended_at ? new Date(meeting.ended_at).getTime() : Date.now();
      const now = Date.now();
      const elapsed = (now - endTime) / 1000; // secondes
      const estimatedDuration = 45; // secondes
      const progress = Math.min((elapsed / estimatedDuration) * 100, 95);

      return {
        status: 'generating',
        progress: Math.round(progress),
        label: 'Génération en cours',
        icon: <Loader2 className="w-4 h-4 animate-spin" />,
        color: '#f59e0b',
        bgColor: darkMode ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.1)',
        borderColor: darkMode ? 'rgba(245, 158, 11, 0.3)' : 'rgba(245, 158, 11, 0.3)',
        textColor: darkMode ? '#fbbf24' : '#d97706'
      };
    }

    return {
      status: 'pending',
      progress: 0,
      label: 'En attente',
      icon: <AlertCircle className="w-4 h-4" />,
      color: '#6b7280',
      bgColor: darkMode ? 'rgba(107, 114, 128, 0.1)' : 'rgba(107, 114, 128, 0.1)',
      borderColor: darkMode ? 'rgba(107, 114, 128, 0.3)' : 'rgba(107, 114, 128, 0.3)',
      textColor: darkMode ? '#9ca3af' : '#6b7280'
    };
  };

  const statusInfo = getMeetingStatus();

  // Formater la date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Date non disponible';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calculer la durée
  const getDuration = () => {
    if (meeting.duration_minutes) {
      return `${meeting.duration_minutes} min`;
    }
    if (meeting.started_at && meeting.ended_at) {
      const start = new Date(meeting.started_at).getTime();
      const end = new Date(meeting.ended_at).getTime();
      const minutes = Math.round((end - start) / 60000);
      return `${minutes} min`;
    }
    return 'Durée non disponible';
  };

  // Nombre de participants
  const participantsCount = meeting.participants?.length || 0;


  return (
    <div
      className={`
        rounded-xl border p-5
        ${darkMode 
          ? 'bg-gray-800 border-gray-700' 
          : 'bg-white border-gray-200'
        }
        hover:shadow-lg hover:shadow-blue-500/10
        transition-all duration-300
        hover:-translate-y-1
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className={`
            font-semibold text-base mb-1.5 leading-tight truncate
            ${darkMode ? 'text-gray-100' : 'text-gray-900'}
          `}>
            {meeting.title || 'Réunion sans titre'}
          </h3>
          
          {/* Date */}
          <div className="flex items-center gap-2 text-xs mb-2">
            <Calendar className={`w-3.5 h-3.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
              {formatDate(meeting.ended_at || meeting.scheduled_at)}
            </span>
          </div>
        </div>
      </div>

      {/* Status Line */}
      <div className="flex items-center justify-between mb-4">
        <div
          className={`
            flex items-center gap-2 px-3 py-1.5 rounded-lg
            border
          `}
          style={{
            backgroundColor: statusInfo.bgColor,
            borderColor: statusInfo.borderColor,
            color: statusInfo.textColor
          }}
        >
          <motion.div
            animate={statusInfo.status === 'generating' ? {
              rotate: [0, 360]
            } : {}}
            transition={statusInfo.status === 'generating' ? {
              duration: 2,
              repeat: Infinity,
              ease: "linear"
            } : {}}
          >
            {statusInfo.icon}
          </motion.div>
          <span className="text-xs font-medium">
            {statusInfo.status === 'generating' 
              ? `Génération : ${statusInfo.progress}%`
              : statusInfo.status === 'completed'
                ? `${statusInfo.label} · ${getDuration()}`
                : statusInfo.label
            }
          </span>
        </div>

        {/* Participants count */}
        {participantsCount > 0 && (
          <div className={`
            flex items-center gap-1.5 text-xs
            ${darkMode ? 'text-gray-400' : 'text-gray-500'}
          `}>
            <Users className="w-3.5 h-3.5" />
            <span>{participantsCount}</span>
          </div>
        )}
      </div>

      {/* Progress Bar (si génération en cours) */}
      {statusInfo.status === 'generating' && (
        <div className="mb-4">
          <div className={`
            relative h-2 rounded-full overflow-hidden
            ${darkMode ? 'bg-gray-700/50' : 'bg-gray-200'}
          `}>
            <motion.div
              className="h-full rounded-full"
              style={{
                background: `linear-gradient(90deg, ${statusInfo.color}, ${statusInfo.color}dd)`,
                boxShadow: `0 0 10px ${statusInfo.color}40`
              }}
              initial={{ width: 0 }}
              animate={{ width: `${statusInfo.progress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
          <div className={`
            flex items-center justify-between mt-2 text-xs
            ${darkMode ? 'text-gray-400' : 'text-gray-500'}
          `}>
            <span>⏳ Traitement en cours...</span>
            {statusInfo.progress > 90 && (
              <motion.span
                className="flex items-center gap-1"
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <Zap className="w-3 h-3" />
                Accélération
              </motion.span>
            )}
          </div>
        </div>
      )}

      {/* Meeting Details */}
      <div className="space-y-2 mb-4">
        {statusInfo.status === 'completed' && (
          <div className={`
            flex items-center gap-2 text-xs
            ${darkMode ? 'text-gray-300' : 'text-gray-700'}
          `}>
            <FileText className="w-3.5 h-3.5 text-green-500" />
            <span>Résumé et transcription disponibles</span>
          </div>
        )}
        
        {statusInfo.status === 'generating' && (
          <div className={`
            flex items-center gap-2 text-xs
            ${darkMode ? 'text-gray-400' : 'text-gray-600'}
          `}>
            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
            <span>Préparation des documents...</span>
          </div>
        )}

        {statusInfo.status === 'pending' && (
          <div className={`
            flex items-center gap-2 text-xs
            ${darkMode ? 'text-gray-400' : 'text-gray-600'}
          `}>
            <AlertCircle className="w-3.5 h-3.5 text-gray-500" />
            <span>En attente de traitement</span>
          </div>
        )}

        {statusInfo.status === 'error' && (
          <div className={`
            flex items-center gap-2 text-xs
            ${darkMode ? 'text-red-400' : 'text-red-600'}
          `}>
            <AlertCircle className="w-3.5 h-3.5 text-red-500" />
            <span>Erreur lors du traitement</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        {statusInfo.status === 'completed' && (
          <>
            <motion.button
              onClick={() => onViewSummary?.(meeting.id)}
              className={`
                flex-1 flex items-center justify-center gap-2
                px-4 py-2.5 rounded-lg text-sm font-medium
                transition-all
                ${darkMode
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                  : 'bg-blue-500 hover:bg-blue-600 text-white shadow-md shadow-blue-500/20'
                }
              `}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <FileText className="w-4 h-4" />
              <span>Visualiser</span>
            </motion.button>

            {onDownloadSummary && (
              <motion.button
                onClick={() => onDownloadSummary(meeting.id)}
                className={`
                  flex items-center justify-center gap-2
                  px-4 py-2.5 rounded-lg text-sm font-medium
                  transition-all
                  ${darkMode
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-600'
                    : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300'
                  }
                `}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Download className="w-4 h-4" />
                <span>Télécharger</span>
              </motion.button>
            )}
          </>
        )}

        {statusInfo.status === 'generating' && (
          <motion.button
            onClick={onRefresh}
            disabled={summaryLoading}
            className={`
              flex-1 flex items-center justify-center gap-2
              px-4 py-2.5 rounded-lg text-sm font-medium
              transition-all
              ${darkMode
                ? 'bg-amber-600/80 hover:bg-amber-500 text-white'
                : 'bg-amber-500 hover:bg-amber-600 text-white'
              }
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
            whileHover={{ scale: summaryLoading ? 1 : 1.02 }}
            whileTap={{ scale: summaryLoading ? 1 : 0.98 }}
          >
            {summaryLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            <span>Actualiser</span>
          </motion.button>
        )}

        {statusInfo.status === 'pending' && (
          <motion.button
            onClick={onRefresh}
            className={`
              flex-1 flex items-center justify-center gap-2
              px-4 py-2.5 rounded-lg text-sm font-medium
              transition-all
              ${darkMode
                ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }
            `}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <RefreshCw className="w-4 h-4" />
            <span>Actualiser</span>
          </motion.button>
        )}

        {statusInfo.status === 'error' && (
          <motion.button
            onClick={onRefresh}
            className={`
              flex-1 flex items-center justify-center gap-2
              px-4 py-2.5 rounded-lg text-sm font-medium
              transition-all
              ${darkMode
                ? 'bg-red-600/80 hover:bg-red-500 text-white'
                : 'bg-red-500 hover:bg-red-600 text-white'
              }
            `}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <RefreshCw className="w-4 h-4" />
            <span>Réessayer</span>
          </motion.button>
        )}
      </div>
    </div>
  );
}


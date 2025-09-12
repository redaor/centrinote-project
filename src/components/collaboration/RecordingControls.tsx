// 🎬 Contrôles d'enregistrement pour Jitsi Meet
// Interface professionnelle pour démarrer/arrêter enregistrements
// ==============================================================

import React, { useState, useCallback } from 'react';
import {
  Video,
  VideoOff,
  Square,
  Play,
  Pause,
  Users,
  Shield,
  Clock,
  AlertCircle,
  CheckCircle,
  Loader2,
  Settings
} from 'lucide-react';
import { RecordingStatus, RecordingConsent } from '../../types/recording';

interface RecordingControlsProps {
  isRecording: boolean;
  onStartRecording: () => Promise<void>;
  onStopRecording: () => Promise<void>;
  recordingStatus: RecordingStatus;
  canStartRecording: boolean;
  isLoading: boolean;
  disabled?: boolean;
  darkMode?: boolean;
  onShowConsentDialog?: () => void;
  onShowSettings?: () => void;
}

export const RecordingControls: React.FC<RecordingControlsProps> = ({
  isRecording,
  onStartRecording,
  onStopRecording,
  recordingStatus,
  canStartRecording,
  isLoading,
  disabled = false,
  darkMode = false,
  onShowConsentDialog,
  onShowSettings
}) => {
  const [showDetails, setShowDetails] = useState(false);

  const handleToggleRecording = useCallback(async () => {
    if (isLoading || disabled) return;
    
    if (isRecording) {
      await onStopRecording();
    } else {
      // Vérifier consentements avant démarrage
      if (!recordingStatus.allParticipantsConsented && onShowConsentDialog) {
        onShowConsentDialog();
        return;
      }
      await onStartRecording();
    }
  }, [isRecording, isLoading, disabled, recordingStatus.allParticipantsConsented, onStartRecording, onStopRecording, onShowConsentDialog]);

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = () => {
    switch (recordingStatus.status) {
      case 'recording': return 'text-red-500';
      case 'processing': return 'text-yellow-500';
      case 'completed': return 'text-green-500';
      case 'error': return 'text-red-500';
      default: return darkMode ? 'text-gray-400' : 'text-gray-600';
    }
  };

  const getStatusText = () => {
    switch (recordingStatus.status) {
      case 'idle': return 'Prêt à enregistrer';
      case 'starting': return 'Démarrage...';
      case 'recording': return 'Enregistrement en cours';
      case 'stopping': return 'Arrêt en cours...';
      case 'processing': return 'Traitement...';
      case 'completed': return 'Terminé';
      case 'error': return 'Erreur';
      default: return 'Statut inconnu';
    }
  };

  return (
    <div className={`
      ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
      border rounded-lg p-4 space-y-3
    `}>
      {/* Header avec statut principal */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`flex items-center space-x-2 ${getStatusColor()}`}>
            {isRecording ? (
              <>
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <Video className="w-5 h-5" />
              </>
            ) : (
              <VideoOff className="w-5 h-5" />
            )}
            <span className="font-medium">{getStatusText()}</span>
          </div>
          
          {isRecording && recordingStatus.duration && (
            <div className={`flex items-center space-x-1 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              <Clock className="w-4 h-4" />
              <span>{formatDuration(recordingStatus.duration)}</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* Bouton paramètres */}
          {onShowSettings && (
            <button
              onClick={onShowSettings}
              disabled={isRecording}
              className={`
                p-2 rounded-lg transition-colors
                ${isRecording 
                  ? 'opacity-50 cursor-not-allowed'
                  : darkMode 
                    ? 'hover:bg-gray-700 text-gray-400 hover:text-white'
                    : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                }
              `}
              title="Paramètres d'enregistrement"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}

          {/* Bouton principal d'enregistrement */}
          <button
            onClick={handleToggleRecording}
            disabled={!canStartRecording || isLoading || disabled}
            className={`
              flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all
              ${!canStartRecording || isLoading || disabled
                ? 'opacity-50 cursor-not-allowed bg-gray-400'
                : isRecording
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white hover:scale-105'
              }
            `}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isRecording ? (
              <Square className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            <span>
              {isLoading 
                ? 'Traitement...' 
                : isRecording 
                  ? 'Arrêter' 
                  : 'Enregistrer'
              }
            </span>
          </button>
        </div>
      </div>

      {/* Détails du consentement */}
      <div className="space-y-2">
        {/* Statut consentement global */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4" />
            <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Consentements participants
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            {recordingStatus.allParticipantsConsented ? (
              <>
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-500">Tous consentements OK</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-yellow-500" />
                <span className="text-sm text-yellow-500">
                  {recordingStatus.consentPending.length} en attente
                </span>
              </>
            )}
            
            <button
              onClick={() => setShowDetails(!showDetails)}
              className={`
                text-xs px-2 py-1 rounded transition-colors
                ${darkMode 
                  ? 'hover:bg-gray-700 text-gray-400 hover:text-white'
                  : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                }
              `}
            >
              {showDetails ? 'Masquer' : 'Détails'}
            </button>
          </div>
        </div>

        {/* Détails des consentements */}
        {showDetails && (
          <div className={`
            ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}
            border rounded-lg p-3 space-y-2
          `}>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              État des consentements
            </div>
            
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {recordingStatus.participantConsents.map((consent, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                    {consent.participantName}
                  </span>
                  <div className="flex items-center space-x-1">
                    {consent.hasConsented ? (
                      <>
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        <span className="text-green-500">Accepté</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3 h-3 text-yellow-500" />
                        <span className="text-yellow-500">En attente</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {recordingStatus.consentPending.length > 0 && onShowConsentDialog && (
              <button
                onClick={onShowConsentDialog}
                className="w-full text-xs py-2 px-3 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                Gérer les consentements
              </button>
            )}
          </div>
        )}
      </div>

      {/* Informations de sécurité */}
      <div className={`
        ${darkMode ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-200'}
        border rounded-lg p-3
      `}>
        <div className="flex items-center space-x-2">
          <Shield className="w-4 h-4 text-green-500" />
          <span className={`text-sm font-medium ${darkMode ? 'text-green-400' : 'text-green-800'}`}>
            Enregistrement sécurisé
          </span>
        </div>
        <ul className={`text-xs mt-1 space-y-1 ${darkMode ? 'text-green-300' : 'text-green-700'}`}>
          <li>• Chiffrement E2EE maintenu</li>
          <li>• Consentement RGPD requis</li>
          <li>• Stockage sécurisé automatique</li>
          <li>• Traitement IA post-enregistrement</li>
        </ul>
      </div>

      {/* Erreur si présente */}
      {recordingStatus.error && (
        <div className={`
          ${darkMode ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'}
          border rounded-lg p-3
        `}>
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className={`text-sm font-medium ${darkMode ? 'text-red-400' : 'text-red-800'}`}>
              Erreur d'enregistrement
            </span>
          </div>
          <p className={`text-xs mt-1 ${darkMode ? 'text-red-300' : 'text-red-700'}`}>
            {recordingStatus.error}
          </p>
        </div>
      )}
    </div>
  );
};
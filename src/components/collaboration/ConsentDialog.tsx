// 🔐 Dialogue de consentement RGPD pour enregistrement
// Interface légale complète pour conformité européenne
// ====================================================

import React, { useState, useCallback } from 'react';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  X,
  FileText,
  Clock,
  Users,
  Video,
  Lock,
  Info
} from 'lucide-react';
import { RecordingConfig } from '../../types/recording';

interface ConsentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
  onDecline: () => void;
  participantName: string;
  sessionTitle: string;
  organizerName: string;
  recordingConfig: RecordingConfig;
  isLoading?: boolean;
  darkMode?: boolean;
}

export const ConsentDialog: React.FC<ConsentDialogProps> = ({
  isOpen,
  onClose,
  onAccept,
  onDecline,
  participantName,
  sessionTitle,
  organizerName,
  recordingConfig,
  isLoading = false,
  darkMode = false
}) => {
  const [hasReadTerms, setHasReadTerms] = useState(false);
  const [acceptedDataProcessing, setAcceptedDataProcessing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const canAccept = hasReadTerms && acceptedDataProcessing;

  const handleAccept = useCallback(() => {
    if (!canAccept || isLoading) return;
    onAccept();
  }, [canAccept, isLoading, onAccept]);

  const handleDecline = useCallback(() => {
    if (isLoading) return;
    onDecline();
  }, [isLoading, onDecline]);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className={`
          ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
          rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border
        `}>
          {/* Header */}
          <div className={`
            ${darkMode ? 'border-gray-700' : 'border-gray-200'}
            border-b p-6 flex items-center justify-between
          `}>
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                <Video className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Consentement d'enregistrement
                </h2>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Conformité RGPD requise
                </p>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className={`
                p-1 rounded hover:bg-gray-100 transition-colors
                ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'text-gray-500'}
              `}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Information principale */}
            <div className={`
              ${darkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'}
              border rounded-lg p-4
            `}>
              <div className="flex items-start space-x-3">
                <Info className="w-5 h-5 text-blue-500 mt-0.5" />
                <div>
                  <h3 className={`font-medium ${darkMode ? 'text-blue-400' : 'text-blue-800'}`}>
                    Demande d'enregistrement
                  </h3>
                  <p className={`text-sm mt-1 ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                    <strong>{organizerName}</strong> souhaite enregistrer la session 
                    "<strong>{sessionTitle}</strong>". Votre consentement explicite est requis 
                    selon le RGPD.
                  </p>
                </div>
              </div>
            </div>

            {/* Détails de l'enregistrement */}
            <div className="space-y-4">
              <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Informations sur l'enregistrement
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm">
                    <Users className="w-4 h-4 text-gray-500" />
                    <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                      Organisateur: {organizerName}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2 text-sm">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                      Durée max: {recordingConfig.maxDuration} minutes
                    </span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm">
                    <Lock className="w-4 h-4 text-gray-500" />
                    <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                      Stockage: {recordingConfig.storageProvider === 'drive' ? 'Google Drive' : 
                                recordingConfig.storageProvider === 's3' ? 'Amazon S3' : 'Local'}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2 text-sm">
                    <Shield className="w-4 h-4 text-gray-500" />
                    <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                      Chiffrement E2EE maintenu
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Utilisation des données */}
            <div className="space-y-3">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className={`
                  flex items-center space-x-2 text-sm font-medium
                  ${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'}
                `}
              >
                <FileText className="w-4 h-4" />
                <span>Utilisation des données enregistrées</span>
                <span className="text-xs">({showDetails ? 'masquer' : 'afficher'})</span>
              </button>
              
              {showDetails && (
                <div className={`
                  ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}
                  border rounded-lg p-4 text-sm space-y-2
                `}>
                  <h4 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Traitement automatisé prévu :
                  </h4>
                  <ul className={`space-y-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    <li>• <strong>Transcription automatique</strong> via IA (Whisper)</li>
                    <li>• <strong>Génération de résumé</strong> et points clés</li>
                    <li>• <strong>Extraction d'actions</strong> et tâches identifiées</li>
                    <li>• <strong>Analyse de sentiment</strong> et engagement</li>
                    {recordingConfig.generateReport && (
                      <li>• <strong>Rapport complet</strong> PDF avec métriques</li>
                    )}
                  </ul>
                  
                  <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-600">
                    <h4 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      Vos droits RGPD :
                    </h4>
                    <ul className={`space-y-1 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      <li>• Droit d'accès aux données traitées</li>
                      <li>• Droit de rectification et suppression</li>
                      <li>• Droit de retirer votre consentement à tout moment</li>
                      <li>• Droit de portabilité des données</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* Checkboxes de consentement */}
            <div className="space-y-3">
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasReadTerms}
                  onChange={(e) => setHasReadTerms(e.target.checked)}
                  className="mt-1 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  J'ai lu et compris les informations concernant l'enregistrement de cette session
                  et l'utilisation qui sera faite des données.
                </span>
              </label>
              
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptedDataProcessing}
                  onChange={(e) => setAcceptedDataProcessing(e.target.checked)}
                  className="mt-1 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <strong>Je consens explicitement</strong> à l'enregistrement de ma participation 
                  et au traitement automatisé des données à des fins de transcription, 
                  résumé et analyse.
                </span>
              </label>
            </div>

            {/* Avertissement */}
            <div className={`
              ${darkMode ? 'bg-yellow-900/20 border-yellow-800' : 'bg-yellow-50 border-yellow-200'}
              border rounded-lg p-3
            `}>
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                <span className={`text-sm font-medium ${darkMode ? 'text-yellow-400' : 'text-yellow-800'}`}>
                  Important
                </span>
              </div>
              <p className={`text-xs mt-1 ${darkMode ? 'text-yellow-300' : 'text-yellow-700'}`}>
                Sans votre consentement, l'enregistrement ne peut pas débuter. 
                Vous pouvez retirer ce consentement à tout moment durant la session.
              </p>
            </div>
          </div>

          {/* Footer avec boutons */}
          <div className={`
            ${darkMode ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'}
            border-t p-6 flex items-center justify-between
          `}>
            <div className="text-xs text-gray-500">
              Consentement pour: <strong>{participantName}</strong>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={handleDecline}
                disabled={isLoading}
                className={`
                  px-4 py-2 rounded-lg border font-medium transition-colors
                  ${darkMode 
                    ? 'border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }
                  ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                Refuser
              </button>
              
              <button
                onClick={handleAccept}
                disabled={!canAccept || isLoading}
                className={`
                  px-6 py-2 rounded-lg font-medium transition-all
                  ${!canAccept || isLoading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-500 hover:bg-green-600 hover:scale-105'
                  }
                  text-white flex items-center space-x-2
                `}
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Traitement...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Donner mon consentement</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
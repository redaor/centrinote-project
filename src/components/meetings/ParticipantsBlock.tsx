// 👥 Bloc participants modernisé avec micro-animations
import React, { useState } from 'react';
import { Plus, X, User, Mail, AlertCircle, Upload, CheckCircle, Users } from 'lucide-react';
import { MeetingParticipant } from '../../types/meetings';
import { EmailField } from '../ui/EmailField';
import { ImportGuestsModal } from './ImportGuestsModal';
import { useApp } from '../../contexts/AppContext';
import { usePlanLimits } from '../../hooks/usePlanLimits';

interface ParticipantsBlockProps {
  participants: MeetingParticipant[];
  organizer: { name: string; email: string };
  validation: {
    isValid: boolean;
    errors: any[];
    hasErrors: boolean;
    getFieldError: (index: number, field: 'name' | 'email') => any;
  };
  stats: {
    total: number;
    guests: number;
    canAddMore: boolean;
    availableSlots: number;
  };
  onAddParticipant: () => void;
  onRemoveParticipant: (id: string) => void;
  onUpdateParticipant: (id: string, field: 'name' | 'email', value: string) => void;
  onBulkImport: (participants: any[]) => { added: number; ignored: number };
  onUpdateOrganizer: (organizer: { name: string; email: string }) => void;
}

export function ParticipantsBlock({
  participants,
  organizer,
  validation,
  stats,
  onAddParticipant,
  onRemoveParticipant,
  onUpdateParticipant,
  onBulkImport,
  onUpdateOrganizer
}: ParticipantsBlockProps) {
  const { state } = useApp();
  const { darkMode } = state;
  
  const [showImportModal, setShowImportModal] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Récupérer les limites du plan utilisateur
  const { limits } = usePlanLimits();
  const MAX_PARTICIPANTS = limits?.meeting_max_participants ?? 20; // Fallback à 20 si non défini

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Users className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
        <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Participants ({stats.total}{MAX_PARTICIPANTS !== null ? `/${MAX_PARTICIPANTS}` : ''})
        </h3>
        {validation.isValid && (
          <CheckCircle className="w-4 h-4 text-green-500" />
        )}
      </div>

      {/* Stats et actions */}
      <div className="flex items-center justify-between">
        <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          <span className="font-medium">{stats.guests}</span> invité{stats.guests > 1 ? 's' : ''}
          {!stats.canAddMore && ' • '}
          {!stats.canAddMore && (
            <span className="text-yellow-600 font-medium">Limite atteinte</span>
          )}
        </div>
        
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            disabled={!stats.canAddMore}
            className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150 ${
              stats.canAddMore 
                ? 'bg-green-600 text-white hover:bg-green-700 hover:scale-105 active:scale-95 shadow-md hover:shadow-lg' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Importer</span>
          </button>
          
          <button
            type="button"
            onClick={onAddParticipant}
            disabled={!stats.canAddMore}
            className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150 ${
              stats.canAddMore 
                ? 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-105 active:scale-95 shadow-md hover:shadow-lg' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter</span>
          </button>
        </div>
      </div>

      {/* Liste des participants */}
      <div className="space-y-3">
        {participants.map((participant, index) => {
          const isOrganizer = participant.role === 'organizer';
          const nameError = validation.getFieldError(index, 'name');
          const emailError = validation.getFieldError(index, 'email');
          const hasError = nameError || emailError;
          const fieldKey = `${participant.id}`;

          return (
            <div
              key={participant.id}
              className={`p-4 rounded-lg border transition-all duration-200 ${
                hasError
                  ? (darkMode ? 'border-red-600 bg-red-900/10' : 'border-red-300 bg-red-50/50')
                  : isOrganizer
                    ? (darkMode ? 'border-blue-500 bg-blue-900/20' : 'border-blue-300 bg-blue-50')
                    : (darkMode ? 'border-gray-600 bg-gray-700/50' : 'border-gray-200 bg-gray-50')
              } ${
                focusedField?.startsWith(fieldKey) ? 'ring-2 ring-blue-500/20 scale-[1.01]' : 'hover:shadow-md'
              }`}
            >
              {/* Header avec rôle et actions */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div className={`p-1 rounded-full ${
                    isOrganizer ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                  }`}>
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <span className={`text-sm font-semibold ${
                      isOrganizer 
                        ? 'text-blue-600 dark:text-blue-400' 
                        : (darkMode ? 'text-gray-300' : 'text-gray-700')
                    }`}>
                      {isOrganizer ? '👤 Organisateur' : '👋 Invité'}
                    </span>
                    {hasError && (
                      <div className="flex items-center space-x-1 text-red-500 text-xs mt-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>Erreurs de validation</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {!isOrganizer && (
                  <button
                    type="button"
                    onClick={() => onRemoveParticipant(participant.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-all duration-150 hover:scale-110"
                    title="Supprimer ce participant"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Champs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nom */}
                <div className="space-y-1">
                  <label className={`block text-sm font-medium ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Nom complet
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={participant.name}
                      onChange={(e) => onUpdateParticipant(participant.id, 'name', e.target.value)}
                      onFocus={() => setFocusedField(`${fieldKey}-name`)}
                      onBlur={() => setFocusedField(null)}
                      readOnly={isOrganizer}
                      placeholder="Nom du participant"
                      className={`w-full px-3 py-2 rounded-lg border transition-all duration-150 focus:outline-none focus:ring-2 ${
                        nameError 
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' 
                          : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500/20'
                      } ${
                        isOrganizer 
                          ? (darkMode ? 'bg-gray-600 text-gray-300 cursor-not-allowed' : 'bg-gray-100 text-gray-600 cursor-not-allowed')
                          : (darkMode ? 'bg-gray-600 text-white' : 'bg-white text-gray-900')
                      } ${
                        focusedField === `${fieldKey}-name` ? 'scale-[1.02]' : ''
                      }`}
                    />
                    {participant.name.trim() && !nameError && (
                      <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-green-500" />
                    )}
                  </div>
                  {nameError && (
                    <div className="flex items-center space-x-1 text-red-500 text-xs animate-in slide-in-from-left duration-200">
                      <AlertCircle className="w-3 h-3" />
                      <span>{nameError.message}</span>
                    </div>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <label className={`block text-sm font-medium ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Adresse email
                  </label>
                  <div className="relative">
                    <EmailField
                      value={participant.email}
                      onChange={(value) => onUpdateParticipant(participant.id, 'email', value)}
                      onFocus={() => setFocusedField(`${fieldKey}-email`)}
                      onBlur={() => setFocusedField(null)}
                      readOnly={isOrganizer}
                      placeholder="email@exemple.com"
                      autoComplete="off"
                      className={`${
                        emailError 
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' 
                          : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500/20'
                      } ${
                        isOrganizer 
                          ? (darkMode ? 'bg-gray-600 text-gray-300 cursor-not-allowed' : 'bg-gray-100 text-gray-600 cursor-not-allowed')
                          : (darkMode ? 'bg-gray-600 text-white' : 'bg-white text-gray-900')
                      } ${
                        focusedField === `${fieldKey}-email` ? 'scale-[1.02]' : ''
                      }`}
                    />
                    {participant.email.trim() && !emailError && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      </div>
                    )}
                  </div>
                  {emailError && (
                    <div className="flex items-center space-x-1 text-red-500 text-xs animate-in slide-in-from-left duration-200">
                      <AlertCircle className="w-3 h-3" />
                      <span>{emailError.message}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Message d'encouragement si pas d'invités */}
      {stats.guests === 0 && (
        <div className={`p-4 rounded-lg border border-dashed ${
          darkMode 
            ? 'border-gray-600 bg-gray-700/30' 
            : 'border-gray-300 bg-gray-50/50'
        }`}>
          <div className="text-center">
            <Users className={`w-8 h-8 mx-auto mb-2 ${
              darkMode ? 'text-gray-500' : 'text-gray-400'
            }`} />
            <div className={`text-sm font-medium mb-1 ${
              darkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Aucun invité pour le moment
            </div>
            <div className={`text-xs ${
              darkMode ? 'text-gray-500' : 'text-gray-500'
            }`}>
              Ajoutez des participants pour démarrer votre réunion
            </div>
          </div>
        </div>
      )}

      {/* Résumé des erreurs */}
      {validation.hasErrors && (
        <div className={`p-4 rounded-lg border animate-in slide-in-from-top duration-200 ${
          darkMode 
            ? 'bg-red-900/20 border-red-800 text-red-300' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center space-x-2 mb-2">
            <AlertCircle className="w-4 h-4" />
            <span className="font-semibold text-sm">
              {validation.errors.length} erreur{validation.errors.length > 1 ? 's' : ''} à corriger
            </span>
          </div>
          <ul className="text-sm space-y-1 ml-6">
            {validation.errors.map((error) => (
              <li key={`error-${error.index}-${error.field}`} className="list-disc">
                Participant {error.index + 1} ({error.field}): {error.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Modal d'import */}
      <ImportGuestsModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={onBulkImport}
        existingParticipants={participants}
        darkMode={darkMode}
      />
    </div>
  );
}
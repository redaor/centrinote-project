// 👥 Composant pour gérer les participants d'une réunion
import React, { useState, useEffect } from 'react';
import { Plus, X, User, Mail, AlertCircle, Upload } from 'lucide-react';
import { MeetingParticipant } from '../../types/meetings';
import { EmailField } from '../ui/EmailField';
import { ImportGuestsModal } from './ImportGuestsModal';

interface ParticipantsFormProps {
  participants: MeetingParticipant[];
  onChange: (participants: MeetingParticipant[]) => void;
  organizer: { name: string; email: string };
  darkMode?: boolean;
}

interface ValidationError {
  index: number;
  field: 'name' | 'email';
  message: string;
}

export function ParticipantsForm({ 
  participants, 
  onChange, 
  organizer, 
  darkMode = false 
}: ParticipantsFormProps) {
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);

  // Validation email simple
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Vérifier les doublons (insensible à la casse)
  const hasDuplicateEmail = (email: string, currentIndex: number): boolean => {
    return participants.some((p, index) => 
      index !== currentIndex && p.email.toLowerCase() === email.toLowerCase()
    );
  };

  // Validation complète
  const validateParticipants = (newParticipants: MeetingParticipant[]): ValidationError[] => {
    const newErrors: ValidationError[] = [];

    newParticipants.forEach((participant, index) => {
      // Validation du nom
      if (!participant.name.trim()) {
        newErrors.push({
          index,
          field: 'name',
          message: 'Le nom est obligatoire'
        });
      }

      // Validation de l'email
      if (!participant.email.trim()) {
        newErrors.push({
          index,
          field: 'email',
          message: 'L\'email est obligatoire'
        });
      } else if (!isValidEmail(participant.email)) {
        newErrors.push({
          index,
          field: 'email',
          message: 'Format d\'email invalide'
        });
      } else if (hasDuplicateEmail(participant.email, index)) {
        newErrors.push({
          index,
          field: 'email',
          message: 'Cet email existe déjà'
        });
      }
    });

    return newErrors;
  };

  // Mettre à jour un participant (par ID stable)
  const updateParticipant = (id: string, field: 'name' | 'email', value: string) => {
    const newParticipants = participants.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    );
    
    console.log('[PARTICIPANTS] Update participant:', { id, field, value });
    
    onChange(newParticipants);
  };

  // Validation seulement au blur
  const handleBlur = () => {
    const newErrors = validateParticipants(participants);
    setErrors(newErrors);
  };

  // Constantes
  const MAX_PARTICIPANTS = 20;
  const canAddMore = participants.length < MAX_PARTICIPANTS;
  const guestsCount = participants.filter(p => p.role !== 'organizer').length;

  // Ajouter un participant
  const addParticipant = () => {
    if (!canAddMore) {
      console.warn('[PARTICIPANTS] Limite atteinte:', MAX_PARTICIPANTS);
      return;
    }
    
    const newParticipant: MeetingParticipant = {
      id: crypto.randomUUID(),  // 🆔 UUID stable
      name: '',
      email: '',
      role: 'guest'
    };
    
    const newParticipants = [...participants, newParticipant];
    console.log('[PARTICIPANTS] Add participant, total:', newParticipants.length);
    
    onChange(newParticipants);
  };

  // Supprimer un participant par ID (sauf l'organisateur)
  const removeParticipant = (id: string) => {
    const participant = participants.find(p => p.id === id);
    if (participant?.role === 'organizer') {
      console.warn('[PARTICIPANTS] Cannot remove organizer');
      return;
    }

    const newParticipants = participants.filter(p => p.id !== id);
    console.log('[PARTICIPANTS] Remove participant, remaining:', newParticipants.length);
    
    onChange(newParticipants);
  };

  // Vérifier s'il y a des erreurs
  const hasErrors = errors.length > 0;

  // Obtenir l'erreur pour un champ spécifique
  const getFieldError = (index: number, field: 'name' | 'email') => {
    return errors.find(e => e.index === index && e.field === field);
  };
  
  // Ajouter des participants en masse
  const addBulkParticipants = (newParticipants: Omit<MeetingParticipant, 'id'>[]) => {
    const availableSlots = MAX_PARTICIPANTS - participants.length;
    
    if (availableSlots <= 0) {
      alert('Limite de 20 participants atteinte');
      return { added: 0, ignored: newParticipants.length };
    }
    
    const toAdd = newParticipants.slice(0, availableSlots);
    const ignored = newParticipants.length - toAdd.length;
    
    const participantsWithIds = toAdd.map(p => ({
      ...p,
      id: crypto.randomUUID(),
      role: (p.role || 'guest') as 'guest' | 'organizer'
    }));
    
    onChange([...participants, ...participantsWithIds]);
    
    return { added: toAdd.length, ignored };
  };

  // Validation initiale si nécessaire
  useEffect(() => {
    const newErrors = validateParticipants(participants);
    setErrors(newErrors);
  }, []);

  // Debug logs
  console.log('[PARTICIPANTS] Current state:', { 
    participants: participants.length, 
    errors: errors.length,
    organizer 
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            👥 Participants ({participants.length}/{MAX_PARTICIPANTS})
          </h4>
          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {guestsCount} invité{guestsCount > 1 ? 's' : ''}
            {!canAddMore && ' • Limite atteinte'}
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            disabled={!canAddMore}
            className={`flex items-center space-x-1 px-3 py-1 text-sm rounded transition-colors ${
              canAddMore 
                ? 'bg-green-600 text-white hover:bg-green-700' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Importer</span>
          </button>
          <button
            type="button"
            onClick={addParticipant}
            disabled={!canAddMore}
            className={`flex items-center space-x-1 px-3 py-1 text-sm rounded transition-colors ${
              canAddMore 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter</span>
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {participants.map((participant, index) => {
          const isOrganizer = participant.role === 'organizer';
          const nameError = getFieldError(index, 'name');
          const emailError = getFieldError(index, 'email');

          return (
            <div
              key={participant.id}
              className={`p-4 rounded-lg border ${
                darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
              } ${isOrganizer ? 'ring-2 ring-blue-500/20' : ''}`}
            >
              {/* Header avec rôle */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <User className={`w-4 h-4 ${isOrganizer ? 'text-blue-500' : 'text-gray-400'}`} />
                  <span className={`text-sm font-medium ${
                    isOrganizer 
                      ? 'text-blue-600 dark:text-blue-400' 
                      : (darkMode ? 'text-gray-300' : 'text-gray-700')
                  }`}>
                    {isOrganizer ? 'Organisateur' : 'Invité'}
                  </span>
                </div>
                
                {!isOrganizer && (
                  <button
                    type="button"
                    onClick={() => removeParticipant(participant.id)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    title="Supprimer ce participant"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Champs nom et email */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Nom */}
                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Nom complet
                  </label>
                  <input
                    type="text"
                    value={participant.name}
                    onChange={(e) => updateParticipant(participant.id, 'name', e.target.value)}
                    onBlur={handleBlur}
                    readOnly={isOrganizer}
                    placeholder="Nom du participant"
                    className={`w-full px-3 py-2 rounded border transition-colors ${
                      nameError 
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' 
                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500/20'
                    } ${
                      isOrganizer 
                        ? (darkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-100 text-gray-600')
                        : (darkMode ? 'bg-gray-600 text-white' : 'bg-white text-gray-900')
                    } ${
                      isOrganizer ? 'cursor-not-allowed' : ''
                    }`}
                  />
                  {nameError && (
                    <div className="flex items-center space-x-1 mt-1 text-red-500 text-sm">
                      <AlertCircle className="w-3 h-3" />
                      <span>{nameError.message}</span>
                    </div>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Adresse email
                  </label>
                  <EmailField
                    value={participant.email}
                    onChange={(value) => updateParticipant(participant.id, 'email', value)}
                    onBlur={handleBlur}
                    readOnly={isOrganizer}
                    placeholder="email@exemple.com"
                    autoComplete="off"
                    inputMode="email"
                    className={`${
                      emailError 
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' 
                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500/20'
                    } ${
                      isOrganizer 
                        ? (darkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-100 text-gray-600')
                        : (darkMode ? 'bg-gray-600 text-white' : 'bg-white text-gray-900')
                    } ${
                      isOrganizer ? 'cursor-not-allowed' : ''
                    }`}
                    data-testid={`participant-email-${index}`}
                  />
                  {emailError && (
                    <div className="flex items-center space-x-1 mt-1 text-red-500 text-sm">
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

      {/* Résumé des erreurs */}
      {hasErrors && (
        <div className={`p-3 rounded-lg border ${
          darkMode 
            ? 'bg-red-900/20 border-red-800 text-red-300' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center space-x-2 mb-2">
            <AlertCircle className="w-4 h-4" />
            <span className="font-medium text-sm">
              {errors.length} erreur{errors.length > 1 ? 's' : ''} détectée{errors.length > 1 ? 's' : ''}
            </span>
          </div>
          <ul className="text-sm space-y-1">
            {errors.map((error) => (
              <li key={`error-${error.index}-${error.field}`}>
                • Participant {error.index + 1} ({error.field}): {error.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Debug info */}
      <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
        Validation: {hasErrors ? '❌ Erreurs' : '✅ OK'} | 
        Participants: {participants.length} | 
        Organisateur: {organizer.email}
      </div>

      {/* Import Modal */}
      <ImportGuestsModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={addBulkParticipants}
        existingParticipants={participants}
        darkMode={darkMode}
      />
    </div>
  );
}
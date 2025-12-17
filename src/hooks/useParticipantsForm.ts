// 👥 Hook pour gérer les participants avec validation et feedback
import { useState, useCallback, useMemo } from 'react';
import { MeetingParticipant } from '../types/meetings';
import { useToasts, createSuccessToast, createErrorToast, createInfoToast } from './useToasts';
import { usePlanLimits } from './usePlanLimits';

export interface ParticipantsFormState {
  participants: MeetingParticipant[];
  organizer: { name: string; email: string };
  
  // Actions
  addParticipant: () => void;
  removeParticipant: (id: string) => void;
  updateParticipant: (id: string, field: 'name' | 'email', value: string) => void;
  addBulkParticipants: (participants: Omit<MeetingParticipant, 'id'>[]) => { added: number; ignored: number };
  setOrganizer: (organizer: { name: string; email: string }) => void;
  
  // Validation
  validation: {
    isValid: boolean;
    errors: ValidationError[];
    hasErrors: boolean;
    getFieldError: (index: number, field: 'name' | 'email') => ValidationError | undefined;
  };
  
  // Stats
  stats: {
    total: number;
    guests: number;
    canAddMore: boolean;
    availableSlots: number;
  };
  
  // Progress (gamification)
  progress: {
    completed: number;
    total: number;
    percentage: number;
    isComplete: boolean;
  };
}

export interface ValidationError {
  index: number;
  field: 'name' | 'email';
  message: string;
  participantId: string;
}

// MAX_PARTICIPANTS sera récupéré dynamiquement via usePlanLimits

// Validation email
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

export function useParticipantsForm(
  initialOrganizer: { name: string; email: string }
): ParticipantsFormState {
  const { showToast } = useToasts();
  
  // Récupérer les limites du plan utilisateur
  const { limits } = usePlanLimits();
  const MAX_PARTICIPANTS = limits?.meeting_max_participants ?? 20; // Fallback à 20 si non défini
  
  // État local
  const [organizer, setOrganizerState] = useState(initialOrganizer);
  const [participants, setParticipants] = useState<MeetingParticipant[]>([
    {
      id: 'organizer',
      name: initialOrganizer.name,
      email: initialOrganizer.email,
      role: 'organizer'
    }
  ]);

  // Actions
  const setOrganizer = useCallback((newOrganizer: { name: string; email: string }) => {
    setOrganizerState(newOrganizer);
    
    // Mettre à jour dans la liste des participants
    setParticipants(prev => 
      prev.map(p => 
        p.role === 'organizer' 
          ? { ...p, name: newOrganizer.name, email: newOrganizer.email }
          : p
      )
    );
    
    console.log('👥 [PARTICIPANTS] Organizer updated:', newOrganizer);
  }, []);

  const addParticipant = useCallback(() => {
    if (MAX_PARTICIPANTS !== null && participants.length >= MAX_PARTICIPANTS) {
      showToast(createErrorToast(
        'Limite atteinte',
        `Maximum ${MAX_PARTICIPANTS} participants autorisés`
      ));
      return;
    }

    const newParticipant: MeetingParticipant = {
      id: crypto.randomUUID(),
      name: '',
      email: '',
      role: 'guest'
    };

    setParticipants(prev => [...prev, newParticipant]);
    
    showToast(createSuccessToast(
      'Participant ajouté',
      'Vous pouvez maintenant remplir ses informations'
    ));
    
    console.log('👥 [PARTICIPANTS] Added participant:', newParticipant.id);
  }, [participants.length, showToast, MAX_PARTICIPANTS]);

  const removeParticipant = useCallback((id: string) => {
    const participant = participants.find(p => p.id === id);
    
    if (!participant) {
      console.warn('👥 [PARTICIPANTS] Participant not found:', id);
      return;
    }
    
    if (participant.role === 'organizer') {
      showToast(createErrorToast(
        'Action interdite',
        'Impossible de supprimer l\'organisateur'
      ));
      return;
    }

    setParticipants(prev => prev.filter(p => p.id !== id));
    
    showToast(createInfoToast(
      'Participant supprimé',
      participant.name || participant.email || 'Participant sans nom'
    ));
    
    console.log('👥 [PARTICIPANTS] Removed participant:', id);
  }, [participants, showToast]);

  const updateParticipant = useCallback((
    id: string, 
    field: 'name' | 'email', 
    value: string
  ) => {
    setParticipants(prev =>
      prev.map(p =>
        p.id === id ? { ...p, [field]: value.trim() } : p
      )
    );
    
    console.log('👥 [PARTICIPANTS] Updated:', { id, field, value: value.trim() });
  }, []);

  const addBulkParticipants = useCallback((
    newParticipants: Omit<MeetingParticipant, 'id'>[]
  ) => {
    const availableSlots = MAX_PARTICIPANTS === null ? newParticipants.length : MAX_PARTICIPANTS - participants.length;
    
    if (availableSlots <= 0) {
      showToast(createErrorToast(
        'Import impossible',
        'Limite de participants atteinte'
      ));
      return { added: 0, ignored: newParticipants.length };
    }

    const toAdd = newParticipants.slice(0, availableSlots);
    const ignored = newParticipants.length - toAdd.length;
    
    const participantsWithIds = toAdd.map(p => ({
      ...p,
      id: crypto.randomUUID(),
      role: 'guest' as const,
      name: p.name.trim(),
      email: p.email.trim()
    }));

    setParticipants(prev => [...prev, ...participantsWithIds]);
    
    if (ignored > 0) {
      showToast(createInfoToast(
        `${toAdd.length} participants ajoutés`,
        `${ignored} ignoré(s) - limite atteinte`
      ));
    } else {
      showToast(createSuccessToast(
        `${toAdd.length} participants ajoutés`,
        'Import réalisé avec succès'
      ));
    }
    
    console.log('👥 [PARTICIPANTS] Bulk import:', { added: toAdd.length, ignored });
    return { added: toAdd.length, ignored };
  }, [participants.length, showToast, MAX_PARTICIPANTS]);

  // Validation
  const validation = useMemo(() => {
    const errors: ValidationError[] = [];

    participants.forEach((participant, index) => {
      // Validation du nom
      if (!participant.name.trim()) {
        errors.push({
          index,
          field: 'name',
          message: 'Le nom est obligatoire',
          participantId: participant.id
        });
      }

      // Validation de l'email
      if (!participant.email.trim()) {
        errors.push({
          index,
          field: 'email',
          message: 'L\'email est obligatoire',
          participantId: participant.id
        });
      } else if (!isValidEmail(participant.email)) {
        errors.push({
          index,
          field: 'email',
          message: 'Format d\'email invalide',
          participantId: participant.id
        });
      } else {
        // Vérifier les doublons
        const duplicateIndex = participants.findIndex((p, i) => 
          i !== index && 
          p.email.toLowerCase().trim() === participant.email.toLowerCase().trim()
        );
        
        if (duplicateIndex !== -1) {
          errors.push({
            index,
            field: 'email',
            message: 'Cet email existe déjà',
            participantId: participant.id
          });
        }
      }
    });

    const getFieldError = (index: number, field: 'name' | 'email') => {
      return errors.find(e => e.index === index && e.field === field);
    };

    return {
      isValid: errors.length === 0,
      errors,
      hasErrors: errors.length > 0,
      getFieldError
    };
  }, [participants]);

  // Stats
  const stats = useMemo(() => {
    const total = participants.length;
    const guests = participants.filter(p => p.role === 'guest').length;
    const availableSlots = MAX_PARTICIPANTS === null ? Infinity : MAX_PARTICIPANTS - total;
    
    return {
      total,
      guests,
      canAddMore: MAX_PARTICIPANTS === null || total < MAX_PARTICIPANTS,
      availableSlots
    };
  }, [participants, MAX_PARTICIPANTS]);

  // Progress pour gamification
  const progress = useMemo(() => {
    let completed = 0;
    const total = 3; // Critères : titre rempli, organisateur OK, au moins 1 participant valide
    
    // 1. Organisateur valide
    if (organizer.name.trim() && isValidEmail(organizer.email)) {
      completed++;
    }
    
    // 2. Au moins un invité avec nom et email valides
    const validGuests = participants.filter(p => 
      p.role === 'guest' && 
      p.name.trim() && 
      isValidEmail(p.email)
    );
    if (validGuests.length > 0) {
      completed++;
    }
    
    // 3. Pas d'erreurs de validation
    if (!validation.hasErrors) {
      completed++;
    }
    
    const percentage = Math.round((completed / total) * 100);
    
    return {
      completed,
      total,
      percentage,
      isComplete: completed === total
    };
  }, [organizer, participants, validation.hasErrors]);

  return {
    // État
    participants,
    organizer,
    
    // Actions
    addParticipant,
    removeParticipant,
    updateParticipant,
    addBulkParticipants,
    setOrganizer,
    
    // Validation
    validation,
    
    // Stats
    stats,
    
    // Progress
    progress
  };
}
// ⏰ Hook pour gérer la planification des réunions
import { useState, useCallback, useMemo } from 'react';

export type SchedulingMode = 'now' | 'scheduled';

export interface SchedulingState {
  mode: SchedulingMode;
  scheduledDate: string; // ISO string format YYYY-MM-DDTHH:mm
  timezone: string; // IANA timezone
}

export interface SchedulingData {
  mode: SchedulingMode;
  starts_at?: string; // ISO 8601 UTC
  timezone?: string;
}

export interface UseSchedulingReturn {
  // État
  mode: SchedulingMode;
  scheduledDate: string;
  timezone: string;
  
  // Actions
  setMode: (mode: SchedulingMode) => void;
  setScheduledDate: (date: string) => void;
  setTimezone: (tz: string) => void;
  
  // Validation
  isValid: boolean;
  validationError: string | null;
  
  // Conversion
  getSchedulingData: () => SchedulingData;
  getDisplayDate: () => string;
  
  // Helpers
  resetToDefault: () => void;
}

// Helper pour obtenir la date par défaut (maintenant + 1h)
const getDefaultDateTime = (): string => {
  const now = new Date();
  now.setHours(now.getHours() + 1, 0, 0, 0); // +1h, minutes/secondes à 0
  return now.toISOString().slice(0, 16); // Format YYYY-MM-DDTHH:mm
};

// Obtenir le timezone de l'utilisateur
const getUserTimezone = (): string => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

export function useScheduling(): UseSchedulingReturn {
  const [mode, setModeState] = useState<SchedulingMode>('now');
  const [scheduledDate, setScheduledDateState] = useState<string>(getDefaultDateTime());
  const [timezone, setTimezoneState] = useState<string>(getUserTimezone());

  // Actions avec logging
  const setMode = useCallback((newMode: SchedulingMode) => {
    console.log('⏰ [SCHEDULING] Mode changed:', newMode);
    setModeState(newMode);
  }, []);

  const setScheduledDate = useCallback((date: string) => {
    console.log('⏰ [SCHEDULING] Date changed:', date);
    setScheduledDateState(date);
  }, []);

  const setTimezone = useCallback((tz: string) => {
    console.log('⏰ [SCHEDULING] Timezone changed:', tz);
    setTimezoneState(tz);
  }, []);

  // Validation
  const validation = useMemo(() => {
    if (mode === 'now') {
      return { isValid: true, error: null };
    }

    if (!scheduledDate) {
      return { isValid: false, error: 'Date et heure obligatoires' };
    }

    // Vérifier que la date n'est pas dans le passé
    const selectedDate = new Date(scheduledDate);
    const now = new Date();
    
    if (selectedDate <= now) {
      return { 
        isValid: false, 
        error: 'La date doit être dans le futur' 
      };
    }

    // Vérifier que ce n'est pas trop loin (ex: max 1 an)
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    
    if (selectedDate > oneYearFromNow) {
      return { 
        isValid: false, 
        error: 'La date ne peut pas dépasser un an' 
      };
    }

    return { isValid: true, error: null };
  }, [mode, scheduledDate]);

  // Conversion vers format API
  const getSchedulingData = useCallback((): SchedulingData => {
    if (mode === 'now') {
      return { mode: 'now' };
    }

    // Convertir la date locale vers UTC
    const localDate = new Date(scheduledDate);
    const utcDate = localDate.toISOString();

    return {
      mode: 'scheduled',
      starts_at: utcDate,
      timezone: timezone
    };
  }, [mode, scheduledDate, timezone]);

  // Format d'affichage localisé
  const getDisplayDate = useCallback((): string => {
    if (mode === 'now') {
      return 'Démarrage immédiat';
    }

    if (!scheduledDate) {
      return 'Date non définie';
    }

    try {
      const date = new Date(scheduledDate);
      const formatter = new Intl.DateTimeFormat('fr-FR', {
        dateStyle: 'full',
        timeStyle: 'short',
        timeZone: timezone
      });
      
      return formatter.format(date);
    } catch (error) {
      console.warn('⏰ [SCHEDULING] Error formatting date:', error);
      return 'Date invalide';
    }
  }, [mode, scheduledDate, timezone]);

  // Reset aux valeurs par défaut
  const resetToDefault = useCallback(() => {
    console.log('⏰ [SCHEDULING] Reset to default');
    setModeState('now');
    setScheduledDateState(getDefaultDateTime());
    setTimezoneState(getUserTimezone());
  }, []);

  return {
    // État
    mode,
    scheduledDate,
    timezone,
    
    // Actions
    setMode,
    setScheduledDate,
    setTimezone,
    
    // Validation
    isValid: validation.isValid,
    validationError: validation.error,
    
    // Conversion
    getSchedulingData,
    getDisplayDate,
    
    // Helpers
    resetToDefault
  };
}
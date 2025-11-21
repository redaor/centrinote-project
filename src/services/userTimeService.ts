/**
 * Service pour récupérer l'heure locale de l'utilisateur
 * Utilise l'Edge Function get-user-local-time
 */

import { supabase } from '../lib/supabase';

export interface UserLocalTime {
  success: boolean;
  userId: string;
  timezone: string;
  utc: {
    iso: string;
    timestamp: number;
  };
  local: {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
    formatted: string;
    timeString: string; // HH:MM format
  };
  offset: {
    hours: number;
    minutes: number;
  };
  timestamp: string;
}

class UserTimeService {
  /**
   * Récupère l'heure locale de l'utilisateur connecté
   * @param timezone - Fuseau horaire optionnel (si non fourni, récupéré depuis le profil)
   * @returns Informations sur l'heure locale de l'utilisateur
   */
  async getUserLocalTime(timezone?: string): Promise<UserLocalTime> {
    try {
      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('User not authenticated');
      }

      const token = session.access_token;

      // Call Edge Function
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
      const response = await fetch(`${supabaseUrl}/functions/v1/get-user-local-time`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timezone // Optionnel : si fourni, l'utilise directement
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data: UserLocalTime = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Error getting user local time:', error);
      
      // Fallback: use browser timezone if Edge Function fails
      const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const now = new Date();
      
      const formatter = new Intl.DateTimeFormat('fr-FR', {
        timeZone: browserTimezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });

      const parts = formatter.formatToParts(now);
      const partsObj: Record<string, string> = {};
      parts.forEach(part => {
        if (part.type !== 'literal') {
          partsObj[part.type] = part.value;
        }
      });

      return {
        success: false,
        userId: session?.user?.id || 'unknown',
        timezone: browserTimezone,
        utc: {
          iso: now.toISOString(),
          timestamp: now.getTime()
        },
        local: {
          year: parseInt(partsObj.year),
          month: parseInt(partsObj.month),
          day: parseInt(partsObj.day),
          hour: parseInt(partsObj.hour),
          minute: parseInt(partsObj.minute),
          second: parseInt(partsObj.second),
          formatted: `${partsObj.day}/${partsObj.month}/${partsObj.year} ${partsObj.hour}:${partsObj.minute}:${partsObj.second}`,
          timeString: `${partsObj.hour}:${partsObj.minute}`
        },
        offset: {
          hours: 0, // Will be calculated if needed
          minutes: 0
        },
        timestamp: now.toISOString()
      };
    }
  }

  /**
   * Récupère uniquement le fuseau horaire de l'utilisateur
   * @returns Fuseau horaire IANA (ex: "Africa/Algiers")
   */
  async getUserTimezone(): Promise<string> {
    try {
      const localTime = await this.getUserLocalTime();
      return localTime.timezone;
    } catch (error) {
      console.warn('⚠️ Could not get user timezone, using browser default');
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    }
  }
}

export const userTimeService = new UserTimeService();


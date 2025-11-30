// =====================================================
// AUTOMATION ACCESS SERVICE
// Service pour vérifier l'accès utilisateur aux automatisations
// =====================================================

import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';

interface AutomationAccessResponse {
  user_id: string;
  has_access: boolean;
  error?: string;
}

/**
 * Vérifie l'accès de l'utilisateur aux automatisations
 */
export async function checkAutomationAccess(): Promise<AutomationAccessResponse> {
  try {
    // Récupérer le token JWT de l'utilisateur
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session?.access_token) {
      logger.warn('No session or token available for automation access check', {
        error: sessionError?.message,
      });
      return {
        user_id: '',
        has_access: false,
        error: 'Not authenticated',
      };
    }

    // Appeler l'edge function
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://wjzlicokhxitmeoxkjzv.supabase.co';
    const response = await fetch(`${supabaseUrl}/functions/v1/automation-access`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      logger.error('Failed to check automation access', {
        status: response.status,
        error: errorData.error,
      });
      return {
        user_id: '',
        has_access: false,
        error: errorData.error || `HTTP ${response.status}`,
      };
    }

    const data: AutomationAccessResponse = await response.json();
    
    logger.info('Automation access checked', {
      user_id: data.user_id,
      has_access: data.has_access,
    });

    return data;
  } catch (error) {
    logger.error('Error checking automation access', error instanceof Error ? error : new Error('Unknown error'), {
      source: 'automationAccessService',
    });
    return {
      user_id: '',
      has_access: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}


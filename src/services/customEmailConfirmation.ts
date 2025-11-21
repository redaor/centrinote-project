/**
 * Service de confirmation d'email personnalisé
 * Gère la logique métier de confirmation sans utiliser le système natif Supabase
 */

import { supabase } from '../lib/supabase';

export interface ConfirmationResult {
  success: boolean;
  token?: string;
  error?: string;
}

/**
 * Créer un token de confirmation et l'envoyer par email
 * À appeler après la création d'un utilisateur
 */
export async function createAndSendConfirmation(
  userId: string,
  email: string,
  options: { force?: boolean } = {}
): Promise<ConfirmationResult> {
  try {
    console.log('🔄 Demande d\'envoi de confirmation via Edge Function pour:', email);

    const { data, error } = await supabase.functions.invoke('send-confirmation', {
      body: {
        userId,
        email,
        force: options.force ?? false
      }
    });

    if (error) {
      console.error('❌ Erreur send-confirmation:', error);
      return {
        success: false,
        error: error.message || 'Failed to send confirmation email'
      };
    }

    console.log('✅ Edge Function send-confirmation exécutée:', data);

    return {
      success: true,
      token: data?.token ?? data?.confirmationUrl
    };
  } catch (error) {
    console.error('❌ Erreur création confirmation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Renvoyer un email de confirmation
 * Avec vérification du rate limit (60 secondes)
 */
export async function resendConfirmationEmail(email: string): Promise<ConfirmationResult> {
  try {
    console.log('🔄 Renvoi email de confirmation pour:', email);

    // 1. Récupérer l'utilisateur
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // 2. Vérifier si l'email est déjà confirmé
    if (user.email_confirmed_at) {
      return {
        success: false,
        error: 'Email already confirmed'
      };
    }

    // 3. Demander via Netlify Function qui gère le rate limit
    const { data, error } = await supabase.functions.invoke('send-confirmation', {
      body: {
        userId: user.id,
        email,
        force: true
      }
    });

    if (error) {
      throw new Error(error.message || 'Failed to resend confirmation email');
    }

    console.log('✅ Email de confirmation renvoyé pour:', email, data);

    return {
      success: true,
      token: data?.token ?? data?.confirmationUrl
    };
  } catch (error) {
    console.error('❌ Erreur renvoi confirmation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Vérifier un token de confirmation
 * À appeler depuis la page /confirm-email
 */
export async function verifyConfirmationToken(token: string): Promise<{
  success: boolean;
  email?: string;
  error?: string;
}> {
  try {
    console.log('🔄 Vérification token via Edge Function...');

    const { data, error } = await supabase.functions.invoke('confirm-email', {
      body: { token }
    });

    if (error) {
      throw new Error(error.message || 'Token verification failed');
    }

    console.log('✅ Email confirmé avec succès:', data?.email);

    return {
      success: true,
      email: data?.email
    };
  } catch (error) {
    console.error('❌ Erreur vérification token:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Vérifier si un utilisateur a confirmé son email
 */
export async function isEmailConfirmed(): Promise<boolean> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return false;
    }

    return !!user.email_confirmed_at;
  } catch (error) {
    console.error('❌ Erreur vérification statut confirmation:', error);
    return false;
  }
}

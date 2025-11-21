// 🔗 Service de vérification email natif Supabase
// Utilise le système d'authentification Supabase intégré

import { supabase } from '../lib/supabase';

export interface VerificationLinkResponse {
  success: boolean;
  message?: string;
  verification_link?: string;
  error?: string;
}

export interface TokenVerificationResponse {
  success: boolean;
  verified?: boolean;
  message?: string;
  error?: string;
}

/**
 * Envoie un lien de vérification par email via Supabase Auth
 * Supabase gère automatiquement l'envoi d'email avec un lien magique
 */
export const sendVerificationLink = async (
  email: string,
  userId: string,
  action: 'signup' | 'resend' = 'signup'
): Promise<VerificationLinkResponse> => {
  try {
    // Supabase envoie automatiquement un email de confirmation lors de l'inscription
    // Pour un renvoi, on utilise resend() de l'API Auth
    const { data, error } = await supabase.auth.resend({
      type: 'signup',
      email: email.toLowerCase().trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/verify-email`
      }
    });

    if (error) {
      console.error('❌ Erreur renvoi email:', error);
      return {
        success: false,
        error: error.message || 'Impossible d\'envoyer l\'email'
      };
    }

    console.log('✅ Email de vérification renvoyé:', data);
    return {
      success: true,
      message: 'Email de vérification envoyé !',
    };
  } catch (error) {
    console.error('❌ Erreur sendVerificationLink:', error);
    return {
      success: false,
      error: 'Erreur de réseau. Réessayez.'
    };
  }
};

/**
 * Vérifie un token de vérification email via Supabase Auth
 * Le token est géré automatiquement par Supabase lors du clic sur le lien
 */
export const verifyEmailToken = async (
  token: string,
  email: string
): Promise<TokenVerificationResponse> => {
  try {
    // Vérifier le token OTP Supabase
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'email',
    });

    if (error) {
      console.error('❌ Erreur vérification token:', error);
      return {
        success: false,
        error: error.message.includes('expired') ? 'Lien expiré' : 'Lien invalide'
      };
    }

    if (data?.user) {
      console.log('✅ Email vérifié:', data.user.email);
      return {
        success: true,
        verified: true,
        message: 'Email vérifié avec succès !'
      };
    }

    return {
      success: false,
      error: 'Token invalide'
    };
  } catch (error) {
    console.error('❌ Erreur verifyEmailToken:', error);
    return {
      success: false,
      error: 'Erreur de réseau. Réessayez.'
    };
  }
};
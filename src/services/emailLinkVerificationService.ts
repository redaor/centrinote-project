// 🔗 Service de vérification email par liens via n8n
// Remplace l'ancien système de codes à 6 chiffres

const N8N_BASE_URL = import.meta.env.VITE_N8N_BASE_URL || 'https://n8n.srv886297.hstgr.cloud';

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
 * Envoie un lien de vérification par email via n8n
 */
export const sendVerificationLink = async (
  email: string, 
  userId: string,
  action: 'signup' | 'resend' = 'signup'
): Promise<VerificationLinkResponse> => {
  try {
    const response = await fetch(`${N8N_BASE_URL}/webhook/send-verification-link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_N8N_WEBHOOK_TOKEN || ''}`,
        'X-Source': 'centrinote-link-verification'
      },
      body: JSON.stringify({
        email: email.toLowerCase().trim(),
        user_id: userId,
        action,
        timestamp: new Date().toISOString(),
        domain: window.location.origin
      })
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Erreur ${response.status}: Impossible d'envoyer l'email`
      };
    }

    const result = await response.json();
    return {
      success: true,
      message: 'Email de vérification envoyé !',
      verification_link: result.verification_link
    };
  } catch (error) {
    return {
      success: false,
      error: 'Erreur de réseau. Réessayez.'
    };
  }
};

/**
 * Vérifie un token de vérification email via n8n
 */
export const verifyEmailToken = async (
  token: string, 
  email: string
): Promise<TokenVerificationResponse> => {
  try {
    const response = await fetch(
      `${N8N_BASE_URL}/webhook/verify-email-token?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_N8N_WEBHOOK_TOKEN || ''}`,
          'X-Source': 'centrinote-token-verification'
        }
      }
    );

    if (!response.ok) {
      return {
        success: false,
        error: response.status === 404 ? 'Lien invalide ou expiré' : 'Erreur de vérification'
      };
    }

    const result = await response.json();
    
    if (result.success || result.verified) {
      return {
        success: true,
        verified: true,
        message: 'Email vérifié avec succès !'
      };
    }

    return {
      success: false,
      error: result.message || 'Token invalide'
    };
  } catch (error) {
    return {
      success: false,
      error: 'Erreur de réseau. Réessayez.'
    };
  }
};
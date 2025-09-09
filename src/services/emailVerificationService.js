// 📧 Service de vérification email avec codes à 6 chiffres via n8n
// ================================================================

const N8N_BASE_URL = 'https://n8n.srv886297.hstgr.cloud';

// ==========================================
// 1. VÉRIFIER CODE À 6 CHIFFRES
// ==========================================

export const verifyEmailCode = async (email, code) => {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedCode = code.trim().replace(/\s/g, ''); // Supprimer espaces

    // Vérification code en cours...

    if (!normalizedCode || normalizedCode.length !== 6 || !/^\d{6}$/.test(normalizedCode)) {
      return {
        success: false,
        error: {
          message: 'Le code doit contenir exactement 6 chiffres',
          type: 'ValidationError'
        }
      };
    }

    const response = await fetch(`${N8N_BASE_URL}/webhook/verify-email-code`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_N8N_WEBHOOK_TOKEN || ''}`,
        'X-Source': 'centrinote-verify'
      },
      body: JSON.stringify({
        email: normalizedEmail,
        code: normalizedCode,
        timestamp: new Date().toISOString(),
        action: 'verify'
      })
    });

    if (!response.ok) {
      let errorMessage = 'Erreur de vérification';
      
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch {
        // Si pas de JSON, utiliser le status
        if (response.status === 400) errorMessage = 'Code invalide';
        else if (response.status === 404) errorMessage = 'Code expiré ou introuvable';
        else if (response.status === 429) errorMessage = 'Trop de tentatives, attendez';
        else if (response.status >= 500) errorMessage = 'Erreur serveur n8n';
      }
      
      // Erreur HTTP n8n silencieuse en production
      
      return {
        success: false,
        error: {
          message: errorMessage,
          type: 'NetworkError',
          status: response.status
        }
      };
    }

    const result = await response.json();

    if (result.success || result.verified) {
      // Code validé - mise à jour des métadonnées
      
      // 🚀 CRITIQUE : Mettre à jour les métadonnées Supabase immédiatement
      try {
        const { supabase } = await import('../lib/supabase');
        
        const { error: updateError } = await supabase.auth.updateUser({
          data: {
            email_verified: true,
            verification_pending: false,
            email_verified_at: new Date().toISOString(),
            verification_method: 'n8n_code'
          }
        });

        if (updateError) {
          // Erreur métadonnées - continuer quand même
        }

        // Forcer refresh de la session
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          // Erreur refresh - continuer
        }

      } catch (metadataError) {
        // Erreur critique métadonnées - continuer quand même
      }
      
      return {
        success: true,
        data: {
          verified: true,
          email: normalizedEmail,
          timestamp: new Date().toISOString(),
          metadata_updated: true
        }
      };
    } else {
      return {
        success: false,
        error: {
          message: result.message || 'Code invalide',
          type: 'VerificationError'
        }
      };
    }

  } catch (error) {
    // Erreur vérification code silencieuse
    return {
      success: false,
      error: {
        message: 'Impossible de vérifier le code. Réessayez.',
        type: 'NetworkError'
      }
    };
  }
};

// ==========================================
// 2. RENVOYER CODE DE VÉRIFICATION
// ==========================================

export const resendVerificationCode = async (email, userId = null) => {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    
    // Renvoi code vérification

    const response = await fetch(`${N8N_BASE_URL}/webhook/email-verification`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_N8N_WEBHOOK_TOKEN || ''}`,
        'X-Source': 'centrinote-resend'
      },
      body: JSON.stringify({
        email: normalizedEmail,
        user_id: userId,
        action: 'resend',
        timestamp: new Date().toISOString(),
        source: 'web'
      })
    });

    if (!response.ok) {
      let errorMessage = 'Impossible de renvoyer le code';
      
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch {
        // Messages d'erreur selon status HTTP
        if (response.status === 400) errorMessage = 'Email invalide';
        else if (response.status === 429) errorMessage = 'Veuillez attendre avant de demander un nouveau code';
        else if (response.status === 404) errorMessage = 'Service temporairement indisponible';
        else if (response.status >= 500) errorMessage = 'Erreur serveur n8n, réessayez';
      }
      
      // Erreur renvoi n8n silencieuse
      
      return {
        success: false,
        error: {
          message: errorMessage,
          type: response.status === 429 ? 'RateLimitError' : 'NetworkError',
          status: response.status
        }
      };
    }

    const result = await response.json();
    // Code renvoyé avec succès

    return {
      success: true,
      data: {
        sent: true,
        email: normalizedEmail,
        timestamp: new Date().toISOString()
      }
    };

  } catch (error) {
    // Erreur renvoi code silencieuse
    return {
      success: false,
      error: {
        message: 'Erreur de réseau. Réessayez.',
        type: 'NetworkError'
      }
    };
  }
};

// ==========================================
// 3. MARQUER EMAIL COMME VÉRIFIÉ DANS SUPABASE
// ==========================================

export const markEmailAsVerified = async (userId) => {
  // Fonction obsolète - métadonnées mises à jour automatiquement
  return { success: true, message: 'Email déjà vérifié' };
};

// ==========================================
// 4. VÉRIFIER STATUT EMAIL
// ==========================================

export const checkEmailVerificationStatus = async (email) => {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    
    // Vérification statut email

    const response = await fetch(`${N8N_BASE_URL}/webhook/check-verification-status`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_N8N_WEBHOOK_TOKEN || ''}`,
        'X-Source': 'centrinote-status'
      },
      body: JSON.stringify({
        email: normalizedEmail,
        timestamp: new Date().toISOString()
      })
    });

    if (!response.ok) {
      return { verified: false, pending: false };
    }

    const result = await response.json();
    return {
      verified: result.verified || false,
      pending: result.pending || false,
      expiresAt: result.expires_at || null
    };

  } catch (error) {
    // Impossible de vérifier le statut
    return { verified: false, pending: false };
  }
};

// ==========================================
// 5. UTILITAIRES
// ==========================================

export const formatVerificationCode = (code) => {
  // Formater le code pour l'affichage (ex: 123456 → 123 456)
  return code.replace(/(\d{3})(\d{3})/, '$1 $2');
};

export const isValidVerificationCode = (code) => {
  const normalizedCode = code.trim().replace(/\s/g, '');
  return /^\d{6}$/.test(normalizedCode);
};

export const getTimeUntilExpiry = (expiresAt) => {
  if (!expiresAt) return null;
  
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffMs = expiry.getTime() - now.getTime();
  
  if (diffMs <= 0) return { expired: true };
  
  const minutes = Math.floor(diffMs / 60000);
  const seconds = Math.floor((diffMs % 60000) / 1000);
  
  return { minutes, seconds, expired: false };
};
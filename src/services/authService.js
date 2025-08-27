// 🔐 Service d'authentification robuste - Protection contre otp_expired
// ================================================================

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ==========================================
// 1. INSCRIPTION ROBUSTE AVEC PROTECTION ANTI-EXPIRATION
// ==========================================

export const signUpWithRobustEmail = async (email, password, userData = {}) => {
  try {
    // Normaliser l'email (éviter les erreurs de casse)
    const normalizedEmail = email.toLowerCase().trim();
    
    // Configuration robuste pour éviter otp_expired
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        // 🚀 URL de redirection vers notre page de confirmation personnalisée
        emailRedirectTo: `${window.location.origin}/auth/confirm-email`,
        
        // 📊 Métadonnées pour debug et analytics
        data: {
          signup_time: new Date().toISOString(),
          user_agent: navigator.userAgent.substring(0, 100), // Limiter la taille
          signup_source: 'web',
          ...userData
        }
      }
    });

    if (error) {
      console.error('❌ Erreur signup:', error);
      return { 
        data: null, 
        error: {
          message: error.message,
          type: error.name || 'AuthError'
        }
      };
    }

    console.log('✅ Inscription réussie:', {
      user: data.user?.id,
      email: normalizedEmail,
      confirmationSent: !!data.user && !data.session
    });

    return { data, error: null };

  } catch (err) {
    console.error('❌ Erreur inattendue signup:', err);
    return { 
      data: null, 
      error: {
        message: 'Erreur de connexion au service',
        type: 'NetworkError'
      }
    };
  }
};

// ==========================================
// 2. CONFIRMATION AUTOMATIQUE (MAGIC LINK)
// ==========================================

export const confirmEmailWithToken = async (tokenHash, type = 'signup') => {
  try {
    console.log('🔍 Tentative confirmation automatique:', {
      token: tokenHash?.substring(0, 16) + '...',
      type
    });

    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type
    });

    if (error) {
      console.error('❌ Erreur confirmation auto:', error);
      
      // Détecter si c'est une expiration
      const isExpired = error.message.includes('expired') || 
                       error.message.includes('invalid') ||
                       error.message.includes('malformed');
      
      return { 
        data: null, 
        error: {
          message: error.message,
          type: error.name || 'AuthError',
          isExpired
        }
      };
    }

    console.log('✅ Confirmation automatique réussie');
    return { data, error: null };

  } catch (err) {
    console.error('❌ Erreur inattendue confirmation:', err);
    return { 
      data: null, 
      error: {
        message: 'Erreur de confirmation',
        type: 'NetworkError',
        isExpired: false
      }
    };
  }
};

// ==========================================
// 3. CONFIRMATION MANUELLE (OTP 6 CHIFFRES)
// ==========================================

export const confirmEmailWithOTP = async (email, token) => {
  try {
    // Valider le format du token
    if (!token || !/^\d{6}$/.test(token)) {
      return {
        data: null,
        error: {
          message: 'Code OTP invalide (6 chiffres requis)',
          type: 'ValidationError'
        }
      };
    }

    const normalizedEmail = email.toLowerCase().trim();
    
    console.log('🔢 Tentative confirmation manuelle OTP:', {
      email: normalizedEmail,
      token: token
    });

    const { data, error } = await supabase.auth.verifyOtp({
      email: normalizedEmail,
      token: token,
      type: 'signup'
    });

    if (error) {
      console.error('❌ Erreur OTP manuelle:', error);
      
      let userMessage = 'Code OTP invalide';
      if (error.message.includes('expired')) {
        userMessage = 'Code OTP expiré';
      } else if (error.message.includes('invalid')) {
        userMessage = 'Code OTP incorrect';
      } else if (error.message.includes('too_many')) {
        userMessage = 'Trop de tentatives, attendez quelques minutes';
      }
      
      return { 
        data: null, 
        error: {
          message: userMessage,
          type: error.name || 'AuthError'
        }
      };
    }

    console.log('✅ Confirmation OTP manuelle réussie');
    return { data, error: null };

  } catch (err) {
    console.error('❌ Erreur inattendue OTP:', err);
    return { 
      data: null, 
      error: {
        message: 'Erreur de vérification du code',
        type: 'NetworkError'
      }
    };
  }
};

// ==========================================
// 4. RENVOYER EMAIL DE CONFIRMATION
// ==========================================

export const resendConfirmationEmail = async (email) => {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    
    console.log('📧 Renvoi email de confirmation:', normalizedEmail);

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: normalizedEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm-email`
      }
    });

    if (error) {
      console.error('❌ Erreur renvoi email:', error);
      
      let userMessage = 'Impossible de renvoyer l\'email';
      if (error.message.includes('rate_limit')) {
        userMessage = 'Veuillez attendre avant de demander un nouveau code';
      } else if (error.message.includes('not_found')) {
        userMessage = 'Email non trouvé, veuillez vous réinscrire';
      }
      
      return { 
        error: {
          message: userMessage,
          type: error.name || 'AuthError'
        }
      };
    }

    console.log('✅ Email de confirmation renvoyé');
    return { error: null };

  } catch (err) {
    console.error('❌ Erreur inattendue renvoi:', err);
    return { 
      error: {
        message: 'Erreur de renvoi d\'email',
        type: 'NetworkError'
      }
    };
  }
};

// ==========================================
// 5. CONNEXION ROBUSTE
// ==========================================

export const signInWithEmail = async (email, password) => {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password
    });

    if (error) {
      console.error('❌ Erreur connexion:', error);
      
      let userMessage = 'Email ou mot de passe incorrect';
      if (error.message.includes('email_not_confirmed')) {
        userMessage = 'Email non confirmé, vérifiez votre boîte mail';
      } else if (error.message.includes('invalid_credentials')) {
        userMessage = 'Identifiants invalides';
      } else if (error.message.includes('too_many')) {
        userMessage = 'Trop de tentatives, attendez quelques minutes';
      }
      
      return { 
        data: null, 
        error: {
          message: userMessage,
          type: error.name || 'AuthError'
        }
      };
    }

    console.log('✅ Connexion réussie:', data.user?.id);
    return { data, error: null };

  } catch (err) {
    console.error('❌ Erreur inattendue connexion:', err);
    return { 
      data: null, 
      error: {
        message: 'Erreur de connexion',
        type: 'NetworkError'
      }
    };
  }
};

// ==========================================
// 6. VÉRIFIER LE STATUT DE L'UTILISATEUR
// ==========================================

export const getCurrentUser = () => {
  return supabase.auth.getUser();
};

export const getSession = () => {
  return supabase.auth.getSession();
};

// Écouter les changements d'authentification
export const onAuthStateChange = (callback) => {
  return supabase.auth.onAuthStateChange(callback);
};

// ==========================================
// 7. DÉCONNEXION
// ==========================================

export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('❌ Erreur déconnexion:', error);
      return { error };
    }

    console.log('✅ Déconnexion réussie');
    return { error: null };

  } catch (err) {
    console.error('❌ Erreur inattendue déconnexion:', err);
    return { 
      error: {
        message: 'Erreur de déconnexion',
        type: 'NetworkError'
      }
    };
  }
};

// ==========================================
// 8. UTILITAIRES DE DEBUG
// ==========================================

export const debugAuthState = async () => {
  try {
    const { data: session } = await getSession();
    const { data: user } = await getCurrentUser();
    
    console.log('🔍 Debug Auth State:', {
      hasSession: !!session?.session,
      hasUser: !!user?.user,
      userId: user?.user?.id,
      userEmail: user?.user?.email,
      emailConfirmed: user?.user?.email_confirmed_at,
      lastSignIn: user?.user?.last_sign_in_at
    });
    
    return {
      session: session?.session,
      user: user?.user
    };
    
  } catch (err) {
    console.error('❌ Erreur debug auth:', err);
    return null;
  }
};

// Export par défaut
export default {
  signUpWithRobustEmail,
  confirmEmailWithToken,
  confirmEmailWithOTP,
  resendConfirmationEmail,
  signInWithEmail,
  signOut,
  getCurrentUser,
  getSession,
  onAuthStateChange,
  debugAuthState
};
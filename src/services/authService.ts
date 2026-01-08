// 🔐 Service d'authentification robuste - Protection contre otp_expired
// ================================================================

import { supabase } from '../lib/supabase';
import { createAndSendConfirmation } from './customEmailConfirmation';

interface UserData {
  name?: string;
  firstName?: string;
  lastName?: string;
  [key: string]: any;
}

interface AuthResult {
  data: any;
  error: { message: string; type: string } | null;
}

const resolveVerificationMode = (): 'n8n' | 'supabase' | 'custom' => {
  const rawValue = (import.meta.env?.VITE_EMAIL_VERIFICATION_MODE || '').toString().toLowerCase();
  if (rawValue === 'n8n' || rawValue === 'webhook') return 'n8n';
  if (rawValue === 'supabase' || rawValue === 'native') return 'supabase';
  return 'custom';
};

// ==========================================
// 1. INSCRIPTION ROBUSTE AVEC PROTECTION ANTI-EXPIRATION
// ==========================================

export const signUpWithRobustEmail = async (
  email: string,
  password: string,
  userData: UserData = {}
): Promise<AuthResult> => {
  try {
    // Normaliser l'email (éviter les erreurs de casse)
    const normalizedEmail = email.toLowerCase().trim();
    const verificationMode = resolveVerificationMode();
    const verificationMethod =
      verificationMode === 'n8n'
        ? 'n8n_code'
        : verificationMode === 'supabase'
          ? 'supabase_email'
          : 'custom_email';

    // ⚡ CRITIQUE : Configuration pour EMPÊCHER la création de session automatique
    // On utilise emailRedirectTo avec une valeur pour forcer Supabase à NE PAS créer de session
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        // 🔒 CLEF : emailRedirectTo force Supabase à NE PAS créer de session automatique
        // L'utilisateur doit obligatoirement cliquer sur le lien d'email pour se connecter
        emailRedirectTo: `${window.location.origin}/auth/confirm-email`,
        captchaToken: undefined,

        // 📊 Métadonnées enrichies pour système hybride
        data: {
          signup_time: new Date().toISOString(),
          user_agent: typeof navigator !== 'undefined'
            ? navigator.userAgent.substring(0, 100)
            : 'unknown',
          signup_source: 'web',
          verification_method: verificationMethod,
          ...userData
        }
      }
    });

    if (error) {
      console.error('❌ Erreur signup Supabase:', error);
      return {
        data: null,
        error: {
          message: error.message,
          type: error.name || 'AuthError'
        }
      };
    }

    console.log('📩 Inscription réussie, en attente de validation email', {
      user: data.user?.id,
      email: normalizedEmail,
      verificationMode,
      hasSession: !!data.session,
      emailConfirmedAt: data.user?.email_confirmed_at
    });

    if (!data.user?.id) {
      console.error('❌ Inscription Supabase: utilisateur manquant');
      return {
        data: null,
        error: {
          message: 'Utilisateur non créé',
          type: 'AuthError'
        }
      };
    }

    // ⚠️ VÉRIFICATION CRITIQUE : Une session NE DOIT PAS être créée
    if (data.session) {
      console.warn('⚠️ ATTENTION : Une session a été créée malgré emailRedirectTo - cela ne devrait pas arriver !');
      console.warn('🚫 Accès dashboard bloqué sans validation');
    } else {
      console.log('✅ Aucune session créée - comportement attendu');
      console.log('🚫 Accès dashboard bloqué sans validation');
    }

    // 🚀 Déclencher l'envoi du lien de vérification selon le mode choisi
    try {
      if (verificationMode === 'n8n') {
        console.log('📧 Déclenchement envoi lien de vérification via n8n pour:', normalizedEmail);
        const n8nResponse = await fetch('https://n8n.srv886297.hstgr.cloud/webhook/send-verification-link', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_N8N_WEBHOOK_TOKEN || ''}`,
            'X-Source': 'centrinote-link-verification'
          },
          body: JSON.stringify({
            email: normalizedEmail,
            user_id: data.user.id,
            action: 'signup',
            timestamp: new Date().toISOString(),
            domain: window.location.origin
          })
        });

        if (!n8nResponse.ok) {
          let errorDetail = `Status ${n8nResponse.status}`;
          try {
            const errorData = await n8nResponse.json();
            errorDetail = errorData.message || errorDetail;
          } catch {
            // Ignorer si pas de JSON
          }
          
          console.warn('⚠️ Erreur n8n (non bloquante):', errorDetail);
        } else {
          const n8nData = await n8nResponse.json();
          console.log('✅ Email de confirmation envoyé via n8n');
        }
      } else if (verificationMode === 'supabase') {
        console.log('📧 Demande d\'email de vérification via Supabase:', normalizedEmail);
        const { error: resendError } = await supabase.auth.resend({
          type: 'signup',
          email: normalizedEmail,
          options: {
            emailRedirectTo: `${window.location.origin}/verify-email`
          }
        });

        if (resendError) {
          console.warn('⚠️ Erreur renvoi email Supabase (non bloquante):', resendError.message);
        } else {
          console.log('✅ Email de confirmation envoyé via Supabase');
        }
      } else {
        console.log('📧 Envoi de confirmation via flux interne (Edge Functions) pour:', normalizedEmail);
        const result = await createAndSendConfirmation(data.user.id, normalizedEmail);
        if (!result.success) {
          console.warn('⚠️ Échec envoi email personnalisé (non bloquant):', result.error);
        } else {
          console.log('✅ Email de confirmation envoyé via Edge Function');
        }
      }
    } catch (sendError) {
      console.warn('⚠️ Erreur lors de l\'envoi de l\'email de confirmation (non bloquant):', sendError);
    }

    return { 
      data: {
        ...data,
        requiresEmailVerification: true,
        verificationMethod,
        verificationMode
      }, 
      error: null 
    };

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

// 🆕 Nouvelle méthode : Confirmation via Edge Function custom
export const confirmEmailWithEdgeFunction = async (
  token: string
): Promise<AuthResult> => {
  try {
    console.log('🔍 Tentative confirmation via Edge Function:', {
      token: token?.substring(0, 16) + '...'
    });

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl) {
      throw new Error('VITE_SUPABASE_URL non défini');
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/confirm-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'apikey': supabaseAnonKey
      },
      body: JSON.stringify({ token })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
      const errorMessage = errorData.error || `HTTP ${response.status}`;

      console.error('❌ Erreur Edge Function:', errorMessage);

      // Détecter si c'est une expiration
      const isExpired = errorMessage.includes('expired') ||
                       errorMessage.includes('invalid') ||
                       errorMessage.includes('already used');

      return {
        data: null,
        error: {
          message: errorMessage,
          type: 'EdgeFunctionError',
          isExpired
        }
      };
    }

    const result = await response.json();

    if (!result.success) {
      return {
        data: null,
        error: {
          message: result.error || 'Confirmation échouée',
          type: 'EdgeFunctionError',
          isExpired: false
        }
      };
    }

    console.log('✅ Confirmation Edge Function réussie:', result.email);

    // Rafraîchir la session après confirmation
    const { data: sessionData, error: sessionError } = await supabase.auth.refreshSession();

    if (sessionError) {
      console.warn('⚠️ Impossible de rafraîchir la session:', sessionError);
    }

    return {
      data: {
        email: result.email,
        session: sessionData?.session,
        user: sessionData?.user
      },
      error: null
    };

  } catch (err) {
    console.error('❌ Erreur inattendue Edge Function:', err);
    return {
      data: null,
      error: {
        message: err instanceof Error ? err.message : 'Erreur de confirmation',
        type: 'NetworkError',
        isExpired: false
      }
    };
  }
};

// ⚠️ ANCIENNE MÉTHODE - Garde pour compatibilité avec OTP Supabase standard
export const confirmEmailWithToken = async (
  tokenHash: string,
  type: 'signup' | 'magiclink' | 'recovery' | 'email_change' = 'signup'
): Promise<AuthResult> => {
  try {
    console.log('🔍 Tentative confirmation automatique (Supabase OTP):', {
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

export const confirmEmailWithOTP = async (email: string, token: string): Promise<AuthResult> => {
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

export const resendConfirmationEmail = async (email: string): Promise<{ error: { message: string; type: string } | null }> => {
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

export const signInWithEmail = async (email: string, password: string): Promise<AuthResult> => {
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
  confirmEmailWithEdgeFunction,
  confirmEmailWithOTP,
  resendConfirmationEmail,
  signInWithEmail,
  signOut,
  getCurrentUser,
  getSession,
  onAuthStateChange,
  debugAuthState
};
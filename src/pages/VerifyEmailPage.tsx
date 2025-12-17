import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, XCircle, Loader, Mail } from 'lucide-react';
import { supabase } from '../lib/supabase';

type VerificationStatus = 'verifying' | 'success' | 'error' | 'expired';

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState<VerificationStatus>('verifying');
  const [message, setMessage] = useState('Vérification de votre email en cours...');

  useEffect(() => {
    // Supabase gère automatiquement la vérification du token via le hash de l'URL
    // On écoute juste les changements d'état d'authentification
    verifyEmailFromHash();
  }, [location, verifyEmailFromHash]);

  const verifyEmailFromHash = useCallback(async () => {
    try {
      console.log('🔍 Début de la vérification email...');

      // Vérifier s'il y a un hash de vérification dans l'URL
      const hashParams = new URLSearchParams(location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const type = hashParams.get('type');

      console.log('📧 Paramètres URL:', {
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        type: type
      });

      if (!accessToken) {
        console.error('❌ Pas de access_token dans l\'URL');
        setStatus('error');
        setMessage('Lien de vérification invalide ou expiré');
        return;
      }

      // Vérifier le type de vérification
      if (type !== 'signup' && type !== 'email' && type !== 'magiclink') {
        console.warn('⚠️ Type de vérification inconnu:', type);
      }

      // Supabase devrait avoir automatiquement établi la session avec le token
      // Récupérer l'utilisateur actuel pour vérifier
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      console.log('👤 Utilisateur récupéré:', {
        email: user?.email,
        email_confirmed_at: user?.email_confirmed_at,
        confirmed_at: user?.confirmed_at,
        error: userError
      });

      if (userError || !user) {
        console.error('❌ Erreur récupération utilisateur:', userError);
        setStatus('error');
        setMessage('Erreur lors de la vérification. Le lien est peut-être expiré.');
        return;
      }

      // Vérifier si l'email est confirmé
      if (user.email_confirmed_at) {
        console.log('✅ Email confirmé avec succès:', user.email);
        setStatus('success');
        setMessage('Email vérifié avec succès !');

        // Mettre à jour les métadonnées utilisateur pour tracking
        try {
          await supabase.auth.updateUser({
            data: {
              email_verified_at: user.email_confirmed_at,
              verification_method: 'supabase_email_link',
              verified_from_page: true
            }
          });
          console.log('✅ Métadonnées utilisateur mises à jour');
        } catch (metaError) {
          console.warn('⚠️ Erreur mise à jour métadonnées (non bloquant):', metaError);
        }

        // Créer le profil si nécessaire
        try {
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              id: user.id,
              email: user.email!,
              name: user.user_metadata?.name || user.email!.split('@')[0],
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'id'
            });

          if (profileError) {
            console.warn('⚠️ Erreur création/mise à jour profil (non bloquant):', profileError);
          } else {
            console.log('✅ Profil créé/mis à jour');
          }
        } catch (profileErr) {
          console.warn('⚠️ Erreur profil (non bloquant):', profileErr);
        }

        // Redirection automatique vers welcome page
        setTimeout(() => {
          console.log('🔄 Redirection vers /welcome...');
          navigate('/welcome?confirmed=true&email=' + encodeURIComponent(user.email || ''), {
            replace: true
          });
        }, 2000);
      } else {
        console.error('❌ L\'email n\'est pas marqué comme confirmé dans Supabase');
        console.error('❌ User object:', user);
        setStatus('error');
        setMessage('La vérification a échoué. Veuillez réessayer ou contacter le support.');
      }
    } catch (error) {
      console.error('❌ Erreur verifyEmailFromHash:', error);
      setStatus('error');
      setMessage('Erreur de réseau. Veuillez réessayer.');
    }
  }, [location, navigate]);

  const getStatusIcon = () => {
    switch (status) {
      case 'verifying':
        return <Loader className="animate-spin h-12 w-12 text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-12 w-12 text-green-500" />;
      case 'error':
      case 'expired':
        return <XCircle className="h-12 w-12 text-red-500" />;
      default:
        return <Mail className="h-12 w-12 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'verifying':
        return 'text-blue-600 dark:text-blue-400';
      case 'success':
        return 'text-green-600 dark:text-green-400';
      case 'error':
      case 'expired':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full text-center">
        
        {/* Icône de statut */}
        <div className="flex justify-center mb-8">
          {getStatusIcon()}
        </div>

        {/* Titre */}
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          {status === 'verifying' && 'Vérification en cours'}
          {status === 'success' && 'Email vérifié !'}
          {status === 'error' && 'Erreur de vérification'}
          {status === 'expired' && 'Lien expiré'}
        </h1>

        {/* Message */}
        <p className={`text-lg mb-8 ${getStatusColor()}`}>
          {message}
        </p>

        {/* Actions selon le statut */}
        {status === 'success' && (
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 mb-6">
            <p className="text-sm text-green-700 dark:text-green-300">
              Redirection vers votre page de bienvenue...
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <button
              onClick={() => navigate('/', { replace: true })}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retour à l'accueil
            </button>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Vous pouvez demander un nouveau lien de vérification depuis la page de connexion
            </p>
          </div>
        )}

        {status === 'verifying' && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Veuillez patienter pendant la vérification...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
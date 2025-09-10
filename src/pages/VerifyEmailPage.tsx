import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Loader, Mail } from 'lucide-react';
import { verifyEmailToken } from '../services/emailLinkVerificationService';
import { supabase } from '../lib/supabase';

type VerificationStatus = 'verifying' | 'success' | 'error' | 'expired';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<VerificationStatus>('verifying');
  const [message, setMessage] = useState('Vérification de votre email en cours...');

  useEffect(() => {
    const token = searchParams.get('token');
    const email = searchParams.get('email');

    if (!token || !email) {
      setStatus('error');
      setMessage('Lien de vérification invalide');
      return;
    }

    verifyEmail(token, email);
  }, [searchParams]);

  const verifyEmail = async (token: string, email: string) => {
    try {
      // 1. Appeler directement l'endpoint n8n qui gère HTML + redirection
      const response = await fetch(
        `${import.meta.env.VITE_N8N_BASE_URL || 'https://n8n.srv886297.hstgr.cloud'}/webhook/verify-email-token?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`
      );

      if (response.ok) {
        // 2. n8n a géré la vérification - mettre à jour Supabase
        try {
          const { error: updateError } = await supabase.auth.updateUser({
            data: {
              email_verified: true,
              verification_pending: false,
              email_verified_at: new Date().toISOString(),
              verification_method: 'email_link'
            }
          });

          if (updateError) {
            console.warn('Erreur mise à jour métadonnées:', updateError);
          }

          // 3. Rafraîchir la session
          await supabase.auth.refreshSession();

          setStatus('success');
          setMessage('Email vérifié avec succès !');

          // 4. Redirection automatique vers dashboard
          setTimeout(() => {
            navigate('/dashboard', { replace: true });
          }, 2000);

        } catch (metadataError) {
          // Même en cas d'erreur métadonnées, considérer comme succès
          setStatus('success');
          setMessage('Email vérifié ! Vous pouvez vous connecter.');
          setTimeout(() => navigate('/'), 2000);
        }
      } else {
        // n8n a retourné une erreur
        setStatus('error');
        if (response.status === 404) {
          setMessage('Lien de vérification invalide ou expiré');
        } else {
          setMessage('Erreur lors de la vérification');
        }
      }
    } catch (error) {
      setStatus('error');
      setMessage('Erreur de réseau. Veuillez réessayer.');
    }
  };

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
              Redirection automatique vers votre dashboard...
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
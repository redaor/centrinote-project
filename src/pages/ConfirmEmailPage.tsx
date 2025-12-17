/**
 * Page de confirmation d'email
 * Route: /confirm-email?token=...
 */

import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Status = 'verifying' | 'success' | 'error';

export default function ConfirmEmailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<Status>('verifying');
  const [message, setMessage] = useState('Vérification de votre email en cours...');
  const [email, setEmail] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setMessage('Lien de confirmation invalide. Aucun token fourni.');
      return;
    }

    verifyToken(token);
  }, [searchParams, verifyToken]);

  const verifyToken = useCallback(async (token: string) => {
    try {
      console.log('🔍 Vérification du token de confirmation...');

      const { data, error } = await supabase.functions.invoke('confirm-email', {
        body: { token }
      });

      if (error) {
        throw new Error(error.message || 'La vérification a échoué');
      }

      if (data?.success && data?.email) {
        setStatus('success');
        setEmail(data.email);
        setMessage('Votre email a été confirmé avec succès !');

        console.log('✅ Email confirmé:', data.email);

        // Redirection automatique vers /welcome après 2 secondes
        setTimeout(() => {
          navigate(`/welcome?confirmed=true&email=${encodeURIComponent(data.email!)}`, {
            replace: true
          });
        }, 2000);

        return;
      }

      throw new Error(data?.error || 'La vérification a échoué');
    } catch (error) {
      console.error('❌ Erreur vérification token:', error);
      setStatus('error');
      setMessage(
        error instanceof Error
          ? error.message
          : 'Une erreur est survenue lors de la vérification'
      );
    }
  }, [navigate]);

  const getIcon = () => {
    switch (status) {
      case 'verifying':
        return <Loader className="animate-spin h-16 w-16 text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-16 w-16 text-green-500" />;
      case 'error':
        return <XCircle className="h-16 w-16 text-red-500" />;
    }
  };

  const getTitle = () => {
    switch (status) {
      case 'verifying':
        return 'Vérification en cours...';
      case 'success':
        return 'Email vérifié !';
      case 'error':
        return 'Erreur de vérification';
    }
  };

  const getColorClass = () => {
    switch (status) {
      case 'verifying':
        return 'text-blue-600 dark:text-blue-400';
      case 'success':
        return 'text-green-600 dark:text-green-400';
      case 'error':
        return 'text-red-600 dark:text-red-400';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full text-center">
        {/* Icône de statut */}
        <div className="flex justify-center mb-8">
          {getIcon()}
        </div>

        {/* Titre */}
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          {getTitle()}
        </h1>

        {/* Message */}
        <p className={`text-lg mb-8 ${getColorClass()}`}>
          {message}
        </p>

        {/* Email confirmé */}
        {status === 'success' && email && (
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6 mb-6">
            <p className="text-sm text-green-700 dark:text-green-300 mb-2">
              Email confirmé avec succès :
            </p>
            <p className="text-base font-semibold text-green-800 dark:text-green-200">
              {email}
            </p>
            <p className="text-sm text-green-600 dark:text-green-400 mt-4">
              Redirection vers votre page de bienvenue...
            </p>
          </div>
        )}

        {/* Actions en cas d'erreur */}
        {status === 'error' && (
          <div className="space-y-4">
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-700 dark:text-red-300">
                Causes possibles :
              </p>
              <ul className="text-sm text-red-600 dark:text-red-400 mt-2 text-left list-disc list-inside">
                <li>Le lien a expiré (&gt; 24h)</li>
                <li>Le lien a déjà été utilisé</li>
                <li>Le lien est invalide</li>
              </ul>
            </div>

            <button
              onClick={() => navigate('/auth')}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Retour à la connexion
            </button>

            <p className="text-sm text-gray-500 dark:text-gray-400">
              Vous pouvez demander un nouveau lien de confirmation depuis la page de connexion
            </p>
          </div>
        )}

        {/* Loader pendant la vérification */}
        {status === 'verifying' && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Veuillez patienter pendant la vérification de votre email...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

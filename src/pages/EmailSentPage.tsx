import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, RefreshCw, ArrowLeft } from 'lucide-react';
import { sendVerificationLink } from '../services/emailLinkVerificationService';

interface EmailSentState {
  email?: string;
  userId?: string;
}

export default function EmailSentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as EmailSentState;
  
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  const email = state?.email || '';
  const userId = state?.userId || '';

  const handleResendEmail = async () => {
    if (!email || !userId) {
      setResendMessage('Erreur: informations manquantes');
      return;
    }

    setResending(true);
    setResendMessage('');

    try {
      const result = await sendVerificationLink(email, userId, 'resend');
      
      if (result.success) {
        setResendMessage('✅ Nouvel email envoyé !');
      } else {
        setResendMessage(result.error || '❌ Erreur lors du renvoi');
      }
    } catch (error) {
      setResendMessage('❌ Erreur de réseau');
    } finally {
      setResending(false);
      
      // Clear message après 5 secondes
      setTimeout(() => setResendMessage(''), 5000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full text-center">
        
        {/* Icône email */}
        <div className="flex justify-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
            <Mail className="w-10 h-10 text-white" />
          </div>
        </div>

        {/* Titre */}
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Vérifiez votre boîte email
        </h1>

        {/* Description */}
        <div className="text-gray-600 dark:text-gray-400 mb-8 space-y-2">
          <p>
            Nous avons envoyé un lien de vérification à :
          </p>
          <p className="font-semibold text-blue-600 dark:text-blue-400 break-all">
            {email || 'votre adresse email'}
          </p>
          <p className="text-sm">
            Cliquez sur le lien dans l'email pour confirmer votre compte.
          </p>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            Instructions :
          </h3>
          <ol className="text-sm text-blue-800 dark:text-blue-200 text-left space-y-1">
            <li>1. Consultez votre boîte de réception</li>
            <li>2. Cliquez sur le lien de vérification</li>
            <li>3. Vous serez automatiquement connecté</li>
          </ol>
        </div>

        {/* Message de renvoi */}
        {resendMessage && (
          <div className={`mb-4 p-3 rounded-lg ${
            resendMessage.includes('✅') 
              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
              : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
          }`}>
            {resendMessage}
          </div>
        )}

        {/* Actions */}
        <div className="space-y-4">
          {/* Bouton renvoyer */}
          <button
            onClick={handleResendEmail}
            disabled={resending || !email || !userId}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            {resending ? (
              <>
                <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                Renvoi en cours...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Renvoyer l'email
              </>
            )}
          </button>

          {/* Bouton retour */}
          <button
            onClick={() => navigate('/', { replace: true })}
            className="w-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 py-3 px-6 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center justify-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour à l'accueil
          </button>
        </div>

        {/* Note spam */}
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-6">
          💡 Astuce : Vérifiez aussi votre dossier spam/courrier indésirable
        </p>
      </div>
    </div>
  );
}
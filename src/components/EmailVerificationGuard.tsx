import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabaseAuth } from '../hooks/useSupabaseAuth';
import EmailVerificationForm from './EmailVerificationForm';

interface EmailVerificationGuardProps {
  children: React.ReactNode;
}

export default function EmailVerificationGuard({ children }: EmailVerificationGuardProps) {
  const { user, loading, needsEmailVerification } = useSupabaseAuth();
  const navigate = useNavigate();

  // Afficher loader pendant la vérification
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Vérification en cours...</p>
        </div>
      </div>
    );
  }

  // Si utilisateur connecté mais email non vérifié, afficher le formulaire de vérification
  if (needsEmailVerification && user === null) {
    console.log('🔒 Redirection vers vérification email obligatoire');
    
    return (
      <EmailVerificationForm
        email="" // Email sera récupéré depuis la session
        userId={null}
        onVerificationSuccess={() => {
          console.log('✅ Vérification terminée, rechargement...');
          window.location.reload(); // Forcer le rechargement pour mettre à jour la session
        }}
        onBack={() => {
          console.log('🔄 Retour à la connexion');
          navigate('/auth');
        }}
        isRequired={true} // Marquer comme obligatoire
      />
    );
  }

  // Si tout est OK, afficher le contenu
  return <>{children}</>;
}
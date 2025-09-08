import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthProvider';
import { useSupabaseAuth } from '../../hooks/useSupabaseAuth';
import EmailVerificationForm from '../EmailVerificationForm';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, signOut } = useAuth();
  const { needsEmailVerification } = useSupabaseAuth();
  const navigate = useNavigate();
  const [bypassVerification, setBypassVerification] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  // 🔒 Si l'utilisateur est connecté mais email non vérifié, bloquer l'accès
  // SAUF si bypass activé
  if (needsEmailVerification && !bypassVerification) {
    console.log('🔒 Accès bloqué - vérification email requise');
    return (
      <EmailVerificationForm
        email="" // Sera récupéré automatiquement depuis la session
        userId={null}
        onVerificationSuccess={() => {
          console.log('✅ Vérification terminée, rechargement...');
          // Utiliser React Router au lieu de window.location
          window.location.reload(); // Garder le reload pour rafraîchir la session
        }}
        onBack={() => {
          console.log('🔄 Retour demandé par l\'utilisateur');
          handleBackNavigation();
        }}
        onSkip={() => {
          console.log('⏭️ Vérification ignorée temporairement');
          setBypassVerification(true);
        }}
        isRequired={true}
      />
    );
  }

  // Fonction pour gérer le retour
  const handleBackNavigation = () => {
    console.log('🔄 Demande de retour - déconnexion et navigation vers accueil');
    signOut().then(() => {
      navigate('/', { replace: true });
    }).catch(error => {
      console.error('❌ Erreur lors de la déconnexion:', error);
      // En cas d'erreur, navigation forcée
      navigate('/', { replace: true });
    });
  };

  return <>{children}</>;
}
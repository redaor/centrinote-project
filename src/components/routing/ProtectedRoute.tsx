import React, { useState, useCallback } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthProvider';
import { useSupabaseAuth } from '../../hooks/useSupabaseAuth';
import EmailVerificationForm from '../EmailVerificationForm';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, signOut } = useAuth();
  const { needsEmailVerification, clearEmailVerificationRequirement } = useSupabaseAuth();
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

  // Si l'utilisateur est connecté mais email non vérifié, bloquer l'accès
  if (needsEmailVerification && !bypassVerification) {
    return (
      <EmailVerificationForm
        email=""
        userId={null}
        onVerificationSuccess={() => {
          setBypassVerification(true);
        }}
        onBack={handleBackNavigation}
        isRequired={true}
      />
    );
  }

  // Fonction pour gérer le retour élégant
  const handleBackNavigation = useCallback(async () => {
    try {
      // Clear les états de vérification
      setBypassVerification(true);
      clearEmailVerificationRequirement();
      
      // Déconnexion propre
      await signOut();
      
      // Navigation vers l'accueil
      navigate('/', { replace: true });
    } catch (error) {
      // En cas d'erreur, navigation quand même
      navigate('/', { replace: true });
    }
  }, [signOut, navigate, clearEmailVerificationRequirement, setBypassVerification]);

  return <>{children}</>;
}
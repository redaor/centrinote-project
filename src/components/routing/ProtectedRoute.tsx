import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../AuthProvider';
import { useSupabaseAuth } from '../../hooks/useSupabaseAuth';
import EmailVerificationForm from '../EmailVerificationForm';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const { needsEmailVerification } = useSupabaseAuth();

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
  if (needsEmailVerification) {
    console.log('🔒 Accès bloqué - vérification email requise');
    return (
      <EmailVerificationForm
        email="" // Sera récupéré automatiquement depuis la session
        userId={null}
        onVerificationSuccess={() => {
          console.log('✅ Vérification terminée, rechargement...');
          window.location.reload(); // Recharger pour mettre à jour la session
        }}
        onBack={() => {
          console.log('🔄 Retour à la connexion');
          window.location.href = '/'; // Retour à l'accueil
        }}
        isRequired={true}
      />
    );
  }

  return <>{children}</>;
}
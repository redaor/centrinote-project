import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../AuthProvider';
import { useSupabaseAuth } from '../../hooks/useSupabaseAuth';
// Plus de composant de vérification - redirection simple

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const { needsEmailVerification } = useSupabaseAuth();

  // 🔍 TRACE: État ProtectedRoute
  console.log('🛡️ [PROTECTED-ROUTE] Vérification accès:', {
    timestamp: new Date().toISOString(),
    pathname: window.location.pathname,
    hasUser: !!user,
    userEmail: user?.email,
    loading,
    needsEmailVerification,
    willRedirect: loading || !user || needsEmailVerification
  });

  if (loading) {
    console.log('⏳ [PROTECTED-ROUTE] En cours de chargement...');
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
    console.log('🚫 [PROTECTED-ROUTE] Pas d\'utilisateur - redirection vers /');
    return <Navigate to="/" replace />;
  }

  // Si l'utilisateur est connecté mais email non vérifié, rediriger vers accueil
  if (needsEmailVerification) {
    console.log('📧 [PROTECTED-ROUTE] Email non vérifié - redirection vers /');
    return <Navigate to="/" replace />;
  }

  console.log('✅ [PROTECTED-ROUTE] Accès autorisé - render children');
  return <>{children}</>;
}
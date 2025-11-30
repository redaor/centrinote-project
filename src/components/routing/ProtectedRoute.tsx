import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../AuthProvider';
import { useSupabaseAuth } from '../../hooks/useSupabaseAuth';
import { logger } from '../../utils/logger';
// Plus de composant de vérification - redirection simple

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const { needsEmailVerification } = useSupabaseAuth();

  // 🔍 TRACE: État ProtectedRoute
  logger.debug('Vérification accès route protégée', {
    pathname: window.location.pathname,
    hasUser: !!user,
    loading,
    needsEmailVerification,
    willRedirect: loading || !user || needsEmailVerification
  });

  if (loading) {
    logger.debug('Route protégée - En cours de chargement');
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
    logger.debug('Route protégée - Pas d\'utilisateur, redirection');
    return <Navigate to="/" replace />;
  }

  // Si l'utilisateur est connecté mais email non vérifié, rediriger vers accueil
  if (needsEmailVerification) {
    logger.debug('Route protégée - Email non vérifié, redirection');
    return <Navigate to="/" replace />;
  }

  logger.debug('Route protégée - Accès autorisé');
  return <>{children}</>;
}
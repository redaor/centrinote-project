import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../AuthProvider';
import { LandingPage } from '../landing/LandingPage';
import { PrivacyPolicy } from '../legal/PrivacyPolicy';
import { TermsOfService } from '../legal/TermsOfService';
import { LegalMentions } from '../legal/LegalMentions';
import { FAQ } from '../legal/FAQ';
import { Support } from '../legal/Support';
import AuthForm from '../AuthForm';
import { AppLayout } from '../layout/AppLayout';
import { ProtectedRoute } from './ProtectedRoute';
import ZoomOAuthCallback from '../../pages/ZoomOAuthCallback';
import ZoomManagerSimple from '../zoom/ZoomManagerSimple';

export function AppRouter() {
  const { user, loading } = useAuth();
  const [showAuthForm, setShowAuthForm] = React.useState(false);

  // Debug de l'état d'authentification
  React.useEffect(() => {
    console.log('🔍 État d\'authentification:', { user: !!user, loading });
    
    // Si l'utilisateur vient de se connecter et qu'on affiche le formulaire, le cacher
    if (user && showAuthForm) {
      console.log('✅ Utilisateur connecté détecté, fermeture du formulaire');
      setShowAuthForm(false);
    }
  }, [user, loading]);

  // Fonction pour gérer l'affichage du formulaire d'authentification
  const handleGetStarted = () => {
    console.log('🔄 Clic sur Se connecter - affichage du formulaire');
    console.log('📍 État actuel - user:', !!user, 'showAuthForm:', showAuthForm);
    setShowAuthForm(true);
  };

  // Fonction pour fermer le formulaire d'authentification
  const handleCloseAuth = () => {
    console.log('🔄 Fermeture du formulaire d\'authentification');
    setShowAuthForm(false);
  };
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Vérification de l'authentification...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Landing Page pour les utilisateurs non connectés */}
        <Route 
          path="/" 
          element={
            user ? (
              // Si utilisateur connecté, rediriger vers dashboard
              <Navigate to="/dashboard" replace />
            ) : (
              // Si pas connecté, afficher landing page ou formulaire d'auth
              showAuthForm ? (
                <AuthForm />
              ) : (
                <LandingPage onGetStarted={handleGetStarted} />
              )
            )
          } 
        />
        
        {/* Route pour le formulaire d'authentification */}
        <Route 
          path="/auth" 
          element={
            user ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <AuthForm />
            )
          } 
        />
        
        {/* Pages légales publiques */}
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-of-service" element={<TermsOfService />} />
        <Route path="/legal-mentions" element={<LegalMentions />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/support" element={<Support />} />
        
        {/* Routes protégées pour les utilisateurs connectés */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/notes" 
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/vocabulary" 
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/collaboration" 
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/zoom" 
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/search" 
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/planning" 
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/automation" 
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/settings" 
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/help" 
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          } 
        />

        {/* Route spéciale pour callback OAuth Zoom */}
        <Route 
          path="/zoom-callback" 
          element={<ZoomOAuthCallback />} 
        />

        {/* Route standalone pour gestionnaire Zoom */}
        <Route 
          path="/zoom-manager" 
          element={
            <ProtectedRoute>
              <ZoomManagerSimple />
            </ProtectedRoute>
          } 
        />

        {/* Redirection par défaut */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
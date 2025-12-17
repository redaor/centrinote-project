import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigationType } from 'react-router-dom';
import { AppProvider } from '../../contexts/AppContext';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { MeetingsProvider } from '../../hooks/useMeetings';

// 🔬 DEBUG: Page de diagnostic Settings + IA
import SettingsIADiagnostic from '../../debug/SettingsIA-Diagnostic';

// Composant pour tracer les changements de location
function RouterLocationDebug() {
  const location = useLocation();
  const navigationType = useNavigationType();

  React.useEffect(() => {
    logger.debug('Location changed', {
      timestamp: new Date().toISOString(),
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
      state: location.state,
      navigationType
    });
  }, [location, navigationType]);

  return null;
}
import { useAuth } from '../AuthProvider';
import { logger } from '../../utils/logger';
import { LandingPage } from '../landing/LandingPage';
import { PrivacyPolicy } from '../legal/PrivacyPolicy';
import { TermsOfService } from '../legal/TermsOfService';
import { LegalMentions } from '../legal/LegalMentions';
import { FAQ } from '../legal/FAQ';
import { Support } from '../legal/Support';
import AuthForm from '../AuthForm';
import { AppLayout } from '../layout/AppLayout';
import { MeetingRoom } from '../meetings/MeetingRoom';
import { ProtectedRoute } from './ProtectedRoute';
import VerifyEmailPage from '../../pages/VerifyEmailPage';
import EmailSentPage from '../../pages/EmailSentPage';
import WelcomePage from '../../pages/WelcomePage';
import ConfirmEmailPage from '../../pages/ConfirmEmailPage';
import ResetPasswordPage from '../../pages/ResetPasswordPage';
import AuthConfirm from '../../pages/AuthConfirm';
import { ForumPage } from '../../pages/ForumPage';
import { ForumPostDetailPage } from '../../pages/ForumPostDetailPage';
import { GuidePage } from '../../pages/GuidePage';
import { LaunchPage } from '../../pages/LaunchPage';

// Composant pour rediriger /register vers /auth avec le paramètre plan
// Si l'utilisateur est déjà connecté, rediriger vers /plan avec le plan
function RegisterRedirect() {
  const location = useLocation();
  const { user } = useAuth();
  const searchParams = new URLSearchParams(location.search);
  const plan = searchParams.get('plan') || '';
  
  React.useEffect(() => {
    // Si l'utilisateur est connecté et qu'un plan est spécifié, rediriger vers /plan
    if (user && plan && ['starter', 'pro', 'teams'].includes(plan)) {
      // Rediriger vers /plan avec le plan en paramètre
      // Le composant PlanPage gérera le checkout
      window.location.href = `/plan?plan=${plan}`;
    }
  }, [user, plan]);
  
  // Rediriger vers /auth avec le paramètre plan
  const authUrl = plan ? `/auth?plan=${plan}` : '/auth';
  return <Navigate to={authUrl} replace />;
}

export function AppRouter() {
  const { user, loading } = useAuth();
  const [showAuthForm, setShowAuthForm] = React.useState(false);

  // Debug de l'état d'authentification
  React.useEffect(() => {
    logger.debug('État d\'authentification', { hasUser: !!user, loading });
    
    // Si l'utilisateur vient de se connecter et qu'on affiche le formulaire, le cacher
    if (user && showAuthForm) {
      logger.debug('Utilisateur connecté détecté, fermeture du formulaire');
      setShowAuthForm(false);
    }
  }, [user, loading, showAuthForm]);

  // Fonction pour gérer l'affichage du formulaire d'authentification
  const handleGetStarted = () => {
    logger.debug('Clic sur Se connecter - affichage du formulaire', { hasUser: !!user, showAuthForm });
    setShowAuthForm(true);
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
      {/* ROUTER DEBUG: Tracer changement de location */}
      <RouterLocationDebug />
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
        
        {/* Route /register - Redirige vers /auth avec le paramètre plan */}
        <Route 
          path="/register" 
          element={
            <RegisterRedirect />
          } 
        />
        
        {/* Pages de vérification email et bienvenue */}
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/confirm-email" element={<ConfirmEmailPage />} />
        <Route path="/email-sent" element={<EmailSentPage />} />
        <Route path="/welcome" element={<WelcomePage />} />
        
        {/* Page de réinitialisation du mot de passe */}
        <Route path="/auth/reset-mot-de-passe" element={<ResetPasswordPage />} />
        
        {/* Page de confirmation du lien magique */}
        <Route path="/auth/confirm" element={<AuthConfirm />} />
        
        {/* Pages légales publiques */}
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-of-service" element={<TermsOfService />} />
        <Route path="/legal-mentions" element={<LegalMentions />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/support" element={<Support />} />

        {/* Forum - Accessible à tous (lecture publique, écriture si connecté) */}
        <Route path="/forum" element={<ForumPage />} />
        <Route path="/forum/:id" element={<ForumPostDetailPage />} />

        {/* Guide utilisateur - Page publique */}
        <Route path="/guide" element={<GuidePage />} />

        {/* Page de lancement CentriNote - Gérée par Netlify redirect vers /launch.html */}

        {/* Route de diagnostic Settings + IA - DEV ONLY */}
        <Route path="/debug/settings-ia" element={<SettingsIADiagnostic />} />
        
        {/* Page de démo Ghost-Text */}
        <Route 
          path="/ghost-text-demo" 
          element={
            <ProtectedRoute>
              <AppProvider>
                <MeetingsProvider>
                  <LanguageProvider>
                    <AppLayout />
                  </LanguageProvider>
                </MeetingsProvider>
              </AppProvider>
            </ProtectedRoute>
          } 
        />
        
        {/* Routes protégées pour les utilisateurs connectés - AVEC PROVIDERS */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <AppProvider>
                <MeetingsProvider>
                  <LanguageProvider>
                    <AppLayout />
                  </LanguageProvider>
                </MeetingsProvider>
              </AppProvider>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/notes" 
          element={
            <ProtectedRoute>
              <AppProvider>
                <MeetingsProvider>
                  <LanguageProvider>
                    <AppLayout />
                  </LanguageProvider>
                </MeetingsProvider>
              </AppProvider>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/vocabulary" 
          element={
            <ProtectedRoute>
              <AppProvider>
                <MeetingsProvider>
                  <LanguageProvider>
                    <AppLayout />
                  </LanguageProvider>
                </MeetingsProvider>
              </AppProvider>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/meetings" 
          element={
            <ProtectedRoute>
              <AppProvider>
                <MeetingsProvider>
                  <LanguageProvider>
                    <AppLayout />
                  </LanguageProvider>
                </MeetingsProvider>
              </AppProvider>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/meetings/new" 
          element={
            <ProtectedRoute>
              <AppProvider>
                <MeetingsProvider>
                  <LanguageProvider>
                    <AppLayout />
                  </LanguageProvider>
                </MeetingsProvider>
              </AppProvider>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/meetings/settings" 
          element={
            <ProtectedRoute>
              <AppProvider>
                <LanguageProvider>
                  <AppLayout />
                </LanguageProvider>
              </AppProvider>
            </ProtectedRoute>
          } 
        />
        
        {/* Route standalone pour salle de réunion - Avec MeetingsProvider */}
        <Route
          path="/meeting/:id"
          element={
            <ProtectedRoute>
              <AppProvider>
                <MeetingsProvider>
                  <MeetingRoom />
                </MeetingsProvider>
              </AppProvider>
            </ProtectedRoute>
          }
        />

        {/* Route pour le résumé d'une réunion */}
        <Route 
          path="/meetings/:id/summary" 
          element={
            <ProtectedRoute>
              <AppProvider>
                <LanguageProvider>
                  <AppLayout />
                </LanguageProvider>
              </AppProvider>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/search" 
          element={
            <ProtectedRoute>
              <AppProvider>
                <LanguageProvider>
                  <AppLayout />
                </LanguageProvider>
              </AppProvider>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/plan" 
          element={
            <ProtectedRoute>
              <AppProvider>
                <LanguageProvider>
                  <AppLayout />
                </LanguageProvider>
              </AppProvider>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/planning" 
          element={
            <ProtectedRoute>
              <AppProvider>
                <LanguageProvider>
                  <AppLayout />
                </LanguageProvider>
              </AppProvider>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/automation" 
          element={
            <ProtectedRoute>
              <AppProvider>
                <LanguageProvider>
                  <AppLayout />
                </LanguageProvider>
              </AppProvider>
            </ProtectedRoute>
          } 
        />
        
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <AppProvider>
                <LanguageProvider>
                  <AppLayout />
                </LanguageProvider>
              </AppProvider>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/help"
          element={
            <ProtectedRoute>
              <AppProvider>
                <LanguageProvider>
                  <AppLayout />
                </LanguageProvider>
              </AppProvider>
            </ProtectedRoute>
          }
        />

        {/* Route Admin - Messages de support */}
        <Route
          path="/admin/support"
          element={
            <ProtectedRoute>
              <AppProvider>
                <LanguageProvider>
                  <AppLayout />
                </LanguageProvider>
              </AppProvider>
            </ProtectedRoute>
          }
        />

        {/* Redirection par défaut */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
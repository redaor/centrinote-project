import { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { signUpWithRobustEmail } from '../services/authService';
import { AlertCircle, Mail, Lock, Eye, EyeOff, Loader, ArrowRight } from 'lucide-react';
import { sendVerificationLink } from '../services/emailLinkVerificationService';

export default function AuthForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Plus besoin d'états pour l'ancien système de vérification

  // Fonction pour retourner à la landing page
  const handleBackToLanding = () => {
    console.log('🔄 Retour à la landing page');
    // Utiliser window.location pour forcer le rechargement complet
    window.location.href = '/';
  };

  // Gérer l'envoi du lien de vérification
  const handleSendVerificationLink = useCallback(async (userEmail: string, userId: string) => {
    try {
      const result = await sendVerificationLink(userEmail, userId, 'signup');
      
      if (result.success) {
        // Rediriger vers page d'email envoyé
        navigate('/email-sent', { 
          state: { 
            email: userEmail, 
            userId: userId 
          },
          replace: true 
        });
      } else {
        setError(result.error || 'Erreur lors de l\'envoi de l\'email');
      }
    } catch (error) {
      setError('Erreur lors de l\'envoi de l\'email de vérification');
    }
  }, [navigate]);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log(`🔄 Tentative de ${mode === 'login' ? 'connexion' : 'inscription'} avec:`, email);
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const isLogin = mode === 'login';
      if (isLogin) {
        console.log('🔄 Tentative de connexion pour:', email);
        
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) {
          throw error;
        }
        
        console.log('✅ Connexion réussie:', data.user?.email);
        navigate('/dashboard');
      } else {
        console.log('🔄 Tentative d\'inscription hybride pour:', email);
        
        // 🚀 NOUVEAU : Utiliser le service hybride Supabase + n8n
        const result = await signUpWithRobustEmail(email, password, {
          name: email.split('@')[0] // Nom par défaut basé sur email
        });
        
        if (result.error) {
          throw new Error(result.error.message);
        }
        
        console.log('✅ Inscription hybride réussie:', {
          userId: result.data?.user?.id,
          email,
          requiresVerification: result.data?.requiresEmailVerification
        });
        
        // Vérifier si vérification email requise
        if (result.data?.requiresEmailVerification) {
          // Envoyer le lien de vérification via n8n
          setSuccess('Inscription réussie ! Envoi de l\'email...');
          await handleSendVerificationLink(email, result.data.user?.id || '');
        } else {
          // Connexion directe si pas de vérification nécessaire
          navigate('/dashboard');
        }
      }
    } catch (err) {
      console.error('❌ Erreur d\'authentification:', err);
      setError(err instanceof Error ? err.message : 'Erreur d\'authentification');
    } finally {
      setLoading(false);
    }
  };

  // Plus besoin d'affichage conditionnel - redirection directe vers /email-sent

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo et titre */}
        <div className="text-center">
          <button
            onClick={handleBackToLanding}
            className="mb-4 text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            ← Retour à l'accueil
          </button>
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-teal-500 rounded-2xl flex items-center justify-center mx-auto">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
            {mode === 'login' ? 'Connexion' : 'Créer un compte'}
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {mode === 'login' 
              ? 'Accédez à votre espace personnel' 
              : 'Rejoignez Centrinote pour organiser vos connaissances'}
          </p>
        </div>

        {/* Formulaire */}
        <div className="mt-8 bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start">
              <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400 mr-3 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <p className="text-sm text-green-700 dark:text-green-300">{success}</p>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Adresse email
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="vous@exemple.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Mot de passe
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={mode === 'login' ? "current-password" : "new-password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder={mode === 'login' ? "Votre mot de passe" : "Créez un mot de passe"}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {mode === 'signup' && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Minimum 6 caractères
                </p>
              )}
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-teal-500 hover:from-blue-600 hover:to-teal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader className="animate-spin h-5 w-5" />
                ) : (
                  <>
                    {mode === 'login' ? 'Se connecter' : 'Créer un compte'}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                  ou
                </span>
              </div>
            </div>

            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  setMode(mode === 'login' ? 'signup' : 'login');
                  setError(null);
                  setSuccess(null);
                }}
                className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
              >
                {mode === 'login' ? "Créer un nouveau compte" : "Déjà un compte ? Se connecter"}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500 dark:text-gray-400">
          <p>
            En vous connectant, vous acceptez nos{' '}
            <Link to="/terms-of-service" className="text-blue-600 dark:text-blue-400 hover:underline">
              Conditions d'utilisation
            </Link>{' '}
            et notre{' '}
            <Link to="/privacy-policy" className="text-blue-600 dark:text-blue-400 hover:underline">
              Politique de confidentialité
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
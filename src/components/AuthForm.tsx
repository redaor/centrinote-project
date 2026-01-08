import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';
import { AlertCircle, Mail, Lock, Eye, EyeOff, Loader, ArrowRight, User } from 'lucide-react';
import { ForgotPasswordModal } from './auth/ForgotPasswordModal';

export default function AuthForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'password' | 'magic-link'>('password');

  // Fonction pour retourner à la landing page
  const handleBackToLanding = () => {
    logger.debug('Retour à la landing page');
    // Utiliser window.location pour forcer le rechargement complet
    window.location.href = '/';
  };
  // Handler pour le lien magique
  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    logger.info('Envoi lien magique', { email: '[REDACTED]' });
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { error: magicError } = await supabase.auth.signInWithOtp({
        email: email.toLowerCase().trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
        },
      });

      if (magicError) {
        let errorMessage = 'Erreur lors de l\'envoi du lien magique';
        
        if (magicError.message.includes('rate limit') || magicError.message.includes('too many')) {
          errorMessage = '⚠️ Trop de tentatives. Veuillez patienter quelques minutes avant de réessayer.';
        } else if (magicError.message.includes('email') || magicError.message.includes('invalid')) {
          errorMessage = '⚠️ Adresse email invalide.';
        } else {
          errorMessage = magicError.message;
        }
        
        throw new Error(errorMessage);
      }

      setSuccess(`Un lien de connexion a été envoyé à ${email}. Vérifiez votre boîte de réception (et vos spams).`);
    } catch (err) {
      logger.error('Erreur lien magique', err instanceof Error ? err : new Error(String(err)));
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    logger.debug(`Tentative de ${mode === 'login' ? 'connexion' : 'inscription'}`);
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const isLogin = mode === 'login';
      if (isLogin) {
        logger.debug('Tentative de connexion');

        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          logger.error('Erreur de connexion', new Error(error.message), {
            status: error.status,
          });
          
          // Note: On ne peut pas vérifier de manière fiable si un compte existe dans auth.users
          // sans être authentifié (pour des raisons de sécurité). La vérification dans profiles
          // peut échouer à cause des RLS si l'utilisateur n'est pas connecté.
          // Donc on ne fait plus de détection automatique de "compte inexistant".
          // L'utilisateur verra simplement "Email ou mot de passe incorrect" et pourra
          // décider de créer un compte s'il le souhaite.
          
          throw error;
        }

        // Vérifier si l'email est confirmé
        if (data.user && !data.user.email_confirmed_at) {
          logger.warn('Utilisateur connecté mais email non confirmé', {
            email: data.user.email,
            email_confirmed_at: data.user.email_confirmed_at,
            confirmed_at: data.user.confirmed_at,
            metadata: data.user.user_metadata
          });

          // Déconnecter l'utilisateur
          await supabase.auth.signOut();

          // Afficher un message personnalisé
          throw new Error('Email not confirmed');
        }

        logger.info('Connexion réussie');
        navigate('/dashboard');
      } else {
        logger.debug('🚀 Tentative d\'inscription via Edge Function create-user');

        // Construire le nom complet à partir du prénom et nom
        const fullName = `${firstName.trim()} ${lastName.trim()}`.trim() || email.split('@')[0];

        // 🔴 Appeler l'Edge Function au lieu de signUpWithRobustEmail()
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        const response = await fetch(`${supabaseUrl}/functions/v1/create-user`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'apikey': supabaseAnonKey,
          },
          body: JSON.stringify({
            email: email.toLowerCase().trim(),
            password,
            name: fullName,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
          }),
        });

        const result = await response.json();

        if (result.error || !response.ok) {
          logger.error('❌ Erreur Edge Function create-user:', result.error);
          throw new Error(result.error?.message || 'Erreur lors de la création du compte');
        }

        const createdUserId = result.user?.id;

        if (!createdUserId) {
          throw new Error('Erreur lors de la création du compte');
        }

        logger.info('✅ Inscription réussie via Edge Function', {
          userId: createdUserId,
          email: result.user.email,
          hasSession: result.hasSession, // Devrait être false
          emailSent: result.emailSent,
          emailConfirmedAt: result.user.email_confirmed_at // Devrait être null
        });

        // 📩 Log explicite pour vérifier le comportement
        if (result.hasSession) {
          logger.warn('⚠️ ATTENTION : Une session a été créée alors qu\'elle ne devrait pas !');
        } else {
          logger.info('✅ Aucune session créée - comportement attendu');
        }

        logger.info('📧 Email de confirmation envoyé:', result.emailSent ? 'OUI' : 'NON');
        logger.info('🚫 Accès dashboard bloqué sans validation');

        // 💾 Stocker l'email pour la page de vérification
        localStorage.setItem('pendingVerificationEmail', email);
        localStorage.setItem('pendingVerificationUserId', createdUserId);

        logger.info('🔄 Redirection vers /email-sent');

        // Navigation directe (pas de hard reload nécessaire car aucune session)
        navigate('/email-sent', {
          state: { email, userId: createdUserId },
          replace: true
        });
      }
    } catch (err) {
      logger.error('Erreur d\'authentification', err instanceof Error ? err : new Error(String(err)));

      // Gérer les erreurs spécifiques avec messages en français
      let errorMessage = 'Erreur d\'authentification';

      if (err instanceof Error) {
        const errorMsg = err.message.toLowerCase();
        
        // Compte déjà enregistré
        if (errorMsg.includes('user already registered') || errorMsg.includes('already registered')) {
          errorMessage = mode === 'signup'
            ? '⚠️ Cet email est déjà utilisé. Voulez-vous vous connecter ?'
            : 'Cet email est déjà enregistré.';

          // Proposer de passer en mode login
          if (mode === 'signup') {
            setTimeout(() => {
              if (window.confirm('Cet email est déjà enregistré. Voulez-vous vous connecter à la place ?')) {
                setMode('login');
                setError(null);
              }
            }, 100);
          }
        } 
        // Identifiants invalides
        else if (errorMsg.includes('invalid login credentials') || errorMsg.includes('invalid credentials')) {
          errorMessage = '❌ Email ou mot de passe incorrect';
        } 
        // Email non confirmé
        else if (errorMsg.includes('email not confirmed') || errorMsg.includes('not confirmed')) {
          errorMessage = '⚠️ Veuillez confirmer votre email avant de vous connecter. Vérifiez votre boîte de réception.';

          // Proposer de renvoyer l'email
          setTimeout(() => {
            if (window.confirm('Votre email n\'est pas encore confirmé. Voulez-vous recevoir un nouveau lien de confirmation ?')) {
              // Rediriger vers la page de renvoi d'email
              navigate('/email-sent', {
                state: { email, needsResend: true },
                replace: true
              });
            }
          }, 100);
        } 
        // Limite de taux dépassée
        else if (errorMsg.includes('rate limit') || errorMsg.includes('too many requests')) {
          errorMessage = '⚠️ Trop de tentatives. Veuillez patienter quelques minutes avant de réessayer.';
        } 
        // Mot de passe trop faible
        else if (errorMsg.includes('password') && (errorMsg.includes('weak') || errorMsg.includes('short'))) {
          errorMessage = '⚠️ Le mot de passe est trop faible. Utilisez au moins 6 caractères.';
        } 
        // Email invalide
        else if (errorMsg.includes('invalid email') || errorMsg.includes('email format')) {
          errorMessage = '⚠️ Adresse email invalide.';
        } 
        // Erreur réseau
        else if (errorMsg.includes('network') || errorMsg.includes('fetch')) {
          errorMessage = '⚠️ Erreur de connexion. Vérifiez votre connexion internet.';
        } 
        // Erreur générique Supabase
        else if (errorMsg.includes('supabase') || errorMsg.includes('database')) {
          errorMessage = '⚠️ Erreur serveur. Veuillez réessayer plus tard.';
        } 
        // Message par défaut
        else {
          // Essayer de traduire les messages Supabase courants
          const translations: Record<string, string> = {
            'signup_disabled': 'Les inscriptions sont temporairement désactivées.',
            'email_provider_disabled': 'La connexion par email est temporairement désactivée.',
            'captcha_failed': 'La vérification CAPTCHA a échoué. Veuillez réessayer.',
            'session_not_found': 'Session expirée. Veuillez vous reconnecter.',
          };
          
          const translated = Object.entries(translations).find(([key]) => errorMsg.includes(key));
          errorMessage = translated ? translated[1] : err.message;
        }
      }

      setError(errorMessage);
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
            <div className="mb-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400 mr-3 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <p className="text-sm text-green-700 dark:text-green-300">{success}</p>
            </div>
          )}

          {/* Onglets pour le mode login */}
          {mode === 'login' && (
            <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
              <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                <button
                  type="button"
                  onClick={() => {
                    setLoginMethod('password');
                    setError(null);
                    setSuccess(null);
                  }}
                  className={`
                    py-2 px-1 border-b-2 font-medium text-sm transition-colors
                    ${loginMethod === 'password'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }
                  `}
                >
                  Connexion classique
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoginMethod('magic-link');
                    setError(null);
                    setSuccess(null);
                  }}
                  className={`
                    py-2 px-1 border-b-2 font-medium text-sm transition-colors
                    ${loginMethod === 'magic-link'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }
                  `}
                >
                  Lien magique
                </button>
              </nav>
            </div>
          )}

          {/* Formulaire de connexion classique */}
          {mode === 'login' && loginMethod === 'password' && (
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
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none block w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Votre mot de passe"
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
                <div className="mt-2 text-right">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
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
                      Se connecter
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Formulaire de lien magique */}
          {mode === 'login' && loginMethod === 'magic-link' && (
            <form className="space-y-6" onSubmit={handleMagicLink}>
              <div>
                <label htmlFor="magic-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Adresse email
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="magic-email"
                    name="magic-email"
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
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-teal-500 hover:from-blue-600 hover:to-teal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <Loader className="animate-spin h-5 w-5" />
                  ) : (
                    <>
                      Envoyer le lien
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Formulaire d'inscription */}
          {mode === 'signup' && (
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

            {mode === 'signup' && (
              <>
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Prénom
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      autoComplete="given-name"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Jean"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Nom
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      autoComplete="family-name"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Dupont"
                    />
                  </div>
                </div>
              </>
            )}

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
              {mode === 'login' && (
                <div className="mt-2 text-right">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
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
          )}

          {/* Séparateur et bouton de changement de mode */}
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
                  setFirstName('');
                  setLastName('');
                  setLoginMethod('password'); // Réinitialiser à la connexion classique
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

      {/* Modale Mot de passe oublié */}
      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => {
          setShowForgotPassword(false);
          setError(null);
        }}
        initialEmail={email}
      />
    </div>
  );
}
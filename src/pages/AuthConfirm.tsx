import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { AlertCircle, Loader, CheckCircle } from 'lucide-react';

export default function AuthConfirm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const handleAuthConfirmation = async () => {
      try {
        setLoading(true);
        setError(null);

        if (import.meta.env.DEV) {
          console.log('🔍 [AUTH-CONFIRM] Début de la confirmation');
          console.log('🔍 [AUTH-CONFIRM] Hash:', window.location.hash);
          console.log('🔍 [AUTH-CONFIRM] Search params:', window.location.search);
        }

        // Attendre que Supabase traite automatiquement le hash de l'URL
        // Supabase détecte automatiquement les tokens dans l'URL (#access_token=...)
        await new Promise(resolve => setTimeout(resolve, 500));

        // Vérifier s'il y a une session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          if (import.meta.env.DEV) {
            console.error('❌ [AUTH-CONFIRM] Erreur session:', sessionError);
          }
          throw new Error('Erreur lors de la récupération de la session.');
        }

        if (session) {
          // Session créée avec succès
          if (import.meta.env.DEV) {
            console.log('✅ [AUTH-CONFIRM] Session créée:', {
              userId: session.user.id,
              email: session.user.email,
              emailConfirmed: !!session.user.email_confirmed_at
            });
          }

          setSuccess(true);

          // Rediriger vers le dashboard après 1.5 secondes
          setTimeout(() => {
            navigate('/dashboard', { replace: true });
          }, 1500);
          return;
        }

        // Si pas de session, vérifier les tokens dans l'URL
        const hash = window.location.hash;
        const searchParamsStr = window.location.search;

        // Vérifier si on a un token dans le hash ou les query params
        const hasToken = hash.includes('access_token') ||
                        hash.includes('token_hash') ||
                        searchParamsStr.includes('token_hash') ||
                        searchParamsStr.includes('access_token');

        if (!hasToken) {
          throw new Error('Lien de confirmation invalide ou expiré. Aucun token trouvé dans l\'URL.');
        }

        // Attendre encore un peu pour que Supabase finalise
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Vérifier à nouveau la session
        const { data: { session: newSession }, error: newSessionError } = await supabase.auth.getSession();

        if (newSessionError || !newSession) {
          if (import.meta.env.DEV) {
            console.error('❌ [AUTH-CONFIRM] Session non créée après attente:', newSessionError);
          }
          throw new Error('Impossible de créer la session. Le lien peut être expiré ou invalide.');
        }

        if (import.meta.env.DEV) {
          console.log('✅ [AUTH-CONFIRM] Session créée après retry');
        }

        setSuccess(true);

        // Rediriger vers le dashboard
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 1500);

      } catch (err) {
        if (import.meta.env.DEV) {
          console.error('❌ [AUTH-CONFIRM] Erreur confirmation:', err);
        }
        setError(err instanceof Error ? err.message : 'Erreur lors de la confirmation du lien.');
      } finally {
        setLoading(false);
      }
    };

    handleAuthConfirmation();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-teal-500 rounded-2xl flex items-center justify-center mx-auto">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
            Confirmation de connexion
          </h2>
        </div>

        <div className="mt-8 bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {loading && (
            <div className="text-center space-y-4">
              <Loader className="animate-spin h-8 w-8 text-blue-500 mx-auto" />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Vérification du lien de connexion...
              </p>
            </div>
          )}

          {success && (
            <div className="text-center space-y-4">
              <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                  ✅ Connexion réussie !
                </p>
                <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                  Redirection vers votre tableau de bord...
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="text-center space-y-4">
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                <p className="text-sm text-red-700 dark:text-red-300 font-medium mb-2">
                  {error}
                </p>
                <button
                  onClick={() => navigate('/auth', { replace: true })}
                  className="mt-4 w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-teal-500 hover:from-blue-600 hover:to-teal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Retour à la connexion
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabaseAuth } from '../../hooks/useSupabaseAuth';

const ZoomOAuthCallback: React.FC = () => {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Traitement de la connexion Zoom...');
  const navigate = useNavigate();
  const { user } = useSupabaseAuth();

  // Utilitaire cookies (même logique que SimpleZoomAuth)
  const getCookie = (name: string): string | null => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
    return null;
  };

  const deleteCookie = (name: string) => {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax; Secure`;
  };

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Debug détaillé : log de l'URL complète avec analyse
        console.log('🔍 URL complète callback:', window.location.href);
        console.log('🔍 Search params bruts:', window.location.search);
        
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');
        const state = urlParams.get('state');
        const errorDescription = urlParams.get('error_description');

        console.log('📝 Paramètres OAuth reçus:', { 
          code: code ? code.substring(0, 10) + '...' : null,
          error,
          errorDescription,
          state: state ? state.substring(0, 16) + '...' : null,
          stateLength: state?.length || 0,
          allParams: Object.fromEntries(urlParams.entries())
        });

        if (error) {
          const fullError = errorDescription ? `${error}: ${errorDescription}` : error;
          console.error('❌ Erreur OAuth reçue de Zoom:', fullError);
          throw new Error(`Erreur OAuth Zoom: ${fullError}`);
        }

        if (!code) {
          console.error('❌ Code d\'autorisation manquant');
          throw new Error('Code d\'autorisation manquant dans la réponse Zoom');
        }
        
        if (!state) {
          console.error('❌ Paramètre state manquant - Zoom n\'a pas retourné le state');
          throw new Error('Paramètre state manquant - possible problème de configuration Zoom');
        }
        
        console.log('✅ Paramètres OAuth valides reçus de Zoom');

        // Validation du state avec fallback sessionStorage → cookies
        let savedState = sessionStorage.getItem('zoom_oauth_state');
        let savedData = sessionStorage.getItem('zoom_oauth_data');
        
        // Fallback vers cookies si sessionStorage vide
        if (!savedState) {
          savedState = getCookie('zoom_oauth_state');
          savedData = getCookie('zoom_oauth_data');
          console.log('📋 Fallback vers cookies:', { hasState: !!savedState, hasData: !!savedData });
        }
        
        console.log('🔐 Validation du state (sessionStorage + cookies):', { 
          received: state.substring(0, 16) + '...', 
          saved: savedState?.substring(0, 16) + '...',
          exactMatch: state === savedState,
          receivedLength: state.length,
          savedLength: savedState?.length || 0,
          dataExists: !!savedData,
          source: sessionStorage.getItem('zoom_oauth_state') ? 'sessionStorage' : 'cookies'
        });

        if (!savedState) {
          console.error('❌ Aucun state trouvé (ni sessionStorage ni cookies)');
          throw new Error('Session OAuth expirée - state manquant');
        }
        
        if (state !== savedState) {
          console.error('❌ State invalide:', {
            expected: savedState.substring(0, 16) + '...',
            received: state.substring(0, 16) + '...'
          });
          throw new Error('State OAuth invalide - possible attaque CSRF');
        }

        if (!savedData) {
          console.error('❌ Données OAuth manquantes');
          throw new Error('Données utilisateur OAuth manquantes');
        }
        
        console.log('✅ Validation du state réussie');

        // Récupérer et valider les données utilisateur stockées
        let stateData;
        try {
          stateData = JSON.parse(savedData);
          console.log('📋 Données utilisateur récupérées:', {
            userId: stateData.user_id,
            hasRedirectBack: !!stateData.redirect_back,
            timestamp: stateData.timestamp
          });
        } catch (parseError) {
          console.error('❌ Erreur parsing données OAuth:', parseError);
          throw new Error('Données OAuth corrompues');
        }
        
        // Utiliser l'utilisateur connecté actuel ou celui stocké
        const userId = user?.id || stateData.user_id;
        if (!userId) {
          throw new Error('ID utilisateur manquant - veuillez vous reconnecter');
        }
        
        // Nettoyer le stockage
        sessionStorage.removeItem('zoom_oauth_state');
        sessionStorage.removeItem('zoom_oauth_data');
        deleteCookie('zoom_oauth_state');
        deleteCookie('zoom_oauth_data');
        
        console.log('🚀 Envoi vers Edge Function pour user_id:', userId);
        
        // Envoyer vers Supabase Edge Function (proxy vers N8N)
        const SUPABASE_PROXY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/zoom-n8n-proxy`;
        const response = await fetch(SUPABASE_PROXY_URL, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            action: 'oauth_callback',
            code,
            state,
            user_id: userId
          })
        });

        console.log('📡 Response status:', response.status, response.statusText);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Erreur HTTP du proxy:', response.status, errorText);
          throw new Error(`Erreur proxy Supabase (${response.status}): ${errorText}`);
        }
        
        const result = await response.json();
        console.log('📡 Réponse complète du proxy:', result);

        if (result.success) {
          setStatus('success');
          setMessage('✅ Connexion Zoom réussie ! Redirection...');
          
          // Attendre un peu puis rediriger
          setTimeout(() => {
            const redirectPath = stateData.redirect_back || '/dashboard';
            console.log('↩️ Redirection vers:', redirectPath);
            navigate(redirectPath);
          }, 1500);
        } else {
          console.error('❌ Échec du traitement OAuth:', result);
          throw new Error(result.error || result.message || 'Erreur inconnue lors du traitement OAuth');
        }
      } catch (err: any) {
        console.error('❌ Erreur callback OAuth:', err);
        setStatus('error');
        setMessage(`❌ ${err.message}`);
      }
    };

    processCallback();
  }, []);

  const handleRetry = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <div className="text-center">
          <div className="mb-6">
            {status === 'processing' && (
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            )}
            {status === 'success' && (
              <div className="text-6xl mb-4">✅</div>
            )}
            {status === 'error' && (
              <div className="text-6xl mb-4">❌</div>
            )}
          </div>

          <h2 className="text-xl font-semibold mb-4">
            {status === 'processing' && 'Connexion Zoom en cours...'}
            {status === 'success' && 'Connexion réussie !'}
            {status === 'error' && 'Erreur de connexion'}
          </h2>

          <p className="text-gray-600 mb-6">{message}</p>

          {status === 'error' && (
            <button
              onClick={handleRetry}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Retour au tableau de bord
            </button>
          )}

          {status === 'processing' && (
            <p className="text-sm text-gray-500">
              Veuillez patienter, ne fermez pas cette page...
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ZoomOAuthCallback;
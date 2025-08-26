import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ZoomOAuthCallback: React.FC = () => {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Traitement de la connexion Zoom...');
  const navigate = useNavigate();

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

        // Validation renforcée du state sécurisé
        const savedState = sessionStorage.getItem('zoom_oauth_state');
        const savedData = sessionStorage.getItem('zoom_oauth_data');
        
        console.log('🔐 Validation détaillée du state:', { 
          received: state.substring(0, 16) + '...', 
          saved: savedState?.substring(0, 16) + '...',
          exactMatch: state === savedState,
          receivedLength: state.length,
          savedLength: savedState?.length || 0,
          sessionStorageKeys: Object.keys(sessionStorage),
          dataExists: !!savedData
        });

        if (!savedState) {
          console.error('❌ Aucun state stocké en sessionStorage');
          console.log('📋 SessionStorage actuel:', {
            keys: Object.keys(sessionStorage),
            zoomKeys: Object.keys(sessionStorage).filter(k => k.includes('zoom'))
          });
          throw new Error('Session OAuth expirée ou perdue - state manquant en sessionStorage');
        }
        
        if (state !== savedState) {
          console.error('❌ State ne correspond pas:', {
            expected: savedState,
            received: state,
            expectedPreview: savedState.substring(0, 16) + '...',
            receivedPreview: state.substring(0, 16) + '...'
          });
          throw new Error('State OAuth invalide - possible attaque CSRF ou corruption de session');
        }

        if (!savedData) {
          console.error('❌ Données OAuth manquantes');
          throw new Error('Données utilisateur OAuth manquantes dans le sessionStorage');
        }
        
        console.log('✅ Validation du state réussie');

        // Récupérer et valider les données utilisateur stockées
        let stateData;
        try {
          stateData = JSON.parse(savedData);
          console.log('📋 Données utilisateur récupérées:', {
            userId: stateData.user_id,
            hasRedirectBack: !!stateData.redirect_back,
            createdAt: stateData.created_at,
            clientId: stateData.client_id?.substring(0, 8) + '...'
          });
        } catch (parseError) {
          console.error('❌ Erreur parsing données OAuth:', parseError);
          throw new Error('Données OAuth corrompues dans sessionStorage');
        }
        
        if (!stateData.user_id) {
          throw new Error('ID utilisateur manquant dans les données OAuth');
        }
        
        // Nettoyer le sessionStorage
        sessionStorage.removeItem('zoom_oauth_state');
        sessionStorage.removeItem('zoom_oauth_data');
        
        // Envoyer vers Supabase Edge Function (proxy vers N8N)
        const SUPABASE_PROXY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/zoom-n8n-proxy`;
        const response = await fetch(SUPABASE_PROXY_URL, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            action: 'oauth_callback',
            code,
            user_id: stateData.user_id,
            redirect_uri: 'https://centrinote.fr/zoom-callback',
            state: state, // Inclure le state validé dans l'appel
            callback_url: window.location.href,
            timestamp: new Date().toISOString()
          })
        });

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
          
          setTimeout(() => {
            // Rediriger vers la page d'origine ou dashboard
            const redirectUrl = stateData.redirect_back || '/dashboard';
            window.location.href = redirectUrl;
          }, 2000);
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
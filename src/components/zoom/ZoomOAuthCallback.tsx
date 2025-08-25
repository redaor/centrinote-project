import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ZoomOAuthCallback: React.FC = () => {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Traitement de la connexion Zoom...');
  const navigate = useNavigate();

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Debug : log de l'URL complète
        console.log('🔍 URL complète:', window.location.href);
        console.log('🔍 Search params:', window.location.search);
        
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');
        const state = urlParams.get('state');

        console.log('📝 Paramètres récupérés:', { code, error, state });

        if (error) {
          throw new Error(`Erreur OAuth: ${error}`);
        }

        if (!code || !state) {
          throw new Error(`Paramètres OAuth manquants - Code: ${code ? '✅' : '❌'}, State: ${state ? '✅' : '❌'}`);
        }

        const stateData = JSON.parse(decodeURIComponent(state));
        
        // Envoyer vers n8n pour traitement
        const N8N_OAUTH_WEBHOOK = import.meta.env.VITE_N8N_ZOOM_OAUTH_WEBHOOK || 'https://n8n.srv886297.hstgr.cloud/webhook/a27e69d1-9497-4816-adba-3dc85dd83f75';
        const response = await fetch(N8N_OAUTH_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'oauth_callback',
            code,
            user_id: stateData.user_id,
            redirect_uri: `${window.location.origin}/zoom-callback`
          })
        });

        const result = await response.json();

        if (response.ok && result.success) {
          setStatus('success');
          setMessage('✅ Connexion Zoom réussie ! Redirection...');
          
          setTimeout(() => {
            // Rediriger vers la page d'origine ou dashboard
            const redirectUrl = stateData.redirect_back || '/dashboard';
            window.location.href = redirectUrl;
          }, 2000);
        } else {
          throw new Error(result.error || 'Erreur lors du traitement OAuth');
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
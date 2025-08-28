// src/pages/ZoomOAuthCallback.tsx
// Page de callback OAuth Zoom avec validation cookies et PKCE

import { useEffect, useState } from 'react';

/**
 * Récupère une valeur de cookie par son nom
 */
function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

export default function ZoomOAuthCallback() {
  const [message, setMessage] = useState('Connexion Zoom en cours…');

  useEffect(() => {
    const processOAuthCallback = async () => {
      console.log('📋 === ZoomOAuthCallback - Début du traitement ===');
      console.log('🔍 URL callback:', window.location.href);
      
      const qs = new URLSearchParams(window.location.search);
      const code = qs.get('code');
      const state = qs.get('state');
      const error = qs.get('error');
      
      console.log('📝 Paramètres reçus:', { 
        code: code ? code.substring(0, 10) + '...' : null,
        state: state ? state.substring(0, 16) + '...' : null,
        error 
      });

      // Vérification d'erreur OAuth
      if (error) {
        console.error('❌ Erreur OAuth de Zoom:', error);
        setMessage(`Erreur OAuth: ${error}`);
        return;
      }

      // Vérification du code
      if (!code) {
        console.error('❌ Code OAuth manquant');
        setMessage('Code OAuth manquant.');
        return;
      }

      // Récupération des cookies
      const cookieState = getCookie('zoom_oauth_state');
      const codeVerifier = getCookie('zoom_pkce_verifier');
      const bypass = String(import.meta.env.VITE_ALLOW_OAUTH_STATE_BYPASS) === 'true';
      
      console.log('🍪 Cookies OAuth:', {
        cookieState: cookieState ? cookieState.substring(0, 16) + '...' : null,
        codeVerifier: codeVerifier ? codeVerifier.substring(0, 16) + '...' : null,
        bypass
      });

      // Validation du state (sauf si bypass activé)
      if (!bypass && (!state || !cookieState || state !== cookieState)) {
        console.warn('⚠️ State invalide ou expiré - Relance du flux OAuth');
        console.log('🔄 State reçu:', state?.substring(0, 16) + '...');
        console.log('🔄 State cookie:', cookieState?.substring(0, 16) + '...');
        
        setMessage('Session expirée. Redirection pour relancer la connexion…');
        
        // Import dynamique pour éviter les dépendances circulaires
        try {
          const { startZoomOAuth } = await import('../utils/oauth');
          setTimeout(() => {
            startZoomOAuth();
          }, 1500);
        } catch (err) {
          console.error('❌ Erreur lors du redémarrage OAuth:', err);
          setMessage('Erreur lors de la reconnexion. Veuillez réessayer.');
        }
        return;
      }

      console.log('✅ Validation state réussie (ou bypassée)');
      
      // Appel à l'Edge Function
      console.log('🚀 Appel de l\'Edge Function...');
      
      const payload = {
        code,
        redirect_uri: `${import.meta.env.VITE_APP_URL}/zoom-callback`,
        code_verifier: codeVerifier || undefined
      };
      
      console.log('📦 Payload Edge Function:', {
        code: payload.code.substring(0, 10) + '...',
        redirect_uri: payload.redirect_uri,
        code_verifier: payload.code_verifier ? payload.code_verifier.substring(0, 16) + '...' : undefined
      });

      try {
        const response = await fetch('/.netlify/functions/exchange-zoom-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        console.log('📡 Réponse Edge Function:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Erreur Edge Function:', errorText);
          throw new Error(`Erreur ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        console.log('✅ Succès Edge Function:', result);
        
        // Nettoyage des cookies OAuth
        document.cookie = 'zoom_oauth_state=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax; Secure';
        document.cookie = 'zoom_pkce_verifier=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax; Secure';
        
        setMessage('Connecté à Zoom avec succès ! Redirection…');
        
        // Redirection vers le dashboard après succès
        setTimeout(() => {
          window.location.replace('/dashboard');
        }, 800);

      } catch (error) {
        console.error('❌ Erreur lors de l\'échange du code:', error);
        setMessage('Erreur de connexion Zoom. Veuillez réessayer.');
      }
    };

    processOAuthCallback();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <div className="text-center">
          <div className="mb-6">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
          
          <h2 className="text-xl font-semibold mb-4">
            Connexion Zoom
          </h2>
          
          <p className="text-gray-600 mb-6">{message}</p>
          
          <p className="text-sm text-gray-500">
            Veuillez patienter, ne fermez pas cette page...
          </p>
        </div>
      </div>
    </div>
  );
}
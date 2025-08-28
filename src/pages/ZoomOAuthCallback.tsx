// src/pages/ZoomOAuthCallback.tsx
// Page de callback OAuth Zoom simplifiée avec flag VITE_OAUTH_STATE_STRICT

import { useEffect, useState } from 'react';

export default function ZoomOAuthCallback() {
  const [msg, setMsg] = useState('Connexion Zoom en cours…');

  useEffect(() => {
    const processCallback = async () => {
      console.log('📋 ZoomOAuthCallback - Début traitement');
      console.log('🔍 URL:', window.location.href);
      
      const qs = new URLSearchParams(window.location.search);
      const code = qs.get('code');
      const error = qs.get('error');
      const stateFromUrl = qs.get('state') ?? '';
      const stateFromSession = sessionStorage.getItem('zoom_oauth_state') ?? '';
      const strict = String(import.meta.env.VITE_OAUTH_STATE_STRICT) === 'true';

      console.log('📝 Paramètres:', {
        code: code ? code.substring(0, 10) + '...' : null,
        error,
        stateFromUrl: stateFromUrl ? stateFromUrl.substring(0, 16) + '...' : null,
        stateFromSession: stateFromSession ? stateFromSession.substring(0, 16) + '...' : null,
        strict
      });

      // Gestion des erreurs OAuth
      if (error) {
        console.error('❌ Erreur OAuth:', error);
        setMsg(`Erreur OAuth: ${error}`);
        return;
      }

      if (!code) {
        console.error('❌ Code OAuth manquant');
        setMsg('Code OAuth manquant');
        return;
      }

      // Vérification state selon le mode strict/non-strict
      if (strict) {
        if (!stateFromUrl || !stateFromSession || stateFromUrl !== stateFromSession) {
          console.error('❌ OAuth state mismatch (strict mode)', { stateFromUrl, stateFromSession });
          setMsg('Vérification de sécurité échouée (state).');
          return;
        }
        console.log('✅ State validation passed (strict mode)');
      } else {
        if (!stateFromUrl || !stateFromSession || stateFromUrl !== stateFromSession) {
          console.warn('⚠️ OAuth state mismatch/absent (non-strict). Continuing for debug.', { stateFromUrl, stateFromSession });
        } else {
          console.log('✅ State validation passed (non-strict mode)');
        }
      }

      // Préparation du payload pour Supabase Edge Function
      const payload = {
        code,
        redirect_uri: `${import.meta.env.VITE_APP_URL}/zoom-callback`,
        state: stateFromUrl || null,
      };

      console.log('🚀 Appel Supabase Edge Function exchange-zoom-code');
      console.log('📦 Payload:', {
        code: payload.code.substring(0, 10) + '...',
        redirect_uri: payload.redirect_uri,
        state: payload.state ? payload.state.substring(0, 16) + '...' : null
      });

      try {
        // Appel vers Supabase Edge Function (PAS Netlify)
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/exchange-zoom-code`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify(payload),
        });

        console.log('📡 Response Supabase Edge Function:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Erreur Supabase Edge Function:', errorText);
          throw new Error(`Erreur ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        console.log('✅ Succès Supabase Edge Function:', result);

        // Nettoyage sessionStorage
        sessionStorage.removeItem('zoom_oauth_state');
        sessionStorage.removeItem('zoom_oauth_data');

        setMsg('Connecté à Zoom avec succès ! Redirection…');
        
        // Redirection vers dashboard
        setTimeout(() => {
          window.location.replace('/dashboard');
        }, 800);

      } catch (error) {
        console.error('❌ Erreur OAuth exchange:', error);
        setMsg('Erreur de connexion Zoom. Réessayez.');
      }
    };

    processCallback();
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
          
          <p className="text-gray-600 mb-6">{msg}</p>
          
          <p className="text-sm text-gray-500">
            Veuillez patienter, ne fermez pas cette page...
          </p>
        </div>
      </div>
    </div>
  );
}
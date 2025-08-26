import React, { useState } from 'react';

interface ZoomLoginProps {
  clientId?: string;
  redirectUri?: string;
  className?: string;
}

const ZoomLogin: React.FC<ZoomLoginProps> = ({
  clientId = import.meta.env.VITE_ZOOM_CLIENT_ID || '',
  redirectUri = 'https://centrinote.fr/zoom-callback',
  className = ''
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleZoomLogin = () => {
    if (!clientId) {
      alert('❌ Configuration manquante: ZOOM_CLIENT_ID non défini');
      return;
    }

    try {
      setIsLoading(true);
      
      // 1. Générer un state aléatoire unique
      const state = crypto.randomUUID();
      console.log('🔐 Génération du state OAuth:', state.substring(0, 16) + '...');
      
      // 2. Sauvegarder le state dans sessionStorage
      sessionStorage.setItem('zoom_oauth_state', state);
      
      // Vérifier que la sauvegarde a fonctionné
      const savedState = sessionStorage.getItem('zoom_oauth_state');
      if (!savedState || savedState !== state) {
        throw new Error('Échec de la sauvegarde du state OAuth');
      }
      
      console.log('💾 State sauvegardé avec succès en sessionStorage');
      
      // 3. Construire l'URL OAuth Zoom
      const oauthUrl = new URL('https://zoom.us/oauth/authorize');
      oauthUrl.searchParams.set('response_type', 'code');
      oauthUrl.searchParams.set('client_id', clientId);
      oauthUrl.searchParams.set('redirect_uri', redirectUri);
      oauthUrl.searchParams.set('state', state);
      oauthUrl.searchParams.set('scope', 'meeting:write meeting:read user:read');
      
      console.log('🔗 URL OAuth générée:', {
        url: oauthUrl.toString().substring(0, 100) + '...',
        client_id: clientId.substring(0, 8) + '...',
        redirect_uri: redirectUri,
        state_preview: state.substring(0, 16) + '...'
      });
      
      // 4. Rediriger vers Zoom OAuth
      console.log('🚀 Redirection vers Zoom OAuth...');
      window.location.href = oauthUrl.toString();
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation OAuth:', error);
      alert(`❌ Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleZoomLogin}
      disabled={isLoading || !clientId}
      className={`
        inline-flex items-center justify-center px-6 py-3
        bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400
        text-white font-semibold rounded-lg
        transition-colors duration-200
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        disabled:cursor-not-allowed
        ${className}
      `}
    >
      {isLoading ? (
        <>
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Redirection...
        </>
      ) : (
        <>
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.568 8.16l-5.568 5.568L6.432 8.16a.8.8 0 0 1 1.136-1.136L12 11.456l4.432-4.432a.8.8 0 1 1 1.136 1.136z"/>
          </svg>
          Se connecter avec Zoom
        </>
      )}
    </button>
  );
};

export default ZoomLogin;
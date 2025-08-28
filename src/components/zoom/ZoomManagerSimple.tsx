import React, { useState } from 'react';
import ZoomConnectionStatus from '../ZoomConnectionStatus';
import SimpleZoomAuth from './SimpleZoomAuth';
import SimpleZoomMeeting from './SimpleZoomMeeting';

const ZoomManagerSimple: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'auth' | 'meeting'>('auth');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleTokenReceived = (tokenInfo: any) => {
    setIsAuthenticated(true);
    setActiveTab('meeting');
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          🔵 Gestionnaire Zoom Centrinote
        </h1>
        <p className="text-gray-600">
          Solution simplifiée pour la gestion des réunions Zoom
        </p>
      </div>

      {/* État de connexion en haut */}
      <div className="mb-6">
        <ZoomConnectionStatus />
      </div>

      {/* Navigation par onglets */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('auth')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'auth'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            🔐 Authentification
          </button>
          <button
            onClick={() => setActiveTab('meeting')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'meeting'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            📅 Réunions
          </button>
        </nav>
      </div>

      {/* Contenu des onglets */}
      <div className="space-y-6">
        {activeTab === 'auth' && (
          <div>
            <SimpleZoomAuth onTokenReceived={handleTokenReceived} />
            
            {!isAuthenticated && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">ℹ️ Processus de connexion :</h4>
                <ol className="text-blue-800 text-sm space-y-1 list-decimal list-inside">
                  <li>Cliquez sur "Connecter à Zoom"</li>
                  <li>Autorisez Centrinote dans Zoom</li>
                  <li>Revenez automatiquement ici</li>
                  <li>Créez vos réunions dans l'onglet "Réunions"</li>
                </ol>
              </div>
            )}
          </div>
        )}

        {activeTab === 'meeting' && (
          <div>
            {!isAuthenticated ? (
              <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
                <div className="text-4xl mb-4">⚠️</div>
                <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                  Authentification Zoom requise
                </h3>
                <p className="text-yellow-700 mb-4">
                  Vous devez d'abord vous connecter à Zoom pour créer des réunions.
                </p>
                <button
                  onClick={() => setActiveTab('auth')}
                  className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
                >
                  🔐 Aller à l'authentification
                </button>
              </div>
            ) : (
              <SimpleZoomMeeting />
            )}
          </div>
        )}
      </div>

      {/* Footer informatif */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">🏗️ Architecture simplifiée :</h4>
          <div className="text-sm text-gray-700">
            <p className="mb-2">
              <strong>Flux OAuth :</strong> Centrinote → Zoom → n8n webhook → Supabase (zoom_tokens)
            </p>
            <p>
              <strong>Création réunion :</strong> Centrinote → n8n webhook → Zoom API → Retour Centrinote
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ZoomManagerSimple;
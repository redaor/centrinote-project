// 🚀 Gestionnaire Zoom moderne via Supabase OAuth
// Remplace ZoomManagerSimple.tsx avec l'API Supabase OAuth native
// ===============================================================

import React, { useState, useEffect } from 'react';
import SupabaseZoomAuth from './SupabaseZoomAuth';
import SupabaseZoomMeeting from './SupabaseZoomMeeting';
import { useSupabaseZoom } from '../../hooks/useSupabaseZoom';

const SupabaseZoomManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'auth' | 'meeting' | 'integration'>('auth');
  const { isConnected, loading, error, user } = useSupabaseZoom();

  // Basculer automatiquement vers l'onglet réunions si connecté
  useEffect(() => {
    if (isConnected && activeTab === 'auth') {
      setActiveTab('meeting');
    }
  }, [isConnected, activeTab]);

  const handleConnectionChange = (connected: boolean) => {
    if (connected) {
      setActiveTab('meeting');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* En-tête */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
          <span className="mr-3">🚀</span>
          Gestionnaire Zoom Supabase
        </h1>
        <p className="text-gray-600">
          Authentification OAuth native avec gestion automatique des tokens
        </p>
      </div>

      {/* Indicateurs d'état */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`p-4 rounded-lg border ${
          isConnected 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : 'bg-gray-50 border-gray-200 text-gray-600'
        }`}>
          <div className="flex items-center">
            <span className="text-2xl mr-3">{isConnected ? '✅' : '🔌'}</span>
            <div>
              <p className="font-semibold">Connexion Zoom</p>
              <p className="text-sm">{isConnected ? 'Connecté' : 'Non connecté'}</p>
            </div>
          </div>
        </div>

        <div className={`p-4 rounded-lg border ${
          user 
            ? 'bg-blue-50 border-blue-200 text-blue-800' 
            : 'bg-gray-50 border-gray-200 text-gray-600'
        }`}>
          <div className="flex items-center">
            <span className="text-2xl mr-3">👤</span>
            <div>
              <p className="font-semibold">Utilisateur Zoom</p>
              <p className="text-sm">{user ? `${user.first_name} ${user.last_name}` : 'Non disponible'}</p>
            </div>
          </div>
        </div>

        <div className={`p-4 rounded-lg border ${
          !loading && !error 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : 'bg-yellow-50 border-yellow-200 text-yellow-800'
        }`}>
          <div className="flex items-center">
            <span className="text-2xl mr-3">{loading ? '⏳' : error ? '⚠️' : '🛡️'}</span>
            <div>
              <p className="font-semibold">Statut</p>
              <p className="text-sm">
                {loading ? 'Chargement...' : error ? 'Erreur' : 'Opérationnel'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages d'erreur */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start">
            <span className="text-red-500 text-xl mr-3">❌</span>
            <div>
              <h4 className="font-medium text-red-800">Erreur</h4>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation par onglets */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('auth')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'auth'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <span className="mr-2">🔐</span>
            Authentification
          </button>
          
          <button
            onClick={() => setActiveTab('meeting')}
            disabled={!isConnected}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'meeting'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } ${!isConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span className="mr-2">📅</span>
            Réunions
          </button>

          <button
            onClick={() => setActiveTab('integration')}
            disabled={!isConnected}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'integration'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } ${!isConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span className="mr-2">🔗</span>
            Intégration n8n
          </button>
        </nav>
      </div>

      {/* Contenu des onglets */}
      <div className="space-y-6">
        {activeTab === 'auth' && (
          <div>
            <SupabaseZoomAuth 
              onConnectionChange={handleConnectionChange}
              className="mb-6"
            />
            
            {!isConnected && (
              <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-3 flex items-center">
                  <span className="mr-2">ℹ️</span>
                  Avantages de Supabase OAuth
                </h4>
                <ul className="text-blue-800 text-sm space-y-2">
                  <li className="flex items-start">
                    <span className="mr-2 mt-0.5">✅</span>
                    <span>Gestion automatique des tokens (stockage, rafraîchissement, expiration)</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 mt-0.5">✅</span>
                    <span>Sécurité renforcée avec les standards OAuth 2.0</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 mt-0.5">✅</span>
                    <span>Plus de gestion manuelle via Edge Functions ou n8n</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 mt-0.5">✅</span>
                    <span>Interface simplifiée et fiable (comme Fireflies.ai)</span>
                  </li>
                </ul>
              </div>
            )}
          </div>
        )}

        {activeTab === 'meeting' && (
          <div>
            {!isConnected ? (
              <div className="p-8 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
                <div className="text-6xl mb-4">🔐</div>
                <h3 className="text-xl font-semibold text-yellow-800 mb-3">
                  Authentification Zoom requise
                </h3>
                <p className="text-yellow-700 mb-6 max-w-md mx-auto">
                  Connectez-vous à Zoom via Supabase OAuth pour accéder à la gestion des réunions.
                </p>
                <button
                  onClick={() => setActiveTab('auth')}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  🚀 Se connecter à Zoom
                </button>
              </div>
            ) : (
              <SupabaseZoomMeeting />
            )}
          </div>
        )}

        {activeTab === 'integration' && (
          <div>
            {!isConnected ? (
              <div className="p-8 bg-gray-50 border border-gray-200 rounded-lg text-center">
                <div className="text-6xl mb-4">🔗</div>
                <h3 className="text-xl font-semibold text-gray-800 mb-3">
                  Intégration n8n
                </h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Connectez-vous à Zoom pour voir les options d'intégration avec vos workflows n8n.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-3 flex items-center">
                    <span className="mr-2">🔗</span>
                    Intégration n8n avec tokens Supabase
                  </h4>
                  <p className="text-green-800 text-sm mb-4">
                    Vos workflows n8n peuvent maintenant utiliser directement les tokens gérés par Supabase.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="bg-white p-4 rounded border">
                      <h5 className="font-medium text-gray-900 mb-2">📹 Création de réunions</h5>
                      <p className="text-gray-600">Workflow n8n reçoit automatiquement les tokens Zoom</p>
                    </div>
                    <div className="bg-white p-4 rounded border">
                      <h5 className="font-medium text-gray-900 mb-2">📊 Enregistrement</h5>
                      <p className="text-gray-600">Démarrage automatique avec tokens valides</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer informatif */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
            <span className="mr-2">🏗️</span>
            Architecture Supabase OAuth
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <h5 className="font-medium text-gray-800 mb-2">🔐 Authentification</h5>
              <p className="text-gray-600 mb-2">
                <strong>Avant :</strong> Gestion manuelle complexe (Edge Functions + n8n + table zoom_tokens)
              </p>
              <p className="text-gray-600">
                <strong>Maintenant :</strong> Supabase OAuth natif avec gestion automatique
              </p>
            </div>
            <div>
              <h5 className="font-medium text-gray-800 mb-2">🔗 Workflows n8n</h5>
              <p className="text-gray-600 mb-2">
                <strong>Avant :</strong> n8n gérait l'OAuth + stockage tokens
              </p>
              <p className="text-gray-600">
                <strong>Maintenant :</strong> n8n reçoit les tokens prêts à utiliser
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupabaseZoomManager;
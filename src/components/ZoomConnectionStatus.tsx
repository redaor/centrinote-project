// 🔵 Composant d'état de connexion Zoom avec test N8N
// ====================================================

import React, { useState, useEffect } from 'react';
import { useSupabaseAuth } from '../hooks/useSupabaseAuth';
import { supabase } from '../lib/supabase';

interface ZoomToken {
  user_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
}

type ConnectionStatus = 'loading' | 'connected' | 'expired' | 'not_connected';

const ZoomConnectionStatus: React.FC = () => {
  const { user } = useSupabaseAuth();
  const [status, setStatus] = useState<ConnectionStatus>('loading');
  const [tokenInfo, setTokenInfo] = useState<ZoomToken | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 🔄 Fonction pour rafraîchir l'état depuis la DB
  const refreshStatus = async () => {
    if (!user) {
      setStatus('not_connected');
      return;
    }

    try {
      console.log('🔍 Vérification token Zoom pour utilisateur:', user.id);
      
      const { data, error } = await supabase
        .from('zoom_tokens')
        .select('user_id, access_token, refresh_token, expires_at')
        .eq('user_id', user.id)
        .maybeSingle(); // Évite l'erreur 406 si pas de résultat

      if (error) {
        console.error('❌ Erreur lecture zoom_tokens:', error);
        setStatus('not_connected');
        setError(`Erreur DB: ${error.message}`);
        return;
      }

      if (!data) {
        console.log('ℹ️ Aucun token Zoom trouvé');
        setStatus('not_connected');
        setTokenInfo(null);
        return;
      }

      console.log('📋 Token trouvé, vérification expiration...');
      setTokenInfo(data);

      // Vérifier si le token est expiré
      const expiresAt = new Date(data.expires_at);
      const now = new Date();
      
      if (expiresAt > now) {
        console.log('✅ Token valide jusqu\'au:', expiresAt.toLocaleString('fr-FR'));
        setStatus('connected');
      } else {
        console.log('⚠️ Token expiré depuis:', expiresAt.toLocaleString('fr-FR'));
        setStatus('expired');
      }

      setError(null);

    } catch (err) {
      console.error('❌ Erreur inattendue refresh status:', err);
      setStatus('not_connected');
      setError('Erreur de connexion à la base de données');
    }
  };

  // 🏓 Fonction pour tester la connexion N8N
  const testN8nConnection = async () => {
    setTesting(true);
    setTestResult(null);
    setError(null);

    try {
      console.log('🏓 Test connexion N8N...');
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ping-n8n`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        }
      });

      console.log('📡 Response ping N8N:', response.status, response.statusText);

      const result = await response.json();
      console.log('📋 Result ping N8N:', result);

      if (!response.ok || !result.ok) {
        const errorMsg = result.error || `Webhook N8N KO (status ${result.status || response.status})`;
        console.error('❌ Ping N8N échoué:', errorMsg);
        setError(errorMsg);
      } else {
        console.log('✅ Ping N8N réussi');
        setTestResult('Webhook N8N OK ✅');
      }

    } catch (err: any) {
      console.error('❌ Erreur test N8N:', err);
      setError(`Erreur test N8N: ${err?.message ?? String(err)}`);
    } finally {
      setTesting(false);
    }
  };

  // 🔄 Refresh automatique au montage et si user change
  useEffect(() => {
    refreshStatus();
  }, [user]);

  // 🔄 Refresh si URL contient ?connected=1 (après OAuth)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('connected') === '1') {
      console.log('🔄 OAuth réussi détecté, refresh du statut...');
      // Petit délai pour laisser N8N finir l'insertion
      setTimeout(refreshStatus, 1000);
      
      // Nettoyer l'URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, []);

  // 🎨 Rendu du badge de statut
  const renderStatusBadge = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="flex items-center space-x-2 px-3 py-2 bg-gray-100 rounded-lg">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
            <span className="text-gray-700 text-sm">Vérification...</span>
          </div>
        );
      
      case 'connected':
        return (
          <div className="flex items-center space-x-2 px-3 py-2 bg-green-100 rounded-lg">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-green-800 font-medium text-sm">Connecté à Zoom</span>
            {tokenInfo && (
              <span className="text-green-600 text-xs">
                (expire le {new Date(tokenInfo.expires_at).toLocaleDateString("fr-FR")})
              </span>
            )}
          </div>
        );
      
      case 'expired':
        return (
          <div className="flex items-center space-x-2 px-3 py-2 bg-orange-100 rounded-lg">
            <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
            <span className="text-orange-800 font-medium text-sm">Connexion expirée</span>
            {tokenInfo && (
              <span className="text-orange-600 text-xs">
                (expiré le {new Date(tokenInfo.expires_at).toLocaleDateString("fr-FR")})
              </span>
            )}
          </div>
        );
      
      case 'not_connected':
      default:
        return (
          <div className="flex items-center space-x-2 px-3 py-2 bg-red-100 rounded-lg">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-red-800 font-medium text-sm">Non connecté</span>
          </div>
        );
    }
  };

  // 🎨 Interface utilisateur principale
  return (
    <div className="space-y-4 p-4 bg-white border rounded-lg shadow-sm">
      
      {/* En-tête avec statut */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <span className="mr-2">🔵</span>
          État de la connexion Zoom
        </h3>
        {renderStatusBadge()}
      </div>

      {/* Test de connectivité N8N */}
      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Test de connectivité N8N</span>
          <button
            onClick={testN8nConnection}
            disabled={testing}
            className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {testing ? "Test en cours…" : "Tester le webhook N8N"}
          </button>
        </div>

        {/* Résultats du test */}
        {testResult && (
          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-800">
            {testResult}
          </div>
        )}

        {error && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
            Erreur webhook ❌ : {error}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="border-t pt-4 flex space-x-2">
        <button
          onClick={refreshStatus}
          disabled={status === 'loading'}
          className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          🔄 Actualiser l'état
        </button>

        {status === 'expired' && (
          <span className="text-xs text-gray-500 px-2 py-1">
            💡 Reconnectez-vous via le bouton "Connecter à Zoom" ci-dessous
          </span>
        )}
      </div>
    </div>
  );
};

export default ZoomConnectionStatus;
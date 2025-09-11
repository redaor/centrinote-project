// 🚀 Composant d'authentification Zoom via Supabase OAuth natif
// Remplace SimpleZoomAuth.tsx avec une interface simplifiée et fiable
// ================================================================

import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthProvider';
import { 
  signInWithZoomOAuth, 
  isZoomConnected, 
  disconnectZoom, 
  getZoomTokensFromSession 
} from '../../services/supabaseZoomAuth';

interface SupabaseZoomAuthProps {
  onConnectionChange?: (connected: boolean, tokens?: any) => void;
  className?: string;
}

export default function SupabaseZoomAuth({ onConnectionChange, className = '' }: SupabaseZoomAuthProps) {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<any>(null);

  useEffect(() => {
    if (user) {
      checkZoomConnection();
    }
  }, [user]);

  // Vérifier l'état de connexion Zoom
  const checkZoomConnection = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      const connected = await isZoomConnected();
      setIsConnected(connected);
      
      if (connected) {
        const tokens = await getZoomTokensFromSession();
        setTokenInfo(tokens);
        
        if (onConnectionChange) {
          onConnectionChange(true, tokens);
        }
        
        console.log('✅ Zoom connecté via Supabase OAuth');
      } else {
        console.log('ℹ️ Zoom non connecté');
        if (onConnectionChange) {
          onConnectionChange(false);
        }
      }
      
    } catch (error) {
      console.error('❌ Erreur vérification connexion Zoom:', error);
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  // Démarrer l'authentification Zoom
  const handleConnectZoom = async () => {
    if (!user) {
      alert('Veuillez vous connecter d\'abord');
      return;
    }

    try {
      setLoading(true);
      console.log('🚀 Démarrage authentification Zoom via Supabase OAuth...');
      
      const result = await signInWithZoomOAuth();
      
      if (!result.success) {
        console.error('❌ Erreur authentification Zoom:', result.error);
        alert(`Erreur: ${result.error}`);
        return;
      }
      
      console.log('✅ Authentification Zoom réussie');
      // La redirection vers Zoom est automatique
      
    } catch (error) {
      console.error('❌ Erreur connexion Zoom:', error);
      alert('Erreur lors de la connexion à Zoom');
    } finally {
      setLoading(false);
    }
  };

  // Déconnecter Zoom
  const handleDisconnectZoom = async () => {
    if (!user) return;

    const confirm = window.confirm('Êtes-vous sûr de vouloir déconnecter Zoom ?');
    if (!confirm) return;

    try {
      setLoading(true);
      
      const result = await disconnectZoom();
      
      if (!result.success) {
        console.error('❌ Erreur déconnexion Zoom:', result.error);
        alert(`Erreur: ${result.error}`);
        return;
      }
      
      setIsConnected(false);
      setTokenInfo(null);
      
      if (onConnectionChange) {
        onConnectionChange(false);
      }
      
      console.log('✅ Déconnexion Zoom réussie');
      
    } catch (error) {
      console.error('❌ Erreur déconnexion Zoom:', error);
      alert('Erreur lors de la déconnexion');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className={`p-4 bg-gray-100 rounded-lg ${className}`}>
        <p className="text-gray-600">Connectez-vous pour utiliser Zoom</p>
      </div>
    );
  }

  return (
    <div className={`p-4 bg-white border rounded-lg shadow-sm ${className}`}>
      {/* En-tête */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center">
          <span className="mr-2">🔵</span>
          Zoom via Supabase OAuth
        </h3>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
          isConnected 
            ? 'bg-green-100 text-green-800' 
            : 'bg-gray-100 text-gray-600'
        }`}>
          {isConnected ? '✅ Connecté' : '⚠️ Non connecté'}
        </div>
      </div>

      {/* Indicateur de chargement */}
      {loading && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            <p className="text-blue-700">Traitement en cours...</p>
          </div>
        </div>
      )}

      {/* État connecté */}
      {isConnected ? (
        <div className="space-y-3">
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-700 font-medium">✅ Zoom connecté via Supabase OAuth</p>
            <p className="text-green-600 text-sm mt-1">
              Gestion automatique des tokens (stockage, rafraîchissement, expiration)
            </p>
            {tokenInfo?.expires_at && (
              <p className="text-green-600 text-sm">
                Session expire le {new Date(tokenInfo.expires_at * 1000).toLocaleString('fr-FR')}
              </p>
            )}
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={checkZoomConnection}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
            >
              <span className="mr-2">🔄</span>
              Actualiser
            </button>
            
            <button
              onClick={handleDisconnectZoom}
              disabled={loading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center"
            >
              <span className="mr-2">🔌</span>
              Déconnecter
            </button>
          </div>
        </div>
      ) : (
        /* État non connecté */
        <div className="space-y-3">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-700 font-medium">🚀 Nouvelle méthode Supabase OAuth</p>
            <ul className="text-blue-600 text-sm mt-2 space-y-1">
              <li>• Gestion automatique des tokens par Supabase</li>
              <li>• Pas de gestion manuelle (Edge Functions, n8n, etc.)</li>
              <li>• Rafraîchissement automatique des tokens expirés</li>
              <li>• Sécurisé et conforme aux standards OAuth</li>
            </ul>
          </div>
          
          <button
            onClick={handleConnectZoom}
            disabled={loading}
            className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 font-medium flex items-center justify-center"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Connexion en cours...
              </>
            ) : (
              <>
                <span className="mr-2">🔵</span>
                Se connecter avec Zoom
              </>
            )}
          </button>
          
          <p className="text-xs text-gray-500 text-center">
            Authentification sécurisée via Supabase OAuth
          </p>
        </div>
      )}
    </div>
  );
}
// 📊 Composant d'affichage du statut de connexion Zoom
// Interface informative pour l'état de la connexion utilisateur
// ============================================================

import React, { useState, useEffect } from 'react';
import { Video, CheckCircle, XCircle, AlertCircle, RefreshCw, User } from 'lucide-react';
import { zoomOAuthService } from '../../services/zoomOAuthService';
import { ZoomUser, ZoomConnectionStatus } from '../../types/zoom';

interface ZoomConnectionStatusProps {
  onDisconnect?: () => void;
  showUserInfo?: boolean;
  compact?: boolean;
  className?: string;
}

export const ZoomConnectionStatus: React.FC<ZoomConnectionStatusProps> = ({
  onDisconnect,
  showUserInfo = true,
  compact = false,
  className = ''
}) => {
  const [status, setStatus] = useState<ZoomConnectionStatus>({
    connected: false,
    lastSync: undefined,
    error: undefined
  });
  const [userInfo, setUserInfo] = useState<ZoomUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Vérifier le statut de connexion
  const checkConnectionStatus = async () => {
    setIsLoading(true);
    
    try {
      const isConnected = await zoomOAuthService.isConnectedToZoom();
      
      if (isConnected) {
        const user = await zoomOAuthService.getZoomUserInfo();
        setUserInfo(user);
        
        setStatus({
          connected: true,
          user: user,
          lastSync: new Date().toISOString(),
          error: undefined
        });
      } else {
        setStatus({
          connected: false,
          user: undefined,
          lastSync: undefined,
          error: undefined
        });
        setUserInfo(null);
      }
    } catch (err) {
      console.error('❌ Erreur vérification statut Zoom:', err);
      setStatus({
        connected: false,
        user: undefined,
        lastSync: undefined,
        error: err instanceof Error ? err.message : 'Erreur inconnue'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Déconnecter de Zoom
  const handleDisconnect = async () => {
    try {
      const success = await zoomOAuthService.signOutFromZoom();
      if (success) {
        setStatus({
          connected: false,
          user: undefined,
          lastSync: undefined,
          error: undefined
        });
        setUserInfo(null);
        onDisconnect?.();
      }
    } catch (err) {
      console.error('❌ Erreur déconnexion:', err);
    }
  };

  useEffect(() => {
    checkConnectionStatus();
  }, []);

  if (isLoading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Vérification de la connexion...
        </span>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {status.connected ? (
          <>
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-sm text-green-600 dark:text-green-400">Zoom connecté</span>
          </>
        ) : (
          <>
            <XCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-600 dark:text-red-400">Zoom déconnecté</span>
          </>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className={`
            p-2 rounded-lg
            ${status.connected 
              ? 'bg-green-100 dark:bg-green-900/20' 
              : 'bg-red-100 dark:bg-red-900/20'
            }
          `}>
            {status.connected ? (
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            ) : status.error ? (
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            )}
          </div>

          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {status.connected ? 'Zoom Connecté' : 'Zoom Déconnecté'}
            </h3>
            
            {status.error && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                {status.error}
              </p>
            )}

            {status.connected && userInfo && showUserInfo && (
              <div className="mt-2 space-y-1">
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <User className="w-4 h-4" />
                  <span>{userInfo.display_name || `${userInfo.first_name} ${userInfo.last_name}`}</span>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-500">
                  {userInfo.email}
                </div>
              </div>
            )}

            {status.lastSync && (
              <div className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                Dernière synchronisation : {new Date(status.lastSync).toLocaleString('fr-FR')}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={checkConnectionStatus}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            title="Actualiser le statut"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {status.connected && (
            <button
              onClick={handleDisconnect}
              className="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title="Se déconnecter de Zoom"
            >
              Déconnecter
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
// 📊 Composant d'affichage du statut de connexion Google Meet
// Interface informative pour l'état de la connexion utilisateur
// =============================================================

import React, { useState } from 'react';
import { Calendar, CheckCircle, XCircle, AlertCircle, RefreshCw, User } from 'lucide-react';
import { useGoogleMeet } from '../../hooks/useGoogleMeet';
import { GoogleUser, GoogleConnectionStatus } from '../../types/google-meet';

interface GoogleMeetConnectionStatusProps {
  onDisconnect?: () => void;
  showUserInfo?: boolean;
  compact?: boolean;
  className?: string;
}

export const GoogleMeetConnectionStatus: React.FC<GoogleMeetConnectionStatusProps> = ({
  onDisconnect,
  showUserInfo = true,
  compact = false,
  className = ''
}) => {
  // Utiliser le hook centralisé pour l'état de connexion
  const { isConnected, isLoading, user, error, checkConnection, disconnect } = useGoogleMeet();
  
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Rafraîchir le statut de connexion
  const handleRefresh = async () => {
    await checkConnection();
    setLastRefresh(new Date());
  };

  // Déconnecter de Google Meet
  const handleDisconnect = async () => {
    try {
      const success = await disconnect();
      if (success) {
        onDisconnect?.();
      }
    } catch (err) {
      console.error('❌ Erreur déconnexion:', err);
    }
  };

  if (isLoading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Vérification de la connexion Google Meet...
        </span>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {isConnected ? (
          <>
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-sm text-green-600 dark:text-green-400">Google Meet connecté</span>
          </>
        ) : (
          <>
            <XCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-600 dark:text-red-400">Google Meet déconnecté</span>
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
            ${isConnected 
              ? 'bg-green-100 dark:bg-green-900/20' 
              : 'bg-red-100 dark:bg-red-900/20'
            }
          `}>
            {isConnected ? (
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            ) : error ? (
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            )}
          </div>

          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {isConnected ? 'Google Meet Connecté' : 'Google Meet Déconnecté'}
            </h3>
            
            {error && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                {error}
              </p>
            )}

            {isConnected && user && showUserInfo && (
              <div className="mt-2 space-y-1">
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <User className="w-4 h-4" />
                  <span>{user.name}</span>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-500">
                  {user.email}
                </div>
                {user.picture && (
                  <div className="flex items-center space-x-2 mt-2">
                    <img 
                      src={user.picture} 
                      alt={user.name}
                      className="w-8 h-8 rounded-full"
                    />
                  </div>
                )}
              </div>
            )}

            {lastRefresh && (
              <div className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                Dernière vérification : {lastRefresh.toLocaleString('fr-FR')}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleRefresh}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            title="Actualiser le statut"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {isConnected && (
            <button
              onClick={handleDisconnect}
              className="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title="Se déconnecter de Google Meet"
            >
              Déconnecter
            </button>
          )}
        </div>
      </div>

      {/* Informations additionnelles pour Google Meet */}
      {isConnected && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <Calendar className="w-4 h-4" />
            <span>Accès à Google Calendar et Google Meet activé</span>
          </div>
        </div>
      )}
    </div>
  );
};
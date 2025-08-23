import React, { useState } from 'react';
import { X, Video, Shield, Loader, AlertCircle } from 'lucide-react';

interface ZoomAuthDialogProps {
  onAuthenticate: (method: 'sdk' | 'oauth') => Promise<void>;
  onClose: () => void;
  darkMode: boolean;
}

export function ZoomAuthDialog({ onAuthenticate, onClose, darkMode }: ZoomAuthDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuthenticate = async (method: 'sdk' | 'oauth') => {
    try {
      setLoading(true);
      setError(null);
      await onAuthenticate(method);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur d\'authentification');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={onClose} />
      
      {/* Dialog */}
      <div className={`
        fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50
        ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-xl p-6 w-full max-w-md
      `}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <Video className="w-5 h-5 text-white" />
            </div>
            <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Connexion Zoom
            </h2>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded-lg hover:bg-gray-100 ${darkMode ? 'hover:bg-gray-700' : ''}`}
          >
            <X className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className={`
            ${darkMode ? 'bg-red-900/20 border-red-800 text-red-400' : 'bg-red-50 border-red-200 text-red-700'}
            border rounded-lg p-3 mb-4 flex items-center space-x-2
          `}>
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Content */}
        <div className="space-y-4">
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Connectez votre compte Zoom pour créer et gérer vos réunions directement depuis Centrinote.
          </p>

          {/* SDK Authentication Option */}
          <div className={`
            ${darkMode ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'}
            border rounded-lg p-4 space-y-3
          `}>
            <div className="flex items-start space-x-3">
              <Shield className="w-5 h-5 text-green-500 mt-0.5" />
              <div className="flex-1">
                <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Authentification Sécurisée (Recommandé)
                </h3>
                <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Connexion rapide et sécurisée sans partager vos identifiants
                </p>
                <ul className={`text-xs mt-2 space-y-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                  <li>• Aucun mot de passe stocké</li>
                  <li>• Connexion instantanée</li>
                  <li>• Sécurité maximale</li>
                </ul>
              </div>
            </div>
            
            <button
              onClick={() => handleAuthenticate('sdk')}
              disabled={loading}
              className={`
                w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-lg
                bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium
                hover:from-blue-600 hover:to-blue-700 transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {loading ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <Video className="w-4 h-4" />
              )}
              <span>Se connecter avec Zoom</span>
            </button>
          </div>

          {/* OAuth Option (Future) */}
          <div className={`
            ${darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50/50'}
            border rounded-lg p-4 opacity-60
          `}>
            <div className="flex items-start space-x-3">
              <Video className="w-5 h-5 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <h3 className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  OAuth (Bientôt disponible)
                </h3>
                <p className={`text-sm mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                  Connexion via l'API officielle Zoom OAuth
                </p>
              </div>
            </div>
            
            <button
              disabled
              className={`
                w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-lg mt-3
                ${darkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-200 text-gray-400'}
                cursor-not-allowed
              `}
            >
              <Video className="w-4 h-4" />
              <span>OAuth (En développement)</span>
            </button>
          </div>

          {/* Security Notice */}
          <div className={`
            ${darkMode ? 'bg-blue-900/20 border-blue-800 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-800'}
            border rounded-lg p-3 text-sm
          `}>
            <div className="flex items-start space-x-2">
              <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Sécurité garantie</p>
                <p className="text-xs opacity-80 mt-1">
                  Vos identifiants Zoom ne sont jamais stockés sur nos serveurs. 
                  La connexion utilise des tokens sécurisés et temporaires.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={loading}
            className={`
              w-full py-2.5 px-4 rounded-lg border font-medium transition-colors
              ${darkMode
                ? 'border-gray-600 text-gray-300 hover:bg-gray-700 disabled:opacity-50'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50'
              }
            `}
          >
            Annuler
          </button>
        </div>
      </div>
    </>
  );
}
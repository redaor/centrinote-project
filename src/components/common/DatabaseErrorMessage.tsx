import React from 'react';
import { AlertCircle, Database, Terminal, RefreshCw } from 'lucide-react';

interface DatabaseErrorMessageProps {
  error: string;
  onRetry?: () => void;
  darkMode?: boolean;
}

export function DatabaseErrorMessage({ error, onRetry, darkMode = false }: DatabaseErrorMessageProps) {
  const isMigrationError = error.includes('table') || error.includes('relation') || error.includes('migrations');

  return (
    <div className={`
      min-h-[400px] flex items-center justify-center p-8
      ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}
    `}>
      <div className={`
        max-w-lg text-center space-y-6 p-8 rounded-xl border
        ${darkMode 
          ? 'bg-gray-800 border-gray-700 text-gray-100' 
          : 'bg-white border-gray-200 text-gray-900'
        }
      `}>
        {/* Icône */}
        <div className="flex justify-center">
          <div className={`
            p-4 rounded-full
            ${isMigrationError 
              ? darkMode ? 'bg-yellow-900/20 text-yellow-400' : 'bg-yellow-50 text-yellow-600'
              : darkMode ? 'bg-red-900/20 text-red-400' : 'bg-red-50 text-red-600'
            }
          `}>
            {isMigrationError ? (
              <Database className="w-8 h-8" />
            ) : (
              <AlertCircle className="w-8 h-8" />
            )}
          </div>
        </div>

        {/* Titre */}
        <div>
          <h3 className={`text-xl font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {isMigrationError ? 'Base de données non initialisée' : 'Erreur de chargement'}
          </h3>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {error}
          </p>
        </div>

        {/* Instructions pour les erreurs de migration */}
        {isMigrationError && (
          <div className={`
            p-4 rounded-lg text-left text-sm space-y-3
            ${darkMode ? 'bg-yellow-900/10 border border-yellow-800' : 'bg-yellow-50 border border-yellow-200'}
          `}>
            <div className="flex items-center space-x-2">
              <Terminal className="w-4 h-4 text-yellow-500" />
              <span className="font-medium">Étapes pour résoudre :</span>
            </div>
            
            <div className="ml-6 space-y-2">
              <p>1. Ouvrez un terminal dans le dossier du projet</p>
              <p>2. Exécutez : <code className={`px-2 py-1 rounded font-mono text-xs ${
                darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-800'
              }`}>supabase db push</code></p>
              <p>3. Ou appliquez les migrations manuellement</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-center space-x-4">
          {onRetry && (
            <button
              onClick={onRetry}
              className={`
                flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                ${darkMode
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
                }
              `}
            >
              <RefreshCw className="w-4 h-4" />
              <span>Réessayer</span>
            </button>
          )}
          
          <button
            onClick={() => window.location.reload()}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-colors border
              ${darkMode
                ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }
            `}
          >
            Recharger la page
          </button>
        </div>

        {/* Information supplémentaire */}
        <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          {isMigrationError ? (
            <>
              Les tables de base de données sont manquantes. Ceci est normal 
              lors de la première installation ou après une mise à jour.
            </>
          ) : (
            <>
              Si le problème persiste, vérifiez votre connexion à Supabase
              et l'état de votre base de données.
            </>
          )}
        </div>
      </div>
    </div>
  );
}
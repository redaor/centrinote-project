// 📝 Card principale pour la création de réunions avec neurodesign
import React from 'react';
import { Calendar, Users, CheckCircle, AlertCircle } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';

interface MeetingCreateCardProps {
  children: React.ReactNode;
  progress: {
    completed: number;
    total: number;
    percentage: number;
    isComplete: boolean;
  };
  onSubmit: (e: React.FormEvent) => void;
  loading?: boolean;
  error?: string | null;
}

export function MeetingCreateCard({ 
  children, 
  progress, 
  onSubmit, 
  loading = false,
  error 
}: MeetingCreateCardProps) {
  const { state } = useApp();
  const { darkMode } = state;

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} p-6`}>
      <div className="max-w-6xl mx-auto">
        {/* Header avec titre et progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className={`text-3xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                📅 Créer une Réunion
              </h1>
              <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Nouvelle réunion vidéo sécurisée avec Daily.co
              </p>
            </div>
            
            {/* Badge de statut */}
            <div className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-all duration-200 ${
              progress.isComplete
                ? 'bg-green-100 text-green-800 border border-green-200'
                : 'bg-blue-100 text-blue-800 border border-blue-200'
            }`}>
              {progress.isComplete ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <Calendar className="w-4 h-4" />
              )}
              <span className="text-sm font-medium">
                {progress.isComplete ? '✓ Prêt' : 'Configuration'}
              </span>
            </div>
          </div>

          {/* Barre de progression avec gamification */}
          <div className={`p-4 rounded-lg border ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm font-medium ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Progression de la configuration
              </span>
              <span className={`text-sm ${
                progress.isComplete 
                  ? 'text-green-600 font-semibold' 
                  : (darkMode ? 'text-gray-400' : 'text-gray-600')
              }`}>
                {progress.completed}/{progress.total} étapes
              </span>
            </div>
            
            {/* Barre de progression animée */}
            <div className={`w-full h-2 rounded-full overflow-hidden ${
              darkMode ? 'bg-gray-700' : 'bg-gray-200'
            }`}>
              <div 
                className={`h-full rounded-full transition-all duration-500 ease-out ${
                  progress.isComplete 
                    ? 'bg-gradient-to-r from-green-500 to-green-600' 
                    : 'bg-gradient-to-r from-blue-500 to-blue-600'
                }`}
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
            
            {/* Détails des étapes */}
            <div className="flex items-center justify-between mt-3 text-xs">
              <div className="flex items-center space-x-4">
                <div className={`flex items-center space-x-1 ${
                  progress.completed >= 1 ? 'text-green-600' : (darkMode ? 'text-gray-500' : 'text-gray-400')
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    progress.completed >= 1 ? 'bg-green-500' : 'bg-gray-300'
                  }`} />
                  <span>Organisateur</span>
                </div>
                
                <div className={`flex items-center space-x-1 ${
                  progress.completed >= 2 ? 'text-green-600' : (darkMode ? 'text-gray-500' : 'text-gray-400')
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    progress.completed >= 2 ? 'bg-green-500' : 'bg-gray-300'
                  }`} />
                  <span>Participants</span>
                </div>
                
                <div className={`flex items-center space-x-1 ${
                  progress.completed >= 3 ? 'text-green-600' : (darkMode ? 'text-gray-500' : 'text-gray-400')
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    progress.completed >= 3 ? 'bg-green-500' : 'bg-gray-300'
                  }`} />
                  <span>Validation</span>
                </div>
              </div>
              
              {progress.isComplete && (
                <div className="flex items-center space-x-1 text-green-600">
                  <CheckCircle className="w-3 h-3" />
                  <span className="font-medium">Configuration terminée</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Message d'erreur global */}
        {error && (
          <div className={`mb-6 p-4 rounded-lg border animate-in slide-in-from-top duration-200 ${
            darkMode 
              ? 'bg-red-900/20 border-red-800 text-red-300' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <div>
                <span className="font-medium">Erreur</span>
                <p className="text-sm mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Formulaire principal */}
        <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg shadow-sm transition-shadow duration-200 hover:shadow-md`}>
          <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Configuration de la réunion
            </h2>
            <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Remplissez les informations nécessaires pour créer votre réunion
            </p>
          </div>

          <form onSubmit={onSubmit} className="p-6">
            {children}
          </form>
        </div>

        {/* Footer avec informations Daily.co */}
        <div className={`mt-6 p-4 rounded-lg border ${
          darkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-center space-x-2 mb-2">
            <Users className={`w-4 h-4 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            <span className={`text-sm font-medium ${darkMode ? 'text-blue-400' : 'text-blue-800'}`}>
              Réunion Daily.co - Fonctionnalités incluses
            </span>
          </div>
          <ul className={`text-xs space-y-1 ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
            <li>✅ Qualité HD avec audio cristallin</li>
            <li>✅ Enregistrement automatique dans le cloud</li>
            <li>✅ Partage d'écran et chat intégré</li>
            <li>✅ Chiffrement de bout en bout</li>
            <li>✅ Transcription automatique via IA</li>
            <li>✅ Résumé et points d'action générés</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
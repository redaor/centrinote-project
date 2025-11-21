// 🎯 Barre d'actions avec boutons adaptatifs et feedback
import React from 'react';
import { ArrowLeft, RotateCcw, Video, Calendar, Loader2, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';

interface ActionsBarProps {
  onReset: () => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  canSubmit: boolean;
  isScheduled: boolean;
  scheduledDisplayDate?: string;
}

export function ActionsBar({
  onReset,
  onSubmit,
  loading,
  canSubmit,
  isScheduled,
  scheduledDisplayDate
}: ActionsBarProps) {
  const navigate = useNavigate();
  const { state } = useApp();
  const { darkMode } = state;

  return (
    <div className="space-y-4">
      {/* Aperçu de l'action */}
      {canSubmit && (
        <div className={`p-4 rounded-lg border animate-in slide-in-from-bottom duration-200 ${
          darkMode 
            ? 'bg-blue-900/20 border-blue-800' 
            : 'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-full ${
              darkMode ? 'bg-blue-800' : 'bg-blue-100'
            }`}>
              {isScheduled ? (
                <Calendar className={`w-5 h-5 ${darkMode ? 'text-blue-300' : 'text-blue-600'}`} />
              ) : (
                <Video className={`w-5 h-5 ${darkMode ? 'text-blue-300' : 'text-blue-600'}`} />
              )}
            </div>
            <div className="flex-1">
              <div className={`font-medium ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>
                {isScheduled ? '📅 Réunion programmée' : '🚀 Lancement immédiat'}
              </div>
              <div className={`text-sm ${darkMode ? 'text-blue-400' : 'text-blue-700'}`}>
                {isScheduled 
                  ? `La réunion sera disponible le ${scheduledDisplayDate}`
                  : 'La réunion sera créée et ouverte dans un nouvel onglet'
                }
              </div>
            </div>
            <CheckCircle className={`w-5 h-5 text-green-500`} />
          </div>
        </div>
      )}

      {/* Actions principales */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 sm:space-x-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        {/* Actions secondaires */}
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={() => navigate('/meetings')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg border font-medium transition-all duration-150 hover:scale-105 active:scale-95 ${
              darkMode 
                ? 'border-gray-600 text-gray-400 hover:text-white hover:bg-gray-700 hover:shadow-md'
                : 'border-gray-300 text-gray-600 hover:text-gray-900 hover:bg-gray-100 hover:shadow-md'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour</span>
          </button>

          <button
            type="button"
            onClick={onReset}
            disabled={loading}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg border font-medium transition-all duration-150 hover:scale-105 active:scale-95 ${
              loading
                ? 'border-gray-300 text-gray-400 cursor-not-allowed'
                : darkMode 
                  ? 'border-gray-600 text-gray-400 hover:text-white hover:bg-gray-700 hover:shadow-md'
                  : 'border-gray-300 text-gray-600 hover:text-gray-900 hover:bg-gray-100 hover:shadow-md'
            }`}
          >
            <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Réinitialiser</span>
          </button>
        </div>

        {/* Action principale */}
        <button
          type="submit"
          onClick={onSubmit}
          disabled={!canSubmit || loading}
          className={`flex items-center justify-center space-x-3 px-8 py-3 rounded-lg font-semibold transition-all duration-200 min-w-[200px] ${
            canSubmit && !loading
              ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Création...</span>
            </>
          ) : (
            <>
              {isScheduled ? (
                <Calendar className="w-5 h-5" />
              ) : (
                <Video className="w-5 h-5" />
              )}
              <span>
                {isScheduled ? 'Planifier la Réunion' : 'Créer & Lancer'}
              </span>
            </>
          )}
        </button>
      </div>

      {/* Message d'aide */}
      {!canSubmit && !loading && (
        <div className={`text-center text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          💡 Complétez tous les champs requis pour activer la création
        </div>
      )}

      {/* Conseils selon le mode */}
      <div className={`text-xs space-y-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
        {isScheduled ? (
          <>
            <p>📅 <strong>Réunion planifiée :</strong> Les participants recevront une invitation avec le lien.</p>
            <p>🔔 Un rappel sera envoyé 15 minutes avant le début.</p>
          </>
        ) : (
          <>
            <p>🚀 <strong>Démarrage immédiat :</strong> La réunion s'ouvrira dans un nouvel onglet.</p>
            <p>📧 Les invitations seront envoyées automatiquement aux participants.</p>
          </>
        )}
      </div>
    </div>
  );
}
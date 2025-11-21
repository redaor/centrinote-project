// ⏰ Composant pour choisir entre "maintenant" ou "planifié"
import React from 'react';
import { Clock, Calendar, AlertCircle, CheckCircle } from 'lucide-react';
import { SchedulingMode } from '../../hooks/useScheduling';
import { useApp } from '../../contexts/AppContext';

interface SchedulingBlockProps {
  mode: SchedulingMode;
  scheduledDate: string;
  timezone: string;
  isValid: boolean;
  validationError: string | null;
  displayDate: string;
  
  onModeChange: (mode: SchedulingMode) => void;
  onDateChange: (date: string) => void;
  onTimezoneChange: (tz: string) => void;
}

// Timezones communes pour la France
const COMMON_TIMEZONES = [
  { value: 'Europe/Paris', label: 'Paris (France)' },
  { value: 'Europe/London', label: 'Londres (UK)' },
  { value: 'Europe/Berlin', label: 'Berlin (Allemagne)' },
  { value: 'America/New_York', label: 'New York (EST)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' }
];

export function SchedulingBlock({
  mode,
  scheduledDate,
  timezone,
  isValid,
  validationError,
  displayDate,
  onModeChange,
  onDateChange,
  onTimezoneChange
}: SchedulingBlockProps) {
  const { state } = useApp();
  const { darkMode } = state;

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Clock className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
        <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Planification
        </h3>
        {isValid && mode === 'scheduled' && (
          <CheckCircle className="w-4 h-4 text-green-500" />
        )}
      </div>

      {/* Sélecteur de mode */}
      <div className="space-y-3">
        {/* Option: Démarrer maintenant */}
        <label 
          className={`flex items-center space-x-3 p-4 rounded-lg border cursor-pointer transition-all duration-150 ${
            mode === 'now'
              ? (darkMode 
                  ? 'border-blue-500 bg-blue-900/20 ring-2 ring-blue-500/20' 
                  : 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/20'
                )
              : (darkMode 
                  ? 'border-gray-600 hover:border-gray-500' 
                  : 'border-gray-300 hover:border-gray-400'
                )
          }`}
        >
          <input
            type="radio"
            name="scheduling-mode"
            value="now"
            checked={mode === 'now'}
            onChange={() => onModeChange('now')}
            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
          />
          <div className="flex-1">
            <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              🚀 Démarrer maintenant
            </div>
            <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Créer et lancer la réunion immédiatement
            </div>
          </div>
        </label>

        {/* Option: Planifier */}
        <label 
          className={`flex items-center space-x-3 p-4 rounded-lg border cursor-pointer transition-all duration-150 ${
            mode === 'scheduled'
              ? (darkMode 
                  ? 'border-blue-500 bg-blue-900/20 ring-2 ring-blue-500/20' 
                  : 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/20'
                )
              : (darkMode 
                  ? 'border-gray-600 hover:border-gray-500' 
                  : 'border-gray-300 hover:border-gray-400'
                )
          }`}
        >
          <input
            type="radio"
            name="scheduling-mode"
            value="scheduled"
            checked={mode === 'scheduled'}
            onChange={() => onModeChange('scheduled')}
            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
          />
          <div className="flex-1">
            <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              📅 Planifier à une heure précise
            </div>
            <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Programmer la réunion pour plus tard
            </div>
          </div>
        </label>
      </div>

      {/* Détails de planification (si mode = scheduled) */}
      {mode === 'scheduled' && (
        <div className={`space-y-4 p-4 rounded-lg border animate-in slide-in-from-top duration-200 ${
          darkMode 
            ? 'bg-gray-700/50 border-gray-600' 
            : 'bg-gray-50 border-gray-200'
        }`}>
          {/* Date et heure */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                <Calendar className="w-4 h-4 inline mr-1" />
                Date et heure
              </label>
              <input
                type="datetime-local"
                value={scheduledDate}
                onChange={(e) => onDateChange(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className={`w-full px-3 py-2 rounded-lg border transition-colors focus:outline-none focus:ring-2 ${
                  validationError
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500/20'
                } ${
                  darkMode 
                    ? 'bg-gray-600 text-white' 
                    : 'bg-white text-gray-900'
                }`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                🌍 Fuseau horaire
              </label>
              <select
                value={timezone}
                onChange={(e) => onTimezoneChange(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-500/20 ${
                  darkMode 
                    ? 'bg-gray-600 text-white border-gray-500' 
                    : 'bg-white text-gray-900 border-gray-300'
                }`}
              >
                {COMMON_TIMEZONES.map(tz => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Aperçu de la date */}
          <div className={`p-3 rounded-lg ${
            darkMode ? 'bg-gray-600' : 'bg-white'
          }`}>
            <div className={`text-sm font-medium mb-1 ${
              darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              📅 Aperçu
            </div>
            <div className={`text-base ${
              isValid 
                ? (darkMode ? 'text-white' : 'text-gray-900')
                : 'text-red-500'
            }`}>
              {displayDate}
            </div>
          </div>

          {/* Message de validation */}
          {validationError && (
            <div className={`flex items-center space-x-2 p-3 rounded-lg ${
              darkMode 
                ? 'bg-red-900/20 text-red-300 border border-red-800' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{validationError}</span>
            </div>
          )}

          {/* Conseils */}
          <div className={`text-xs space-y-1 ${
            darkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            <p>💡 <strong>Conseil :</strong> Prévoyez 5-10 minutes avant l'heure prévue pour que les participants puissent se connecter.</p>
            <p>🔔 Les participants recevront une invitation avec le lien de la réunion.</p>
          </div>
        </div>
      )}
    </div>
  );
}
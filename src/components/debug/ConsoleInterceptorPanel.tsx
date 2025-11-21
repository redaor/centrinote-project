/**
 * 🎛️ Panneau de contrôle pour Console Error Interceptor
 *
 * Interface visuelle pour activer/désactiver l'interception des console.error
 * Utile pour le debugging et les tests.
 */

import React, { useState } from 'react';
import { Shield, ShieldOff, Bug, AlertCircle, CheckCircle, Settings } from 'lucide-react';
import { useConsoleInterceptor } from '../../hooks/useConsoleInterceptor';

interface ConsoleInterceptorPanelProps {
  /** Position du panneau (coin de l'écran) */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

  /** Mode dark */
  darkMode?: boolean;

  /** Masquer par défaut (afficher seulement au hover) */
  hideByDefault?: boolean;
}

export function ConsoleInterceptorPanel({
  position = 'bottom-right',
  darkMode = false,
  hideByDefault = false,
}: ConsoleInterceptorPanelProps) {
  const { enable, disable, toggle, isEnabled, stats, presets } = useConsoleInterceptor();

  const [isExpanded, setIsExpanded] = useState(!hideByDefault);
  const [customKeywords, setCustomKeywords] = useState('');

  // Position CSS
  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
  }[position];

  // Couleurs
  const bgClass = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const textClass = darkMode ? 'text-white' : 'text-gray-900';
  const textMutedClass = darkMode ? 'text-gray-400' : 'text-gray-600';
  const buttonActiveClass = darkMode
    ? 'bg-blue-600 text-white hover:bg-blue-700'
    : 'bg-blue-500 text-white hover:bg-blue-600';
  const buttonInactiveClass = darkMode
    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
    : 'bg-gray-200 text-gray-700 hover:bg-gray-300';

  const handleCustomKeywords = () => {
    const keywords = customKeywords
      .split(',')
      .map(k => k.trim())
      .filter(Boolean);

    if (keywords.length > 0) {
      presets.blockKeywords(keywords);
    }
  };

  return (
    <div
      className={`fixed ${positionClasses} z-[9999] ${
        hideByDefault && !isExpanded ? 'opacity-50 hover:opacity-100' : ''
      } transition-opacity`}
    >
      {/* Bouton Toggle */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className={`${bgClass} ${textClass} border rounded-full p-3 shadow-lg hover:shadow-xl transition-all`}
          title="Ouvrir Console Interceptor"
        >
          {isEnabled ? (
            <Shield className="w-6 h-6 text-blue-500" />
          ) : (
            <ShieldOff className="w-6 h-6 text-gray-400" />
          )}
        </button>
      )}

      {/* Panneau étendu */}
      {isExpanded && (
        <div
          className={`${bgClass} ${textClass} border rounded-xl shadow-2xl p-4 w-80 space-y-4 animate-slide-up`}
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className={`w-5 h-5 ${isEnabled ? 'text-blue-500' : 'text-gray-400'}`} />
              <h3 className="font-semibold text-sm">Console Interceptor</h3>
            </div>

            <button
              onClick={() => setIsExpanded(false)}
              className={`${textMutedClass} hover:${textClass} transition-colors`}
              title="Réduire"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>

          {/* État actuel */}
          <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">État</span>
              <div className="flex items-center space-x-2">
                {isEnabled ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-xs text-green-500 font-semibold">ACTIF</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-400 font-semibold">INACTIF</span>
                  </>
                )}
              </div>
            </div>

            {isEnabled && (
              <div className="flex items-center justify-between text-xs space-x-4">
                <div className="flex items-center space-x-1">
                  <span className={textMutedClass}>Bloquées:</span>
                  <span className="font-mono font-bold text-red-500">{stats.blocked}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className={textMutedClass}>Autorisées:</span>
                  <span className="font-mono font-bold text-green-500">{stats.allowed}</span>
                </div>
              </div>
            )}
          </div>

          {/* Toggle principal */}
          <button
            onClick={toggle}
            className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
              isEnabled ? buttonActiveClass : buttonInactiveClass
            }`}
          >
            {isEnabled ? 'Désactiver interception' : 'Activer interception'}
          </button>

          {/* Presets */}
          <div className="space-y-2">
            <label className={`text-xs font-semibold ${textMutedClass}`}>Presets rapides</label>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={presets.blockAll}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  darkMode
                    ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50'
                    : 'bg-red-100 text-red-700 hover:bg-red-200'
                }`}
              >
                🚫 Tout bloquer
              </button>

              <button
                onClick={presets.blockNavigation}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  darkMode
                    ? 'bg-orange-900/30 text-orange-400 hover:bg-orange-900/50'
                    : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                }`}
              >
                🧭 Navigation
              </button>

              <button
                onClick={presets.blockLoops}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  darkMode
                    ? 'bg-yellow-900/30 text-yellow-400 hover:bg-yellow-900/50'
                    : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                }`}
              >
                🔁 Loops
              </button>

              <button
                onClick={presets.blockCors}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  darkMode
                    ? 'bg-purple-900/30 text-purple-400 hover:bg-purple-900/50'
                    : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                }`}
              >
                🌐 CORS
              </button>
            </div>
          </div>

          {/* Mots-clés personnalisés */}
          <div className="space-y-2">
            <label className={`text-xs font-semibold ${textMutedClass}`}>Mots-clés custom</label>

            <div className="flex space-x-2">
              <input
                type="text"
                value={customKeywords}
                onChange={e => setCustomKeywords(e.target.value)}
                placeholder="ex: navigation, loop"
                className={`flex-1 px-3 py-2 rounded-lg text-xs border ${
                  darkMode
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />

              <button
                onClick={handleCustomKeywords}
                disabled={!customKeywords.trim()}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  customKeywords.trim()
                    ? darkMode
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                OK
              </button>
            </div>

            <p className={`text-xs ${textMutedClass}`}>
              Séparez les mots-clés par des virgules
            </p>
          </div>

          {/* Mode Debug */}
          <button
            onClick={presets.enableDebug}
            className={`w-full px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-center space-x-2 transition-colors ${
              darkMode
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <Bug className="w-4 h-4" />
            <span>Activer mode Debug</span>
          </button>
        </div>
      )}
    </div>
  );
}

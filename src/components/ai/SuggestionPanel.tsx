/**
 * Panneau de suggestions intelligentes
 * Affiche les corrections et suggestions de complétion
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Lightbulb, Sparkles, X } from 'lucide-react';
import type { Suggestion } from '../../hooks/useTextCorrection';

interface SuggestionPanelProps {
  suggestions: Suggestion[];
  onApply: (suggestionId: string) => void;
  onDismiss: (suggestionId: string) => void;
  onDismissAll: () => void;
  isVisible?: boolean;
}

export function SuggestionPanel({
  suggestions,
  onApply,
  onDismiss,
  onDismissAll,
  isVisible = true,
}: SuggestionPanelProps) {
  if (!isVisible || suggestions.length === 0) return null;

  const getSuggestionIcon = (type: Suggestion['type']) => {
    switch (type) {
      case 'correction':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'completion':
        return <Lightbulb className="w-4 h-4 text-yellow-500" />;
      case 'rephrase':
        return <Sparkles className="w-4 h-4 text-purple-500" />;
      default:
        return <CheckCircle className="w-4 h-4 text-blue-500" />;
    }
  };

  const getSuggestionLabel = (type: Suggestion['type']) => {
    switch (type) {
      case 'correction':
        return 'Correction';
      case 'completion':
        return 'Suggestion';
      case 'rephrase':
        return 'Reformulation';
      default:
        return 'Suggestion';
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="absolute bottom-full left-0 right-0 mb-2 rounded-lg shadow-lg border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 overflow-hidden"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.2 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Suggestions intelligentes
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
              {suggestions.length}
            </span>
          </div>
          <button
            onClick={onDismissAll}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Tout ignorer"
          >
            <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Liste de suggestions */}
        <div className="max-h-48 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <motion.div
              key={suggestion.id}
              className="flex items-start gap-3 px-3 py-2 border-b last:border-b-0 border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              {/* Icône de type */}
              <div className="flex-shrink-0 mt-0.5">
                {getSuggestionIcon(suggestion.type)}
              </div>

              {/* Contenu */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    {getSuggestionLabel(suggestion.type)}
                  </span>
                  {suggestion.confidence && (
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      suggestion.confidence >= 0.9
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                    }`}>
                      {Math.round(suggestion.confidence * 100)}%
                    </span>
                  )}
                </div>

                {/* Texte original vs suggestion */}
                {suggestion.originalText && (
                  <div className="text-xs mb-1 text-gray-400 dark:text-gray-500">
                    <span className="line-through">{suggestion.originalText}</span>
                    <span className="mx-2">→</span>
                  </div>
                )}

                <p className="text-sm text-gray-700 dark:text-gray-200">
                  {suggestion.text}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <motion.button
                  onClick={() => onApply(suggestion.id)}
                  className="px-2 py-1 text-xs rounded font-medium transition-colors bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 text-white"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Appliquer
                </motion.button>
                <button
                  onClick={() => onDismiss(suggestion.id)}
                  className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors`}
                  aria-label="Ignorer"
                >
                  <X className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Footer avec info */}
        <div className="px-3 py-2 text-xs text-gray-500 bg-gray-50 dark:bg-gray-800/50">
          💡 Les corrections de haute confiance sont appliquées automatiquement
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

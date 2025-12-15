/**
 * Composant SmartInput réutilisable
 * Input/Textarea avec correction automatique et suggestions intelligentes intégrées
 */

import React, { useCallback } from 'react';
import { useTextCorrection } from '../../hooks/useTextCorrection';
import { SuggestionPanel } from '../ai/SuggestionPanel';

interface SmartInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  disabled?: boolean;
  darkMode?: boolean;
  multiline?: boolean;
  maxHeight?: number;
  className?: string;
  id?: string;
  autoFocus?: boolean;
  enableCorrection?: boolean;
  enableSuggestions?: boolean;
  enableReformulations?: boolean;
  allowEmpty?: boolean; // Permet la saisie différée ("Saisir plus tard")
  aiApiKey?: string;
}

export function SmartInput({
  value,
  onChange,
  onSubmit,
  placeholder = 'Tapez votre message...',
  disabled = false,
  darkMode = false,
  multiline = true,
  maxHeight = 100,
  className = '',
  id,
  autoFocus = false,
  enableCorrection = true,
  enableSuggestions = true,
  enableReformulations = false,
  allowEmpty = false,
  aiApiKey,
}: SmartInputProps) {
  const {
    suggestions,
    isAnalyzing,
    aiAvailable,
    applyAutoCorrections,
    analyzeLater,
    applySuggestion,
    clearSuggestions,
  } = useTextCorrection({
    enableAutoCorrect: enableCorrection,
    enableSuggestions: enableSuggestions,
    enableReformulations: enableReformulations,
    minConfidence: 0.7,
    debounceMs: 300,
    aiApiKey: aiApiKey,
  });

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      const rawValue = e.target.value;

      // Appliquer les corrections automatiques de haute confiance
      const correctedValue = enableCorrection ? applyAutoCorrections(rawValue) : rawValue;
      onChange(correctedValue);

      // Analyser pour les suggestions
      if (enableSuggestions) {
        analyzeLater(correctedValue);
      }

      // Ajuster la hauteur si multiline
      if (multiline && 'style' in e.target) {
        e.target.style.height = 'auto';
        e.target.style.height = `${Math.min(e.target.scrollHeight, maxHeight)}px`;
      }
    },
    [onChange, enableCorrection, enableSuggestions, applyAutoCorrections, analyzeLater, multiline, maxHeight]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      // Entrée sans Shift = soumettre (si multiline)
      if (e.key === 'Enter' && !e.shiftKey && multiline) {
        e.preventDefault();
        clearSuggestions();
        if (onSubmit) {
          onSubmit();
        }
      }
      // Échap = fermer les suggestions
      if (e.key === 'Escape') {
        clearSuggestions();
      }
    },
    [multiline, onSubmit, clearSuggestions]
  );

  const handleApplySuggestion = useCallback(
    (suggestionId: string) => {
      const newValue = applySuggestion(suggestionId, value);
      onChange(newValue);
      clearSuggestions();
    },
    [applySuggestion, value, onChange, clearSuggestions]
  );

  const inputClassName = `
    flex-1 px-3 py-2 bg-transparent
    text-slate-900 dark:text-white
    placeholder:text-slate-400 dark:placeholder:text-gray-500
    resize-none focus:outline-none text-xs leading-relaxed
    ${multiline ? `max-h-[${maxHeight}px]` : ''}
    ${className}
  `.trim();

  return (
    <div className="relative w-full">
      {/* Panneau de suggestions */}
      <SuggestionPanel
        suggestions={suggestions}
        onApply={handleApplySuggestion}
        onDismiss={clearSuggestions}
        onDismissAll={clearSuggestions}
        darkMode={darkMode}
        isVisible={suggestions.length > 0 && !disabled}
      />

      {multiline ? (
        <textarea
          id={id}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={inputClassName}
          disabled={disabled}
          rows={1}
          style={{ minHeight: '36px' }}
          autoFocus={autoFocus}
        />
      ) : (
        <input
          id={id}
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={inputClassName}
          disabled={disabled}
          autoFocus={autoFocus}
        />
      )}

      {/* Indicateur d'analyse (optionnel) */}
      {isAnalyzing && (
        <div className="absolute bottom-1 right-1 text-xs text-gray-400">
          <span className="animate-pulse">✨</span>
        </div>
      )}
    </div>
  );
}

/**
 * Composant GhostInput - Autocomplétion inline pour les champs input courts
 *
 * Similaire à GhostTextArea mais optimisé pour les input single-line
 * Usage:
 * ```tsx
 * <GhostInput
 *   value={text}
 *   onChange={setText}
 *   placeholder="Titre..."
 *   context="notes"
 *   userId={userId}
 * />
 * ```
 */

import React, { useRef, useEffect, useCallback, useState, forwardRef } from 'react';
import { useGhostAutocomplete } from '../hooks/useGhostAutocomplete';

export interface GhostInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string;
  onChange: (value: string) => void;
  context?: 'notes' | 'vocab' | 'search' | 'chat' | 'meeting';
  userId?: string;
  enabled?: boolean;
  darkMode?: boolean;
}

export const GhostInput = forwardRef<HTMLInputElement, GhostInputProps>(function GhostInput({
  value,
  onChange,
  placeholder,
  context = 'notes',
  userId,
  enabled = false,
  darkMode = false,
  className = '',
  onKeyDown,
  ...inputProps
}, ref) {
  const internalInputRef = useRef<HTMLInputElement>(null);
  const inputRef = (ref as React.RefObject<HTMLInputElement>) || internalInputRef;
  const ghostOverlayRef = useRef<HTMLDivElement>(null);
  const [ghostText, setGhostText] = useState<string>('');

  const {
    suggestion,
    isAnalyzing,
    clearSuggestion,
    acceptSuggestion,
    analyzeLater,
  } = useGhostAutocomplete({
    context,
    userId,
    enabled,
    debounceMs: 100, // Plus rapide pour les inputs courts
  });

  /**
   * Calcule le texte ghost à afficher
   */
  useEffect(() => {
    if (!suggestion || !value || !inputRef.current) {
      setGhostText('');
      return;
    }

    const words = value.trim().split(/\s+/);
    const lastWord = words[words.length - 1] || '';
    const suggestionWord = suggestion.text.toLowerCase();
    const lastWordLower = lastWord.toLowerCase();

    let ghostPart = '';

    if (suggestion.type === 'completion' && lastWordLower.length > 0 && suggestionWord.startsWith(lastWordLower)) {
      ghostPart = suggestionWord.slice(lastWordLower.length);
    } else if (suggestion.type === 'correction' && lastWord.length > 0) {
      if (suggestionWord.startsWith(lastWordLower) && suggestionWord.length > lastWordLower.length) {
        ghostPart = suggestionWord.slice(lastWordLower.length);
      } else {
        ghostPart = suggestionWord;
      }
    }

    setGhostText(ghostPart);
  }, [suggestion, value, inputRef]);

  /**
   * Synchronise le ghost overlay avec l'input
   */
  useEffect(() => {
    if (!inputRef.current || !ghostOverlayRef.current) return;

    const input = inputRef.current;
    const overlay = ghostOverlayRef.current;

    const syncStyles = () => {
      const computedStyle = window.getComputedStyle(input);
      overlay.style.fontSize = computedStyle.fontSize;
      overlay.style.fontFamily = computedStyle.fontFamily;
      overlay.style.fontWeight = computedStyle.fontWeight;
      overlay.style.lineHeight = computedStyle.lineHeight;
      overlay.style.letterSpacing = computedStyle.letterSpacing;
      overlay.style.padding = computedStyle.padding;
      overlay.style.borderWidth = computedStyle.borderWidth;
      overlay.style.borderRadius = computedStyle.borderRadius;
    };

    syncStyles();

    const observer = new ResizeObserver(syncStyles);
    observer.observe(input);

    return () => observer.disconnect();
  }, [inputRef]);

  /**
   * Gère les changements de texte
   */
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      onChange(newValue);

      if (enabled && analyzeLater) {
        analyzeLater(newValue);
      }
    },
    [onChange, enabled, analyzeLater]
  );

  /**
   * Gère les touches du clavier
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Tab ou Flèche droite → accepter la suggestion
      if ((e.key === 'Tab' || e.key === 'ArrowRight') && suggestion && ghostText) {
        if (e.key === 'ArrowRight') {
          const cursorPos = e.currentTarget.selectionStart || 0;
          const textLength = value.length;
          if (cursorPos !== textLength) {
            return;
          }
        }

        e.preventDefault();
        const newValue = acceptSuggestion(value);
        onChange(newValue);
        clearSuggestion();

        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.setSelectionRange(newValue.length, newValue.length);
            inputRef.current.focus();
          }
        }, 0);
        return;
      }

      // Esc → ignorer la suggestion
      if (e.key === 'Escape' && suggestion) {
        e.preventDefault();
        clearSuggestion();
        return;
      }

      if (onKeyDown) {
        onKeyDown(e);
      }
    },
    [suggestion, ghostText, acceptSuggestion, value, onChange, clearSuggestion, onKeyDown, inputRef]
  );

  return (
    <div className="relative w-full">
      {/* MIROIR : Copie exacte du contenu + ghost inline */}
      <div
        ref={ghostOverlayRef}
        className="absolute inset-0 pointer-events-none"
        style={{
          font: 'inherit',
          fontSize: 'inherit',
          lineHeight: 'inherit',
          fontFamily: 'inherit',
          fontWeight: 'inherit',
          letterSpacing: 'inherit',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          zIndex: 20,
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          padding: 'inherit',
          border: 'transparent',
          background: 'transparent',
          color: 'transparent',
          textOverflow: 'clip',
        }}
        aria-hidden="true"
      >
        {/* Texte tapé (invisible) */}
        <span style={{ visibility: 'hidden' }}>
          {value}
        </span>
        {/* Ghost suffix */}
        {ghostText && (
          <span
            className="ghost-suffix"
            style={{
              visibility: 'visible',
              color: darkMode ? 'rgba(156, 163, 175, 0.7)' : 'rgba(107, 114, 128, 0.7)',
              fontWeight: 500,
              letterSpacing: 'inherit',
              transition: 'opacity 150ms cubic-bezier(0.4, 0, 0.2, 1)',
              opacity: 1,
              backgroundColor: darkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.08)',
              paddingLeft: '1px',
              paddingRight: '2px',
              borderRadius: '2px',
              display: 'inline',
            }}
          >
            {ghostText}
          </span>
        )}
      </div>

      {/* Input réel */}
      <input
        {...inputProps}
        ref={(node) => {
          if (internalInputRef) {
            (internalInputRef as React.MutableRefObject<HTMLInputElement | null>).current = node;
          }
          if (typeof ref === 'function') {
            ref(node);
          } else if (ref && 'current' in ref) {
            (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
          }
        }}
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`relative ${className}`}
        style={{
          background: 'transparent',
          zIndex: 10,
          ...inputProps.style,
        }}
      />

      {/* Indicateur d'analyse */}
      {isAnalyzing && enabled && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none z-30">
          <span className="animate-pulse">✨</span>
        </div>
      )}
    </div>
  );
});

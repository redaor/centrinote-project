/**
 * Composant GhostTextArea - Autocomplétion inline style GitHub Copilot/Notion
 * 
 * Affiche le suffixe manquant en transparence après le curseur.
 * Tab pour accepter, Esc pour ignorer.
 * 
 * Usage:
 * ```tsx
 * <GhostTextArea
 *   value={text}
 *   onChange={setText}
 *   placeholder="Décrivez votre idée..."
 *   context="notes"
 *   userId={userId}
 * />
 * ```
 */

import React, { useRef, useEffect, useCallback, useState, forwardRef } from 'react';
import { useGhostAutocomplete } from '../hooks/useGhostAutocomplete';

export interface GhostTextAreaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange' | 'value'> {
  value: string;
  onChange: (value: string) => void;
  context?: 'notes' | 'vocab' | 'search' | 'chat' | 'meeting';
  userId?: string;
  enabled?: boolean;
  maxSuggestions?: number; // Non utilisé pour l'instant (une seule suggestion ghost)
  darkMode?: boolean;
}

export const GhostTextArea = forwardRef<HTMLTextAreaElement, GhostTextAreaProps>(function GhostTextArea({
  value,
  onChange,
  placeholder,
  context = 'notes',
  userId,
  enabled = false,
  darkMode = false,
  className = '',
  onKeyDown,
  ...textareaProps
}, ref) {
  const internalTextareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [ghostText, setGhostText] = useState<string>('');
  const [cursorPosition, setCursorPosition] = useState(0);

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
    debounceMs: 150, // Réduit de 300ms à 150ms pour plus de réactivité
  });

  /**
   * Calcule le texte ghost à afficher
   * Affiche seulement la PARTIE MANQUANTE après le mot tapé
   */
  useEffect(() => {
    // Désactiver complètement si enabled est false
    if (!enabled) {
      setGhostText('');
      return;
    }
    
    if (!suggestion || !value || !internalTextareaRef.current) {
      setGhostText('');
      return;
    }

    const words = value.trim().split(/\s+/);
    const lastWord = words[words.length - 1] || '';
    const suggestionWord = suggestion.text.toLowerCase();
    const lastWordLower = lastWord.toLowerCase();

    // Afficher seulement la PARTIE MANQUANTE (suffixe)
    let ghostPart = '';

    // Vérifier que suggestionWord commence par lastWord (insensible à la casse)
    if (suggestion.type === 'completion' && lastWordLower.length > 0 && suggestionWord.startsWith(lastWordLower)) {
      // Complétion : afficher SEULEMENT la partie manquante (suffixe)
      ghostPart = suggestionWord.slice(lastWordLower.length);
    } else if (suggestion.type === 'correction' && lastWord.length > 0) {
      // Correction : si le mot suggéré commence par le préfixe, afficher le suffixe
      if (suggestionWord.startsWith(lastWordLower) && suggestionWord.length > lastWordLower.length) {
        ghostPart = suggestionWord.slice(lastWordLower.length);
      } else {
        // Sinon, afficher le mot complet suggéré (remplacement)
        ghostPart = suggestionWord;
      }
    }

    setGhostText(ghostPart);
  }, [enabled, suggestion, value]);

  /**
   * Met à jour la position du curseur
   */
  const updateCursorPosition = useCallback(() => {
    if (!enabled || !internalTextareaRef.current) return;
    const textarea = internalTextareaRef.current;
    const cursorPos = textarea.selectionStart || 0;
    setCursorPosition(cursorPos);
    
    // Maintenir le curseur visible dans le textarea (pour single-line avec scroll horizontal)
    const computedStyle = window.getComputedStyle(textarea);
    if (computedStyle.whiteSpace === 'nowrap' && computedStyle.overflowX !== 'hidden') {
      // Mesurer la largeur du texte avant le curseur avec un élément temporaire
      const textBeforeCursor = textarea.value.substring(0, cursorPos);
      const measureDiv = document.createElement('span');
      measureDiv.style.position = 'absolute';
      measureDiv.style.visibility = 'hidden';
      measureDiv.style.whiteSpace = 'nowrap';
      measureDiv.style.font = computedStyle.font;
      measureDiv.style.fontSize = computedStyle.fontSize;
      measureDiv.style.fontFamily = computedStyle.fontFamily;
      measureDiv.style.fontWeight = computedStyle.fontWeight;
      measureDiv.style.letterSpacing = computedStyle.letterSpacing;
      measureDiv.style.padding = '0';
      measureDiv.style.border = '0';
      measureDiv.style.margin = '0';
      measureDiv.textContent = textBeforeCursor || ' '; // Au moins un espace pour mesurer
      
      document.body.appendChild(measureDiv);
      const textWidth = measureDiv.offsetWidth;
      document.body.removeChild(measureDiv);
      
      // Calculer la position du curseur et ajuster le scroll
      const textareaWidth = textarea.clientWidth;
      const paddingLeft = parseInt(computedStyle.paddingLeft) || 0;
      const paddingRight = parseInt(computedStyle.paddingRight) || 0;
      const availableWidth = textareaWidth - paddingLeft - paddingRight;
      
      // Position du curseur depuis le début du texte (en pixels)
      const cursorPositionFromLeft = textWidth + paddingLeft;
      const currentScrollLeft = textarea.scrollLeft;
      const cursorPositionInView = cursorPositionFromLeft - currentScrollLeft;
      
      // Ajuster scrollLeft pour que le curseur reste visible
      if (cursorPositionInView < paddingLeft + 15) {
        // Le curseur est trop à gauche, scroller pour le rendre visible
        textarea.scrollLeft = Math.max(0, cursorPositionFromLeft - paddingLeft - 15);
      } else if (cursorPositionInView > availableWidth - 15) {
        // Le curseur est trop à droite, scroller pour le rendre visible
        textarea.scrollLeft = Math.max(0, cursorPositionFromLeft - availableWidth + 15);
      }
    }
  }, [enabled]);

  /**
   * 🎯 PIXEL-PERFECT: Synchronise l'overlay avec le textarea en temps réel
   */
  useEffect(() => {
    // Ne rien faire si l'autocomplétion est désactivée
    if (!enabled) return;

    if (!internalTextareaRef.current || !overlayRef.current) return;

    const textarea = internalTextareaRef.current;
    const overlay = overlayRef.current;

    // Synchroniser les styles et le scroll
    const syncAll = () => {
      const computedStyle = window.getComputedStyle(textarea);

      // 🎯 TYPOGRAPHIE : Copier TOUS les styles de rendu du texte
      overlay.style.fontSize = computedStyle.fontSize;
      overlay.style.fontFamily = computedStyle.fontFamily;
      overlay.style.fontWeight = computedStyle.fontWeight;
      overlay.style.fontStyle = computedStyle.fontStyle;
      overlay.style.lineHeight = computedStyle.lineHeight;
      overlay.style.letterSpacing = computedStyle.letterSpacing;
      overlay.style.wordSpacing = computedStyle.wordSpacing;
      overlay.style.textTransform = computedStyle.textTransform;
      overlay.style.textIndent = computedStyle.textIndent;
      overlay.style.fontVariant = computedStyle.fontVariant;
      overlay.style.fontFeatureSettings = computedStyle.fontFeatureSettings;

      // 🎯 WRAPPING : Styles critiques pour le retour à la ligne
      overlay.style.whiteSpace = computedStyle.whiteSpace;
      overlay.style.wordBreak = computedStyle.wordBreak;
      overlay.style.overflowWrap = computedStyle.overflowWrap;
      overlay.style.wordWrap = computedStyle.wordWrap;

      // 🎯 PADDING : Source unique (computedStyle)
      overlay.style.padding = computedStyle.padding;
      overlay.style.paddingTop = computedStyle.paddingTop;
      overlay.style.paddingRight = computedStyle.paddingRight;
      overlay.style.paddingBottom = computedStyle.paddingBottom;
      overlay.style.paddingLeft = computedStyle.paddingLeft;

      // 🎯 BOX MODEL : Identique au textarea
      overlay.style.boxSizing = computedStyle.boxSizing;

      // Border (transparent pour ne pas voir le double)
      overlay.style.borderWidth = computedStyle.borderWidth;
      overlay.style.borderStyle = 'solid';
      overlay.style.borderColor = 'transparent';
      overlay.style.borderRadius = computedStyle.borderRadius;

      // Marges (pour alignement parfait)
      overlay.style.margin = computedStyle.margin;
      overlay.style.marginTop = computedStyle.marginTop;
      overlay.style.marginRight = computedStyle.marginRight;
      overlay.style.marginBottom = computedStyle.marginBottom;
      overlay.style.marginLeft = computedStyle.marginLeft;

      // 🎯 SCROLL : Synchronisation obligatoire
      overlay.style.overflow = 'hidden';
      overlay.style.scrollBehavior = 'auto';
      overlay.scrollTop = textarea.scrollTop;
      overlay.scrollLeft = textarea.scrollLeft;
    };

    syncAll();

    // Observer les changements de taille
    const observer = new ResizeObserver(syncAll);
    observer.observe(textarea);

    // Observer le scroll
    textarea.addEventListener('scroll', syncAll);

    return () => {
      observer.disconnect();
      textarea.removeEventListener('scroll', syncAll);
    };
  }, [enabled]);

  /**
   * Gère les changements de texte
   */
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      onChange(newValue);

      // Analyser pour les suggestions
      if (enabled && analyzeLater) {
        analyzeLater(newValue);
      }

      // Mettre à jour la position du curseur et maintenir la visibilité
      // Utiliser requestAnimationFrame pour s'assurer que le DOM est mis à jour
      requestAnimationFrame(() => {
        updateCursorPosition();
      });

      // Auto-grow (seulement si maxHeight n'est pas défini ou si scrollHeight est inférieur)
      const maxHeight = textareaProps.style?.maxHeight ? parseInt(String(textareaProps.style.maxHeight)) : 384;
      const minHeight = textareaProps.style?.minHeight ? parseInt(String(textareaProps.style.minHeight)) : null;
      const whiteSpace = textareaProps.style?.whiteSpace || 'pre-wrap';
      
      // Si whiteSpace est 'nowrap', ne pas faire d'auto-grow (garder la hauteur fixe)
      if (whiteSpace === 'nowrap') {
        // Pour single-line, forcer la hauteur fixe et préserver nowrap
        if (minHeight && maxHeight && minHeight === maxHeight) {
          e.target.style.height = `${maxHeight}px`;
        } else if (maxHeight) {
          e.target.style.height = `${maxHeight}px`;
        }
        e.target.style.overflowY = 'hidden';
        e.target.style.whiteSpace = 'nowrap';
        e.target.style.overflowX = 'auto';
        // ✅ Largeur gérée par CSS (w-full), pas de calcul JS
      } else {
        // Pour multi-lignes (pre-wrap), auto-grow fluide
        // Réinitialiser la hauteur pour recalculer
        e.target.style.height = 'auto';
        
        // Calculer la hauteur nécessaire
        const scrollHeight = e.target.scrollHeight;
        const calculatedHeight = Math.max(
          minHeight ? parseInt(String(minHeight)) : scrollHeight,
          scrollHeight
        );
        
        // Appliquer la hauteur avec limite maxHeight
        if (maxHeight) {
          e.target.style.height = `${Math.min(calculatedHeight, maxHeight)}px`;
          e.target.style.overflowY = calculatedHeight > maxHeight ? 'auto' : 'hidden';
        } else {
          e.target.style.height = `${calculatedHeight}px`;
          e.target.style.overflowY = 'hidden';
        }
      }
    },
    [onChange, enabled, analyzeLater, updateCursorPosition, textareaProps.style]
  );

  /**
   * Gère les touches du clavier
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Si l'autocomplétion est désactivée, laisser le comportement par défaut
      if (!enabled) {
        if (onKeyDown) {
          onKeyDown(e);
        }
        return;
      }
      
      // Tab ou Flèche droite → accepter la suggestion
      if ((e.key === 'Tab' || e.key === 'ArrowRight') && suggestion && ghostText) {
        // Pour la flèche droite, accepter seulement si le curseur est à la fin
        if (e.key === 'ArrowRight') {
          const cursorPos = e.currentTarget.selectionStart;
          const textLength = value.length;
          if (cursorPos !== textLength) {
            // Le curseur n'est pas à la fin, laisser le comportement par défaut
            return;
          }
        }

        e.preventDefault();
        const newValue = acceptSuggestion(value);
        onChange(newValue);
        clearSuggestion();

        // Repositionner le curseur
        setTimeout(() => {
          if (internalTextareaRef.current) {
            const newCursorPos = newValue.length;
            internalTextareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
            internalTextareaRef.current.focus();
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

      // Appeler le handler parent si fourni
      if (onKeyDown) {
        onKeyDown(e);
      }
      
      // Maintenir le curseur visible après les touches de navigation
      if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
        requestAnimationFrame(() => {
          updateCursorPosition();
        });
      }
    },
    [enabled, suggestion, ghostText, acceptSuggestion, value, onChange, clearSuggestion, onKeyDown, updateCursorPosition]
  );

  /**
   * Calcule le texte à afficher dans le ghost overlay
   */
  const getGhostDisplayText = useCallback(() => {
    // Désactiver complètement si enabled est false
    if (!enabled) return '';
    if (!ghostText || !value) return '';

    // Le ghost n'apparaît que si on est en fin de mot (pas d'espace après)
    // Pour éviter qu'il apparaisse au milieu d'un mot
    if (value.endsWith(' ')) return '';

    // Si on a un ghostText, l'afficher directement après le curseur
    // La logique de filtrage est déjà faite dans le useEffect qui calcule ghostText
    return ghostText;
  }, [enabled, ghostText, value]);

  const ghostDisplayText = getGhostDisplayText();

  return (
    <div className="relative w-full">
      {/* Overlay pixel-perfect via CSS natif (inset: 0) */}
      {enabled && (
        <div
          ref={overlayRef}
          className="absolute pointer-events-none overflow-hidden"
          style={{
            inset: 0,
            boxSizing: 'border-box',
            background: 'transparent',
            color: 'transparent',
            zIndex: 1,
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            // ⚠️ Tous les autres styles (font, padding, etc.) sont copiés via JS dans syncAll()
          }}
          aria-hidden="true"
        >
          {/* Texte jusqu'au curseur (caractère par caractère) */}
          <span>{value.substring(0, cursorPosition)}</span>
          {/* Ghost collé exactement après le curseur, sans espace, fade-in élégant */}
          {/* Le ghost n'apparaît que si on est en fin de mot (pas d'espace après) */}
          {ghostDisplayText && !value.endsWith(' ') && (
            <span
              className="ghost-suffix"
              style={{
                display: 'inline',
                color: darkMode ? 'rgba(156, 163, 175, 0.45)' : 'rgba(107, 114, 128, 0.45)',
                fontWeight: 300,
                fontStyle: 'normal',
                letterSpacing: 'inherit',
                wordSpacing: 'inherit',
                pointerEvents: 'none',
                transition: 'opacity 80ms ease-in-out',
                opacity: 0.45,
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
                marginLeft: 0,
                paddingLeft: 0,
              }}
              aria-hidden="true"
            >
              {ghostDisplayText}
            </span>
          )}
          {/* Reste du texte après le curseur (invisible) */}
          <span style={{ opacity: 0 }}>{value.substring(cursorPosition)}</span>
        </div>
      )}

      {/* Textarea réel */}
      <textarea
        {...textareaProps}
        ref={(node) => {
          // Gérer le ref interne
          if (internalTextareaRef) {
            (internalTextareaRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
          }
          // Gérer le ref externe si fourni
          if (typeof ref === 'function') {
            ref(node);
          } else if (ref && 'current' in ref) {
            (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
          }
        }}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onSelect={enabled ? updateCursorPosition : undefined}
        onFocus={enabled ? updateCursorPosition : undefined}
        onClick={enabled ? updateCursorPosition : undefined}
        placeholder={placeholder}
        className={`${enabled ? 'relative z-10 bg-transparent' : ''} scrollbar-hide ${className}`}
        style={{
          ...(enabled ? {
            background: 'transparent',
            caretColor: 'inherit',
            color: 'inherit',
            WebkitTextFillColor: 'inherit',
          } : {}),
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          // Appliquer d'abord les styles du parent (y compris whiteSpace)
          ...textareaProps.style,
          // S'assurer que whiteSpace est bien préservé (écrase si défini dans textareaProps.style)
          whiteSpace: textareaProps.style?.whiteSpace || 'pre-wrap',
          // Pour nowrap, s'assurer que le textarea peut défiler horizontalement
          ...(textareaProps.style?.whiteSpace === 'nowrap' ? {
            minWidth: 0,
            width: '100%',
            maxWidth: '100%',
          } : {}),
        }}
      />

      {/* Indicateur d'analyse (optionnel) */}
      {isAnalyzing && enabled && (
        <div className="absolute bottom-1 right-1 text-xs text-gray-400 pointer-events-none z-30">
          <span className="animate-pulse">✨</span>
        </div>
      )}

      {/* Hint pour l'utilisateur */}
      {ghostDisplayText && enabled && (
        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">Tab</kbd>
            <span>ou</span>
            <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">→</kbd>
            <span>pour accepter</span>
          </div>
          <span className="mx-1">·</span>
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">Esc</kbd>
            <span>pour ignorer</span>
          </div>
        </div>
      )}
    </div>
  );
});


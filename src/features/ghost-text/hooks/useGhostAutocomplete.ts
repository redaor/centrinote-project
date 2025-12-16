/**
 * Hook universel pour le ghost-text (autocomplétion inline)
 * Utilisé par GhostTextArea pour gérer les suggestions
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { generateCompletions, type GhostSuggestion } from '../services/suggestionEngine';

export interface UseGhostAutocompleteOptions {
  context?: 'notes' | 'vocab' | 'search' | 'chat' | 'meeting';
  userId?: string;
  enabled?: boolean;
  debounceMs?: number;
}

export interface UseGhostAutocompleteReturn {
  suggestion: GhostSuggestion | null;
  isAnalyzing: boolean;
  clearSuggestion: () => void;
  acceptSuggestion: (currentText: string) => string;
  analyzeLater: (text: string) => void; // Exposé pour GhostTextArea
}

/**
 * Hook pour gérer l'autocomplétion ghost-text
 */
export function useGhostAutocomplete(
  options: UseGhostAutocompleteOptions = {}
): UseGhostAutocompleteReturn {
  const {
    context = 'notes',
    userId,
    enabled = true,
    debounceMs = 300,
  } = options;

  const [suggestion, setSuggestion] = useState<GhostSuggestion | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTextRef = useRef<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Analyse le texte et génère une suggestion
   */
  const analyzeText = useCallback(
    async (text: string) => {
      if (!enabled || !text || text.trim().length < 2) {
        setSuggestion(null);
        return;
      }

      // Ne pas réanalyser si le texte n'a pas changé
      if (text === lastTextRef.current) {
        return;
      }
      lastTextRef.current = text;

      // Annuler la requête précédente si elle existe
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Créer un nouveau AbortController pour cette requête
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setIsAnalyzing(true);

      try {
        const suggestions = await generateCompletions(text, context, userId, abortController.signal);

        // Pour le ghost-text, on prend la première suggestion (la meilleure)
        if (suggestions.length > 0) {
          setSuggestion(suggestions[0]);
          setIsAnalyzing(false);
        } else {
          // Si aucune suggestion locale, l'IA est lancée en parallèle dans suggestionEngine
          // On attend un peu pour voir si l'IA arrive rapidement
          setSuggestion(null);
          
          // Lancer l'appel IA en parallèle pour mise à jour ultérieure
          const words = text.trim().split(/\s+/);
          const lastWord = words[words.length - 1] || '';
          
          if (lastWord.length >= 2) {
            // L'IA sera appelée en parallèle et mettra à jour le cache
            // Le prochain appel à generateCompletions récupérera le résultat du cache
            // On peut aussi écouter directement ici si nécessaire
            setTimeout(() => {
              // Réessayer après un court délai pour récupérer le résultat IA du cache
              if (!abortController.signal.aborted) {
                generateCompletions(text, context, userId, abortController.signal)
                  .then((newSuggestions) => {
                    if (newSuggestions.length > 0 && !abortController.signal.aborted) {
                      setSuggestion(newSuggestions[0]);
                    }
                  })
                  .catch(() => {
                    // Ignorer les erreurs
                  });
              }
            }, 150); // Attendre 150ms pour laisser l'IA répondre
          }
          
          setIsAnalyzing(false);
        }
      } catch (error: any) {
        // Ignorer les erreurs d'abort (annulation normale)
        if (error.name !== 'AbortError') {
          console.error('Erreur lors de la génération de suggestions:', error);
        }
        setSuggestion(null);
        setIsAnalyzing(false);
      }
    },
    [enabled, context, userId]
  );

  /**
   * Analyse le texte avec debounce
   */
  const analyzeLater = useCallback(
    (text: string) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        analyzeText(text);
      }, debounceMs);
    },
    [analyzeText, debounceMs]
  );

  /**
   * Efface la suggestion
   */
  const clearSuggestion = useCallback(() => {
    setSuggestion(null);
    lastTextRef.current = '';
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    // Annuler toute requête en cours
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  /**
   * Accepte la suggestion et retourne le texte complet
   */
  const acceptSuggestion = useCallback(
    (currentText: string): string => {
      if (!suggestion) return currentText;

      const words = currentText.trim().split(/\s+/);
      const lastWord = words[words.length - 1] || '';

      // Si la suggestion est une complétion, remplacer le dernier mot
      if (suggestion.type === 'completion' && suggestion.text.startsWith(lastWord.toLowerCase())) {
        words[words.length - 1] = suggestion.text;
        return words.join(' ') + ' ';
      }

      // Si c'est une correction, remplacer le dernier mot
      if (suggestion.type === 'correction') {
        words[words.length - 1] = suggestion.text;
        return words.join(' ') + ' ';
      }

      return currentText;
    },
    [suggestion]
  );

  // Nettoyer le timer et annuler les requêtes au démontage
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    suggestion,
    isAnalyzing,
    clearSuggestion,
    acceptSuggestion,
    analyzeLater,
  };
}






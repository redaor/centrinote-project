/**
 * Hook React pour utiliser l'Edge Function ai-chat (SÉCURISÉ)
 *
 * ✅ Architecture sécurisée :
 * Frontend → Edge Function → OpenAI API
 *
 * ❌ JAMAIS : Frontend → OpenAI API directement
 */

import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface UseAIChatOptions {
  maxTokens?: number;
}

export interface AIChatResult {
  reply: string;
  timestamp: string;
  searched?: boolean;
  fileProcessed?: boolean;
  cached?: boolean;
}

export interface UseAIChatReturn {
  // État
  isLoading: boolean;
  error: string | null;

  // Actions
  ask: (question: string, context?: string) => Promise<string>;
  askWithHistory: (question: string, messages?: Array<{ role: string; content: string }>) => Promise<AIChatResult>;
  analyzeFile: (question: string, fileText: string) => Promise<string>;

  // Utilitaires
  clearError: () => void;
}

export function useAIChatEdgeFunction(options: UseAIChatOptions = {}): UseAIChatReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Question simple à l'IA
   */
  const ask = useCallback(async (question: string, context?: string): Promise<string> => {
    if (!question.trim()) {
      throw new Error('Question vide');
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('🤖 [useAIChatEdgeFunction] Appel Edge Function ai-chat...');

      const { data, error: invokeError } = await supabase.functions.invoke('ai-chat', {
        body: {
          question: question.trim(),
          context: context || '',
        },
      });

      if (invokeError) {
        console.error('❌ [useAIChatEdgeFunction] Erreur Edge Function:', invokeError);
        throw new Error(invokeError.message || 'Erreur appel Edge Function');
      }

      if (!data || !data.reply) {
        throw new Error('Réponse invalide de l\'Edge Function');
      }

      console.log('✅ [useAIChatEdgeFunction] Réponse reçue:', data.reply.slice(0, 100));
      return data.reply;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur appel IA';
      console.error('❌ [useAIChatEdgeFunction]', errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Conversation avec historique
   */
  const askWithHistory = useCallback(async (
    question: string,
    messages?: Array<{ role: string; content: string }>
  ): Promise<AIChatResult> => {
    if (!question.trim()) {
      throw new Error('Question vide');
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('🤖 [useAIChatEdgeFunction] Appel avec historique...');

      const { data, error: invokeError } = await supabase.functions.invoke('ai-chat', {
        body: {
          question: question.trim(),
          messages: messages || [],
        },
      });

      if (invokeError) {
        console.error('❌ [useAIChatEdgeFunction] Erreur Edge Function:', invokeError);
        throw new Error(invokeError.message || 'Erreur appel Edge Function');
      }

      if (!data || !data.reply) {
        throw new Error('Réponse invalide de l\'Edge Function');
      }

      console.log('✅ [useAIChatEdgeFunction] Réponse reçue');
      return data as AIChatResult;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur appel IA';
      console.error('❌ [useAIChatEdgeFunction]', errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Analyse de fichier (PDF, DOCX, etc.)
   */
  const analyzeFile = useCallback(async (question: string, fileText: string): Promise<string> => {
    if (!question.trim() || !fileText.trim()) {
      throw new Error('Question ou fichier vide');
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('📄 [useAIChatEdgeFunction] Analyse de fichier...');

      // Créer un FormData pour l'upload
      const formData = new FormData();
      formData.append('question', question.trim());
      formData.append('fileText', fileText);

      const { data, error: invokeError } = await supabase.functions.invoke('ai-chat', {
        body: formData,
      });

      if (invokeError) {
        console.error('❌ [useAIChatEdgeFunction] Erreur Edge Function:', invokeError);
        throw new Error(invokeError.message || 'Erreur appel Edge Function');
      }

      if (!data || !data.reply) {
        throw new Error('Réponse invalide de l\'Edge Function');
      }

      console.log('✅ [useAIChatEdgeFunction] Analyse terminée');
      return data.reply;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur analyse fichier';
      console.error('❌ [useAIChatEdgeFunction]', errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // État
    isLoading,
    error,

    // Actions
    ask,
    askWithHistory,
    analyzeFile,

    // Utilitaires
    clearError,
  };
}

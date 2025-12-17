import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Hook pour utiliser l'orchestrateur Noteo
 * Route automatiquement vers le bon service IA selon la clé API
 */

export type NoteoService = 'search' | 'chat' | 'aide';

interface OrchestratorOptions {
  service: NoteoService;
  onSuccess?: (reply: string) => void;
  onError?: (error: string) => void;
}

interface OrchestratorResponse {
  reply: string;
}

export function useNoteoOrchestrator() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastReply, setLastReply] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (
      message: string,
      options: OrchestratorOptions
    ): Promise<OrchestratorResponse | null> => {
      setLoading(true);
      setError(null);

      try {
        // Appel via Supabase Edge Function (clés API stockées uniquement dans Supabase)
        const { data, error: invokeError } = await supabase.functions.invoke('noteo-orchestrator', {
          body: {
            message,
            service: options.service,
          },
        });

        if (invokeError) {
          throw new Error(invokeError.message || 'Erreur lors de l\'appel à l\'orchestrateur');
        }

        const reply = data?.reply || '';
        setLastReply(reply);

        if (options.onSuccess) {
          options.onSuccess(reply);
        }

        return { reply } as OrchestratorResponse;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
        setError(errorMessage);

        if (options.onError) {
          options.onError(errorMessage);
        }

        console.error('[NoteoOrchestrator] Erreur:', err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearLastReply = useCallback(() => {
    setLastReply(null);
  }, []);

  return {
    sendMessage,
    loading,
    error,
    lastReply,
    clearError,
    clearLastReply,
  };
}

/**
 * Hook spécialisé pour la recherche
 */
export function useNoteoSearch() {
  const orchestrator = useNoteoOrchestrator();

  const search = useCallback(
    (query: string, callbacks?: Omit<OrchestratorOptions, 'service'>) => {
      return orchestrator.sendMessage(query, {
        service: 'search',
        ...callbacks,
      });
    },
    [orchestrator]
  );

  return {
    search,
    loading: orchestrator.loading,
    error: orchestrator.error,
    lastReply: orchestrator.lastReply,
    clearError: orchestrator.clearError,
  };
}

/**
 * Hook spécialisé pour le chat
 */
export function useNoteoChat() {
  const orchestrator = useNoteoOrchestrator();

  const chat = useCallback(
    (message: string, callbacks?: Omit<OrchestratorOptions, 'service'>) => {
      return orchestrator.sendMessage(message, {
        service: 'chat',
        ...callbacks,
      });
    },
    [orchestrator]
  );

  return {
    chat,
    loading: orchestrator.loading,
    error: orchestrator.error,
    lastReply: orchestrator.lastReply,
    clearError: orchestrator.clearError,
  };
}

/**
 * Hook spécialisé pour l'aide
 */
export function useNoteoAide() {
  const orchestrator = useNoteoOrchestrator();

  const ask = useCallback(
    (question: string, callbacks?: Omit<OrchestratorOptions, 'service'>) => {
      return orchestrator.sendMessage(question, {
        service: 'aide',
        ...callbacks,
      });
    },
    [orchestrator]
  );

  return {
    ask,
    loading: orchestrator.loading,
    error: orchestrator.error,
    lastReply: orchestrator.lastReply,
    clearError: orchestrator.clearError,
  };
}

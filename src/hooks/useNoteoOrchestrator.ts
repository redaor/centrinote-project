import { useState, useCallback } from 'react';

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

  // Mapping des services vers les clés d'environnement
  const getApiKey = useCallback((service: NoteoService): string | undefined => {
    const keyMap = {
      search: import.meta.env.VITE_OPENAI_SEARCH_KEY,
      chat: import.meta.env.VITE_OPENAI_CHAT_KEY,
      aide: import.meta.env.VITE_OPENAI_AIDE_KEY,
    };
    return keyMap[service];
  }, []);

  const sendMessage = useCallback(
    async (
      message: string,
      options: OrchestratorOptions
    ): Promise<OrchestratorResponse | null> => {
      setLoading(true);
      setError(null);

      try {
        const apiKey = getApiKey(options.service);
        if (!apiKey) {
          throw new Error(`Clé API manquante pour le service "${options.service}"`);
        }

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        if (!supabaseUrl) {
          throw new Error('URL Supabase manquante');
        }

        const response = await fetch(
          `${supabaseUrl}/functions/v1/noteo-orchestrator`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              message,
              apiKey,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
          throw new Error(errorData.error || `Erreur ${response.status}`);
        }

        const data = await response.json();
        setLastReply(data.reply);

        if (options.onSuccess) {
          options.onSuccess(data.reply);
        }

        return data;
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
    [getApiKey]
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

import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

type AIRole = 'user' | 'system' | 'assistant';

interface AIMessage {
  role: AIRole;
  content: string;
}

interface AIReply {
  reply: string;
  timestamp: string;
  cached?: boolean;
  error?: string;
}

export const useCentrinoteAI_Edge = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (messages: AIMessage[]): Promise<AIReply> => {
      setLoading(true);
      setError(null);

      try {
        if (!messages.length) {
          throw new Error('Aucun message fourni');
        }

        // Extraire le dernier message utilisateur
        const lastUser = [...messages]
          .reverse()
          .find((message) => message.role === 'user')?.content;

        if (!lastUser) {
          throw new Error('Aucun message utilisateur détecté');
        }

        console.log('🧠 [useCentrinoteAI_Edge] Utilisation de l\'edge function ai-chat avec enrichissement');

        // Récupérer le token JWT
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          throw new Error('Non authentifié. Veuillez vous reconnecter.');
        }

        // Appeler l'edge function Supabase ai-chat avec recherche web
        const { data, error: invokeError } = await supabase.functions.invoke('ai-chat', {
          body: {
            question: lastUser,
            messages: messages
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (invokeError) {
          throw new Error(invokeError.message || 'Erreur lors de l\'appel à l\'IA');
        }

        if (!data || !data.reply) {
          throw new Error("Réponse vide de l'IA");
        }

        console.log('✅ [useCentrinoteAI_Edge] Réponse enrichie reçue:', {
          enrichment_used: data.enrichment_used,
          notes_count: data.notes_count,
          vocabulary_count: data.vocabulary_count,
          news_injected: data.news_injected,
          searched: data.searched,
        });

        // Log détaillé pour déboguer
        if (!data.enrichment_used) {
          console.warn('⚠️ [useCentrinoteAI_Edge] Aucun enrichissement utilisé:', {
            hasNotes: data.notes_count > 0,
            hasVocab: data.vocabulary_count > 0,
            hasNews: data.news_injected,
            hasSearch: data.searched,
            fullResponse: data,
          });
        }

        return {
          reply: data.reply,
          timestamp: data.timestamp || new Date().toISOString(),
          cached: data.cached || false,
        };
      } catch (err) {
        console.error('❌ [useCentrinoteAI_Edge] Erreur:', err);
        const message = err instanceof Error ? err.message : 'Service IA indisponible';
        setError(message);
        return {
          reply: "Désolé, le service IA est momentanément indisponible. Veuillez réessayer plus tard.",
          timestamp: new Date().toISOString(),
          error: message,
        };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    sendMessage,
    loading,
    error,
    clearError,
  };
};


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
  session_id?: string; // MEM-FIX: Ajouter session_id dans la réponse
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

        // MEM-FIX: Récupérer ou créer un session_id depuis localStorage
        const STORAGE_KEY = `ai_session_${session.user.id}`;
        console.log('🔍 [DEBUG] user.id:', session.user.id);
        console.log('🔍 [DEBUG] STORAGE_KEY:', STORAGE_KEY);
        console.log('🔍 [DEBUG] localStorage avant retrieval:', localStorage);

        let sessionId = localStorage.getItem(STORAGE_KEY);
        console.log('🔍 [DEBUG] sessionId récupéré:', sessionId);

        if (!sessionId) {
          console.log('🆕 [useCentrinoteAI_Edge] Nouvelle session créée côté frontend');
        } else {
          console.log('🔄 [useCentrinoteAI_Edge] Session existante récupérée:', sessionId);
        }

        // Appeler l'edge function Supabase ai-chat avec recherche web
        const { data, error: invokeError } = await supabase.functions.invoke('ai-chat', {
          body: {
            question: lastUser,
            messages: messages,
            session_id: sessionId || undefined // MEM-FIX: Envoyer session_id si disponible
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

        console.log('🔍 [DEBUG] data.session_id reçu:', data.session_id);
        console.log('🔍 [DEBUG] Type de data.session_id:', typeof data.session_id);

        // MEM-FIX: Sauvegarder le session_id renvoyé par l'Edge Function
        if (data.session_id) {
          localStorage.setItem(STORAGE_KEY, data.session_id);
          console.log('💾 [useCentrinoteAI_Edge] Session ID sauvegardé:', data.session_id);

          // Vérifier immédiatement après sauvegarde
          const verifySessionId = localStorage.getItem(STORAGE_KEY);
          console.log('🔍 [DEBUG] Vérification immédiate après setItem:', verifySessionId);
          console.log('🔍 [DEBUG] localStorage après setItem:', localStorage);
        } else {
          console.warn('⚠️ [DEBUG] data.session_id est undefined/null, non sauvegardé');
        }

        console.log('✅ [useCentrinoteAI_Edge] Réponse enrichie reçue:', {
          enrichment_used: data.enrichment_used,
          notes_count: data.notes_count,
          vocabulary_count: data.vocabulary_count,
          news_injected: data.news_injected,
          searched: data.searched,
          session_id: data.session_id, // MEM-FIX: Logger le session_id
        });

        // Appeler ai-memory pour mettre à jour la mémoire persistante (toutes les 5 messages)
        // Cette logique est aussi gérée côté serveur, mais on peut aussi l'appeler ici si nécessaire
        // Pour l'instant, on laisse le serveur gérer cela pour éviter les appels redondants

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
          session_id: data.session_id, // MEM-FIX: Retourner session_id
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

  // MEM-FIX: Fonction pour réinitialiser la session (nouvelle conversation)
  const resetSession = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        const STORAGE_KEY = `ai_session_${session.user.id}`;
        localStorage.removeItem(STORAGE_KEY);
        console.log('🔄 [useCentrinoteAI_Edge] Session réinitialisée');
      }
    } catch (err) {
      console.error('❌ [useCentrinoteAI_Edge] Erreur lors de la réinitialisation:', err);
    }
  }, []);

  return {
    sendMessage,
    loading,
    error,
    clearError,
    resetSession, // MEM-FIX: Exposer la fonction de reset
  };
};


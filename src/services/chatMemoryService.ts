/**
 * Service pour utiliser l'Edge Function chat-memory
 * Système de mémoire persistante avec recherche sémantique
 */

import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';

export interface ChatMemoryResponse {
  success: boolean;
  conversation_id: string;
  response: string;
  metadata?: {
    recent_messages_count: number;
    semantic_messages_count: number;
    summaries_count: number;
    total_tokens_estimate: number;
  };
  error?: string;
}

export interface ChatMemoryRequest {
  user_id: string;
  conversation_id: string | null;
  message: string;
}

class ChatMemoryService {
  private readonly STORAGE_KEY_PREFIX = 'chat_memory_conversation_';

  /**
   * Récupère ou crée un conversation_id depuis localStorage
   */
  private getConversationId(userId: string): string | null {
    try {
      const key = `${this.STORAGE_KEY_PREFIX}${userId}`;
      const conversationId = localStorage.getItem(key);
      return conversationId;
    } catch (err) {
      logger.warn('Erreur récupération conversation_id depuis localStorage', { error: err });
      return null;
    }
  }

  /**
   * Sauvegarde le conversation_id dans localStorage
   */
  private saveConversationId(userId: string, conversationId: string): void {
    try {
      const key = `${this.STORAGE_KEY_PREFIX}${userId}`;
      localStorage.setItem(key, conversationId);
    } catch (err) {
      logger.warn('Erreur sauvegarde conversation_id dans localStorage', { error: err });
    }
  }

  /**
   * Réinitialise la conversation (nouvelle conversation)
   */
  resetConversation(userId: string): void {
    try {
      const key = `${this.STORAGE_KEY_PREFIX}${userId}`;
      localStorage.removeItem(key);
      logger.info('Conversation réinitialisée', { userId: userId.substring(0, 8) + '...' });
    } catch (err) {
      logger.warn('Erreur réinitialisation conversation', { error: err });
    }
  }

  /**
   * Envoie un message à l'IA avec mémoire persistante
   */
  async sendMessage(
    message: string,
    userId: string | null
  ): Promise<{ success: boolean; response: string; conversation_id?: string; error?: string }> {
    if (!userId) {
      return {
        success: false,
        response: '',
        error: 'Utilisateur non connecté'
      };
    }

    if (!message || !message.trim()) {
      return {
        success: false,
        response: '',
        error: 'Message vide'
      };
    }

    try {
      // Récupérer le conversation_id depuis localStorage
      let conversationId = this.getConversationId(userId);

      // Récupérer le token JWT
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        return {
          success: false,
          response: '',
          error: 'Non authentifié. Veuillez vous reconnecter.'
        };
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
      
      // Appeler l'Edge Function chat-memory
      const response = await fetch(`${supabaseUrl}/functions/v1/chat-memory`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          conversation_id: conversationId,
          message: message.trim()
        } as ChatMemoryRequest)
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Erreur appel chat-memory', new Error(`HTTP ${response.status}: ${errorText}`), {
          status: response.status,
          userId: userId.substring(0, 8) + '...'
        });
        
        return {
          success: false,
          response: '',
          error: `Erreur serveur: ${response.status}`
        };
      }

      const data: ChatMemoryResponse = await response.json();

      if (!data.success) {
        logger.error('Erreur chat-memory', new Error(data.error || 'Erreur inconnue'), {
          userId: userId.substring(0, 8) + '...',
          conversationId: data.conversation_id?.substring(0, 8) + '...'
        });
        
        return {
          success: false,
          response: '',
          error: data.error || 'Erreur lors de la communication avec l\'IA'
        };
      }

      // Sauvegarder le conversation_id pour les prochains messages
      if (data.conversation_id) {
        this.saveConversationId(userId, data.conversation_id);
      }

      logger.debug('Message envoyé avec succès', {
        conversationId: data.conversation_id?.substring(0, 8) + '...',
        metadata: data.metadata
      });

      return {
        success: true,
        response: data.response,
        conversation_id: data.conversation_id
      };

    } catch (err) {
      logger.error('Erreur sendMessage chat-memory', err instanceof Error ? err : new Error(String(err)), {
        userId: userId.substring(0, 8) + '...'
      });
      
      return {
        success: false,
        response: '',
        error: err instanceof Error ? err.message : 'Erreur de connexion'
      };
    }
  }
}

export const chatMemoryService = new ChatMemoryService();


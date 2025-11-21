/**
 * Service de gestion des conversations IA
 * Sauvegarde et charge les messages depuis Supabase
 */

import { supabase } from '../lib/supabase';
import { log } from '../utils/logger';

export interface AIMessage {
  id: string;
  type: 'user' | 'ai' | 'error' | 'code';
  content: string;
  timestamp: Date;
  metadata?: {
    executionTime?: number;
    securityScore?: number;
    isValid?: boolean;
    [key: string]: any;
  };
}

export interface AIConversationSession {
  sessionId: string;
  messages: AIMessage[];
  createdAt: Date;
  updatedAt: Date;
}

class AIConversationService {
  /**
   * Récupère ou crée une session de conversation pour un utilisateur
   */
  async getOrCreateSession(userId: string): Promise<string> {
    try {
      log.debug('🔄 [AIConversationService] Récupération/création session pour:', userId);
      
      // Vérifier s'il existe une session récente (moins de 24h)
      const oneDayAgo = new Date();
      oneDayAgo.setHours(oneDayAgo.getHours() - 24);
      
      const { data: recentMessages, error: sessionError } = await supabase
        .from('ai_conversations')
        .select('session_id')
        .eq('user_id', userId)
        .gte('created_at', oneDayAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (sessionError && sessionError.code !== 'PGRST116') { // PGRST116 = no rows returned
        log.error('❌ [AIConversationService] Erreur lors de la recherche de session:', sessionError);
        // Continuer et créer une nouvelle session
      }
      
      if (recentMessages && recentMessages.length > 0 && recentMessages[0]?.session_id) {
        const sessionId = recentMessages[0].session_id;
        log.debug('✅ [AIConversationService] Session existante trouvée:', sessionId);
        return sessionId;
      }
      
      // Créer une nouvelle session (UUID généré côté client)
      log.debug('🆕 [AIConversationService] Création nouvelle session');
      const newSessionId = crypto.randomUUID();
      return newSessionId;
    } catch (error) {
      log.error('❌ [AIConversationService] Erreur getOrCreateSession:', error);
      // Retourner un UUID généré côté client en cas d'erreur
      return crypto.randomUUID();
    }
  }

  /**
   * Sauvegarde un message dans la base de données
   */
  async saveMessage(
    userId: string,
    sessionId: string,
    message: AIMessage
  ): Promise<void> {
    try {
      log.debug('💾 [AIConversationService] Sauvegarde message:', {
        userId,
        sessionId,
        messageId: message.id,
        type: message.type,
        contentLength: message.content?.length || 0,
      });

      const { error } = await supabase
        .from('ai_conversations')
        .insert({
          user_id: userId,
          session_id: sessionId,
          message_id: message.id,
          message_type: message.type,
          content: message.content,
          metadata: message.metadata || {},
          created_at: message.timestamp.toISOString(),
        });

      if (error) {
        log.error('❌ [AIConversationService] Erreur sauvegarde message:', error);
        throw error;
      }

      log.debug('✅ [AIConversationService] Message sauvegardé avec succès');
    } catch (error) {
      log.error('❌ [AIConversationService] Erreur lors de la sauvegarde:', error);
      // Ne pas bloquer l'UI en cas d'erreur de sauvegarde
      console.warn('⚠️ Impossible de sauvegarder le message, continuation...', error);
    }
  }

  /**
   * Sauvegarde plusieurs messages en batch
   */
  async saveMessages(
    userId: string,
    sessionId: string,
    messages: AIMessage[]
  ): Promise<void> {
    try {
      if (messages.length === 0) {
        return;
      }

      log.debug('💾 [AIConversationService] Sauvegarde batch de', messages.length, 'messages');

      const messagesToInsert = messages.map(message => ({
        user_id: userId,
        session_id: sessionId,
        message_id: message.id,
        message_type: message.type,
        content: message.content,
        metadata: message.metadata || {},
        created_at: message.timestamp.toISOString(),
      }));

      const { error } = await supabase
        .from('ai_conversations')
        .insert(messagesToInsert);

      if (error) {
        log.error('❌ [AIConversationService] Erreur sauvegarde batch:', error);
        throw error;
      }

      log.debug('✅ [AIConversationService] Messages sauvegardés avec succès');
    } catch (error) {
      log.error('❌ [AIConversationService] Erreur lors de la sauvegarde batch:', error);
      console.warn('⚠️ Impossible de sauvegarder les messages, continuation...', error);
    }
  }

  /**
   * Charge tous les messages d'une session
   */
  async loadSessionMessages(
    userId: string,
    sessionId: string
  ): Promise<AIMessage[]> {
    try {
      log.debug('📥 [AIConversationService] Chargement messages session:', { userId, sessionId });

      const { data, error } = await supabase
        .from('ai_conversations')
        .select('*')
        .eq('user_id', userId)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) {
        log.error('❌ [AIConversationService] Erreur chargement messages:', error);
        throw error;
      }

      const messages: AIMessage[] = (data || []).map((row) => ({
        id: row.message_id,
        type: row.message_type as AIMessage['type'],
        content: row.content,
        timestamp: new Date(row.created_at),
        metadata: row.metadata || {},
      }));

      log.debug('✅ [AIConversationService] Messages chargés:', messages.length);
      return messages;
    } catch (error) {
      log.error('❌ [AIConversationService] Erreur lors du chargement:', error);
      return [];
    }
  }

  /**
   * Charge la dernière session active de l'utilisateur
   */
  async loadLatestSession(userId: string): Promise<AIMessage[]> {
    try {
      log.debug('📥 [AIConversationService] Chargement dernière session pour:', userId);

      // Récupérer la dernière session (moins de 24h)
      const oneDayAgo = new Date();
      oneDayAgo.setHours(oneDayAgo.getHours() - 24);

      const { data: latestMessage, error: sessionError } = await supabase
        .from('ai_conversations')
        .select('session_id')
        .eq('user_id', userId)
        .gte('created_at', oneDayAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (sessionError) {
        if (sessionError.code === 'PGRST116') {
          // Aucune session trouvée
          log.debug('ℹ️ [AIConversationService] Aucune session récente trouvée');
          return [];
        }
        throw sessionError;
      }

      if (!latestMessage?.session_id) {
        return [];
      }

      // Charger tous les messages de cette session
      return await this.loadSessionMessages(userId, latestMessage.session_id);
    } catch (error) {
      log.error('❌ [AIConversationService] Erreur lors du chargement de la dernière session:', error);
      return [];
    }
  }

  /**
   * Supprime tous les messages d'une session
   */
  async clearSession(userId: string, sessionId: string): Promise<void> {
    try {
      log.debug('🧹 [AIConversationService] Suppression session:', { userId, sessionId });

      const { error } = await supabase
        .from('ai_conversations')
        .delete()
        .eq('user_id', userId)
        .eq('session_id', sessionId);

      if (error) {
        log.error('❌ [AIConversationService] Erreur suppression session:', error);
        throw error;
      }

      log.debug('✅ [AIConversationService] Session supprimée avec succès');
    } catch (error) {
      log.error('❌ [AIConversationService] Erreur lors de la suppression:', error);
      throw error;
    }
  }

  /**
   * Supprime toutes les conversations d'un utilisateur
   */
  async clearAllConversations(userId: string): Promise<void> {
    try {
      log.debug('🧹 [AIConversationService] Suppression toutes conversations pour:', userId);

      const { error } = await supabase
        .from('ai_conversations')
        .delete()
        .eq('user_id', userId);

      if (error) {
        log.error('❌ [AIConversationService] Erreur suppression conversations:', error);
        throw error;
      }

      log.debug('✅ [AIConversationService] Toutes conversations supprimées');
    } catch (error) {
      log.error('❌ [AIConversationService] Erreur lors de la suppression:', error);
      throw error;
    }
  }
}

export const aiConversationService = new AIConversationService();


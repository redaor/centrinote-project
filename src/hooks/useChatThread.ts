/**
 * Hook pour gérer l'état et les actions du chat IA
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { ChatMessage, ChatRole, CHAT_CONFIG } from '../types/chat';
import { aiService } from '../services/aiService';
import { useApp } from '../contexts/AppContext';

interface UseChatThreadOptions {
  conversationId: string;
  autoScroll?: boolean;
}

export function useChatThread({ 
  conversationId, 
  autoScroll = true 
}: UseChatThreadOptions) {
  const { state: appState } = useApp();
  const { user } = appState;
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const isSubmittingRef = useRef(false);

  // Générer un ID unique pour les messages
  const generateMessageId = useCallback(() => {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Sauvegarder les messages dans localStorage
  const saveMessages = useCallback((msgs: ChatMessage[]) => {
    try {
      const storageKey = `${CHAT_CONFIG.STORAGE_PREFIX}${conversationId}`;
      localStorage.setItem(storageKey, JSON.stringify(msgs));
    } catch (err) {
      console.warn('Impossible de sauvegarder les messages:', err);
    }
  }, [conversationId]);

  // Charger les messages depuis localStorage
  const loadMessages = useCallback(() => {
    try {
      const storageKey = `${CHAT_CONFIG.STORAGE_PREFIX}${conversationId}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsedMessages = JSON.parse(saved) as ChatMessage[];
        setMessages(parsedMessages);
      }
    } catch (err) {
      console.warn('Impossible de charger les messages:', err);
    }
  }, [conversationId]);

  // Auto-scroll vers le bas
  const scrollToBottom = useCallback(() => {
    if (autoScroll && lastMessageRef.current) {
      setTimeout(() => {
        lastMessageRef.current?.scrollIntoView({ 
          behavior: 'smooth',
          block: 'end'
        });
      }, CHAT_CONFIG.AUTO_SCROLL_DELAY);
    }
  }, [autoScroll]);

  // Ajouter un message à la conversation
  const appendMessage = useCallback((
    role: ChatRole, 
    content: string, 
    isError = false
  ) => {
    const newMessage: ChatMessage = {
      id: generateMessageId(),
      role,
      content,
      createdAt: new Date().toISOString(),
      isError
    };

    setMessages(prev => {
      const updated = [...prev, newMessage];
      // Limiter l'historique
      if (updated.length > CHAT_CONFIG.MAX_MESSAGES_HISTORY) {
        return updated.slice(-CHAT_CONFIG.MAX_MESSAGES_HISTORY);
      }
      return updated;
    });

    scrollToBottom();
  }, [generateMessageId, scrollToBottom]);

  // Envoyer un message à l'IA
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading || isSubmittingRef.current) {
      return;
    }

    // Garde-fou contre double soumission
    isSubmittingRef.current = true;
    setIsLoading(true);
    setError(null);

    // Ajouter le message utilisateur immédiatement
    appendMessage('user', content.trim());

    try {
      // Appel à l'API IA
      const response = await aiService.sendMessage(content.trim(), user?.id);
      
      if (response.success && response.response) {
        // Ajouter la réponse de l'IA
        appendMessage('assistant', response.response);
      } else {
        // Gérer l'erreur avec plus de détails
        let errorMessage = response.error || 'Erreur inconnue lors de la communication avec l\'IA';

        // Si c'est un timeout, ajouter des informations utiles
        if (response.body) {
          const duration = Math.round((response.body.duration || 0) / 1000);
          if (errorMessage.includes('temps que prévu')) {
            errorMessage += `\n\n⏱️ Temps écoulé: ${duration}s\n💡 Conseil: Si cela se reproduit, essayez de reformuler votre question de manière plus concise.`;
          }
        }

        appendMessage('assistant', errorMessage, true);
        setError(errorMessage);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de connexion';
      appendMessage('assistant', errorMessage, true);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      isSubmittingRef.current = false;
    }
  }, [isLoading, user?.id, appendMessage]);

  // Reformuler un message (relancer avec "reformule")
  const reformulateMessage = useCallback(async (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message || message.role !== 'user') return;

    const reformulatePrompt = `Reformule cette demande de manière différente : "${message.content}"`;
    await sendMessage(reformulatePrompt);
  }, [messages, sendMessage]);

  // Réessayer le dernier message
  const retryLastMessage = useCallback(async () => {
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMessage) {
      await sendMessage(lastUserMessage.content);
    }
  }, [messages, sendMessage]);

  // Réinitialiser la conversation
  const resetConversation = useCallback(() => {
    setMessages([]);
    setError(null);
    setIsLoading(false);
    
    // Nettoyer le localStorage
    try {
      const storageKey = `${CHAT_CONFIG.STORAGE_PREFIX}${conversationId}`;
      localStorage.removeItem(storageKey);
    } catch (err) {
      console.warn('Impossible de nettoyer le localStorage:', err);
    }
  }, [conversationId]);

  // Copier le contenu d'un message
  const copyMessage = useCallback(async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch (err) {
      console.warn('Impossible de copier le message:', err);
    }
  }, []);

  // Charger les messages au montage
  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Sauvegarder les messages à chaque changement
  useEffect(() => {
    if (messages.length > 0) {
      saveMessages(messages);
    }
  }, [messages, saveMessages]);

  return {
    // État
    messages,
    isLoading,
    error,
    conversationId,
    
    // Actions
    sendMessage,
    appendMessage,
    resetConversation,
    retryLastMessage,
    reformulateMessage,
    copyMessage,
    
    // Refs pour le scroll
    scrollRef,
    lastMessageRef,
  };
}

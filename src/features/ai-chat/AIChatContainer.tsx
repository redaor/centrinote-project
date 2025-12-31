/**
 * Container: AIChatContainer
 *
 * Container principal du chat IA qui assemble tous les composants et hooks extraits.
 *
 * Responsabilités:
 * - Gestion de l'état global (messages, segments, loading, etc.)
 * - Orchestration des hooks métier (useMessageActions, useMessageProcessor, etc.)
 * - Gestion du cycle de vie (chargement, sauvegarde, bienvenue)
 * - Coordination des callbacks (send, regenerate, copy, like)
 * - Assemblage des composants présentationnels
 *
 * Composants utilisés:
 * - ChatHeader: Header avec tabs et status
 * - MessagesContainer: Zone scrollable des messages
 * - InputBar: Barre de saisie avec fichiers et voix
 * - AIActionConfirmModal: Modal de confirmation des actions IA
 *
 * @example
 * import AIChatContainer from './features/ai-chat/AIChatContainer';
 * <AIChatContainer />
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useCentrinoteAI } from '../../hooks/useCentrinoteAI';
import { useCentrinoteAI_Edge } from '../../hooks/useCentrinoteAI_Edge';
import { useApp } from '../../contexts/AppContext';
import { useTheme } from '../../hooks/useTheme';
import { aiConversationService, type AIMessage } from '../../services/aiConversationService';
import { supabase } from '../../lib/supabase';
import { AIActionConfirmModal } from '../../components/ai/AIActionConfirmModal';
import { useVocabulary } from '../../hooks/useVocabulary';
import { useAI } from '../../hooks/useAI';
import { useChatSegmentation } from '../../hooks/useChatSegmentation';
import { chatSegmentationService } from '../../services/chatSegmentationService';
import { useQuotaLimit } from '../../hooks/useQuotaLimit';

// Composants extraits
import { ChatHeader } from './components/ChatHeader';
import { MessagesContainer } from './components/MessagesContainer';
import { InputBar } from './components/InputBar';

// Hooks extraits
import { useMessageActions } from './hooks/useMessageActions';
import { useMessageProcessor } from './hooks/useMessageProcessor';

/**
 * Interface Message
 */
interface Message {
  id: string;
  type: 'user' | 'ai' | 'error' | 'code';
  content: string;
  timestamp: Date;
  metadata?: {
    executionTime?: number;
    securityScore?: number;
    isValid?: boolean;
    isFileContext?: boolean;
    hasFileContext?: boolean;
    fullText?: string;
    isSegmented?: boolean;
  };
}

/**
 * Container AIChatContainer
 */
export default function AIChatContainer() {
  // ═══════════════════════════════════════════════════════════════
  // Contexte et hooks globaux
  // ═══════════════════════════════════════════════════════════════
  const { state } = useApp();
  const { user } = state;
  const { isDarkMode } = useTheme(); // ✅ Utiliser useTheme comme source unique de vérité
  const location = useLocation();
  const { checkAndShowModal: checkQuotaWithModal, modal: quotaModal } = useQuotaLimit();

  const {
    isReady,
    isLoading: sdkLoading,
    error: sdkError,
    analyzeCode,
    clearError: clearSdkError,
    getContextStats,
  } = useCentrinoteAI({
    autoConnect: false,
  });

  const {
    sendMessage: sendEdgeMessage,
    loading: edgeLoading,
    error: edgeError,
    clearError: clearEdgeError,
    resetSession,
  } = useCentrinoteAI_Edge();

  const { ask: askWithFile } = useAI();
  const { vocabulary, loadVocabulary } = useVocabulary();

  // Hooks extraits
  const {
    segments,
    addSegments,
    clearSegments,
  } = useChatSegmentation();

  const { processMessage } = useMessageProcessor();

  // ═══════════════════════════════════════════════════════════════
  // État local
  // ═══════════════════════════════════════════════════════════════
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [mode, setMode] = useState<'chat' | 'analyze'>('chat');
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [lastMessageSegmented, setLastMessageSegmented] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const welcomeMessageShown = useRef(false);
  const sessionIdRef = useRef<string | null>(null);
  const userIdRef = useRef<string | null>(user?.id || null);

  // Hook pour gestion fichiers et actions IA
  const {
    selectedFile,
    fileInputRef,
    handleFileSelect,
    handleFileRemove,
    pendingAction,
    isActionModalOpen,
    isApplyingAction,
    handleConfirmAction,
    handleCancelAction,
    detectAIActions,
  } = useMessageActions({
    user,
    messages,
    setMessages,
    vocabulary,
    notes: state.notes || [],
    loadVocabulary,
    userIdRef,
    sessionIdRef,
    sendEdgeMessage,
    mode,
  });

  const aiError = edgeError ?? sdkError;
  const isLoading = mode === 'chat' ? edgeLoading : sdkLoading;

  const clearAllErrors = useCallback(() => {
    clearEdgeError();
    clearSdkError();
  }, [clearEdgeError, clearSdkError]);

  // ═══════════════════════════════════════════════════════════════
  // Effect: Charger les messages sauvegardés au montage
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    const loadSavedMessages = async () => {
      if (!user?.id) {
        console.log('⚠️ [AIChatContainer] Pas d\'utilisateur, impossible de charger les messages');
        setIsLoadingMessages(false);
        return;
      }

      userIdRef.current = user.id;
      setIsLoadingMessages(true);

      const loadingTimeout = setTimeout(() => {
        console.warn('⏱️ [AIChatContainer] Timeout de chargement atteint');
        setIsLoadingMessages(false);
      }, 3000);

      try {
        console.log('📥 [AIChatContainer] Chargement des messages sauvegardés pour:', user.id);

        const sessionId = await aiConversationService.getOrCreateSession(user.id);
        sessionIdRef.current = sessionId;

        const savedMessages = await aiConversationService.loadLatestSession(user.id);

        if (savedMessages.length > 0) {
          console.log('✅ [AIChatContainer] Messages chargés:', savedMessages.length);
          const convertedMessages: Message[] = savedMessages.map((msg: AIMessage) => ({
            id: msg.id,
            type: msg.type,
            content: msg.content,
            timestamp: msg.timestamp,
            metadata: msg.metadata,
          }));
          setMessages(convertedMessages);
          welcomeMessageShown.current = true;
        } else {
          console.log('ℹ️ [AIChatContainer] Aucun message sauvegardé trouvé');
          welcomeMessageShown.current = false;
        }
      } catch (error) {
        console.error('❌ [AIChatContainer] Erreur lors du chargement des messages:', error);
      } finally {
        clearTimeout(loadingTimeout);
        setIsLoadingMessages(false);
      }
    };

    if (location.pathname === '/search' && user?.id) {
      loadSavedMessages();
    } else {
      setIsLoadingMessages(false);
    }
  }, [user?.id, location.pathname]);

  // ═══════════════════════════════════════════════════════════════
  // Effect: Réinitialiser lors du démontage
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    return () => {
      console.log('🔄 [AIChatContainer] Composant démonté');
      welcomeMessageShown.current = false;
    };
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // Effect: Scroll automatique vers le dernier message
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ═══════════════════════════════════════════════════════════════
  // Effect: Surveiller les changements de messages (debug)
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    console.log('🔄 [AIChatContainer] Messages mis à jour:', messages.length, 'messages');
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      console.log('📝 [AIChatContainer] Dernier message dans state:', {
        id: lastMessage.id,
        type: lastMessage.type,
        contentLength: lastMessage.content?.length || 0,
        contentPreview: lastMessage.content?.substring(0, 100) || 'vide',
        hasContent: !!lastMessage.content && lastMessage.content.trim().length > 0,
      });
    }
  }, [messages]);

  // ═══════════════════════════════════════════════════════════════
  // Effect: Message de bienvenue
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    if (isReady && !isLoadingMessages && messages.length === 0 && segments.length === 0 && !welcomeMessageShown.current) {
      const timer = setTimeout(async () => {
        if (messages.length === 0 && segments.length === 0 && !welcomeMessageShown.current) {
          welcomeMessageShown.current = true;

          clearSegments();
          
          // Créer un seul message de bienvenue avec les 3 parties dans une seule bulle
          const welcomeContent = `🤖 Bonjour${user?.name ? ` ${user.name}` : ''} ! Je suis Noteo, votre assistant IA.

💡 Je peux vous aider à répondre à vos questions, analyser votre code, ou vous guider dans l'utilisation de Centrinote.

✨ Comment puis-je vous aider aujourd'hui ?`;

          const welcomeMessage: Message = {
            id: `welcome-${Date.now()}`,
            type: 'ai',
            content: welcomeContent,
            timestamp: new Date(),
            metadata: {
              isSegmented: false,
            },
          };

          setMessages([welcomeMessage]);

          if (userIdRef.current && sessionIdRef.current) {
            aiConversationService.saveMessage(
              userIdRef.current,
              sessionIdRef.current,
              welcomeMessage
            ).catch(err => console.warn('⚠️ Erreur sauvegarde message bienvenue:', err));
          }

          console.log('✅ [AIChatContainer] Message de bienvenue segmenté affiché');
        }
      }, 200);

      return () => clearTimeout(timer);
    }
  }, [isReady, isLoadingMessages, messages.length, segments.length, user?.name, clearSegments, addSegments]);

  // ═══════════════════════════════════════════════════════════════
  // Callback: Envoyer un message
  // ═══════════════════════════════════════════════════════════════
  const handleSend = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    const message = inputValue.trim();
    if (!message || isLoading || !isReady) {
      console.log('⚠️ [AIChatContainer] Envoi bloqué:', { message: !!message, isLoading, isReady });
      return;
    }

    const canUseAIChat = await checkQuotaWithModal('ai_chat', 0);
    if (!canUseAIChat) {
      return;
    }

    console.log('🚀 [AIChatContainer] Début envoi message:', message.substring(0, 50));

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: selectedFile ? `📎 ${selectedFile.name}\n\n${message}` : message,
      timestamp: new Date(),
    };

    setMessages(prev => {
      console.log('📤 [AIChatContainer] Ajout message utilisateur, total messages:', prev.length + 1);
      return [...prev, userMessage];
    });

    if (userIdRef.current && sessionIdRef.current) {
      aiConversationService.saveMessage(
        userIdRef.current,
        sessionIdRef.current,
        userMessage
      ).catch(err => console.warn('⚠️ Erreur sauvegarde message utilisateur:', err));
    } else if (userIdRef.current) {
      aiConversationService.getOrCreateSession(userIdRef.current).then(sessionId => {
        sessionIdRef.current = sessionId;
        aiConversationService.saveMessage(userIdRef.current!, sessionId, userMessage)
          .catch(err => console.warn('⚠️ Erreur sauvegarde message utilisateur:', err));
      });
    }

    setInputValue('');
    clearAllErrors();

    try {
      if (mode === 'analyze') {
        // Mode analyse de code
        const result = await analyzeCode(message);

        let analysisContent = '📊 **Analyse du code**\n\n';

        if (result.bugs.length > 0) {
          analysisContent += '🐛 **Bugs détectés:**\n';
          result.bugs.forEach(bug => {
            analysisContent += `- ${bug.type}: ${bug.message}${bug.line ? ` (ligne ${bug.line})` : ''}\n`;
          });
          analysisContent += '\n';
        }

        if (result.optimizations.length > 0) {
          analysisContent += '⚡ **Optimisations:**\n';
          result.optimizations.forEach(opt => {
            analysisContent += `- ${opt.message}${opt.suggestion ? `\n  💡 ${opt.suggestion}` : ''}\n`;
          });
          analysisContent += '\n';
        }

        analysisContent += `📈 **Complexité:** ${(result.complexity.score * 100).toFixed(0)}%\n`;
        if (result.complexity.factors.length > 0) {
          analysisContent += `Facteurs: ${result.complexity.factors.join(', ')}\n`;
        }

        const aiMessage: Message = {
          id: `ai-${Date.now()}`,
          type: 'ai',
          content: analysisContent,
          timestamp: new Date(),
          metadata: {
            executionTime: result.executionTime,
          },
        };

        setMessages(prev => [...prev, aiMessage]);

        if (userIdRef.current && sessionIdRef.current) {
          aiConversationService.saveMessage(
            userIdRef.current,
            sessionIdRef.current,
            aiMessage
          ).catch(err => console.warn('⚠️ Erreur sauvegarde message IA:', err));
        }
      } else {
        // Mode chat
        console.log('🚀 [AIChatContainer] Début complétion pour:', message.substring(0, 50));

        // Si un fichier est sélectionné
        if (selectedFile) {
          console.log('📤 [AIChatContainer] Envoi avec fichier:', selectedFile.name);

          const conversationHistory = [...messages, userMessage]
            .filter((msg) => msg.content && msg.content.trim().length > 0)
            .map((msg) => ({
              role: msg.type === 'user' ? 'user' : 'assistant',
              content: msg.content,
            }));

          const fileResult = await askWithFile(message, selectedFile, conversationHistory);

          if (fileResult?.extractedText) {
            const fileContextMessage: Message = {
              id: `file-context-${Date.now()}`,
              type: 'ai',
              content: `📄 **Contenu du document "${selectedFile.name}"**:\n\n${fileResult.extractedText.substring(0, 2000)}${fileResult.extractedText.length > 2000 ? '...' : ''}`,
              timestamp: new Date(),
              metadata: {
                isFileContext: true,
                fullText: fileResult.extractedText,
              },
            };

            setMessages(prev => [...prev, fileContextMessage]);

            if (userIdRef.current && sessionIdRef.current) {
              aiConversationService.saveMessage(
                userIdRef.current,
                sessionIdRef.current,
                fileContextMessage
              ).catch(err => console.warn('⚠️ Erreur sauvegarde contexte fichier:', err));
            }
          }

          const fileMessage: Message = {
            id: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'ai',
            content: fileResult?.reply || "Pas de réponse",
            timestamp: new Date(),
            metadata: {
              isValid: true,
              securityScore: 1,
              hasFileContext: true,
            },
          };

          setMessages(prev => [...prev, fileMessage]);

          if (userIdRef.current && sessionIdRef.current) {
            aiConversationService.saveMessage(
              userIdRef.current,
              sessionIdRef.current,
              fileMessage
            ).catch(err => console.warn('⚠️ Erreur sauvegarde message IA:', err));
          }

          handleFileRemove();

          console.log('✅ [AIChatContainer] Message avec fichier traité');
          return;
        }

        // Mode normal sans fichier - Utiliser l'orchestrateur Noteo
        const problemType = chatSegmentationService.analyzeProblem(message);

        console.log('🔄 [AIChatContainer] Appel orchestrateur Noteo...');

        let memoryResponse;
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.access_token) {
            throw new Error('Non authentifié');
          }

          const { data: orchestratorData, error: orchestratorError } = await supabase.functions.invoke('noteo-orchestrator', {
            body: {
              message,
              service: 'chat',
            },
          });

          console.log('🔍 [AIChatContainer] Debug orchestrateur:', {
            hasData: !!orchestratorData,
            hasError: !!orchestratorError,
            errorMessage: orchestratorError?.message,
            dataType: typeof orchestratorData,
            dataKeys: orchestratorData ? Object.keys(orchestratorData) : [],
            reply: orchestratorData?.reply,
            error: orchestratorData?.error,
          });

          if (orchestratorError) {
            throw new Error(`Orchestrateur error: ${orchestratorError.message}`);
          }

          // Vérifier si l'orchestrateur a retourné une erreur dans le body
          if (orchestratorData?.error) {
            throw new Error(`Orchestrateur error: ${orchestratorData.error}`);
          }

          memoryResponse = {
            success: true,
            response: orchestratorData?.reply || '',
            error: orchestratorData?.error,
          };

          console.log('📥 [AIChatContainer] Réponse orchestrateur:', {
            success: memoryResponse.success,
            hasResponse: !!memoryResponse.response,
            responseLength: memoryResponse.response?.length || 0,
            responsePreview: memoryResponse.response?.substring(0, 100),
          });
        } catch (error) {
          console.error('❌ [AIChatContainer] Erreur lors de l\'appel orchestrateur:', error);

          // Fallback vers l'Edge Function directement
          const conversationMessages = [...messages, userMessage]
            .filter((msg) => msg.content && msg.content.trim().length > 0)
            .map((msg) => ({
              role: (msg.type === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
              content: msg.metadata?.isFileContext && msg.metadata?.fullText
                ? `📄 Contenu du document:\n\n${msg.metadata.fullText}`
                : msg.content,
            }));

          try {
            const edgeReply = await sendEdgeMessage(conversationMessages);

            const aiMessage: Message = {
              id: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              type: 'ai',
              content: edgeReply.reply || 'Pas de réponse',
              timestamp: new Date(),
              metadata: {
                isValid: true,
                securityScore: 1,
              },
            };

            setMessages(prev => [...prev, aiMessage]);

            if (userIdRef.current && sessionIdRef.current) {
              aiConversationService.saveMessage(
                userIdRef.current,
                sessionIdRef.current,
                aiMessage
              ).catch(err => console.warn('⚠️ Erreur sauvegarde message IA:', err));
            }
          } catch (fallbackError) {
            console.error('❌ [AIChatContainer] Erreur fallback Edge Function:', fallbackError);
            const errorMessage: Message = {
              id: `error-${Date.now()}`,
              type: 'error',
              content: 'Erreur lors de la communication avec l\'IA. Veuillez réessayer.',
              timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorMessage]);
          }
          return;
        }

        if (!memoryResponse.success || !memoryResponse.response || memoryResponse.response.trim().length === 0) {
          const errorMessage: Message = {
            id: `error-${Date.now()}`,
            type: 'error',
            content: memoryResponse.error || 'L\'IA n\'a pas pu générer de réponse. Veuillez réessayer.',
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, errorMessage]);

          if (userIdRef.current && sessionIdRef.current) {
            aiConversationService.saveMessage(
              userIdRef.current,
              sessionIdRef.current,
              errorMessage
            ).catch(err => console.warn('⚠️ Erreur sauvegarde message erreur:', err));
          }

          return;
        }

        // Traiter la réponse avec useMessageProcessor
        setLastMessageSegmented(true);

        const processed = await processMessage({
          rawContent: memoryResponse.response,
          mode: 'chat',
          problemType,
        });

        console.log('✅ [AIChatContainer] Contenu traité:', processed.processedContent.substring(0, 50));

        // Segmentation si message long
        if (processed.shouldSegment && processed.segments) {
          console.log('📦 [AIChatContainer] Message long détecté, segmentation en cours...');

          clearSegments();
          await addSegments(processed.segments, 1500);

          const newMessage: Message = {
            id: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: processed.messageType,
            content: processed.processedContent,
            timestamp: new Date(),
            metadata: {
              securityScore: 1,
              isValid: true,
              isSegmented: true,
            },
          };

          setMessages(prev => [...prev, newMessage]);

          if (userIdRef.current && sessionIdRef.current) {
            aiConversationService.saveMessage(
              userIdRef.current,
              sessionIdRef.current,
              newMessage
            ).catch(err => console.warn('⚠️ Erreur sauvegarde message IA:', err));
          }

          setLastMessageSegmented(false);
        } else {
          // Message court
          const newMessage: Message = {
            id: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: processed.messageType,
            content: processed.processedContent,
            timestamp: new Date(),
            metadata: {
              securityScore: 1,
              isValid: true,
            },
          };

          setMessages(prev => [...prev, newMessage]);

          if (userIdRef.current && sessionIdRef.current) {
            aiConversationService.saveMessage(
              userIdRef.current,
              sessionIdRef.current,
              newMessage
            ).catch(err => console.warn('⚠️ Erreur sauvegarde message IA:', err));
          }

          setLastMessageSegmented(false);
        }

        // Détecter les actions proposées par l'IA
        if (mode === 'chat' && processed.processedContent) {
          detectAIActions(processed.processedContent);
        }
      }
    } catch (err) {
      console.error('❌ [AIChatContainer] Erreur lors de l\'envoi:', err);

      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';

      const errorMsg: Message = {
        id: `error-${Date.now()}`,
        type: 'error',
        content: `Erreur: ${errorMessage}. Veuillez réessayer ou vérifier votre connexion.`,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMsg]);

      if (userIdRef.current && sessionIdRef.current) {
        aiConversationService.saveMessage(
          userIdRef.current,
          sessionIdRef.current,
          errorMsg
        ).catch(saveErr => console.warn('⚠️ Erreur sauvegarde message erreur:', saveErr));
      }
    }
  }, [
    inputValue,
    isLoading,
    isReady,
    mode,
    selectedFile,
    analyzeCode,
    clearAllErrors,
    messages,
    sendEdgeMessage,
    askWithFile,
    processMessage,
    clearSegments,
    addSegments,
    checkQuotaWithModal,
    detectAIActions,
    handleFileRemove,
  ]);

  // ═══════════════════════════════════════════════════════════════
  // Callback: Effacer les messages
  // ═══════════════════════════════════════════════════════════════
  const handleClear = useCallback(async () => {
    console.log('🧹 [AIChatContainer] Effacement des messages');

    if (resetSession) {
      await resetSession();
    }

    if (userIdRef.current && sessionIdRef.current) {
      try {
        await aiConversationService.clearSession(userIdRef.current, sessionIdRef.current);
        console.log('✅ [AIChatContainer] Session supprimée de la base de données');
        const newSessionId = await aiConversationService.getOrCreateSession(userIdRef.current);
        sessionIdRef.current = newSessionId;
      } catch (error) {
        console.error('❌ [AIChatContainer] Erreur lors de la suppression de la session:', error);
      }
    }

    setMessages([]);
    clearSegments();
    setLastMessageSegmented(false);
    clearAllErrors();
    welcomeMessageShown.current = false;
  }, [clearAllErrors, resetSession, clearSegments]);

  // ═══════════════════════════════════════════════════════════════
  // Callback: Copier un message
  // ═══════════════════════════════════════════════════════════════
  const handleCopyMessage = useCallback((content: string) => {
    navigator.clipboard.writeText(content);
    console.log('📋 [AIChatContainer] Message copié dans le presse-papier');
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // Callback: Régénérer un message
  // ═══════════════════════════════════════════════════════════════
  const handleRegenerateMessage = useCallback(async (messageId: string) => {
    try {
      const messageIndex = messages.findIndex(m => m.id === messageId);
      if (messageIndex === -1) {
        console.warn('⚠️ Message non trouvé pour régénération');
        return;
      }

      let lastUserMessage: Message | null = null;
      for (let i = messageIndex - 1; i >= 0; i--) {
        if (messages[i].type === 'user') {
          lastUserMessage = messages[i];
          break;
        }
      }

      if (!lastUserMessage) {
        console.warn('⚠️ Aucun message utilisateur trouvé pour régénérer');
        return;
      }

      setMessages(prev => prev.slice(0, messageIndex));

      const userContent = lastUserMessage.content.replace(/^📎 .+\n\n/, '');
      setInputValue(userContent);

      setTimeout(async () => {
        const syntheticEvent = {
          preventDefault: () => {},
          target: { value: userContent },
        } as React.FormEvent;
        await handleSend(syntheticEvent);
      }, 100);
    } catch (error) {
      console.error('❌ Erreur lors de la régénération:', error);
    }
  }, [messages, handleSend]);

  // ═══════════════════════════════════════════════════════════════
  // Callback: Liker un message
  // ═══════════════════════════════════════════════════════════════
  const handleLikeMessage = useCallback((messageId: string) => {
    console.log('👍 Message aimé:', messageId);
    // TODO: Implémenter la sauvegarde du feedback dans aiConversationService
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // Callback: Actions rapides sur fichier
  // ═══════════════════════════════════════════════════════════════
  const handleQuickAction = useCallback((action: 'summary' | 'extract' | 'ask') => {
    if (action === 'summary') {
      setInputValue('Résume ce document en quelques points clés');
    } else if (action === 'extract') {
      setInputValue('Extrais les informations principales de ce document');
    } else if (action === 'ask') {
      setInputValue('');
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════════
  const contextStats = getContextStats();
  const [isMinimized] = useState(false);

  return (
    <motion.div
      className="flex flex-col h-full bg-white dark:bg-gray-900"
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <ChatHeader
        mode={mode}
        onModeChange={setMode}
        isReady={isReady}
        contextStats={contextStats}
      />

      {/* Zone de Messages */}
      <AnimatePresence>
        {!isMinimized && (
          <MessagesContainer
            messages={messages}
            segments={segments}
            isLoadingMessages={isLoadingMessages}
            isLoading={isLoading}
            user={user}
            messagesEndRef={messagesEndRef}
            onCopyMessage={handleCopyMessage}
            onRegenerateMessage={handleRegenerateMessage}
            onLikeMessage={handleLikeMessage}
          />
        )}
      </AnimatePresence>

      {/* Zone Input */}
      <AnimatePresence>
        {!isMinimized && (
          <InputBar
            inputValue={inputValue}
            onInputChange={setInputValue}
            onSubmit={handleSend}
            onFileSelect={handleFileSelect}
            isLoading={isLoading}
            isReady={isReady}
            selectedFile={selectedFile}
            onRemoveFile={handleFileRemove}
            onQuickAction={handleQuickAction}
            fileInputRef={fileInputRef}
            user={user}
          />
        )}
      </AnimatePresence>

      {/* Modal de confirmation pour les actions IA */}
      <AIActionConfirmModal
        isOpen={isActionModalOpen}
        action={pendingAction}
        onConfirm={handleConfirmAction}
        onCancel={handleCancelAction}
        isLoading={isApplyingAction}
      />

      {/* Modal de limite de quota */}
      {quotaModal}
    </motion.div>
  );
}

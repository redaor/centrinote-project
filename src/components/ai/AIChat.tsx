/**
 * Composant de chat IA pour Centrinote
 * Interface moderne pour interagir avec l'IA générative
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, Brain, AlertCircle, CheckCircle, Sparkles, Paperclip, X, MessageCircle, Search, Shield, Copy, RefreshCw, ThumbsUp, MoreVertical, Minimize2, Maximize2 } from 'lucide-react';
import { useCentrinoteAI } from '../../hooks/useCentrinoteAI';
import { useCentrinoteAI_Edge } from '../../hooks/useCentrinoteAI_Edge';
import { useApp } from '../../contexts/AppContext';
import { aiConversationService, type AIMessage } from '../../services/aiConversationService';
import { chatMemoryService } from '../../services/chatMemoryService';
import { AIActionParser, type AIAction } from '../../services/ai/actionParser';
import { AIActionConfirmModal } from './AIActionConfirmModal';
import { vocabularyService } from '../../services/vocabularyService';
import { notesService } from '../../services/notesService';
import { useVocabulary } from '../../hooks/useVocabulary';
import { useAI } from '../../hooks/useAI';
import { FileContextCard } from './FileContextCard';
import { ContextBadge } from './ContextBadge';
import { AIResponseCard } from './AIResponseCard';
import { VoiceRecognition } from './VoiceRecognition';
import { useChatSegmentation, type ChatSegment } from '../../hooks/useChatSegmentation';
import { chatSegmentationService } from '../../services/chatSegmentationService';
import { SegmentedMessage } from './SegmentedMessage';
import { NoteoMessageWrapper } from './NoteoMessageWrapper';
import { analyzeMessage } from '../../utils/noteoMessageDetector';

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
  };
}

export function AIChat() {
  const { state } = useApp();
  const { darkMode, user } = state;
  const location = useLocation(); // Pour détecter les changements de route

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
    resetSession, // MEM-FIX: Récupérer la fonction resetSession
  } = useCentrinoteAI_Edge();

  // État local
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [mode, setMode] = useState<'chat' | 'analyze'>('chat');
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const welcomeMessageShown = useRef(false);
  const lastLocationRef = useRef<string>('');
  const sessionIdRef = useRef<string | null>(null);
  const userIdRef = useRef<string | null>(user?.id || null);

  // Hook de segmentation pour les messages
  const {
    segments,
    addSegment,
    addSegments,
    clearSegments,
  } = useChatSegmentation();
  
  // État pour savoir si on utilise la segmentation pour le dernier message
  const [lastMessageSegmented, setLastMessageSegmented] = useState(false);

  // État pour les actions proposées par l'IA
  const [pendingAction, setPendingAction] = useState<AIAction | null>(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [isApplyingAction, setIsApplyingAction] = useState(false);

  // État pour l'upload de fichiers
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { ask: askWithFile } = useAI();

  // Charger le vocabulaire pour le contexte
  const { vocabulary, loadVocabulary } = useVocabulary();

  const aiError = edgeError ?? sdkError;
  const isLoading = mode === 'chat' ? edgeLoading : sdkLoading;

  const clearAllErrors = useCallback(() => {
    clearEdgeError();
    clearSdkError();
  }, [clearEdgeError, clearSdkError]);
  
  // Charger les messages sauvegardés au montage du composant
  useEffect(() => {
    const loadSavedMessages = async () => {
      if (!user?.id) {
        console.log('⚠️ [AIChat] Pas d\'utilisateur, impossible de charger les messages');
        setIsLoadingMessages(false);
        return;
      }

      userIdRef.current = user.id;
      setIsLoadingMessages(true);

      try {
        console.log('📥 [AIChat] Chargement des messages sauvegardés pour:', user.id);
        
        // Récupérer ou créer une session
        const sessionId = await aiConversationService.getOrCreateSession(user.id);
        sessionIdRef.current = sessionId;
        
        console.log('📋 [AIChat] Session ID:', sessionId);
        
        // Charger les messages de la session
        const savedMessages = await aiConversationService.loadLatestSession(user.id);
        
        if (savedMessages.length > 0) {
          console.log('✅ [AIChat] Messages chargés:', savedMessages.length);
          // Convertir les messages sauvegardés au format Message
          const convertedMessages: Message[] = savedMessages.map((msg: AIMessage) => ({
            id: msg.id,
            type: msg.type,
            content: msg.content,
            timestamp: msg.timestamp,
            metadata: msg.metadata,
          }));
          setMessages(convertedMessages);
          welcomeMessageShown.current = true; // Ne pas afficher le message de bienvenue si on a des messages
        } else {
          console.log('ℹ️ [AIChat] Aucun message sauvegardé trouvé');
          welcomeMessageShown.current = false;
        }
      } catch (error) {
        console.error('❌ [AIChat] Erreur lors du chargement des messages:', error);
        // Continuer sans bloquer l'UI
      } finally {
        setIsLoadingMessages(false);
      }
    };

    // Charger seulement si on est sur /search
    if (location.pathname === '/search' && user?.id) {
      loadSavedMessages();
    } else {
      setIsLoadingMessages(false);
    }
  }, [user?.id, location.pathname]);
  
  // Réinitialiser lors du démontage
  useEffect(() => {
    return () => {
      console.log('🔄 [AIChat] Composant démonté');
      welcomeMessageShown.current = false;
    };
  }, []);

  // Scroll automatique vers le dernier message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 🔄 Surveiller les changements de messages pour déboguer
  useEffect(() => {
    console.log('🔄 [AIChat] Messages mis à jour:', messages.length, 'messages');
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      console.log('📝 [AIChat] Dernier message dans state:', {
        id: lastMessage.id,
        type: lastMessage.type,
        contentLength: lastMessage.content?.length || 0,
        contentPreview: lastMessage.content?.substring(0, 100) || 'vide',
        hasContent: !!lastMessage.content && lastMessage.content.trim().length > 0,
      });
      
      // Log tous les messages pour vérifier (uniquement en développement)
      if (import.meta.env.DEV) {
        console.log('📚 [AIChat] Tous les messages:', messages.map(m => ({
          id: m.id,
          type: m.type,
          contentLength: m.content?.length || 0,
        })));
      }
    } else {
      console.log('📭 [AIChat] Aucun message dans le state');
    }
  }, [messages]);

  // Message de bienvenue - afficher après chargement si aucun message sauvegardé
  useEffect(() => {
    // Afficher le message de bienvenue seulement si :
    // - L'IA est prête
    // - Le chargement est terminé
    // - Il n'y a pas de messages
    // - On n'a pas déjà affiché le message de bienvenue
    if (isReady && !isLoadingMessages && messages.length === 0 && segments.length === 0 && !welcomeMessageShown.current) {
      const timer = setTimeout(async () => {
        if (messages.length === 0 && segments.length === 0 && !welcomeMessageShown.current) {
          welcomeMessageShown.current = true;
          
          // 🎯 NOUVEAU: Utiliser la segmentation pour le message de bienvenue
          clearSegments();
          const welcomeSegments = [
            {
              emoji: '🤖',
              content: `Bonjour${user?.name ? ` ${user.name}` : ''} ! Je suis Noteo, votre assistant IA.`,
            },
            {
              emoji: '💡',
              content: 'Je peux vous aider à répondre à vos questions, analyser votre code, ou vous guider dans l\'utilisation de Centrinote.',
            },
            {
              emoji: '✨',
              content: 'Comment puis-je vous aider aujourd\'hui ?',
            },
          ];
          
          await addSegments(welcomeSegments, 2000);
          
          // Sauvegarder aussi un message de bienvenue classique pour la compatibilité
          const welcomeMessage: Message = {
            id: `welcome-${Date.now()}`,
            type: 'ai',
            content: `Bonjour${user?.name ? ` ${user.name}` : ''} ! Je suis Noteo, votre assistant IA. Je peux vous aider à répondre à vos questions ou analyser votre code existant.`,
            timestamp: new Date(),
            metadata: {
              isSegmented: true,
            },
          };
          
          setMessages([welcomeMessage]);
          
          // Sauvegarder le message de bienvenue
          if (userIdRef.current && sessionIdRef.current) {
            aiConversationService.saveMessage(
              userIdRef.current,
              sessionIdRef.current,
              welcomeMessage
            ).catch(err => console.warn('⚠️ Erreur sauvegarde message bienvenue:', err));
          }
          
          console.log('✅ [AIChat] Message de bienvenue segmenté affiché');
        }
      }, 200);
      
      return () => clearTimeout(timer);
    }
  }, [isReady, isLoadingMessages, messages.length, segments.length, user?.name, clearSegments, addSegments]);

  const handleSend = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    const message = inputValue.trim();
    if (!message || isLoading || !isReady) {
      console.log('⚠️ [AIChat] Envoi bloqué:', { message: !!message, isLoading, isReady });
      return;
    }

    console.log('🚀 [AIChat] Début envoi message:', message.substring(0, 50));

    // Vérifier si un fichier est sélectionné
    if (selectedFile) {
      console.log('📄 [AIChat] Fichier détecté:', selectedFile.name);
    }

    // Ajouter le message utilisateur
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: selectedFile ? `📎 ${selectedFile.name}\n\n${message}` : message,
      timestamp: new Date(),
    };

    setMessages(prev => {
      console.log('📤 [AIChat] Ajout message utilisateur, total messages:', prev.length + 1);
      return [...prev, userMessage];
    });
    
    // Sauvegarder le message utilisateur
    if (userIdRef.current && sessionIdRef.current) {
      aiConversationService.saveMessage(
        userIdRef.current,
        sessionIdRef.current,
        userMessage
      ).catch(err => console.warn('⚠️ Erreur sauvegarde message utilisateur:', err));
    } else if (userIdRef.current) {
      // Si pas de session ID, créer une session d'abord
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
        // Analyse de code
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
        
        // Sauvegarder le message IA
        if (userIdRef.current && sessionIdRef.current) {
          aiConversationService.saveMessage(
            userIdRef.current,
            sessionIdRef.current,
            aiMessage
          ).catch(err => console.warn('⚠️ Erreur sauvegarde message IA:', err));
        }
      } else {
        // Complétion / Chat standard
        console.log('🚀 [AIChat] Début complétion pour:', message.substring(0, 50));

        // Si un fichier est sélectionné, utiliser le hook useAI avec fichier
        if (selectedFile) {
          console.log('📤 [AIChat] Envoi avec fichier:', selectedFile.name);

          // Construire l'historique de conversation pour le contexte
          const conversationHistory = [...messages, userMessage]
            .filter((msg) => msg.content && msg.content.trim().length > 0)
            .map((msg) => ({
              role: msg.type === 'user' ? 'user' : 'assistant',
              content: msg.content,
            }));

          console.log('📚 [AIChat] Historique envoyé avec fichier:', conversationHistory.length, 'messages');

          const fileResult = await askWithFile(message, selectedFile, conversationHistory);

          console.log('📥 [AIChat] Réponse fichier reçue:', {
            replyLength: fileResult?.reply?.length || 0,
            replyPreview: fileResult?.reply?.substring(0, 100) || 'vide',
            hasExtractedText: !!fileResult?.extractedText,
            extractedTextLength: fileResult?.extractedText?.length || 0,
          });

          // Ajouter un message système avec le contenu du fichier pour conserver le contexte
          if (fileResult?.extractedText) {
            const fileContextMessage: Message = {
              id: `file-context-${Date.now()}`,
              type: 'ai',
              content: `📄 **Contenu du document "${selectedFile.name}"**:\n\n${fileResult.extractedText.substring(0, 2000)}${fileResult.extractedText.length > 2000 ? '...' : ''}`,
              timestamp: new Date(),
              metadata: {
                isFileContext: true,
                fullText: fileResult.extractedText, // Stocker le texte complet
              },
            };

            // Ajouter le contexte du fichier à l'historique
            setMessages(prev => [...prev, fileContextMessage]);

            // Sauvegarder le message de contexte
            if (userIdRef.current && sessionIdRef.current) {
              aiConversationService.saveMessage(
                userIdRef.current,
                sessionIdRef.current,
                fileContextMessage
              ).catch(err => console.warn('⚠️ Erreur sauvegarde contexte fichier:', err));
            }

            console.log('✅ [AIChat] Contexte du fichier ajouté à l\'historique');
          }

          // Créer directement le message IA sans traitement supplémentaire
          const fileMessage: Message = {
            id: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'ai',
            content: fileResult?.reply || "Pas de réponse",
            timestamp: new Date(),
            metadata: {
              isValid: true,
              securityScore: 1,
              hasFileContext: true, // Marquer que ce message contient le contexte d'un fichier
            },
          };

          setMessages(prev => [...prev, fileMessage]);

          // Sauvegarder le message IA
          if (userIdRef.current && sessionIdRef.current) {
            aiConversationService.saveMessage(
              userIdRef.current,
              sessionIdRef.current,
              fileMessage
            ).catch(err => console.warn('⚠️ Erreur sauvegarde message IA:', err));
          }

          // Réinitialiser le fichier après envoi et sauvegarde
          setSelectedFile(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }

          console.log('✅ [AIChat] Message avec fichier traité');
          return; // Important: sortir ici pour éviter le traitement normal
        }

        // Mode normal sans fichier - Utiliser chat-memory pour la mémoire persistante
        // 🎯 NOUVEAU: Analyser le problème AVANT d'envoyer le message
        const problemType = chatSegmentationService.analyzeProblem(message);
        
        const memoryResponse = await chatMemoryService.sendMessage(message, user?.id || null);

        if (!memoryResponse.success) {
          // Fallback vers l'ancienne méthode si chat-memory échoue
          const conversationMessages = [...messages, userMessage]
            .filter((msg) => msg.content && msg.content.trim().length > 0)
            .map((msg) => ({
              role: msg.type === 'user' ? 'user' : 'assistant',
              content: msg.metadata?.isFileContext && msg.metadata?.fullText
                ? `📄 Contenu du document:\n\n${msg.metadata.fullText}`
                : msg.content,
            }));
          const edgeReply = await sendEdgeMessage(conversationMessages);
          
          const result = {
            suggestion: edgeReply.reply,
            isValid: true,
            securityScore: 1,
          };
          
          // Continuer avec le traitement normal...
          if (!result.suggestion || result.suggestion.trim().length === 0) {
            const errorMessage: Message = {
              id: `error-${Date.now()}`,
              type: 'error',
              content: memoryResponse.error || 'L\'IA n\'a pas pu générer de réponse. Veuillez réessayer.',
              timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorMessage]);
            return;
          }
          
          // Traiter la réponse (code existant ci-dessous)
          let processedContent = result.suggestion.trim();
          let messageType: 'ai' | 'code' = 'ai';
          
          // ... (continuer avec le code existant pour traiter la réponse)
          const aiMessage: Message = {
            id: `ai-${Date.now()}`,
            type: messageType,
            content: processedContent,
            timestamp: new Date(),
            metadata: {
              executionTime: edgeReply.timestamp ? Date.now() - new Date(edgeReply.timestamp).getTime() : undefined,
            },
          };
          
          setMessages(prev => [...prev, aiMessage]);
          
          // Sauvegarder le message IA
          if (userIdRef.current && sessionIdRef.current) {
            aiConversationService.saveMessage(
              userIdRef.current,
              sessionIdRef.current,
              aiMessage
            ).catch(err => console.warn('⚠️ Erreur sauvegarde message IA:', err));
          }
          
          return;
        }

        // Utiliser la réponse de chat-memory
        console.log('📥 [AIChat] Réponse chat-memory reçue:', {
          replyLength: memoryResponse.response?.length || 0,
          conversationId: memoryResponse.conversation_id?.substring(0, 8) + '...',
        });

        const result = {
          suggestion: memoryResponse.response,
          isValid: true,
          securityScore: 1,
        };

        if (!result.suggestion || result.suggestion.trim().length === 0) {
          console.error('❌ [AIChat] Suggestion vide ou invalide');
          const errorMessage: Message = {
            id: `error-${Date.now()}`,
            type: 'error',
            content: 'L\'IA n\'a pas pu générer de réponse. Veuillez réessayer.',
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, errorMessage]);
          
          // Sauvegarder le message d'erreur
          if (userIdRef.current && sessionIdRef.current) {
            aiConversationService.saveMessage(
              userIdRef.current,
              sessionIdRef.current,
              errorMessage
            ).catch(err => console.warn('⚠️ Erreur sauvegarde message erreur:', err));
          }
          
          return;
        }

        // Préparer la segmentation
        setLastMessageSegmented(true);

        // Traiter la réponse pour détecter si c'est du code ou du texte
        let processedContent = result.suggestion.trim();
        let messageType: 'ai' | 'code' = 'ai';
        
        // En mode chat, on veut toujours du texte naturel, pas du code
        if (mode === 'chat') {
          // Détecter les blocs de code markdown (```language ... ```)
          const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
          const hasCodeBlock = codeBlockRegex.test(processedContent);
          
          if (hasCodeBlock) {
            const matches = Array.from(processedContent.matchAll(codeBlockRegex));
            
            // Si c'est un seul bloc de code, extraire le contenu
            if (matches.length === 1) {
              const codeBlock = matches[0][2].trim(); // Le contenu du code
              
              // Détecter si c'est vraiment du code (fonctions, déclarations, etc.)
              const isRealCode = codeBlock.match(/^(const|let|var|function|export|class|interface|type|enum|async|import|export)\s+|^\w+\s*\([^)]*\)\s*[:{]\s*$|^\w+\s*\([^)]*\)\s*:\s*\w+\s*[{;]|^\w+\s*\([^)]*:\s*\w+\)/);
              
              if (isRealCode) {
                // C'est vraiment du code généré par erreur, demander une reformulation
                processedContent = `Je peux t'aider ! Cependant, j'ai généré du code alors que tu étais en mode conversation. Peux-tu reformuler ta question de manière plus explicite ? Par exemple, au lieu de "corrige", dis-moi ce que tu veux corriger exactement.`;
                messageType = 'ai';
                console.log('⚠️ [AIChat] Code détecté en mode chat, demande de reformulation');
              } else if (codeBlock.includes('"') || codeBlock.includes("'")) {
                // Extraire le texte entre guillemets
                const textMatches = codeBlock.matchAll(/(["'])(?:(?=(\\?))\2.)*?\1/g);
                const allTexts = Array.from(textMatches).map(m => m[0].slice(1, -1));
                
                if (allTexts.length > 0 && allTexts[0].length > 5) {
                  const longestText = allTexts.reduce((a, b) => a.length > b.length ? a : b);
                  processedContent = longestText;
                  messageType = 'ai';
                  console.log('📝 [AIChat] Texte extrait du bloc de code:', processedContent);
                } else {
                  // Pas de texte, utiliser le contenu directement
                  processedContent = codeBlock;
                  messageType = 'ai';
                }
              } else {
                // Pas de guillemets, utiliser le contenu directement comme texte
                processedContent = codeBlock;
                messageType = 'ai';
                console.log('📝 [AIChat] Bloc traité comme texte');
              }
            } else {
              // Plusieurs blocs, garder le format mais enlever les backticks
              processedContent = processedContent.replace(/```[\w]*\n?/g, '').replace(/```/g, '').trim();
              messageType = 'ai';
            }
          } else {
            // Pas de bloc de code, mais vérifier si c'est du code inline (fonction, déclaration, etc.)
            // Détecter aussi les fragments de code comme "await getLastNote()", "? await", etc.
            const codePatterns = [
              /^(const|let|var|function|export|class|interface|async|import|export)\s+/,
              /^\w+\s*\([^)]*\)\s*[:{]\s*$/,
              /^\w+\s*\([^)]*\)\s*:\s*\w+\s*[{;]/,
              /^\w+\s*\([^)]*:\s*\w+\)/,
              /\?.*await.*:/,  // Ternary avec await
              /await\s+\w+\s*\([^)]*\)/,  // await function()
              /getLastNote|getVocabulary|getNotes/,  // Noms de fonctions spécifiques
            ];
            
            const containsCode = codePatterns.some(pattern => pattern.test(processedContent));
            
            if (containsCode) {
              // C'est du code, transformer en message d'aide
              processedContent = `Je comprends ta question. Cependant, je ne peux pas exécuter de code. Peux-tu reformuler ta demande de manière conversationnelle ? Par exemple, au lieu de code, dis-moi simplement ce que tu veux savoir ou ce dont tu as besoin.`;
              messageType = 'ai';
              console.log('⚠️ [AIChat] Code inline détecté, conversion en texte');
            }
          }
          
          // Nettoyage final : enlever tous les backticks restants et fragments de code
          processedContent = processedContent
            .replace(/```[\w]*\n?/g, '')
            .replace(/```/g, '')
            .replace(/\?\s*await\s+[^:]+:\s*null/g, '') // Nettoyer les ternaires avec await
            .replace(/await\s+\w+\s*\([^)]*\)/g, '') // Nettoyer les await function()
            .trim();
          
          // Si après nettoyage le contenu est vide ou très court, utiliser un message par défaut
          if (processedContent.length < 10) {
            processedContent = `Je n'ai pas pu générer une réponse valide. Peux-tu reformuler ta question ?`;
          }
        } else {
          // Mode analyse : garder le code tel quel
          messageType = 'code';
        }
        
        console.log('✅ [AIChat] Ajout du message AI avec contenu:', processedContent.substring(0, 50), 'type:', messageType);
        
        // 🎯 NOUVEAU: Segmenter la réponse si elle est longue
        if (processedContent.length > 200) {
          // Segmenter la réponse complète
          const responseSegments = chatSegmentationService.segmentResponse(processedContent, problemType);
          
          // Effacer les segments précédents et ajouter les nouveaux
          clearSegments();
          
          // Ajouter les segments de réponse progressivement
          await addSegments(responseSegments, 1500);
          
          // Créer aussi un message normal pour la sauvegarde (masqué visuellement)
          const newMessage: Message = {
            id: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: messageType,
            content: processedContent,
            timestamp: new Date(),
            metadata: {
              securityScore: result.securityScore,
              isValid: result.isValid,
              isSegmented: true,
            },
          };
          
          // Sauvegarder le message complet en arrière-plan
          if (userIdRef.current && sessionIdRef.current) {
            aiConversationService.saveMessage(
              userIdRef.current,
              sessionIdRef.current,
              newMessage
            ).catch(err => console.warn('⚠️ Erreur sauvegarde message IA:', err));
          }
          
          setLastMessageSegmented(false);
        } else {
          // Mode normal : message unique (courtes réponses)
          const newMessage: Message = {
            id: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: messageType,
            content: processedContent,
            timestamp: new Date(),
            metadata: {
              securityScore: result.securityScore,
              isValid: result.isValid,
            },
          };
          
          setMessages(prev => {
            const updated = [...prev, newMessage];
            console.log('🔄 [AIChat] State mis à jour, total messages:', updated.length);
            return updated;
          });
          
          // Sauvegarder le message
          if (userIdRef.current && sessionIdRef.current) {
            aiConversationService.saveMessage(
              userIdRef.current,
              sessionIdRef.current,
              newMessage
            ).catch(err => console.warn('⚠️ Erreur sauvegarde message IA:', err));
          }
          
          setLastMessageSegmented(false);
        }
        
        // 🔍 Détecter les actions proposées par l'IA
        if (mode === 'chat' && processedContent) {
          // Charger les notes pour le contexte
          const notes = state.notes || [];
          const vocabularyContext = vocabulary.map(v => ({
            id: v.id,
            word: v.word,
            definition: v.definition,
          }));
          const notesContext = notes.map(n => ({
            id: n.id,
            title: n.title,
            content: n.content || '',
          }));
          
          const detectedActions = AIActionParser.parseActions(processedContent, {
            vocabulary: vocabularyContext,
            notes: notesContext,
          });
          
          if (detectedActions.length > 0) {
            console.log('✅ [AIChat] Actions détectées:', detectedActions);
            const action = detectedActions[0];
            
            // Si c'est une demande de confirmation (étape 1), afficher la modal de confirmation
            if (action.type === 'confirm_correction') {
              setPendingAction(action);
              setIsActionModalOpen(true);
            } 
            // Si c'est une proposition de modification directe (étape 3), afficher la modal de confirmation finale
            else if (action.type === 'update_vocabulary' || action.type === 'update_note') {
              setPendingAction(action);
              setIsActionModalOpen(true);
            }
          }
        }
      }
    } catch (err) {
      console.error('❌ [AIChat] Erreur lors de l\'envoi:', err);
      console.error('❌ [AIChat] Détails erreur:', {
        message: err instanceof Error ? err.message : 'Erreur inconnue',
        stack: err instanceof Error ? err.stack : undefined,
        name: err instanceof Error ? err.name : undefined,
      });
      
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      console.log('📝 [AIChat] Ajout message d\'erreur:', errorMessage);
      
      const errorMsg: Message = {
        id: `error-${Date.now()}`,
        type: 'error',
        content: `Erreur: ${errorMessage}. Veuillez réessayer ou vérifier votre connexion.`,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMsg]);
      
      // Sauvegarder le message d'erreur
      if (userIdRef.current && sessionIdRef.current) {
        aiConversationService.saveMessage(
          userIdRef.current,
          sessionIdRef.current,
          errorMsg
        ).catch(saveErr => console.warn('⚠️ Erreur sauvegarde message erreur:', saveErr));
      }
    }
  }, [inputValue, isLoading, isReady, mode, analyzeCode, clearAllErrors, messages, sendEdgeMessage, selectedFile, askWithFile]);

  const handleClear = useCallback(async () => {
    console.log('🧹 [AIChat] Effacement des messages');

    // MEM-FIX: Réinitialiser la session côté Edge Function (localStorage)
    if (resetSession) {
      await resetSession();
    }

    // Supprimer les messages de la base de données
    if (userIdRef.current && sessionIdRef.current) {
      try {
        await aiConversationService.clearSession(userIdRef.current, sessionIdRef.current);
        console.log('✅ [AIChat] Session supprimée de la base de données');
        // Créer une nouvelle session
        const newSessionId = await aiConversationService.getOrCreateSession(userIdRef.current);
        sessionIdRef.current = newSessionId;
      } catch (error) {
        console.error('❌ [AIChat] Erreur lors de la suppression de la session:', error);
      }
    }

    setMessages([]);
    clearSegments(); // 🎯 NOUVEAU: Effacer aussi les segments
    setLastMessageSegmented(false);
    clearAllErrors();
    welcomeMessageShown.current = false; // Permettre de réafficher le message de bienvenue
  }, [clearAllErrors, resetSession, clearSegments]);

  const contextStats = getContextStats();
  const [isMinimized, setIsMinimized] = useState(false);

  return (
    <motion.div 
      className="flex flex-col h-full bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800"
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header Modernisé avec Contrôles de Fenêtre */}
      <motion.div 
        className="flex-shrink-0 border-b border-slate-200/80 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl shadow-sm"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Titre avec icône et Badge Sécurité */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          {/* Titre avec icône */}
          <div className="flex items-center gap-2">
            <motion.div
              className="relative"
              whileHover={{ scale: 1.1 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-full blur-md opacity-30 animate-pulse" />
              <div className="relative p-1.5 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-full">
                <Brain className="w-4 h-4 text-white" />
              </div>
            </motion.div>
            <h1 className="text-base font-bold text-slate-900 dark:text-white">
              Noteo
            </h1>
          </div>

          {/* Badge Sécurité */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
              <Shield className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">100%</span>
            </div>
          </div>
        </div>

        {/* Onglets et Indicateur de Statut */}
        <div className="flex items-center justify-between px-4 pb-3">
          <div className="flex items-center gap-2">
            <motion.button
              onClick={() => setMode('chat')}
              className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                mode === 'chat'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/30'
                  : 'bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-gray-700'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <MessageCircle className={`w-4 h-4 ${mode === 'chat' ? 'text-white' : ''}`} />
              <span>Conversation</span>
              {mode === 'chat' && (
                <motion.div
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 opacity-20 blur-md"
                  animate={{ opacity: [0.2, 0.4, 0.2] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}
            </motion.button>

            <motion.button
              onClick={() => setMode('analyze')}
              className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                mode === 'analyze'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/30'
                  : 'bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-gray-700'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Search className={`w-4 h-4 ${mode === 'analyze' ? 'text-white' : ''}`} />
              <span>Analyseur</span>
              {mode === 'analyze' && (
                <motion.div
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 opacity-20 blur-md"
                  animate={{ opacity: [0.2, 0.4, 0.2] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}
            </motion.button>
          </div>

          {/* Indicateur de Statut */}
          <div className="flex items-center gap-2">
            <motion.div
              className={`w-2 h-2 rounded-full ${
                isReady ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
              animate={{ 
                scale: isReady ? [1, 1.2, 1] : [1, 1.3, 1],
                opacity: isReady ? [1, 0.8, 1] : [1, 0.6, 1]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span className="text-xs font-medium text-slate-600 dark:text-gray-400">
              {isReady ? 'Prêt' : 'Initialisation...'}
            </span>
            {contextStats.totalEntries > 0 && (
              <span className="text-xs text-slate-500 dark:text-gray-500">
                • {contextStats.totalEntries} éléments
              </span>
            )}
          </div>
        </div>
      </motion.div>

      {/* Zone de Messages Modernisée */}
      <AnimatePresence>
        {!isMinimized && (
          <motion.div
            className="flex-1 overflow-y-auto px-4 py-6 space-y-4 bg-gradient-to-b from-transparent to-slate-50/50 dark:to-gray-900/50"
            style={{ minHeight: '200px' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {isLoadingMessages && (
              <motion.div
                className="flex items-center justify-center h-full"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
                  <p className="text-sm text-slate-600 dark:text-gray-400">Chargement de vos conversations...</p>
                </div>
              </motion.div>
            )}

            {!isLoadingMessages && messages.length === 0 && (
              <motion.div
                className="flex items-center justify-center h-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="text-center">
                  <motion.div
                    className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center"
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  >
                    <Brain className="w-8 h-8 text-white" />
                  </motion.div>
                  <p className="text-slate-600 dark:text-gray-400">Aucun message pour le moment. Posez votre question ci-dessous !</p>
                </div>
              </motion.div>
            )}

            {/* Afficher les segments de message si disponibles */}
            {segments.length > 0 && (
              <AnimatePresence>
                {segments.map((segment, index) => (
                  <SegmentedMessage
                    key={segment.id}
                    segment={segment}
                    index={index}
                    darkMode={darkMode}
                  />
                ))}
              </AnimatePresence>
            )}

            <AnimatePresence>
              {messages.map((message, index) => {
                if (!message.content || message.content.trim().length === 0) {
                  return null;
                }

                // Message AI (afficher seulement si pas segmenté)
                if (message.type === 'ai' && !message.metadata?.isSegmented) {
                  // 🎯 NOUVEAU: Détecter si le message doit utiliser le format EnhancedNoteoMessage
                  const messageAnalysis = analyzeMessage(message.content);
                  
                  if (messageAnalysis.shouldUseEnhanced) {
                    return (
                      <motion.div
                        key={message.id}
                        className="w-full mb-4"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.4 }}
                      >
                        <NoteoMessageWrapper
                          content={message.content}
                          problemType={messageAnalysis.problemType || 'general'}
                          userName={user?.name}
                          darkMode={darkMode}
                          onSuccess={() => {
                            console.log('✅ Problème résolu');
                            // Optionnel : ajouter un message de confirmation
                          }}
                          onFailure={() => {
                            console.log('❌ Problème persiste');
                            // Optionnel : demander plus d'informations
                          }}
                        />
                      </motion.div>
                    );
                  }

                  // Format standard pour les messages sans étapes
                  return (
                    <motion.div
                      key={message.id}
                      className="flex justify-start gap-3"
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <motion.div
                        className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg"
                        whileHover={{ scale: 1.1, rotate: 5 }}
                      >
                        <Brain className="w-4 h-4 text-white" />
                      </motion.div>
                      <div className="flex-1 max-w-[70%] md:max-w-[75%]">
                        <motion.div
                          className="bg-white dark:bg-gray-800 rounded-2xl rounded-tl-sm p-4 shadow-md border border-slate-200 dark:border-gray-700"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.1 }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-slate-500 dark:text-gray-400">
                              {message.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <div className="flex items-center gap-1">
                              <motion.button
                                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                title="Copier"
                                onClick={() => navigator.clipboard.writeText(message.content)}
                              >
                                <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-gray-400" />
                              </motion.button>
                              <motion.button
                                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                title="Régénérer"
                              >
                                <RefreshCw className="w-3.5 h-3.5 text-slate-500 dark:text-gray-400" />
                              </motion.button>
                              <motion.button
                                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                title="J'aime"
                              >
                                <ThumbsUp className="w-3.5 h-3.5 text-slate-500 dark:text-gray-400" />
                              </motion.button>
                            </div>
                          </div>
                          <div className="text-slate-900 dark:text-gray-100 whitespace-pre-wrap leading-relaxed">
                            {message.content}
                          </div>
                        </motion.div>
                      </div>
                    </motion.div>
                  );
                }

                // Message User
                if (message.type === 'user') {
                  // Composant interne pour gérer l'état de l'avatar
                  const UserAvatar = () => {
                    const [imgError, setImgError] = useState(false);
                    
                    return (
                      <motion.div
                        className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center shadow-lg overflow-hidden"
                        whileHover={{ scale: 1.1 }}
                      >
                        {user?.avatar && !imgError ? (
                          <img
                            src={user.avatar}
                            alt={user.name || 'Utilisateur'}
                            className="w-full h-full object-cover"
                            onError={() => setImgError(true)}
                          />
                        ) : (
                          <span className="text-white text-sm">👤</span>
                        )}
                      </motion.div>
                    );
                  };

                  return (
                    <motion.div
                      key={message.id}
                      className="flex justify-end gap-3"
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <div className="flex-1 max-w-[70%] md:max-w-[75%] flex justify-end">
                        <motion.div
                          className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl rounded-tr-sm p-4 shadow-lg"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.1 }}
                        >
                          <div className="flex items-center justify-end mb-2">
                            <span className="text-xs font-medium text-white/80">
                              {message.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                          </div>
                          <div className="whitespace-pre-wrap leading-relaxed">
                            {message.content}
                          </div>
                        </motion.div>
                      </div>
                      <UserAvatar />
                    </motion.div>
                  );
                }

                // Message Error
                if (message.type === 'error') {
                  return (
                    <motion.div
                      key={message.id}
                      className="flex justify-start"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      <div className="max-w-[70%] md:max-w-[75%] bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                          <span className="text-sm font-medium text-red-800 dark:text-red-200">Erreur</span>
                        </div>
                        <p className="text-sm text-red-700 dark:text-red-300 whitespace-pre-wrap">
                          {message.content}
                        </p>
                      </div>
                    </motion.div>
                  );
                }

                // Message Code
                if (message.type === 'code') {
                  return (
                    <motion.div
                      key={message.id}
                      className="flex justify-start"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div className="max-w-[85%] bg-slate-900 dark:bg-gray-950 border border-slate-700 dark:border-gray-800 rounded-xl p-4 overflow-x-auto">
                        <pre className="text-sm text-slate-100 font-mono whitespace-pre-wrap">
                          <code>{message.content}</code>
                        </pre>
                      </div>
                    </motion.div>
                  );
                }

                return null;
              })}
            </AnimatePresence>

            {isLoading && (
              <motion.div
                className="flex justify-start gap-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <Brain className="w-4 h-4 text-white" />
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-tl-sm p-4 shadow-md border border-slate-200 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
                    <span className="text-sm text-slate-600 dark:text-gray-400">L'IA réfléchit...</span>
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Zone Input Modernisée */}
      <AnimatePresence>
        {!isMinimized && (
          <motion.div
            className="flex-shrink-0 border-t border-slate-200/80 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl p-4"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {aiError && (
              <motion.div
                className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                <span className="text-sm text-red-800 dark:text-red-200">{aiError}</span>
              </motion.div>
            )}

            {/* Affichage du fichier sélectionné */}
            {selectedFile && (
              <motion.div
                className="mb-3"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <FileContextCard
                  fileName={selectedFile.name}
                  fileSize={selectedFile.size}
                  onRemove={() => {
                    setSelectedFile(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                  onQuickAction={(action) => {
                    if (action === 'summary') {
                      setInputValue('Résume ce document en quelques points clés');
                    } else if (action === 'extract') {
                      setInputValue('Extrais les informations principales de ce document');
                    } else if (action === 'ask') {
                      setInputValue('');
                      const inputElement = document.querySelector('input[type="text"]') as HTMLInputElement;
                      if (inputElement) {
                        inputElement.focus();
                      }
                    }
                  }}
                  isProcessing={isLoading}
                  isActive={true}
                />
              </motion.div>
            )}

            <form onSubmit={handleSend} className="relative">
              {/* Input file caché */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,.markdown,.pdf,.docx,.doc"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (file.size > 5 * 1024 * 1024) {
                      alert('Le fichier est trop volumineux (max 5 Mo)');
                      return;
                    }
                    console.log("📎 Fichier reçu :", file.name, file.type, file.size);
                    setSelectedFile(file);
                    console.log('📎 [AIChat] Fichier sélectionné:', file.name);
                  }
                }}
              />

              <motion.div
                className="flex items-end gap-2 p-2 bg-slate-50 dark:bg-gray-800/50 rounded-2xl border border-slate-200 dark:border-gray-700 focus-within:border-blue-500 dark:focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all duration-200"
                whileFocus={{ scale: 1.01 }}
              >
                {/* Bouton Pièce jointe */}
                <motion.button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading || !isReady}
                  className="p-2.5 rounded-xl bg-white dark:bg-gray-800 text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Joindre un fichier"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  aria-label="Joindre un fichier"
                >
                  <Paperclip className="w-5 h-5" />
                </motion.button>

                {/* Zone de saisie */}
                <div className="flex-1 flex items-center gap-2">
                  <textarea
                    id="rechercheIA"
                    value={inputValue}
                    onChange={(e) => {
                      setInputValue(e.target.value);
                      e.target.style.height = 'auto';
                      e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                    }}
                    placeholder={selectedFile ? "Posez une question sur ce document..." : "Tapez votre message..."}
                    className="flex-1 px-4 py-3 bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500 resize-none focus:outline-none text-sm leading-relaxed max-h-[120px]"
                    disabled={isLoading || !isReady}
                    rows={1}
                    style={{ minHeight: '44px' }}
                    aria-label="Zone de saisie de message"
                  />
                  {/* Bouton de reconnaissance vocale */}
                  <VoiceRecognition inputId="rechercheIA" submitButtonId="notes" />
                </div>

                {/* Bouton Envoyer */}
                <motion.button
                  id="notes"
                  type="submit"
                  disabled={isLoading || !isReady || !inputValue.trim()}
                  className={`p-2.5 rounded-xl transition-all duration-200 flex items-center justify-center ${
                    isLoading || !isReady || !inputValue.trim()
                      ? 'bg-slate-200 dark:bg-gray-700 text-slate-400 dark:text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40'
                  }`}
                  whileHover={!isLoading && isReady && inputValue.trim() ? { scale: 1.05 } : {}}
                  whileTap={!isLoading && isReady && inputValue.trim() ? { scale: 0.95 } : {}}
                  aria-label="Envoyer le message"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </motion.button>
              </motion.div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Modal de confirmation pour les actions IA */}
      <AIActionConfirmModal
        isOpen={isActionModalOpen}
        action={pendingAction}
        onConfirm={async () => {
          if (!pendingAction || !user?.id) return;
          
          // Si c'est une demande de confirmation (étape 1), demander à l'IA de proposer la correction
          if (pendingAction.type === 'confirm_correction') {
            setIsActionModalOpen(false);
            // Envoyer une réponse automatique pour demander la correction
            const confirmationMessage = pendingAction.data.word 
              ? `Oui, je veux que tu corriges la définition de "${pendingAction.data.word}".`
              : `Oui, je veux que tu corriges cette note.`;
            
            // Ajouter le message de l'utilisateur
            const userMessage: Message = {
              id: `user-confirm-${Date.now()}`,
              type: 'user',
              content: confirmationMessage,
              timestamp: new Date(),
            };
            
            setMessages(prev => [...prev, userMessage]);
            
            // Sauvegarder le message utilisateur
            if (userIdRef.current && sessionIdRef.current) {
              aiConversationService.saveMessage(
                userIdRef.current,
                sessionIdRef.current,
                userMessage
              ).catch(err => console.warn('⚠️ Erreur sauvegarde message confirmation:', err));
            }
            
            // Demander à l'IA de proposer la correction
            try {
              const notes = state.notes || [];
              const vocabularyContext = vocabulary.map(v => ({
                id: v.id,
                word: v.word,
                definition: v.definition,
              }));
              const notesContext = notes.map(n => ({
                id: n.id,
                title: n.title,
                content: n.content || '',
              }));
              
              // Le hook useCentrinoteAI charge automatiquement le contexte utilisateur
              const conversationMessages = [...messages, userMessage]
                .filter((msg) => msg.content && msg.content.trim().length > 0)
                .map((msg) => ({
                  role: msg.type === 'user' ? 'user' : 'assistant',
                  content: msg.content,
                }));

              const edgeReply = await sendEdgeMessage(conversationMessages);

              if (edgeReply && edgeReply.reply) {
                // Traiter la réponse de l'IA normalement
                // Le parser détectera automatiquement la proposition de correction
                const aiMessage: Message = {
                  id: `ai-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                  type: 'ai',
                  content: edgeReply.reply,
                  timestamp: new Date(),
                };
                
                setMessages(prev => [...prev, aiMessage]);
                
                // Sauvegarder le message IA
                if (userIdRef.current && sessionIdRef.current) {
                  aiConversationService.saveMessage(
                    userIdRef.current,
                    sessionIdRef.current,
                    aiMessage
                  ).catch(err => console.warn('⚠️ Erreur sauvegarde message IA:', err));
                }
                
                // Détecter les actions dans la nouvelle réponse
                // Utiliser chat-memory pour la mémoire persistante
                const memoryResponseForAction = await chatMemoryService.sendMessage(confirmationMessage, user?.id || null);
                
                if (detectedActions.length > 0 && (detectedActions[0].type === 'update_vocabulary' || detectedActions[0].type === 'update_note')) {
                  setPendingAction(detectedActions[0]);
                  setIsActionModalOpen(true);
                }
              } else {
                // Fallback si chat-memory échoue
                const conversationMessages = [...messages, userMessage]
                  .filter((msg) => msg.content && msg.content.trim().length > 0)
                  .map((msg) => ({
                    role: msg.type === 'user' ? 'user' : 'assistant',
                    content: msg.content,
                  }));
                const edgeReply = await sendEdgeMessage(conversationMessages);
                
                if (edgeReply && edgeReply.reply) {
                  const detectedActions = AIActionParser.parseActions(edgeReply.reply, {
                    vocabulary: vocabularyContext,
                    notes: notesContext,
                  });
                  
                  if (detectedActions.length > 0 && (detectedActions[0].type === 'update_vocabulary' || detectedActions[0].type === 'update_note')) {
                    setPendingAction(detectedActions[0]);
                    setIsActionModalOpen(true);
                  }
                }
              }
            } catch (error) {
              console.error('❌ [AIChat] Erreur lors de la demande de correction:', error);
            }
            
            setPendingAction(null);
            return;
          }
          
          // Si c'est une proposition de modification (étape 3), appliquer la modification
          setIsApplyingAction(true);
          try {
            if (pendingAction.type === 'update_vocabulary' && pendingAction.targetId && pendingAction.data.definition) {
              console.log('🔄 [AIChat] Mise à jour vocabulaire:', {
                targetId: pendingAction.targetId,
                newDefinitionLength: pendingAction.data.definition.length,
                newDefinitionPreview: pendingAction.data.definition.substring(0, 100),
              });
              
              // Validation avant mise à jour
              const trimmedDefinition = pendingAction.data.definition.trim();
              
              if (!trimmedDefinition || trimmedDefinition.length === 0) {
                throw new Error('La définition ne peut pas être vide');
              }
              
              if (trimmedDefinition.length < 10) {
                throw new Error(`La définition est trop courte (${trimmedDefinition.length} caractères, minimum 10)`);
              }
              
              if (trimmedDefinition.length > 10000) {
                throw new Error(`La définition est trop longue (${trimmedDefinition.length} caractères, maximum 10000)`);
              }
              
              // Vérifier fragments parasites
              if (/^(?:à|à la|la|définition de|dans ton vocabulaire)[\s:]*$/i.test(trimmedDefinition)) {
                throw new Error('La définition semble être un fragment parasite. Veuillez réessayer.');
              }
              
              // Trouver l'entrée complète du vocabulaire
              const vocabEntry = vocabulary.find(v => v.id === pendingAction.targetId);
              console.log('📋 [AIChat] Entrée trouvée:', vocabEntry ? { id: vocabEntry.id, word: vocabEntry.word } : 'AUCUNE');
              
              if (!vocabEntry) {
                throw new Error(`Vocabulaire avec l'ID ${pendingAction.targetId} introuvable`);
              }
              
              const entryToUpdate = {
                ...vocabEntry,
                definition: trimmedDefinition,
                category: pendingAction.data.category || vocabEntry.category,
              };
              
              console.log('📤 [AIChat] Données validées à envoyer:', {
                id: entryToUpdate.id,
                word: entryToUpdate.word,
                definitionLength: entryToUpdate.definition.length,
                definitionPreview: entryToUpdate.definition.substring(0, 100),
              });
              
              const updated = await vocabularyService.updateVocabularyEntry(entryToUpdate);
              console.log('✅ [AIChat] Vocabulaire mis à jour avec succès:', {
                id: updated.id,
                word: updated.word,
                definition: updated.definition.substring(0, 100),
              });
              
              // Recharger le vocabulaire
              await loadVocabulary();
              console.log('✅ [AIChat] Vocabulaire rechargé');
              
              // Ajouter un message de confirmation
              setMessages(prev => [...prev, {
                id: `ai-action-${Date.now()}`,
                type: 'ai',
                content: `✅ Le vocabulaire "${updated.word}" a été mis à jour avec succès.`,
                timestamp: new Date(),
              }]);
              
              setIsActionModalOpen(false);
              setPendingAction(null);
            } else if (pendingAction.type === 'update_note' && pendingAction.targetId && pendingAction.data.content) {
              // Trouver la note complète
              const note = state.notes?.find(n => n.id === pendingAction.targetId);
              if (note) {
                const updated = await notesService.updateNote({
                  id: note.id,
                  userId: note.userId,
                  title: pendingAction.data.title || note.title,
                  content: pendingAction.data.content,
                  is_pinned: note.is_pinned,
                });
                console.log('✅ [AIChat] Note mise à jour:', updated);
                // Recharger les notes via dispatch (si disponible)
                if (state.dispatch) {
                  // Les notes seront rechargées automatiquement par le contexte
                }
                // Ajouter un message de confirmation
                setMessages(prev => [...prev, {
                  id: `ai-action-${Date.now()}`,
                  type: 'ai',
                  content: `✅ La note "${updated.title}" a été mise à jour avec succès.`,
                  timestamp: new Date(),
                }]);
                
                setIsActionModalOpen(false);
                setPendingAction(null);
              } else {
                throw new Error(`Note avec l'ID ${pendingAction.targetId} introuvable`);
              }
            }
          } catch (error) {
            console.error('❌ [AIChat] Erreur lors de la mise à jour:', error);
            // Ajouter un message d'erreur
            setMessages(prev => [...prev, {
              id: `ai-action-error-${Date.now()}`,
              type: 'error',
              content: `❌ Erreur lors de la mise à jour: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
              timestamp: new Date(),
            }]);
          } finally {
            setIsApplyingAction(false);
          }
        }}
        onCancel={() => {
          setIsActionModalOpen(false);
          setPendingAction(null);
        }}
        isLoading={isApplyingAction}
        darkMode={darkMode}
      />
    </motion.div>
  );
}


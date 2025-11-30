/**
 * Composant de chat IA pour Centrinote
 * Interface moderne pour interagir avec l'IA générative
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Send, Loader2, Brain, AlertCircle, CheckCircle, Sparkles, Paperclip, X } from 'lucide-react';
import { useCentrinoteAI } from '../../hooks/useCentrinoteAI';
import { useCentrinoteAI_Edge } from '../../hooks/useCentrinoteAI_Edge';
import { useApp } from '../../contexts/AppContext';
import { aiConversationService, type AIMessage } from '../../services/aiConversationService';
import { AIActionParser, type AIAction } from '../../services/ai/actionParser';
import { AIActionConfirmModal } from './AIActionConfirmModal';
import { vocabularyService } from '../../services/vocabularyService';
import { notesService } from '../../services/notesService';
import { useVocabulary } from '../../hooks/useVocabulary';
import { useAI } from '../../hooks/useAI';
import { FileContextCard } from './FileContextCard';
import { ContextBadge } from './ContextBadge';
import { AIResponseCard } from './AIResponseCard';

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
    if (isReady && !isLoadingMessages && messages.length === 0 && !welcomeMessageShown.current) {
      const timer = setTimeout(() => {
        if (messages.length === 0 && !welcomeMessageShown.current) {
          welcomeMessageShown.current = true;
          const welcomeMessage: Message = {
            id: `welcome-${Date.now()}`,
            type: 'ai',
            content: '👋 Bonjour ! Je suis l\'assistant IA de Centrinote. Je peux vous aider à répondre à vos questions ou analyser votre code existant.',
            timestamp: new Date(),
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
          
          console.log('✅ [AIChat] Message de bienvenue affiché');
        }
      }, 200);
      
      return () => clearTimeout(timer);
    }
  }, [isReady, isLoadingMessages, messages.length]);

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

        // Mode normal sans fichier
        const conversationMessages = [...messages, userMessage]
          .filter((msg) => msg.content && msg.content.trim().length > 0)
          .map((msg) => ({
            role: msg.type === 'user' ? 'user' : 'assistant',
            // Si le message contient le contexte complet d'un fichier, utiliser le texte complet
            content: msg.metadata?.isFileContext && msg.metadata?.fullText
              ? `📄 Contenu du document:\n\n${msg.metadata.fullText}`
              : msg.content,
          }));

        const edgeReply = await sendEdgeMessage(conversationMessages);

        console.log('📥 [AIChat] Réponse Edge reçue:', {
          replyLength: edgeReply.reply?.length || 0,
          replyPreview: edgeReply.reply?.substring(0, 100) || 'vide',
          cached: edgeReply.cached ?? false,
          timestamp: edgeReply.timestamp,
          memory_saved: edgeReply.memory_saved ?? false,
        });

        // Afficher un toast si une information a été mémorisée
        if (edgeReply.memory_saved) {
          // Créer un toast simple avec animation
          const toast = document.createElement('div');
          toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2 transition-all duration-300 transform translate-y-0 opacity-100';
          toast.style.cssText = 'animation: slideInRight 0.3s ease-out;';
          toast.innerHTML = `
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <span class="font-medium">Information mémorisée ✅</span>
          `;
          document.body.appendChild(toast);
          
          // Retirer le toast après 3 secondes avec animation
          setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease-in';
            toast.style.opacity = '0';
            setTimeout(() => {
              if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
              }
            }, 300);
          }, 3000);
        }

        const result = {
          suggestion: edgeReply.reply,
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
        
        const newMessage: Message = {
          id: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // ID unique avec timestamp + random
          type: messageType,
          content: processedContent,
          timestamp: new Date(),
          metadata: {
            securityScore: result.securityScore,
            isValid: result.isValid,
          },
        };
        
        console.log('📝 [AIChat] Nouveau message créé:', {
          id: newMessage.id,
          type: newMessage.type,
          contentLength: newMessage.content.length,
          contentPreview: newMessage.content.substring(0, 100),
        });
        
        // Utiliser la forme fonctionnelle pour garantir la mise à jour
        setMessages(prev => {
          const updated = [...prev, newMessage];
          console.log('🔄 [AIChat] State mis à jour, total messages:', updated.length);
          console.log('📋 [AIChat] Dernier message dans state:', {
            id: updated[updated.length - 1]?.id,
            type: updated[updated.length - 1]?.type,
            contentLength: updated[updated.length - 1]?.content?.length,
          });
          return updated;
        });
        
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
        
        // Sauvegarder le message IA (chat/completion)
        if (userIdRef.current && sessionIdRef.current) {
          aiConversationService.saveMessage(
            userIdRef.current,
            sessionIdRef.current,
            newMessage
          ).catch(err => console.warn('⚠️ Erreur sauvegarde message IA:', err));
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
    clearAllErrors();
    welcomeMessageShown.current = false; // Permettre de réafficher le message de bienvenue
  }, [clearAllErrors, resetSession]);

  const contextStats = getContextStats();

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-800 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur-lg opacity-20 animate-pulse" />
              <div className="relative p-2 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-full">
                <Brain className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Assistant IA Centrinote
              </h1>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {isReady ? 'Prêt' : 'Initialisation...'} • {contextStats.totalEntries} éléments
                </p>
                {selectedFile && (
                  <ContextBadge
                    fileCount={1}
                    totalSize={selectedFile.size}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Mode selector */}
          <div className="flex gap-2">
            <button
              onClick={() => setMode('chat')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                mode === 'chat'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              <Sparkles className="w-4 h-4 inline mr-1" />
              Chat
            </button>
            <button
              onClick={() => setMode('analyze')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                mode === 'analyze'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              Analyser
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div 
        className="flex-1 overflow-y-auto p-4 space-y-4"
        style={{ minHeight: '200px' }} // Force une hauteur minimale pour l'affichage
      >
        {import.meta.env.DEV && (
          <div className="mb-2 p-2 bg-yellow-100 dark:bg-yellow-900/20 text-xs text-yellow-800 dark:text-yellow-200 rounded">
            🔍 Debug: {messages.length} message(s) dans le state | Messages avec contenu: {messages.filter(m => m.content?.trim().length > 0).length}
          </div>
        )}
        {isLoadingMessages && (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin" />
              <p>Chargement de vos conversations...</p>
            </div>
          </div>
        )}
        {!isLoadingMessages && messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <p>Aucun message pour le moment. Posez votre question ci-dessous !</p>
          </div>
        )}
        {messages.length > 0 && messages.filter(m => m.content?.trim().length > 0).length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <p>⚠️ Messages dans le state mais aucun contenu valide</p>
          </div>
        )}
        {messages.map((message, index) => {
          // Validation du contenu pour déboguer
          if (!message.content || message.content.trim().length === 0) {
            console.warn('⚠️ [AIChat] Message vide détecté lors du render:', {
              id: message.id,
              index,
              type: message.type,
            });
            return null; // Ne pas rendre les messages vides
          }
          
          const willRender = !!message.content && message.content.trim().length > 0;
          
          if (import.meta.env.DEV) {
            console.log(`🎨 [AIChat] Rendu message #${index + 1}/${messages.length}:`, {
              id: message.id,
              type: message.type,
              contentLength: message.content?.length || 0,
              willRender,
              contentPreview: message.content?.substring(0, 50),
            });
          }
          
          if (!willRender) {
            return null;
          }
          
          // Utiliser AIResponseCard pour les messages IA
          if (message.type === 'ai') {
            return (
              <AIResponseCard
                key={message.id}
                content={message.content}
                timestamp={message.timestamp}
                hasFileContext={message.metadata?.hasFileContext}
                metadata={message.metadata}
              />
            );
          }

          // Affichage par défaut pour les autres types (user, error, code)
          return (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              style={{ minHeight: 'auto' }}
            >
              <div
                className={`max-w-3xl rounded-lg p-4 ${
                  message.type === 'user'
                    ? 'bg-blue-600 text-white'
                    : message.type === 'error'
                    ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-300 dark:border-red-800'
                    : message.type === 'code'
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-sm border border-gray-300 dark:border-gray-700'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                }`}
                style={{
                  display: 'block',
                  opacity: 1,
                  visibility: 'visible'
                }}
              >
                {message.type === 'code' ? (
                  <pre className="whitespace-pre-wrap overflow-x-auto" style={{ margin: 0 }}>
                    <code style={{ display: 'block' }}>{message.content || '(contenu vide)'}</code>
                  </pre>
                ) : (
                  <p
                    className="whitespace-pre-wrap"
                    style={{ margin: 0, display: 'block', minHeight: '1em' }}
                  >
                    {message.content || '(contenu vide)'}
                  </p>
                )}

                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-900">
        {aiError && (
          <div className="mb-2 p-2 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-lg text-sm text-red-800 dark:text-red-200">
            <AlertCircle className="w-4 h-4 inline mr-1" />
            {aiError}
          </div>
        )}

        {/* Affichage du fichier sélectionné avec FileContextCard */}
        {selectedFile && (
          <div className="mb-3">
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
                  // Focus sur l'input
                  const inputElement = document.querySelector('input[type="text"]') as HTMLInputElement;
                  if (inputElement) {
                    inputElement.focus();
                  }
                }
              }}
              isProcessing={isLoading}
              isActive={true}
            />
          </div>
        )}

        <form onSubmit={handleSend} className="flex gap-2">
          {/* Input file caché */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.markdown,.pdf,.docx,.doc"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                // Validation de la taille (5 Mo max)
                if (file.size > 5 * 1024 * 1024) {
                  alert('Le fichier est trop volumineux (max 5 Mo)');
                  return;
                }
                // 📎 Log n°1 – fichier reçu (côté frontend)
                console.log("📎 Fichier reçu :", file.name, file.type, file.size);
                setSelectedFile(file);
                console.log('📎 [AIChat] Fichier sélectionné:', file.name);
              }
            }}
          />

          {/* Bouton d'ajout de fichier */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || !isReady}
            className="px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Joindre un fichier"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={selectedFile ? "Posez une question sur ce document..." : "Posez votre question..."}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading || !isReady}
          />
          <button
            type="submit"
            disabled={isLoading || !isReady || !inputValue.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Envoi...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Envoyer
              </>
            )}
          </button>
        </form>
      </div>
      
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
                const detectedActions = AIActionParser.parseActions(edgeReply.reply, {
                  vocabulary: vocabularyContext,
                  notes: notesContext,
                });
                
                if (detectedActions.length > 0 && (detectedActions[0].type === 'update_vocabulary' || detectedActions[0].type === 'update_note')) {
                  setPendingAction(detectedActions[0]);
                  setIsActionModalOpen(true);
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
    </div>
  );
}


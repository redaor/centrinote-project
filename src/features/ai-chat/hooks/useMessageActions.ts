/**
 * Hook: useMessageActions
 *
 * Gère les actions liées aux fichiers (upload, suppression) et aux actions proposées par l'IA
 * (corrections de vocabulaire, modifications de notes, etc.)
 *
 * Responsabilités :
 * - État et gestion de l'upload de fichiers
 * - État et gestion des actions modales proposées par l'IA
 * - Validation et application des corrections suggérées
 *
 * @example
 * const {
 *   selectedFile,
 *   fileInputRef,
 *   handleFileSelect,
 *   handleFileRemove,
 *   pendingAction,
 *   isActionModalOpen,
 *   handleConfirmAction,
 *   handleCancelAction,
 *   isApplyingAction,
 *   detectAIActions
 * } = useMessageActions({ user, messages, vocabulary, notes, ... });
 */

import { useState, useRef, useCallback } from 'react';
import { useAI } from '../../../hooks/useAI';
import { AIActionParser, type AIAction } from '../../../services/ai/actionParser';
import { vocabularyService } from '../../../services/vocabularyService';
import { notesService } from '../../../services/notesService';
import { aiConversationService } from '../../../services/aiConversationService';
import { chatMemoryService } from '../../../services/chatMemoryService';

/**
 * Message interface (copié depuis AIChat.tsx pour éviter les imports circulaires)
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
 * Vocabulaire interface
 */
interface VocabularyEntry {
  id: string;
  word: string;
  definition: string;
  category?: string;
  [key: string]: any;
}

/**
 * Note interface
 */
interface Note {
  id: string;
  userId: string;
  title: string;
  content?: string;
  is_pinned: boolean;
  [key: string]: any;
}

/**
 * Params du hook
 */
interface UseMessageActionsParams {
  user: { id: string; name?: string } | null;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  vocabulary: VocabularyEntry[];
  notes: Note[];
  loadVocabulary: () => Promise<void>;
  userIdRef: React.MutableRefObject<string | null>;
  sessionIdRef: React.MutableRefObject<string | null>;
  sendEdgeMessage: (messages: any[]) => Promise<any>;
  mode: 'chat' | 'analyze';
}

/**
 * Valeur de retour du hook
 */
interface UseMessageActionsReturn {
  // État fichier
  selectedFile: File | null;
  setSelectedFile: React.Dispatch<React.SetStateAction<File | null>>;
  fileInputRef: React.RefObject<HTMLInputElement>;
  askWithFile: (question: string, file: File, conversationHistory: any[]) => Promise<any>;

  // Handlers fichier
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleFileRemove: () => void;

  // État action modale
  pendingAction: AIAction | null;
  setPendingAction: React.Dispatch<React.SetStateAction<AIAction | null>>;
  isActionModalOpen: boolean;
  setIsActionModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isApplyingAction: boolean;

  // Handlers action modale
  handleConfirmAction: () => Promise<void>;
  handleCancelAction: () => void;
  detectAIActions: (content: string) => void;
}

/**
 * Hook useMessageActions
 */
export function useMessageActions(params: UseMessageActionsParams): UseMessageActionsReturn {
  const {
    user,
    messages,
    setMessages,
    vocabulary,
    notes,
    loadVocabulary,
    userIdRef,
    sessionIdRef,
    sendEdgeMessage,
    mode,
  } = params;

  // ═══════════════════════════════════════════════════════════════
  // État pour l'upload de fichiers
  // ═══════════════════════════════════════════════════════════════
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { ask: askWithFile } = useAI();

  // ═══════════════════════════════════════════════════════════════
  // État pour les actions proposées par l'IA
  // ═══════════════════════════════════════════════════════════════
  const [pendingAction, setPendingAction] = useState<AIAction | null>(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [isApplyingAction, setIsApplyingAction] = useState(false);

  // ═══════════════════════════════════════════════════════════════
  // Handler : Sélection de fichier
  // ═══════════════════════════════════════════════════════════════
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validation : taille max 5 Mo
      if (file.size > 5 * 1024 * 1024) {
        alert('Le fichier est trop volumineux (max 5 Mo)');
        return;
      }
      console.log('📎 Fichier reçu :', file.name, file.type, file.size);
      setSelectedFile(file);
      console.log('📎 [useMessageActions] Fichier sélectionné:', file.name);
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // Handler : Suppression de fichier
  // ═══════════════════════════════════════════════════════════════
  const handleFileRemove = useCallback(() => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    console.log('🗑️ [useMessageActions] Fichier supprimé');
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // Fonction : Détecter les actions proposées par l'IA
  // ═══════════════════════════════════════════════════════════════
  const detectAIActions = useCallback((content: string) => {
    if (mode !== 'chat' || !content) {
      return;
    }

    // Construire le contexte vocabulaire
    const vocabularyContext = vocabulary.map(v => ({
      id: v.id,
      word: v.word,
      definition: v.definition,
    }));

    // Construire le contexte notes
    const notesContext = notes.map(n => ({
      id: n.id,
      title: n.title,
      content: n.content || '',
    }));

    // Parser les actions
    const detectedActions = AIActionParser.parseActions(content, {
      vocabulary: vocabularyContext,
      notes: notesContext,
    });

    if (detectedActions.length > 0) {
      console.log('✅ [useMessageActions] Actions détectées:', detectedActions);
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
  }, [mode, vocabulary, notes]);

  // ═══════════════════════════════════════════════════════════════
  // Handler : Confirmation d'action modale
  // ═══════════════════════════════════════════════════════════════
  const handleConfirmAction = useCallback(async () => {
    if (!pendingAction || !user?.id) return;

    // ─────────────────────────────────────────────────────────────
    // Cas 1 : Demande de confirmation (étape 1)
    // ─────────────────────────────────────────────────────────────
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
        const conversationMessages = [...messages, userMessage]
          .filter((msg) => msg.content && msg.content.trim().length > 0)
          .map((msg) => ({
            role: msg.type === 'user' ? 'user' : 'assistant',
            content: msg.content,
          }));

        const edgeReply = await sendEdgeMessage(conversationMessages);

        if (edgeReply && edgeReply.reply) {
          // Traiter la réponse de l'IA normalement
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
          detectAIActions(edgeReply.reply);
        }
      } catch (error) {
        console.error('❌ [useMessageActions] Erreur lors de la demande de correction:', error);
      }

      setPendingAction(null);
      return;
    }

    // ─────────────────────────────────────────────────────────────
    // Cas 2 : Proposition de modification (étape 3)
    // ─────────────────────────────────────────────────────────────
    setIsApplyingAction(true);
    try {
      // Mise à jour vocabulaire
      if (pendingAction.type === 'update_vocabulary' && pendingAction.targetId && pendingAction.data.definition) {
        console.log('🔄 [useMessageActions] Mise à jour vocabulaire:', {
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
        console.log('📋 [useMessageActions] Entrée trouvée:', vocabEntry ? { id: vocabEntry.id, word: vocabEntry.word } : 'AUCUNE');

        if (!vocabEntry) {
          throw new Error(`Vocabulaire avec l'ID ${pendingAction.targetId} introuvable`);
        }

        const entryToUpdate = {
          ...vocabEntry,
          definition: trimmedDefinition,
          category: pendingAction.data.category || vocabEntry.category,
        };

        console.log('📤 [useMessageActions] Données validées à envoyer:', {
          id: entryToUpdate.id,
          word: entryToUpdate.word,
          definitionLength: entryToUpdate.definition.length,
          definitionPreview: entryToUpdate.definition.substring(0, 100),
        });

        const updated = await vocabularyService.updateVocabularyEntry(entryToUpdate);
        console.log('✅ [useMessageActions] Vocabulaire mis à jour avec succès:', {
          id: updated.id,
          word: updated.word,
          definition: updated.definition.substring(0, 100),
        });

        // Recharger le vocabulaire
        await loadVocabulary();
        console.log('✅ [useMessageActions] Vocabulaire rechargé');

        // Ajouter un message de confirmation
        setMessages(prev => [...prev, {
          id: `ai-action-${Date.now()}`,
          type: 'ai',
          content: `✅ Le vocabulaire "${updated.word}" a été mis à jour avec succès.`,
          timestamp: new Date(),
        }]);

        setIsActionModalOpen(false);
        setPendingAction(null);
      }
      // Mise à jour note
      else if (pendingAction.type === 'update_note' && pendingAction.targetId && pendingAction.data.content) {
        // Trouver la note complète
        const note = notes.find(n => n.id === pendingAction.targetId);
        if (note) {
          const updated = await notesService.updateNote({
            id: note.id,
            userId: note.userId,
            title: pendingAction.data.title || note.title,
            content: pendingAction.data.content,
            is_pinned: note.is_pinned,
          });
          console.log('✅ [useMessageActions] Note mise à jour:', updated);

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
      console.error('❌ [useMessageActions] Erreur lors de la mise à jour:', error);
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
  }, [
    pendingAction,
    user,
    messages,
    setMessages,
    vocabulary,
    notes,
    loadVocabulary,
    userIdRef,
    sessionIdRef,
    sendEdgeMessage,
    detectAIActions,
  ]);

  // ═══════════════════════════════════════════════════════════════
  // Handler : Annulation d'action modale
  // ═══════════════════════════════════════════════════════════════
  const handleCancelAction = useCallback(() => {
    setIsActionModalOpen(false);
    setPendingAction(null);
    console.log('❌ [useMessageActions] Action annulée');
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // Retour du hook
  // ═══════════════════════════════════════════════════════════════
  return {
    // État fichier
    selectedFile,
    setSelectedFile,
    fileInputRef,
    askWithFile,

    // Handlers fichier
    handleFileSelect,
    handleFileRemove,

    // État action modale
    pendingAction,
    setPendingAction,
    isActionModalOpen,
    setIsActionModalOpen,
    isApplyingAction,

    // Handlers action modale
    handleConfirmAction,
    handleCancelAction,
    detectAIActions,
  };
}

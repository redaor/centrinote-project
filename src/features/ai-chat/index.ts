/**
 * Feature: AI Chat
 * Point d'entrée pour le module de chat IA
 *
 * Ce fichier sert de barrel export pour tous les composants et hooks du module ai-chat.
 * Il permet d'importer facilement les éléments nécessaires depuis un seul point d'entrée.
 *
 * @example
 * import { AIChat } from '@/features/ai-chat';
 */

// Re-export du composant principal (temporaire, sera remplacé par AIChatContainer)
export { AIChat } from '../../components/ai/AIChat';

// Placeholder pour les futures exports
// export { AIChatContainer } from './components/AIChatContainer';
// export { MessageBubbleAI } from './components/MessageBubbleAI';
// export { MessageBubbleUser } from './components/MessageBubbleUser';
// export { InputBar } from './components/InputBar';
// export { ChatHeader } from './components/ChatHeader';
// export { MessagesContainer } from './components/MessagesContainer';
// export { FileUploadZone } from './components/FileUploadZone';
// export { VoiceInputButton } from './components/VoiceInputButton';

// Hooks
// export { useMessageActions } from './hooks/useMessageActions';
// export { useMessageProcessor } from './hooks/useMessageProcessor';

// Types (si nécessaire)
// export type { Message, ChatMode } from './types';

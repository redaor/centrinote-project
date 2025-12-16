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

// Export principal : AIChat pointe maintenant vers le nouveau container refactoré
export { default as AIChat } from './AIChatContainer';

// Exports des composants présentationnels
export { ChatHeader } from './components/ChatHeader';
export { MessagesContainer } from './components/MessagesContainer';
export { InputBar } from './components/InputBar';
export { MessageBubbleAI } from './components/MessageBubbleAI';
export { MessageBubbleUser } from './components/MessageBubbleUser';

// Hooks métier
export { useMessageActions } from './hooks/useMessageActions';
export { useMessageProcessor } from './hooks/useMessageProcessor';

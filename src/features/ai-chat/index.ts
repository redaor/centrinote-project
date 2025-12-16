/**
 * Feature: AI Chat
 * Point d'entrée pour le module de chat IA
 *
 * Ce fichier sert de barrel export pour tous les composants et hooks du module ai-chat.
 * Il permet d'importer facilement les éléments nécessaires depuis un seul point d'entrée.
 *
 * Le composant principal AIChat est chargé en lazy pour optimiser le code-splitting.
 * Utilisez-le avec <Suspense> pour une meilleure expérience utilisateur.
 *
 * @example
 * import { AIChat } from '@/features/ai-chat';
 * import { Suspense } from 'react';
 *
 * <Suspense fallback={<LoadingSpinner />}>
 *   <AIChat />
 * </Suspense>
 */

import { lazy } from 'react';

// Export principal : AIChat avec lazy loading pour code-splitting optimal
export const AIChat = lazy(() => import('./AIChatContainer'));

// Exports des composants présentationnels (non-lazy, légers)
export { ChatHeader } from './components/ChatHeader';
export { MessagesContainer } from './components/MessagesContainer';
export { InputBar } from './components/InputBar';
export { MessageBubbleAI } from './components/MessageBubbleAI';
export { MessageBubbleUser } from './components/MessageBubbleUser';

// Hooks métier (non-lazy)
export { useMessageActions } from './hooks/useMessageActions';
export { useMessageProcessor } from './hooks/useMessageProcessor';

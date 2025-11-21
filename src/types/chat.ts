/**
 * Types pour le système de chat IA
 */

export type ChatRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  isError?: boolean;
}

export interface ChatThreadState {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  conversationId: string;
}

export interface ChatActions {
  sendMessage: (content: string) => Promise<void>;
  appendMessage: (role: ChatRole, content: string, isError?: boolean) => void;
  resetConversation: () => void;
  retryLastMessage: () => Promise<void>;
}

export interface ChatInputProps {
  onSend: (content: string) => Promise<void>;
  isLoading: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export interface ChatThreadProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onCopy: (content: string) => void;
  onReformulate: (messageId: string) => void;
  onRetry: (messageId: string) => void;
}

export interface TypingIndicatorProps {
  isVisible: boolean;
}

// Configuration du chat
export const CHAT_CONFIG = {
  MAX_MESSAGE_LENGTH: 2000,
  MAX_MESSAGES_HISTORY: 100,
  TYPING_DELAY: 1000,
  AUTO_SCROLL_DELAY: 100,
  STORAGE_PREFIX: 'cn_ai_chat_',
} as const;

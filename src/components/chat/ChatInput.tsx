/**
 * Composant pour la barre de saisie du chat
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Send, AlertCircle, RotateCcw } from 'lucide-react';
import { ChatInputProps } from '../../types/chat';
import { GhostTextArea } from '../../features/ghost-text';
import { useApp } from '../../contexts/AppContext';

export function ChatInput({
  onSend,
  isLoading,
  disabled = false,
  placeholder = "Tapez votre message..."
}: ChatInputProps) {
  const { state } = useApp();
  const { darkMode, user } = state;
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Gérer le changement de texte (GhostTextArea passe directement la valeur)
  const handleChange = useCallback((value: string) => {
    setMessage(value);
    setError(null); // Clear error on new input
  }, []);

  // Gérer les touches
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [message, isLoading, disabled]);

  // Soumettre le message
  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    const trimmedMessage = message.trim();
    if (!trimmedMessage || isLoading || disabled) {
      return;
    }

    try {
      setError(null);
      await onSend(trimmedMessage);
      setMessage('');
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de l\'envoi';
      setError(errorMessage);
    }
  }, [message, isLoading, disabled, onSend]);

  // Retry en cas d'erreur
  const handleRetry = useCallback(() => {
    setError(null);
    handleSubmit();
  }, [handleSubmit]);

  // Focus automatique
  useEffect(() => {
    if (!isLoading && !disabled) {
      textareaRef.current?.focus();
    }
  }, [isLoading, disabled]);

  const isDisabled = disabled || isLoading || !message.trim();

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      {/* Error banner */}
      {error && (
        <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="text-sm text-red-700 dark:text-red-300">
                {error}
              </span>
            </div>
            <button
              onClick={handleRetry}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Réessayer
            </button>
          </div>
        </div>
      )}

      {/* Input form */}
      <form ref={formRef} onSubmit={handleSubmit} className="p-4">
        <div className="flex items-end gap-3">
          {/* GhostTextArea with auto-completion */}
          <div className="flex-1 relative">
            <GhostTextArea
              ref={textareaRef}
              id="chat-message-input"
              name="chatMessage"
              value={message}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled || isLoading}
              rows={1}
              aria-label="Message de discussion IA"
              context="chat"
              userId={user?.id}
              enabled={true}
              darkMode={darkMode}
              className="
                w-full px-4 py-3 pr-12
                border border-gray-300 dark:border-gray-600
                rounded-2xl
                bg-white dark:bg-gray-700
                text-gray-900 dark:text-gray-100
                placeholder-gray-500 dark:placeholder-gray-400
                focus:ring-2 focus:ring-blue-500 focus:border-transparent
                disabled:opacity-50 disabled:cursor-not-allowed
                resize-none overflow-hidden
                transition-colors duration-200
                min-h-[44px] max-h-[120px]
              "
              style={{ height: '44px', maxHeight: '120px' }}
            />

            {/* Character count */}
            {message.length > 0 && (
              <div className="absolute bottom-1 right-2 text-xs text-gray-400 pointer-events-none z-40">
                {message.length}/2000
              </div>
            )}
          </div>

          {/* Send button */}
          <button
            type="submit"
            id="chat-send-button"
            name="chatSend"
            disabled={isDisabled}
            aria-label="Envoyer le message"
            className="
              p-3
              bg-gradient-to-r from-blue-500 to-purple-600
              hover:from-blue-600 hover:to-purple-700
              disabled:from-gray-400 disabled:to-gray-500
              text-white
              rounded-2xl
              focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              disabled:cursor-not-allowed
              transition-all duration-200
              flex items-center justify-center
              min-w-[44px] h-[44px]
            "
            title={isDisabled ? 'Tapez un message pour envoyer' : 'Envoyer le message (Entrée)'}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Help text */}
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
          <span>Entrée pour envoyer • Maj+Entrée pour une nouvelle ligne</span>
        </div>
      </form>
    </div>
  );
}

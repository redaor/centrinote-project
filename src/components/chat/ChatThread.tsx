/**
 * Composant pour afficher la liste des messages du chat
 */

import React, { forwardRef } from 'react';
import { ChatMessage, ChatThreadProps } from '../../types/chat';
import { 
  Copy, 
  RotateCcw, 
  User, 
  Bot, 
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

interface MessageBubbleProps {
  message: ChatMessage;
  onCopy: (content: string) => void;
  onReformulate: (messageId: string) => void;
  onRetry: (messageId: string) => void;
}

function MessageBubble({ message, onCopy, onReformulate, onRetry }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const isError = message.isError;

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getAvatar = () => {
    if (isUser) {
      return (
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
          U
        </div>
      );
    }
    
    return (
      <div className="w-8 h-8 bg-gradient-to-br from-gray-500 to-gray-600 rounded-full flex items-center justify-center text-white">
        <Bot className="w-4 h-4" />
      </div>
    );
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 group`}>
      <div className={`flex max-w-[700px] ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start gap-3`}>
        {/* Avatar */}
        <div className="flex-shrink-0">
          {getAvatar()}
        </div>

        {/* Message bubble */}
        <div className={`relative ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
          <div
            className={`
              px-4 py-3 rounded-2xl max-w-full break-words
              ${isUser 
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white' 
                : isError
                  ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
              }
              shadow-sm
            `}
          >
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {message.content}
            </div>
          </div>

          {/* Meta info (time + actions) */}
          <div className={`flex items-center gap-2 mt-1 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
            {/* Time */}
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatTime(message.createdAt)}
            </span>

            {/* Status indicator */}
            {isAssistant && (
              <div className="flex items-center gap-1">
                {isError ? (
                  <AlertCircle className="w-3 h-3 text-red-500" />
                ) : (
                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                )}
              </div>
            )}

            {/* Actions (always visible for assistant messages) */}
            {isAssistant && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onCopy(message.content)}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                  title="Copier le message"
                >
                  <Copy className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                </button>
                
                <button
                  onClick={() => onReformulate(message.id)}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                  title="Reformuler"
                >
                  <RotateCcw className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                </button>

                {isError && (
                  <button
                    onClick={() => onRetry(message.id)}
                    className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                    title="Réessayer"
                  >
                    <RotateCcw className="w-3 h-3 text-red-500" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export const ChatThread = forwardRef<HTMLDivElement, ChatThreadProps>(
  ({ messages, isLoading, onCopy, onReformulate, onRetry }, ref) => {
    return (
      <div 
        ref={ref}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-1"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
              <Bot className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Commencez une conversation
            </h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-md">
              Posez votre question à l'IA et obtenez des réponses intelligentes pour vous aider dans votre apprentissage.
            </p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                onCopy={onCopy}
                onReformulate={onReformulate}
                onRetry={onRetry}
              />
            ))}
            
            {/* Typing indicator */}
            {isLoading && (
              <div className="flex justify-start mb-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-gray-500 to-gray-600 rounded-full flex items-center justify-center text-white">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-700 px-4 py-3 rounded-2xl">
                    <div className="flex items-center gap-1">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                        L'IA réfléchit...
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  }
);

ChatThread.displayName = 'ChatThread';

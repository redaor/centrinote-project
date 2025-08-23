import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Smile,
  Paperclip,
  X,
  Users,
  MoreVertical
} from 'lucide-react';
import { useChat, ChatMessage } from '../../hooks/useChat';
import { useApp } from '../../contexts/AppContext';

interface ChatWindowProps {
  sessionId: string;
  onClose: () => void;
}

export function ChatWindow({ sessionId, onClose }: ChatWindowProps) {
  const { state } = useApp();
  const { darkMode, user } = state;
  const [messageInput, setMessageInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    messages,
    isConnected,
    isTyping,
    sendMessage,
    joinChat,
    leaveChat,
    markAsTyping,
    stopTyping
  } = useChat();

  useEffect(() => {
    if (user) {
      joinChat(sessionId, user.id, user.name);
    }
    
    return () => {
      leaveChat();
    };
  }, [sessionId, user, joinChat, leaveChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageInput.trim()) {
      sendMessage(messageInput);
      setMessageInput('');
      stopTyping();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value);
    markAsTyping();
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const MessageBubble = ({ message }: { message: ChatMessage }) => {
    const isOwnMessage = message.sender.id === user?.id;
    const isSystemMessage = message.type === 'system';

    if (isSystemMessage) {
      return (
        <div className="flex justify-center my-2">
          <div className={`
            px-3 py-1 rounded-full text-xs
            ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'}
          `}>
            {message.content}
          </div>
        </div>
      );
    }

    return (
      <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4`}>
        <div className={`max-w-xs lg:max-w-md ${isOwnMessage ? 'order-2' : 'order-1'}`}>
          {!isOwnMessage && (
            <div className="flex items-center space-x-2 mb-1">
              <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-medium">
                  {message.sender.name.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
              <span className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {message.sender.name}
              </span>
              <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                {formatTime(message.timestamp)}
              </span>
            </div>
          )}
          
          <div className={`
            px-4 py-2 rounded-lg
            ${isOwnMessage
              ? 'bg-gradient-to-r from-blue-500 to-teal-500 text-white'
              : darkMode
                ? 'bg-gray-700 text-gray-200'
                : 'bg-gray-200 text-gray-800'
            }
          `}>
            <p className="text-sm">{message.content}</p>
          </div>
          
          {isOwnMessage && (
            <div className="flex justify-end mt-1">
              <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                {formatTime(message.timestamp)}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`
      ${darkMode ? 'bg-gray-800' : 'bg-white'}
      rounded-lg shadow-xl border ${darkMode ? 'border-gray-700' : 'border-gray-200'}
      flex flex-col h-96 w-80
    `}>
      {/* Header */}
      <div className={`
        ${darkMode ? 'border-gray-700' : 'border-gray-200'}
        border-b px-4 py-3 flex items-center justify-between
      `}>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Chat de session
          </h3>
        </div>
        
        <div className="flex items-center space-x-2">
          <button className={`
            p-1 rounded hover:bg-gray-100 ${darkMode ? 'hover:bg-gray-700' : ''}
          `}>
            <Users className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
          </button>
          <button className={`
            p-1 rounded hover:bg-gray-100 ${darkMode ? 'hover:bg-gray-700' : ''}
          `}>
            <MoreVertical className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
          </button>
          <button
            onClick={onClose}
            className={`
              p-1 rounded hover:bg-gray-100 ${darkMode ? 'hover:bg-gray-700' : ''}
            `}
          >
            <X className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map(message => (
          <MessageBubble key={message.id} message={message} />
        ))}
        
        {/* Indicateur de frappe */}
        {isTyping.length > 0 && (
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <span>{isTyping[0]} est en train d'écrire...</span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className={`
        ${darkMode ? 'border-gray-700' : 'border-gray-200'}
        border-t p-4
      `}>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            className={`
              p-2 rounded-lg transition-colors
              ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}
            `}
          >
            <Paperclip className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
          </button>
          
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={messageInput}
              onChange={handleInputChange}
              placeholder="Tapez votre message..."
              className={`
                w-full px-3 py-2 rounded-lg border transition-colors
                ${darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500' 
                  : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                }
                focus:outline-none focus:ring-2 focus:ring-blue-500/20
              `}
            />
          </div>
          
          <button
            type="button"
            className={`
              p-2 rounded-lg transition-colors
              ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}
            `}
          >
            <Smile className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
          </button>
          
          <button
            type="submit"
            disabled={!messageInput.trim()}
            className={`
              p-2 rounded-lg transition-colors
              ${messageInput.trim()
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : darkMode
                  ? 'bg-gray-700 text-gray-500'
                  : 'bg-gray-200 text-gray-400'
              }
            `}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
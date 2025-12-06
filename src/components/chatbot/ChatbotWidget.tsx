/**
 * Widget de Chatbot pour Centrinote
 * Intégré dans la section Contact pour aider les utilisateurs
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Minimize2, Maximize2, Mail, MessageCircle, CheckCircle, AlertCircle, Lightbulb, Search } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useTranslation } from '../../hooks/useTranslation';
import { chatbotService } from '../../services/chatbotService';

interface Message {
  id: string;
  type: 'user' | 'bot' | 'system';
  content: string;
  timestamp: Date;
  requiresEscalation?: boolean;
  escalationData?: {
    ticketId?: string;
    emailDraft?: string;
  };
  showConfirmationButtons?: boolean;
}

interface ChatbotWidgetProps {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  initialMinimized?: boolean;
}

/**
 * Composant pour afficher les messages structurés avec icônes et encadrés
 */
function StructuredMessage({ 
  content, 
  darkMode 
}: { 
  content: string; 
  darkMode: boolean;
}) {
  // Détecter les marqueurs visuels et structurer le message
  const lines = content.split('\n');
  const parts: JSX.Element[] = [];
  let currentSection: string[] = [];
  let currentType: 'question' | 'solution' | 'warning' | 'tip' | 'normal' = 'normal';
  let partIndex = 0;

  const renderSection = (section: string[], type: string, index: number): JSX.Element | null => {
    if (section.length === 0) return null;

    const sectionContent = section.join('\n').trim();
    if (!sectionContent) return null;

    if (type === 'normal') {
      return (
        <p
          key={`normal-${index}`}
          className={`
            text-sm whitespace-pre-wrap
            ${darkMode ? 'text-gray-100' : 'text-gray-900'}
          `}
        >
          {sectionContent}
        </p>
      );
    }

    const getIcon = () => {
      switch (type) {
        case 'question': return <Search className="w-4 h-4" />;
        case 'solution': return <CheckCircle className="w-4 h-4" />;
        case 'warning': return <AlertCircle className="w-4 h-4" />;
        case 'tip': return <Lightbulb className="w-4 h-4" />;
        default: return null;
      }
    };

    const getStyles = () => {
      switch (type) {
        case 'question':
          return {
            bg: darkMode ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200',
            icon: 'text-blue-500',
            text: darkMode ? 'text-gray-200' : 'text-gray-800'
          };
        case 'solution':
          return {
            bg: darkMode ? 'bg-green-900/20 border-green-700' : 'bg-green-50 border-green-200',
            icon: 'text-green-500',
            text: darkMode ? 'text-gray-200' : 'text-gray-800'
          };
        case 'warning':
          return {
            bg: darkMode ? 'bg-yellow-900/20 border-yellow-700' : 'bg-yellow-50 border-yellow-200',
            icon: 'text-yellow-500',
            text: darkMode ? 'text-gray-200' : 'text-gray-800'
          };
        case 'tip':
          return {
            bg: darkMode ? 'bg-purple-900/20 border-purple-700' : 'bg-purple-50 border-purple-200',
            icon: 'text-purple-500',
            text: darkMode ? 'text-gray-200' : 'text-gray-800'
          };
        default:
          return {
            bg: '',
            icon: '',
            text: darkMode ? 'text-gray-100' : 'text-gray-900'
          };
      }
    };

    const styles = getStyles();

    return (
      <div
        key={`section-${index}`}
        className={`mt-2 p-3 rounded-lg border ${styles.bg}`}
      >
        <div className="flex items-start gap-2">
          <div className={`mt-0.5 ${styles.icon}`}>
            {getIcon()}
          </div>
          <div className="flex-1">
            <p className={`text-sm whitespace-pre-wrap ${styles.text}`}>
              {sectionContent.replace(/^[🔍✅⚠️💡]\s*/, '')}
            </p>
          </div>
        </div>
      </div>
    );
  };

  lines.forEach((line) => {
    const trimmedLine = line.trim();
    
    // Détecter les types de sections
    if (trimmedLine.startsWith('🔍') || (trimmedLine.toLowerCase().includes('quelle étape') && !trimmedLine.toLowerCase().includes('réponse'))) {
      if (currentSection.length > 0) {
        const rendered = renderSection(currentSection, currentType, partIndex++);
        if (rendered) parts.push(rendered);
      }
      currentSection = [trimmedLine];
      currentType = 'question';
    } else if (trimmedLine.startsWith('✅') || trimmedLine.match(/^\d+\./)) {
      if (currentSection.length > 0 && currentType !== 'solution') {
        const rendered = renderSection(currentSection, currentType, partIndex++);
        if (rendered) parts.push(rendered);
        currentSection = [];
      }
      currentSection.push(trimmedLine);
      currentType = 'solution';
    } else if (trimmedLine.startsWith('⚠️')) {
      if (currentSection.length > 0) {
        const rendered = renderSection(currentSection, currentType, partIndex++);
        if (rendered) parts.push(rendered);
      }
      currentSection = [trimmedLine];
      currentType = 'warning';
    } else if (trimmedLine.startsWith('💡')) {
      if (currentSection.length > 0) {
        const rendered = renderSection(currentSection, currentType, partIndex++);
        if (rendered) parts.push(rendered);
      }
      currentSection = [trimmedLine];
      currentType = 'tip';
    } else if (trimmedLine === '' || trimmedLine === '---') {
      if (currentSection.length > 0) {
        const rendered = renderSection(currentSection, currentType, partIndex++);
        if (rendered) parts.push(rendered);
        currentSection = [];
        currentType = 'normal';
      }
    } else {
      if (currentType === 'normal' && currentSection.length === 0) {
        currentType = 'normal';
      }
      currentSection.push(line);
    }
  });

  // Ajouter la dernière section
  if (currentSection.length > 0) {
    const rendered = renderSection(currentSection, currentType, partIndex++);
    if (rendered) parts.push(rendered);
  }

  // Si aucune structure détectée, afficher le message normal
  if (parts.length === 0) {
    return <p className={`text-sm whitespace-pre-wrap ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>{content}</p>;
  }

  return <div>{parts}</div>;
}

/**
 * Composant de boutons de confirmation
 */
function ConfirmationButtons({
  onResolved,
  onNotResolved,
  darkMode
}: {
  onResolved: () => void;
  onNotResolved: () => void;
  darkMode: boolean;
}) {
  return (
    <div className={`
      mt-3 pt-3 border-t
      ${darkMode ? 'border-gray-600' : 'border-gray-300'}
    `}>
      <p className={`
        text-xs font-medium mb-3
        ${darkMode ? 'text-gray-300' : 'text-gray-700'}
      `}>
        Est-ce que votre problème est résolu ?
      </p>
      <div className="flex gap-2">
        <button
          onClick={onResolved}
          className={`
            flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg
            text-sm font-medium transition-all duration-200
            ${darkMode
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-green-500 hover:bg-green-600 text-white'
            }
            hover:scale-[1.02] hover:shadow-md
          `}
        >
          <span>✅</span>
          <span>Oui, c'est réglé</span>
        </button>
        <button
          onClick={onNotResolved}
          className={`
            flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg
            text-sm font-medium transition-all duration-200
            ${darkMode
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-red-500 hover:bg-red-600 text-white'
            }
            hover:scale-[1.02] hover:shadow-md
          `}
        >
          <span>❌</span>
          <span>Non, toujours bloqué</span>
        </button>
      </div>
    </div>
  );
}

/**
 * Composant d'escalation simplifié - Email uniquement
 */
function EscalationCard({ 
  onEscalate, 
  darkMode 
}: { 
  onEscalate: () => void; 
  darkMode: boolean;
}) {
  return (
    <div className={`
      mt-3 pt-3 border-t
      ${darkMode ? 'border-gray-600' : 'border-gray-300'}
    `}>
      <div className={`
        p-3 rounded-lg
        ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}
      `}>
        <p className={`
          text-sm mb-3
          ${darkMode ? 'text-gray-300' : 'text-gray-700'}
        `}>
          Je comprends que le problème persiste malgré nos tentatives. Notre équipe va examiner votre cas en détail.
        </p>
        <button
          onClick={onEscalate}
          className={`
            w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg
            text-sm font-medium transition-all duration-200
            ${darkMode
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
            }
            hover:scale-[1.02] hover:shadow-md
          `}
        >
          <Mail className="w-4 h-4" />
          <span>📧 Envoyer un email au support</span>
        </button>
        <p className={`
          text-xs mt-2 text-center
          ${darkMode ? 'text-gray-400' : 'text-gray-500'}
        `}>
          Un email avec le résumé du problème sera automatiquement généré et envoyé à notre équipe
        </p>
      </div>
    </div>
  );
}

export function ChatbotWidget({ 
  position = 'bottom-right',
  initialMinimized = true 
}: ChatbotWidgetProps) {
  const { state } = useApp();
  const { darkMode, user } = state;
  const { t } = useTranslation();
  const [isMinimized, setIsMinimized] = useState(initialMinimized);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'bot',
      content: t('chatbot_welcome') || 'Bonjour ! Je suis l\'assistant Centrinote. Comment puis-je vous aider aujourd\'hui ?',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showEscalation, setShowEscalation] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addMessage = (type: 'user' | 'bot' | 'system', content: string, escalationData?: any) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date(),
      requiresEscalation: escalationData ? true : false,
      escalationData
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setIsLoading(true);

    // Ajouter le message de l'utilisateur
    addMessage('user', userMessage);

    try {
      // Envoyer au service chatbot
      const response = await chatbotService.sendMessage({
        message: userMessage,
        userId: user?.id || 'anonymous',
        userEmail: user?.email || '',
        userName: user?.full_name || user?.email || 'Utilisateur',
        conversationHistory: messages.slice(-5).map(m => ({
          role: m.type === 'user' ? 'user' : 'assistant',
          content: m.content
        }))
      });

      // Ajouter la réponse du bot
      if (response.requiresEscalation) {
        addMessage('bot', response.message, {
          ticketId: response.ticketId,
          emailDraft: response.emailDraft
        });
        setShowEscalation(true);
      } else {
        const newMessage = addMessage('bot', response.message);
        if (response.showConfirmationButtons) {
          // Marquer le message pour afficher les boutons de confirmation
          setMessages(prev => prev.map(msg => 
            msg.id === newMessage.id 
              ? { ...msg, showConfirmationButtons: true }
              : msg
          ));
        }
      }
    } catch (error) {
      console.error('Erreur chatbot:', error);
      addMessage('bot', t('chatbot_error') || 'Désolé, une erreur s\'est produite. Voulez-vous que je vous aide à rédiger un email à notre équipe de support ?');
      setShowEscalation(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProblemResolved = async () => {
    // Envoyer "oui" au chatbot pour obtenir une astuce
    const userMessage = 'oui, c\'est réglé';
    setInputValue('');
    setIsLoading(true);

    addMessage('user', '✅ Oui, c\'est réglé');

    try {
      const response = await chatbotService.sendMessage({
        message: userMessage,
        userId: user?.id || 'anonymous',
        userEmail: user?.email || '',
        userName: user?.full_name || user?.email || 'Utilisateur',
        conversationHistory: messages.slice(-5).map(m => ({
          role: m.type === 'user' ? 'user' : 'assistant',
          content: m.content
        }))
      });

      addMessage('bot', response.message);
      
      // Retirer les boutons de confirmation du message précédent
      setMessages(prev => prev.map(msg => 
        msg.showConfirmationButtons ? { ...msg, showConfirmationButtons: false } : msg
      ));
    } catch (error) {
      console.error('Erreur chatbot:', error);
      addMessage('bot', 'Super ! Je suis content que ça fonctionne maintenant. 😊');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProblemNotResolved = async () => {
    // Envoyer "non" au chatbot pour déclencher l'escalation
    const userMessage = 'non, toujours bloqué';
    setInputValue('');
    setIsLoading(true);

    addMessage('user', '❌ Non, toujours bloqué');

    try {
      const response = await chatbotService.sendMessage({
        message: userMessage,
        userId: user?.id || 'anonymous',
        userEmail: user?.email || '',
        userName: user?.full_name || user?.email || 'Utilisateur',
        conversationHistory: messages.slice(-5).map(m => ({
          role: m.type === 'user' ? 'user' : 'assistant',
          content: m.content
        }))
      });

      if (response.requiresEscalation) {
        addMessage('bot', response.message, {
          ticketId: response.ticketId,
          emailDraft: response.emailDraft
        });
        setShowEscalation(true);
      } else {
        addMessage('bot', response.message);
      }

      // Retirer les boutons de confirmation du message précédent
      setMessages(prev => prev.map(msg => 
        msg.showConfirmationButtons ? { ...msg, showConfirmationButtons: false } : msg
      ));
    } catch (error) {
      console.error('Erreur chatbot:', error);
      addMessage('bot', 'Je comprends. Je vais t\'aider à contacter notre équipe de support.');
      setShowEscalation(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEscalateToEmail = async () => {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage?.escalationData) return;

    try {
      setIsLoading(true);
      const result = await chatbotService.escalateToEmail({
        userId: user?.id || 'anonymous',
        userEmail: user?.email || '',
        userName: user?.full_name || user?.email || 'Utilisateur',
        conversationHistory: messages,
        ticketId: lastMessage.escalationData.ticketId
      });

      const emailSentMessage = (t('chatbot_email_sent') || 'Email envoyé avec succès ! Ticket {ticketId} créé. Notre équipe vous répondra sous 24h.').replace('{ticketId}', result.ticketId);
      addMessage('system', emailSentMessage);
      setShowEscalation(false);
    } catch (error) {
      console.error('Erreur escalation:', error);
      addMessage('system', t('chatbot_email_error') || 'Erreur lors de l\'envoi de l\'email. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4'
  };

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className={`
          fixed ${positionClasses[position]}
          z-50 flex items-center gap-2 px-4 py-3 rounded-full shadow-lg
          transition-all duration-300 hover:scale-105
          ${darkMode 
            ? 'bg-blue-600 text-white hover:bg-blue-700' 
            : 'bg-blue-500 text-white hover:bg-blue-600'
          }
        `}
        aria-label={t('chatbot_open') || 'Ouvrir le chatbot'}
      >
        <MessageCircle className="w-5 h-5" />
        <span className="font-medium">{t('chatbot_need_help') || 'Besoin d\'aide ?'}</span>
      </button>
    );
  }

  return (
    <div
      className={`
        fixed ${positionClasses[position]}
        z-50 w-96 h-[600px] rounded-lg shadow-2xl
        flex flex-col
        ${darkMode 
          ? 'bg-gray-800 border border-gray-700' 
          : 'bg-white border border-gray-200'
        }
        transition-all duration-300
      `}
    >
      {/* Header */}
      <div
        className={`
          flex items-center justify-between p-4 border-b
          ${darkMode ? 'border-gray-700' : 'border-gray-200'}
        `}
      >
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-full ${darkMode ? 'bg-blue-600' : 'bg-blue-500'}`}>
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {t('chatbot_title') || 'Assistant Centrinote'}
            </h3>
            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {t('chatbot_subtitle') || 'Je suis là pour vous aider'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(true)}
            className={`
              p-1.5 rounded-lg transition-colors
              ${darkMode 
                ? 'hover:bg-gray-700 text-gray-400' 
                : 'hover:bg-gray-100 text-gray-500'
              }
            `}
            aria-label={t('chatbot_minimize') || 'Réduire'}
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsMinimized(true)}
            className={`
              p-1.5 rounded-lg transition-colors
              ${darkMode 
                ? 'hover:bg-gray-700 text-gray-400' 
                : 'hover:bg-gray-100 text-gray-500'
              }
            `}
            aria-label={t('chatbot_close') || 'Fermer'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        className={`
          flex-1 overflow-y-auto p-4 space-y-4
          ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}
        `}
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`
                max-w-[80%] rounded-lg px-4 py-2
                ${
                  message.type === 'user'
                    ? darkMode
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-500 text-white'
                    : message.type === 'system'
                    ? darkMode
                      ? 'bg-yellow-900/30 text-yellow-200 border border-yellow-700'
                      : 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                    : darkMode
                    ? 'bg-gray-700 text-gray-100'
                    : 'bg-white text-gray-900 border border-gray-200'
                }
              `}
            >
              <StructuredMessage 
                content={message.content} 
                darkMode={darkMode}
              />
              {message.showConfirmationButtons && (
                <ConfirmationButtons
                  onResolved={handleProblemResolved}
                  onNotResolved={handleProblemNotResolved}
                  darkMode={darkMode}
                />
              )}
              {message.requiresEscalation && message.escalationData && (
                <EscalationCard 
                  onEscalate={handleEscalateToEmail}
                  darkMode={darkMode}
                />
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div
              className={`
                rounded-lg px-4 py-2
                ${darkMode ? 'bg-gray-700' : 'bg-white border border-gray-200'}
              `}
            >
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div
        className={`
          p-4 border-t
          ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}
        `}
      >
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={t('chatbot_placeholder') || 'Tapez votre message...'}
            disabled={isLoading}
            className={`
              flex-1 px-4 py-2 rounded-lg border
              focus:outline-none focus:ring-2 focus:ring-blue-500
              ${darkMode
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              }
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
            className={`
              px-4 py-2 rounded-lg transition-colors
              ${darkMode
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
              }
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
            aria-label={t('chatbot_send') || 'Envoyer'}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}


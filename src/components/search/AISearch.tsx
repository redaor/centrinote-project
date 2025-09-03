import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Loader,
  Brain,
  AlertCircle,
  CheckCircle,
  Trash2,
  Wifi,
  WifiOff,
  MessageCircle,
  User,
  RefreshCw
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useCentrinoteAI } from '../../hooks/useCentrinoteAI';
import '../../utils/webhookDebug';

interface Message {
  id: string;
  type: 'user' | 'ai' | 'error';
  content: string;
  timestamp: Date;
}

export function AISearch() {
  const { state } = useApp();
  const { darkMode, user } = state;
  
  // Utilisation du nouveau hook CentrinoteAI
  const {
    messages: aiMessages,
    isLoading,
    isConnected,
    error: aiError,
    sendMessage,
    testConnection,
    clearMessages: clearAIMessages,
    getSuggestions,
    stats
  } = useCentrinoteAI();
  
  // État pour l'input uniquement
  const [inputMessage, setInputMessage] = useState('');
  
  // Messages d'accueil avec contexte intelligent
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: `Bonjour ! Je suis votre assistant IA intelligent. Je peux analyser vos ${stats.totalNotes} notes et ${stats.totalVocabulary} mots de vocabulaire pour vous aider de façon personnalisée !`,
      timestamp: new Date()
    }
  ]);
  
  // État de connexion basé sur le hook
  const connectionStatus = {
    connected: isConnected ?? false,
    message: isConnected ? 'IA connectée et opérationnelle' : (aiError || 'Vérification en cours...'),
    lastChecked: new Date()
  };

  // Référence pour le scroll automatique
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll automatique vers le bas
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Synchronisation des messages IA avec l'interface
  useEffect(() => {
    // Ajouter les nouveaux messages du hook à l'affichage
    aiMessages.forEach(aiMessage => {
      const exists = messages.some(m => m.id === aiMessage.id);
      if (!exists) {
        const newMessage: Message = {
          id: aiMessage.id,
          type: aiMessage.type,
          content: aiMessage.content,
          timestamp: aiMessage.timestamp
        };
        setMessages(prev => [...prev, newMessage]);
      }
    });
  }, [aiMessages]);

  /**
   * Vérifie la connexion avec le service IA intelligent
   */
  const checkConnection = async () => {
    const result = await testConnection();
    console.log('📊 Test connexion CentrinoteAI:', result);
  };

  /**
   * Gère l'envoi d'un message
   */
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputMessage.trim() || isLoading) return;

    const messageToSend = inputMessage.trim();
    setInputMessage('');

    console.log('🚀 Envoi message via CentrinoteAI intelligent:', messageToSend);
    
    // Le message utilisateur et la réponse seront ajoutés automatiquement par le hook
    const result = await sendMessage(messageToSend);
    
    if (result.analyse) {
      console.log('🎯 Analyse contextuelle CentrinoteAI:', {
        type: result.analyse.type,
        confidence: result.analyse.confidence,
        confirmation: result.analyse.confirmation,
        hasSource: !!result.analyse.source,
        suggestions: result.analyse.suggestions?.length || 0
      });
    }
  };

  /**
   * Efface l'historique des messages avec CentrinoteAI
   */
  const handleClearMessages = () => {
    clearAIMessages(); // Hook CentrinoteAI
    setMessages([
      {
        id: '1',
        type: 'ai',
        content: `Bonjour ! Je suis votre assistant IA intelligent. Je peux analyser vos ${stats.totalNotes} notes et ${stats.totalVocabulary} mots de vocabulaire pour vous aider de façon personnalisée !`,
        timestamp: new Date()
      }
    ]);
    console.log('🧹 Messages effacés avec CentrinoteAI');
  };

  /**
   * Actions rapides prédéfinies
   */
  const quickActions = [
    'Résume mes documents récents',
    'Aide-moi à réviser mon vocabulaire',
    'Crée un plan d\'étude personnalisé',
    'Explique-moi un concept complexe'
  ];

  /**
   * Obtient le style pour un type de message
   */
  const getMessageStyle = (type: string) => {
    switch (type) {
      case 'user':
        return 'bg-gradient-to-r from-blue-500 to-teal-500 text-white ml-auto';
      case 'error':
        return darkMode 
          ? 'bg-red-900/30 text-red-400 border border-red-800' 
          : 'bg-red-50 text-red-700 border border-red-200';
      case 'ai':
      default:
        return darkMode
          ? 'bg-gray-700 text-gray-200'
          : 'bg-gray-100 text-gray-800';
    }
  };

  /**
   * Obtient l'icône pour un type de message
   */
  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'user':
        return User;
      case 'error':
        return AlertCircle;
      case 'ai':
      default:
        return Brain;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Assistant IA
          </h1>
        </div>
        <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Votre assistant intelligent pour l'apprentissage
        </p>
      </div>

      {/* Statut de connexion */}
      <div className={`
        ${connectionStatus.connected 
          ? darkMode ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-200'
          : darkMode ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'
        }
        border rounded-xl p-4
      `}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`
              p-2 rounded-lg
              ${connectionStatus.connected ? 'bg-green-500' : 'bg-red-500'}
            `}>
              {connectionStatus.connected ? (
                <Wifi className="w-5 h-5 text-white" />
              ) : (
                <WifiOff className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <h3 className={`font-semibold ${
                connectionStatus.connected 
                  ? darkMode ? 'text-green-400' : 'text-green-800'
                  : darkMode ? 'text-red-400' : 'text-red-800'
              }`}>
                {connectionStatus.connected ? 'IA connectée' : 'IA non disponible'}
              </h3>
              <p className={`text-sm ${
                connectionStatus.connected 
                  ? darkMode ? 'text-green-300' : 'text-green-700'
                  : darkMode ? 'text-red-300' : 'text-red-700'
              }`}>
                {connectionStatus.message}
                {connectionStatus.lastChecked && (
                  <span className="ml-2">
                    • {connectionStatus.lastChecked.toLocaleTimeString()}
                  </span>
                )}
              </p>
            </div>
          </div>
          
          <button
            onClick={checkConnection}
            className={`
              p-2 rounded-lg transition-colors
              ${darkMode 
                ? 'hover:bg-gray-700 text-gray-400 hover:text-white' 
                : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
              }
            `}
            title="Vérifier la connexion"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Interface de chat */}
      <div className="max-w-4xl mx-auto">
        {/* Zone des messages */}
        <div className={`
          ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
          border rounded-xl p-6 h-96 overflow-y-auto mb-4
        `}>
          <div className="space-y-4">
            {messages.map((message) => {
              const Icon = getMessageIcon(message.type);
              return (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-3xl px-4 py-3 rounded-lg ${getMessageStyle(message.type)}`}>
                    <div className="flex items-start space-x-2">
                      {message.type !== 'user' && (
                        <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <p className="whitespace-pre-wrap">{message.content}</p>
                        <p className="text-xs mt-2 opacity-70">
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                      {message.type === 'user' && (
                        <User className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* Indicateur de chargement */}
            {isLoading && (
              <div className="flex justify-start">
                <div className={`px-4 py-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <div className="flex items-center space-x-2">
                    <Loader className="w-4 h-4 animate-spin text-blue-500" />
                    <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      L'IA réfléchit...
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div ref={messagesEndRef} />
        </div>

        {/* Contrôles */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {messages.length} message{messages.length > 1 ? 's' : ''}
            </span>
            {connectionStatus.connected && (
              <div className="flex items-center space-x-1 text-green-500">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">En ligne</span>
              </div>
            )}
          </div>
          
          {messages.length > 1 && (
            <button
              onClick={handleClearMessages}
              className={`
                flex items-center space-x-2 px-3 py-1 rounded-lg text-sm transition-colors
                ${darkMode 
                  ? 'text-gray-400 hover:text-white hover:bg-gray-700' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }
              `}
            >
              <Trash2 className="w-4 h-4" />
              <span>Nouveau chat</span>
            </button>
          )}
        </div>

        {/* Formulaire de saisie */}
        <form onSubmit={handleSendMessage} className="relative mb-6">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Posez votre question à l'IA…"
            disabled={!connectionStatus.connected || isLoading}
            className={`
              w-full pl-4 pr-12 py-3 rounded-lg border transition-colors
              ${darkMode 
                ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500' 
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
              }
              focus:outline-none focus:ring-2 focus:ring-blue-500/20
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || isLoading || !connectionStatus.connected}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-blue-500 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <Loader className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </form>

        {/* Actions rapides */}
        <div>
          <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Actions rapides
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={() => setInputMessage(action)}
                disabled={!connectionStatus.connected || isLoading}
                className={`
                  p-3 rounded-lg border text-left transition-all duration-200
                  ${darkMode 
                    ? 'bg-gray-800 border-gray-700 hover:border-blue-500 text-gray-300' 
                    : 'bg-white border-gray-200 hover:border-blue-500 text-gray-700'
                  }
                  hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                <div className="flex items-center space-x-2">
                  <MessageCircle className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium">{action}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
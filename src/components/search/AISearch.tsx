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
import { aiService } from '../../services/aiService';
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
  
  // États pour l'interface
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: 'Bonjour ! Je suis votre assistant IA. Posez-moi vos questions et je vous aiderai avec vos études et documents.',
      timestamp: new Date()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    connected: boolean;
    message: string;
    lastChecked?: Date;
  }>({
    connected: false,
    message: 'Vérification en cours...'
  });

  // Référence pour le scroll automatique
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll automatique vers le bas
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Vérifier la connexion au montage
  useEffect(() => {
    checkConnection();
  }, []);

  /**
   * Vérifie la connexion avec le service IA
   */
  const checkConnection = async () => {
    try {
      console.log('🔍 Vérification de la connexion IA...');
      const result = await aiService.testConnection(user?.id);
      console.log('📊 Résultat du test:', result);
      setConnectionStatus({
        connected: result.success,
        message: result.message,
        lastChecked: new Date()
      });
      
      // Si c'est une erreur de workflow, afficher un message spécifique
      if (!result.success && result.message.includes('Workflow N8N non démarré')) {
        setConnectionStatus({
          connected: false,
          message: 'Workflow N8N inactif - Contactez l\'administrateur',
          lastChecked: new Date()
        });
      }
    } catch (error) {
      console.error('❌ Erreur lors de la vérification:', error);
      setConnectionStatus({
        connected: false,
        message: `Erreur lors de la vérification: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        lastChecked: new Date()
      });
    }
  };

  /**
   * Gère l'envoi d'un message
   */
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    };

    // Ajouter le message utilisateur
    setMessages(prev => [...prev, userMessage]);
    
    const currentInput = inputMessage;
    setInputMessage('');
    setIsLoading(true);

    try {
      // Envoyer à l'IA
      console.log('🚀 Envoi du message à l\'IA:', currentInput);
      const result = await aiService.sendMessage(currentInput, user?.id);
      console.log('📨 Résultat reçu:', result);

      if (result.success && result.response) {
        // Ajouter la réponse de l'IA
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          content: result.response,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMessage]);
      } else {
        // Ajouter un message d'erreur
        console.warn('⚠️ Erreur IA:', result.error);
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'error',
          content: `❌ ${result.error || 'Erreur lors de la communication avec l\'IA'}`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Erreur inattendue:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'error',
        content: `💥 Erreur inattendue: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Efface l'historique des messages
   */
  const clearMessages = () => {
    setMessages([
      {
        id: '1',
        type: 'ai',
        content: 'Bonjour ! Je suis votre assistant IA. Posez-moi vos questions et je vous aiderai avec vos études et documents.',
        timestamp: new Date()
      }
    ]);
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
              onClick={clearMessages}
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
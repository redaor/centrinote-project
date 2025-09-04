import React, { useState, useRef, useEffect } from 'react';
import {
  Brain,
  Sparkles,
  Send,
  BookOpen,
  TrendingUp,
  PlusCircle,
  Zap,
  Target,
  ChevronRight,
  Mic,
  Image as ImageIcon
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useCentrinoteAI } from '../../hooks/useCentrinoteAI';
import { Card, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { LoadingSpinner, ProgressBar } from '../ui/LoadingStates';

interface Message {
  id: string;
  type: 'user' | 'ai' | 'error';
  content: string;
  timestamp: Date;
}

export function ModernAISearch() {
  const { state } = useApp();
  
  const {
    messages: aiMessages,
    isLoading,
    isConnected,
    sendMessage,
    clearMessages: clearAIMessages,
    getSuggestions,
    stats
  } = useCentrinoteAI();

  const [inputMessage, setInputMessage] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Suggestions intelligentes rotatifs
  const smartSuggestions = [
    "Résume mes notes récentes...",
    "Aide-moi avec mon vocabulaire...",
    "Crée un plan d'étude...",
    "Explique-moi ce concept..."
  ];

  const [currentPlaceholder, setCurrentPlaceholder] = useState(0);

  // Rotation des placeholders
  useEffect(() => {
    if (!showChat) {
      const interval = setInterval(() => {
        setCurrentPlaceholder(prev => (prev + 1) % smartSuggestions.length);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [showChat]);

  // Sync messages from hook
  useEffect(() => {
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

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (messageText?: string) => {
    const messageToSend = messageText || inputMessage.trim();
    if (!messageToSend || isLoading || !isConnected) return;

    setInputMessage('');
    setShowChat(true);
    
    await sendMessage(messageToSend);
  };

  const quickActions = [
    {
      title: "Analyse Rapide",
      description: "Analysez vos notes récentes",
      icon: TrendingUp,
      color: "from-blue-500 to-cyan-500",
      action: () => handleSendMessage("Analyse mes notes récentes et donne-moi un résumé"),
      stats: `${stats.notesRecentes} nouvelles`
    },
    {
      title: "Révision Smart", 
      description: "Vocabulaire à réviser",
      icon: Brain,
      color: "from-purple-500 to-pink-500", 
      action: () => handleSendMessage("Aide-moi à réviser mon vocabulaire"),
      stats: `${stats.vocabularyToReview} mots`
    },
    {
      title: "Création Guidée",
      description: "Nouvelle note avec IA",
      icon: PlusCircle,
      color: "from-green-500 to-teal-500",
      action: () => handleSendMessage("Aide-moi à créer une nouvelle note structurée"),
      stats: "Assistant"
    },
    {
      title: "Insights IA",
      description: "Analysez votre progression", 
      icon: Target,
      color: "from-orange-500 to-red-500",
      action: () => handleSendMessage("Donne-moi des insights sur ma progression d'apprentissage"),
      stats: "Personnel"
    }
  ];

  const popularQuestions = [
    "Résume mes notes sur React",
    "Quiz-moi sur mon vocabulaire",
    "Crée un plan d'étude personnalisé",
    "Explique-moi mes dernières notes"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-blue-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur-lg opacity-20 animate-pulse"></div>
            <div className="relative p-4 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-full">
              <Brain className="w-12 h-12 text-white" />
            </div>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold mt-6 mb-4">
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Assistant IA Intelligent
            </span>
          </h1>
          
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-2">
            Votre compagnon d'apprentissage personnalisé
          </p>
          
          {/* Status badge moderne */}
          <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium ${
            isConnected 
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
          }`}>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
            <span>{isConnected ? 'IA Connectée' : 'IA Déconnectée'}</span>
          </div>
        </div>

        {!showChat ? (
          <>
            {/* Barre de recherche principale */}
            <div className="max-w-4xl mx-auto mb-12">
              <Card className="p-6 border-2 border-dashed border-blue-200 dark:border-blue-800 hover:border-blue-400 dark:hover:border-blue-600 transition-all duration-300">
                <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="space-y-4">
                  <div className="relative">
                    <input
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      placeholder={smartSuggestions[currentPlaceholder]}
                      disabled={!isConnected || isLoading}
                      className="w-full pl-6 pr-24 py-4 text-lg bg-transparent border-0 focus:outline-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    />
                    
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex space-x-2">
                      <Button variant="ghost" size="sm" className="p-2" type="button">
                        <Mic className="w-5 h-5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="p-2" type="button">
                        <ImageIcon className="w-5 h-5" />
                      </Button>
                      <Button 
                        variant="primary" 
                        size="sm" 
                        type="submit"
                        disabled={!inputMessage.trim() || isLoading || !isConnected}
                        loading={isLoading}
                        className="px-4"
                      >
                        <Send className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Suggestions populaires */}
                  <div className="flex flex-wrap gap-2">
                    {popularQuestions.map((question, index) => (
                      <button
                        key={index}
                        onClick={() => setInputMessage(question)}
                        className="px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-800/50 text-blue-700 dark:text-blue-300 rounded-full transition-colors"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </form>
              </Card>
            </div>

            {/* Dashboard Grid - Actions Fonctionnelles */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <Card 
                    key={index}
                    className="group cursor-pointer p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                    onClick={action.action}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-3 rounded-lg bg-gradient-to-r ${action.color}`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                    </div>
                    
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      {action.title}
                    </h3>
                    
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {action.description}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        {action.stats}
                      </span>
                      <div className="w-8 h-1 bg-gradient-to-r from-gray-200 to-blue-200 dark:from-gray-700 dark:to-blue-700 rounded-full group-hover:from-blue-400 group-hover:to-purple-400 transition-all duration-300"></div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Section Contexte Utilisateur */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="md:col-span-2">
                <CardHeader 
                  title="Votre Contexte d'Apprentissage"
                  icon={BookOpen}
                />
                
                <div className="space-y-4">
                  {/* Progress Vocabulaire */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Maîtrise Vocabulaire
                      </span>
                      <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                        {Math.round((stats.totalVocabulary - stats.vocabularyToReview) / Math.max(stats.totalVocabulary, 1) * 100)}%
                      </span>
                    </div>
                    <ProgressBar 
                      progress={(stats.totalVocabulary - stats.vocabularyToReview) / Math.max(stats.totalVocabulary, 1) * 100}
                      variant="primary"
                    />
                  </div>

                  {/* Stats rapides */}
                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {stats.totalNotes}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Notes totales
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {stats.totalVocabulary}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Mots appris
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Suggestions personnalisées */}
              <Card>
                <CardHeader 
                  title="Suggestions IA"
                  icon={Sparkles}
                />
                
                <div className="space-y-3">
                  {getSuggestions().slice(0, 3).map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSendMessage(suggestion)}
                      className="w-full p-3 text-left text-sm bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900/30 rounded-lg hover:from-blue-50 hover:to-purple-50 dark:hover:from-blue-900/30 dark:hover:to-purple-900/30 transition-all duration-200 border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex items-center space-x-2">
                        <Zap className="w-4 h-4 text-blue-500" />
                        <span className="text-gray-700 dark:text-gray-300">{suggestion}</span>
                      </div>
                    </button>
                  ))}
                  
                  {getSuggestions().length === 0 && (
                    <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                      <Brain className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">L'IA analysera vos données pour générer des suggestions</p>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </>
        ) : (
          /* Interface Chat Moderne */
          <div className="max-w-4xl mx-auto">
            <Card className="h-[600px] flex flex-col">
              {/* Chat Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg">
                    <Brain className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Assistant IA
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {messages.length} messages
                    </p>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <Button variant="ghost" size="sm" onClick={clearAIMessages}>
                    Nouveau chat
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowChat(false)}>
                    Retour
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center py-12">
                    <Brain className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                    <p className="text-gray-500 dark:text-gray-400">
                      Commencez votre conversation avec l'IA
                    </p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                        message.type === 'user'
                          ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                          : message.type === 'error'
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
                      }`}>
                        <p className="whitespace-pre-wrap">{message.content}</p>
                        <p className="text-xs mt-2 opacity-70">
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-3">
                      <LoadingSpinner size="sm" text="L'IA réfléchit..." />
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Input Chat */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex space-x-3">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Tapez votre message..."
                    disabled={!isConnected || isLoading}
                    className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                  />
                  <Button 
                    variant="primary" 
                    type="submit"
                    disabled={!inputMessage.trim() || isLoading || !isConnected}
                    loading={isLoading}
                  >
                    <Send className="w-5 h-5" />
                  </Button>
                </form>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
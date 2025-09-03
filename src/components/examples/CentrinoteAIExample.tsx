/**
 * 🧠 Exemple d'utilisation de CentrinoteAI
 * Montre comment utiliser le nouveau module IA intelligent
 */

import React, { useState } from 'react';
import { Brain, MessageCircle, BookOpen, Vocabulary } from 'lucide-react';
import { useCentrinoteAI } from '../../hooks/useCentrinoteAI';

export function CentrinoteAIExample() {
  const {
    messages,
    isLoading,
    isConnected,
    sendMessage,
    getContextStats,
    getSuggestions,
    stats
  } = useCentrinoteAI();

  const [inputText, setInputText] = useState('');

  const exampleQuestions = [
    "Peux-tu me résumer mes notes sur React ?",
    "Explique-moi le mot 'algorithme' de mon vocabulaire",
    "Quels sont mes mots de vocabulaire à réviser ?",
    "Fais-moi un quiz sur mes notes récentes",
    "Aide-moi à comprendre mes notes de mathématiques"
  ];

  const handleSendExample = async (question: string) => {
    setInputText(question);
    await sendMessage(question);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      await sendMessage(inputText);
      setInputText('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center space-x-3 mb-4">
          <Brain className="w-8 h-8 text-blue-500" />
          <h1 className="text-3xl font-bold text-gray-900">
            CentrinoteAI - IA Intelligente
          </h1>
        </div>
        <p className="text-gray-600">
          Assistant IA avec analyse contextuelle de vos notes et vocabulaire
        </p>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-blue-500" />
            <span className="font-semibold text-blue-700">Notes</span>
          </div>
          <p className="text-2xl font-bold text-blue-900 mt-2">
            {stats.totalNotes}
          </p>
          <p className="text-sm text-blue-600">
            {stats.notesRecentes} récentes
          </p>
        </div>

        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center space-x-2">
            <Vocabulary className="w-5 h-5 text-green-500" />
            <span className="font-semibold text-green-700">Vocabulaire</span>
          </div>
          <p className="text-2xl font-bold text-green-900 mt-2">
            {stats.totalVocabulary}
          </p>
          <p className="text-sm text-green-600">
            {stats.vocabularyToReview} à réviser
          </p>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <div className="flex items-center space-x-2">
            <Brain className="w-5 h-5 text-purple-500" />
            <span className="font-semibold text-purple-700">IA</span>
          </div>
          <p className="text-2xl font-bold text-purple-900 mt-2">
            {isConnected ? '✅' : '❌'}
          </p>
          <p className="text-sm text-purple-600">
            {isConnected ? 'Connectée' : 'Déconnectée'}
          </p>
        </div>
      </div>

      {/* Questions d'exemple */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <MessageCircle className="w-5 h-5 mr-2 text-gray-600" />
          Essayez ces questions intelligentes :
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {exampleQuestions.map((question, index) => (
            <button
              key={index}
              onClick={() => handleSendExample(question)}
              disabled={isLoading || !isConnected}
              className="text-left p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="text-sm text-gray-700">{question}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Suggestions personnalisées */}
      {getSuggestions().length > 0 && (
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <h4 className="font-semibold text-yellow-800 mb-2">
            💡 Suggestions basées sur votre contenu :
          </h4>
          <div className="flex flex-wrap gap-2">
            {getSuggestions().map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSendExample(suggestion)}
                className="px-3 py-1 bg-yellow-200 text-yellow-800 rounded-full text-sm hover:bg-yellow-300 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Interface de chat */}
      <div className="bg-white border border-gray-200 rounded-lg">
        {/* Messages */}
        <div className="h-64 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <Brain className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p>Posez votre première question à CentrinoteAI !</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.type === 'user'
                      ? 'bg-blue-500 text-white'
                      : message.type === 'error'
                      ? 'bg-red-100 text-red-700 border border-red-200'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <p className="text-xs mt-1 opacity-60">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="border-t border-gray-200 p-4">
          <div className="flex space-x-3">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Posez votre question à l'IA..."
              disabled={!isConnected || isLoading}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!isConnected || isLoading || !inputText.trim()}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? '⏳' : '🚀'}
            </button>
          </div>
        </form>
      </div>

      {/* Debug info */}
      <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
        <strong>Debug:</strong> Messages: {messages.length} | 
        Chargement: {isLoading ? 'Oui' : 'Non'} | 
        Connecté: {isConnected ? 'Oui' : 'Non'} |
        Contexte: {stats.hasContext ? 'Disponible' : 'Vide'}
      </div>
    </div>
  );
}
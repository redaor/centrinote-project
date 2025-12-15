/**
 * Exemples d'utilisation de l'orchestrateur Noteo
 * Démontre les 3 services : search, chat, aide
 */

import React, { useState } from 'react';
import { useNoteoSearch, useNoteoChat, useNoteoAide } from '../../hooks/useNoteoOrchestrator';
import { Search, MessageCircle, HelpCircle, Loader2 } from 'lucide-react';
import { useTextCorrection } from '../../hooks/useTextCorrection';
import { SuggestionPanel } from '../ai/SuggestionPanel';

export function OrchestratorExample() {
  const [searchQuery, setSearchQuery] = useState('');
  const [chatMessage, setChatMessage] = useState('');
  const [aideQuestion, setAideQuestion] = useState('');

  const search = useNoteoSearch();
  const chat = useNoteoChat();
  const aide = useNoteoAide();

  // Hooks de correction pour chaque champ
  const chatCorrection = useTextCorrection({
    enableAutoCorrect: true,
    enableSuggestions: true,
  });

  const aideCorrection = useTextCorrection({
    enableAutoCorrect: true,
    enableSuggestions: true,
  });

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    await search.search(searchQuery, {
      onSuccess: (reply) => {
        console.log('Résultat recherche:', reply);
      },
      onError: (error) => {
        console.error('Erreur recherche:', error);
      },
    });
  };

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    await chat.chat(chatMessage, {
      onSuccess: (reply) => {
        console.log('Réponse chat:', reply);
      },
    });
  };

  const handleAide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aideQuestion.trim()) return;

    await aide.ask(aideQuestion, {
      onSuccess: (reply) => {
        console.log('Aide:', reply);
      },
    });
  };

  return (
    <div className="p-6 space-y-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Orchestrateur Noteo - Exemples</h1>

      {/* Service Search */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
        <div className="flex items-center gap-2 mb-4">
          <Search className="w-5 h-5 text-blue-600" />
          <h2 className="text-xl font-semibold">Recherche Sémantique</h2>
        </div>
        <form onSubmit={handleSearch} className="space-y-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cherche mes notes sur TypeScript..."
            className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
            disabled={search.loading}
          />
          <button
            type="submit"
            disabled={search.loading || !searchQuery.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
          >
            {search.loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Rechercher
          </button>
        </form>
        {search.error && (
          <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded text-red-800 dark:text-red-300">
            {search.error}
          </div>
        )}
        {search.lastReply && (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {search.lastReply}
            </p>
          </div>
        )}
      </div>

      {/* Service Chat */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
        <div className="flex items-center gap-2 mb-4">
          <MessageCircle className="w-5 h-5 text-green-600" />
          <h2 className="text-xl font-semibold">Chat Conversationnel</h2>
        </div>
        <form onSubmit={handleChat} className="space-y-4 relative">
          {/* Panneau de suggestions pour Chat */}
          <div className="relative">
            <SuggestionPanel
              suggestions={chatCorrection.suggestions}
              onApply={(suggestionId) => {
                const newValue = chatCorrection.applySuggestion(suggestionId, chatMessage);
                setChatMessage(newValue);
                chatCorrection.clearSuggestions();
              }}
              onDismiss={chatCorrection.clearSuggestions}
              onDismissAll={chatCorrection.clearSuggestions}
              isVisible={chatCorrection.suggestions.length > 0 && !chat.loading}
            />
            <input
              type="text"
              value={chatMessage}
              onChange={(e) => {
                const corrected = chatCorrection.applyAutoCorrections(e.target.value);
                setChatMessage(corrected);
                chatCorrection.analyzeLater(corrected);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') chatCorrection.clearSuggestions();
              }}
              placeholder="Bonjour, comment vas-tu ?"
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              disabled={chat.loading}
            />
          </div>
          <button
            type="submit"
            disabled={chat.loading || !chatMessage.trim()}
            className="px-4 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
          >
            {chat.loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Envoyer
          </button>
        </form>
        {chat.error && (
          <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded text-red-800 dark:text-red-300">
            {chat.error}
          </div>
        )}
        {chat.lastReply && (
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {chat.lastReply}
            </p>
          </div>
        )}
      </div>

      {/* Service Aide */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
        <div className="flex items-center gap-2 mb-4">
          <HelpCircle className="w-5 h-5 text-purple-600" />
          <h2 className="text-xl font-semibold">Aide Guidée</h2>
        </div>
        <form onSubmit={handleAide} className="space-y-4 relative">
          {/* Panneau de suggestions pour Aide */}
          <div className="relative">
            <SuggestionPanel
              suggestions={aideCorrection.suggestions}
              onApply={(suggestionId) => {
                const newValue = aideCorrection.applySuggestion(suggestionId, aideQuestion);
                setAideQuestion(newValue);
                aideCorrection.clearSuggestions();
              }}
              onDismiss={aideCorrection.clearSuggestions}
              onDismissAll={aideCorrection.clearSuggestions}
              isVisible={aideCorrection.suggestions.length > 0 && !aide.loading}
            />
            <input
              type="text"
              value={aideQuestion}
              onChange={(e) => {
                const corrected = aideCorrection.applyAutoCorrections(e.target.value);
                setAideQuestion(corrected);
                aideCorrection.analyzeLater(corrected);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') aideCorrection.clearSuggestions();
              }}
              placeholder="Comment créer une nouvelle note ?"
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              disabled={aide.loading}
            />
          </div>
          <button
            type="submit"
            disabled={aide.loading || !aideQuestion.trim()}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
          >
            {aide.loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Demander de l'aide
          </button>
        </form>
        {aide.error && (
          <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded text-red-800 dark:text-red-300">
            {aide.error}
          </div>
        )}
        {aide.lastReply && (
          <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded">
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {aide.lastReply}
            </p>
          </div>
        )}
      </div>

      {/* Informations */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
        <h3 className="font-semibold mb-2">Comment ça marche ?</h3>
        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
          <li>🔍 <strong>Recherche :</strong> Utilise OPENAI_SEARCH_KEY - Détecte "cherche", "trouve", "recherche"</li>
          <li>💬 <strong>Chat :</strong> Utilise OPENAI_CHAT_KEY - Pour les conversations générales</li>
          <li>❓ <strong>Aide :</strong> Utilise OPENAI_AIDE_KEY - Détecte "aide", "comment", "tutorial"</li>
        </ul>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-4">
          L'orchestrateur vérifie automatiquement que la clé API correspond à l'intention détectée (403 si non autorisée).
        </p>
      </div>
    </div>
  );
}

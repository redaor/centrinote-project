/**
 * Page de démonstration du système ghost-text
 * Permet de tester toutes les fonctionnalités dans différents contextes
 */

import React, { useState } from 'react';
import { GhostTextArea } from '../features/ghost-text';
import { useApp } from '../contexts/AppContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export function GhostTextDemoPage() {
  const { state } = useApp();
  const { darkMode, user } = state;

  const [notesText, setNotesText] = useState('');
  const [vocabText, setVocabText] = useState('');
  const [searchText, setSearchText] = useState('');
  const [chatText, setChatText] = useState('');
  const [meetingText, setMeetingText] = useState('');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-blue-950 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Ghost-Text Demo
            </span>
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Testez l'autocomplétion inline style GitHub Copilot/Notion
          </p>
          <div className="mt-4 flex items-center justify-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded">Tab</kbd>
              <span>pour accepter</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded">Esc</kbd>
              <span>pour ignorer</span>
            </div>
          </div>
        </div>

        {/* Notes Context */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            📝 Notes
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Contexte optimisé pour la création de notes
          </p>
          <GhostTextArea
            value={notesText}
            onChange={setNotesText}
            placeholder="Tapez votre note... (ex: 'créer une note' ou 'organiser mes')"
            context="notes"
            userId={user?.id}
            enabled={true}
            darkMode={darkMode}
            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white resize-none"
            rows={6}
          />
        </Card>

        {/* Vocabulaire Context */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            📚 Vocabulaire
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Contexte optimisé pour les entrées de vocabulaire
          </p>
          <GhostTextArea
            value={vocabText}
            onChange={setVocabText}
            placeholder="Tapez une définition... (ex: 'définition de')"
            context="vocab"
            userId={user?.id}
            enabled={true}
            darkMode={darkMode}
            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white resize-none"
            rows={6}
          />
        </Card>

        {/* Recherche IA Context */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            🔍 Recherche IA
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Contexte optimisé pour les requêtes de recherche
          </p>
          <GhostTextArea
            value={searchText}
            onChange={setSearchText}
            placeholder="Tapez votre question... (ex: 'comment créer')"
            context="search"
            userId={user?.id}
            enabled={true}
            darkMode={darkMode}
            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white resize-none"
            rows={4}
          />
        </Card>

        {/* Chat IA Context */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            💬 Chat IA
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Contexte optimisé pour les messages de chat
          </p>
          <GhostTextArea
            value={chatText}
            onChange={setChatText}
            placeholder="Tapez votre message... (ex: 'peux-tu m'aider')"
            context="chat"
            userId={user?.id}
            enabled={true}
            darkMode={darkMode}
            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white resize-none"
            rows={4}
          />
        </Card>

        {/* Réunions Context */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            🤝 Réunions
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Contexte optimisé pour les comptes-rendus de réunion
          </p>
          <GhostTextArea
            value={meetingText}
            onChange={setMeetingText}
            placeholder="Tapez votre compte-rendu... (ex: 'points de la')"
            context="meeting"
            userId={user?.id}
            enabled={true}
            darkMode={darkMode}
            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white resize-none"
            rows={6}
          />
        </Card>

        {/* Instructions */}
        <Card className="p-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
            💡 Comment utiliser
          </h3>
          <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <li>
              <strong>Ghost-text :</strong> Le suffixe manquant apparaît en transparence après votre curseur
            </li>
            <li>
              <strong>Tab :</strong> Accepte la suggestion (remplace le mot en cours ou ajoute le suffixe)
            </li>
            <li>
              <strong>Esc :</strong> Ignore la suggestion
            </li>
            <li>
              <strong>Performance :</strong> Les suggestions sont générées en &lt; 50ms par frappe
            </li>
            <li>
              <strong>Mobile :</strong> Tap sur le ghost ou icône « + » pour accepter (à venir)
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}

export default GhostTextDemoPage;






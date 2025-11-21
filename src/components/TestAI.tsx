import React, { useState } from 'react';
import { useAI } from '../hooks/useAI';
import { motion } from 'framer-motion';
import { Send, Loader, Clock, Calendar, HelpCircle, AlertCircle } from 'lucide-react';

/**
 * Composant de test pour l'IA GPT-4 connectée à Internet
 * Permet de tester les différentes capacités de l'IA
 */
export function TestAI() {
  const { ask, loading, error, clearError } = useAI();
  const [response, setResponse] = useState('');
  const [customQuestion, setCustomQuestion] = useState('');

  const testQuestions = [
    {
      id: 'datetime',
      label: 'Date et Heure',
      icon: Clock,
      question: 'Quelle date et heure est-il exactement ?',
      color: 'blue'
    },
    {
      id: 'day',
      label: 'Jour de la semaine',
      icon: Calendar,
      question: 'Quel jour sommes-nous aujourd\'hui ?',
      color: 'green'
    },
    {
      id: 'help',
      label: 'Aide apprentissage',
      icon: HelpCircle,
      question: 'Donne-moi 3 conseils pour mieux mémoriser mes notes de cours.',
      color: 'purple'
    }
  ];

  const handleTest = async (question: string) => {
    clearError();
    setResponse('');
    const result = await ask(question);
    setResponse(result);
  };

  const handleCustomQuestion = async () => {
    if (!customQuestion.trim()) return;
    await handleTest(customQuestion);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6"
      >
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            🤖 Test IA Centrinote GPT-4
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Testez l'IA connectée à Internet avec accès à la date/heure actuelle
          </p>
        </div>

        {/* Quick Test Buttons */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Tests rapides :
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {testQuestions.map((test) => {
              const Icon = test.icon;
              return (
                <motion.button
                  key={test.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleTest(test.question)}
                  disabled={loading}
                  className={`p-4 rounded-lg border-2 border-${test.color}-500 bg-${test.color}-50 dark:bg-${test.color}-900/20 hover:bg-${test.color}-100 dark:hover:bg-${test.color}-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <Icon className={`w-5 h-5 text-${test.color}-600 dark:text-${test.color}-400 mb-2`} />
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {test.label}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Custom Question */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Question personnalisée :
          </h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={customQuestion}
              onChange={(e) => setCustomQuestion(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCustomQuestion()}
              placeholder="Posez votre question..."
              disabled={loading}
              className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleCustomQuestion}
              disabled={loading || !customQuestion.trim()}
              className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <Loader className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
              <span>{loading ? 'Envoi...' : 'Envoyer'}</span>
            </motion.button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-red-800 dark:text-red-200 mb-1">
                Erreur
              </h4>
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          </motion.div>
        )}

        {/* Response Display */}
        {response && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"
          >
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Réponse de l'IA :
            </h3>
            <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{response}</p>
          </motion.div>
        )}

        {/* Info */}
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
            ℹ️ Informations techniques :
          </h4>
          <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <li>• Modèle : GPT-4 (OpenAI)</li>
            <li>• Cache : 5 minutes (réponses identiques)</li>
            <li>• Timeout : 8 secondes max</li>
            <li>• Fallback : Message d'erreur en cas de problème</li>
            <li>• Date/Heure : Temps réel (heure française)</li>
          </ul>
        </div>
      </motion.div>
    </div>
  );
}

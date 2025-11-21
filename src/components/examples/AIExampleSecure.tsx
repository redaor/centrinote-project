/**
 * Exemple d'utilisation sécurisée de l'IA
 * Utilise l'Edge Function ai-chat (pas d'appel direct à OpenAI)
 */

import { useState } from 'react';
import { useAIChatEdgeFunction } from '@/hooks/useAIChatEdgeFunction';

export function AIExampleSecure() {
  const { ask, isLoading, error, clearError } = useAIChatEdgeFunction();
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState('');

  const handleAsk = async () => {
    if (!question.trim()) return;

    clearError();
    setResponse('');

    try {
      const reply = await ask(question);
      setResponse(reply);
    } catch (err) {
      console.error('Erreur:', err);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Assistant IA Sécurisé</h2>

      <div className="mb-4">
        <textarea
          className="w-full p-3 border rounded-lg resize-none"
          rows={4}
          placeholder="Posez votre question..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={isLoading}
        />
      </div>

      <button
        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={handleAsk}
        disabled={isLoading || !question.trim()}
      >
        {isLoading ? 'Réflexion...' : 'Poser la question'}
      </button>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <strong>Erreur :</strong> {error}
        </div>
      )}

      {response && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="font-semibold mb-2">Réponse :</h3>
          <p className="whitespace-pre-wrap">{response}</p>
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm">
        <h3 className="font-semibold mb-2">🔒 Architecture Sécurisée</h3>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          <li>✅ Pas de clé API exposée dans le navigateur</li>
          <li>✅ Appel via Edge Function Supabase</li>
          <li>✅ Clé OpenAI stockée côté serveur uniquement</li>
        </ul>
      </div>
    </div>
  );
}

export default AIExampleSecure;

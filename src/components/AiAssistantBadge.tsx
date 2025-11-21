import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

type AiAction = 'reformuler' | 'resumer' | 'rechercher' | 'ameliorer' | 'definir';

interface AiAssistantBadgeProps {
  className?: string;
  popoverOffset?: { x: number; y: number };
  onQuotaExhausted?: () => void;
}

export const AiAssistantBadge: React.FC<AiAssistantBadgeProps> = ({
  className = 'fixed bottom-4 right-4',
  popoverOffset = { x: 0, y: 0 },
  onQuotaExhausted,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [inputText, setInputText] = useState('');
  const [selectedAction, setSelectedAction] = useState<AiAction>('resumer');

  const executeAction = async () => {
    if (!inputText.trim()) return;

    setLoading(true);
    setResult('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setResult('❌ Non authentifié');
        return;
      }

      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          action: selectedAction,
          text: inputText,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        if (error.message?.includes('quota')) {
          onQuotaExhausted?.();
          setResult('❌ Quota épuisé (50/24h)');
        } else {
          setResult(`❌ ${error.message}`);
        }
        return;
      }

      if (data.ok) {
        setResult(data.html);
      } else {
        setResult(`❌ Erreur: ${data.code}`);
      }
    } catch (err) {
      setResult(`❌ ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={className} style={{ zIndex: 9999 }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-full p-4 shadow-lg transition-all duration-200 hover:scale-110"
        aria-label="Assistant IA"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="w-6 h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 22l-.394-1.433a2.25 2.25 0 00-1.423-1.423L13.25 19l1.433-.394a2.25 2.25 0 001.423-1.423L16.5 16l.394 1.183a2.25 2.25 0 001.423 1.423L19.75 19l-1.433.394a2.25 2.25 0 00-1.423 1.423z"
          />
        </svg>
      </button>

      {isOpen && (
        <div
          className="absolute bottom-20 right-0 bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 w-96 border border-gray-200 dark:border-gray-700"
          style={{ transform: `translate(${popoverOffset.x}px, ${popoverOffset.y}px)` }}
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Assistant IA</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Action
              </label>
              <select
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value as AiAction)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="resumer">📝 Résumer</option>
                <option value="reformuler">🔄 Reformuler</option>
                <option value="ameliorer">✨ Améliorer</option>
                <option value="definir">📖 Définir</option>
                <option value="rechercher">🔍 Rechercher</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Texte
              </label>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Collez votre texte ici..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              />
            </div>

            <button
              onClick={executeAction}
              disabled={loading || !inputText.trim()}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Traitement...
                </span>
              ) : (
                'Exécuter'
              )}
            </button>

            {result && (
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <div
                  className="text-sm text-gray-900 dark:text-white prose dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: result }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

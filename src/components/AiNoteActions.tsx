import React, { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

type AiAction = 'reformuler' | 'resumer' | 'ameliorer' | 'definir';

interface AiNoteActionsProps {
  noteContent: string;
  noteTitle: string;
  onResultReady: (result: string, action: AiAction) => void;
  className?: string;
}

export const AiNoteActions: React.FC<AiNoteActionsProps> = ({
  noteContent,
  noteTitle,
  onResultReady,
  className = '',
}) => {
  const [loading, setLoading] = useState(false);
  const [currentAction, setCurrentAction] = useState<AiAction | null>(null);
  const [error, setError] = useState<string>('');

  const executeAction = async (action: AiAction) => {
    if (!noteContent?.trim()) {
      setError('La note est vide');
      return;
    }

    setLoading(true);
    setCurrentAction(action);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Non authentifié');
      }

      const textToProcess = `${noteTitle}\n\n${noteContent}`;

      const { data, error: invokeError } = await supabase.functions.invoke('ai-assistant', {
        body: {
          action,
          text: textToProcess,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (invokeError) {
        throw new Error(invokeError.message || 'Erreur IA');
      }

      if (data.ok) {
        onResultReady(data.html, action);
      } else if (data.code === 'QUOTA_EXCEEDED') {
        setError('Quota épuisé (50/24h)');
      } else {
        setError(`Erreur: ${data.code}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
      setCurrentAction(null);
    }
  };

  const actions: { action: AiAction; label: string; emoji: string; description: string }[] = [
    { action: 'resumer', label: 'Résumer', emoji: '📝', description: 'Résumé en points clés' },
    { action: 'ameliorer', label: 'Améliorer', emoji: '✨', description: 'Corriger grammaire & style' },
    { action: 'reformuler', label: 'Reformuler', emoji: '🔄', description: 'Réécrire clairement' },
    { action: 'definir', label: 'Définir', emoji: '📖', description: 'Expliquer le concept' },
  ];

  return (
    <div className={`${className}`}>
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border border-purple-200/50 dark:border-purple-800/50 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          <h3 className="text-sm font-semibold text-purple-900 dark:text-purple-200">
            Assistant IA
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {actions.map(({ action, label, emoji, description }) => (
            <button
              key={action}
              onClick={() => executeAction(action)}
              disabled={loading}
              className="flex flex-col items-start p-3 bg-white dark:bg-slate-900/50 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/30 hover:border-purple-300 dark:hover:border-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
              title={description}
            >
              <span className="text-xl mb-1">{emoji}</span>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300 group-hover:text-purple-700 dark:group-hover:text-purple-300">
                {currentAction === action && loading ? (
                  <span className="flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {label}...
                  </span>
                ) : (
                  label
                )}
              </span>
            </button>
          ))}
        </div>

        {error && (
          <div className="mt-3 p-2 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded text-xs text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 text-center">
          Les résultats apparaîtront dans une modale
        </div>
      </div>
    </div>
  );
};

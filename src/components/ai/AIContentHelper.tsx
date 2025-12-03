// Composant pour améliorer/corriger le contenu avec l'IA
import React, { useState } from 'react';
import { Sparkles, Check, X, Loader2, RefreshCw, Wand2, BookOpen, Zap } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface AIContentHelperProps {
  content: string;
  title?: string;
  contentType: 'note' | 'vocabulaire';
  onApply: (improvedContent: string) => void;
  darkMode?: boolean;
}

type ActionType = 'corriger' | 'améliorer' | 'reformuler' | 'enrichir';

const ACTIONS: Array<{
  id: ActionType;
  label: string;
  description: string;
  icon: typeof Wand2;
  color: string;
}> = [
  {
    id: 'corriger',
    label: 'Corriger',
    description: 'Corriger l\'orthographe et la grammaire',
    icon: Check,
    color: 'text-green-600 dark:text-green-400'
  },
  {
    id: 'améliorer',
    label: 'Améliorer',
    description: 'Améliorer la clarté et la fluidité',
    icon: Wand2,
    color: 'text-blue-600 dark:text-blue-400'
  },
  {
    id: 'reformuler',
    label: 'Reformuler',
    description: 'Rendre plus concis et percutant',
    icon: RefreshCw,
    color: 'text-purple-600 dark:text-purple-400'
  },
  {
    id: 'enrichir',
    label: 'Enrichir',
    description: 'Ajouter détails et exemples',
    icon: BookOpen,
    color: 'text-orange-600 dark:text-orange-400'
  },
];

export function AIContentHelper({
  content,
  title,
  contentType,
  onApply,
  darkMode = false
}: AIContentHelperProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<ActionType | null>(null);
  const [improvedContent, setImprovedContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleActionSelect = async (action: ActionType) => {
    setSelectedAction(action);
    setError(null);
    setLoading(true);
    setImprovedContent('');

    try {
      console.log(`[AI-Helper] 🎨 Action sélectionnée: ${action}`);

      // Vérifier si le contenu est vide
      const trimmedContent = content.trim();
      if (!trimmedContent) {
        throw new Error('EMPTY_CONTENT');
      }

      const response = await fetch('/.netlify/functions/improve-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          contentType,
          content: trimmedContent,
          title: title || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        // Améliorer le message d'erreur si c'est "Contenu requis"
        const errorMessage = data.error || 'Erreur lors de l\'amélioration du contenu';
        if (errorMessage.includes('requis') || errorMessage.includes('required') || errorMessage.includes('vide') || errorMessage.includes('empty')) {
          throw new Error('EMPTY_CONTENT');
        }
        throw new Error(errorMessage);
      }

      console.log(`[AI-Helper] ✅ Contenu amélioré en ${data.duration_ms}ms`);
      setImprovedContent(data.improved);
    } catch (err) {
      console.error('[AI-Helper] ❌ Erreur:', err);
      if (err instanceof Error && err.message === 'EMPTY_CONTENT') {
        setError('EMPTY_CONTENT');
      } else {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      }
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour générer le contenu à partir du titre
  const handleGenerateFromTitle = async () => {
    if (!title || !title.trim()) {
      setError('Un titre est requis pour générer le contenu');
      return;
    }

    setSelectedAction('enrichir');
    setError(null);
    setLoading(true);
    setImprovedContent('');

    try {
      console.log(`[AI-Helper] 🎨 Génération de contenu à partir du titre: ${title}`);

      const response = await fetch('/.netlify/functions/improve-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'enrichir',
          contentType,
          content: '', // Contenu vide, on génère à partir du titre
          title: title.trim(),
          generateFromTitle: true, // Flag pour indiquer qu'on génère depuis le titre
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Erreur lors de la génération du contenu');
      }

      console.log(`[AI-Helper] ✅ Contenu généré en ${data.duration_ms}ms`);
      setImprovedContent(data.improved || data.generated);
    } catch (err) {
      console.error('[AI-Helper] ❌ Erreur:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue lors de la génération');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (improvedContent) {
      onApply(improvedContent);
      setIsOpen(false);
      resetState();
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
    resetState();
  };

  const resetState = () => {
    setSelectedAction(null);
    setImprovedContent('');
    setError(null);
    setLoading(false);
  };

  const handleRetry = () => {
    if (selectedAction) {
      handleActionSelect(selectedAction);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        onClick={() => setIsOpen(true)}
        className="gap-2"
        title="Aide IA pour améliorer le contenu"
      >
        <Sparkles className="w-4 h-4" />
        <span>Aide IA</span>
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={handleCancel}
        title={
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <span>Assistant IA - {contentType === 'note' ? 'Note' : 'Vocabulaire'}</span>
          </div>
        }
        size="xl"
      >
        <div className="p-6 space-y-6">
          {/* Étape 1: Sélection de l'action */}
          {!selectedAction && (
            <div className="space-y-4">
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Choisissez comment vous souhaitez améliorer votre contenu :
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {ACTIONS.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.id}
                      onClick={() => handleActionSelect(action.id)}
                      disabled={loading}
                      className={`
                        p-4 rounded-lg border-2 text-left transition-all duration-200
                        ${darkMode
                          ? 'bg-gray-800 border-gray-700 hover:border-purple-600 hover:bg-gray-750'
                          : 'bg-white border-gray-200 hover:border-purple-400 hover:shadow-md'
                        }
                        disabled:opacity-50 disabled:cursor-not-allowed
                        focus:outline-none focus:ring-2 focus:ring-purple-500/50
                      `}
                    >
                      <div className="flex items-start gap-3">
                        <Icon className={`w-5 h-5 mt-0.5 ${action.color}`} />
                        <div className="flex-1">
                          <h4 className={`font-semibold mb-1 ${
                            darkMode ? 'text-white' : 'text-gray-900'
                          }`}>
                            {action.label}
                          </h4>
                          <p className={`text-sm ${
                            darkMode ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            {action.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className={`
                p-4 rounded-lg border
                ${darkMode
                  ? 'bg-blue-900/20 border-blue-800 text-blue-300'
                  : 'bg-blue-50 border-blue-200 text-blue-800'
                }
              `}>
                <div className="flex items-start gap-2">
                  <Zap className="w-4 h-4 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium mb-1">💡 Conseil</p>
                    <p>L'IA va analyser votre contenu et proposer une version améliorée que vous pourrez prévisualiser avant d'appliquer.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Étape 2: Chargement */}
          {selectedAction && loading && (
            <div className="text-center py-12">
              <Loader2 className={`w-12 h-12 mx-auto mb-4 animate-spin ${
                darkMode ? 'text-purple-400' : 'text-purple-600'
              }`} />
              <p className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {ACTIONS.find(a => a.id === selectedAction)?.label} en cours...
              </p>
              <p className={`text-sm mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                L'IA analyse votre contenu
              </p>
            </div>
          )}

          {/* Étape 3: Erreur */}
          {selectedAction && error && !loading && (
            <div className="space-y-4">
              {error === 'EMPTY_CONTENT' ? (
                // Message spécial pour contenu vide
                <div className={`
                  p-4 rounded-lg border
                  ${darkMode
                    ? 'bg-orange-900/20 border-orange-800 text-orange-300'
                    : 'bg-orange-50 border-orange-200 text-orange-800'
                  }
                `}>
                  <div className="flex items-start gap-2">
                    <X className="w-5 h-5 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium mb-2">Le contenu est vide</p>
                      <p className="text-sm mb-4">
                        Pour utiliser l'IA, vous devez avoir du contenu à améliorer. 
                        {title && title.trim() ? (
                          <> Nous pouvons générer automatiquement un contenu à partir de votre titre "<strong>{title}</strong>".</>
                        ) : (
                          <> Veuillez d'abord ajouter du contenu à votre note.</>
                        )}
                      </p>
                      {title && title.trim() && (
                        <div className="mt-4 p-3 rounded-lg bg-white/50 dark:bg-gray-800/50 border border-orange-300 dark:border-orange-700">
                          <p className="text-sm font-medium mb-2">✨ Option disponible :</p>
                          <Button
                            variant="primary"
                            onClick={handleGenerateFromTitle}
                            className="w-full gap-2"
                          >
                            <Sparkles className="w-4 h-4" />
                            Générer le contenu à partir du titre
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                // Erreur générique
                <div className={`
                  p-4 rounded-lg border
                  ${darkMode
                    ? 'bg-red-900/20 border-red-800 text-red-300'
                    : 'bg-red-50 border-red-200 text-red-800'
                  }
                `}>
                  <div className="flex items-start gap-2">
                    <X className="w-5 h-5 mt-0.5" />
                    <div>
                      <p className="font-medium">Erreur</p>
                      <p className="text-sm mt-1">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={handleCancel}>
                  Annuler
                </Button>
                {error !== 'EMPTY_CONTENT' && (
                  <Button variant="primary" onClick={handleRetry}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Réessayer
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Étape 4: Prévisualisation */}
          {selectedAction && improvedContent && !loading && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Contenu {ACTIONS.find(a => a.id === selectedAction)?.label.toLowerCase()}
                </span>
              </div>

              {/* Comparaison Avant/Après */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Avant */}
                <div className="space-y-2">
                  <label className={`text-sm font-medium ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Avant
                  </label>
                  <div className={`
                    p-4 rounded-lg border max-h-96 overflow-y-auto text-sm
                    ${darkMode
                      ? 'bg-gray-800 border-gray-700 text-gray-300'
                      : 'bg-gray-50 border-gray-200 text-gray-700'
                    }
                  `}>
                    <pre className="whitespace-pre-wrap font-sans">{content}</pre>
                  </div>
                  <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {content.length} caractères
                  </p>
                </div>

                {/* Après */}
                <div className="space-y-2">
                  <label className={`text-sm font-medium ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Après ({ACTIONS.find(a => a.id === selectedAction)?.label})
                  </label>
                  <div className={`
                    p-4 rounded-lg border max-h-96 overflow-y-auto text-sm
                    ${darkMode
                      ? 'bg-purple-900/20 border-purple-700 text-gray-200'
                      : 'bg-purple-50 border-purple-200 text-gray-800'
                    }
                  `}>
                    <pre className="whitespace-pre-wrap font-sans">{improvedContent}</pre>
                  </div>
                  <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {improvedContent.length} caractères ({improvedContent.length > content.length ? '+' : ''}{improvedContent.length - content.length})
                  </p>
                </div>
              </div>

              {/* Actions finales */}
              <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button
                  variant="ghost"
                  onClick={() => {
                    resetState();
                  }}
                  className="gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Essayer autre chose
                </Button>

                <div className="flex gap-3">
                  <Button variant="ghost" onClick={handleCancel}>
                    Annuler
                  </Button>
                  <Button variant="primary" onClick={handleApply} className="gap-2">
                    <Check className="w-4 h-4" />
                    Appliquer
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}

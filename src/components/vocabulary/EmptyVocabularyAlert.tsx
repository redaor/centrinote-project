/**
 * Composant d'alerte pour les champs de vocabulaire vides
 * Affiche une interface similaire à EmptyNoteAlert pour proposer la génération automatique
 */

import { useState } from 'react';
import { Sparkles, Edit, X, BookOpen } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface EmptyVocabularyAlertProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerateWithAI?: () => Promise<void>;
  hasAIAccess: boolean;
  darkMode?: boolean;
  emptyField: 'term' | 'definition'; // Quel champ est vide
  term?: string; // Terme actuel pour génération de définition
}

export function EmptyVocabularyAlert({
  isOpen,
  onClose,
  onGenerateWithAI,
  hasAIAccess,
  darkMode = false,
  emptyField,
  term = ''
}: EmptyVocabularyAlertProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!onGenerateWithAI) {
      return;
    }

    // Pour la définition, vérifier qu'on a un terme
    if (emptyField === 'definition' && !term?.trim()) {
      return;
    }

    setIsGenerating(true);
    try {
      await onGenerateWithAI();
      onClose();
    } catch (error) {
      console.error('Erreur lors de la génération:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const getTitle = () => {
    return emptyField === 'term' ? 'Mot vide' : 'Définition vide';
  };

  const getDescription = () => {
    if (emptyField === 'term') {
      return 'Le champ "mot" est vide. Vous devez saisir un mot pour continuer.';
    }
    return 'Le champ "définition" est vide. Vous pouvez saisir une définition manuellement ou utiliser l\'Aide IA si disponible.';
  };

  const getAIDescription = () => {
    if (emptyField === 'term') {
      return 'L\'Aide IA ne peut pas générer de mots à partir de rien. Veuillez saisir un mot manuellement.';
    }
    return hasAIAccess
      ? term && term.trim()
        ? "Je peux générer une définition à partir du mot que vous avez saisi."
        : "Ajoutez d'abord un mot pour que je puisse générer une définition."
      : "Cette fonctionnalité est disponible avec un plan supérieur.";
  };

  const canGenerateWithAI = emptyField === 'definition' && term && term.trim();

  if (isOpen) {
    console.log('🎨 [EmptyVocabularyAlert] Rendu avec isOpen=true:', {
      hasAIAccess,
      emptyField,
      term,
      canGenerateWithAI,
      onGenerateWithAI: !!onGenerateWithAI
    });
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Assistant IA - Vocabulaire"
      size="md"
    >
      <div className="p-6">
        <div className="space-y-6">
          {/* Section principale avec icône et message */}
          <div className="flex items-start gap-4">
            <div className={`
              p-3 rounded-full flex-shrink-0
              ${darkMode
                ? 'bg-amber-500/10'
                : 'bg-amber-50'
              }
            `}>
              <BookOpen className={`
                w-6 h-6
                ${darkMode ? 'text-amber-400' : 'text-amber-600'}
              `} />
            </div>

            <div className="flex-1">
              <h3 className={`
                text-lg font-semibold mb-2
                ${darkMode ? 'text-white' : 'text-gray-900'}
              `}>
                {getTitle()}
              </h3>

              <p className={`
                text-sm leading-relaxed mb-4
                ${darkMode ? 'text-gray-300' : 'text-gray-600'}
              `}>
                {getDescription()}
              </p>
            </div>
          </div>

          {/* Option Aide IA - Affichée seulement pour la définition */}
          {emptyField === 'definition' && (
            <div className={`
              p-4 rounded-lg border
              ${darkMode
                ? 'bg-gray-800/50 border-gray-700'
                : 'bg-gray-50 border-gray-200'
              }
              ${!hasAIAccess ? 'opacity-60' : ''}
            `}>
              <div className="flex items-start gap-3 mb-4">
                <div className={`
                  p-2 rounded-full flex-shrink-0
                  ${hasAIAccess
                    ? darkMode ? 'bg-purple-500/10' : 'bg-purple-50'
                    : darkMode ? 'bg-gray-700/50' : 'bg-gray-100'
                  }
                `}>
                  <Sparkles className={`
                    w-5 h-5
                    ${hasAIAccess
                      ? darkMode ? 'text-purple-400' : 'text-purple-600'
                      : darkMode ? 'text-gray-500' : 'text-gray-400'
                    }
                  `} strokeWidth={1.5} />
                </div>
                <div className="flex-1">
                  <p className={`font-medium mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    ✨ Aide IA
                  </p>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {getAIDescription()}
                  </p>
                  {!hasAIAccess && (
                    <p className={`text-xs mt-2 ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                      💎 Upgrade requis
                    </p>
                  )}
                </div>
              </div>

              {/* Bouton Générer */}
              {canGenerateWithAI ? (
                <Button
                  variant={hasAIAccess ? "primary" : "ghost"}
                  onClick={hasAIAccess ? handleGenerate : undefined}
                  disabled={!hasAIAccess || isGenerating}
                  loading={isGenerating}
                  className={`
                    w-full gap-2
                    ${!hasAIAccess
                      ? darkMode
                        ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed border border-gray-600'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-300'
                      : ''
                    }
                  `}
                  title={!hasAIAccess ? "Aide IA disponible avec un plan supérieur" : undefined}
                >
                  {!isGenerating && <Sparkles className={`w-4 h-4 ${!hasAIAccess ? 'opacity-50' : ''}`} />}
                  {isGenerating ? 'Génération...' : 'Générer la définition avec l\'IA'}
                </Button>
              ) : (
                <div className={`
                  text-sm p-3 rounded border
                  ${darkMode
                    ? 'bg-gray-700/30 border-gray-600 text-gray-400'
                    : 'bg-gray-100 border-gray-300 text-gray-500'
                  }
                `}>
                  Veuillez d'abord ajouter un mot pour utiliser l'Aide IA.
                </div>
              )}
            </div>
          )}

          {/* Option Saisie manuelle */}
          <div className={`
            p-4 rounded-lg border
            ${darkMode
              ? 'bg-gray-800/50 border-gray-700 text-gray-300'
              : 'bg-gray-50 border-gray-200 text-gray-700'
            }
          `}>
            <div className="flex items-start gap-3 mb-4">
              <Edit className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium mb-1">✍️ Saisie manuelle</p>
                <p className="text-sm">
                  {emptyField === 'term'
                    ? 'Veuillez saisir un mot dans le champ "Mot" pour continuer.'
                    : 'Commencez à taper dans le champ "Définition" pour ajouter votre texte.'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="ghost"
              onClick={onClose}
              className="gap-2"
            >
              <X className="w-4 h-4" />
              Fermer
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/**
 * Composant d'alerte pour les notes vides
 * Affiche une interface similaire à AIContentHelper pour proposer la génération automatique
 */

import { useState } from 'react';
import { Sparkles, Edit, X } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface EmptyNoteAlertProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerateWithAI?: () => Promise<void>;
  onCreateEmpty?: () => void; // Nouvelle prop pour créer la note sans contenu
  onManualEntry?: () => void; // Nouvelle prop pour fermer et focus le champ de contenu
  hasAIAccess: boolean;
  darkMode?: boolean;
  isEditing?: boolean;
  title?: string; // Titre de la note pour génération
}

export function EmptyNoteAlert({
  isOpen,
  onClose,
  onGenerateWithAI,
  onCreateEmpty,
  onManualEntry,
  hasAIAccess,
  darkMode = false,
  isEditing = false,
  title = ''
}: EmptyNoteAlertProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!onGenerateWithAI || !title?.trim()) {
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

  if (isOpen) {
    console.log('🎨 [EmptyNoteAlert] Rendu avec isOpen=true:', {
      hasAIAccess,
      title,
      titleTrimmed: title?.trim() || '',
      hasTitle: !!title?.trim(),
      onGenerateWithAI: !!onGenerateWithAI
    });
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Assistant IA - Note"
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
              <Edit className={`
                w-6 h-6
                ${darkMode ? 'text-amber-400' : 'text-amber-600'}
              `} />
            </div>
            
            <div className="flex-1">
              <h3 className={`
                text-lg font-semibold mb-2
                ${darkMode ? 'text-white' : 'text-gray-900'}
              `}>
                {isEditing ? 'Note vide' : 'Champ de contenu vide'}
              </h3>
              
              <p className={`
                text-sm leading-relaxed mb-4
                ${darkMode ? 'text-gray-300' : 'text-gray-600'}
              `}>
                Le champ de contenu est vide. Vous pouvez {isEditing ? 'modifier' : 'créer'} cette note manuellement ou utiliser l'Aide IA si disponible.
              </p>
            </div>
          </div>

          {/* Option Aide IA - Toujours visible */}
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
                  {hasAIAccess 
                    ? title && title.trim()
                      ? "Je peux rédiger le contenu à partir de votre titre."
                      : "Ajoutez un titre pour que je puisse générer le contenu."
                    : "Cette fonctionnalité est disponible avec un plan supérieur."
                  }
                </p>
                {!hasAIAccess && (
                  <p className={`text-xs mt-2 ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                    💎 Upgrade requis
                  </p>
                )}
              </div>
            </div>

            {/* Bouton Générer */}
            {title && title.trim() ? (
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
                {isGenerating ? 'Génération...' : 'Générer avec l\'IA'}
              </Button>
            ) : (
              <div className={`
                text-sm p-3 rounded border
                ${darkMode
                  ? 'bg-gray-700/30 border-gray-600 text-gray-400'
                  : 'bg-gray-100 border-gray-300 text-gray-500'
                }
              `}>
                Veuillez d'abord ajouter un titre à votre note pour utiliser l'Aide IA.
              </div>
            )}
          </div>

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
                  Commencez à taper dans le champ de contenu pour ajouter votre texte.
                </p>
              </div>
            </div>
            
            {/* Bouton Saisie manuelle */}
            <Button
              variant="primary"
              onClick={() => {
                if (onManualEntry) {
                  onManualEntry();
                }
                onClose();
              }}
              className="w-full gap-2"
            >
              <Edit className="w-4 h-4" />
              Saisie manuelle
            </Button>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="ghost"
              onClick={() => {
                if (onCreateEmpty) {
                  onCreateEmpty();
                }
                onClose();
              }}
              className="gap-2"
            >
              Saisir plus tard
            </Button>
            <Button
              variant="ghost"
              onClick={onClose}
              className="gap-2"
            >
              <X className="w-4 h-4" />
              Annuler
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}


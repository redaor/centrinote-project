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
  hasAIAccess: boolean;
  darkMode?: boolean;
  isEditing?: boolean;
  title?: string; // Titre de la note pour génération
}

export function EmptyNoteAlert({
  isOpen,
  onClose,
  onGenerateWithAI,
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
        {hasAIAccess ? (
          // Interface similaire à AIContentHelper pour contenu vide
          <div 
            className={`
              relative p-6 rounded-xl border
              ${darkMode
                ? 'bg-gray-800/50 border-gray-700'
                : 'bg-white border-gray-200'
              }
            `}
            style={{
              animation: 'fadeInScale 150ms ease-out',
            }}
          >
            <style>
              {`@keyframes fadeInScale {
                from { opacity: 0; transform: scale(0.95); }
                to { opacity: 1; transform: scale(1); }
              }`}
            </style>
            
            {/* Icône sparkles outline */}
            <div className="flex justify-center mb-4">
              <div className={`
                p-3 rounded-full
                ${darkMode
                  ? 'bg-purple-500/10'
                  : 'bg-purple-50'
                }
              `}>
                <Sparkles className={`
                  w-6 h-6
                  ${darkMode
                    ? 'text-purple-400'
                    : 'text-purple-600'
                  }
                `} strokeWidth={1.5} />
              </div>
            </div>

            {/* Titre */}
            <h3 className={`
              text-center text-lg font-semibold mb-2
              ${darkMode ? 'text-white' : 'text-gray-900'}
            `}>
              Aucun texte pour l'instant
            </h3>

            {/* Sous-titre */}
            <p className={`
              text-center text-sm mb-6
              ${darkMode ? 'text-gray-400' : 'text-gray-600'}
            `}>
              Je peux rédiger le contenu à partir de votre titre.
            </p>

            {/* Boutons */}
            {title && title.trim() ? (
              <div className="space-y-3">
                {/* Bouton principal "Générer" */}
                <Button
                  variant="primary"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  loading={isGenerating}
                  className="w-full md:max-w-xs md:mx-auto gap-2"
                >
                  {!isGenerating && <Sparkles className="w-4 h-4" />}
                  {isGenerating ? 'Génération...' : 'Générer'}
                </Button>

                {/* Bouton secondaire "Plus tard" */}
                <Button
                  variant="ghost"
                  onClick={onClose}
                  disabled={isGenerating}
                  className={`
                    w-full md:max-w-xs md:mx-auto
                    ${darkMode
                      ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }
                  `}
                >
                  Plus tard
                </Button>
              </div>
            ) : (
              <div className="text-center">
                <p className={`
                  text-sm mb-4
                  ${darkMode ? 'text-gray-400' : 'text-gray-600'}
                `}>
                  Veuillez d'abord ajouter un titre à votre note.
                </p>
                <Button
                  variant="ghost"
                  onClick={onClose}
                  className={`
                    ${darkMode
                      ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }
                  `}
                >
                  Fermer
                </Button>
              </div>
            )}
          </div>
        ) : (
          // Interface pour utilisateurs sans accès à l'Aide IA
          <div className="space-y-4">
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
                  Le champ de contenu est vide. Vous devez écrire du contenu manuellement pour {isEditing ? 'modifier' : 'créer'} cette note.
                </p>
                
                <div className={`
                  p-4 rounded-lg border
                  ${darkMode
                    ? 'bg-gray-800/50 border-gray-700 text-gray-300'
                    : 'bg-gray-50 border-gray-200 text-gray-700'
                  }
                `}>
                  <div className="flex items-start gap-3">
                    <Edit className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium mb-1">✍️ Saisie manuelle</p>
                      <p className="text-sm">
                        Commencez à taper dans le champ de contenu pour ajouter votre texte.
                      </p>
                    </div>
                  </div>
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
        )}
      </div>
    </Modal>
  );
}


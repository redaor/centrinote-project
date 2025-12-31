/**
 * Modal de confirmation pour les actions proposées par l'IA
 * Affiche un aperçu des modifications avant validation
 */

import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { CheckCircle, XCircle, AlertCircle, FileText, BookOpen } from 'lucide-react';
import type { AIAction } from '../../services/ai/actionParser';

interface AIActionConfirmModalProps {
  isOpen: boolean;
  action: AIAction | null;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function AIActionConfirmModal({
  isOpen,
  action,
  onConfirm,
  onCancel,
  isLoading = false,
}: AIActionConfirmModalProps) {
  if (!action) return null;

  const isVocabularyAction = action.type === 'update_vocabulary';
  const isNoteAction = action.type === 'update_note';
  const isConfirmationRequest = action.type === 'confirm_correction';

  // Modal pour la demande de confirmation (étape 1)
  if (isConfirmationRequest) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onCancel}
        title={
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-blue-500" />
            <span>Erreur détectée</span>
          </div>
        }
        size="md"
        closeOnBackdropClick={!isLoading}
      >
        <div className="p-6 space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              L'IA a détecté une erreur dans {action.data.word ? 'la définition du vocabulaire' : 'cette note'}.
            </p>
            {action.data.errorDescription && (
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-2">
                {action.data.errorDescription}
              </p>
            )}
          </div>

          {(action.data.word || action.originalData?.word) && (
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Mot concerné : <span className="font-semibold">{action.data.word || action.originalData?.word}</span>
              </p>
              <div className="p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Définition actuelle : {action.originalData?.definition?.substring(0, 200)}
                  {action.originalData?.definition && action.originalData.definition.length > 200 && '...'}
                </p>
              </div>
            </div>
          )}

          {(action.data.title || action.originalData?.title) && (
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Note concernée : <span className="font-semibold">{action.data.title || action.originalData?.title}</span>
              </p>
            </div>
          )}

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
              ⚠️ Que voulez-vous faire ?
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Si vous acceptez, l'IA proposera une correction que vous pourrez valider avant qu'elle ne soit appliquée.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <XCircle className="w-4 h-4" />
              Annuler
            </Button>
            <Button
              variant="default"
              onClick={onConfirm}
              disabled={isLoading}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  En cours...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Oui, proposer une correction
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  // Modal pour la confirmation finale (étape 3)
  const renderDiff = () => {
    if (isVocabularyAction && action.originalData && action.data) {
      // Détecter les différences pour mettre en évidence la correction
      const original = action.originalData.definition || '';
      const proposed = action.data.definition || '';
      const isFragment = /^(?:à|à la|la|définition de|dans ton vocabulaire|il y a|erreur|faute|tu as écrit|noté que|En effet)/i.test(proposed.trim());
      
      return (
        <div className="space-y-4">
          {/* Mot */}
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Mot: <span className="font-semibold">{action.data.word}</span>
            </h4>
            
            {/* Définition originale */}
            <div className="mb-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Définition actuelle (avec erreur) :
              </p>
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg">
                <p className="text-sm text-gray-700 dark:text-gray-300 line-through opacity-75">
                  {original}
                </p>
              </div>
            </div>

            {/* Définition proposée */}
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <span>Nouvelle définition corrigée :</span>
                {proposed.length > 500 && (
                  <span className="text-xs text-amber-600 dark:text-amber-400 font-normal">
                    ({proposed.length} caractères)
                  </span>
                )}
              </p>
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-700 rounded-lg max-h-64 overflow-y-auto">
                <p className="text-sm text-gray-900 dark:text-gray-100 font-medium whitespace-pre-wrap">
                  {proposed}
                </p>
              </div>
              
              {/* Avertissement si définition suspecte */}
              {proposed && (
                <>
                  {isFragment && (
                    <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/30 border-2 border-red-300 dark:border-red-700 rounded-lg">
                      <p className="text-sm font-medium text-red-800 dark:text-red-200 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        <span>⚠️ Cette définition semble être un fragment d'explication plutôt qu'une vraie définition.</span>
                      </p>
                      <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                        Veuillez vérifier que la définition complète est affichée avant de confirmer. Si ce n'est pas le cas, annulez et reformulez votre demande.
                      </p>
                    </div>
                  )}
                  {proposed.length < 20 && (
                    <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded text-xs text-amber-800 dark:text-amber-200">
                      ⚠️ Cette définition est très courte. Vérifiez qu'elle est complète.
                    </div>
                  )}
                  {proposed.length > 5000 && (
                    <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-xs text-blue-800 dark:text-blue-200">
                      ℹ️ Cette définition est très longue ({proposed.length} caractères). Assurez-vous qu'elle est complète.
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (isNoteAction && action.originalData && action.data) {
      return (
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Note: {action.data.title}
            </h4>
            
            {/* Contenu original */}
            <div className="mb-2">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Contenu actuel:</p>
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg max-h-40 overflow-y-auto">
                <p className="text-sm text-gray-700 dark:text-gray-300 line-through whitespace-pre-wrap">
                  {action.originalData.content?.substring(0, 500)}
                  {action.originalData.content && action.originalData.content.length > 500 && '...'}
                </p>
              </div>
            </div>

            {/* Contenu proposé */}
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Nouveau contenu proposé:</p>
              <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg max-h-40 overflow-y-auto">
                <p className="text-sm text-gray-900 dark:text-gray-100 font-medium whitespace-pre-wrap">
                  {action.data.content?.substring(0, 500)}
                  {action.data.content && action.data.content.length > 500 && '...'}
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-amber-500" />
          <span>Confirmation de modification</span>
        </div>
      }
      size="lg"
      closeOnBackdropClick={!isLoading}
    >
      <div className="p-6 space-y-6">
        {/* Avertissement important */}
        <div className="bg-red-50 dark:bg-red-900/30 border-2 border-red-300 dark:border-red-700 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800 dark:text-red-200 mb-1">
                ⚠️ Attention : Modification définitive
              </p>
              <p className="text-sm text-red-700 dark:text-red-300">
                Les modifications vont être appliquées immédiatement. Les informations existantes seront <strong>supprimées et remplacées</strong> par la nouvelle version. Cette action ne peut pas être annulée facilement.
              </p>
            </div>
          </div>
        </div>

        {/* Message d'explication */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {action.reason || "L'IA propose de modifier cet élément. Veuillez vérifier les changements ci-dessous avant de confirmer."}
          </p>
        </div>

        {/* Diff */}
        {renderDiff()}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <XCircle className="w-4 h-4" />
            Annuler
          </Button>
          <Button
            variant="default"
            onClick={onConfirm}
            disabled={isLoading}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Confirmer la modification
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}


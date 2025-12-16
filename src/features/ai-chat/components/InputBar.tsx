/**
 * Composant: InputBar
 *
 * Barre de saisie pour envoyer des messages au chat IA avec:
 * - Champ de texte avec auto-complétion GhostText
 * - Bouton pièce jointe (upload fichier)
 * - Bouton reconnaissance vocale
 * - Bouton envoyer
 * - Affichage fichier sélectionné avec actions rapides
 * - Animations framer-motion
 *
 * Composant présentationnel pur (aucun état métier, aucun appel API).
 * Tous les événements sont gérés via callbacks.
 *
 * @example
 * <InputBar
 *   inputValue={message}
 *   onInputChange={setMessage}
 *   onSubmit={handleSend}
 *   onFileSelect={handleFileSelect}
 *   isLoading={false}
 *   isReady={true}
 *   darkMode={false}
 *   selectedFile={file}
 *   onRemoveFile={handleRemoveFile}
 *   onQuickAction={handleQuickAction}
 *   fileInputRef={fileInputRef}
 *   user={user}
 * />
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Send, Loader2, Paperclip } from 'lucide-react';
import { GhostTextArea } from '../../../features/ghost-text';
import { FileContextCard } from '../../../components/ai/FileContextCard';
import { VoiceRecognition } from '../../../components/ai/VoiceRecognition';

/**
 * User interface
 */
interface User {
  id: string;
  name?: string;
}

/**
 * Props du composant InputBar
 */
interface InputBarProps {
  /** Valeur actuelle du champ de texte */
  inputValue: string;
  /** Callback pour changement de valeur */
  onInputChange: (value: string) => void;
  /** Callback pour soumission du formulaire */
  onSubmit: (e: React.FormEvent) => void;
  /** Callback pour sélection de fichier */
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** État de chargement */
  isLoading: boolean;
  /** IA prête */
  isReady: boolean;
  /** Mode sombre activé */
  darkMode: boolean;
  /** Fichier sélectionné */
  selectedFile: File | null;
  /** Callback pour suppression de fichier */
  onRemoveFile: () => void;
  /** Callback pour actions rapides sur fichier */
  onQuickAction: (action: 'summary' | 'extract' | 'ask') => void;
  /** Ref pour l'input file caché */
  fileInputRef: React.RefObject<HTMLInputElement>;
  /** Utilisateur courant */
  user: User | null;
}

/**
 * Composant InputBar
 */
export function InputBar({
  inputValue,
  onInputChange,
  onSubmit,
  onFileSelect,
  isLoading,
  isReady,
  darkMode,
  selectedFile,
  onRemoveFile,
  onQuickAction,
  fileInputRef,
  user,
}: InputBarProps) {
  return (
    <motion.div
      className="flex-shrink-0 border-t border-slate-200/80 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl p-1.5"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 20, opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Affichage du fichier sélectionné */}
      {selectedFile && (
        <motion.div
          className="mb-3"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <FileContextCard
            fileName={selectedFile.name}
            fileSize={selectedFile.size}
            onRemove={onRemoveFile}
            onQuickAction={onQuickAction}
            isProcessing={isLoading}
            isActive={true}
          />
        </motion.div>
      )}

      <form onSubmit={onSubmit} className="relative">
        {/* Input file caché */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,.markdown,.pdf,.docx,.doc"
          className="hidden"
          onChange={onFileSelect}
        />

        {/* Zone de saisie séparée - Style Notion/Copilot */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 flex justify-center px-4">
          <div className="max-w-2xl w-full">
            <motion.div
              className="flex items-center gap-2 w-full bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 focus-within:border-blue-400 dark:focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-400/20 transition-all duration-200"
              whileFocus={{ scale: 1.005 }}
              style={{ padding: '0.5rem 0.75rem' }}
            >
              {/* Bouton Pièce jointe */}
              <motion.button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading || !isReady}
                className="p-1.5 rounded-lg bg-transparent text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                title="Joindre un fichier"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                aria-label="Joindre un fichier"
              >
                <Paperclip className="w-4 h-4" />
              </motion.button>

              {/* Zone de saisie avec ghost-text auto-completion */}
              <div className="flex-1 flex items-center gap-1.5 relative overflow-hidden">
                <GhostTextArea
                  id="rechercheIA"
                  value={inputValue}
                  onChange={onInputChange}
                  onKeyDown={(e) => {
                    // Entrée sans Shift = envoyer le message
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      onSubmit(e as any);
                    }
                    // Shift + Entrée = nouvelle ligne (comportement par défaut)
                  }}
                  placeholder={selectedFile ? "Posez une question sur ce document..." : "Tapez votre message..."}
                  className="flex-1 px-2 py-2.5 bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500 resize-none focus:outline-none text-xs leading-normal scrollbar-hide"
                  disabled={isLoading || !isReady}
                  rows={1}
                  style={{
                    minHeight: '40px',
                    maxHeight: '200px',
                    height: 'auto',
                    lineHeight: '1.4',
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'normal',
                    resize: 'none',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    width: '100%',
                    boxSizing: 'border-box',
                    direction: 'ltr',
                  }}
                  aria-label="Zone de saisie de message"
                  context="chat"
                  userId={user?.id}
                  enabled={false}
                  darkMode={darkMode}
                />
                {/* Bouton de reconnaissance vocale */}
                <VoiceRecognition inputId="rechercheIA" submitButtonId="notes" />
              </div>

              {/* Bouton Envoyer */}
              <motion.button
                id="notes"
                type="submit"
                disabled={isLoading || !isReady || !inputValue.trim()}
                className={`p-1.5 rounded-lg transition-all duration-200 flex items-center justify-center flex-shrink-0 ${
                  isLoading || !isReady || !inputValue.trim()
                    ? 'bg-slate-200 dark:bg-gray-700 text-slate-400 dark:text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-400 to-purple-400 text-white shadow-md shadow-blue-400/20 hover:shadow-lg hover:shadow-blue-400/30'
                }`}
                whileHover={!isLoading && isReady && inputValue.trim() ? { scale: 1.05 } : {}}
                whileTap={!isLoading && isReady && inputValue.trim() ? { scale: 0.95 } : {}}
                aria-label="Envoyer le message"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </motion.button>
            </motion.div>
          </div>
        </div>
      </form>
    </motion.div>
  );
}

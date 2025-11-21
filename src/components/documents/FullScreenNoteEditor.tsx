import React, { useEffect, useRef, useState } from 'react';
import { X, Save, Pin, ChevronLeft, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '../ui/Button';
import type { Note } from '../../types/database';

interface FullScreenNoteEditorProps {
  isOpen: boolean;
  onClose: () => void;
  note: Note;
  formData: {
    title: string;
    content: string;
    tags: string;
  };
  onFormDataChange: (field: 'title' | 'content' | 'tags', value: string) => void;
  onSave: () => void;
  onPin?: () => void;
  onNavigate?: (direction: 'prev' | 'next') => void;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  showNavigationButtons?: boolean;
}

export function FullScreenNoteEditor({
  isOpen,
  onClose,
  note,
  formData,
  onFormDataChange,
  onSave,
  onPin,
  onNavigate,
  hasUnsavedChanges,
  isSaving,
  showNavigationButtons = false
}: FullScreenNoteEditorProps) {
  const [focusMode, setFocusMode] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      const maxHeight = window.innerHeight * 0.7; // Max 70% de la hauteur de l'écran
      textarea.style.height = Math.min(scrollHeight, maxHeight) + 'px';
    }
  };

  // Ajuster la hauteur à chaque changement de contenu
  useEffect(() => {
    adjustTextareaHeight();
  }, [formData.content]);

  // Ajuster la hauteur au redimensionnement de la fenêtre
  useEffect(() => {
    const handleResize = () => adjustTextareaHeight();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Focus automatique sur le titre à l'ouverture
  useEffect(() => {
    if (isOpen && titleRef.current) {
      setTimeout(() => titleRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Gestion des raccourcis clavier avancés
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      // Ctrl/Cmd + S : Sauvegarder
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        onSave();
        return;
      }

      // Escape : Fermer avec confirmation si changements
      if (e.key === 'Escape') {
        e.preventDefault();
        if (hasUnsavedChanges && !window.confirm('Modifications non sauvées. Fermer quand même ?')) {
          return;
        }
        onClose();
        return;
      }

      // Ctrl/Cmd + F : Toggle focus mode
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setFocusMode(prev => !prev);
        return;
      }

      // Ctrl/Cmd + P : Épingler
      if ((e.ctrlKey || e.metaKey) && e.key === 'p' && onPin) {
        e.preventDefault();
        onPin();
        return;
      }

      // Flèche gauche/droite : Navigation (seulement si pas focus sur input)
      if (onNavigate && !focusMode && 
          (e.target as HTMLElement).tagName !== 'INPUT' && 
          (e.target as HTMLElement).tagName !== 'TEXTAREA') {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          onNavigate('prev');
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          onNavigate('next');
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, hasUnsavedChanges, focusMode, onSave, onClose, onPin, onNavigate]);

  // Prévenir le scroll du body quand modal ouverte
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      if (hasUnsavedChanges && !window.confirm('Modifications non sauvées. Fermer quand même ?')) {
        return;
      }
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop avec blur effet */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-all duration-300 pointer-events-auto"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />
      
      {/* Modal Container - 90% de l'écran */}
      <div className={`
        relative w-[90vw] h-[90vh] max-w-7xl
        bg-white dark:bg-gray-900
        rounded-2xl shadow-2xl
        flex flex-col
        animate-in fade-in zoom-in-95 duration-300
        ${focusMode ? 'ring-4 ring-blue-500/50' : ''}
      `}>
        
        {/* Header - Always visible */}
        <div className={`
          flex-shrink-0 px-6 py-4 border-b border-gray-200 dark:border-gray-700
          flex items-center justify-between
          ${focusMode ? 'opacity-50 hover:opacity-100 transition-opacity' : ''}
        `}>
          {/* Navigation */}
          <div className="flex items-center space-x-2">
            {showNavigationButtons && onNavigate && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigate('prev')}
                  className="p-2"
                  title="Note précédente (←)"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigate('next')}
                  className="p-2"
                  title="Note suivante (→)"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-2" />
              </>
            )}
            
            {/* Actions principales */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFocusMode(!focusMode)}
              className="p-2"
              title={focusMode ? 'Quitter focus mode (Ctrl+F)' : 'Activer focus mode (Ctrl+F)'}
            >
              {focusMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
            
            {onPin && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onPin}
                className="p-2"
                title="Épingler/Désépingler (Ctrl+P)"
              >
                <Pin className={`w-4 h-4 ${note.is_pinned ? 'text-blue-500 fill-current' : ''}`} />
              </Button>
            )}
          </div>

          {/* Status et actions principales */}
          <div className="flex items-center space-x-3">
            {/* Status de sauvegarde */}
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {isSaving ? (
                <span className="text-blue-600 dark:text-blue-400 flex items-center">
                  <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2" />
                  Sauvegarde...
                </span>
              ) : hasUnsavedChanges ? (
                <span className="text-orange-600 dark:text-orange-400">● Non sauvegardé</span>
              ) : (
                <span className="text-green-600 dark:text-green-400">✓ Sauvegardé</span>
              )}
            </div>
            
            {/* Bouton sauvegarder */}
            <Button
              variant="primary"
              size="sm"
              onClick={onSave}
              loading={isSaving}
              disabled={!hasUnsavedChanges}
              className="px-4 py-2"
              title="Sauvegarder (Ctrl+S)"
            >
              <Save className="w-4 h-4 mr-2" />
              Sauvegarder
            </Button>
            
            {/* Fermer */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (hasUnsavedChanges && !window.confirm('Modifications non sauvées. Fermer quand même ?')) {
                  return;
                }
                onClose();
              }}
              className="p-2"
              title="Fermer (Escape)"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Contenu principal - Scrollable */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="max-w-4xl mx-auto space-y-6">
              
              {/* Titre - Notion style */}
              <div>
                <input
                  ref={titleRef}
                  type="text"
                  value={formData.title}
                  onChange={(e) => onFormDataChange('title', e.target.value)}
                  className={`
                    w-full px-0 py-2 text-4xl font-bold bg-transparent border-0 
                    focus:outline-none text-gray-900 dark:text-white
                    placeholder-gray-400 dark:placeholder-gray-600
                    ${focusMode ? 'text-5xl' : ''}
                    transition-all duration-200
                  `}
                  placeholder="Titre de votre note..."
                  style={{ 
                    fontFamily: '"Inter", "SF Pro Display", system-ui, sans-serif',
                    lineHeight: '1.2'
                  }}
                />
              </div>

              {/* Tags - Inline style */}
              {!focusMode && (
                <div className="border-l-4 border-gray-200 dark:border-gray-700 pl-4">
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Tags
                  </label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => onFormDataChange('tags', e.target.value)}
                    className="w-full px-0 py-1 bg-transparent border-0 focus:outline-none text-gray-700 dark:text-gray-300 placeholder-gray-400"
                    placeholder="important, projet, idée..."
                  />
                </div>
              )}

              {/* Contenu - Auto-resize avec scroll naturel */}
              <div className="pt-4">
                <textarea
                  ref={textareaRef}
                  value={formData.content}
                  onChange={(e) => {
                    onFormDataChange('content', e.target.value);
                    adjustTextareaHeight();
                  }}
                  className={`
                    w-full px-0 py-3 bg-transparent border-0 resize-none
                    focus:outline-none text-gray-900 dark:text-white
                    placeholder-gray-400 dark:placeholder-gray-600
                    ${focusMode ? 'text-lg leading-8' : 'text-base leading-7'}
                    transition-all duration-200
                  `}
                  placeholder="Commencez à écrire votre note..."
                  style={{ 
                    fontFamily: '"Inter", "SF Pro Text", system-ui, sans-serif',
                    minHeight: '300px'
                  }}
                />
                
                {/* Compteur de caractères - Affiché seulement si pas en focus mode */}
                {!focusMode && (
                  <div className="mt-4 text-xs text-gray-400 dark:text-gray-600 text-center">
                    {formData.content.length} caractères
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Footer avec raccourcis - Masqué en focus mode */}
          {!focusMode && (
            <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                    <span>Ctrl+S pour sauvegarder</span>
                    <span>•</span>
                    <span>Ctrl+F pour focus mode</span>
                    <span>•</span>
                    <span>Échap pour fermer</span>
                    {onPin && (
                      <>
                        <span>•</span>
                        <span>Ctrl+P pour épingler</span>
                      </>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {/* Status */}
                    <div className="text-xs">
                      {isSaving ? (
                        <span className="text-blue-600 dark:text-blue-400 flex items-center">
                          <div className="w-2 h-2 border border-blue-600 border-t-transparent rounded-full animate-spin mr-1" />
                          Sauvegarde...
                        </span>
                      ) : hasUnsavedChanges ? (
                        <span className="text-orange-600 dark:text-orange-400">● Non sauvegardé</span>
                      ) : (
                        <span className="text-green-600 dark:text-green-400">✓ Sauvegardé</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
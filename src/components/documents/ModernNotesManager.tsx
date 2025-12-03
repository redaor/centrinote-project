import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Search,
  Plus,
  Grid,
  List,
  Tag as TagIcon,
  Pin,
  PinOff,
  Edit,
  Trash2,
  MoreVertical,
  X,
  Save,
  Clock,
  Filter,
  StickyNote,
  Paperclip,
  Eye,
  Star,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Calendar,
  FileText,
  Bookmark,
  TrendingUp,
  Download,
  Copy,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Info,
  Archive,
  ArrowUpDown,
  Zap,
  Target,
  Layers,
  BookOpen,
  Users,
  CheckSquare,
  GraduationCap,
  Lightbulb,
  Bold,
  Italic,
  Code,
  List,
  Star,
  type LucideIcon
} from 'lucide-react';
import { useNotes } from '../../hooks/useNotes';
import { useApp } from '../../contexts/AppContext';
import { Note, Tag } from '../../types';
import { Card, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { LoadingSpinner, ProgressBar } from '../ui/LoadingStates';
import { DatabaseErrorMessage } from '../common/DatabaseErrorMessage';
import { AIContentHelper } from '../ai/AIContentHelper';
import { LongRecButton } from './LongRecButton';

interface FilterChip {
  id: string;
  label: string;
  count: number;
  active: boolean;
}

interface NoteCategoryMeta {
  label: string;
  icon: LucideIcon;
  badgeClass: string;
  textClass: string;
}

const CATEGORY_MATCHERS: Array<NoteCategoryMeta & { keywords: string[] }> = [
  {
    keywords: ['vocab', 'lexique', 'glossaire'],
    label: 'Vocabulaire',
    icon: BookOpen,
    badgeClass: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200',
    textClass: 'text-indigo-700 dark:text-indigo-200'
  },
  {
    keywords: ['réunion', 'meeting', 'compte rendu', 'daily'],
    label: 'Réunion',
    icon: Users,
    badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200',
    textClass: 'text-blue-600 dark:text-blue-200'
  },
  {
    keywords: ['tâche', 'todo', 'action', 'plan'],
    label: 'Action',
    icon: CheckSquare,
    badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
    textClass: 'text-emerald-600 dark:text-emerald-200'
  },
  {
    keywords: ['cours', 'lesson', 'formation', 'apprentissage', 'chapitre'],
    label: 'Cours',
    icon: GraduationCap,
    badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
    textClass: 'text-amber-600 dark:text-amber-200'
  },
  {
    keywords: ['idée', 'brainstorm', 'innovation', 'concept'],
    label: 'Idée',
    icon: Lightbulb,
    badgeClass: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-200',
    textClass: 'text-purple-600 dark:text-purple-200'
  }
];

const DEFAULT_CATEGORY_META: NoteCategoryMeta = {
  label: 'Note',
  icon: StickyNote,
  badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800/40 dark:text-slate-200',
  textClass: 'text-slate-600 dark:text-slate-200'
};

function getNoteCategoryMeta(note: Note): NoteCategoryMeta {
  const haystack = [
    note.title,
    note.content ?? '',
    ...(note.tags?.map(tag => tag.name) ?? [])
  ]
    .join(' ')
    .toLowerCase();

  const found = CATEGORY_MATCHERS.find(category =>
    category.keywords.some(keyword => haystack.includes(keyword))
  );

  if (found) {
    const { keywords: _keywords, ...meta } = found;
    return meta;
  }

  return DEFAULT_CATEGORY_META;
}

export function ModernNotesManager() {
  const { state } = useApp();
  const { darkMode, user } = state;
  
  const { 
    notes, 
    tags, 
    loading, 
    error, 
    addNote, 
    updateNote, 
    deleteNote, 
    togglePinNote,
    searchNotes,
    filterNotesByTag
  } = useNotes();

  // États UI modernes
  const [viewMode, setViewMode] = useState<'masonry' | 'grid' | 'list'>('masonry');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'recent' | 'title' | 'pinned'>('recent');
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([]);
  const [quickFilter, setQuickFilter] = useState<'all' | 'pinned' | 'recent'>('all');
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

  // États de sélection / édition
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // États de sauvegarde critiques
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const emptyFormState = {
    title: '',
    content: '',
    tags: ''
  };

  const [originalFormData, setOriginalFormData] = useState(emptyFormState);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Form data
  const [formData, setFormData] = useState(emptyFormState);
  const [showNoteMenu, setShowNoteMenu] = useState<string | null>(null);
  const [showAIMenu, setShowAIMenu] = useState(false);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);

  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();
  
  // FIX: Clé localStorage pour sauvegarder le contenu en cours d'édition
  const DRAFT_STORAGE_KEY = 'centrinote-note-draft';
  const DRAFT_TIMESTAMP_KEY = 'centrinote-note-draft-timestamp';
  
  // FIX: Ref pour éviter les boucles infinies entre sauvegarde et restauration
  const isRestoringRef = useRef(false);

  // FIX: Sauvegarder automatiquement le contenu dans localStorage
  useEffect(() => {
    // Ne pas sauvegarder si on est en train de restaurer
    if (isRestoringRef.current) {
      return;
    }
    
    // Sauvegarder uniquement si on est en mode édition ou création avec du contenu
    if ((isEditing || showAddModal) && (formData.title.trim() || formData.content.trim())) {
      const draft = {
        title: formData.title,
        content: formData.content,
        tags: formData.tags,
        noteId: selectedNote?.id || 'new',
        timestamp: Date.now()
      };
      try {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
        localStorage.setItem(DRAFT_TIMESTAMP_KEY, String(Date.now()));
      } catch (err) {
        console.warn('⚠️ Impossible de sauvegarder le brouillon:', err);
      }
    } else {
      // Nettoyer le localStorage si on n'est plus en mode édition/création
      try {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
        localStorage.removeItem(DRAFT_TIMESTAMP_KEY);
      } catch (err) {
        console.warn('⚠️ Impossible de nettoyer le brouillon:', err);
      }
    }
  }, [formData, isEditing, showAddModal, selectedNote?.id]);

  // FIX: Restaurer le contenu au retour sur la page (détection de visibilité)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Page redevenue visible : vérifier s'il y a un brouillon à restaurer
        try {
          const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
          const savedTimestamp = localStorage.getItem(DRAFT_TIMESTAMP_KEY);
          
          if (savedDraft && savedTimestamp) {
            const draft = JSON.parse(savedDraft);
            const draftAge = Date.now() - parseInt(savedTimestamp, 10);
            
            // Restaurer uniquement si le brouillon a moins de 1 heure
            if (draftAge < 3600000) {
              // Vérifier si on est toujours sur la même note ou en création
              const isSameNote = (selectedNote?.id === draft.noteId) || 
                                 (draft.noteId === 'new' && showAddModal);
              
              if (isSameNote && (draft.title.trim() || draft.content.trim())) {
                // Restaurer uniquement si le contenu actuel est vide ou différent
                const currentHasContent = formData.title.trim() || formData.content.trim();
                if (!currentHasContent || draft.content.length > formData.content.length) {
                  console.log('💾 Restauration du brouillon sauvegardé');
                  // FIX: Marquer qu'on est en train de restaurer pour éviter la boucle
                  isRestoringRef.current = true;
                  setFormData({
                    title: draft.title || '',
                    content: draft.content || '',
                    tags: draft.tags || ''
                  });
                  setHasUnsavedChanges(true);
                  // Réinitialiser le flag après un court délai
                  setTimeout(() => {
                    isRestoringRef.current = false;
                  }, 100);
                }
              }
            } else {
              // Brouillon trop ancien, le supprimer
              localStorage.removeItem(DRAFT_STORAGE_KEY);
              localStorage.removeItem(DRAFT_TIMESTAMP_KEY);
            }
          }
        } catch (err) {
          console.warn('⚠️ Erreur lors de la restauration du brouillon:', err);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Vérifier aussi au montage du composant
    if (document.visibilityState === 'visible') {
      handleVisibilityChange();
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [selectedNote?.id, showAddModal, formData]);

  // Filtrer et trier les notes (optimisé avec useMemo pour éviter les re-calculs)
  useEffect(() => {
    let processedNotes = [...notes];

    if (selectedTagId) {
      processedNotes = processedNotes.filter(note =>
        note.tags?.some(tag => tag.id === selectedTagId)
      );
    }

    if (quickFilter === 'pinned') {
      processedNotes = processedNotes.filter(note => note.is_pinned);
    } else if (quickFilter === 'recent') {
      processedNotes = processedNotes.filter(note => {
        const updatedAt = new Date(note.updated_at);
        const diffDays = (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays <= 7;
      });
    }

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      processedNotes = processedNotes.filter(note =>
        note.title.toLowerCase().includes(searchLower) ||
        note.content?.toLowerCase().includes(searchLower) ||
        note.tags?.some(tag => tag.name.toLowerCase().includes(searchLower))
      );
    }

    // Tri
    processedNotes.sort((a, b) => {
      if (sortBy === 'pinned') {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
      }
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      // Par défaut : récent
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

    setFilteredNotes(processedNotes);
  }, [notes, searchTerm, selectedTagId, sortBy, quickFilter]);

  const handleSelectNote = useCallback((note: Note, options: { edit?: boolean } = {}) => {
    console.log('🖱️ Sélection de la note:', note.id, note.title);
    setSelectedNote(note);
    setActiveNoteId(note.id);

    const initialFormData = {
      title: note.title,
      content: note.content || '',
      tags: note.tags ? note.tags.map(tag => tag.name).join(', ') : ''
    };

    setFormData(initialFormData);
    setOriginalFormData(initialFormData);
    setHasUnsavedChanges(false);
    setIsEditing(!!options.edit);
  }, []);

  const closeNoteDetail = useCallback(() => {
    setSelectedNote(null);
    setActiveNoteId(null);
    setIsEditing(false);
    setHasUnsavedChanges(false);
    setFormData({ ...emptyFormState });
    setOriginalFormData({ ...emptyFormState });
  }, []);

  const handleBackToList = useCallback(() => {
    if (isEditing) {
      if (hasUnsavedChanges && !window.confirm('Modifications non sauvegardées. Annuler les changements ?')) {
        return;
      }
      if (hasUnsavedChanges) {
        setMessage({ type: 'info', text: 'Modifications annulées' });
      }
    }
    closeNoteDetail();
  }, [isEditing, hasUnsavedChanges, closeNoteDetail, setMessage]);

  useEffect(() => {
    if (!selectedNote) {
      return;
    }

    if (!filteredNotes.some(note => note.id === selectedNote.id)) {
      setSelectedNote(null);
      setActiveNoteId(null);
      setIsEditing(false);
      setHasUnsavedChanges(false);
      setFormData({ ...emptyFormState });
      setOriginalFormData({ ...emptyFormState });
    }
  }, [filteredNotes, selectedNote]);

  // Gestion CRUD
  const handleAddNote = async () => {
    if (!formData.title.trim()) {
      setMessage({ type: 'error', text: 'Le titre est obligatoire' });
      return;
    }

    try {
      const tagArray = formData.tags
        ? formData.tags.split(',').map(tag => tag.trim())
        : [];

      const newNote = await addNote(
        formData.title.trim(),
        formData.content.trim(),
        tagArray
      );

      if (newNote) {
        setMessage({ type: 'success', text: 'Note ajoutée avec succès' });
        setShowAddModal(false);
        resetForm();
        // FIX: Nettoyer le brouillon après sauvegarde réussie
        try {
          localStorage.removeItem(DRAFT_STORAGE_KEY);
          localStorage.removeItem(DRAFT_TIMESTAMP_KEY);
        } catch (err) {
          console.warn('⚠️ Impossible de nettoyer le brouillon:', err);
        }
        handleSelectNote(newNote);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur lors de l\'ajout de la note' });
    }
  };

  const renderDetailPanel = () => {
    if (!selectedNote) {
      return (
        <Card className="p-6 flex flex-col items-center justify-center text-center min-h-[320px]">
          <StickyNote className="w-10 h-10 text-blue-500 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Sélectionnez une note
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 max-w-sm">
            Cliquez sur une note pour la lire. Double-cliquez ou utilisez le bouton « Modifier » pour passer en édition.
          </p>
        </Card>
      );
    }

    const tagList = selectedNote.tags ?? [];
    const createdAtLabel = selectedNote.created_at
      ? new Date(selectedNote.created_at).toLocaleDateString('fr-FR', { dateStyle: 'long' })
      : 'Date de création inconnue';
    const categoryMeta = getNoteCategoryMeta(selectedNote);
    const CategoryIcon = categoryMeta.icon;

    if (isEditing) {
      return (
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={handleBackToList}
              className="inline-flex items-center gap-2 text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour à la liste
            </Button>
          </div>

          <Card className="overflow-hidden shadow-xl border border-blue-200/60 dark:border-blue-900/40 bg-white/95 dark:bg-slate-900/70 backdrop-blur">
            <div className="sticky top-0 z-10 border-b border-blue-100/70 dark:border-blue-900/40 bg-blue-50/70 dark:bg-blue-950/40 px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-700 dark:text-blue-200">
                  <Edit className="w-3 h-3" />
                  Mode édition
                </span>
                <span className="text-xs text-blue-700/70 dark:text-blue-200/80">
                  {hasUnsavedChanges ? 'Modifications non enregistrées' : 'Aucun changement en attente'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {/* 2.2 Bouton Annuler (restore dernière version sauvegardée) */}
                <Button
                  variant="ghost"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="gap-2 focus-visible:ring-2 focus-visible:ring-blue-400"
                >
                  Annuler
                </Button>
                {/* 🎤 Bouton d'enregistrement audio long (mode édition) */}
                {selectedNote && (
                  <LongRecButton
                    noteId={selectedNote.id}
                    noteContent={formData.content || selectedNote.content || ''}
                    onContentAppend={(text) => {
                      const currentContent = formData.content || selectedNote.content || '';
                      const newContent = currentContent + text;
                      handleFormDataChange('content', newContent);
                      setHasUnsavedChanges(true);
                    }}
                    onCreateNewNote={() => {
                      handleBackToList();
                    }}
                    darkMode={darkMode}
                  />
                )}
                {/* 2.4 Désactiver Enregistrer si identique */}
                <Button
                  variant="primary"
                  onClick={handleUpdateNote}
                  disabled={isSaving || !hasUnsavedChanges || (
                    formData.title === originalFormData.title &&
                    formData.content === originalFormData.content &&
                    formData.tags === originalFormData.tags
                  )}
                  className="gap-2 focus-visible:ring-2 focus-visible:ring-blue-400"
                >
                  {isSaving ? 'Enregistrement…' : 'Enregistrer'}
                </Button>
              </div>
            </div>

            <div className="space-y-4 px-6 py-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Titre
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleFormDataChange('title', e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                placeholder="Titre de la note"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Contenu
              </label>
              {/* 2.1 Barre d'outils éditeur minimal */}
              <div className="flex items-center gap-1 p-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-t-xl border-b-0">
                <button
                  type="button"
                  onClick={() => {
                    const textarea = contentTextareaRef.current;
                    if (!textarea) return;
                    const start = textarea.selectionStart;
                    const end = textarea.selectionEnd;
                    const selectedText = formData.content.substring(start, end);
                    const newText = formData.content.substring(0, start) + `**${selectedText || 'texte'}**` + formData.content.substring(end);
                    handleFormDataChange('content', newText);
                    setTimeout(() => {
                      textarea.focus();
                      textarea.setSelectionRange(start + 2, start + 2 + (selectedText || 'texte').length);
                    }, 0);
                  }}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                  title="Gras"
                >
                  <Bold className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const textarea = contentTextareaRef.current;
                    if (!textarea) return;
                    const start = textarea.selectionStart;
                    const end = textarea.selectionEnd;
                    const selectedText = formData.content.substring(start, end);
                    const newText = formData.content.substring(0, start) + `*${selectedText || 'texte'}*` + formData.content.substring(end);
                    handleFormDataChange('content', newText);
                    setTimeout(() => {
                      textarea.focus();
                      textarea.setSelectionRange(start + 1, start + 1 + (selectedText || 'texte').length);
                    }, 0);
                  }}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                  title="Italique"
                >
                  <Italic className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const textarea = contentTextareaRef.current;
                    if (!textarea) return;
                    const start = textarea.selectionStart;
                    const end = textarea.selectionEnd;
                    const selectedText = formData.content.substring(start, end);
                    const newText = formData.content.substring(0, start) + `\`${selectedText || 'code'}\`` + formData.content.substring(end);
                    handleFormDataChange('content', newText);
                    setTimeout(() => {
                      textarea.focus();
                      textarea.setSelectionRange(start + 1, start + 1 + (selectedText || 'code').length);
                    }, 0);
                  }}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                  title="Code"
                >
                  <Code className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const textarea = contentTextareaRef.current;
                    if (!textarea) return;
                    const start = textarea.selectionStart;
                    const newText = formData.content.substring(0, start) + '\n- ' + formData.content.substring(start);
                    handleFormDataChange('content', newText);
                    setTimeout(() => {
                      textarea.focus();
                      textarea.setSelectionRange(start + 3, start + 3);
                    }, 0);
                  }}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                  title="Liste à puces"
                >
                  <List className="w-4 h-4" />
                </button>
                <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
                {/* 2.3 Aide IA dans barre d'outils - Utilise AIContentHelper directement */}
                <div className="relative inline-block">
                  <AIContentHelper
                    content={formData.content || ''}
                    title={formData.title || ''}
                    contentType="note"
                    onApply={async (improvedContent) => {
                      try {
                        handleFormDataChange('content', improvedContent);
                        setHasUnsavedChanges(true);
                        setMessage({ type: 'success', text: 'Contenu amélioré par l\'IA. N\'oubliez pas de sauvegarder.' });
                      } catch (error) {
                        console.error('❌ Erreur lors de l\'application du contenu amélioré:', error);
                        setMessage({ 
                          type: 'error', 
                          text: `Erreur: ${error instanceof Error ? error.message : 'Inconnue'}` 
                        });
                      }
                    }}
                    darkMode={darkMode}
                  />
                </div>
              </div>
              {/* 2.1 Textarea auto-grow (max-h-96) */}
              <textarea
                ref={contentTextareaRef}
                value={formData.content}
                onChange={(e) => {
                  handleFormDataChange('content', e.target.value);
                  // Auto-grow
                  const textarea = e.target;
                  textarea.style.height = 'auto';
                  textarea.style.height = `${Math.min(textarea.scrollHeight, 384)}px`; // max-h-96 = 384px
                }}
                rows={10}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-b-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white resize-none overflow-y-auto"
                style={{ maxHeight: '384px' }}
                placeholder="Développez vos idées…"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tags (séparés par des virgules)
              </label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => handleFormDataChange('tags', e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                placeholder="Ex. Projet, Priorité, Réunion…"
              />
            </div>
          </div>

          <div className="px-6 pb-6">
          <div className="rounded-xl bg-gray-100/70 dark:bg-gray-800/60 px-4 py-3 text-xs text-gray-600 dark:text-gray-400 flex flex-col gap-1">
            <span>Raccourcis : Cmd/Ctrl + S pour sauvegarder • Cmd/Ctrl + E pour quitter l’édition • Échap pour annuler</span>
          </div>
          </div>
          </Card>
        </div>
      );
    }

    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={handleBackToList}
            className="inline-flex items-center gap-2 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à la liste
          </Button>
        </div>

      <Card className="shadow-2xl border border-gray-200/80 dark:border-gray-800/60 bg-white/95 dark:bg-slate-900/70 backdrop-blur">
        <div className="bg-gradient-to-r from-slate-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/60 border-b border-gray-200/70 dark:border-gray-800/70 px-6 py-4 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${categoryMeta.badgeClass}`}>
                <CategoryIcon className="w-3.5 h-3.5" />
                {categoryMeta.label}
              </span>
              {selectedNote.is_pinned && (
                <span className="inline-flex items-center px-2 py-1 text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-300 rounded-full">
                  Épinglée
                </span>
              )}
              <span className="inline-flex items-center px-2 py-1 text-xs font-semibold bg-gray-200/70 dark:bg-gray-800/70 text-gray-600 dark:text-gray-300 rounded-full">
                Mis à jour {formatDate(selectedNote.updated_at)}
              </span>
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              {selectedNote.title}
            </h2>
            {/* 1.1 Aperçu 3 lignes sous le titre */}
            {selectedNote.content && (
              <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3" style={{ color: '#6b7280' }}>
                {selectedNote.content.split('\n').slice(0, 3).join('\n')}
              </p>
            )}
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Créée le {createdAtLabel}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 bg-gray-100/70 dark:bg-gray-800/50 px-4 py-2 rounded-xl shadow-inner">
            {/* 1.4 Icône Épingler seule (sans texte) */}
            <Button
              variant="ghost"
              onClick={() => handleTogglePin(selectedNote)}
              className="p-2 focus-visible:ring-2 focus-visible:ring-blue-400"
              title={selectedNote.is_pinned ? 'Désépingler' : 'Épingler'}
            >
              {selectedNote.is_pinned ? (
                <PinOff className="w-4 h-4" />
              ) : (
                <Pin className="w-4 h-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setIsEditing(true)}
              className="gap-2 focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              <Edit className="w-4 h-4" />
              Modifier
            </Button>
            {/* 🎤 Bouton d'enregistrement audio long */}
            {selectedNote && !isEditing && (
              <LongRecButton
                noteId={selectedNote.id}
                noteContent={formData.content || selectedNote.content || ''}
                onContentAppend={(text) => {
                  const currentContent = formData.content || selectedNote.content || '';
                  const newContent = currentContent + text;
                  handleFormDataChange('content', newContent);
                  setHasUnsavedChanges(true);
                }}
                onCreateNewNote={() => {
                  handleBackToList();
                }}
                darkMode={darkMode}
              />
            )}
            {/* 1.2 Badge auto-sauvegarde (remplace Aide IA) */}
            {hasUnsavedChanges ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-400 text-white">
                Modifications non sauvegardées
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-500 text-white">
                Auto-sauvegardé à {formatTime(selectedNote.updated_at)}
              </span>
            )}
            {/* 1.3 Menu ⋯ pour Supprimer */}
            <div className="relative">
              <Button
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowNoteMenu(showNoteMenu === selectedNote.id ? null : selectedNote.id);
                }}
                className="p-2 focus-visible:ring-2 focus-visible:ring-blue-400"
                title="Menu"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
              {showNoteMenu === selectedNote.id && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowNoteMenu(null)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowNoteMenu(null);
                        handleDeleteNote();
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 inline mr-2" />
                      Supprimer
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-6 space-y-6">
          {tagList.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tagList.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => {
                    setQuickFilter('all');
                    setSelectedTagId(tag.id);
                  }}
                  className="inline-flex items-center space-x-1 px-3 py-1 text-xs font-medium rounded-full transition-colors duration-200 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                >
                  <TagIcon className="w-3 h-3" />
                  <span>{tag.name}</span>
                </button>
              ))}
            </div>
          )}

          <div
            className="prose prose-sm sm:prose max-w-none text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed"
            onDoubleClick={() => setIsEditing(true)}
          >
            {selectedNote.content || 'Aucun contenu pour cette note.'}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>Dernière modification {formatDate(selectedNote.updated_at)}</span>
            </div>
            {selectedNote.has_attachment && (
              <div className="flex items-center gap-2">
                <Paperclip className="w-4 h-4" />
                <span>Pièces jointes disponibles</span>
              </div>
            )}
          </div>
        </div>
      </Card>
      </div>
    );
  };

  // Auto-save avec debounce
  const performAutoSave = async () => {
    if (!selectedNote || !hasUnsavedChanges || isSaving || !isEditing) return;

    console.log('🔄 Auto-save déclenché pour note:', selectedNote.id);
    setIsSaving(true);

    try {
      const tagArray = formData.tags
        ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean)
        : [];

      console.log('💾 Sauvegarde des données:', {
        title: formData.title.trim(),
        content: formData.content.trim(),
        tags: tagArray
      });

      const updatedNote = await updateNote(
        selectedNote.id,
        {
          title: formData.title.trim(),
          content: formData.content.trim()
        },
        tagArray
      );

      if (updatedNote) {
        setHasUnsavedChanges(false);
        setOriginalFormData({ ...formData });
        // Forcer la mise à jour de selectedNote avec la note fraîchement récupérée
        // pour s'assurer que updated_at est à jour
        setSelectedNote({ ...updatedNote });
        setActiveNoteId(updatedNote.id);
        setMessage({ type: 'success', text: 'Auto-sauvegarde effectuée' });
        console.log('✅ Auto-save réussi, updated_at:', updatedNote.updated_at);
      } else {
        throw new Error('Échec de la mise à jour');
      }
    } catch (error) {
      console.error('❌ Erreur auto-save:', error);
      setMessage({ type: 'error', text: 'Échec auto-sauvegarde' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateNote = useCallback(async () => {
    if (!selectedNote || !formData.title.trim()) {
      setMessage({ type: 'error', text: 'Le titre est obligatoire' });
      return;
    }

    console.log('💾 Sauvegarde manuelle déclenchée');
    setIsSaving(true);

    try {
      const tagArray = formData.tags
        ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean)
        : [];

      console.log('📝 Données à sauvegarder:', {
        noteId: selectedNote.id,
        title: formData.title.trim(),
        content: formData.content.trim(),
        tags: tagArray
      });

      const updatedNote = await updateNote(
        selectedNote.id,
        {
          title: formData.title.trim(),
          content: formData.content.trim()
        },
        tagArray
      );

      if (updatedNote) {
        console.log('✅ Sauvegarde manuelle réussie:', updatedNote);
        setMessage({ type: 'success', text: 'Note mise à jour avec succès' });
        setHasUnsavedChanges(false);
        setOriginalFormData({ ...formData });
        // FIX: Nettoyer le brouillon après sauvegarde réussie
        try {
          localStorage.removeItem(DRAFT_STORAGE_KEY);
          localStorage.removeItem(DRAFT_TIMESTAMP_KEY);
        } catch (err) {
          console.warn('⚠️ Impossible de nettoyer le brouillon:', err);
        }
        closeNoteDetail();
      } else {
        throw new Error('La fonction updateNote a retourné null');
      }
    } catch (error) {
      console.error('❌ Erreur sauvegarde manuelle:', error);
      setMessage({ 
        type: 'error', 
        text: `Erreur sauvegarde: ${error instanceof Error ? error.message : 'Inconnue'}` 
      });
    } finally {
      setIsSaving(false);
    }
  }, [selectedNote, formData, updateNote, setMessage, closeNoteDetail]);

  const handleCancelEdit = useCallback(() => {
    if (hasUnsavedChanges && !window.confirm('Modifications non sauvegardées. Annuler les changements ?')) {
      return;
    }
    setFormData({ ...originalFormData });
    setHasUnsavedChanges(false);
    setIsEditing(false);
    setMessage({ type: 'info', text: 'Modifications annulées' });
  }, [hasUnsavedChanges, originalFormData]);

  const handleDeleteNote = async () => {
    if (!selectedNote) return;
    setShowDeleteConfirm(true);
  };

  const confirmDeleteNote = async () => {
    if (!selectedNote) return;

    try {
      setConfirmingDelete(true);
      const success = await deleteNote(selectedNote.id);
      if (success) {
        setMessage({ type: 'success', text: 'Note supprimée avec succès' });
        closeNoteDetail();
      } else {
        setMessage({ type: 'error', text: 'Suppression annulée (note non trouvée)' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur lors de la suppression' });
    } finally {
      setConfirmingDelete(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleTogglePin = async (note: Note) => {
    try {
      const success = await togglePinNote(note.id, !note.is_pinned);
      if (success) {
        setMessage({ 
          type: 'success', 
          text: note.is_pinned ? 'Note désépinglée' : 'Note épinglée' 
        });
        if (selectedNote?.id === note.id) {
          const updated = { ...note, is_pinned: !note.is_pinned };
          setSelectedNote(updated);
          setActiveNoteId(note.id);
        }
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur lors de l\'épinglage' });
    }
  };

  // Détection des changements (avec memoization pour éviter les boucles)
  useEffect(() => {
    // Utiliser useMemo pour éviter les comparaisons inutiles
    const hasChanged = 
      formData.title !== originalFormData.title ||
      formData.content !== originalFormData.content ||
      formData.tags !== originalFormData.tags;
    
    setHasUnsavedChanges(hasChanged);
    
    // Log uniquement si vraiment nécessaire (éviter le spam)
    if (hasChanged || (formData.title || formData.content || formData.tags)) {
      // Log seulement en mode dev ou si des changements sont détectés
      if (process.env.NODE_ENV === 'development' && hasChanged) {
        console.log('🔍 Changements détectés:', hasChanged, {
          titleChanged: formData.title !== originalFormData.title,
          contentChanged: formData.content !== originalFormData.content,
          tagsChanged: formData.tags !== originalFormData.tags
        });
      }
    }
  }, [formData.title, formData.content, formData.tags, originalFormData.title, originalFormData.content, originalFormData.tags]);

  // Auto-save avec debounce (10 secondes après changement) - DÉSACTIVÉ pour éviter les problèmes de performance
  // L'utilisateur peut sauvegarder manuellement avec Ctrl/Cmd + S
  useEffect(() => {
    // DÉSACTIVÉ : L'auto-save causait des problèmes de performance
    // Si vous souhaitez le réactiver, décommentez le code ci-dessous et augmentez le délai à 10-15 secondes
    /*
    if (hasUnsavedChanges && selectedNote && isEditing) {
      // Annuler le timeout précédent
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      
      // Programmer la sauvegarde après 10 secondes d'inactivité
      autoSaveTimeoutRef.current = setTimeout(() => {
        console.log('⏰ Déclenchement auto-save après 10 secondes');
        performAutoSave();
      }, 10000); // Augmenté à 10 secondes pour réduire les appels
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
    */
  }, [hasUnsavedChanges, selectedNote, isEditing]);

  // Auto-hide des messages
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Gestion raccourcis clavier
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedNote) return;

      const isAccelKey = e.metaKey || e.ctrlKey;

      if (isAccelKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        console.log('⌨️ Raccourci Cmd/Ctrl+P déclenché');
        handleTogglePin(selectedNote);
        return;
      }

      if (isEditing) {
        if (isAccelKey && e.key.toLowerCase() === 's') {
          e.preventDefault();
          if (hasUnsavedChanges) {
            console.log('⌨️ Raccourci Cmd/Ctrl+S déclenché');
            handleUpdateNote();
          }
          return;
        }

        if (isAccelKey && e.key.toLowerCase() === 'e') {
          e.preventDefault();
          console.log('⌨️ Raccourci Cmd/Ctrl+E - bascule lecture');
          handleCancelEdit();
          return;
        }

        if (e.key === 'Escape') {
          e.preventDefault();
          handleCancelEdit();
        }
      } else if (isAccelKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        console.log('⌨️ Raccourci Cmd/Ctrl+E déclenché');
        setIsEditing(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedNote, isEditing, hasUnsavedChanges, handleTogglePin, handleUpdateNote, handleCancelEdit]);

  // Cleanup refs au démontage
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  // Handler pour les changements de form avec logging
  const handleFormDataChange = (field: 'title' | 'content' | 'tags', value: string) => {
    console.log(`📝 Changement ${field}:`, value.slice(0, 50) + (value.length > 50 ? '...' : ''));
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({ ...emptyFormState });
    setOriginalFormData({ ...emptyFormState });
    setHasUnsavedChanges(false);
  };

  // Format heure HH:mm
  const formatTime = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }, []);

  // Mémoïsation de la fonction formatDate pour éviter recréation
  const formatDate = useCallback((dateString: string) => {
    if (!dateString) return 'Date inconnue';
    
    const date = new Date(dateString);
    const now = new Date();
    
    // Vérifier si la date est valide
    if (isNaN(date.getTime())) {
      console.warn('Date invalide:', dateString);
      return 'Date invalide';
    }
    
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    // Aujourd'hui : afficher l'heure
    if (diffDays === 0) {
      if (diffMinutes < 1) return 'À l\'instant';
      if (diffMinutes < 60) return `Il y a ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
      if (diffHours < 1) return `Il y a ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
      return `Aujourd'hui à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // Hier : afficher "Hier à [heure]"
    if (diffDays === 1) {
      return `Hier à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // Cette semaine : afficher le jour et l'heure
    if (diffDays < 7) {
      return date.toLocaleDateString('fr-FR', { 
        weekday: 'long', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
    
    // Plus ancien : afficher la date complète
    return date.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  // Filtres intelligents (mémoïsés pour éviter recalcul)
  const filterChips: FilterChip[] = useMemo(() => [
    {
      id: 'all',
      label: 'Toutes',
      count: notes.length,
      active: quickFilter === 'all' && !selectedTagId
    },
    {
      id: 'pinned',
      label: 'Épinglées',
      count: notes.filter(n => n.is_pinned).length,
      active: quickFilter === 'pinned'
    },
    {
      id: 'recent',
      label: 'Récentes',
      count: notes.filter(n => {
        const daysDiff = (Date.now() - new Date(n.updated_at).getTime()) / (1000 * 60 * 60 * 24);
        return daysDiff <= 7;
      }).length,
      active: quickFilter === 'recent'
    }
  ], [notes, quickFilter, selectedTagId]);

  // Masonry layout calculation
  const getMasonryColumnClass = (index: number) => {
    const cols = 3;
    return `masonry-col-${index % cols}`;
  };

  // Note Card moderne avec interactions doubles (mémoïsé pour optimiser les performances)
  const ModernNoteCard = React.memo(({ note, index, isActive }: { note: Note; index: number; isActive: boolean }) => {
    const categoryMeta = getNoteCategoryMeta(note);
    const CategoryIcon = categoryMeta.icon;
    const rawContent = note.content?.trim() ?? '';
    const previewLimit = 180;
    const hasMoreContent = rawContent.length > previewLimit;
    const previewContent = hasMoreContent ? `${rawContent.slice(0, previewLimit).trim()}…` : rawContent;

    return (
      <div 
        className={`
          relative h-full cursor-pointer
          transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60
          ${isActive ? 'scale-[1.01] z-10' : 'hover:scale-[1.01]'}
        `}
        style={{ animationDelay: `${index * 50}ms` }}
        onClick={() => handleSelectNote(note)}
        onDoubleClick={() => handleSelectNote(note, { edit: true })}
        tabIndex={0}
        aria-selected={isActive}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleSelectNote(note);
          }
          if (event.key.toLowerCase() === 'e' && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            handleSelectNote(note, { edit: true });
          }
        }}
      >
        {/* Card principale */}
        <div 
          className={`
            h-full flex flex-col px-5 py-4 transition-all duration-150 ease-in-out relative overflow-hidden
            ${isActive 
              ? 'shadow-lg border-[#5B9DFF]/40 dark:border-[#5B9DFF]/40 bg-[#FAFBFC] dark:bg-gray-800' 
              : 'shadow-sm border-[#E5E9F2] dark:border-gray-700 bg-[#FAFBFC] dark:bg-gray-800'
            }
            ${note.is_pinned ? 'bg-gradient-to-br from-blue-50 via-[#FAFBFC] to-indigo-50 dark:from-blue-950/30 dark:via-gray-800 dark:to-indigo-950/30' : ''}
            hover:shadow-[0_2px_6px_rgba(0,0,0,0.05)] hover:-translate-y-0.5
          `}
          style={{ 
            borderRadius: '8px',
            borderWidth: '1px',
            borderStyle: 'solid'
          }}
        >
          {/* Header avec status indicators */}
          <div className="flex items-start justify-between mb-3 flex-shrink-0">
            <div className="flex flex-col space-y-2">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${categoryMeta.badgeClass}`}>
                <CategoryIcon className="w-3 h-3 stroke-[1px]" />
                {categoryMeta.label}
              </span>
              <div className="flex items-center space-x-2 text-xs" style={{ color: '#8492A6' }}>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 rounded-full bg-[#3DC07A] animate-pulse"></div>
                  <span>{formatDate(note.updated_at)}</span>
                </div>
                {note.is_pinned && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#5B9DFF]/10 text-[#5B9DFF] dark:text-[#5B9DFF]">
                    <Pin className="w-3 h-3 stroke-[1px]" />
                    Épinglée
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-1 flex-shrink-0">
              {note.is_pinned && (
                <button
                  type="button"
                  className="p-1.5 rounded-full border border-[#E5E9F2] bg-white/70 dark:bg-slate-900/70 dark:border-gray-700 text-[#5B9DFF] dark:text-[#5B9DFF]"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleTogglePin(note);
                  }}
                  aria-label="Basculer épingle"
                >
                  <Pin className="w-3 h-3 stroke-[1px]" />
                </button>
              )}
            </div>
          </div>

          {/* Titre */}
          <div className="mb-3 flex-shrink-0">
            <h3 className="text-sm font-medium line-clamp-2 dark:text-gray-100" style={{ color: '#1F2D3D' }}>
              {note.title}
            </h3>
          </div>

          {/* Tags chips colorés */}
          {note.tags && note.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3 flex-shrink-0">
              {note.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center space-x-1 px-2 py-1 text-xs font-medium rounded-full transition-all duration-200 cursor-pointer"
                  style={{ 
                    backgroundColor: '#5B9DFF15', 
                    color: '#5B9DFF',
                    border: '1px solid #5B9DFF30'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTagId(tag.id);
                    setQuickFilter('all');
                  }}
                >
                  <TagIcon className="w-3 h-3 stroke-[1px]" />
                  <span>{tag.name}</span>
                </span>
              ))}
              {note.tags.length > 3 && (
                <span className="text-xs px-2 py-1" style={{ color: '#8492A6' }}>
                  +{note.tags.length - 3} autres
                </span>
              )}
            </div>
          )}

          {/* Contenu avec flex-grow pour occuper l'espace disponible */}
          <div className="flex-grow flex flex-col space-y-3 mb-4 min-h-0">
            <p className="text-sm leading-relaxed line-clamp-3 dark:text-gray-300 flex-shrink-0" style={{ color: '#1F2D3D' }}>
              {previewContent || 'Aucun contenu pour cette note.'}
            </p>
            {hasMoreContent && (
              <button
                type="button"
                className="inline-flex items-center gap-1.5 text-xs font-medium hover:underline transition-all duration-150 flex-shrink-0"
                style={{ color: '#5B9DFF' }}
                onClick={(event) => {
                  event.stopPropagation();
                  handleSelectNote(note, { edit: false });
                }}
              >
                <span>Lire la suite</span>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="1px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>

          {/* Footer fixe en bas */}
          <div className="flex items-center justify-between text-xs dark:text-gray-400 flex-shrink-0 mt-auto" style={{ color: '#8492A6' }}>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1">
                <Clock className="w-3 h-3 stroke-[1px]" />
                <span>{formatDate(note.updated_at)}</span>
              </div>
              {note.has_attachment && (
                <div className="flex items-center space-x-1">
                  <Paperclip className="w-3 h-3 stroke-[1px]" />
                  <span>Fichiers</span>
                </div>
              )}
            </div>
            <span 
              className="text-[11px] px-2 py-0.5 rounded dark:bg-gray-700 dark:text-gray-300"
              style={{ 
                backgroundColor: '#F0F4F8',
                color: '#5A677D'
              }}
            >
              {note.content?.length || 0} caractères
            </span>
          </div>

          {/* Hover overlay effect */}
          {isActive && (
            <div className="absolute inset-0 bg-gradient-to-br from-[#5B9DFF]/5 to-[#5B9DFF]/5 rounded-lg pointer-events-none" style={{ borderRadius: '8px' }}></div>
          )}
        </div>
      </div>
    );
  }, (prevProps, nextProps) => {
    return prevProps.note.id === nextProps.note.id &&
           prevProps.note.title === nextProps.note.title &&
           prevProps.note.content === nextProps.note.content &&
           prevProps.note.is_pinned === nextProps.note.is_pinned &&
           prevProps.note.updated_at === nextProps.note.updated_at &&
           prevProps.isActive === nextProps.isActive;
  });


  // Grid Layout uniforme (remplace Masonry pour uniformiser les hauteurs)
  const UniformGrid = ({ children }: { children: React.ReactNode[] }) => (
    <div 
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 items-stretch"
      style={{ gap: '12px' }}
    >
      {children}
    </div>
  );

  const renderNotesCollection = () => {
    if (viewMode === 'masonry' || viewMode === 'grid') {
      return (
        <UniformGrid>
          {filteredNotes.map((note, index) => (
            <ModernNoteCard
              key={note.id}
              note={note}
              index={index}
              isActive={activeNoteId === note.id}
            />
          ))}
        </UniformGrid>
      );
    }

    return (
      <div className="space-y-4">
        {filteredNotes.map((note) => {
          const isActive = activeNoteId === note.id;
          const categoryMeta = getNoteCategoryMeta(note);
          const CategoryIcon = categoryMeta.icon;
          const rawContent = note.content?.trim() ?? '';
          const previewLimit = 160;
          const hasMoreContent = rawContent.length > previewLimit;
          const previewContent = hasMoreContent ? `${rawContent.slice(0, previewLimit).trim()}…` : rawContent;
          return (
            <Card 
              key={note.id}
              className={`
                p-4 cursor-pointer transition-all duration-200 border
                ${isActive ? 'border-blue-400/60 bg-blue-50/60 dark:bg-blue-950/20 shadow-lg' : 'border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-900'}
                ${note.is_pinned ? 'border-l-4 border-l-blue-500' : ''}
              `}
              onClick={() => handleSelectNote(note)}
              onDoubleClick={() => handleSelectNote(note, { edit: true })}
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  handleSelectNote(note);
                }
              }}
            >
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold ${categoryMeta.badgeClass}`}>
                    <CategoryIcon className="w-3 h-3" />
                    {categoryMeta.label}
                  </span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                      {note.title}
                    </h3>
                    <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                      {note.is_pinned && <Pin className="w-4 h-4 text-blue-500" />}
                      <span>{formatDate(note.updated_at)}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-3">
                    <p className="text-gray-700 dark:text-gray-300 text-sm line-clamp-3">
                      {previewContent || 'Aucun contenu pour cette note.'}
                    </p>
                    {hasMoreContent && (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-300 hover:underline"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleSelectNote(note);
                        }}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Lire la suite
                      </button>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    {note.tags && note.tags.length > 0 && (
                      <div className="flex space-x-1">
                        {note.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag.id}
                            className="inline-flex items-center px-2 py-1 text-xs rounded-full"
                            style={{ 
                              backgroundColor: `${tag.color}15`, 
                              color: tag.color
                            }}
                          >
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-2 text-gray-400">
                      <span className="text-xs">{note.content?.length || 0} chars</span>
                      {note.has_attachment && <Paperclip className="w-3 h-3" />}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-blue-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Messages Toast */}
        {message && (
          <div className={`
            fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2 max-w-md
            animate-in slide-in-from-right duration-300
            ${message.type === 'success'
              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border border-green-200 dark:border-green-800'
              : message.type === 'info'
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border border-red-200 dark:border-red-800'
            }
          `}>
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : message.type === 'info' ? (
              <Info className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span className="text-sm font-medium">{message.text}</span>
          </div>
        )}

        {/* Hero Header */}
        <div className="text-center mb-8">
          <div className="relative inline-block mb-6">
            <div
              className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur-lg opacity-20 animate-pulse pointer-events-none"
              aria-hidden="true"
            />
            <div className="relative p-4 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-full">
              <StickyNote className="w-12 h-12 text-white" />
            </div>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Notes Intelligentes
            </span>
          </h1>
          
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-6">
            Organisez, recherchez et collaborez sur vos idées
          </p>

          {/* Stats rapides */}
          <div className="flex justify-center space-x-8 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{notes.length}</div>
              <div className="text-gray-600 dark:text-gray-400">Notes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {notes.filter(n => n.is_pinned).length}
              </div>
              <div className="text-gray-600 dark:text-gray-400">Épinglées</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{tags.length}</div>
              <div className="text-gray-600 dark:text-gray-400">Tags</div>
            </div>
          </div>
        </div>

        {/* Header Actions et Filtres Avancés */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Recherche avancée */}
          <div className="lg:col-span-2">
            <Card className="p-4">
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Rechercher dans vos notes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-transparent border-0 focus:outline-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-lg"
                  />
                </div>
                
                {/* Filter chips */}
                <div className="flex flex-wrap gap-2">
                  {filterChips.map((chip) => (
                    <button
                      key={chip.id}
                      onClick={() => {
                        if (chip.id === 'all') {
                          setQuickFilter('all');
                          setSelectedTagId(null);
                        } else if (chip.id === 'pinned') {
                          setQuickFilter('pinned');
                        } else if (chip.id === 'recent') {
                          setQuickFilter('recent');
                        }
                      }}
                      className={`
                        inline-flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200
                        ${chip.active 
                          ? 'bg-blue-500 text-white shadow-lg scale-105' 
                          : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }
                      `}
                    >
                      <span>{chip.label}</span>
                      <span className={`
                        px-1.5 py-0.5 rounded-full text-xs
                        ${chip.active ? 'bg-white/20' : 'bg-gray-200 dark:bg-gray-600'}
                      `}>
                        {chip.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          {/* Actions et vues */}
          <Card className="p-4">
            <div className="space-y-4">
              <Button
                variant="primary"
                onClick={() => {
                  resetForm();
                  setShowAddModal(true);
                }}
                className="w-full flex items-center justify-center space-x-2 py-3"
              >
                <Plus className="w-5 h-5" />
                <span>Nouvelle Note</span>
              </Button>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Affichage
                </label>
                
                <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('masonry')}
                    className={`p-2 rounded transition-all duration-200 ${
                      viewMode === 'masonry'
                        ? 'bg-white dark:bg-gray-600 shadow-sm scale-105'
                        : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                    title="Vue Masonry"
                  >
                    <Layers className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded transition-all duration-200 ${
                      viewMode === 'grid'
                        ? 'bg-white dark:bg-gray-600 shadow-sm scale-105'
                        : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                    title="Vue Grille"
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded transition-all duration-200 ${
                      viewMode === 'list'
                        ? 'bg-white dark:bg-gray-600 shadow-sm scale-105'
                        : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                    title="Vue Liste"
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Trier par
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'recent' | 'title' | 'pinned')}
                  className="text-sm bg-gray-100 dark:bg-gray-800 border-0 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="recent">Récent</option>
                  <option value="title">Titre</option>
                  <option value="pinned">Épinglées</option>
                </select>
              </div>
            </div>
          </Card>
        </div>

        {/* Gestion des erreurs */}
        {error && !loading && (
          <Card className="mb-8 border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/20">
            <DatabaseErrorMessage 
              error={error} 
              onRetry={() => window.location.reload()}
              darkMode={darkMode}
            />
          </Card>
        )}

        {/* Contenu principal avec layouts intelligents */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <LoadingSpinner size="lg" text="Chargement de vos notes..." />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:columns-3 gap-6 mt-8 w-full max-w-4xl">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="p-6 animate-pulse">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ) : selectedNote ? (
          <div className="animate-in fade-in duration-500">
            {renderDetailPanel()}
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="text-center py-20">
            <div className="relative inline-block mb-8">
              <div className="absolute inset-0 bg-gradient-to-r from-gray-400 to-gray-500 rounded-full blur-lg opacity-20"></div>
              <div className="relative p-6 bg-gradient-to-br from-gray-500 to-gray-600 rounded-full">
                <StickyNote className="w-16 h-16 text-white" />
              </div>
            </div>
            
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              {searchTerm || selectedTagId ? 'Aucune note trouvée' : 'Vos premières notes vous attendent'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
              {searchTerm || selectedTagId 
                ? 'Essayez de modifier vos critères de recherche ou explorez d\'autres catégories'
                : 'Commencez votre parcours d\'apprentissage en créant votre première note'
              }
            </p>
            
            {!searchTerm && !selectedTagId && (
              <Button
                variant="primary"
                onClick={() => {
                  resetForm();
                  setShowAddModal(true);
                }}
                className="inline-flex items-center space-x-2 px-8 py-4 text-lg"
              >
                <Plus className="w-6 h-6" />
                <span>Créer ma première note</span>
              </Button>
            )}
          </div>
        ) : (
          <div className="animate-in fade-in duration-500">
            {renderNotesCollection()}
          </div>
        )}

        {/* Modal Ajout Note */}
        <Modal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="Créer une nouvelle note"
          size="lg"
        >
          <div className="p-6">
            <div className="space-y-6 pb-4">
              <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Titre *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleFormDataChange('title', e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                placeholder="Donnez un titre à votre note..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Contenu
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => handleFormDataChange('content', e.target.value)}
                rows={6}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white resize-none"
                placeholder="Développez vos idées..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tags (séparés par des virgules)
              </label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => handleFormDataChange('tags', e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                placeholder="ex: important, projet, idée"
              />
              </div>
            </div>

            {/* Footer fixe avec boutons */}
            <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-6 pt-4">
              <div className="flex items-center justify-between gap-3">
                {/* Actions principales : Enregistrer ce cours, Aide IA */}
                <div className="flex items-center gap-2">
                  {/* 🎤 Bouton d'enregistrement audio long (modal création) */}
                  <LongRecButton
                    noteId="new-note"
                    noteContent={formData.content}
                    onContentAppend={(text) => {
                      const newContent = formData.content + text;
                      handleFormDataChange('content', newContent);
                    }}
                    onCreateNewNote={() => {
                      // FIX: Vérifier s'il y a du contenu non sauvegardé avant de créer une nouvelle note
                      const hasUnsavedContent = formData.title.trim() || formData.content.trim();
                      
                      if (hasUnsavedContent) {
                        const confirmMessage = '⚠️ Vous avez du contenu non sauvegardé dans cette note.\n\nVoulez-vous vraiment créer une nouvelle note ? Le contenu actuel (titre, contenu, transcription) sera perdu.\n\nPour sauvegarder, cliquez sur "Créer la note" avant de créer une nouvelle note.';
                        if (!window.confirm(confirmMessage)) {
                          return; // L'utilisateur a annulé, on ne fait rien
                        }
                      }
                      
                      // Réinitialiser le formulaire et fermer la modal
                      resetForm();
                      setShowAddModal(false);
                    }}
                    darkMode={darkMode}
                  />
                </div>
                
                {/* Actions secondaires : Annuler, Créer */}
                <div className="flex space-x-3">
                  <Button
                    variant="ghost"
                    onClick={() => setShowAddModal(false)}
                  >
                    Annuler
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleAddNote}
                    loading={loading}
                  >
                    <Save className="w-5 h-5 mr-2" />
                    Créer la note
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Modal>

        <Modal
          isOpen={showDeleteConfirm}
          onClose={() => {
            if (!confirmingDelete) {
              setShowDeleteConfirm(false);
            }
          }}
          title="Confirmer la suppression"
          size="sm"
        >
          <div className="p-6 space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Cette note sera supprimée définitivement. Voulez-vous continuer ?
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={confirmingDelete}
              >
                Annuler
              </Button>
              <Button
                variant="danger"
                onClick={confirmDeleteNote}
                loading={confirmingDelete}
              >
                Supprimer
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}
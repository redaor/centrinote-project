import React, { useState, useEffect, useRef } from 'react';
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
  Calendar,
  FileText,
  Bookmark,
  TrendingUp,
  Download,
  Copy,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Archive,
  ArrowUpDown,
  Zap,
  Target,
  Layers
} from 'lucide-react';
import { useNotes } from '../../hooks/useNotes';
import { useApp } from '../../contexts/AppContext';
import { Note, Tag } from '../../types';
import { Card, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { LoadingSpinner, ProgressBar } from '../ui/LoadingStates';
import { DatabaseErrorMessage } from '../common/DatabaseErrorMessage';

interface FilterChip {
  id: string;
  label: string;
  count: number;
  active: boolean;
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
  const [hoveredNote, setHoveredNote] = useState<string | null>(null);
  const [previewNote, setPreviewNote] = useState<Note | null>(null);

  // Modals et états détaillés
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form data
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    tags: ''
  });

  const previewTimeoutRef = useRef<NodeJS.Timeout>();

  // Filtrer et trier les notes
  useEffect(() => {
    const processNotes = async () => {
      try {
        let processedNotes = [...notes];

        // Filtrage par recherche
        if (searchTerm) {
          const searchResults = await searchNotes(searchTerm);
          processedNotes = searchResults;
        } else if (selectedTagId) {
          const taggedNotes = await filterNotesByTag(selectedTagId);
          processedNotes = taggedNotes;
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
      } catch (error) {
        console.error('Erreur lors du traitement des notes:', error);
      }
    };

    processNotes();
  }, [notes, searchTerm, selectedTagId, sortBy, searchNotes, filterNotesByTag]);

  // Gestion preview hover
  const handleMouseEnter = (note: Note) => {
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }
    
    previewTimeoutRef.current = setTimeout(() => {
      setHoveredNote(note.id);
      setPreviewNote(note);
    }, 300); // 300ms delay pour éviter les previews accidentelles
  };

  const handleMouseLeave = () => {
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }
    setHoveredNote(null);
    setPreviewNote(null);
  };

  // Gestion clic complet - modal détaillée
  const handleOpenDetailModal = (note: Note) => {
    setSelectedNote(note);
    setFormData({
      title: note.title,
      content: note.content || '',
      tags: note.tags ? note.tags.map(tag => tag.name).join(', ') : ''
    });
    setShowDetailModal(true);
    setPreviewNote(null);
  };

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
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur lors de l\'ajout de la note' });
    }
  };

  const handleUpdateNote = async () => {
    if (!selectedNote || !formData.title.trim()) {
      setMessage({ type: 'error', text: 'Le titre est obligatoire' });
      return;
    }

    try {
      const tagArray = formData.tags
        ? formData.tags.split(',').map(tag => tag.trim())
        : [];

      const updatedNote = await updateNote(
        selectedNote.id,
        {
          title: formData.title.trim(),
          content: formData.content.trim()
        },
        tagArray
      );

      if (updatedNote) {
        setMessage({ type: 'success', text: 'Note mise à jour avec succès' });
        setShowDetailModal(false);
        setSelectedNote(null);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur lors de la mise à jour' });
    }
  };

  const handleDeleteNote = async () => {
    if (!selectedNote) return;

    try {
      const success = await deleteNote(selectedNote.id);
      if (success) {
        setMessage({ type: 'success', text: 'Note supprimée avec succès' });
        setShowDetailModal(false);
        setSelectedNote(null);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur lors de la suppression' });
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
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur lors de l\'épinglage' });
    }
  };

  const resetForm = () => {
    setFormData({ title: '', content: '', tags: '' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Aujourd\'hui';
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) return `Il y a ${diffDays} jours`;
    return date.toLocaleDateString();
  };

  // Filtres intelligents
  const filterChips: FilterChip[] = [
    { 
      id: 'all', 
      label: 'Toutes', 
      count: notes.length, 
      active: !selectedTagId 
    },
    { 
      id: 'pinned', 
      label: 'Épinglées', 
      count: notes.filter(n => n.is_pinned).length, 
      active: false 
    },
    { 
      id: 'recent', 
      label: 'Récentes', 
      count: notes.filter(n => {
        const daysDiff = (new Date().getTime() - new Date(n.updated_at).getTime()) / (1000 * 60 * 60 * 24);
        return daysDiff <= 7;
      }).length, 
      active: false 
    }
  ];

  // Masonry layout calculation
  const getMasonryColumnClass = (index: number) => {
    const cols = 3;
    return `masonry-col-${index % cols}`;
  };

  // Note Card moderne avec interactions doubles
  const ModernNoteCard = ({ note, index }: { note: Note; index: number }) => {
    const isHovered = hoveredNote === note.id;
    const contentPreview = note.content?.slice(0, 120) + (note.content && note.content.length > 120 ? '...' : '');
    
    // Calcul de la hauteur dynamique basée sur le contenu
    const cardHeight = note.content 
      ? Math.min(Math.max(200, note.content.length / 3), 350)
      : 200;

    return (
      <div 
        className={`
          relative mb-6 break-inside-avoid cursor-pointer
          transform transition-all duration-300 ease-out
          ${isHovered ? 'scale-[1.02] z-10' : 'hover:scale-[1.01]'}
        `}
        style={{ animationDelay: `${index * 50}ms` }}
        onMouseEnter={() => handleMouseEnter(note)}
        onMouseLeave={handleMouseLeave}
        onClick={() => handleOpenDetailModal(note)}
      >
        {/* Card principale */}
        <Card 
          className={`
            p-6 transition-all duration-300 relative overflow-hidden
            ${isHovered 
              ? 'shadow-2xl ring-2 ring-blue-500/50 border-blue-200 dark:border-blue-800' 
              : 'shadow-lg hover:shadow-xl border-gray-200 dark:border-gray-700'
            }
            ${note.is_pinned ? 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30' : ''}
          `}
          style={{ minHeight: `${cardHeight}px` }}
          hover={false}
        >
          {/* Header avec status indicators */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-2">
              {note.is_pinned && (
                <div className="p-1.5 bg-blue-500/20 rounded-full">
                  <Pin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
              )}
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formatDate(note.updated_at)}
                </span>
              </div>
            </div>
            
            {/* Menu actions - visible au hover */}
            <div className={`
              flex items-center space-x-1 transition-opacity duration-200
              ${isHovered ? 'opacity-100' : 'opacity-0'}
            `}>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleTogglePin(note);
                }}
                className="p-1.5"
              >
                {note.is_pinned ? 
                  <PinOff className="w-4 h-4" /> : 
                  <Pin className="w-4 h-4" />
                }
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  // Quick actions menu
                }}
                className="p-1.5"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Titre avec gradient border selon mastery */}
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-2 mb-2">
              {note.title}
            </h3>
            <div className={`
              h-1 w-full rounded-full bg-gradient-to-r
              ${note.is_pinned 
                ? 'from-blue-500 to-purple-500' 
                : 'from-gray-200 to-blue-200 dark:from-gray-700 dark:to-blue-700'
              }
            `}></div>
          </div>

          {/* Preview contenu avec fade effect */}
          <div className="relative mb-4">
            <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-4">
              {contentPreview}
            </p>
            {note.content && note.content.length > 120 && (
              <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white dark:from-gray-800 to-transparent"></div>
            )}
          </div>

          {/* Tags chips colorés */}
          {note.tags && note.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {note.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center space-x-1 px-2 py-1 text-xs font-medium rounded-full transition-all duration-200 hover:scale-105 cursor-pointer"
                  style={{ 
                    backgroundColor: `${tag.color}15`, 
                    color: tag.color,
                    border: `1px solid ${tag.color}30`
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTagId(tag.id);
                  }}
                >
                  <TagIcon className="w-3 h-3" />
                  <span>{tag.name}</span>
                </span>
              ))}
              {note.tags.length > 3 && (
                <span className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1">
                  +{note.tags.length - 3} autres
                </span>
              )}
            </div>
          )}

          {/* Footer métadonnées */}
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1">
                <FileText className="w-3 h-3" />
                <span>{note.content?.length || 0} caractères</span>
              </div>
              {note.has_attachment && (
                <div className="flex items-center space-x-1">
                  <Paperclip className="w-3 h-3" />
                  <span>Fichiers</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-1">
              <Eye className="w-3 h-3" />
              <span>Clic pour ouvrir</span>
            </div>
          </div>

          {/* Hover overlay effect */}
          <div className={`
            absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-lg
            transition-opacity duration-300 pointer-events-none
            ${isHovered ? 'opacity-100' : 'opacity-0'}
          `}></div>
        </Card>
      </div>
    );
  };

  // Preview Tooltip moderne
  const PreviewTooltip = () => {
    if (!previewNote || !hoveredNote) return null;

    return (
      <div className="fixed inset-0 pointer-events-none z-50">
        <div 
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
          style={{ maxWidth: '500px', width: '90vw' }}
        >
          <Card className="p-6 shadow-2xl border-2 border-blue-200 dark:border-blue-800 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {previewNote.title}
              </h3>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTogglePin(previewNote);
                  }}
                  className="p-1.5"
                >
                  {previewNote.is_pinned ? 
                    <PinOff className="w-4 h-4" /> : 
                    <Pin className="w-4 h-4" />
                  }
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleOpenDetailModal(previewNote)}
                  className="px-3 py-1.5"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Éditer
                </Button>
              </div>
            </div>
            
            <div className="max-h-60 overflow-y-auto mb-4">
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {previewNote.content}
              </p>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-4 text-gray-500 dark:text-gray-400">
                <span>{formatDate(previewNote.updated_at)}</span>
                <span>{previewNote.content?.length || 0} caractères</span>
                {previewNote.has_attachment && (
                  <div className="flex items-center space-x-1">
                    <Paperclip className="w-3 h-3" />
                    <span>Fichiers</span>
                  </div>
                )}
              </div>
              
              {previewNote.tags && previewNote.tags.length > 0 && (
                <div className="flex space-x-1">
                  {previewNote.tags.slice(0, 2).map((tag) => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center px-2 py-1 text-xs rounded-full"
                      style={{ 
                        backgroundColor: `${tag.color}20`, 
                        color: tag.color
                      }}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    );
  };

  // Masonry CSS Grid Layout
  const MasonryGrid = ({ children }: { children: React.ReactNode[] }) => (
    <div 
      className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-6"
      style={{ columnFill: 'balance' }}
    >
      {children}
    </div>
  );

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
              : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border border-red-200 dark:border-red-800'
            }
          `}>
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span className="text-sm font-medium">{message.text}</span>
          </div>
        )}

        {/* Hero Header */}
        <div className="text-center mb-8">
          <div className="relative inline-block mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur-lg opacity-20 animate-pulse"></div>
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
                        if (chip.id === 'all') setSelectedTagId(null);
                        else if (chip.id === 'pinned') {
                          setFilteredNotes(notes.filter(n => n.is_pinned));
                        }
                        else if (chip.id === 'recent') {
                          const recentNotes = notes.filter(n => {
                            const daysDiff = (new Date().getTime() - new Date(n.updated_at).getTime()) / (1000 * 60 * 60 * 24);
                            return daysDiff <= 7;
                          });
                          setFilteredNotes(recentNotes);
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
            {viewMode === 'masonry' ? (
              <MasonryGrid>
                {filteredNotes.map((note, index) => (
                  <ModernNoteCard key={note.id} note={note} index={index} />
                ))}
              </MasonryGrid>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredNotes.map((note, index) => (
                  <ModernNoteCard key={note.id} note={note} index={index} />
                ))}
              </div>
            ) : (
              <div className="space-y-4 max-w-4xl mx-auto">
                {filteredNotes.map((note, index) => (
                  <Card 
                    key={note.id}
                    className={`
                      p-4 cursor-pointer transition-all duration-300
                      ${hoveredNote === note.id ? 'scale-[1.01] shadow-xl ring-2 ring-blue-500/50' : 'hover:shadow-lg'}
                      ${note.is_pinned ? 'border-l-4 border-l-blue-500' : ''}
                    `}
                    onClick={() => handleOpenDetailModal(note)}
                    onMouseEnter={() => handleMouseEnter(note)}
                    onMouseLeave={handleMouseLeave}
                  >
                    <div className="flex items-start space-x-4">
                      <div className={`
                        flex-shrink-0 w-16 h-16 rounded-lg flex items-center justify-center
                        ${note.is_pinned 
                          ? 'bg-gradient-to-br from-blue-500 to-purple-500' 
                          : 'bg-gradient-to-br from-gray-400 to-gray-500'
                        }
                      `}>
                        <StickyNote className="w-8 h-8 text-white" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                            {note.title}
                          </h3>
                          <div className="flex items-center space-x-2">
                            {note.is_pinned && (
                              <Pin className="w-4 h-4 text-blue-500" />
                            )}
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatDate(note.updated_at)}
                            </span>
                          </div>
                        </div>
                        
                        <p className="text-gray-700 dark:text-gray-300 line-clamp-2 mb-3">
                          {note.content}
                        </p>
                        
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
                ))}
              </div>
            )}
          </div>
        )}

        {/* Preview Tooltip */}
        <PreviewTooltip />

        {/* Modal Ajout Note */}
        <Modal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="Créer une nouvelle note"
          size="lg"
        >
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Titre *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
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
                onChange={(e) => setFormData({...formData, content: e.target.value})}
                rows={8}
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
                onChange={(e) => setFormData({...formData, tags: e.target.value})}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                placeholder="ex: important, projet, idée"
              />
            </div>

            <div className="flex space-x-3 pt-4">
              <Button
                variant="ghost"
                onClick={() => setShowAddModal(false)}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button
                variant="primary"
                onClick={handleAddNote}
                className="flex-1"
                loading={loading}
              >
                <Save className="w-5 h-5 mr-2" />
                Créer la note
              </Button>
            </div>
          </div>
        </Modal>

        {/* Modal Détail/Édition Complète */}
        <Modal
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          title={selectedNote?.title || 'Note'}
          size="xl"
        >
          {selectedNote && (
            <div className="space-y-6">
              {/* Header avec actions */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`
                    p-2 rounded-lg 
                    ${selectedNote.is_pinned 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                    }
                  `}>
                    <StickyNote className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Créé le {formatDate(selectedNote.created_at)}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      Modifié le {formatDate(selectedNote.updated_at)}
                    </p>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleTogglePin(selectedNote)}
                  >
                    {selectedNote.is_pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="danger" 
                    size="sm"
                    onClick={() => handleDeleteNote()}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Édition du titre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Titre
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full px-4 py-3 text-xl font-semibold bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                />
              </div>

              {/* Édition du contenu */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Contenu
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                  rows={15}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white resize-none font-mono"
                  placeholder="Développez vos idées en détail..."
                />
                <div className="mt-2 flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                  <span>{formData.content.length} caractères</span>
                  <span>Markdown supporté</span>
                </div>
              </div>

              {/* Gestion des tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tags
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({...formData, tags: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                  placeholder="Organisez avec des tags..."
                />
                
                {selectedNote.tags && selectedNote.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {selectedNote.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-sm"
                        style={{ 
                          backgroundColor: `${tag.color}15`, 
                          color: tag.color,
                          border: `1px solid ${tag.color}30`
                        }}
                      >
                        <TagIcon className="w-3 h-3" />
                        <span>{tag.name}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions finales */}
              <div className="flex space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                <Button
                  variant="ghost"
                  onClick={() => setShowDetailModal(false)}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  variant="primary"
                  onClick={handleUpdateNote}
                  className="flex-1"
                  loading={loading}
                >
                  <Save className="w-5 h-5 mr-2" />
                  Enregistrer les modifications
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>

      {/* Auto-hide message */}
      {message && (
        setTimeout(() => setMessage(null), 4000)
      )}
    </div>
  );
}
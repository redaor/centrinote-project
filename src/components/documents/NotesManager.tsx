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
  Download,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useNotes } from '../../hooks/useNotes';
import { useApp } from '../../contexts/AppContext';
import { Note, Tag } from '../../types';
import { DatabaseErrorMessage } from '../common/DatabaseErrorMessage';

const NotesManager: React.FC = () => {
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

  // États UI
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  // Form data
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    tags: ''
  });

  // Refs
  const menuRef = useRef<HTMLDivElement>(null);

  // Filtrer les notes
  useEffect(() => {
    const filterNotes = async () => {
      try {
        if (selectedTagId) {
          const taggedNotes = await filterNotesByTag(selectedTagId);
          setFilteredNotes(taggedNotes);
        } else if (searchTerm) {
          const searchResults = await searchNotes(searchTerm);
          setFilteredNotes(searchResults);
        } else {
          setFilteredNotes(notes);
        }
      } catch (error) {
        console.error('Erreur lors du filtrage des notes:', error);
      }
    };

    filterNotes();
  }, [notes, searchTerm, selectedTagId, searchNotes, filterNotesByTag]);

  // Fermer le menu au clic à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Afficher un message temporaire
  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  // Gérer l'ajout d'une note
  const handleAddNote = async () => {
    if (!formData.title.trim()) {
      showMessage('error', 'Le titre est obligatoire');
      return;
    }

    console.log("🔄 handleAddNote appelé avec:", {
      title: formData.title,
      content: formData.content,
      tags: formData.tags,
      userId: user?.id
    });

    try {
      const tagArray = formData.tags
        ? formData.tags.split(',').map(tag => tag.trim())
        : [];

      console.log("📝 Appel addNote avec:", {
        title: formData.title.trim(),
        content: formData.content.trim(),
        tagArray,
        userId: user?.id
      });
      const newNote = await addNote(
        formData.title.trim(),
        formData.content.trim(),
        tagArray
      );

      if (newNote) {
        console.log("✅ Note créée avec succès:", newNote);
        showMessage('success', 'Note ajoutée avec succès');
        setShowAddModal(false);
        resetForm();
      } else {
        console.error("❌ addNote a retourné null");
        showMessage('error', 'Erreur: la note n\'a pas pu être créée');
      }
    } catch (error) {
      console.error('❌ ERREUR dans handleAddNote:', error);
      showMessage('error', 'Erreur lors de l\'ajout de la note');
    }
  };

  // Gérer la mise à jour d'une note
  const handleUpdateNote = async () => {
    if (!selectedNote || !formData.title.trim()) {
      showMessage('error', 'Le titre est obligatoire');
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
        showMessage('success', 'Note mise à jour avec succès');
        setShowEditModal(false);
        setSelectedNote(null);
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la note:', error);
      showMessage('error', 'Erreur lors de la mise à jour de la note');
    }
  };

  // Gérer la suppression d'une note
  const handleDeleteNote = async () => {
    if (!selectedNote) return;

    try {
      const success = await deleteNote(selectedNote.id);
      if (success) {
        showMessage('success', 'Note supprimée avec succès');
        setShowDeleteModal(false);
        setSelectedNote(null);
      }
    } catch (error) {
      console.error('Erreur lors de la suppression de la note:', error);
      showMessage('error', 'Erreur lors de la suppression de la note');
    }
  };

  // Gérer l'épinglage/désépinglage d'une note
  const handleTogglePin = async (note: Note) => {
    try {
      const success = await togglePinNote(note.id, !note.is_pinned);
      if (success) {
        showMessage('success', note.is_pinned ? 'Note désépinglée' : 'Note épinglée');
      }
    } catch (error) {
      console.error('Erreur lors de l\'épinglage/désépinglage de la note:', error);
      showMessage('error', 'Erreur lors de l\'épinglage/désépinglage de la note');
    }
  };

  // Ouvrir le modal d'édition
  const handleOpenEditModal = (note: Note) => {
    setSelectedNote(note);
    setFormData({
      title: note.title,
      content: note.content || '',
      tags: note.tags ? note.tags.map(tag => tag.name).join(', ') : ''
    });
    setShowEditModal(true);
    setIsMenuOpen(null);
  };

  // Ouvrir le modal de suppression
  const handleOpenDeleteModal = (note: Note) => {
    setSelectedNote(note);
    setShowDeleteModal(true);
    setIsMenuOpen(null);
  };

  // Réinitialiser le formulaire
  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      tags: ''
    });
  };

  // Formater la date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Composant pour afficher une note en mode grille
  const NoteCard = ({ note }: { note: Note }) => (
    <div 
      className={`
        ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
        ${note.is_pinned ? 'border-l-4 border-l-blue-500' : ''}
        border rounded-lg p-4 hover:shadow-md transition-all duration-200
        group relative
      `}
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'} line-clamp-2`}>
          {note.title}
        </h3>
        <div className="flex items-center space-x-1">
          {note.is_pinned && (
            <Pin className="w-4 h-4 text-blue-500" />
          )}
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(isMenuOpen === note.id ? null : note.id)}
              className={`
                p-1 rounded-full transition-colors
                ${darkMode 
                  ? 'hover:bg-gray-700 text-gray-400 hover:text-white' 
                  : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                }
                opacity-0 group-hover:opacity-100 transition-opacity duration-200
                ${isMenuOpen === note.id ? 'opacity-100' : ''}
              `}
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            
            {isMenuOpen === note.id && (
              <div 
                ref={menuRef}
                className={`
                  absolute right-0 mt-1 w-48 rounded-md shadow-lg z-10
                  ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}
                  border overflow-hidden
                `}
              >
                <div className="py-1">
                  <button
                    onClick={() => handleTogglePin(note)}
                    className={`
                      w-full text-left px-4 py-2 text-sm transition-colors flex items-center space-x-2
                      ${darkMode 
                        ? 'text-gray-300 hover:bg-gray-600' 
                        : 'text-gray-700 hover:bg-gray-100'
                      }
                    `}
                  >
                    {note.is_pinned ? (
                      <>
                        <PinOff className="w-4 h-4" />
                        <span>Désépingler</span>
                      </>
                    ) : (
                      <>
                        <Pin className="w-4 h-4" />
                        <span>Épingler</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleOpenEditModal(note)}
                    className={`
                      w-full text-left px-4 py-2 text-sm transition-colors flex items-center space-x-2
                      ${darkMode 
                        ? 'text-gray-300 hover:bg-gray-600' 
                        : 'text-gray-700 hover:bg-gray-100'
                      }
                    `}
                  >
                    <Edit className="w-4 h-4" />
                    <span>Modifier</span>
                  </button>
                  <button
                    onClick={() => handleOpenDeleteModal(note)}
                    className={`
                      w-full text-left px-4 py-2 text-sm transition-colors flex items-center space-x-2
                      ${darkMode 
                        ? 'text-red-400 hover:bg-gray-600' 
                        : 'text-red-600 hover:bg-gray-100'
                      }
                    `}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Supprimer</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className={`mb-3 line-clamp-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
        {note.content}
      </div>
      
      {note.tags && note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {note.tags.map((tag) => (
            <span
              key={tag.id}
              className="px-2 py-1 text-xs rounded-full flex items-center space-x-1"
              style={{ 
                backgroundColor: `${tag.color}20`, 
                color: tag.color,
                border: `1px solid ${tag.color}40`
              }}
            >
              <TagIcon className="w-3 h-3" />
              <span>{tag.name}</span>
            </span>
          ))}
        </div>
      )}
      
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center space-x-1">
          <Clock className={`w-3 h-3 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
          <span className={darkMode ? 'text-gray-500' : 'text-gray-400'}>
            {formatDate(note.updated_at)}
          </span>
        </div>
        
        {note.has_attachment && (
          <div className="flex items-center space-x-1">
            <Paperclip className={`w-3 h-3 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
            <span className={darkMode ? 'text-gray-500' : 'text-gray-400'}>
              Pièces jointes
            </span>
          </div>
        )}
      </div>
    </div>
  );

  // Composant pour afficher une note en mode liste
  const NoteRow = ({ note }: { note: Note }) => (
    <div 
      className={`
        ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
        ${note.is_pinned ? 'border-l-4 border-l-blue-500' : ''}
        border rounded-lg p-4 hover:shadow-md transition-all duration-200
        group relative
      `}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'} truncate`}>
              {note.title}
            </h3>
            {note.is_pinned && (
              <Pin className="w-4 h-4 text-blue-500 flex-shrink-0" />
            )}
          </div>
          
          <p className={`text-sm line-clamp-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            {note.content}
          </p>
          
          <div className="flex items-center space-x-4 mt-1">
            <div className="flex items-center space-x-1 text-xs">
              <Clock className={`w-3 h-3 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
              <span className={darkMode ? 'text-gray-500' : 'text-gray-400'}>
                {formatDate(note.updated_at)}
              </span>
            </div>
            
            {note.tags && note.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {note.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="px-2 py-0.5 text-xs rounded-full flex items-center space-x-1"
                    style={{ 
                      backgroundColor: `${tag.color}20`, 
                      color: tag.color,
                      border: `1px solid ${tag.color}40`
                    }}
                  >
                    <TagIcon className="w-2 h-2" />
                    <span>{tag.name}</span>
                  </span>
                ))}
              </div>
            )}
            
            {note.has_attachment && (
              <div className="flex items-center space-x-1 text-xs">
                <Paperclip className={`w-3 h-3 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                <span className={darkMode ? 'text-gray-500' : 'text-gray-400'}>
                  Pièces jointes
                </span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-1 ml-4">
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(isMenuOpen === note.id ? null : note.id)}
              className={`
                p-1 rounded-full transition-colors
                ${darkMode 
                  ? 'hover:bg-gray-700 text-gray-400 hover:text-white' 
                  : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                }
                opacity-0 group-hover:opacity-100 transition-opacity duration-200
                ${isMenuOpen === note.id ? 'opacity-100' : ''}
              `}
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            
            {isMenuOpen === note.id && (
              <div 
                ref={menuRef}
                className={`
                  absolute right-0 mt-1 w-48 rounded-md shadow-lg z-10
                  ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}
                  border overflow-hidden
                `}
              >
                <div className="py-1">
                  <button
                    onClick={() => handleTogglePin(note)}
                    className={`
                      w-full text-left px-4 py-2 text-sm transition-colors flex items-center space-x-2
                      ${darkMode 
                        ? 'text-gray-300 hover:bg-gray-600' 
                        : 'text-gray-700 hover:bg-gray-100'
                      }
                    `}
                  >
                    {note.is_pinned ? (
                      <>
                        <PinOff className="w-4 h-4" />
                        <span>Désépingler</span>
                      </>
                    ) : (
                      <>
                        <Pin className="w-4 h-4" />
                        <span>Épingler</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleOpenEditModal(note)}
                    className={`
                      w-full text-left px-4 py-2 text-sm transition-colors flex items-center space-x-2
                      ${darkMode 
                        ? 'text-gray-300 hover:bg-gray-600' 
                        : 'text-gray-700 hover:bg-gray-100'
                      }
                    `}
                  >
                    <Edit className="w-4 h-4" />
                    <span>Modifier</span>
                  </button>
                  <button
                    onClick={() => handleOpenDeleteModal(note)}
                    className={`
                      w-full text-left px-4 py-2 text-sm transition-colors flex items-center space-x-2
                      ${darkMode 
                        ? 'text-red-400 hover:bg-gray-600' 
                        : 'text-red-600 hover:bg-gray-100'
                      }
                    `}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Supprimer</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6">
      {/* Message de notification */}
      {message && (
        <div className={`
          fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2
          ${message.type === 'success'
            ? darkMode ? 'bg-green-800 text-green-200' : 'bg-green-100 text-green-800'
            : darkMode ? 'bg-red-800 text-red-200' : 'bg-red-100 text-red-800'
          }
          border ${message.type === 'success'
            ? darkMode ? 'border-green-700' : 'border-green-200'
            : darkMode ? 'border-red-700' : 'border-red-200'
          }
        `}>
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Gestion des erreurs de base de données */}
      {error && !loading && (
        <DatabaseErrorMessage 
          error={error} 
          onRetry={() => window.location.reload()}
          darkMode={darkMode}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notes</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Bienvenue, {user?.name || 'utilisateur'}
          </p>
        </div>
        <button 
          onClick={() => {
            resetForm();
            setShowAddModal(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Ajouter une note</span>
        </button>
      </div>

      {/* Barre de recherche et filtres */}
      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher des notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`
                w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent
                ${darkMode 
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }
              `}
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Filtre par tag */}
          <div className="relative">
            <select
              value={selectedTagId || ''}
              onChange={(e) => setSelectedTagId(e.target.value || null)}
              className={`
                px-4 py-2 border rounded-lg appearance-none pr-10
                ${darkMode 
                  ? 'bg-gray-800 border-gray-700 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
                }
                focus:ring-2 focus:ring-blue-500 focus:border-transparent
              `}
            >
              <option value="">Tous les tags</option>
              {tags.map((tag) => (
                <option key={tag.id} value={tag.id}>{tag.name}</option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <Filter className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            </div>
          </div>
          
          {/* Sélecteur de vue */}
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-gray-600 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-gray-600 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Message d'erreur */}
      {error && (
        <div className={`
          p-4 rounded-lg border mb-6
          ${darkMode ? 'bg-red-900/20 border-red-800 text-red-400' : 'bg-red-50 border-red-200 text-red-800'}
        `}>
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Contenu principal */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="text-center py-12">
          <StickyNote className={`w-16 h-16 mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
          <h3 className={`text-lg font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {searchTerm || selectedTagId ? 'Aucune note trouvée' : 'Aucune note'}
          </h3>
          <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-4`}>
            {searchTerm || selectedTagId 
              ? 'Essayez de modifier vos critères de recherche'
              : 'Commencez par ajouter votre première note'
            }
          </p>
          {!searchTerm && !selectedTagId && (
            <button
              onClick={() => {
                resetForm();
                setShowAddModal(true);
              }}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>Ajouter une note</span>
            </button>
          )}
        </div>
      ) : (
        <div className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
            : 'space-y-4'
        }>
          {filteredNotes.map((note) =>
            viewMode === 'grid' ? (
              <NoteCard key={note.id} note={note} />
            ) : (
              <NoteRow key={note.id} note={note} />
            )
          )}
        </div>
      )}

      {/* Modal Ajout de note */}
      {showAddModal && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setShowAddModal(false)} />
          <div className={`
            fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50
            ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl w-full max-w-md mx-4
          `}>
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Ajouter une note
                </h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Titre *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className={`
                      w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500
                      ${darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      }
                    `}
                    placeholder="Titre de la note"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Contenu
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({...formData, content: e.target.value})}
                    rows={6}
                    className={`
                      w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500
                      ${darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      }
                    `}
                    placeholder="Contenu de la note"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tags (séparés par des virgules)
                  </label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData({...formData, tags: e.target.value})}
                    className={`
                      w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500
                      ${darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      }
                    `}
                    placeholder="Ex: Important, Travail, Idées"
                  />
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <button
                onClick={() => setShowAddModal(false)}
                className={`
                  px-4 py-2 rounded-lg border transition-colors mr-2
                  ${darkMode 
                    ? 'border-gray-600 text-gray-400 hover:text-white hover:bg-gray-700'
                    : 'border-gray-300 text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }
                `}
              >
                Annuler
              </button>
              <button
                onClick={handleAddNote}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>Enregistrer</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modal Édition de note */}
      {showEditModal && selectedNote && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setShowEditModal(false)} />
          <div className={`
            fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50
            ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl w-full max-w-md mx-4
          `}>
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Modifier la note
                </h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Titre *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className={`
                      w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500
                      ${darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      }
                    `}
                    placeholder="Titre de la note"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Contenu
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({...formData, content: e.target.value})}
                    rows={6}
                    className={`
                      w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500
                      ${darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      }
                    `}
                    placeholder="Contenu de la note"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tags (séparés par des virgules)
                  </label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData({...formData, tags: e.target.value})}
                    className={`
                      w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500
                      ${darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      }
                    `}
                    placeholder="Ex: Important, Travail, Idées"
                  />
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <button
                onClick={() => setShowEditModal(false)}
                className={`
                  px-4 py-2 rounded-lg border transition-colors mr-2
                  ${darkMode 
                    ? 'border-gray-600 text-gray-400 hover:text-white hover:bg-gray-700'
                    : 'border-gray-300 text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }
                `}
              >
                Annuler
              </button>
              <button
                onClick={handleUpdateNote}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>Mettre à jour</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modal Suppression de note */}
      {showDeleteModal && selectedNote && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setShowDeleteModal(false)} />
          <div className={`
            fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50
            ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl w-full max-w-md mx-4
          `}>
            <div className="p-6">
              <div className="flex items-center justify-center mb-4">
                <div className={`
                  p-3 rounded-full
                  ${darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-600'}
                `}>
                  <Trash2 className="w-6 h-6" />
                </div>
              </div>
              
              <h2 className={`text-xl font-semibold text-center mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Supprimer cette note ?
              </h2>
              
              <p className={`text-center mb-6 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Êtes-vous sûr de vouloir supprimer la note "{selectedNote.title}" ? Cette action est irréversible.
              </p>
              
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className={`
                    px-4 py-2 rounded-lg border transition-colors
                    ${darkMode 
                      ? 'border-gray-600 text-gray-400 hover:text-white hover:bg-gray-700'
                      : 'border-gray-300 text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }
                  `}
                >
                  Annuler
                </button>
                <button
                  onClick={handleDeleteNote}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotesManager;
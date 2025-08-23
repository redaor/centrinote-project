import React, { useState } from 'react';
import {
  StickyNote as StickyNoteIcon,
  Plus, 
  Edit,
  Trash2,
  Save,
  X,
  Clock,
  AlertCircle
} from 'lucide-react';
import { useDocumentNotes } from '../../hooks/useDocumentNotes';
import { useApp } from '../../contexts/AppContext';

interface DocumentNotesProps {
  documentId: string;
}

interface DocumentNotesProps {
  documentId: string;
}

export function DocumentNotes({ documentId }: DocumentNotesProps) {
  const { state } = useApp();
  const { darkMode } = state;
  
  console.log("DEBUG: DocumentNotes rendu avec documentId:", documentId, "à", new Date().toISOString());
  
  const {
    notes,
    loading,
    error,
    addNote,
    updateNote,
    deleteNote
  } = useDocumentNotes(documentId);

  const [newNoteContent, setNewNoteContent] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<string>('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleAddNote = async () => {
    if (!newNoteContent.trim()) {
      showMessage('error', 'Le contenu de la note ne peut pas être vide');
      console.log("DEBUG: ❌ Tentative d'ajout d'une note vide à", new Date().toISOString());
      return;
    }

    console.log("DEBUG: ✅ Ajout d'une note pour le document:", documentId, "contenu:", newNoteContent.substring(0, 20) + "...");
    const result = await addNote(newNoteContent.trim());
    if (result) {
      console.log("DEBUG: ✅ Note ajoutée avec succès:", result.id);
      setNewNoteContent('');
      setIsAddingNote(false);
      showMessage('success', 'Note ajoutée avec succès');
    } else {
      console.log("DEBUG: ❌ Échec de l'ajout de la note");
      showMessage('error', 'Erreur lors de l\'ajout de la note');
    }
  };

  const handleStartEditing = (noteId: string, content: string) => {
    setEditingNoteId(noteId);
    setEditingContent(content);
  };

  const handleCancelEditing = () => {
    setEditingNoteId(null);
    setEditingContent('');
  };

  const handleUpdateNote = async (noteId: string) => {
    if (!editingContent.trim()) {
      showMessage('error', 'Le contenu de la note ne peut pas être vide');
      return;
    }

    const success = await updateNote(noteId, editingContent.trim());
    if (success) {
      setEditingNoteId(null);
      setEditingContent('');
      showMessage('success', 'Note mise à jour avec succès');
    } else {
      showMessage('error', 'Erreur lors de la mise à jour de la note');
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette note ?')) {
      const success = await deleteNote(noteId);
      if (success) {
        showMessage('success', 'Note supprimée avec succès');
      } else {
        showMessage('error', 'Erreur lors de la suppression de la note');
      }
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Message de notification */}
      {message && (
        <div className={`
          fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg
          ${message.type === 'success'
            ? darkMode ? 'bg-green-800 text-green-200' : 'bg-green-100 text-green-800'
            : darkMode ? 'bg-red-800 text-red-200' : 'bg-red-100 text-red-800'
          }
          border ${message.type === 'success'
            ? darkMode ? 'border-green-700' : 'border-green-200'
            : darkMode ? 'border-red-700' : 'border-red-200'
          }
        `}>
          {message.text}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <StickyNoteIcon className={`w-5 h-5 ${darkMode ? 'text-blue-400' : 'text-blue-500'}`} />
          <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Notes du document
          </h3>
        </div>
        <button
          onClick={() => setIsAddingNote(true)}
          className={`
            p-1 rounded-full transition-colors
            ${darkMode
              ? 'hover:bg-gray-700 text-gray-400 hover:text-white'
              : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
            }
          `}
          title="Ajouter une note"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Formulaire d'ajout de note */}
      {isAddingNote && (
        <div className={`
          ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}
          border rounded-lg p-4 shadow-lg
        `}>
          <div className="flex justify-between items-center mb-3">
            <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Ajouter une note
            </h4>
            <button
              onClick={() => setIsAddingNote(false)}
              className={`p-1 rounded hover:bg-gray-100 ${darkMode ? 'hover:bg-gray-600 text-gray-400' : 'text-gray-500'}`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <label htmlFor="note-content" className={`sr-only`}>Contenu de la note</label>
          <textarea
            id="note-content"
            value={newNoteContent}
            onChange={(e) => setNewNoteContent(e.target.value)}
            onKeyUp={() => console.log("DEBUG: Saisie de note en cours:", newNoteContent.length, "caractères")}
            placeholder="Écrivez votre note ici..."
            rows={4}
            autoFocus
            className={`
              w-full px-3 py-2 rounded-lg border transition-colors resize-none mb-3
              ${darkMode 
                ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500' 
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
              }
              focus:outline-none focus:ring-2 focus:ring-blue-500/20
            `}
          />
          <div className="flex justify-end space-x-3 mt-4">
            <button
              onClick={() => setIsAddingNote(false)}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                darkMode 
                  ? 'border-gray-600 text-gray-400 hover:text-white hover:bg-gray-700'
                  : 'border-gray-300 text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Annuler
            </button>
            <button
              onClick={handleAddNote}
              disabled={!newNoteContent.trim() || loading}
              className={`
                flex items-center space-x-2 px-5 py-2 rounded-lg transition-colors
                ${!newNoteContent.trim() || loading
                  ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600 shadow-sm'
                }
              `}
              aria-label="Ajouter la note"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>Ajouter la note</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Message d'erreur */}
      {error && (
        <div className={`
          p-4 rounded-lg border
          ${darkMode ? 'bg-red-900/20 border-red-800 text-red-400' : 'bg-red-50 border-red-200 text-red-800'}
        `}>
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Liste des notes */}
      {loading && notes.length === 0 ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        </div>
      ) : notes.length > 0 ? (
        <div className="space-y-4">
          {notes.map((note) => (
            <div
              key={note.id}
              className={`
                ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
                border rounded-lg p-4
              `}
            >
              {editingNoteId === note.id ? (
                <div className="space-y-3">
                  <textarea
                    value={editingContent}
                    onChange={(e) => setEditingContent(e.target.value)}
                    rows={4}
                    className={`
                      w-full px-3 py-2 rounded-lg border transition-colors resize-none
                      ${darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                      }
                      focus:outline-none focus:ring-2 focus:ring-blue-500/20
                    `}
                  />
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={handleCancelEditing}
                      className={`px-3 py-1 rounded-lg border transition-colors ${
                        darkMode 
                          ? 'border-gray-600 text-gray-400 hover:text-white hover:bg-gray-700'
                          : 'border-gray-300 text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      Annuler
                    </button>
                    <button
                      onClick={() => handleUpdateNote(note.id)}
                      disabled={!editingContent.trim() || loading}
                      className={`
                        flex items-center space-x-1 px-3 py-1 rounded-lg transition-colors
                        ${!editingContent.trim() || loading
                          ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed'
                          : 'bg-blue-500 text-white hover:bg-blue-600'
                        }
                      `}
                    >
                      {loading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>Mettre à jour</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2 text-xs">
                      <Clock className={`w-3 h-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                      <span className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {formatDate(note.updatedAt)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleStartEditing(note.id, note.content)}
                        className={`
                          p-1 rounded hover:bg-gray-100 ${darkMode ? 'hover:bg-gray-700' : ''}
                        `}
                        title="Modifier"
                      >
                        <Edit className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                      </button>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className={`
                          p-1 rounded hover:bg-red-100 ${darkMode ? 'hover:bg-red-900/20' : ''}
                        `}
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                  <div className={`whitespace-pre-wrap ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {note.content}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <StickyNoteIcon className={`w-12 h-12 mx-auto mb-3 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
          <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Aucune note pour ce document
          </p>
          <button
            onClick={() => setIsAddingNote(true)}
            className="mt-2 text-blue-500 hover:text-blue-600 text-sm font-medium"
          >
            Ajouter une note
          </button>
        </div>
      )}
    </div>
  );
}
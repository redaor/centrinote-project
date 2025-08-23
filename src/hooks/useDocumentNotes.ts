import { useState, useCallback, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { documentNotesService } from '../services/documentNotesService';
import { DocumentNote } from '../types';

export function useDocumentNotes(documentId: string) {
  const { state } = useApp();
  const { user } = state;
  
  const [notes, setNotes] = useState<DocumentNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Charger les notes depuis Supabase
  const loadNotes = useCallback(async () => {
    if (!user?.id || !documentId) {
      console.warn("⚠️ Tentative de chargement des notes sans ID utilisateur ou document", {userId: user?.id, documentId});
      return;
    }

    console.log("DEBUG: 🔄 Chargement des notes pour document:", documentId, "utilisateur:", user.id);
    try {
      setLoading(true);
      setError(null);
      
      const documentNotes = await documentNotesService.getDocumentNotes(documentId, user.id);
      console.log("DEBUG: ✅ Notes chargées:", documentNotes.length);
      setNotes(documentNotes);
      
      setInitialized(true);
    } catch (err) {
      console.error("❌ Erreur lors du chargement des notes:", err, {documentId, userId: user?.id});
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [user?.id, documentId]);

  // Ajouter une note
  const addNote = useCallback(async (content: string) => {
    if (!user?.id || !documentId) {
      console.warn("⚠️ Tentative d'ajout d'une note sans ID utilisateur ou document");
      return null;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Préparer la note avec l'ID utilisateur et document
      const noteData = {
        documentId,
        userId: user.id,
        content
      };
      
      // Ajouter à Supabase
      const newNote = await documentNotesService.addDocumentNote(noteData);
      
      // Mettre à jour l'état local
      setNotes(prev => [newNote, ...prev]);
      
      return newNote;
    } catch (err) {
      console.error("❌ Erreur lors de l'ajout de la note:", err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user?.id, documentId]);

  // Mettre à jour une note
  const updateNote = useCallback(async (noteId: string, content: string) => {
    if (!user?.id || !documentId) {
      console.warn("⚠️ Tentative de mise à jour d'une note sans ID utilisateur ou document");
      return false;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Trouver la note existante
      const existingNote = notes.find(note => note.id === noteId);
      if (!existingNote) {
        throw new Error("Note non trouvée");
      }
      
      // Mettre à jour la note
      const updatedNote = {
        ...existingNote,
        content
      };
      
      // Mettre à jour dans Supabase
      const result = await documentNotesService.updateDocumentNote(updatedNote);
      
      // Mettre à jour l'état local
      setNotes(prev => prev.map(note => 
        note.id === noteId ? result : note
      ));
      
      return true;
    } catch (err) {
      console.error("❌ Erreur lors de la mise à jour de la note:", err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      return false;
    } finally {
      setLoading(false);
    }
  }, [user?.id, documentId, notes]);

  // Supprimer une note
  const deleteNote = useCallback(async (noteId: string) => {
    if (!user?.id || !documentId) {
      console.warn("⚠️ Tentative de suppression d'une note sans ID utilisateur ou document");
      return false;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Supprimer de Supabase
      await documentNotesService.deleteDocumentNote(noteId);
      
      // Mettre à jour l'état local
      setNotes(prev => prev.filter(note => note.id !== noteId));
      
      return true;
    } catch (err) {
      console.error("❌ Erreur lors de la suppression de la note:", err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      return false;
    } finally {
      setLoading(false);
    }
  }, [user?.id, documentId]);

  // Charger les notes au montage du composant
  useEffect(() => {
    if (user?.id && documentId && !initialized) {
      loadNotes();
    }
  }, [user?.id, documentId, initialized, loadNotes]);

  return {
    notes,
    loading,
    error,
    loadNotes,
    addNote,
    updateNote,
    deleteNote
  };
}
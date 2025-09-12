import { useState, useCallback, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { notesService } from '../services/notesService';
import { Note, Tag, NoteAttachment } from '../types';

export function useNotes() {
  const { state } = useApp();
  const { user } = state;
  
  const [notes, setNotes] = useState<Note[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Charger les notes depuis Supabase
  const loadNotes = useCallback(async () => {
    const isDev = import.meta.env.DEV;
    
    if (!user?.id) {
      if (isDev) console.warn("⚠️ Tentative de chargement des notes sans ID utilisateur");
      setLoading(false);
      setInitialized(true);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const startTime = Date.now();
      if (isDev) console.log("🔄 Chargement des notes pour l'utilisateur:", user.id);
      
      // ⚡ Chargement parallèle optimisé
      const [notesData, tagsData] = await Promise.all([
        notesService.getNotes(user.id),
        notesService.getTags(user.id)
      ]);
      
      setNotes(notesData);
      setTags(tagsData);
      
      const loadTime = Date.now() - startTime;
      if (isDev) console.log(`⚡ Données chargées en ${loadTime}ms: ${notesData.length} notes, ${tagsData.length} tags`);
      
      setInitialized(true);
    } catch (err) {
      console.error("❌ Erreur lors du chargement des notes:", err);
      
      // Gestion spéciale si les tables n'existent pas
      if (err instanceof Error && (
        err.message.includes('relation "notes" does not exist') ||
        err.message.includes('relation "tags" does not exist') ||
        err.message.includes('table "notes" does not exist') ||
        err.message.includes('table "tags" does not exist')
      )) {
        setError('Les tables de base de données ne sont pas encore créées. Veuillez appliquer les migrations Supabase.');
        console.log("🛠️ Conseil: Exécutez 'supabase db push' pour appliquer les migrations");
      } else {
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
      }
      
      // Initialiser avec des données vides pour éviter le chargement infini
      setNotes([]);
      setTags([]);
      setInitialized(true);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Ajouter une note
  const addNote = useCallback(async (
    title: string, 
    content: string, 
    tagNames: string[] = [],
    isPinned: boolean = false
  ): Promise<Note | null> => {
    if (!user?.id) {
      console.error("❌ CRITIQUE: Tentative d'ajout de note sans ID utilisateur");
      console.error("📊 État utilisateur:", { user, userId: user?.id });
      return null;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log("🔄 Ajout d'une nouvelle note:", title, "pour utilisateur:", user.id);
      console.log("📝 Contenu de la note:", content.substring(0, 100) + "...");
      console.log("🏷️ Tags:", tagNames);
      
      const newNote = await notesService.addNote({
        userId: user.id,
        title,
        content,
        is_pinned: isPinned
      }, tagNames);
      
      console.log("✅ Note ajoutée avec succès:", newNote.id);
      console.log("📊 Note complète:", newNote);
      setNotes(prev => [newNote, ...prev]);
      
      // Mettre à jour les tags si de nouveaux ont été créés
      if (tagNames.length > 0) {
        console.log("🔄 Rechargement des tags après ajout de note");
        const tagsData = await notesService.getTags(user.id);
        setTags(tagsData);
      }
      
      return newNote;
    } catch (err) {
      console.error("❌ ERREUR CRITIQUE lors de l'ajout de la note:", err);
      console.error("📊 Détails de l'erreur:", {
        error: err,
        message: err instanceof Error ? err.message : 'Erreur inconnue',
        stack: err instanceof Error ? err.stack : undefined,
        userId: user?.id,
        title,
        contentLength: content.length
      });
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Mettre à jour une note
  const updateNote = useCallback(async (
    noteId: string,
    updates: { title?: string; content?: string; is_pinned?: boolean },
    tagNames?: string[]
  ): Promise<Note | null> => {
    if (!user?.id) {
      console.warn("⚠️ Tentative de mise à jour de note sans ID utilisateur");
      return null;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log("🔄 Mise à jour de la note:", noteId);
      const updatedNote = await notesService.updateNote({
        id: noteId,
        ...updates
      }, tagNames);
      
      console.log("✅ Note mise à jour:", updatedNote.id);
      setNotes(prev => prev.map(note => 
        note.id === noteId ? updatedNote : note
      ));
      
      // Mettre à jour les tags si de nouveaux ont été créés
      if (tagNames && tagNames.length > 0) {
        const tagsData = await notesService.getTags(user.id);
        setTags(tagsData);
      }
      
      return updatedNote;
    } catch (err) {
      console.error("❌ Erreur lors de la mise à jour de la note:", err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Supprimer une note
  const deleteNote = useCallback(async (noteId: string): Promise<boolean> => {
    if (!user?.id) {
      console.warn("⚠️ Tentative de suppression de note sans ID utilisateur");
      return false;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log("🔄 Suppression de la note:", noteId);
      await notesService.deleteNote(noteId);
      
      console.log("✅ Note supprimée:", noteId);
      setNotes(prev => prev.filter(note => note.id !== noteId));
      
      return true;
    } catch (err) {
      console.error("❌ Erreur lors de la suppression de la note:", err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      return false;
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Épingler/désépingler une note
  const togglePinNote = useCallback(async (noteId: string, isPinned: boolean): Promise<boolean> => {
    if (!user?.id) {
      console.warn("⚠️ Tentative d'épinglage de note sans ID utilisateur");
      return false;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log(`🔄 ${isPinned ? 'Épinglage' : 'Désépinglage'} de la note:`, noteId);
      await notesService.togglePinNote(noteId, isPinned);
      
      console.log(`✅ Note ${isPinned ? 'épinglée' : 'désépinglée'}:`, noteId);
      setNotes(prev => {
        const updatedNotes = prev.map(note => 
          note.id === noteId ? { ...note, is_pinned: isPinned } : note
        );
        
        // Réorganiser les notes pour que les épinglées soient en haut
        return [
          ...updatedNotes.filter(note => note.is_pinned),
          ...updatedNotes.filter(note => !note.is_pinned)
        ];
      });
      
      return true;
    } catch (err) {
      console.error(`❌ Erreur lors de ${isPinned ? 'l\'épinglage' : 'désépinglage'} de la note:`, err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      return false;
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Rechercher des notes
  const searchNotes = useCallback(async (searchTerm: string): Promise<Note[]> => {
    if (!user?.id || !searchTerm.trim()) {
      return notes;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log("🔍 Recherche de notes:", searchTerm);
      const searchResults = await notesService.searchNotes(searchTerm);
      console.log("✅ Résultats de recherche:", searchResults.length);
      
      return searchResults;
    } catch (err) {
      console.error("❌ Erreur lors de la recherche de notes:", err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      return [];
    } finally {
      setLoading(false);
    }
  }, [user?.id, notes]);

  // Filtrer les notes par tag
  const filterNotesByTag = useCallback(async (tagId: string): Promise<Note[]> => {
    if (!user?.id) {
      return notes;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log("🔍 Filtrage des notes par tag:", tagId);
      const filteredNotes = await notesService.getNotesByTag(tagId);
      console.log("✅ Notes filtrées:", filteredNotes.length);
      
      return filteredNotes;
    } catch (err) {
      console.error("❌ Erreur lors du filtrage des notes par tag:", err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      return [];
    } finally {
      setLoading(false);
    }
  }, [user?.id, notes]);

  // Ajouter une pièce jointe
  const addAttachment = useCallback(async (noteId: string, file: File): Promise<NoteAttachment | null> => {
    if (!user?.id) {
      console.warn("⚠️ Tentative d'ajout de pièce jointe sans ID utilisateur");
      return null;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log("🔄 Ajout d'une pièce jointe à la note:", noteId);
      const attachment = await notesService.addAttachment(noteId, file);
      
      console.log("✅ Pièce jointe ajoutée:", attachment.id);
      
      // Mettre à jour l'état local pour indiquer que la note a une pièce jointe
      setNotes(prev => prev.map(note => 
        note.id === noteId ? { ...note, has_attachment: true } : note
      ));
      
      return attachment;
    } catch (err) {
      console.error("❌ Erreur lors de l'ajout de la pièce jointe:", err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Supprimer une pièce jointe
  const deleteAttachment = useCallback(async (attachmentId: string, noteId: string): Promise<boolean> => {
    if (!user?.id) {
      console.warn("⚠️ Tentative de suppression de pièce jointe sans ID utilisateur");
      return false;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log("🔄 Suppression de la pièce jointe:", attachmentId);
      await notesService.deleteAttachment(attachmentId);
      
      console.log("✅ Pièce jointe supprimée:", attachmentId);
      
      // Vérifier s'il reste des pièces jointes pour cette note
      const attachments = await notesService.getNoteAttachments(noteId);
      
      // Mettre à jour l'état local
      setNotes(prev => prev.map(note => 
        note.id === noteId ? { ...note, has_attachment: attachments.length > 0 } : note
      ));
      
      return true;
    } catch (err) {
      console.error("❌ Erreur lors de la suppression de la pièce jointe:", err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      return false;
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Obtenir l'URL de téléchargement d'une pièce jointe
  const getAttachmentUrl = useCallback(async (filePath: string): Promise<string | null> => {
    try {
      console.log("🔄 Génération de l'URL de téléchargement:", filePath);
      const url = await notesService.getAttachmentUrl(filePath);
      console.log("✅ URL générée");
      return url;
    } catch (err) {
      console.error("❌ Erreur lors de la récupération de l'URL de téléchargement:", err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      return null;
    }
  }, []);

  // Charger les notes au montage du composant
  useEffect(() => {
    if (user?.id && !initialized) {
      loadNotes();
    }
  }, [user?.id, initialized, loadNotes]);

  return {
    notes,
    tags,
    loading,
    error,
    loadNotes,
    addNote,
    updateNote,
    deleteNote,
    togglePinNote,
    searchNotes,
    filterNotesByTag,
    addAttachment,
    deleteAttachment,
    getAttachmentUrl
  };
}
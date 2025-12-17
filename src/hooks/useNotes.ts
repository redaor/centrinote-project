import { useState, useCallback, useEffect, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import { notesService } from '../services/notesService';
import { Note, Tag, NoteAttachment } from '../types';
import { logger } from '../utils/logger';

// PERF: Cache SWR-like pour éviter les refetch inutiles
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE: {
  notes: CacheEntry<Note[]> | null;
  tags: CacheEntry<Tag[]> | null;
} = {
  notes: null,
  tags: null,
};

// PERF: Durée de validité du cache (2 secondes comme SWR par défaut)
const DEDUPING_INTERVAL = 2000;

function isCacheValid<T>(entry: CacheEntry<T> | null): boolean {
  if (!entry) return false;
  // PERF: Vérifier si le cache est encore frais
  return Date.now() - entry.timestamp < DEDUPING_INTERVAL;
}

export function useNotes() {
  const { state } = useApp();
  const { user } = state;

  const [notes, setNotes] = useState<Note[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // PERF: Tracker si un fetch est en cours pour éviter les duplications
  const isFetchingRef = useRef(false);

  // Charger les notes depuis Supabase
  const loadNotes = useCallback(async () => {
    const isDev = import.meta.env.DEV;

    if (!user?.id) {
      if (isDev) logger.warn("⚠️ Tentative de chargement des notes sans ID utilisateur");
      setLoading(false);
      setInitialized(true);
      return;
    }

    // PERF: Retourner immédiatement depuis le cache si valide
    if (isCacheValid(CACHE.notes) && isCacheValid(CACHE.tags)) {
      if (isDev) logger.debug("⚡ Données servies depuis le cache (fraîches < 2s)");
      setNotes(CACHE.notes!.data);
      setTags(CACHE.tags!.data);
      setInitialized(true);
      setLoading(false);
      return;
    }

    // PERF: Éviter les fetch parallèles (deduplication)
    if (isFetchingRef.current) {
      if (isDev) logger.debug("⏳ Fetch déjà en cours, skip");
      return;
    }

    try {
      isFetchingRef.current = true; // PERF: Marquer comme en cours
      setLoading(true);
      setError(null);

      const startTime = Date.now();
      if (isDev) logger.debug("🔄 Chargement des notes pour l'utilisateur", { userId: user.id });

      // PERF: Chargement parallèle optimisé
      const [notesData, tagsData] = await Promise.all([
        notesService.getNotes(user.id),
        notesService.getTags(user.id)
      ]);

      setNotes(notesData);
      setTags(tagsData);

      // PERF: Mettre à jour le cache
      CACHE.notes = { data: notesData, timestamp: Date.now() };
      CACHE.tags = { data: tagsData, timestamp: Date.now() };

      if (isDev) logger.debug("💾 Cache mis à jour");

      const loadTime = Date.now() - startTime;
      if (isDev) logger.debug(`⚡ Données chargées en ${loadTime}ms`, { notesCount: notesData.length, tagsCount: tagsData.length });

      setInitialized(true);
    } catch (err) {
      logger.error("❌ Erreur lors du chargement des notes", err instanceof Error ? err : new Error(String(err)));
      
      // Gestion spéciale si les tables n'existent pas
      if (err instanceof Error && (
        err.message.includes('relation "notes" does not exist') ||
        err.message.includes('relation "tags" does not exist') ||
        err.message.includes('table "notes" does not exist') ||
        err.message.includes('table "tags" does not exist')
      )) {
        setError('Les tables de base de données ne sont pas encore créées. Veuillez appliquer les migrations Supabase.');
        logger.debug("🛠️ Conseil: Exécutez 'supabase db push' pour appliquer les migrations");
      } else {
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
      }
      
      // Initialiser avec des données vides pour éviter le chargement infini
      setNotes([]);
      setTags([]);
      setInitialized(true);
    } finally {
      setLoading(false);
      isFetchingRef.current = false; // PERF: Libérer le verrou
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
      logger.error("❌ CRITIQUE: Tentative d'ajout de note sans ID utilisateur", undefined, { userId: user?.id });
      return null;
    }

    try {
      setLoading(true);
      setError(null);
      
      logger.debug("🔄 Ajout d'une nouvelle note", { title, userId: user.id });
      logger.debug("📝 Contenu de la note", { contentPreview: content.substring(0, 100) + "..." });
      logger.debug("🏷️ Tags", { tags: tagNames });
      
      const newNote = await notesService.addNote({
        userId: user.id,
        title,
        content,
        is_pinned: isPinned
      }, tagNames);
      
      logger.debug("✅ Note ajoutée avec succès", { noteId: newNote.id });
      logger.debug("📊 Note complète", { note: newNote });
      setNotes(prev => [newNote, ...prev]);

      // PERF: Invalider le cache après mutation
      CACHE.notes = { data: [newNote, ...notes], timestamp: Date.now() };

      if (import.meta.env.DEV) logger.debug("💾 Cache invalidé après ajout");

      // Mettre à jour les tags si de nouveaux ont été créés
      if (tagNames.length > 0) {
        logger.debug("🔄 Rechargement des tags après ajout de note");
        const tagsData = await notesService.getTags(user.id);
        setTags(tagsData);
      }

      return newNote;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error("❌ ERREUR CRITIQUE lors de l'ajout de la note", error, {
        userId: user?.id,
        title,
        contentLength: content.length
      });
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user?.id, notes]);

  // Mettre à jour une note
  const updateNote = useCallback(async (
    noteId: string,
    updates: { title?: string; content?: string; is_pinned?: boolean },
    tagNames?: string[]
  ): Promise<Note | null> => {
    if (!user?.id) {
      logger.warn("⚠️ Tentative de mise à jour de note sans ID utilisateur");
      return null;
    }

    try {
      setLoading(true);
      setError(null);
      
      logger.debug("🔄 Mise à jour de la note", { noteId });
      const updatedNote = await notesService.updateNote({
        id: noteId,
        userId: user.id,
        ...updates
      }, tagNames);
      
      logger.debug("✅ Note mise à jour", { noteId: updatedNote.id });
      setNotes(prev => prev.map(note =>
        note.id === noteId ? updatedNote : note
      ));

      // PERF: Invalider le cache après mutation
      const updatedNotes = notes.map(n => n.id === noteId ? updatedNote : n);
      CACHE.notes = { data: updatedNotes, timestamp: Date.now() };

      // Mettre à jour les tags si de nouveaux ont été créés
      if (tagNames && tagNames.length > 0) {
        const tagsData = await notesService.getTags(user.id);
        setTags(tagsData);
      }

      return updatedNote;
    } catch (err) {
      logger.error("❌ Erreur lors de la mise à jour de la note", err instanceof Error ? err : new Error(String(err)));
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user?.id, notes]);

  // Supprimer une note
  const deleteNote = useCallback(async (noteId: string): Promise<boolean> => {
    if (!user?.id) {
      logger.warn("⚠️ Tentative de suppression de note sans ID utilisateur");
      return false;
    }

    try {
      setLoading(true);
      setError(null);
      
      logger.debug("🔄 Suppression de la note", { noteId });
      await notesService.deleteNote(noteId);

      logger.debug("✅ Note supprimée", { noteId });
      setNotes(prev => prev.filter(note => note.id !== noteId));

      // PERF: Invalider le cache après mutation
      const filteredNotes = notes.filter(n => n.id !== noteId);
      CACHE.notes = { data: filteredNotes, timestamp: Date.now() };

      return true;
    } catch (err) {
      logger.error("❌ Erreur lors de la suppression de la note", err instanceof Error ? err : new Error(String(err)));
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      return false;
    } finally {
      setLoading(false);
    }
  }, [user?.id, notes]);

  // Épingler/désépingler une note
  const togglePinNote = useCallback(async (noteId: string, isPinned: boolean): Promise<boolean> => {
    if (!user?.id) {
      logger.warn("⚠️ Tentative d'épinglage de note sans ID utilisateur");
      return false;
    }

    try {
      setLoading(true);
      setError(null);
      
      logger.debug(`🔄 ${isPinned ? 'Épinglage' : 'Désépinglage'} de la note`, { noteId, isPinned });
      await notesService.togglePinNote(noteId, isPinned);
      
      logger.debug(`✅ Note ${isPinned ? 'épinglée' : 'désépinglée'}`, { noteId, isPinned });
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
      logger.error(`❌ Erreur lors de ${isPinned ? 'l\'épinglage' : 'désépinglage'} de la note`, err instanceof Error ? err : new Error(String(err)));
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
      
      logger.debug("🔍 Recherche de notes", { searchTerm });
      const searchResults = await notesService.searchNotes(searchTerm);
      logger.debug("✅ Résultats de recherche", { count: searchResults.length });
      
      return searchResults;
    } catch (err) {
      logger.error("❌ Erreur lors de la recherche de notes", err instanceof Error ? err : new Error(String(err)));
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
      
      logger.debug("🔍 Filtrage des notes par tag", { tagId });
      const filteredNotes = await notesService.getNotesByTag(tagId);
      logger.debug("✅ Notes filtrées", { count: filteredNotes.length });
      
      return filteredNotes;
    } catch (err) {
      logger.error("❌ Erreur lors du filtrage des notes par tag", err instanceof Error ? err : new Error(String(err)));
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      return [];
    } finally {
      setLoading(false);
    }
  }, [user?.id, notes]);

  // Ajouter une pièce jointe
  const addAttachment = useCallback(async (noteId: string, file: File): Promise<NoteAttachment | null> => {
    if (!user?.id) {
      logger.warn("⚠️ Tentative d'ajout de pièce jointe sans ID utilisateur");
      return null;
    }

    try {
      setLoading(true);
      setError(null);
      
      logger.debug("🔄 Ajout d'une pièce jointe à la note", { noteId });
      const attachment = await notesService.addAttachment(noteId, file);
      
      logger.debug("✅ Pièce jointe ajoutée", { attachmentId: attachment.id });
      
      // Mettre à jour l'état local pour indiquer que la note a une pièce jointe
      setNotes(prev => prev.map(note => 
        note.id === noteId ? { ...note, has_attachment: true } : note
      ));
      
      return attachment;
    } catch (err) {
      logger.error("❌ Erreur lors de l'ajout de la pièce jointe", err instanceof Error ? err : new Error(String(err)));
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Supprimer une pièce jointe
  const deleteAttachment = useCallback(async (attachmentId: string, noteId: string): Promise<boolean> => {
    if (!user?.id) {
      logger.warn("⚠️ Tentative de suppression de pièce jointe sans ID utilisateur");
      return false;
    }

    try {
      setLoading(true);
      setError(null);
      
      logger.debug("🔄 Suppression de la pièce jointe", { attachmentId });
      await notesService.deleteAttachment(attachmentId);
      
      logger.debug("✅ Pièce jointe supprimée", { attachmentId });
      
      // Vérifier s'il reste des pièces jointes pour cette note
      const attachments = await notesService.getNoteAttachments(noteId);
      
      // Mettre à jour l'état local
      setNotes(prev => prev.map(note => 
        note.id === noteId ? { ...note, has_attachment: attachments.length > 0 } : note
      ));
      
      return true;
    } catch (err) {
      logger.error("❌ Erreur lors de la suppression de la pièce jointe", err instanceof Error ? err : new Error(String(err)));
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      return false;
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Obtenir l'URL de téléchargement d'une pièce jointe
  const getAttachmentUrl = useCallback(async (filePath: string): Promise<string | null> => {
    try {
      logger.debug("🔄 Génération de l'URL de téléchargement", { filePath });
      const url = await notesService.getAttachmentUrl(filePath);
      logger.debug("✅ URL générée");
      return url;
    } catch (err) {
      logger.error("❌ Erreur lors de la récupération de l'URL de téléchargement", err instanceof Error ? err : new Error(String(err)));
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      return null;
    }
  }, []);

  // Charger les notes au montage du composant
  // Protection contre les boucles infinies
  const loadNotesRef = useRef(loadNotes);
  loadNotesRef.current = loadNotes;

  useEffect(() => {
    if (user?.id && !initialized) {
      loadNotesRef.current();
    }
  }, [user?.id, initialized]); // Retirer loadNotes des dépendances

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
import { useState, useCallback, useEffect, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import { notesService } from '../services/notesService';
import { Note, Tag, NoteAttachment } from '../types';
import { log } from '../utils/logger';

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
      if (isDev) log.warn("⚠️ Tentative de chargement des notes sans ID utilisateur");
      setLoading(false);
      setInitialized(true);
      return;
    }

    // PERF: Retourner immédiatement depuis le cache si valide
    if (isCacheValid(CACHE.notes) && isCacheValid(CACHE.tags)) {
      if (isDev) log.debug("⚡ Données servies depuis le cache (fraîches < 2s)");
      setNotes(CACHE.notes!.data);
      setTags(CACHE.tags!.data);
      setInitialized(true);
      setLoading(false);
      return;
    }

    // PERF: Éviter les fetch parallèles (deduplication)
    if (isFetchingRef.current) {
      if (isDev) log.debug("⏳ Fetch déjà en cours, skip");
      return;
    }

    try {
      isFetchingRef.current = true; // PERF: Marquer comme en cours
      setLoading(true);
      setError(null);

      const startTime = Date.now();
      if (isDev) log.debug("🔄 Chargement des notes pour l'utilisateur:", user.id);

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

      if (isDev) log.debug("💾 Cache mis à jour");

      const loadTime = Date.now() - startTime;
      if (isDev) log.debug(`⚡ Données chargées en ${loadTime}ms: ${notesData.length} notes, ${tagsData.length} tags`);

      setInitialized(true);
    } catch (err) {
      log.error("❌ Erreur lors du chargement des notes:", err);
      
      // Gestion spéciale si les tables n'existent pas
      if (err instanceof Error && (
        err.message.includes('relation "notes" does not exist') ||
        err.message.includes('relation "tags" does not exist') ||
        err.message.includes('table "notes" does not exist') ||
        err.message.includes('table "tags" does not exist')
      )) {
        setError('Les tables de base de données ne sont pas encore créées. Veuillez appliquer les migrations Supabase.');
        log.debug("🛠️ Conseil: Exécutez 'supabase db push' pour appliquer les migrations");
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
      log.error("❌ CRITIQUE: Tentative d'ajout de note sans ID utilisateur");
      log.error("📊 État utilisateur:", { user, userId: user?.id });
      return null;
    }

    try {
      setLoading(true);
      setError(null);
      
      log.debug("🔄 Ajout d'une nouvelle note:", title, "pour utilisateur:", user.id);
      log.debug("📝 Contenu de la note:", content.substring(0, 100) + "...");
      log.debug("🏷️ Tags:", tagNames);
      
      const newNote = await notesService.addNote({
        userId: user.id,
        title,
        content,
        is_pinned: isPinned
      }, tagNames);
      
      log.debug("✅ Note ajoutée avec succès:", newNote.id);
      log.debug("📊 Note complète:", newNote);
      setNotes(prev => [newNote, ...prev]);

      // PERF: Invalider le cache après mutation
      CACHE.notes = { data: [newNote, ...notes], timestamp: Date.now() };

      if (import.meta.env.DEV) log.debug("💾 Cache invalidé après ajout");

      // Mettre à jour les tags si de nouveaux ont été créés
      if (tagNames.length > 0) {
        log.debug("🔄 Rechargement des tags après ajout de note");
        const tagsData = await notesService.getTags(user.id);
        setTags(tagsData);
      }

      return newNote;
    } catch (err) {
      log.error("❌ ERREUR CRITIQUE lors de l'ajout de la note:", err);
      log.error("📊 Détails de l'erreur:", {
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
      log.warn("⚠️ Tentative de mise à jour de note sans ID utilisateur");
      return null;
    }

    try {
      setLoading(true);
      setError(null);
      
      log.debug("🔄 Mise à jour de la note:", noteId);
      const updatedNote = await notesService.updateNote({
        id: noteId,
        userId: user.id,
        ...updates
      }, tagNames);
      
      log.debug("✅ Note mise à jour:", updatedNote.id);
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
      log.error("❌ Erreur lors de la mise à jour de la note:", err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Supprimer une note
  const deleteNote = useCallback(async (noteId: string): Promise<boolean> => {
    if (!user?.id) {
      log.warn("⚠️ Tentative de suppression de note sans ID utilisateur");
      return false;
    }

    try {
      setLoading(true);
      setError(null);
      
      log.debug("🔄 Suppression de la note:", noteId);
      await notesService.deleteNote(noteId);

      log.debug("✅ Note supprimée:", noteId);
      setNotes(prev => prev.filter(note => note.id !== noteId));

      // PERF: Invalider le cache après mutation
      const filteredNotes = notes.filter(n => n.id !== noteId);
      CACHE.notes = { data: filteredNotes, timestamp: Date.now() };

      return true;
    } catch (err) {
      log.error("❌ Erreur lors de la suppression de la note:", err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      return false;
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Épingler/désépingler une note
  const togglePinNote = useCallback(async (noteId: string, isPinned: boolean): Promise<boolean> => {
    if (!user?.id) {
      log.warn("⚠️ Tentative d'épinglage de note sans ID utilisateur");
      return false;
    }

    try {
      setLoading(true);
      setError(null);
      
      log.debug(`🔄 ${isPinned ? 'Épinglage' : 'Désépinglage'} de la note:`, noteId);
      await notesService.togglePinNote(noteId, isPinned);
      
      log.debug(`✅ Note ${isPinned ? 'épinglée' : 'désépinglée'}:`, noteId);
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
      log.error(`❌ Erreur lors de ${isPinned ? 'l\'épinglage' : 'désépinglage'} de la note:`, err);
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
      
      log.debug("🔍 Recherche de notes:", searchTerm);
      const searchResults = await notesService.searchNotes(searchTerm);
      log.debug("✅ Résultats de recherche:", searchResults.length);
      
      return searchResults;
    } catch (err) {
      log.error("❌ Erreur lors de la recherche de notes:", err);
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
      
      log.debug("🔍 Filtrage des notes par tag:", tagId);
      const filteredNotes = await notesService.getNotesByTag(tagId);
      log.debug("✅ Notes filtrées:", filteredNotes.length);
      
      return filteredNotes;
    } catch (err) {
      log.error("❌ Erreur lors du filtrage des notes par tag:", err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      return [];
    } finally {
      setLoading(false);
    }
  }, [user?.id, notes]);

  // Ajouter une pièce jointe
  const addAttachment = useCallback(async (noteId: string, file: File): Promise<NoteAttachment | null> => {
    if (!user?.id) {
      log.warn("⚠️ Tentative d'ajout de pièce jointe sans ID utilisateur");
      return null;
    }

    try {
      setLoading(true);
      setError(null);
      
      log.debug("🔄 Ajout d'une pièce jointe à la note:", noteId);
      const attachment = await notesService.addAttachment(noteId, file);
      
      log.debug("✅ Pièce jointe ajoutée:", attachment.id);
      
      // Mettre à jour l'état local pour indiquer que la note a une pièce jointe
      setNotes(prev => prev.map(note => 
        note.id === noteId ? { ...note, has_attachment: true } : note
      ));
      
      return attachment;
    } catch (err) {
      log.error("❌ Erreur lors de l'ajout de la pièce jointe:", err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Supprimer une pièce jointe
  const deleteAttachment = useCallback(async (attachmentId: string, noteId: string): Promise<boolean> => {
    if (!user?.id) {
      log.warn("⚠️ Tentative de suppression de pièce jointe sans ID utilisateur");
      return false;
    }

    try {
      setLoading(true);
      setError(null);
      
      log.debug("🔄 Suppression de la pièce jointe:", attachmentId);
      await notesService.deleteAttachment(attachmentId);
      
      log.debug("✅ Pièce jointe supprimée:", attachmentId);
      
      // Vérifier s'il reste des pièces jointes pour cette note
      const attachments = await notesService.getNoteAttachments(noteId);
      
      // Mettre à jour l'état local
      setNotes(prev => prev.map(note => 
        note.id === noteId ? { ...note, has_attachment: attachments.length > 0 } : note
      ));
      
      return true;
    } catch (err) {
      log.error("❌ Erreur lors de la suppression de la pièce jointe:", err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      return false;
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Obtenir l'URL de téléchargement d'une pièce jointe
  const getAttachmentUrl = useCallback(async (filePath: string): Promise<string | null> => {
    try {
      log.debug("🔄 Génération de l'URL de téléchargement:", filePath);
      const url = await notesService.getAttachmentUrl(filePath);
      log.debug("✅ URL générée");
      return url;
    } catch (err) {
      log.error("❌ Erreur lors de la récupération de l'URL de téléchargement:", err);
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
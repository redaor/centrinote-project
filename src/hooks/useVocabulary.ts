import { useState, useCallback, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { vocabularyService } from '../services/vocabularyService';
import { VocabularyEntry } from '../types';

export function useVocabulary() {
  const { state, dispatch } = useApp();
  const { user, vocabulary } = state;
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Charger le vocabulaire depuis Supabase
  const loadVocabulary = useCallback(async () => {
    if (!user?.id) {
      console.warn("⚠️ Tentative de chargement du vocabulaire sans ID utilisateur");
      setLoading(false);
      setInitialized(true);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const vocabularyEntries = await vocabularyService.getVocabulary(user.id);
      
      // Mettre à jour le contexte global
      dispatch({ type: 'SET_VOCABULARY', payload: vocabularyEntries });
      
      setInitialized(true);
    } catch (err) {
      console.error("❌ Erreur lors du chargement du vocabulaire:", err);
      
      // Gestion spéciale si la table n'existe pas
      if (err instanceof Error && (
        err.message.includes('relation "vocabulary" does not exist') ||
        err.message.includes('table "vocabulary" does not exist')
      )) {
        setError('La table de vocabulaire n\'est pas encore créée. Veuillez appliquer les migrations Supabase.');
        console.log("🛠️ Conseil: Exécutez 'supabase db push' pour appliquer les migrations");
      } else {
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
      }
      
      // Initialiser avec des données vides pour éviter le chargement infini
      dispatch({ type: 'SET_VOCABULARY', payload: [] });
      setInitialized(true);
    } finally {
      setLoading(false);
    }
  }, [user?.id, dispatch]);

  // Ajouter un mot de vocabulaire
  const addVocabularyEntry = useCallback(async (entry: Omit<VocabularyEntry, 'id' | 'userId'>) => {
    if (!user?.id) {
      console.error("❌ CRITIQUE: Tentative d'ajout de vocabulaire sans ID utilisateur");
      console.error("📊 État utilisateur:", { user, userId: user?.id });
      return null;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log("🔄 Ajout d'un nouveau mot:", entry.word, "pour utilisateur:", user.id);
      console.log("📝 Données du vocabulaire:", {
        word: entry.word,
        definition: entry.definition?.substring(0, 50) + "...",
        category: entry.category,
        difficulty: entry.difficulty,
        mastery: entry.mastery
      });
      
      // Préparer l'entrée avec l'ID utilisateur
      const entryWithUserId = {
        ...entry,
        userId: user.id
      };
      
      console.log("📤 Données complètes envoyées au service:", entryWithUserId);
      
      // Ajouter à Supabase
      const newEntry = await vocabularyService.addVocabularyEntry(entryWithUserId);
      
      console.log("✅ Vocabulaire ajouté avec succès:", newEntry.id);
      console.log("📊 Entrée complète:", newEntry);
      
      // Mettre à jour le contexte global
      dispatch({ type: 'ADD_VOCABULARY', payload: newEntry });
      
      return newEntry;
    } catch (err) {
      console.error("❌ ERREUR CRITIQUE lors de l'ajout du mot:", err);
      console.error("📊 Détails de l'erreur:", {
        error: err,
        message: err instanceof Error ? err.message : 'Erreur inconnue',
        stack: err instanceof Error ? err.stack : undefined,
        userId: user?.id,
        word: entry.word,
        category: entry.category
      });
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user?.id, dispatch]);

  // Mettre à jour un mot de vocabulaire
  const updateVocabularyEntry = useCallback(async (entry: VocabularyEntry) => {
    if (!user?.id) {
      console.warn("⚠️ Tentative de mise à jour de vocabulaire sans ID utilisateur");
      return false;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Mettre à jour dans Supabase
      const updatedEntry = await vocabularyService.updateVocabularyEntry(entry);
      
      // Mettre à jour le contexte global
      dispatch({ type: 'UPDATE_VOCABULARY', payload: updatedEntry });
      
      return true;
    } catch (err) {
      console.error("❌ Erreur lors de la mise à jour du mot:", err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      return false;
    } finally {
      setLoading(false);
    }
  }, [user?.id, dispatch]);

  // Supprimer un mot de vocabulaire
  const deleteVocabularyEntry = useCallback(async (id: string) => {
    if (!user?.id) {
      console.warn("⚠️ Tentative de suppression de vocabulaire sans ID utilisateur");
      return false;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Supprimer de Supabase
      await vocabularyService.deleteVocabularyEntry(id);
      
      // Mettre à jour le contexte global
      dispatch({ type: 'DELETE_VOCABULARY', payload: id });
      
      return true;
    } catch (err) {
      console.error("❌ Erreur lors de la suppression du mot:", err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      return false;
    } finally {
      setLoading(false);
    }
  }, [user?.id, dispatch]);

  // Charger le vocabulaire au montage du composant
  useEffect(() => {
    if (user?.id && !initialized) {
      loadVocabulary();
    }
  }, [user?.id, initialized, vocabulary.length, loadVocabulary]);

  return {
    vocabulary,
    loading,
    error,
    loadVocabulary,
    addVocabularyEntry,
    updateVocabularyEntry,
    deleteVocabularyEntry
  };
}
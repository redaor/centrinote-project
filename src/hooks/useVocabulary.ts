import { useState, useCallback, useEffect, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import { vocabularyService } from '../services/vocabularyService';
import { VocabularyEntry } from '../types';
import { log } from '../utils/logger';

// Flag global pour éviter les chargements multiples simultanés
let globalLoadingFlag = false;
let globalInitializedFlag = false;

export function useVocabulary() {
  const { state, dispatch } = useApp();
  const { user, vocabulary } = state;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(globalInitializedFlag);

  // Charger le vocabulaire depuis Supabase
  const loadVocabulary = useCallback(async () => {
    if (!user?.id) {
      log.warn("⚠️ Tentative de chargement du vocabulaire sans ID utilisateur");
      setLoading(false);
      setInitialized(true);
      globalInitializedFlag = true;
      return;
    }

    // Empêcher les chargements multiples simultanés
    if (globalLoadingFlag) {
      log.debug("⏸️ Chargement déjà en cours, skip");
      return;
    }

    // Si déjà initialisé globalement, ne pas recharger
    if (globalInitializedFlag && vocabulary.length > 0) {
      log.debug("✅ Vocabulaire déjà chargé, skip");
      setInitialized(true);
      return;
    }

    try {
      globalLoadingFlag = true;
      setLoading(true);
      setError(null);

      log.debug("🔄 Chargement vocabulaire pour user:", user.id);

      const vocabularyEntries = await vocabularyService.getVocabulary(user.id);

      // Mettre à jour le contexte global
      dispatch({ type: 'SET_VOCABULARY', payload: vocabularyEntries });

      setInitialized(true);
      globalInitializedFlag = true;
    } catch (err) {
      log.error("❌ Erreur lors du chargement du vocabulaire:", err);

      // Gestion spéciale si la table n'existe pas
      if (err instanceof Error && (
        err.message.includes('relation "vocabulary" does not exist') ||
        err.message.includes('table "vocabulary" does not exist')
      )) {
        setError('La table de vocabulaire n\'est pas encore créée. Veuillez appliquer les migrations Supabase.');
        log.debug("🛠️ Conseil: Exécutez 'supabase db push' pour appliquer les migrations");
      } else {
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
      }

      // Initialiser avec des données vides pour éviter le chargement infini
      dispatch({ type: 'SET_VOCABULARY', payload: [] });
      setInitialized(true);
      globalInitializedFlag = true;
    } finally {
      setLoading(false);
      globalLoadingFlag = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, vocabulary.length]);

  // Ajouter un mot de vocabulaire
  const addVocabularyEntry = useCallback(async (entry: Omit<VocabularyEntry, 'id' | 'userId'>) => {
    if (!user?.id) {
      log.error("❌ CRITIQUE: Tentative d'ajout de vocabulaire sans ID utilisateur");
      log.error("📊 État utilisateur:", { user, userId: user?.id });
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      log.debug("🔄 Ajout d'un nouveau mot:", entry.word, "pour utilisateur:", user.id);
      log.debug("📝 Données du vocabulaire:", {
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

      log.debug("📤 Données complètes envoyées au service:", entryWithUserId);
      console.log("📤 [useVocabulary] Données complètes envoyées au service:", entryWithUserId);

      // Ajouter à Supabase
      console.log("🚀 [useVocabulary] Appel vocabularyService.addVocabularyEntry...");
      const newEntry = await vocabularyService.addVocabularyEntry(entryWithUserId);

      console.log("✅ [useVocabulary] Résultat reçu:", newEntry ? { id: newEntry.id, word: newEntry.word } : "NULL");
      log.debug("✅ Vocabulaire ajouté avec succès:", newEntry.id);
      log.debug("📊 Entrée complète:", newEntry);

      // Mettre à jour le contexte global
      dispatch({ type: 'ADD_VOCABULARY', payload: newEntry });

      return newEntry;
    } catch (err) {
      console.error("❌ [useVocabulary] ERREUR CRITIQUE lors de l'ajout du mot:", err);
      log.error("❌ ERREUR CRITIQUE lors de l'ajout du mot:", err);
      log.error("📊 Détails de l'erreur:", {
        error: err,
        message: err instanceof Error ? err.message : 'Erreur inconnue',
        stack: err instanceof Error ? err.stack : undefined,
        userId: user?.id,
        word: entry.word,
        category: entry.category
      });
      
      // Afficher aussi dans la console pour le debug
      if (err instanceof Error) {
        console.error("❌ [useVocabulary] Message d'erreur:", err.message);
        console.error("❌ [useVocabulary] Stack trace:", err.stack);
      } else {
        console.error("❌ [useVocabulary] Erreur inconnue (pas une Error):", err);
      }
      
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue lors de l\'ajout du mot';
      setError(errorMessage);
      
      // IMPORTANT: Toujours réinitialiser le loading dans le catch aussi
      setLoading(false);
      
      return null;
    } finally {
      // S'assurer que le loading est toujours réinitialisé, même si une exception a été levée
      setLoading(false);
      console.log("🔄 [useVocabulary] Chargement terminé (finally), vocabularyLoading = false");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Mettre à jour un mot de vocabulaire
  const updateVocabularyEntry = useCallback(async (entry: VocabularyEntry) => {
    if (!user?.id) {
      log.warn("⚠️ Tentative de mise à jour de vocabulaire sans ID utilisateur");
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
      log.error("❌ Erreur lors de la mise à jour du mot:", err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      return false;
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Supprimer un mot de vocabulaire
  const deleteVocabularyEntry = useCallback(async (id: string) => {
    if (!user?.id) {
      log.warn("⚠️ Tentative de suppression de vocabulaire sans ID utilisateur");
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
      log.error("❌ Erreur lors de la suppression du mot:", err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      return false;
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Charger le vocabulaire au montage du composant
  // Protection contre les boucles infinies
  const loadVocabularyRef = useRef(loadVocabulary);
  loadVocabularyRef.current = loadVocabulary;

  useEffect(() => {
    if (user?.id && !initialized) {
      loadVocabularyRef.current();
    }
  }, [user?.id, initialized]); // Retirer vocabulary.length et loadVocabulary des dépendances

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
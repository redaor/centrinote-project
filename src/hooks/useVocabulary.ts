import { useState, useCallback, useEffect, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import { vocabularyService } from '../services/vocabularyService';
import { VocabularyEntry } from '../types';
import { logger } from '../utils/logger';

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
      logger.warn("⚠️ Tentative de chargement du vocabulaire sans ID utilisateur");
      setLoading(false);
      setInitialized(true);
      globalInitializedFlag = true;
      return;
    }

    // Empêcher les chargements multiples simultanés
    if (globalLoadingFlag) {
      logger.debug("⏸️ Chargement déjà en cours, skip");
      return;
    }

    // Si déjà initialisé globalement, ne pas recharger
    if (globalInitializedFlag && vocabulary.length > 0) {
      logger.debug("✅ Vocabulaire déjà chargé, skip");
      setInitialized(true);
      return;
    }

    try {
      globalLoadingFlag = true;
      setLoading(true);
      setError(null);

      logger.debug("🔄 Chargement vocabulaire pour user:", user.id);

      const vocabularyEntries = await vocabularyService.getVocabulary(user.id);

      // Mettre à jour le contexte global
      dispatch({ type: 'SET_VOCABULARY', payload: vocabularyEntries });

      setInitialized(true);
      globalInitializedFlag = true;
    } catch (err) {
      logger.error("❌ Erreur lors du chargement du vocabulaire:", err);

      // Gestion spéciale si la table n'existe pas
      if (err instanceof Error && (
        err.message.includes('relation "vocabulary" does not exist') ||
        err.message.includes('table "vocabulary" does not exist')
      )) {
        setError('La table de vocabulaire n\'est pas encore créée. Veuillez appliquer les migrations Supabase.');
        logger.debug("🛠️ Conseil: Exécutez 'supabase db push' pour appliquer les migrations");
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
      logger.error("❌ CRITIQUE: Tentative d'ajout de vocabulaire sans ID utilisateur");
      logger.error("📊 État utilisateur:", { user, userId: user?.id });
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      logger.debug("🔄 Ajout d'un nouveau mot:", entry.word, "pour utilisateur:", user.id);
      logger.debug("📝 Données du vocabulaire:", {
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

      logger.debug("Données vocabulaire envoyées au service");

      // Ajouter à Supabase
      logger.debug("Appel vocabularyService.addVocabularyEntry");
      const newEntry = await vocabularyService.addVocabularyEntry(entryWithUserId);

      logger.debug("Vocabulaire ajouté avec succès");

      // Mettre à jour le contexte global
      dispatch({ type: 'ADD_VOCABULARY', payload: newEntry });

      return newEntry;
    } catch (err) {
      logger.error("ERREUR CRITIQUE lors de l'ajout du mot", err instanceof Error ? err : new Error(String(err)));
      
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue lors de l\'ajout du mot';
      setError(errorMessage);
      
      // IMPORTANT: Toujours réinitialiser le loading dans le catch aussi
      setLoading(false);
      
      return null;
    } finally {
      // S'assurer que le loading est toujours réinitialisé, même si une exception a été levée
      setLoading(false);
      logger.debug("Chargement vocabulaire terminé");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Mettre à jour un mot de vocabulaire
  const updateVocabularyEntry = useCallback(async (entry: VocabularyEntry) => {
    if (!user?.id) {
      logger.warn("⚠️ Tentative de mise à jour de vocabulaire sans ID utilisateur");
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
      logger.error("❌ Erreur lors de la mise à jour du mot:", err);
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
      logger.warn("⚠️ Tentative de suppression de vocabulaire sans ID utilisateur");
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
      logger.error("❌ Erreur lors de la suppression du mot:", err);
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
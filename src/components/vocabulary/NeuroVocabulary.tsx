import React, { useState, useEffect, useMemo, useId, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Trophy,
  Target,
  Zap,
  Star,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Plus,
  Search,
  Filter,
  Award,
  Flame,
  BookOpen,
  RefreshCw,
  Volume2,
  Eye,
  EyeOff,
  Timer,
  ArrowLeft,
  Clock,
  Edit2,
  Trash2,
  CreditCard,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  X,
  Sparkles,
  ArrowUp,
  ArrowDown,
  ArrowUpToLine,
  ArrowDownAZ,
  ArrowUpZA
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useNeuroFeedback } from '../../hooks/useNeuroFeedback';
import { useVocabulary } from '../../hooks/useVocabulary';
import { useDebounce } from '../../hooks/useDebounce';
import { VocabularyEntry } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { AIContentHelper } from '../ai/AIContentHelper';
import { FlashcardMode } from './FlashcardMode';

interface VocabularyStats {
  mastered: number;
  learning: number;
  forgotten: number;
  total: number;
  streakDays: number;
  todayReviewed: number;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  unlocked: boolean;
  progress: number;
}

export function NeuroVocabulary() {
  // ✅ Tous les hooks contextes en premier
  const { state, dispatch } = useApp();
  const { vocabulary, darkMode, user } = state;
  const { addVocabularyEntry, updateVocabularyEntry, deleteVocabularyEntry, loading: vocabularyLoading } = useVocabulary();
  const { triggerReward, focusAttention, pulseEffect } = useNeuroFeedback();
  
  // ✅ Tous les useState en un seul bloc
  const [isAddingWord, setIsAddingWord] = useState(false);
  const [newWord, setNewWord] = useState({ term: '', definition: '', example: '' });
  const [selectedWord, setSelectedWord] = useState<VocabularyEntry | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'mastered' | 'forgotten' | 'recent'>('all');
  const [showDefinitions, setShowDefinitions] = useState(true);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc'); // A-Z par défaut
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null); // Pour l'accordion des cards
  const [isQuizMode, setIsQuizMode] = useState(false);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Array<{wordId: string, word: string, correct: boolean, userAnswer: string, correctAnswer: string}>>([]);
  const [showQuizResults, setShowQuizResults] = useState(false);
  const [isFlashcardMode, setIsFlashcardMode] = useState(false);

  // États pour l'édition et la suppression
  const [editingWord, setEditingWord] = useState<VocabularyEntry | null>(null);
  const [wordToDelete, setWordToDelete] = useState<VocabularyEntry | null>(null);
  
  // États pour l'accordion et le menu (3.1, 3.3)
  const [expandedWords, setExpandedWords] = useState<Set<string>>(new Set());
  const [showWordMenu, setShowWordMenu] = useState<string | null>(null);
  
  // États pour le mode édition (4.2, 4.4)
  const [contextSentence, setContextSentence] = useState<string>('');
  const [showAIVocabMenu, setShowAIVocabMenu] = useState(false);

  // Refs pour les textareas avec hauteur dynamique
  const definitionTextareaRef = React.useRef<HTMLTextAreaElement>(null);
  const examplesTextareaRef = React.useRef<HTMLTextAreaElement>(null);

  // ✅ Mémoïser le vocabulaire pour le mode révision pour éviter les re-renders non désirés
  const [flashcardVocabulary, setFlashcardVocabulary] = useState<VocabularyEntry[]>([]);

  // 🔄 État pour accumuler les mises à jour de maîtrise en batch
  const [pendingMasteryUpdates, setPendingMasteryUpdates] = useState<Map<string, { word: VocabularyEntry, newMastery: number }>>(new Map());

  // Fonction pour ajuster la hauteur d'un textarea dynamiquement
  const adjustTextareaHeight = useCallback((textarea: HTMLTextAreaElement | null, minRows: number = 2, maxRows: number = 10) => {
    if (!textarea) return;
    textarea.style.height = 'auto';
    const lineHeight = parseInt(window.getComputedStyle(textarea).lineHeight) || 20;
    const minHeight = lineHeight * minRows;
    const maxHeight = lineHeight * maxRows;
    const scrollHeight = textarea.scrollHeight;
    const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
    textarea.style.height = `${newHeight}px`;
  }, []);

  const normalizeExamples = useCallback((entry: VocabularyEntry): VocabularyEntry => {
    const examples = Array.isArray(entry.examples)
      ? entry.examples
      : entry.examples
        ? String(entry.examples).split(',').map(part => part.trim()).filter(Boolean)
        : [];
    return { ...entry, examples };
  }, []);

  const selectWord = useCallback((entry: VocabularyEntry) => {
    setSelectedWord(normalizeExamples(entry));
  }, [normalizeExamples]);

  // 🚀 PERFORMANCE: Debounce du terme de recherche pour éviter les re-renders excessifs
  // Ne filtre qu'après 300ms d'inactivité (au lieu de filtrer à chaque frappe)
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  // ✅ IDs uniques pour les champs de formulaire
  const searchId = useId();
  const termId = useId();
  const definitionId = useId();
  const exampleId = useId();
  
  // ✅ Refs
  
  // ✅ Tous les useEffect après toutes les déclarations
  // Debug: logger l'état de chargement (seulement en développement)
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('🔄 [NeuroVocabulary] État vocabularyLoading:', vocabularyLoading);
      console.log('🔄 [NeuroVocabulary] État isAddingWord:', isAddingWord);
      console.log('🔄 [NeuroVocabulary] Bouton sera désactivé:', isAddingWord || vocabularyLoading);
    }
  }, [vocabularyLoading, isAddingWord]);
  
  // Réinitialiser isAddingWord au montage pour éviter les états bloqués (uniquement si true au montage)
  useEffect(() => {
    if (isAddingWord) {
      console.log('🔄 [NeuroVocabulary] Réinitialisation isAddingWord au montage');
      setIsAddingWord(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Seulement au montage - intentionnellement sans dépendances
  
  // Ajuster la hauteur des textareas quand le modal d'édition s'ouvre
  useEffect(() => {
    if (editingWord) {
      // Petit délai pour s'assurer que les refs sont attachés au DOM
      setTimeout(() => {
        adjustTextareaHeight(definitionTextareaRef.current, 3, 12);
        const examplesValue = Array.isArray(editingWord.examples) 
          ? editingWord.examples.join(', ') 
          : '';
        if (examplesValue.trim()) {
          adjustTextareaHeight(examplesTextareaRef.current, 2, 8);
        } else {
          adjustTextareaHeight(examplesTextareaRef.current, 2, 2);
        }
      }, 100);
    }
  }, [editingWord, adjustTextareaHeight]);

  // Bloquer le scroll du body quand le modal d'édition est ouvert
  useEffect(() => {
    if (editingWord) {
      // Sauvegarder la valeur actuelle de overflow
      const originalOverflow = document.body.style.overflow;
      // Bloquer le scroll
      document.body.style.overflow = 'hidden';
      
      return () => {
        // Restaurer le scroll à la fermeture
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [editingWord]);

  // Safety: Réinitialiser isAddingWord si vocabularyLoading reste bloqué trop longtemps pendant un ajout
  // Ce useEffect ne doit réinitialiser que si on est en train d'ajouter ET que vocabularyLoading reste bloqué
  useEffect(() => {
    // Ne faire quelque chose que si on est en train d'ajouter (handleAddWord a été appelé)
    // On ne touche PAS à isAddingWord si l'utilisateur a juste ouvert le formulaire
    // On ne réinitialise que si vocabularyLoading reste true trop longtemps pendant un ajout actif
    if (vocabularyLoading && isAddingWord) {
      const timeoutId = setTimeout(() => {
        // ✅ CORRECTION: Vérifier l'état actuel au lieu d'utiliser la closure
        // On utilise une fonction de callback pour obtenir la valeur actuelle
        setIsAddingWord((currentIsAdding) => {
          // Vérifier si le loading est toujours actif (via un état de référence ou simplement fermer si nécessaire)
          if (currentIsAdding) {
            console.warn('⚠️ [NeuroVocabulary] Timeout: vocabularyLoading bloqué > 30s, réinitialisation de sécurité');
            console.warn('⚠️ [NeuroVocabulary] Cela peut indiquer un problème réseau ou une erreur Supabase non propagée');
            // Si le formulaire est encore ouvert et que le loading est bloqué, le fermer
            return false; // Fermer le formulaire en cas de timeout
          }
          return currentIsAdding; // Ne pas changer si déjà fermé
        });
      }, 30000); // 30 secondes max (plus long pour les connexions lentes)
      
      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [vocabularyLoading, isAddingWord]);

  // Calculate vocabulary statistics
  const stats: VocabularyStats = useMemo(() => {
    const mastered = vocabulary.filter(v => v.mastery >= 80).length;
    const forgotten = vocabulary.filter(v => v.difficulty >= 4 && v.mastery < 40).length;
    const learning = vocabulary.length - mastered - forgotten;
    
    return {
      mastered,
      learning,
      forgotten,
      total: vocabulary.length,
      streakDays: 7, // Placeholder - calculate from actual data
      todayReviewed: 12 // Placeholder - calculate from actual data
    };
  }, [vocabulary]);

  // Calculate mastery percentage with visual feedback
  const masteryPercentage = useMemo(() => {
    if (stats.total === 0) return 0;
    return Math.round((stats.mastered / stats.total) * 100);
  }, [stats]);

  // Gamification badges
  const badges: Badge[] = [
    {
      id: 'beginner',
      name: 'Débutant',
      description: 'Ajoutez 10 mots',
      icon: BookOpen,
      unlocked: stats.total >= 10,
      progress: Math.min((stats.total / 10) * 100, 100)
    },
    {
      id: 'explorer',
      name: 'Explorateur',
      description: 'Maîtrisez 25 mots',
      icon: Trophy,
      unlocked: stats.mastered >= 25,
      progress: Math.min((stats.mastered / 25) * 100, 100)
    },
    {
      id: 'streak',
      name: 'En feu',
      description: '7 jours consécutifs',
      icon: Flame,
      unlocked: stats.streakDays >= 7,
      progress: Math.min((stats.streakDays / 7) * 100, 100)
    },
    {
      id: 'master',
      name: 'Maître',
      description: '80% de maîtrise',
      icon: Award,
      unlocked: masteryPercentage >= 80,
      progress: masteryPercentage
    }
  ];

  // Normaliser les accents pour la recherche
  const normalizeText = (text: string) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  };

  // Filter vocabulary based on selected mode + tri alphabétique
  const filteredVocabulary = useMemo(() => {
    let filtered = [...vocabulary];

    // Apply filter mode
    switch (filterMode) {
      case 'mastered':
        filtered = filtered.filter(v => v.mastery >= 80);
        break;
      case 'forgotten':
        // "À réviser" = dernière révision > 24h ET maîtrise < 80%
        filtered = filtered.filter(v => {
          const lastReviewed = v.lastReviewed ? new Date(v.lastReviewed) : null;
          const hoursSinceReview = lastReviewed 
            ? (Date.now() - lastReviewed.getTime()) / (1000 * 60 * 60)
            : Infinity;
          return hoursSinceReview > 24 && v.mastery < 80;
        });
        break;
      case 'recent':
        filtered = filtered
          .filter(v => v.id)
          .sort((a, b) => {
            const aCreated = (a as any).createdAt;
            const bCreated = (b as any).createdAt;
            if (aCreated && bCreated) {
              return new Date(bCreated).getTime() - new Date(aCreated).getTime();
            }
            return b.id.localeCompare(a.id);
          })
          .slice(0, 10);
        break;
    }

    // Apply search - case-insensitive, accents normalisés
    if (debouncedSearchTerm) {
      const searchNormalized = normalizeText(debouncedSearchTerm);
      filtered = filtered.filter(v =>
        normalizeText(v.word).includes(searchNormalized) ||
        normalizeText(v.definition).includes(searchNormalized)
      );
    }

    // Tri alphabétique (sauf pour 'recent' qui est déjà trié)
    if (filterMode !== 'recent') {
      filtered.sort((a, b) => {
        const aWord = normalizeText(a.word);
        const bWord = normalizeText(b.word);
        return sortOrder === 'asc' 
          ? aWord.localeCompare(bWord)
          : bWord.localeCompare(aWord);
      });
    }

    return filtered;
  }, [vocabulary, filterMode, debouncedSearchTerm, sortOrder]);

  useEffect(() => {
    if (!selectedWord) return;

    if (!filteredVocabulary.some(entry => entry.id === selectedWord.id)) {
      setSelectedWord(null);
    }
  }, [filteredVocabulary, selectedWord]);

  // Raccourci clavier "/" pour focus la barre de recherche
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          const searchInput = document.getElementById(`search-${searchId}`);
          if (searchInput) {
            (searchInput as HTMLInputElement).focus();
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchId]);

  // 🚀 PERFORMANCE: Mémoïser les handlers pour éviter les re-renders inutiles
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  const handleTermChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNewWord(prev => ({ ...prev, term: e.target.value }));
  }, []);

  // ✅ LOGIQUE IDENTIQUE AUX NOTES: Handler simple et direct pour la définition
  const handleDefinitionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    console.log(`📝 Changement définition:`, value.slice(0, 50) + (value.length > 50 ? '...' : ''));
    setNewWord(prev => ({ ...prev, definition: value }));
  }, []);

  const handleExampleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNewWord(prev => ({ ...prev, example: e.target.value }));
  }, []);

  // Handle adding new word with validation
  const handleAddWord = async () => {
    console.log('🖱️ [NeuroVocabulary] handleAddWord appelé');
    console.log('📊 [NeuroVocabulary] État actuel:', {
      isAddingWord,
      vocabularyLoading,
      newWord,
      hasUser: !!user?.id,
    });

    // Validation des champs requis
    if (!newWord.term || !newWord.definition) {
      console.log('⚠️ [NeuroVocabulary] Validation échouée - champs vides');
      triggerReward('Remplissez les champs requis! ⚠️', { type: 'warning' });
      return;
    }

    // 📏 VALIDATION: Vérifier les tailles de texte AVANT d'envoyer
    const wordLength = newWord.term.length;
    const definitionLength = newWord.definition.length;
    const MAX_WORD_LENGTH = 500;
    const MAX_DEFINITION_LENGTH = 10000;

    console.log('📏 [NeuroVocabulary] Validation des tailles:', {
      wordLength,
      definitionLength,
      wordLimit: MAX_WORD_LENGTH,
      definitionLimit: MAX_DEFINITION_LENGTH
    });

    if (wordLength > MAX_WORD_LENGTH) {
      console.error('❌ [NeuroVocabulary] Mot trop long:', wordLength);
      triggerReward(`Le mot est trop long (${wordLength}/${MAX_WORD_LENGTH} caractères) ⚠️`, { type: 'error' });
      return;
    }

    if (definitionLength > MAX_DEFINITION_LENGTH) {
      console.error('❌ [NeuroVocabulary] Définition trop longue:', definitionLength);
      triggerReward(`La définition est trop longue (${definitionLength}/${MAX_DEFINITION_LENGTH} caractères) ⚠️`, { type: 'error' });
      return;
    }

    // ⚠️ Avertissement pour les textes longs (mais pas bloquant)
    if (definitionLength > 2000) {
      console.warn('⚠️ [NeuroVocabulary] Définition longue détectée:', definitionLength);
      triggerReward('Définition longue détectée... 📝', { type: 'info' });
    }

    // Vérification de l'utilisateur connecté
    if (!user?.id) {
      console.error('❌ [NeuroVocabulary] Utilisateur non connecté:', { user, userId: user?.id });
      triggerReward('Erreur: utilisateur non connecté ❌', { type: 'error' });
      return;
    }

    console.log('🔄 [NeuroVocabulary] Début ajout vocabulaire:', {
      term: newWord.term,
      definitionLength: newWord.definition.length,
      definitionPreview: newWord.definition.substring(0, 100),
      userId: user.id,
      timestamp: new Date().toISOString(),
    });

    // ✅ LOGIQUE IDENTIQUE AUX NOTES: Préparer les données avec .trim() comme dans les notes
      const newEntryData: any = {
      word: newWord.term.trim(), // ✅ .trim() au niveau du composant comme dans les notes
      definition: newWord.definition.trim(), // ✅ .trim() au niveau du composant comme dans les notes
      category: 'General', // Catégorie par défaut
        examples: newWord.example ? [newWord.example.trim()] : [],
      difficulty: 3, // Difficulté moyenne (1-5)
      mastery: 0,
      timesReviewed: 0
    };
      if (!newWord.example) {
        newEntryData.examples = [];
      }

    // Ne pas modifier isAddingWord ici - il est déjà true si le formulaire est ouvert
    // On utilise un état séparé pour le chargement du bouton "Ajouter" dans le formulaire

    try {
      console.log('📤 Envoi à addVocabularyEntry:', newEntryData);
      const addedEntry = await addVocabularyEntry(newEntryData);

      console.log('📥 Retour de addVocabularyEntry:', addedEntry);

      if (addedEntry) {
        selectWord(addedEntry);
        // Succès : réinitialiser le formulaire et le fermer
        setNewWord({ term: '', definition: '', example: '' });
        setIsAddingWord(false); // Fermer le formulaire
        triggerReward('Nouveau mot ajouté! 🎉', { type: 'reward', haptic: true, sound: true });
        focusAttention(`vocab-${addedEntry.id}`);
      } else {
        console.error('❌ [NeuroVocabulary] addVocabularyEntry a retourné null - vérifier les logs pour détails');
        triggerReward('Erreur lors de l\'ajout du mot ❌', { type: 'error' });
        // En cas d'erreur, on garde le formulaire ouvert pour que l'utilisateur puisse réessayer
      }
    } catch (error) {
      console.error('❌ [NeuroVocabulary] Exception lors de l\'ajout:', error);
      console.error('📊 [NeuroVocabulary] Détails de l\'erreur:', {
        message: error instanceof Error ? error.message : 'Erreur inconnue',
        stack: error instanceof Error ? error.stack : undefined,
        errorObject: error,
      });
      
      // Afficher un message d'erreur plus explicite à l'utilisateur
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Erreur inconnue lors de l\'ajout du vocabulaire';
      
      triggerReward(`Erreur: ${errorMessage} ❌`, { type: 'error' });
      
      // En cas d'erreur, on garde le formulaire ouvert pour que l'utilisateur puisse réessayer
    }
  };

  // Toggle word mastery with feedback
  const toggleMastery = async (word: VocabularyEntry) => {
    const updated = { ...word, mastery: word.mastery >= 80 ? 0 : 100 };

    try {
      const success = await updateVocabularyEntry(updated);

      if (success) {
        setSelectedWord(prev => (prev && prev.id === updated.id ? { ...prev, mastery: updated.mastery } : prev));
        if (updated.mastery >= 80) {
          triggerReward(`"${word.word}" maîtrisé! 🌟`, { type: 'reward', haptic: true, sound: true });
        } else {
          triggerReward(`Continuez à réviser "${word.word}"`, { type: 'info' });
        }
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la maîtrise:', error);
      triggerReward('Erreur lors de la mise à jour ❌', { type: 'error' });
    }
  };

  // Ouvrir le modal d'édition
  const handleEditWord = useCallback((word: VocabularyEntry) => {
    setEditingWord(word);
    // Fermer le formulaire d'ajout si ouvert
    setIsAddingWord(false);
  }, []);

  // Sauvegarder les modifications
  const handleSaveEdit = useCallback(async () => {
    if (!editingWord) return;

    try {
      const success = await updateVocabularyEntry(editingWord);
      if (success) {
        setEditingWord(null);
        setSelectedWord(null);
        triggerReward('Mot modifié avec succès! ✨', { type: 'success', sound: true });
      } else {
        triggerReward('Erreur lors de la modification ❌', { type: 'error' });
      }
    } catch (error) {
      console.error('Erreur lors de la modification:', error);
      triggerReward('Erreur lors de la modification ❌', { type: 'error' });
    }
  }, [editingWord, updateVocabularyEntry, triggerReward]);

  // Demander confirmation avant suppression
  const handleDeleteWord = useCallback((word: VocabularyEntry) => {
    setWordToDelete(word);
  }, []);

  // Confirmer la suppression
  const confirmDelete = useCallback(async () => {
    if (!wordToDelete) return;

    const deletedWord = wordToDelete;

    try {
      const success = await deleteVocabularyEntry(deletedWord.id);
      if (success) {
        setWordToDelete(null);
        setSelectedWord(prev => (prev && prev.id === deletedWord.id ? null : prev));
        triggerReward(`"${deletedWord.word}" supprimé 🗑️`, { type: 'info', sound: true });
      } else {
        triggerReward('Erreur lors de la suppression ❌', { type: 'error' });
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      triggerReward('Erreur lors de la suppression ❌', { type: 'error' });
    }
  }, [wordToDelete, deleteVocabularyEntry, triggerReward]);

  // ✅ Callbacks pour le mode flashcard (toujours déclarés, jamais conditionnellement)
  const handleFlashcardClose = useCallback(async () => {
    console.log('🚪 [NeuroVocabulary] Fermeture du mode flashcard demandée');

    // 🔄 BATCH MODE: Envoyer toutes les mises à jour accumulées en une seule fois
    if (pendingMasteryUpdates.size > 0) {
      console.log('📤 [NeuroVocabulary] Envoi des mises à jour en batch:', pendingMasteryUpdates.size, 'mots');

      try {
        // Convertir la Map en array pour itérer
        const updates = Array.from(pendingMasteryUpdates.values());

        // Envoyer toutes les mises à jour en parallèle
        const updatePromises = updates.map(({ word, newMastery }) => {
          const updated = { ...word, mastery: newMastery };
          console.log('📝 [NeuroVocabulary] Mise à jour batch:', word.word, '→', newMastery);
          return updateVocabularyEntry(updated);
        });

        await Promise.all(updatePromises);

        console.log('✅ [NeuroVocabulary] Toutes les mises à jour batch envoyées avec succès');
        triggerReward('Progrès sauvegardés! 💾', { type: 'success', sound: true });

        // Réinitialiser les mises à jour en attente
        setPendingMasteryUpdates(new Map());
      } catch (error) {
        console.error('❌ [NeuroVocabulary] Erreur lors de l\'envoi des mises à jour batch:', error);
        triggerReward('Erreur lors de la sauvegarde ❌', { type: 'error' });
        // Ne pas réinitialiser pendingMasteryUpdates en cas d'erreur pour permettre un réessai
        return; // Ne pas fermer le modal en cas d'erreur
      }
    } else {
      console.log('ℹ️ [NeuroVocabulary] Aucune mise à jour en attente');
    }

    setIsFlashcardMode(false);
  }, [pendingMasteryUpdates, updateVocabularyEntry, triggerReward]);

  const handleFlashcardUpdateMastery = useCallback((word: VocabularyEntry, newMastery: number) => {
    console.log('📝 [NeuroVocabulary] onUpdateMastery appelé - ACCUMULATION EN BATCH:', {
      word: word.word,
      oldMastery: word.mastery,
      newMastery
    });

    // ✅ BATCH MODE: Accumuler la mise à jour au lieu d'appeler Supabase immédiatement
    // Cela évite les problèmes de rate-limiting quand l'utilisateur clique rapidement
    setPendingMasteryUpdates(prev => {
      const updated = new Map(prev);
      updated.set(word.id, { word, newMastery });
      console.log('📦 [NeuroVocabulary] Mise à jour ajoutée au batch, total:', updated.size);
      return updated;
    });
  }, []);

  // Quiz functionality
  const startQuiz = () => {
    if (vocabulary.length < 4) {
      triggerReward('Ajoutez plus de mots pour le quiz!', { type: 'warning' });
      return;
    }
    setIsQuizMode(true);
    setCurrentQuizIndex(0);
    setQuizScore(0);
    setQuizAnswers([]);
    setShowQuizResults(false);
  };

  const renderSelectedWordPanel = () => {
    if (!selectedWord) {
      return (
        <Card className="p-6 flex flex-col items-center justify-center text-center min-h-[280px]">
          <BookOpen className={`w-10 h-10 mb-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Sélectionnez un mot</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Cliquez sur une carte vocabulaire pour afficher sa définition détaillée.
          </p>
        </Card>
      );
    }

    const safeExamples = Array.isArray(selectedWord.examples)
      ? selectedWord.examples
      : selectedWord.examples
        ? String(selectedWord.examples).split(',').map(part => part.trim()).filter(Boolean)
        : [];
    const masteryLabel = selectedWord.mastery >= 80 ? 'Maîtrisé' : 'En apprentissage';
    const lastReviewedLabel = selectedWord.lastReviewed
      ? new Date(selectedWord.lastReviewed).toLocaleDateString('fr-FR', { dateStyle: 'long' })
      : null;

    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => setSelectedWord(null)}
            className="inline-flex items-center gap-2 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à la liste
          </Button>
        </div>
      <Card className="p-6 space-y-6 lg:sticky lg:top-28 max-h-[80vh] overflow-y-auto">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="space-y-2">
            {selectedWord.category && (
              <span className="inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                {selectedWord.category}
              </span>
            )}
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              {selectedWord.word}
            </h2>
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
              <span>{masteryLabel}</span>
              <span>• Maîtrise {selectedWord.mastery}%</span>
              <span>• Difficulté {selectedWord.difficulty}/5</span>
              <span>• {selectedWord.timesReviewed} révisions</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="ghost"
              onClick={() => toggleMastery(selectedWord)}
            >
              {selectedWord.mastery >= 80 ? 'Marquer à revoir' : 'Marquer maîtrisé'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleEditWord(selectedWord)}
            >
              Modifier
            </Button>
            <Button
              variant="danger"
              onClick={() => handleDeleteWord(selectedWord)}
            >
              Supprimer
            </Button>
          </div>
        </div>

        <div
          className="prose prose-sm sm:prose max-w-none text-gray-700 dark:text-gray-200 whitespace-pre-wrap leading-relaxed"
          onDoubleClick={() => handleEditWord(selectedWord)}
        >
          {selectedWord.definition || 'Aucune définition enregistrée.'}
        </div>

        {safeExamples.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
              Exemples
            </h3>
            <ul className="list-disc space-y-1 pl-4 text-sm text-gray-600 dark:text-gray-300">
              {safeExamples.map((example, index) => (
                <li key={index}>{example}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            <span>Maîtrise {selectedWord.mastery}%</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            <span>Difficulté {selectedWord.difficulty}/5</span>
          </div>
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            <span>{selectedWord.timesReviewed} passages</span>
          </div>
          {lastReviewedLabel && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>Dernière révision {lastReviewedLabel}</span>
            </div>
          )}
        </div>
      </Card>
      </div>
    );
  };

  const handleQuizAnswer = (correct: boolean, userAnswer: string, correctAnswer: string) => {
    const currentWord = vocabulary[currentQuizIndex];

    // Store the answer
    setQuizAnswers(prev => [...prev, {
      wordId: currentWord.id,
      word: currentWord.word,
      correct,
      userAnswer,
      correctAnswer
    }]);

    if (correct) {
      setQuizScore(prev => prev + 1);
      triggerReward('Correct! ✅', { type: 'success', sound: true });
    } else {
      triggerReward('Incorrect ❌', { type: 'error', sound: true });
    }

    if (currentQuizIndex < Math.min(vocabulary.length - 1, 9)) {
      setCurrentQuizIndex(prev => prev + 1);
    } else {
      // End quiz - show results
      setTimeout(() => {
        setShowQuizResults(true);
      }, 500);
    }
  };


  return (
    <div className={`min-h-screen p-6 ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-gray-50 to-blue-50/20'}`}>
      <div className="max-w-7xl mx-auto">
        {/* Header with Neuro Stats */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                📚 Vocabulaire Neuroadaptatif
              </h1>
              <p className={`mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Renforcez votre mémoire avec la répétition espacée
              </p>
            </div>
            
            {/* Streak Counter */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white"
            >
              <Flame className="w-5 h-5" />
              <span className="font-bold">{stats.streakDays} jours</span>
            </motion.div>
          </div>

          {/* Mastery Progress Bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Maîtrise globale
              </span>
              <span className={`text-2xl font-bold ${
                masteryPercentage >= 80 ? 'text-green-500' :
                masteryPercentage >= 50 ? 'text-yellow-500' :
                'text-red-500'
              }`}>
                {masteryPercentage}%
              </span>
            </div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${masteryPercentage}%` }}
                transition={{ duration: 1, type: "spring" }}
                className={`h-full bg-gradient-to-r ${
                  masteryPercentage >= 80 ? 'from-green-500 to-emerald-500' :
                  masteryPercentage >= 50 ? 'from-yellow-500 to-amber-500' :
                  'from-red-500 to-pink-500'
                }`}
              />
            </div>
            {masteryPercentage >= 80 && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-2 text-sm text-green-500 font-medium"
              >
                🎉 Excellent! Vous maîtrisez {masteryPercentage}% de votre vocabulaire!
              </motion.p>
            )}
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.3 }}
              whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
              className={`p-4 rounded-xl border backdrop-blur-sm ${
                darkMode
                  ? 'bg-gray-800/90 border-gray-700'
                  : 'bg-white/90 border-gray-200'
              } shadow-lg hover:shadow-xl transition-all duration-300`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Maîtrisés</p>
                  <p className="text-2xl font-bold text-green-500">{stats.mastered}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500 opacity-20" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
              className={`p-4 rounded-xl border backdrop-blur-sm ${
                darkMode
                  ? 'bg-gray-800/90 border-gray-700'
                  : 'bg-white/90 border-gray-200'
              } shadow-lg hover:shadow-xl transition-all duration-300`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>En cours</p>
                  <p className="text-2xl font-bold text-yellow-500">{stats.learning}</p>
                </div>
                <Timer className="w-8 h-8 text-yellow-500 opacity-20" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.3 }}
              whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setFilterMode('forgotten')}
              className={`p-4 rounded-xl border backdrop-blur-sm cursor-pointer ${
                darkMode
                  ? 'bg-gray-800/90 border-gray-700'
                  : 'bg-white/90 border-gray-200'
              } shadow-lg hover:shadow-xl transition-all duration-300 ${
                stats.forgotten > 5 ? 'ring-2 ring-red-500' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Oubliés</p>
                  <p className="text-2xl font-bold text-red-500">{stats.forgotten}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-500 opacity-20" />
              </div>
              {stats.forgotten > 5 && (
                <p className="text-xs text-red-500 mt-2">Cliquez pour réviser!</p>
              )}
            </motion.div>


            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.3 }}
              whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
              className={`p-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg hover:shadow-xl transition-all duration-300`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Révisés aujourd'hui</p>
                  <p className="text-2xl font-bold">{stats.todayReviewed}</p>
                </div>
                <Brain className="w-8 h-8 opacity-20" />
              </div>
            </motion.div>
          </div>

          {/* Badges Section */}
          <div className="mb-6">
            <h3 className={`text-lg font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              🏆 Vos badges
            </h3>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {badges.map((badge) => (
                <motion.div
                  key={badge.id}
                  whileHover={{ scale: badge.unlocked ? 1.1 : 1 }}
                  className={`relative flex-shrink-0 p-3 rounded-xl ${
                    badge.unlocked
                      ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white'
                      : darkMode ? 'bg-gray-800 text-gray-500' : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  <badge.icon className="w-8 h-8 mb-1" />
                  <p className="text-xs font-semibold">{badge.name}</p>
                  {!badge.unlocked && (
                    <div className="absolute inset-0 rounded-xl bg-black/50 flex items-center justify-center">
                      <p className="text-xs text-white font-medium">{Math.round(badge.progress)}%</p>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Header sticky : titre + recherche + A-Z */}
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4 py-4">
            {/* Gauche : titre */}
            <h1 className={`text-2xl font-semibold flex-shrink-0 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Vocabulaire
            </h1>

            {/* Milieu : barre de recherche */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id={`search-${searchId}`}
                name={`search-${searchId}`}
                type="text"
                role="searchbox"
                placeholder="Rechercher un mot ou une définition…"
                value={searchTerm}
                onChange={handleSearchChange}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setSearchTerm('');
                    setSortOrder('asc');
                  }
                }}
                className={`w-full pl-10 pr-10 py-2.5 rounded-lg border ${
                  darkMode
                    ? 'bg-gray-800 text-white border-gray-700'
                    : 'bg-white text-gray-900 border-gray-200'
                } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                aria-label="Rechercher un mot ou une définition"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setSortOrder('asc');
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  aria-label="Vider la recherche"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>

            {/* Droite : bouton A-Z avec rotation */}
            <motion.button
              type="button"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              animate={{ rotate: sortOrder === 'desc' ? 180 : 0 }}
              transition={{ duration: 0.3 }}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors
                ${darkMode
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
              aria-label={sortOrder === 'asc' ? 'Trier A-Z' : 'Trier Z-A'}
            >
              {sortOrder === 'asc' ? (
                <>
                  <ArrowDownAZ className="w-5 h-5" />
                  <span className="hidden sm:inline">A-Z</span>
                </>
              ) : (
                <>
                  <ArrowUpZA className="w-5 h-5" />
                  <span className="hidden sm:inline">Z-A</span>
                </>
              )}
            </motion.button>
          </div>

          {/* Sous-header : chips filtres */}
          <div className="pb-3 overflow-x-auto scrollbar-hide">
            <div className="flex gap-2">
              {(['all', 'forgotten', 'mastered', 'recent'] as const).map((mode) => {
                const labels: Record<typeof mode, string> = {
                  all: 'Tous',
                  forgotten: 'À réviser',
                  mastered: 'Maîtrisés',
                  recent: 'Récents'
                };
                return (
                  <button
                    key={mode}
                    onClick={() => setFilterMode(mode)}
                    className={`
                      flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap
                      ${filterMode === mode
                        ? 'bg-blue-500 text-white shadow-md'
                        : darkMode
                          ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }
                    `}
                    aria-label={`Filtrer par ${labels[mode]}`}
                  >
                    {labels[mode]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Zone résultats avec aria-live */}
        <div 
          className="mt-4"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <span className="sr-only">
            {filteredVocabulary.length} {filteredVocabulary.length === 1 ? 'mot trouvé' : 'mots trouvés'}
          </span>
        </div>

        {/* Add Word Form */}
        <AnimatePresence>
          {isAddingWord && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className={`mb-6 p-6 rounded-2xl border backdrop-blur-sm ${
                darkMode
                  ? 'bg-gray-800/90 border-gray-700'
                  : 'bg-white/90 border-gray-200'
              } shadow-lg`}
            >
              <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Ajouter un nouveau mot
              </h3>
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Mot ou expression *
                  </label>
                  <input
                    id={`term-${termId}`}
                    name={`term-${termId}`}
                    type="text"
                    placeholder="Ex: Apprentissage automatique"
                    value={newWord.term}
                    onChange={handleTermChange}
                    className={`w-full px-4 py-2 rounded-lg ${
                      darkMode
                        ? 'bg-gray-700 text-white border-gray-600'
                        : 'bg-gray-50 text-gray-900 border-gray-200'
                    } border focus:ring-2 focus:ring-blue-500`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Définition *
                  </label>
                  {/* ✅ LOGIQUE IDENTIQUE AUX NOTES: Même structure et classes CSS */}
                  <textarea
                    id={`definition-${definitionId}`}
                    name={`definition-${definitionId}`}
                    placeholder="Développez vos idées..."
                    value={newWord.definition}
                    onChange={handleDefinitionChange}
                    rows={6}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white resize-none"
                  />
                  <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                    {newWord.definition.length} / 10000 caractères
                  </p>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Exemple (optionnel)
                  </label>
                  <input
                    id={`example-${exampleId}`}
                    name={`example-${exampleId}`}
                    type="text"
                    placeholder="Ex: L'apprentissage automatique est utilisé en IA"
                    value={newWord.example}
                    onChange={handleExampleChange}
                    className={`w-full px-4 py-2 rounded-lg ${
                      darkMode
                        ? 'bg-gray-700 text-white border-gray-600'
                        : 'bg-gray-50 text-gray-900 border-gray-200'
                    } border focus:ring-2 focus:ring-blue-500`}
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🖱️ [NeuroVocabulary] Clic sur bouton Ajouter dans le formulaire');
                    console.log('📊 [NeuroVocabulary] État avant appel:', {
                      vocabularyLoading,
                      hasTerm: !!newWord.term,
                      hasDefinition: !!newWord.definition,
                    });
                    
                    // ✅ CORRECTION: Ne vérifier que vocabularyLoading, pas isAddingWord
                    // isAddingWord est l'état d'ouverture du formulaire, pas du chargement
                    if (vocabularyLoading) {
                      console.warn('⚠️ [NeuroVocabulary] Ajout déjà en cours, ignore le clic');
                      return;
                    }
                    
                    handleAddWord();
                  }}
                  disabled={vocabularyLoading}
                  className={`px-6 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium ${vocabularyLoading ? 'opacity-50 cursor-not-allowed' : 'hover:from-green-600 hover:to-emerald-600'}`}
                >
                  {vocabularyLoading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                      </svg>
                      Ajout...
                    </span>
                  ) : 'Ajouter'}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setIsAddingWord(false);
                    setNewWord({ term: '', definition: '', example: '' });
                  }}
                  className={`px-6 py-2 rounded-lg ${
                    darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  Annuler
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quiz Results Screen */}
        <AnimatePresence>
          {showQuizResults && quizAnswers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`mb-6 p-8 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-xl`}
            >
              {(() => {
                const totalQuestions = quizAnswers.length;
                const correctAnswers = quizAnswers.filter(a => a.correct).length;
                const percentage = Math.round((correctAnswers / totalQuestions) * 100);
                const isPerfect = percentage === 100;
                const isGood = percentage >= 80;
                const isMedium = percentage >= 60;

                // Feedback personnalisé basé sur le score
                let feedback = '';
                let feedbackColor = '';
                let icon = '';

                if (isPerfect) {
                  feedback = "Parfait ! Vous maîtrisez parfaitement ce vocabulaire ! 🌟";
                  feedbackColor = 'text-green-500';
                  icon = '🏆';
                } else if (isGood) {
                  feedback = "Excellent travail ! Vous êtes sur la bonne voie ! 💪";
                  feedbackColor = 'text-green-500';
                  icon = '✨';
                } else if (isMedium) {
                  feedback = "Bon résultat, mais vous pouvez encore vous améliorer. Continuez à réviser ! 📚";
                  feedbackColor = 'text-yellow-500';
                  icon = '📖';
                } else {
                  feedback = "Il faut encore travailler ce vocabulaire. Ne vous découragez pas ! 💡";
                  feedbackColor = 'text-orange-500';
                  icon = '🔥';
                }

                // Calculer le niveau de difficulté moyen du vocabulaire
                const avgDifficulty = vocabulary.reduce((acc, v) => acc + v.difficulty, 0) / vocabulary.length;
                const hasHarderWords = vocabulary.some(v => v.difficulty > avgDifficulty);

                return (
                  <div className="text-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", delay: 0.2 }}
                      className="text-6xl mb-4"
                    >
                      {icon}
                    </motion.div>

                    <h3 className={`text-3xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      Quiz Terminé !
                    </h3>

                    <div className="my-6">
                      <div className={`text-6xl font-bold mb-2 ${feedbackColor}`}>
                        {percentage}%
                      </div>
                      <p className={`text-lg ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {correctAnswers} / {totalQuestions} réponses correctes
                      </p>
                    </div>

                    {/* Barre de progression */}
                    <div className="w-full max-w-md mx-auto mb-6">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 1, delay: 0.3 }}
                          className={`h-full bg-gradient-to-r ${
                            isPerfect ? 'from-green-500 to-emerald-500' :
                            isGood ? 'from-blue-500 to-teal-500' :
                            isMedium ? 'from-yellow-500 to-amber-500' :
                            'from-orange-500 to-red-500'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Feedback personnalisé */}
                    <motion.p
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className={`text-lg font-medium mb-8 ${feedbackColor}`}
                    >
                      {feedback}
                    </motion.p>

                    {/* Détail des réponses */}
                    <div className="mb-8">
                      <h4 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        📋 Détail de vos réponses
                      </h4>
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {quizAnswers.map((answer, index) => (
                          <motion.div
                            key={answer.wordId}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.6 + index * 0.1 }}
                            className={`p-4 rounded-lg border-2 ${
                              answer.correct
                                ? darkMode
                                  ? 'bg-green-900/20 border-green-500'
                                  : 'bg-green-50 border-green-500'
                                : darkMode
                                  ? 'bg-red-900/20 border-red-500'
                                  : 'bg-red-50 border-red-500'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 text-left">
                                <div className="flex items-center gap-2 mb-2">
                                  {answer.correct ? (
                                    <CheckCircle className="w-5 h-5 text-green-500" />
                                  ) : (
                                    <XCircle className="w-5 h-5 text-red-500" />
                                  )}
                                  <span className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                    {answer.word}
                                  </span>
                                </div>
                                {!answer.correct && (
                                  <div className="space-y-1 text-sm">
                                    <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                                      <span className="font-medium">Votre réponse : </span>
                                      {answer.userAnswer.substring(0, 80)}
                                      {answer.userAnswer.length > 80 && '...'}
                                    </p>
                                    <p className="text-green-600 dark:text-green-400">
                                      <span className="font-medium">Bonne réponse : </span>
                                      {answer.correctAnswer.substring(0, 80)}
                                      {answer.correctAnswer.length > 80 && '...'}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    {/* Suggestion pour quiz plus difficile si score parfait */}
                    {isPerfect && hasHarderWords && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 1 }}
                        className={`mb-6 p-4 rounded-lg ${
                          darkMode ? 'bg-purple-900/30 border border-purple-500' : 'bg-purple-50 border border-purple-200'
                        }`}
                      >
                        <p className={`text-lg font-medium mb-3 ${darkMode ? 'text-purple-300' : 'text-purple-700'}`}>
                          🚀 Prêt pour un défi ?
                        </p>
                        <p className={`text-sm ${darkMode ? 'text-purple-200' : 'text-purple-600'}`}>
                          Vous avez parfaitement maîtrisé ce quiz ! Voulez-vous tester des mots plus difficiles ?
                        </p>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            setShowQuizResults(false);
                            setIsQuizMode(false);
                            setFilterMode('forgotten');
                            triggerReward('Passez aux mots oubliés pour un défi ! 🎯', { type: 'info' });
                          }}
                          className="mt-3 px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all duration-200"
                        >
                          Essayer un quiz plus difficile
                        </motion.button>
                      </motion.div>
                    )}

                    {/* Boutons d'action */}
                    <div className="flex justify-center gap-4">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setShowQuizResults(false);
                          startQuiz();
                        }}
                        className="px-6 py-3 bg-gradient-to-r from-blue-500 to-teal-500 text-white rounded-lg font-medium hover:shadow-lg transition-all duration-200"
                      >
                        Recommencer le quiz
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setShowQuizResults(false);
                          setIsQuizMode(false);
                        }}
                        className={`px-6 py-3 rounded-lg border-2 ${
                          darkMode
                            ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                            : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                        } font-medium transition-all duration-200`}
                      >
                        Retour au vocabulaire
                      </motion.button>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quiz Mode */}
        <AnimatePresence>
          {isQuizMode && !showQuizResults && vocabulary.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`mb-6 p-8 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-xl`}
            >
              <div className="text-center">
                <h3 className={`text-2xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Quiz Mode 🎯
                </h3>
                <p className={`text-lg mb-6 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Question {currentQuizIndex + 1} / {Math.min(vocabulary.length, 10)}
                </p>
                <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  {vocabulary[currentQuizIndex] ? (
                    <>
                      <p className={`text-xl font-medium mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {vocabulary[currentQuizIndex].word}
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Generate random options */}
                        {[true, false].map((isCorrect, idx) => {
                          // ✅ CORRECTION: S'assurer que la mauvaise réponse est différente de la bonne
                          let wrongIndex = Math.floor(Math.random() * vocabulary.length);
                          // Si la mauvaise réponse est la même que la bonne, prendre une autre
                          while (wrongIndex === currentQuizIndex && vocabulary.length > 1) {
                            wrongIndex = Math.floor(Math.random() * vocabulary.length);
                          }

                          const userAnswer = isCorrect
                            ? vocabulary[currentQuizIndex].definition
                            : vocabulary[wrongIndex]?.definition || 'Option';
                          const correctAnswer = vocabulary[currentQuizIndex].definition;

                          return (
                            <motion.button
                              key={idx}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => handleQuizAnswer(isCorrect, userAnswer, correctAnswer)}
                              className={`p-4 rounded-lg ${
                                darkMode
                                  ? 'bg-gray-600 hover:bg-gray-500 text-white'
                                  : 'bg-white hover:bg-gray-50 text-gray-900'
                              } shadow transition-all`}
                            >
                              {userAnswer}
                            </motion.button>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Erreur: Question non disponible
                    </p>
                  )}
                </div>
                <div className="mt-6 flex justify-center gap-4">
                  <button
                    onClick={() => setIsQuizMode(false)}
                    className={`px-6 py-2 rounded-lg ${
                      darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    Quitter le quiz
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Ne pas afficher la liste de vocabulaire pendant le quiz ou les résultats */}
        {!isQuizMode && !showQuizResults && (
          <>
            {selectedWord ? (
              <div className="animate-in fade-in duration-500">
                {renderSelectedWordPanel()}
              </div>
            ) : filteredVocabulary.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <BookOpen className={`w-16 h-16 mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
                <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {searchTerm ? 'Aucun mot trouvé' : 'Commencez à ajouter des mots!'}
                </p>
              </motion.div>
            ) : (
              <div className="relative">
                {/* Zone résultats avec aria-live */}
                <div 
                  className="sr-only" 
                  role="status" 
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {filteredVocabulary.length} {filteredVocabulary.length === 1 ? 'mot trouvé' : 'mots trouvés'}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-4">
                  <AnimatePresence mode="popLayout">
                    {filteredVocabulary.map((word, index) => {
                    // 4. Couleurs automatiques selon maîtrise
                    const masteryColor = word.mastery >= 80 
                      ? 'border-l-green-500' 
                      : word.mastery >= 50 
                        ? 'border-l-amber-500' 
                        : 'border-l-rose-500';
                    
                    // 3.2 Badge "À réviser" si dernière révision > 24h ET maîtrise < 80%
                    const lastReviewed = word.lastReviewed ? new Date(word.lastReviewed) : null;
                    const hoursSinceReview = lastReviewed 
                      ? (Date.now() - lastReviewed.getTime()) / (1000 * 60 * 60)
                      : Infinity;
                    const needsReview = hoursSinceReview > 24 && word.mastery < 80;
                    
                    // 5. Icône IA si généré par IA (supposons un champ isAIGenerated ou similaire)
                    const isAIGenerated = (word as any).isAIGenerated || false;
                    
                    // Définition pour affichage (tronquée à 120px visuellement)
                    const definitionText = (word.definition || '').trim();
                    
                    return (
                      <motion.div
                        key={word.id}
                        id={`vocab-${word.id}`}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ delay: index * 0.1, duration: 0.3 }}
                        className={`
                          relative rounded-lg border-l-4 border-r border-t border-b shadow-sm
                          transition-all duration-200 hover:shadow-md
                          ${darkMode
                            ? 'bg-gray-800 border-gray-700'
                            : 'bg-white border-gray-200'
                          }
                          ${masteryColor}
                        `}
                        tabIndex={0}
                        role="article"
                        aria-label={`Mot: ${word.word}`}
                      >
                        {/* 5. Icône IA en corner top-right */}
                        {isAIGenerated && (
                          <div className="absolute top-2 right-2 z-10">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-[10px] font-semibold">
                              IA
                            </span>
                          </div>
                        )}

                        {/* A. Header – mot + icône état + chevron accordion */}
                        <div 
                          className="p-4 pb-3 border-b border-gray-100 dark:border-gray-700 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedWords(prev => {
                              const newSet = new Set(prev);
                              if (newSet.has(word.id)) {
                                newSet.delete(word.id);
                              } else {
                                newSet.add(word.id);
                              }
                              return newSet;
                            });
                          }}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <h3 className={`
                              text-lg font-semibold flex-1
                              ${darkMode ? 'text-white' : 'text-gray-900'}
                            `}>
                              {word.word}
                            </h3>
                            <div className="flex items-center gap-2">
                              {/* Icône état selon maîtrise */}
                              {word.mastery >= 80 ? (
                                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" aria-label="Maîtrisé" />
                              ) : word.mastery >= 50 ? (
                                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" aria-label="En cours" />
                              ) : (
                                <XCircle className="w-5 h-5 text-rose-500 flex-shrink-0" aria-label="À réviser" />
                              )}
                              {/* Chevron accordion */}
                              <ChevronDown 
                                className={`
                                  w-5 h-5 transition-transform flex-shrink-0
                                  ${expandedWords.has(word.id) ? 'rotate-180' : ''}
                                  ${darkMode ? 'text-gray-400' : 'text-gray-500'}
                                `}
                              />
                            </div>
                          </div>
                        </div>

                        {/* B. Body – définition tronquée 120px + 1 exemple (toujours visible) */}
                        <div className="p-4 pt-3 space-y-2">
                          <p className={`
                            text-sm leading-relaxed
                            ${darkMode ? 'text-gray-300' : 'text-gray-700'}
                          `}
                          style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          >
                            {definitionText || 'Aucune définition enregistrée.'}
                          </p>
                          
                          {/* Exemple ou placeholder cliquable */}
                          {word.examples && word.examples.length > 0 && word.examples[0] ? (
                            <p className={`
                              text-xs italic
                              ${darkMode ? 'text-gray-400' : 'text-gray-600'}
                            `}>
                              Ex: {word.examples[0]}
                            </p>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditWord(word);
                              }}
                              className={`
                                text-xs italic underline transition-colors
                                ${darkMode ? 'text-gray-500 hover:text-gray-400' : 'text-gray-400 hover:text-gray-600'}
                              `}
                              aria-label="Ajouter un exemple"
                            >
                              Ajouter un exemple
                            </button>
                          )}
                        </div>

                        {/* Accordion : définition complète + exemple + actions (déplié) */}
                        <AnimatePresence>
                          {expandedWords.has(word.id) && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="px-4 pb-4 pt-0 space-y-3">
                                {/* Définition complète */}
                                <div>
                                  <p className={`
                                    text-sm leading-relaxed
                                    ${darkMode ? 'text-gray-300' : 'text-gray-700'}
                                  `}>
                                    {word.definition || 'Aucune définition enregistrée.'}
                                  </p>
                                </div>

                                {/* Exemple complet si présent */}
                                {word.examples && word.examples.length > 0 && word.examples[0] && (
                                  <div className={`
                                    p-2 rounded-lg
                                    ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}
                                  `}>
                                    <p className={`
                                      text-xs italic
                                      ${darkMode ? 'text-gray-400' : 'text-gray-600'}
                                    `}>
                                      Ex: {word.examples[0]}
                                    </p>
                                  </div>
                                )}

                                {/* Menu actions : Modifier / Marquer maîtrisé / Supprimer - Bien aligné dans l'accordion */}
                                <div className={`
                                  flex flex-wrap gap-2 pt-3 mt-3 border-t
                                  ${darkMode ? 'border-gray-700' : 'border-gray-200'}
                                `}>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditWord(word);
                                    }}
                                    className={`
                                      flex-1 min-w-[100px] sm:flex-initial px-3 py-2 rounded-lg text-sm font-medium transition-colors
                                      flex items-center justify-center gap-1.5
                                      ${darkMode
                                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                      }
                                    `}
                                    aria-label="Modifier le mot"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                    <span className="hidden sm:inline">Modifier</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleMastery(word);
                                    }}
                                    className={`
                                      flex-1 min-w-[100px] sm:flex-initial px-3 py-2 rounded-lg text-sm font-medium transition-colors
                                      flex items-center justify-center gap-1.5
                                      ${darkMode
                                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                      }
                                    `}
                                    aria-label={word.mastery >= 80 ? 'Marquer à revoir' : 'Marquer maîtrisé'}
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                    <span className="hidden sm:inline">{word.mastery >= 80 ? 'À revoir' : 'Maîtrisé'}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteWord(word);
                                    }}
                                    className={`
                                      flex-1 min-w-[100px] sm:flex-initial px-3 py-2 rounded-lg text-sm font-medium transition-colors
                                      flex items-center justify-center gap-1.5 text-red-600 dark:text-red-400
                                      ${darkMode
                                        ? 'bg-gray-700 hover:bg-gray-600'
                                        : 'bg-gray-100 hover:bg-gray-200'
                                      }
                                    `}
                                    aria-label="Supprimer le mot"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    <span className="hidden sm:inline">Supprimer</span>
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* C. Footer – badges uniquement */}
                        <div className="p-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Badge "À réviser" ou "Maîtrisé" */}
                            {needsReview ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-500 text-white">
                                À réviser
                              </span>
                            ) : word.mastery >= 80 ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500 text-white">
                                Maîtrisé
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </motion.div>
                    );
                    })}
                  </AnimatePresence>
                </div>

                {/* Index A-Z vertical (desktop uniquement) */}
                {filteredVocabulary.length > 0 && (
                  <>
                    {/* Desktop : index A-Z vertical fixe droite */}
                    <div className="hidden lg:block fixed right-6 top-1/2 transform -translate-y-1/2 z-20">
                      <div className={`
                        flex flex-col gap-1 p-2 rounded-lg shadow-lg
                        ${darkMode ? 'bg-gray-800' : 'bg-white'}
                      `}>
                        {Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)).map((letter) => {
                          const firstWordWithLetter = filteredVocabulary.find(w => 
                            normalizeText(w.word).charAt(0) === letter.toLowerCase()
                          );
                          return (
                            <button
                              key={letter}
                              type="button"
                              onClick={() => {
                                if (firstWordWithLetter) {
                                  const element = document.getElementById(`vocab-${firstWordWithLetter.id}`);
                                  if (element) {
                                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                  }
                                }
                              }}
                              className={`
                                w-6 h-6 text-xs font-medium rounded transition-colors
                                ${firstWordWithLetter
                                  ? darkMode
                                    ? 'text-gray-300 hover:text-white hover:bg-gray-700'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                  : darkMode
                                    ? 'text-gray-600 cursor-not-allowed'
                                    : 'text-gray-300 cursor-not-allowed'
                                }
                              `}
                              disabled={!firstWordWithLetter}
                              aria-label={`Aller aux mots commençant par ${letter}`}
                            >
                              {letter}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Mobile : bouton jump-to-top */}
                    <motion.button
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                      className={`
                        lg:hidden fixed bottom-20 right-6 w-12 h-12 rounded-full shadow-lg
                        flex items-center justify-center z-30
                        ${darkMode
                          ? 'bg-gray-800 text-gray-300'
                          : 'bg-white text-gray-700'
                        }
                      `}
                      aria-label="Retour en haut"
                    >
                      <ArrowUpToLine className="w-5 h-5" />
                    </motion.button>
                  </>
                )}
              </div>
            )}
          </>
        )}

        {/* Intelligent Reminder */}
        {stats.forgotten > 3 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-6 right-6 p-4 rounded-lg bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-xl"
          >
            <div className="flex items-center gap-3">
              <Brain className="w-6 h-6" />
              <div>
                <p className="font-semibold">Rappel intelligent</p>
                <p className="text-sm opacity-90">
                  {stats.forgotten} mots oubliés à réviser
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setFilterMode('forgotten')}
                className="px-3 py-1 bg-white/20 rounded-lg hover:bg-white/30"
              >
                Réviser
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Modal d'édition */}
        <AnimatePresence>
          {editingWord && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setEditingWord(null);
                }
              }}
              onWheel={(e) => {
                // Empêcher le scroll de l'arrière-plan
                e.stopPropagation();
                e.preventDefault();
              }}
              onTouchMove={(e) => {
                // Empêcher le scroll tactile sur l'arrière-plan
                if (e.target === e.currentTarget) {
                  e.preventDefault();
                }
              }}
              onMouseDown={(e) => {
                // Empêcher la sélection de texte sur l'arrière-plan
                if (e.target === e.currentTarget) {
                  e.preventDefault();
                }
              }}
              style={{ 
                userSelect: 'none',
                WebkitUserSelect: 'none',
                MozUserSelect: 'none',
                msUserSelect: 'none',
                overscrollBehavior: 'contain'
              }}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                onWheel={(e) => {
                  // Permettre le scroll dans le modal, mais empêcher la propagation au backdrop
                  e.stopPropagation();
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchMove={(e) => {
                  // Permettre le scroll tactile dans le modal
                  e.stopPropagation();
                }}
                className={`
                  max-w-xl w-full mx-auto rounded-lg shadow-xl
                  p-4 sm:p-6 max-h-[90vh] overflow-y-auto
                  ${darkMode ? 'bg-gray-800' : 'bg-white'}
                  relative z-10
                `}
                style={{ 
                  userSelect: 'auto',
                  WebkitUserSelect: 'auto',
                  MozUserSelect: 'auto',
                  msUserSelect: 'auto',
                  overscrollBehavior: 'contain'
                }}
              >
                {/* 2. Titre avec Aide IA aligné à droite */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Modifier le mot
                  </h2>
                  <div className="relative inline-block">
                    <AIContentHelper
                      content={editingWord.definition || ''}
                      title={editingWord.word}
                      contentType="vocabulaire"
                      onApply={(improvedContent) => {
                        setEditingWord({ ...editingWord, definition: improvedContent });
                        triggerReward('Définition améliorée avec l\'IA ✨', { type: 'success' });
                      }}
                      darkMode={darkMode}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  {/* 3. Grid 2 colonnes desktop / 1 colonne mobile */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Colonne 1 : Mot ou expression */}
                    <div>
                      <label 
                        className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}
                        htmlFor="edit-word-input"
                      >
                        Mot ou expression *
                      </label>
                      <input
                        id="edit-word-input"
                        type="text"
                        value={editingWord.word}
                        onChange={(e) => setEditingWord({ ...editingWord, word: e.target.value })}
                        className={`
                          w-full px-4 py-2.5 rounded-lg border
                          ${darkMode
                            ? 'bg-gray-700 text-white border-gray-600'
                            : 'bg-gray-50 text-gray-900 border-gray-200'
                          }
                          focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                        `}
                        aria-label="Mot ou expression"
                        aria-required="true"
                      />
                    </div>

                    {/* Colonne 2 : Difficulté */}
                    <div>
                      <label 
                        className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}
                        htmlFor="edit-difficulty-slider"
                      >
                        Difficulté
                      </label>
                      <div className="space-y-2">
                        <input
                          id="edit-difficulty-slider"
                          type="range"
                          min="1"
                          max="5"
                          value={editingWord.difficulty}
                          onChange={(e) => setEditingWord({ ...editingWord, difficulty: parseInt(e.target.value) as 1 | 2 | 3 | 4 | 5 })}
                          className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                          aria-label="Niveau de difficulté"
                        />
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                          <span>Facile</span>
                          <span>Difficile</span>
                        </div>
                        <div className="text-center text-sm font-medium text-blue-600 dark:text-blue-400">
                          {editingWord.difficulty}/5
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 4. Définition */}
                  <div>
                    <label 
                      className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}
                      htmlFor="edit-definition-textarea"
                    >
                      Définition *
                    </label>
                    <textarea
                      ref={definitionTextareaRef}
                      id="edit-definition-textarea"
                      value={editingWord.definition}
                      onChange={(e) => {
                        setEditingWord({ ...editingWord, definition: e.target.value });
                        adjustTextareaHeight(definitionTextareaRef.current, 3, 12);
                      }}
                      onFocus={(e) => adjustTextareaHeight(e.currentTarget, 3, 12)}
                      rows={3}
                      placeholder="Définissez le mot en une phrase…"
                      className={`
                        w-full px-4 py-3 rounded-lg border resize-none
                        ${darkMode
                          ? 'bg-gray-700 text-white border-gray-600'
                          : 'bg-gray-50 text-gray-900 border-gray-200'
                        }
                        focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                        transition-all duration-200
                      `}
                      aria-label="Définition"
                      aria-required="true"
                    />
                    {/* Bouton "Voir en contexte" juste après le champ Définition */}
                    {editingWord.word && editingWord.definition && (
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const response = await fetch('/.netlify/functions/improve-content', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  action: 'enrichir',
                                  contentType: 'vocabulaire',
                                  content: `Génère une phrase complète utilisant le mot "${editingWord.word}" avec la définition "${editingWord.definition}".`,
                                  title: editingWord.word,
                                }),
                              });
                              const data = await response.json();
                              if (data.success && data.improved) {
                                setContextSentence(data.improved);
                              }
                            } catch (error) {
                              console.error('Erreur génération contexte:', error);
                            }
                          }}
                          className={`
                            inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors
                            ${darkMode
                              ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                            }
                          `}
                          aria-label="Voir en contexte"
                        >
                          <Search className="w-4 h-4" />
                          Voir en contexte
                        </button>
                      </div>
                    )}
                    {/* Affichage de la phrase générée en italique */}
                    {contextSentence && (
                      <p className={`
                        mt-2 text-sm italic
                        ${darkMode ? 'text-gray-400' : 'text-gray-600'}
                      `}>
                        {contextSentence}
                      </p>
                    )}
                  </div>

                  {/* 5. Exemples */}
                  <div>
                    <label 
                      className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}
                      htmlFor="edit-examples-textarea"
                    >
                      Exemples
                    </label>
                    <textarea
                      ref={examplesTextareaRef}
                      id="edit-examples-textarea"
                      value={Array.isArray(editingWord.examples) ? editingWord.examples.join(', ') : ''}
                      onChange={(e) => {
                        setEditingWord({
                          ...editingWord,
                          examples: e.target.value.split(',').map(ex => ex.trim()).filter(Boolean)
                        });
                        // Ajuster la hauteur uniquement si du contenu est présent
                        if (e.target.value.trim()) {
                          adjustTextareaHeight(examplesTextareaRef.current, 2, 8);
                        } else {
                          adjustTextareaHeight(examplesTextareaRef.current, 2, 2);
                        }
                      }}
                      onFocus={(e) => {
                        if (e.target.value.trim()) {
                          adjustTextareaHeight(e.currentTarget, 2, 8);
                        }
                      }}
                      rows={2}
                      placeholder="Ex. : Le client a changé le vocabulaire de la dernière minute. (optionnel)"
                      className={`
                        w-full px-4 py-2.5 rounded-lg border resize-none
                        ${darkMode
                          ? 'bg-gray-700 text-white border-gray-600 placeholder-gray-500'
                          : 'bg-gray-50 text-gray-900 border-gray-200 placeholder-gray-400'
                        }
                        focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                        transition-all duration-200
                      `}
                      aria-label="Exemples d'utilisation"
                    />
                  </div>

                  {/* 6. Maîtrise : 5 étoiles cliquables + pourcentage live */}
                  <div>
                    <label 
                      className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}
                      htmlFor="edit-mastery-stars"
                    >
                      Maîtrise
                    </label>
                    <div 
                      id="edit-mastery-stars"
                      className="flex items-center gap-2"
                      role="group"
                      aria-label="Niveau de maîtrise"
                    >
                      {[1, 2, 3, 4, 5].map((star) => {
                        const starValue = star * 20; // 20, 40, 60, 80, 100
                        const isFilled = editingWord.mastery >= starValue;
                        return (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setEditingWord({ ...editingWord, mastery: starValue })}
                            className={`
                              w-11 h-11 flex items-center justify-center rounded-lg transition-all
                              ${isFilled
                                ? 'text-yellow-400'
                                : darkMode ? 'text-gray-600' : 'text-gray-300'
                              }
                              hover:scale-110 hover:bg-gray-100 dark:hover:bg-gray-700
                            `}
                            aria-label={`Maîtrise ${starValue}%`}
                          >
                            <Star 
                              className="w-6 h-6" 
                              fill={isFilled ? 'currentColor' : 'none'}
                            />
                          </button>
                        );
                      })}
                      <span className={`
                        ml-2 text-sm font-medium
                        ${darkMode ? 'text-gray-300' : 'text-gray-700'}
                      `}>
                        {editingWord.mastery}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* 7. Actions */}
                <div className="flex flex-col sm:flex-row justify-between gap-3 mt-6">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setEditingWord(null)}
                    className={`
                      w-full sm:w-auto px-6 h-11 rounded-lg font-medium transition-colors
                      ${darkMode 
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }
                    `}
                    aria-label="Annuler la modification"
                  >
                    Annuler
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSaveEdit}
                    disabled={vocabularyLoading}
                    className={`
                      w-full sm:w-auto sm:max-w-xs px-6 h-11 rounded-lg
                      bg-gradient-to-r from-blue-500 to-teal-500 text-white font-medium
                      ${vocabularyLoading 
                        ? 'opacity-50 cursor-not-allowed' 
                        : 'hover:from-blue-600 hover:to-teal-600'
                      }
                      transition-all
                    `}
                    aria-label="Enregistrer les modifications"
                  >
                    {vocabularyLoading ? 'Enregistrement...' : 'Enregistrer'}
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal de confirmation de suppression */}
        <AnimatePresence>
          {wordToDelete && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setWordToDelete(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className={`max-w-md w-full p-6 rounded-2xl ${
                  darkMode ? 'bg-gray-800' : 'bg-white'
                } shadow-2xl`}
              >
                <div className="text-center mb-6">
                  <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                    <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
                  </div>
                  <h2 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Confirmer la suppression
                  </h2>
                  <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Êtes-vous sûr de vouloir supprimer "<strong>{wordToDelete.word}</strong>" ?
                  </p>
                  <p className={`text-sm mt-2 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                    Cette action est irréversible.
                  </p>
                </div>

                <div className="flex gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={confirmDelete}
                    disabled={vocabularyLoading}
                    className={`flex-1 px-6 py-3 rounded-lg bg-gradient-to-r from-red-500 to-pink-500 text-white font-medium ${
                      vocabularyLoading ? 'opacity-50 cursor-not-allowed' : 'hover:from-red-600 hover:to-pink-600'
                    }`}
                  >
                    {vocabularyLoading ? 'Suppression...' : 'Oui, supprimer'}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setWordToDelete(null)}
                    className={`px-6 py-3 rounded-lg ${
                      darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    Annuler
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Flashcard Mode - Rendu via Portal pour éviter les unmounts */}
        {isFlashcardMode && ReactDOM.createPortal(
          <FlashcardMode
            vocabulary={flashcardVocabulary.length > 0 ? flashcardVocabulary : vocabulary}
            darkMode={darkMode}
            onClose={handleFlashcardClose}
            onUpdateMastery={handleFlashcardUpdateMastery}
          />,
          document.body
        )}

        {/* 7. FAB rond fixe pour "Ajouter" */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsAddingWord(true)}
          className={`
            fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg
            flex items-center justify-center z-40
            bg-gradient-to-r from-blue-500 to-teal-500 text-white
            hover:from-blue-600 hover:to-teal-600
            transition-all duration-300
            group
          `}
          aria-label="Ajouter un nouveau mot"
          title="Nouveau mot"
        >
          <Plus className="w-6 h-6" />
          <span className="absolute right-full mr-3 px-3 py-1 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Nouveau mot
          </span>
        </motion.button>
      </div>
    </div>
  );
}
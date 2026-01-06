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
  ArrowUpZA,
  Loader2
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
import { EmptyVocabularyAlert } from './EmptyVocabularyAlert';
import { AlphaFilter } from './AlphaFilter';
import { AlphaFilterVertical } from './AlphaFilterVertical';
import { useQuotaLimit } from '../../hooks/useQuotaLimit';
import { supabase } from '../../lib/supabase';
import { GhostTextArea, GhostInput } from '../../features/ghost-text';

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
  const { addVocabularyEntry, updateVocabularyEntry, deleteVocabularyEntry, loading: vocabularyLoading, quotaModal } = useVocabulary();
  const { triggerReward, focusAttention, pulseEffect } = useNeuroFeedback();
  const { checkAndShowModal: checkQuotaWithModal } = useQuotaLimit();
  
  // ✅ Tous les useState en un seul bloc
  const [isAddingWord, setIsAddingWord] = useState(false);
  const [newWord, setNewWord] = useState({ term: '', definition: '', example: '' });
  const [selectedWord, setSelectedWord] = useState<VocabularyEntry | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'mastered' | 'forgotten' | 'recent'>('all');
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null); // Filtre alphabétique
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
  const [originalWord, setOriginalWord] = useState<VocabularyEntry | null>(null); // Pour détecter les modifications
  const [wordToDelete, setWordToDelete] = useState<VocabularyEntry | null>(null);

  // États pour l'accordion et le menu (3.1, 3.3)
  const [expandedWords, setExpandedWords] = useState<Set<string>>(new Set());
  const [showWordMenu, setShowWordMenu] = useState<string | null>(null);

  // États pour le mode édition (4.2, 4.4)
  const [contextSentence, setContextSentence] = useState<string>('');
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const [showAIVocabMenu, setShowAIVocabMenu] = useState(false);
  const [showEmptyVocabAlert, setShowEmptyVocabAlert] = useState(false);
  const [emptyField, setEmptyField] = useState<'term' | 'definition'>('term');
  const [hasAIAccess, setHasAIAccess] = useState(false);

  // Refs pour les textareas avec hauteur dynamique
  const definitionTextareaRef = React.useRef<HTMLTextAreaElement>(null);
  const examplesTextareaRef = React.useRef<HTMLTextAreaElement>(null);
  const termInputRef = React.useRef<HTMLInputElement>(null);
  // Ref pour le champ définition dans le formulaire d'ajout
  const newDefinitionTextareaRef = React.useRef<HTMLTextAreaElement>(null);

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
  // Debug: logger l'état de chargement (seulement en développement et seulement les changements importants)
  // Supprimé pour améliorer les performances - trop de logs ralentissent l'application
  
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
    
    // Calculer le streak (jours consécutifs de révision)
    const calculateStreak = (): number => {
      if (vocabulary.length === 0) return 0;
      
      // Récupérer toutes les dates de révision uniques (par jour, format YYYY-MM-DD)
      const reviewDates = new Set<string>();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];
      
      vocabulary.forEach(word => {
        if (word.lastReviewed) {
          const reviewDate = new Date(word.lastReviewed);
          reviewDate.setHours(0, 0, 0, 0);
          const dateStr = reviewDate.toISOString().split('T')[0];
          // Ne compter que les révisions des 30 derniers jours pour optimiser
          const daysDiff = Math.floor((today.getTime() - reviewDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysDiff >= 0 && daysDiff <= 30) {
            reviewDates.add(dateStr);
          }
        }
      });
      
      if (reviewDates.size === 0) return 0;
      
      // Calculer le streak en remontant depuis aujourd'hui
      let streak = 0;
      let checkDate = new Date(today);
      
      // Vérifier si aujourd'hui a une révision
      if (reviewDates.has(todayStr)) {
        streak = 1;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        // Si pas de révision aujourd'hui, commencer depuis hier
        checkDate.setDate(checkDate.getDate() - 1);
      }
      
      // Continuer à remonter tant qu'on trouve des jours consécutifs
      while (streak < 30) { // Limite à 30 jours pour éviter les boucles infinies
        const dateStr = checkDate.toISOString().split('T')[0];
        
        if (reviewDates.has(dateStr)) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          // Jour manquant, le streak s'arrête
          break;
        }
      }
      
      return streak;
    };
    
    // Calculer le nombre de mots révisés aujourd'hui
    const calculateTodayReviewed = (): number => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];
      
      return vocabulary.filter(word => {
        if (!word.lastReviewed) return false;
        const reviewDate = new Date(word.lastReviewed);
        reviewDate.setHours(0, 0, 0, 0);
        const reviewDateStr = reviewDate.toISOString().split('T')[0];
        return reviewDateStr === todayStr;
      }).length;
    };
    
    return {
      mastered,
      learning,
      forgotten,
      total: vocabulary.length,
      streakDays: calculateStreak(),
      todayReviewed: calculateTodayReviewed()
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

    // Apply letter filter - filtrage instantané côté front
    if (selectedLetter) {
      filtered = filtered.filter(v => 
        normalizeText(v.word).charAt(0) === selectedLetter.toLowerCase()
      );
    }

    // Tri alphabétique (sauf pour 'recent' qui est déjà trié)
    if (filterMode !== 'recent') {
      filtered.sort((a, b) => {
        const aWord = normalizeText(a.word).trim();
        const bWord = normalizeText(b.word).trim();
        // Tri fluide avec localeCompare pour gérer les accents
        const comparison = aWord.localeCompare(bWord, 'fr', { 
          sensitivity: 'base',
          numeric: true 
        });
        return sortOrder === 'asc' ? comparison : -comparison;
      });
    }

    return filtered;
  }, [vocabulary, filterMode, debouncedSearchTerm, sortOrder, selectedLetter]);

  // Calculer les compteurs de mots par lettre (basé sur le vocabulaire filtré AVANT le filtre de lettre)
  const letterWordCounts = useMemo(() => {
    const counts = new Map<string, number>();
    
    // Créer un vocabulaire filtré sans le filtre de lettre pour avoir les vrais compteurs
    let baseFiltered = [...vocabulary];
    
    // Appliquer les mêmes filtres que filteredVocabulary mais SANS le filtre de lettre
    switch (filterMode) {
      case 'mastered':
        baseFiltered = baseFiltered.filter(v => v.mastery >= 80);
        break;
      case 'forgotten':
        baseFiltered = baseFiltered.filter(v => {
          const lastReviewed = v.lastReviewed ? new Date(v.lastReviewed) : null;
          const hoursSinceReview = lastReviewed 
            ? (Date.now() - lastReviewed.getTime()) / (1000 * 60 * 60)
            : Infinity;
          return hoursSinceReview > 24 && v.mastery < 80;
        });
        break;
      case 'recent':
        baseFiltered = baseFiltered
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

    if (debouncedSearchTerm) {
      const searchNormalized = normalizeText(debouncedSearchTerm);
      baseFiltered = baseFiltered.filter(v =>
        normalizeText(v.word).includes(searchNormalized) ||
        normalizeText(v.definition).includes(searchNormalized)
      );
    }

    // Compter les mots par lettre
    baseFiltered.forEach(word => {
      const firstLetter = normalizeText(word.word).charAt(0).toUpperCase();
      if (firstLetter && /[A-Z]/.test(firstLetter)) {
        counts.set(firstLetter, (counts.get(firstLetter) || 0) + 1);
      }
    });

    return counts;
  }, [vocabulary, filterMode, debouncedSearchTerm]);

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

  // Vérifier s'il y a des modifications non sauvegardées
  const hasUnsavedChanges = useCallback((): boolean => {
    if (!editingWord || !originalWord) return false;

    return (
      editingWord.word !== originalWord.word ||
      editingWord.definition !== originalWord.definition ||
      editingWord.difficulty !== originalWord.difficulty ||
      editingWord.mastery !== originalWord.mastery ||
      JSON.stringify(editingWord.examples) !== JSON.stringify(originalWord.examples)
    );
  }, [editingWord, originalWord]);

  // Fermer la modal avec confirmation si nécessaire
  const handleCloseEdit = useCallback(() => {
    if (hasUnsavedChanges()) {
      const confirmClose = window.confirm(
        'Vous avez des modifications non sauvegardées. Voulez-vous vraiment fermer sans sauvegarder ?'
      );
      if (!confirmClose) return;
    }

    setEditingWord(null);
    setOriginalWord(null);
    setContextSentence('');
  }, [hasUnsavedChanges]);

  // 🔄 Réinitialiser contextSentence et isLoadingContext quand on ouvre/ferme la modal
  useEffect(() => {
    if (!editingWord) {
      setContextSentence(''); // Reset quand la modal se ferme
      setIsLoadingContext(false); // Reset l'état de chargement
    }
  }, [editingWord]);

  // 🔒 BLOCAGE COMPLET DU BACKGROUND quand modal d'édition ouverte
  useEffect(() => {
    if (!editingWord) return;

    // Ajouter la classe modal-open sur <html>
    document.documentElement.classList.add('modal-open');

    // Ajouter le style global si pas déjà présent
    if (!document.getElementById('modal-open-styles')) {
      const style = document.createElement('style');
      style.id = 'modal-open-styles';
      style.textContent = `
        .modal-open body {
          max-height: 100vh;
          overflow: hidden;
          user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          pointer-events: none;
        }
        .modal-open .modal-content-wrapper {
          pointer-events: auto;
          user-select: auto;
          -webkit-user-select: auto;
          -moz-user-select: auto;
          -ms-user-select: auto;
        }
      `;
      document.head.appendChild(style);
    }

    return () => {
      // Retirer la classe quand la modal se ferme
      document.documentElement.classList.remove('modal-open');
    };
  }, [editingWord]);

  // ⌨️ GESTION DE LA TOUCHE ÉCHAP pour fermer la modal
  useEffect(() => {
    if (!editingWord) return;

    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseEdit();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [editingWord, handleCloseEdit]);

  // 🚀 PERFORMANCE: Mémoïser les handlers pour éviter les re-renders inutiles
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  const handleTermChange = useCallback((value: string) => {
    setNewWord(prev => ({ ...prev, term: value }));
  }, []);

  // ✅ LOGIQUE IDENTIQUE AUX NOTES: Handler simple et direct pour la définition
  const handleDefinitionChange = useCallback((value: string) => {
    setNewWord(prev => ({ ...prev, definition: value }));
  }, []);

  const handleExampleChange = useCallback((value: string) => {
    setNewWord(prev => ({ ...prev, example: value }));
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
    // Validation des champs vides avec suggestion IA
    if (!newWord.term || !newWord.term.trim()) {
      const hasAccess = await checkQuotaWithModal('ai_help', 0); // Check sans incrémenter
      setHasAIAccess(hasAccess);
      setEmptyField('term');
      setShowEmptyVocabAlert(true);
      return;
    }

    if (!newWord.definition || !newWord.definition.trim()) {
      const hasAccess = await checkQuotaWithModal('ai_help', 0); // Check sans incrémenter
      setHasAIAccess(hasAccess);
      setEmptyField('definition');
      setShowEmptyVocabAlert(true);
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

  // Fonction pour générer une définition avec l'IA
  const handleGenerateDefinitionWithAI = async () => {
    if (!newWord.term || !newWord.term.trim()) {
      triggerReward('Veuillez d\'abord saisir un mot ⚠️', { type: 'error' });
      return;
    }

    try {
      setIsLoadingContext(true);

      // Appel à l'API AI pour générer une définition
      const prompt = `Génère une définition claire et concise du mot suivant en français : "${newWord.term}".
      La définition doit être pédagogique et facile à comprendre, en 2-3 phrases maximum.`;

      // Récupérer le token d'authentification
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      // Utiliser l'URL Supabase Edge Function (compatible local et production)
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
      const apiUrl = `${supabaseUrl}/functions/v1/ai-chat`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          question: prompt
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Erreur API:', errorData);
        throw new Error(errorData.error || 'Erreur lors de la génération de la définition');
      }

      const data = await response.json();
      const generatedDefinition = data.reply || data.response || data.message || '';

      if (generatedDefinition) {
        setNewWord(prev => ({ ...prev, definition: generatedDefinition }));
        triggerReward('Définition générée avec succès ! ✨', { type: 'reward' });
      } else {
        throw new Error('Aucune définition générée');
      }
    } catch (error) {
      console.error('Erreur génération définition:', error);
      triggerReward('Erreur lors de la génération ❌', { type: 'error' });
    } finally {
      setIsLoadingContext(false);
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

  // Marquer un mot comme "À réviser" (mastery < 80)
  const handleMarkForReview = async (word: VocabularyEntry, e: React.MouseEvent) => {
    e.stopPropagation(); // Empêcher l'ouverture de l'accordion
    
    // Si le mot est déjà à réviser, ne rien faire
    const lastReviewed = word.lastReviewed ? new Date(word.lastReviewed) : null;
    const hoursSinceReview = lastReviewed 
      ? (Date.now() - lastReviewed.getTime()) / (1000 * 60 * 60)
      : Infinity;
    const alreadyNeedsReview = hoursSinceReview > 24 && word.mastery < 80;
    
    if (alreadyNeedsReview) {
      return; // Déjà marqué comme à réviser
    }

    // Marquer comme à réviser : mettre mastery à 0 et lastReviewed à une date ancienne
    const updated = { 
      ...word, 
      mastery: 0,
      lastReviewed: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString() // 25 heures avant
    };

    try {
      const success = await updateVocabularyEntry(updated);
      if (success) {
        triggerReward(`"${word.word}" marqué à réviser 🔄`, { type: 'info' });
      }
    } catch (error) {
      console.error('Erreur lors du marquage à réviser:', error);
      triggerReward('Erreur lors du marquage ❌', { type: 'error' });
    }
  };

  // Ouvrir le modal d'édition
  const handleEditWord = useCallback((word: VocabularyEntry) => {
    setEditingWord(word);
    setOriginalWord(JSON.parse(JSON.stringify(word))); // Deep copy pour comparaison
    // Fermer le formulaire d'ajout si ouvert
    setIsAddingWord(false);
  }, []);

  // Sauvegarder les modifications
  const handleSaveEdit = useCallback(async () => {
    if (!editingWord) return;

    // ✅ VALIDATION DES CHAMPS OBLIGATOIRES
    const trimmedWord = editingWord.word?.trim() || '';
    const trimmedDefinition = editingWord.definition?.trim() || '';

    if (!trimmedWord) {
      triggerReward('Le mot est obligatoire ⚠️', { type: 'error' });
      return;
    }

    if (!trimmedDefinition) {
      triggerReward('La définition est obligatoire ⚠️', { type: 'error' });
      return;
    }

    try {
      const success = await updateVocabularyEntry(editingWord);
      if (success) {
        setEditingWord(null);
        setOriginalWord(null); // Réinitialiser aussi l'original
        setSelectedWord(null);
        setContextSentence(''); // Réinitialiser le contexte
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

          {/* Mastery Progress Bar - Marges réduites */}
          <div className="mb-4">
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

          {/* Stats Cards - Compact */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.3 }}
              whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
              className={`p-3 rounded-lg border backdrop-blur-sm ${
                darkMode
                  ? 'bg-gray-800/90 border-gray-700'
                  : 'bg-white/90 border-gray-200'
              } shadow-sm hover:shadow-md transition-all duration-200`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Maîtrisés</p>
                  <p className="text-xl font-bold text-green-500">{stats.mastered}</p>
                </div>
                <CheckCircle className="w-6 h-6 text-green-500 opacity-20" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
              className={`p-3 rounded-lg border backdrop-blur-sm ${
                darkMode
                  ? 'bg-gray-800/90 border-gray-700'
                  : 'bg-white/90 border-gray-200'
              } shadow-sm hover:shadow-md transition-all duration-200`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>En cours</p>
                  <p className="text-xl font-bold text-yellow-500">{stats.learning}</p>
                </div>
                <Timer className="w-6 h-6 text-yellow-500 opacity-20" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.3 }}
              whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setFilterMode('forgotten')}
              className={`p-3 rounded-lg border backdrop-blur-sm cursor-pointer ${
                darkMode
                  ? 'bg-gray-800/90 border-gray-700'
                  : 'bg-white/90 border-gray-200'
              } shadow-sm hover:shadow-md transition-all duration-200 ${
                stats.forgotten > 5 ? 'ring-2 ring-red-500' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Oubliés</p>
                  <p className="text-xl font-bold text-red-500">{stats.forgotten}</p>
                </div>
                <AlertTriangle className="w-6 h-6 text-red-500 opacity-20" />
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

          {/* Badges Section + Boutons Quiz/Révision - Compact avec tooltips */}
          <div className="mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Badges de performance */}
              {badges.map((badge) => (
                <div
                  key={badge.id}
                  className="relative group"
                  title={`${badge.name}: ${badge.description}${!badge.unlocked ? ` (${Math.round(badge.progress)}%)` : ''}`}
                >
                  <motion.button
                    whileHover={{ scale: badge.unlocked ? 1.05 : 1 }}
                    whileTap={{ scale: 0.95 }}
                    className={`
                      relative flex items-center gap-1 px-1.5 py-1 rounded-lg transition-all text-xs
                      ${badge.unlocked
                        ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-sm'
                        : darkMode ? 'bg-gray-800 text-gray-500' : 'bg-gray-200 text-gray-400'
                      }
                    `}
                    aria-label={`${badge.name}: ${badge.description}`}
                  >
                    <badge.icon className="w-3.5 h-3.5" />
                    <span className="font-semibold hidden sm:inline">{badge.name}</span>
                    {!badge.unlocked && (
                      <span className="text-[10px] font-medium opacity-75">
                        {Math.round(badge.progress)}%
                      </span>
                    )}
                  </motion.button>
                  {/* Tooltip */}
                  <div className={`
                    absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 rounded-md text-xs
                    whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50
                    ${darkMode ? 'bg-gray-800 text-white' : 'bg-gray-900 text-white'}
                  `}>
                    {badge.description}
                    {!badge.unlocked && ` (${Math.round(badge.progress)}%)`}
                    <div className={`
                      absolute top-full left-1/2 transform -translate-x-1/2 -mt-1
                      border-4 border-transparent border-t-current
                      ${darkMode ? 'text-gray-800' : 'text-gray-900'}
                    `} />
                  </div>
                </div>
              ))}

              {/* Séparateur */}
              {badges.length > 0 && <div className={`h-6 w-px ${darkMode ? 'bg-gray-700' : 'bg-gray-300'}`} />}

              {/* Bouton Quiz Rapide */}
              <motion.button
                onClick={() => {
                  if (vocabulary.length < 4) {
                    triggerReward('Ajoutez au moins 4 mots pour le quiz!', { type: 'warning' });
                  } else {
                    startQuiz();
                  }
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`
                  flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all text-xs font-medium
                  ${darkMode
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }
                  shadow-sm
                `}
                title="Lancez un quiz rapide de 10 questions"
              >
                <Target className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Quiz</span>
              </motion.button>

              {/* Bouton Mode Révision (Flashcards) */}
              <motion.button
                onClick={() => {
                  if (vocabulary.length === 0) {
                    triggerReward('Ajoutez des mots pour réviser!', { type: 'warning' });
                  } else {
                    setFlashcardVocabulary(vocabulary);
                    setIsFlashcardMode(true);
                  }
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`
                  flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all text-xs font-medium
                  ${darkMode
                    ? 'bg-purple-600 hover:bg-purple-700 text-white'
                    : 'bg-purple-500 hover:bg-purple-600 text-white'
                  }
                  shadow-sm
                `}
                title="Mode révision avec flashcards interactives"
              >
                <Brain className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Révision</span>
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Header sticky : Filtres + Recherche + Tri - Alignés et uniformes */}
        <div className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 backdrop-blur-sm bg-opacity-95">
          <div className="flex items-center gap-1.5 py-2 overflow-x-auto scrollbar-hide">
            {/* Filtres compacts avec animations - Alignés à gauche */}
            {(['all', 'forgotten', 'mastered', 'recent'] as const).map((mode) => {
              const labels: Record<typeof mode, string> = {
                all: 'Tous',
                forgotten: 'À réviser',
                mastered: 'Maîtrisés',
                recent: 'Récents'
              };
              const icons: Record<typeof mode, React.ElementType> = {
                all: Filter,
                forgotten: AlertTriangle,
                mastered: CheckCircle,
                recent: Clock
              };
              const Icon = icons[mode];
              const isActive = filterMode === mode;
              return (
                <motion.button
                  key={mode}
                  onClick={() => setFilterMode(mode)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`
                    flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium 
                    transition-all whitespace-nowrap h-8
                    ${isActive
                      ? 'bg-blue-500 text-white shadow-sm'
                      : darkMode
                        ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }
                  `}
                  aria-label={`Filtrer par ${labels[mode]}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : ''}`} />
                  <span className="hidden sm:inline">{labels[mode]}</span>
                </motion.button>
              );
            })}

            {/* Espace flexible */}
            <div className="flex-1 min-w-4" />

            {/* Recherche + Tri groupés - Alignés à droite */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {/* Barre de recherche - Taille uniforme */}
              <div className="relative w-48 sm:w-64">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none z-10" />
                <input
                  id={`search-${searchId}`}
                  name={`search-${searchId}`}
                  type="text"
                  role="searchbox"
                  placeholder="Rechercher…"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setSearchTerm('');
                      setSortOrder('asc');
                    }
                  }}
                  className={`w-full pl-7 pr-7 h-8 text-xs rounded-md border transition-all ${
                    darkMode
                      ? 'bg-gray-800 text-white border-gray-700 focus:border-blue-500'
                      : 'bg-white text-gray-900 border-gray-200 focus:border-blue-500'
                  } focus:ring-1 focus:ring-blue-500`}
                  aria-label="Rechercher un mot ou une définition"
                />
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setSortOrder('asc');
                  }}
                  className={`
                    absolute right-1.5 top-1/2 transform -translate-y-1/2 p-0.5 rounded 
                    transition-all z-20
                    ${searchTerm 
                      ? 'opacity-100 pointer-events-auto hover:bg-gray-100 dark:hover:bg-gray-700' 
                      : 'opacity-0 pointer-events-none'
                    }
                  `}
                  aria-label="Vider la recherche"
                  tabIndex={searchTerm ? 0 : -1}
                >
                  <X className="w-3 h-3 text-gray-400" />
                </button>
              </div>

              {/* Bouton de tri - Taille uniforme */}
              <motion.button
                type="button"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`
                  flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium 
                  transition-all h-8 min-w-[2.5rem]
                  ${darkMode
                    ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }
                `}
                aria-label={sortOrder === 'asc' ? 'Trier A-Z' : 'Trier Z-A'}
                title={sortOrder === 'asc' ? 'Trier A-Z' : 'Trier Z-A'}
              >
                {sortOrder === 'asc' ? (
                  <ArrowDownAZ className="w-3.5 h-3.5" />
                ) : (
                  <ArrowUpZA className="w-3.5 h-3.5" />
                )}
                <span className="hidden sm:inline text-[10px]">{sortOrder === 'asc' ? 'A-Z' : 'Z-A'}</span>
              </motion.button>
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
                  <GhostInput
                    ref={termInputRef}
                    id={`term-${termId}`}
                    value={newWord.term}
                    onChange={handleTermChange}
                    context="vocab"
                    userId={user?.id}
                    enabled={false}
                    darkMode={darkMode}
                    placeholder="Ex: Apprentissage automatique"
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
                  <GhostTextArea
                    id={`definition-${definitionId}`}
                    value={newWord.definition}
                    onChange={handleDefinitionChange}
                    context="vocab"
                    userId={user?.id}
                    enabled={false}
                    darkMode={darkMode}
                    placeholder="Développez vos idées..."
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
                  <GhostInput
                    id={`example-${exampleId}`}
                    value={newWord.example}
                    onChange={handleExampleChange}
                    context="vocab"
                    userId={user?.id}
                    enabled={false}
                    darkMode={darkMode}
                    placeholder="Ex: L'apprentissage automatique est utilisé en IA"
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
                
                {/* Layout avec filtre vertical à gauche et liste à droite */}
                <div className="flex gap-4">
                  {/* Filtre alphabétique vertical compact */}
                  {vocabulary.length > 0 && (
                    <AlphaFilterVertical
                      current={selectedLetter}
                      onSelect={setSelectedLetter}
                      darkMode={darkMode}
                      wordCounts={letterWordCounts}
                    />
                  )}

                  {/* Liste de vocabulaire - Grille fluide avec scrollbar élégante */}
                  <div className="vocabulary-scroll-wrapper flex-1">
                    <div className="vocabulary-scroll flex-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[calc(100vh-16rem)] overflow-y-auto pr-2">
                  <AnimatePresence mode="sync" initial={false}>
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
                        layout="position"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{
                          layout: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
                          opacity: { duration: 0.2 },
                          scale: { duration: 0.2 }
                        }}
                        className={`
                          vocabulary-card-item
                          relative rounded-lg border shadow-sm overflow-hidden
                          transition-all duration-200 hover:shadow-lg hover:border-blue-300
                          ${darkMode
                            ? 'bg-gray-800 border-gray-700 hover:border-blue-600'
                            : 'bg-white border-gray-200 hover:border-blue-400'
                          }
                          ${masteryColor}
                        `}
                        tabIndex={0}
                        role="article"
                        aria-label={`Mot: ${word.word}`}
                      >
                        {/* Badge statut discret en haut à gauche */}
                        <div className="absolute top-2 left-2 z-0 flex items-center gap-1">
                          {/* Icône IA si généré par IA */}
                          {isAIGenerated && (
                            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-500 text-white text-[8px] font-semibold" title="Généré par IA">
                              IA
                            </span>
                          )}
                          {/* Badge statut discret (vert maîtrisé, orange à réviser) */}
                          {needsReview ? (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-orange-500 text-white" title="À réviser">
                              <RefreshCw className="w-3 h-3" />
                            </span>
                          ) : word.mastery >= 80 ? (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-500 text-white" title="Maîtrisé">
                              <CheckCircle className="w-3 h-3" />
                            </span>
                          ) : null}
                        </div>

                        {/* A. Header – mot + chevron accordion */}
                        <div 
                          className="p-3 pb-2 border-b border-gray-100 dark:border-gray-700 cursor-pointer"
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
                              text-base font-bold flex-1 truncate pl-6
                              ${darkMode ? 'text-white' : 'text-gray-900'}
                            `}>
                              {word.word}
                            </h3>
                            {/* Chevron accordion - Toujours visible à droite */}
                            <ChevronDown 
                              className={`
                                w-4 h-4 transition-transform flex-shrink-0
                                ${expandedWords.has(word.id) ? 'rotate-180' : ''}
                                ${darkMode ? 'text-gray-400' : 'text-gray-500'}
                              `}
                            />
                          </div>
                        </div>

                        {/* B. Body – définition tronquée + exemple (compact) */}
                        <div className="p-3 pt-2 space-y-1.5">
                          <p className={`
                            text-sm leading-snug line-clamp-2
                            ${darkMode ? 'text-gray-300' : 'text-gray-700'}
                          `}>
                            {definitionText || 'Aucune définition enregistrée.'}
                          </p>
                          
                          {/* Exemple compact ou masqué si vide */}
                          {word.examples && word.examples.length > 0 && word.examples[0] && (
                            <p className={`
                              text-xs italic line-clamp-1
                              ${darkMode ? 'text-gray-400' : 'text-gray-500'}
                            `}>
                              <span className="font-medium">Ex:</span> {word.examples[0]}
                            </p>
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
                              <div className="px-3 pb-3 pt-2 space-y-2.5">
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
                                    p-2 rounded-md
                                    ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}
                                  `}>
                                    <p className={`
                                      text-xs italic leading-relaxed
                                      ${darkMode ? 'text-gray-400' : 'text-gray-600'}
                                    `}>
                                      <span className="font-medium">Ex:</span> {word.examples[0]}
                                    </p>
                                  </div>
                                )}

                                {/* Menu actions : Modifier / À réviser (change selon l'état) / Supprimer - Compact */}
                                <div className={`
                                  flex flex-wrap gap-2 pt-2 mt-2 border-t
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
                                      if (needsReview || word.mastery >= 80) {
                                        // Si à réviser ou maîtrisé, basculer avec toggleMastery
                                        toggleMastery(word);
                                      } else {
                                        // Sinon, marquer comme à réviser
                                        handleMarkForReview(word, e);
                                      }
                                    }}
                                    className={`
                                      flex-1 min-w-[100px] sm:flex-initial px-3 py-2 rounded-lg text-sm font-medium transition-colors
                                      flex items-center justify-center gap-1.5
                                      ${needsReview || word.mastery >= 80
                                        ? darkMode
                                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        : 'bg-orange-500 text-white hover:bg-orange-600'
                                      }
                                    `}
                                    aria-label={needsReview ? 'Marquer maîtrisé' : word.mastery >= 80 ? 'Marquer à réviser' : 'Marquer à réviser'}
                                  >
                                    {needsReview || word.mastery >= 80 ? (
                                      <>
                                        <CheckCircle className="w-4 h-4" />
                                        <span className="hidden sm:inline">{word.mastery >= 80 ? 'À réviser' : 'Maîtrisé'}</span>
                                      </>
                                    ) : (
                                      <>
                                        <RefreshCw className="w-4 h-4" />
                                        <span className="hidden sm:inline">À réviser</span>
                                      </>
                                    )}
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

                      </motion.div>
                    );
                    })}
                  </AnimatePresence>
                    </div>
                  </div>
                </div>
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
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
              style={{
                pointerEvents: 'auto',
                isolation: 'isolate'
              }}
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  handleCloseEdit();
                }
              }}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className={`
                  modal-content-wrapper
                  max-w-xl w-full mx-auto rounded-lg shadow-xl
                  p-4 sm:p-6 max-h-[90vh] overflow-y-auto
                  ${darkMode ? 'bg-gray-800' : 'bg-white'}
                  relative z-10
                `}
                style={{
                  overscrollBehavior: 'contain',
                  pointerEvents: 'auto',
                  userSelect: 'auto'
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
                          disabled={isLoadingContext}
                          onClick={async () => {
                            setIsLoadingContext(true);
                            try {
                              // Appel Supabase Edge Function
                              const { data, error } = await supabase.functions.invoke('improve-content', {
                                body: {
                                  action: 'enrichir',
                                  contentType: 'vocabulaire',
                                  content: `Génère une phrase complète utilisant le mot "${editingWord.word}" avec la définition "${editingWord.definition}".`,
                                  title: editingWord.word,
                                },
                              });

                              if (error || !data?.success) {
                                // En cas d'erreur, utiliser un exemple par défaut
                                setContextSentence(`Exemple : "${editingWord.word}" est utilisé dans le contexte de ${editingWord.definition}.`);
                                return;
                              }

                              if (data.improved) {
                                setContextSentence(data.improved);
                              } else {
                                setContextSentence(`Exemple : "${editingWord.word}" est utilisé dans le contexte de ${editingWord.definition}.`);
                              }
                            } catch (error) {
                              console.error('Erreur génération contexte:', error);
                              // Fallback en cas d'erreur
                              setContextSentence(`Exemple : "${editingWord.word}" est utilisé dans le contexte de ${editingWord.definition}.`);
                            } finally {
                              setIsLoadingContext(false);
                            }
                          }}
                          className={`
                            inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors
                            ${isLoadingContext ? 'opacity-50 cursor-not-allowed' : ''}
                            ${darkMode
                              ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                            }
                          `}
                          aria-label="Voir en contexte"
                        >
                          {isLoadingContext ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Search className="w-4 h-4" />
                          )}
                          {isLoadingContext ? 'Chargement...' : 'Voir en contexte'}
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
                    onClick={handleCloseEdit}
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

      {/* Modal d'alerte pour champs vides */}
      <EmptyVocabularyAlert
        isOpen={showEmptyVocabAlert}
        onClose={() => setShowEmptyVocabAlert(false)}
        onManualEntry={() => {
          // Focus le champ approprié après fermeture de la modale
          // Utiliser setTimeout pour s'assurer que la modale est fermée avant le focus
          setTimeout(() => {
            if (emptyField === 'definition') {
              // Essayer d'abord le formulaire d'ajout, puis le formulaire d'édition
              if (newDefinitionTextareaRef.current) {
                newDefinitionTextareaRef.current.focus();
              } else if (definitionTextareaRef.current) {
                definitionTextareaRef.current.focus();
              }
            } else if (emptyField === 'term' && termInputRef.current) {
              termInputRef.current.focus();
            }
          }, 100);
        }}
        onGenerateWithAI={emptyField === 'definition' ? handleGenerateDefinitionWithAI : undefined}
        hasAIAccess={hasAIAccess}
        darkMode={darkMode}
        emptyField={emptyField}
        term={newWord.term}
      />

      {/* Modal de limite de quota */}
      {quotaModal}
    </div>
  );
}
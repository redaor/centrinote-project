/**
 * Hook de correction automatique et suggestions intelligentes
 * Utilise l'API de correction orthographique et grammaticale
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

export interface Suggestion {
  id: string;
  text: string;
  confidence: number;
  type: 'correction' | 'completion' | 'rephrase';
  originalText?: string;
  startIndex?: number;
  endIndex?: number;
}

interface CorrectionOptions {
  enableAutoCorrect?: boolean;
  enableSuggestions?: boolean;
  enableReformulations?: boolean;
  minConfidence?: number;
  debounceMs?: number;
  aiApiKey?: string; // Clé API pour les reformulations IA (optionnelle)
  userId?: string; // ID utilisateur pour récupérer ses notes
}

// Liste de mots français courants (top 500 mots)
const FRENCH_COMMON_WORDS = new Set([
  'le', 'de', 'un', 'être', 'et', 'à', 'il', 'avoir', 'ne', 'je', 'son', 'que', 'se', 'qui', 'ce', 'dans',
  'en', 'du', 'elle', 'au', 'pour', 'pas', 'que', 'vous', 'par', 'sur', 'faire', 'plus', 'dire', 'me',
  'on', 'mon', 'lui', 'nous', 'comme', 'mais', 'pouvoir', 'avec', 'tout', 'y', 'aller', 'voir', 'bien',
  'où', 'sans', 'tu', 'ou', 'leur', 'homme', 'si', 'deux', 'comment', 'autre', 'là', 'premier', 'vouloir',
  'grand', 'mon', 'même', 'état', 'moins', 'donner', 'contre', 'venir', 'encore', 'aussi', 'alors',
  'temps', 'très', 'français', 'nouveau', 'entre', 'petit', 'après', 'quelque', 'savoir', 'sous', 'jour',
  'bon', 'enfant', 'vie', 'oeil', 'passer', 'plutôt', 'rien', 'selon', 'mieux', 'moment', 'année', 'monde',
  'fois', 'tenir', 'chose', 'vers', 'tel', 'main', 'pays', 'partie', 'politique', 'prendre', 'femme',
  'nombre', 'point', 'devoir', 'français', 'question', 'gouvernement', 'cas', 'place', 'devenir', 'certain',
  'public', 'fois', 'dernier', 'national', 'semaine', 'toujours', 'voix', 'présent', 'important', 'port',
  'monsieur', 'sembler', 'deuxième', 'chef', 'groupe', 'fils', 'suite', 'mois', 'projet', 'livre', 'exemple',
  'rendre', 'action', 'trouver', 'compte', 'partir', 'développement', 'service', 'politique', 'permettre',
  'situation', 'ministre', 'mettre', 'général', 'social', 'ville', 'guerre', 'président', 'simple', 'prix',
  'rapport', 'regard', 'milieu', 'membre', 'connaître', 'mesure', 'besoin', 'suivre', 'côté', 'ordre',
  'travail', 'international', 'entreprise', 'suivant', 'cause', 'société', 'enfin', 'européen', 'esprit',
  'intérêt', 'sortir', 'histoire', 'accord', 'niveau', 'république', 'qualité', 'répondre', 'français',
  'population', 'problème', 'ensemble', 'besoin', 'région', 'commencer', 'résultat', 'pourquoi', 'justice',
  'système', 'économie', 'raison', 'droit', 'compagnie', 'programme', 'économique', 'notamment', 'comprendre',
  'cependant', 'réaliser', 'organiser', 'différent', 'agir', 'personnel', 'économique', 'europe', 'demander',
  'particulier', 'différent', 'personnel', 'proposer', 'utiliser', 'obtenir', 'moyen', 'poser', 'atteindre',
  'conseil', 'français', 'rappeler', 'réalité', 'position', 'école', 'information', 'créer', 'parfois',
  'domaine', 'décision', 'reconnaître', 'revenir', 'texte', 'environ', 'finalement', 'recherche', 'effort',
  'période', 'produire', 'penser', 'condition', 'terme', 'espérer', 'expliquer', 'maintenir', 'apparaître',
  'formation', 'article', 'représenter', 'annoncer', 'siècle', 'poursuivre', 'marché', 'continuer', 'directeur',
  'reste', 'défendre', 'accepter', 'expérience', 'commune', 'engagement', 'proportion', 'présenter', 'rôle',
  'soutenir', 'affirmer', 'occasion', 'imposer', 'demeurer', 'ressource', 'améliorer', 'avenir', 'processus',
  'note', 'notes', 'contenu', 'titre', 'tag', 'créer', 'modifier', 'supprimer', 'éditer', 'enregistrer',
  'ajouter', 'organiser', 'rechercher', 'retrouver', 'classer', 'épingler', 'archiver', 'partager', 'exporter',
  'important', 'urgent', 'priorité', 'tâche', 'projet', 'idée', 'liste', 'vocabulaire', 'définition',
  'réunion', 'compte-rendu', 'synthèse', 'résumé', 'brouillon', 'final', 'version', 'commentaire', 'annotation'
]);

/**
 * Calcule la distance de Levenshtein entre deux chaînes
 * Retourne le nombre minimum d'opérations (insertion, suppression, substitution)
 * nécessaires pour transformer s1 en s2
 */
function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(
          dp[i - 1][j],     // suppression
          dp[i][j - 1],     // insertion
          dp[i - 1][j - 1]  // substitution
        );
      }
    }
  }

  return dp[m][n];
}

export function useTextCorrection(options: CorrectionOptions = {}) {
  const {
    enableAutoCorrect = true,
    enableSuggestions = true,
    enableReformulations = false,
    minConfidence = 0.7,
    debounceMs = 300,
    aiApiKey,
    userId,
  } = options;

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAvailable, setAiAvailable] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cache des mots de l'utilisateur
  const userWordsCache = useRef<Set<string>>(new Set());
  const userWordsCacheTimestamp = useRef<number>(0);
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Vérifier la disponibilité de l'API IA au montage
  // L'API est maintenant gérée par Supabase Edge Function (pas besoin de clé côté client)
  useEffect(() => {
    setAiAvailable(true); // Toujours disponible via Edge Function
  }, []);

  // Dictionnaire de corrections courantes (français)
  const commonCorrections: Record<string, string> = {
    // Erreurs de frappe courantes
    'bienvenu': 'bienvenue',
    'dévelopement': 'développement',
    'environement': 'environnement',
    'language': 'langage',
    'connection': 'connexion',
    'programation': 'programmation',
    'peux-tu': 'peux-tu',
    'comment sa va': 'comment ça va',
    'sa va': 'ça va',
    'a': 'à',

    // Anglicismes techniques
    'bug': 'bogue',
    'fix': 'corriger',
    'update': 'mettre à jour',
    'delete': 'supprimer',
    'save': 'enregistrer',

    // Expressions courantes
    'stp': 's\'il te plaît',
    'svp': 's\'il vous plaît',
    'pk': 'pourquoi',
    'pr': 'pour',
    'dc': 'donc',
    'ts': 'tous',
  };

  /**
   * Analyse le texte et détecte les erreurs de frappe
   */
  const analyzeText = useCallback((text: string): Suggestion[] => {
    if (!text || text.trim().length === 0) return [];

    const detectedSuggestions: Suggestion[] = [];
    const words = text.split(/\s+/);

    // Recherche de corrections dans le dictionnaire
    words.forEach((word, index) => {
      const lowerWord = word.toLowerCase();
      const correction = commonCorrections[lowerWord];

      if (correction && correction !== lowerWord) {
        detectedSuggestions.push({
          id: `correction-${index}`,
          text: correction,
          confidence: 0.9,
          type: 'correction',
          originalText: word,
          startIndex: text.indexOf(word),
          endIndex: text.indexOf(word) + word.length,
        });
      }
    });

    // Détection de patterns d'erreurs courantes
    const patterns = [
      // "sa" au lieu de "ça"
      {
        regex: /\bsa\s+(va|fait|marche|dépend)\b/gi,
        replacement: (match: string) => match.replace(/^sa\s+/, 'ça '),
        confidence: 0.95,
      },
      // "a" au lieu de "à" avant un verbe infinitif
      {
        regex: /\ba\s+(faire|créer|modifier|supprimer|ajouter|voir|afficher)\b/gi,
        replacement: (match: string) => match.replace(/^a\s+/, 'à '),
        confidence: 0.85,
      },
      // Double espace
      {
        regex: /\s{2,}/g,
        replacement: ' ',
        confidence: 1.0,
      },
    ];

    patterns.forEach((pattern, patternIndex) => {
      const matches = Array.from(text.matchAll(pattern.regex));
      matches.forEach((match) => {
        if (match.index !== undefined) {
          const correctedText = typeof pattern.replacement === 'function'
            ? pattern.replacement(match[0])
            : pattern.replacement;
          if (correctedText !== match[0]) {
            detectedSuggestions.push({
              id: `pattern-${patternIndex}-${match.index}`,
              text: correctedText,
              confidence: pattern.confidence,
              type: 'correction',
              originalText: match[0],
              startIndex: match.index,
              endIndex: match.index + match[0].length,
            });
          }
        }
      });
    });

    // Filtrer par confiance minimale
    return detectedSuggestions.filter(s => s.confidence >= minConfidence);
  }, [minConfidence, commonCorrections]);

  /**
   * Récupère les mots uniques des notes de l'utilisateur (avec cache)
   */
  const getUserWords = useCallback(async (): Promise<Set<string>> => {
    // Vérifier le cache
    const now = Date.now();
    if (userWordsCache.current.size > 0 && now - userWordsCacheTimestamp.current < CACHE_DURATION) {
      return userWordsCache.current;
    }

    // Pas d'userId, retourner cache vide
    if (!userId) {
      return new Set();
    }

    try {
      const { data: notes } = await supabase
        .from('notes')
        .select('content')
        .eq('userId', userId);

      if (!notes || notes.length === 0) {
        return new Set();
      }

      // Extraire les mots uniques
      const words = new Set<string>();
      notes.forEach((note) => {
        if (!note.content) return;

        // Nettoyer et extraire les mots (minuscules, sans ponctuation)
        const extractedWords = note.content
          .toLowerCase()
          .split(/[\s,;:.!?()[\]{}"'«»—\-]+/)
          .filter((word) => word.length >= 3) // Mots de 3 caractères minimum
          .filter((word) => /^[a-zàâäéèêëïîôùûüÿæœç]+$/.test(word)); // Lettres françaises uniquement

        extractedWords.forEach((word) => words.add(word));
      });

      // Mettre en cache
      userWordsCache.current = words;
      userWordsCacheTimestamp.current = now;

      console.log(`📚 ${words.size} mots uniques extraits des notes de l'utilisateur`);
      return words;
    } catch (error) {
      console.error('Erreur lors de la récupération des mots utilisateur:', error);
      return new Set();
    }
  }, [userId]);

  /**
   * Génère des suggestions de complétion basées sur :
   * - Correction orthographique (Levenshtein ≤ 2)
   * - Mots de l'utilisateur
   * - Mots français courants
   */
  const generateCompletions = useCallback(async (text: string): Promise<Suggestion[]> => {
    if (!text || text.trim().length < 2) return [];

    const startTime = performance.now();
    const completions: Suggestion[] = [];
    const words = text.trim().split(/\s+/);
    const lastWord = words[words.length - 1].toLowerCase();

    // Ignorer les mots trop courts
    if (lastWord.length < 2) {
      return [];
    }

    // 1. Récupérer les mots de l'utilisateur
    const userWords = await getUserWords();

    // 2. Combiner toutes les sources de mots
    const allWords = new Set([...userWords, ...FRENCH_COMMON_WORDS]);

    // 3. Chercher des corrections (Levenshtein ≤ 2)
    const corrections: Array<{ word: string; distance: number }> = [];
    allWords.forEach((word) => {
      // Ignorer le mot lui-même
      if (word === lastWord) return;

      const distance = levenshteinDistance(lastWord, word);

      // Correction si distance ≤ 2
      if (distance <= 2 && distance > 0) {
        corrections.push({ word, distance });
      }
    });

    // Trier par distance croissante (meilleure correction en premier)
    corrections.sort((a, b) => a.distance - b.distance);

    // Ajouter les corrections (max 3)
    corrections.slice(0, 3).forEach((correction, index) => {
      completions.push({
        id: `correction-levenshtein-${index}`,
        text: correction.word,
        confidence: 0.9 - (correction.distance * 0.1), // Distance 1 = 0.8, Distance 2 = 0.7
        type: 'correction',
        originalText: lastWord,
      });
    });

    // 4. Chercher des complétions (mots commençant par le préfixe)
    const prefix = lastWord.toLowerCase();
    const completionCandidates: string[] = [];

    allWords.forEach((word) => {
      if (word.startsWith(prefix) && word !== prefix && word.length > prefix.length) {
        completionCandidates.push(word);
      }
    });

    // Trier par longueur (mots courts en premier) et alphabétiquement
    completionCandidates.sort((a, b) => {
      if (a.length !== b.length) return a.length - b.length;
      return a.localeCompare(b);
    });

    // Ajouter les complétions (max 3, si pas assez de corrections)
    const remainingSlots = Math.max(0, 3 - completions.length);
    completionCandidates.slice(0, remainingSlots).forEach((word, index) => {
      completions.push({
        id: `completion-prefix-${index}`,
        text: word,
        confidence: 0.7,
        type: 'completion',
      });
    });

    const endTime = performance.now();
    const duration = (endTime - startTime).toFixed(2);

    console.log(`💡 generateCompletions retourne ${completions.length} suggestions pour "${lastWord}" (${duration}ms)`);
    return completions.slice(0, 3); // Limiter à 3 max
  }, [getUserWords]);

  /**
   * Génère des reformulations IA via Supabase Edge Function
   * La clé API est stockée uniquement dans Supabase (jamais exposée côté client)
   */
  const generateAIReformulations = useCallback(async (text: string): Promise<Suggestion[]> => {
    if (!enableReformulations || !aiAvailable || !text || text.trim().length < 10) {
      return [];
    }

    try {
      const systemPrompt = 'Tu es un assistant qui aide à reformuler des textes en français pour les rendre plus clairs, professionnels et naturels. Propose 2-3 reformulations différentes, chacune sur une nouvelle ligne.';
      const userPrompt = `Reformule ce texte de manière plus claire et naturelle :\n"${text}"\n\nPropose 2-3 variantes.`;

      // Appeler la Supabase Edge Function (clé API stockée uniquement dans Supabase)
      const { data, error } = await supabase.functions.invoke('text-correction', {
        body: {
          text: userPrompt,
          model: 'gpt-3.5-turbo',
          systemPrompt,
        },
      });

      if (error) {
        console.error('Erreur Edge Function text-correction:', error);
        return [];
      }

      const reformulationsText = data?.corrected || '';

      // Parser les reformulations (une par ligne)
      const reformulations = reformulationsText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.match(/^\d+[\.\)]/)) // Ignorer les numéros de liste
        .filter(line => line.length > 10)
        .slice(0, 3); // Maximum 3 reformulations

      return reformulations.map((reformulation, index) => ({
        id: `rephrase-ai-${index}`,
        text: reformulation.replace(/^["\-•]\s*/, '').replace(/["']$/, ''), // Nettoyer les guillemets/tirets
        confidence: 0.85,
        type: 'rephrase' as const,
      }));
    } catch (error) {
      console.error('Erreur lors de la génération de reformulations IA:', error);
      return [];
    }
  }, [enableReformulations, aiAvailable, aiApiKey]);

  /**
   * Applique automatiquement les corrections de haute confiance
   */
  const applyAutoCorrections = useCallback((text: string): string => {
    if (!enableAutoCorrect) return text;

    let correctedText = text;
    const corrections = analyzeText(text);

    // Appliquer les corrections de très haute confiance (>= 0.9)
    corrections
      .filter(s => s.confidence >= 0.9 && s.originalText && s.text)
      .sort((a, b) => (b.startIndex || 0) - (a.startIndex || 0)) // Trier par index décroissant
      .forEach(correction => {
        if (correction.startIndex !== undefined && correction.endIndex !== undefined) {
          correctedText =
            correctedText.substring(0, correction.startIndex) +
            correction.text +
            correctedText.substring(correction.endIndex);
        } else if (correction.originalText) {
          // Remplacement global si pas d'index
          const regex = new RegExp(`\\b${correction.originalText}\\b`, 'gi');
          correctedText = correctedText.replace(regex, correction.text);
        }
      });

    return correctedText;
  }, [enableAutoCorrect, analyzeText]);

  /**
   * Analyse le texte avec debounce pour les suggestions
   */
  const analyzeLater = useCallback((text: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      console.log('🔍 analyzeLater démarré pour:', text);
      setIsAnalyzing(true);

      const allSuggestions: Suggestion[] = [];

      // Corrections orthographiques
      if (enableAutoCorrect) {
        const corrections = analyzeText(text).filter(s => s.confidence < 0.9);
        console.log('✅ Corrections détectées:', corrections);
        allSuggestions.push(...corrections);
      }

      // Suggestions de complétion (async maintenant)
      if (enableSuggestions) {
        const completions = await generateCompletions(text);
        console.log('💡 Complétions générées:', completions);
        allSuggestions.push(...completions);
      }

      // Reformulations IA (async)
      if (enableReformulations && aiAvailable && text.trim().length >= 10) {
        try {
          console.log('✨ Tentative reformulations IA...');
          const reformulations = await generateAIReformulations(text);
          console.log('✨ Reformulations reçues:', reformulations);
          allSuggestions.push(...reformulations);
        } catch (error) {
          console.error('Erreur reformulations IA:', error);
        }
      }

      console.log('📋 Total suggestions:', allSuggestions);
      setSuggestions(allSuggestions);
      setIsAnalyzing(false);
    }, debounceMs);
  }, [debounceMs, enableAutoCorrect, enableSuggestions, enableReformulations, aiAvailable, analyzeText, generateCompletions, generateAIReformulations]);

  /**
   * Nettoyer le timer au démontage
   */
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  /**
   * Applique une suggestion spécifique
   */
  const applySuggestion = useCallback((suggestionId: string, currentText: string): string => {
    const suggestion = suggestions.find(s => s.id === suggestionId);
    if (!suggestion) return currentText;

    if (suggestion.type === 'completion' || suggestion.type === 'rephrase') {
      // Pour les complétions et reformulations, remplacer tout le texte
      return suggestion.text;
    } else if (suggestion.type === 'correction' && suggestion.startIndex !== undefined && suggestion.endIndex !== undefined) {
      // Pour les corrections, remplacer la partie concernée
      return (
        currentText.substring(0, suggestion.startIndex) +
        suggestion.text +
        currentText.substring(suggestion.endIndex)
      );
    }

    return currentText;
  }, [suggestions]);

  /**
   * Efface les suggestions
   */
  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

  return {
    suggestions,
    isAnalyzing,
    aiAvailable,
    applyAutoCorrections,
    analyzeLater,
    applySuggestion,
    clearSuggestions,
  };
}

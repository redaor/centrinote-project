/**
 * Service de génération de suggestions pour le ghost-text
 * Optimisé pour performance (< 30ms par appel)
 * Utilise cache LRU + appels parallèles pour l'IA
 */

import { supabase } from '../../../lib/supabase';
import { fetchAISuggestion } from './aiSuggestions';
import { ghostCache } from './cache';

export interface GhostSuggestion {
  text: string;
  confidence: number;
  type: 'completion' | 'correction';
}

interface SuggestionCache {
  prefix: string;
  suggestions: GhostSuggestion[];
  timestamp: number;
}

// Cache LRU (max 100 entrées) pour éviter les recalculs
const suggestionCache = new Map<string, SuggestionCache>();
const MAX_CACHE_SIZE = 100;
const CACHE_DURATION = 5000; // 5 secondes

/**
 * Nettoie le cache LRU en supprimant les entrées les plus anciennes
 */
function cleanLRUCache() {
  if (suggestionCache.size <= MAX_CACHE_SIZE) return;

  // Trier par timestamp (plus ancien en premier)
  const entries = Array.from(suggestionCache.entries())
    .sort((a, b) => a[1].timestamp - b[1].timestamp);

  // Supprimer les entrées les plus anciennes jusqu'à atteindre MAX_CACHE_SIZE
  const toRemove = entries.slice(0, entries.length - MAX_CACHE_SIZE);
  toRemove.forEach(([key]) => suggestionCache.delete(key));
}

// Mots français courants (limité à 500 mots les plus fréquents pour performance)
const FRENCH_COMMON_WORDS_LIST = [
  // Top 100 mots les plus fréquents
  'le', 'de', 'un', 'être', 'et', 'à', 'il', 'avoir', 'ne', 'je', 'son', 'que', 'se', 'qui', 'ce', 'dans',
  'en', 'du', 'elle', 'au', 'pour', 'pas', 'que', 'vous', 'par', 'sur', 'faire', 'plus', 'dire', 'me',
  'on', 'mon', 'lui', 'nous', 'comme', 'mais', 'pouvoir', 'avec', 'tout', 'y', 'aller', 'voir', 'bien',
  'où', 'sans', 'tu', 'ou', 'leur', 'homme', 'si', 'deux', 'comment', 'autre', 'là', 'premier', 'vouloir',
  'grand', 'même', 'état', 'moins', 'donner', 'contre', 'venir', 'encore', 'aussi', 'alors',
  'temps', 'très', 'français', 'nouveau', 'entre', 'petit', 'après', 'quelque', 'savoir', 'sous', 'jour',
  'bon', 'enfant', 'vie', 'oeil', 'passer', 'plutôt', 'rien', 'selon', 'mieux', 'moment', 'année', 'monde',
  'fois', 'tenir', 'chose', 'vers', 'tel', 'main', 'pays', 'partie', 'politique', 'prendre', 'femme',
  'nombre', 'point', 'devoir', 'question', 'gouvernement', 'cas', 'place', 'devenir', 'certain',
  'public', 'dernier', 'national', 'semaine', 'toujours', 'voix', 'présent', 'important', 'port',
  // Mots spécifiques à l'application
  'note', 'notes', 'contenu', 'titre', 'tag', 'créer', 'modifier', 'supprimer', 'éditer', 'enregistrer',
  'ajouter', 'organiser', 'rechercher', 'retrouver', 'classer', 'épingler', 'archiver', 'partager', 'exporter',
  'urgent', 'priorité', 'tâche', 'projet', 'idée', 'liste', 'vocabulaire', 'définition',
  'réunion', 'compte-rendu', 'synthèse', 'résumé', 'brouillon', 'final', 'version', 'commentaire', 'annotation',
  // Verbes courants (200 mots)
  'faut', 'faire', 'aller', 'venir', 'voir', 'dire', 'prendre', 'mettre',
  'donner', 'vouloir', 'pouvoir', 'devoir', 'falloir', 'laisser', 'envoyer',
  'recevoir', 'revenir', 'partir', 'arriver', 'rester', 'passer', 'sortir', 'entrer',
  'monter', 'descendre', 'ouvrir', 'fermer', 'commencer', 'finir', 'continuer', 'arrêter',
  'chercher', 'trouver', 'perdre', 'garder', 'changer', 'devenir', 'paraître',
  'sembler', 'connaître', 'apprendre', 'comprendre', 'expliquer', 'demander', 'répondre',
  'parler', 'écouter', 'entendre', 'regarder', 'montrer', 'cacher',
  'aimer', 'adorer', 'détester', 'préférer', 'choisir', 'décider', 'essayer', 'réussir',
  'échouer', 'travailler', 'étudier', 'enseigner', 'oublier',
  'se souvenir', 'penser', 'croire', 'espérer', 'attendre', 'vivre', 'mourir', 'naître',
  'grandir', 'vieillir', 'manger', 'boire', 'dormir', 'se réveiller',
  'se lever', 'se coucher', 'se laver', 's\'habiller', 'se déshabiller', 'marcher', 'courir',
  'sauter', 'danser', 'jouer', 'gagner', 'perdre', 'acheter', 'vendre', 'payer', 'coûter',
  'valoir', 'posséder', 'appartenir', 'utiliser', 'servir', 'aider', 'sauver', 'protéger',
  'défendre', 'attaquer', 'battre', 'créer', 'détruire', 'construire',
  'réparer', 'casser', 'écrire', 'lire', 'dessiner', 'peindre',
  'chanter', 'écouter', 'entendre', 'sentir', 'goûter',
  'toucher', 'porter', 'apporter', 'emporter', 'enlever', 'retirer', 'ajouter',
  'supprimer', 'effacer', 'sauvegarder',
  'charger', 'télécharger', 'offrir', 'accepter',
  'refuser', 'permettre', 'interdire', 'autoriser', 'obliger', 'forcer', 'empêcher',
  'terminer', 'recommencer',
  'reprendre', 'abandonner', 'quitter', 'retourner',
  'voler', 'nager', 'conduire', 'rouler',
  'tester', 'expérimenter', 'vérifier', 'contrôler', 'examiner', 'observer',
  'apercevoir', 'remarquer', 'noter', 'inscrire',
  // Adjectifs et autres mots courants (200 mots supplémentaires pour atteindre 500)
  'beau', 'belle', 'bon', 'bonne', 'mauvais', 'mauvaise', 'grand', 'grande', 'petit', 'petite',
  'nouveau', 'nouvelle', 'ancien', 'ancienne', 'jeune', 'vieux', 'vieille', 'nouveau', 'nouvelle',
  'premier', 'première', 'dernier', 'dernière', 'meilleur', 'meilleure', 'pire', 'pire',
  'facile', 'difficile', 'simple', 'compliqué', 'clair', 'sombre', 'lumineux', 'lumineuse',
  'chaud', 'chaude', 'froid', 'froide', 'chaud', 'chaude', 'froid', 'froide',
  'long', 'longue', 'court', 'courte', 'haut', 'haute', 'bas', 'basse',
  'riche', 'pauvre', 'fort', 'forte', 'faible', 'rapide', 'lent', 'lente',
  'heureux', 'heureuse', 'triste', 'content', 'contente', 'satisfait', 'satisfaite',
  'libre', 'occupé', 'occupée', 'disponible', 'absent', 'absente', 'présent', 'présente',
  'propre', 'sale', 'neuf', 'neuve', 'usé', 'usée', 'nouveau', 'nouvelle',
  'cher', 'chère', 'bon marché', 'gratuit', 'gratuite', 'payant', 'payante',
  'public', 'publique', 'privé', 'privée', 'ouvert', 'ouverte', 'fermé', 'fermée',
  'plein', 'pleine', 'vide', 'complet', 'complète', 'incomplet', 'incomplète',
  'vrai', 'vraie', 'faux', 'fausse', 'juste', 'faux', 'fausse', 'correct', 'correcte',
  'possible', 'impossible', 'probable', 'improbable', 'certain', 'certaine', 'incertain', 'incertaine',
  'nécessaire', 'inutile', 'important', 'importante', 'essentiel', 'essentielle', 'secondaire',
  'général', 'générale', 'particulier', 'particulière', 'spécial', 'spéciale', 'normal', 'normale',
  'rare', 'commun', 'commune', 'courant', 'courante', 'habituel', 'habituelle', 'étrange',
  'sûr', 'sûre', 'dangereux', 'dangereuse', 'sécurisé', 'sécurisée', 'risqué', 'risquée',
  'calme', 'bruyant', 'bruyante', 'silencieux', 'silencieuse', 'paisible', 'agité', 'agitée',
  'doux', 'douce', 'dur', 'dure', 'tendre', 'dur', 'dure', 'souple', 'rigide',
  'léger', 'légère', 'lourd', 'lourde', 'mince', 'épais', 'épaisse', 'fin', 'fine',
  'large', 'étroit', 'étroite', 'spacieux', 'spacieuse', 'serré', 'serrée',
  'proche', 'lointain', 'lointaine', 'près', 'loin', 'immédiat', 'immédiate', 'rapide', 'lent', 'lente',
  'récent', 'récente', 'ancien', 'ancienne', 'moderne', 'traditionnel', 'traditionnelle',
  'nouveau', 'nouvelle', 'vieux', 'vieille', 'jeune', 'âgé', 'âgée', 'mature',
  'actif', 'active', 'passif', 'passive', 'dynamique', 'statique', 'mobile', 'immobile',
  'vivant', 'vivante', 'mort', 'morte', 'vivant', 'vivante', 'animé', 'animée',
  'naturel', 'naturelle', 'artificiel', 'artificielle', 'réel', 'réelle', 'virtuel', 'virtuelle',
  'concret', 'concrète', 'abstrait', 'abstraite', 'pratique', 'théorique', 'utile', 'inutile',
  'efficace', 'inefficace', 'productif', 'productive', 'stérile', 'fertile', 'riche', 'pauvre',
  'abondant', 'abondante', 'rare', 'commun', 'commune', 'courant', 'courante', 'habituel', 'habituelle'
];

// Limiter à 500 mots les plus fréquents
const FRENCH_COMMON_WORDS = new Set(FRENCH_COMMON_WORDS_LIST.slice(0, 500));

// Liste de fallback (mots ultra-courants, déjà inclus dans FRENCH_COMMON_WORDS mais gardé pour compatibilité)
const FALLBACK_WORDS = FRENCH_COMMON_WORDS_LIST.slice(0, 200);

/**
 * Calcule la distance de Levenshtein entre deux chaînes
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

/**
 * Récupère les mots uniques des notes de l'utilisateur (avec cache)
 */
let userWordsCache: Set<string> = new Set();
let userWordsCacheTimestamp = 0;
const USER_WORDS_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function getUserWords(userId?: string): Promise<Set<string>> {
  const now = Date.now();
  if (userWordsCache.size > 0 && now - userWordsCacheTimestamp < USER_WORDS_CACHE_DURATION) {
    return userWordsCache;
  }

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

    const words = new Set<string>();
    notes.forEach((note) => {
      if (!note.content) return;

      const extractedWords = note.content
        .toLowerCase()
        .split(/[\s,;:.!?()[\]{}"'«»—\-]+/)
        .filter((word) => word.length >= 3)
        .filter((word) => /^[a-zàâäéèêëïîôùûüÿæœç]+$/.test(word));

      extractedWords.forEach((word) => words.add(word));
    });

    userWordsCache = words;
    userWordsCacheTimestamp = now;

    return words;
  } catch (error) {
    console.error('Erreur lors de la récupération des mots utilisateur:', error);
    return new Set();
  }
}

/**
 * Génère des suggestions de complétion pour le ghost-text
 * Performance optimisée : < 50ms par appel
 */
export async function generateCompletions(
  text: string,
  context: 'notes' | 'vocab' | 'search' | 'chat' | 'meeting' = 'notes',
  userId?: string,
  abortSignal?: AbortSignal
): Promise<GhostSuggestion[]> {
  const startTime = Date.now();

  if (!text || text.trim().length < 2) {
    return [];
  }

  const words = text.trim().split(/\s+/);
  const lastWord = words[words.length - 1] || '';
  const prefix = lastWord.toLowerCase();
  const fullPhrase = text.trim(); // Phrase complète pour le contexte IA

  if (lastWord.length < 2) {
    return [];
  }

  // Vérifier le cache LRU (par lastWord uniquement pour meilleure hit rate)
  // L1 : Cache LRU rapide (200 entrées, 5 min)
  const cachedWord = ghostCache.get(prefix);
  if (cachedWord) {
    console.log('[CACHE] hit', lastWord, '→', cachedWord);
    return [{
      text: cachedWord,
      confidence: 0.95,
      type: 'completion' as const,
    }];
  }

  // Vérifier le cache de suggestions complètes
  const cacheKey = `${lastWord}-${context}-${userId || 'anonymous'}`;
  const cached = suggestionCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log('[CACHE] hit', lastWord, '→', cached.suggestions);
    return cached.suggestions;
  }

  const suggestions: GhostSuggestion[] = [];

  // 1. Récupérer les mots de l'utilisateur (async mais mis en cache)
  // Le cache est géré dans getUserWords, donc la première fois c'est lent mais ensuite c'est instantané
  const userWords = await getUserWords(userId);

  // 2. Combiner toutes les sources de mots (limité à 500 mots max)
  const allWords = new Set([...userWords, ...FRENCH_COMMON_WORDS]);

  // 3. Chercher des complétions (mots commençant par le préfixe)
  // prefix est déjà défini plus haut
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

  // Ajouter la meilleure complétion (pour ghost-text, on veut UNE seule suggestion)
  if (completionCandidates.length > 0) {
    suggestions.push({
      text: completionCandidates[0],
      confidence: 0.8,
      type: 'completion',
    });
  }

  // 4. Chercher des corrections (Levenshtein ≤ 2) si pas de complétion trouvée
  // OPTIMISATION : Filtrer d'abord par "commence par" avant de calculer Levenshtein
  // IMPORTANT : Ne pas suggérer des mots plus courts que le préfixe (évite "auto" pour "autocom")
  if (suggestions.length === 0) {
    const corrections: Array<{ word: string; distance: number }> = [];

    // Filtrer d'abord les mots qui commencent par le préfixe (beaucoup plus rapide)
    // Prendre au moins les 3 premiers caractères du préfixe pour éviter trop de candidats
    const minPrefix = prefix.substring(0, Math.max(3, prefix.length - 2));
    const prefixCandidates: string[] = [];
    allWords.forEach((word) => {
      // IMPORTANT : Le mot suggéré doit être de longueur similaire ou supérieure au préfixe
      // pour éviter de suggérer "auto" pour "autocom"
      if (word !== lastWord && 
          word.length >= prefix.length - 2 && 
          word.length <= prefix.length + 5 &&
          word.startsWith(minPrefix)) {
        prefixCandidates.push(word);
      }
    });

    // Ensuite calculer Levenshtein uniquement sur les candidats filtrés
    prefixCandidates.forEach((word) => {
      const distance = levenshteinDistance(lastWord, word);
      // Distance max = 2, mais le mot doit être de longueur similaire
      if (distance <= 2 && distance > 0 && Math.abs(word.length - prefix.length) <= 3) {
        corrections.push({ word, distance });
      }
    });

    corrections.sort((a, b) => {
      // Prioriser les mots de longueur similaire
      const lengthDiffA = Math.abs(a.word.length - prefix.length);
      const lengthDiffB = Math.abs(b.word.length - prefix.length);
      if (lengthDiffA !== lengthDiffB) return lengthDiffA - lengthDiffB;
      return a.distance - b.distance;
    });

    if (corrections.length > 0) {
      suggestions.push({
        text: corrections[0].word,
        confidence: 0.9 - (corrections[0].distance * 0.1),
        type: 'correction',
      });
    }
  }

  // 5. Fallback local : si aucune suggestion n'est trouvée, utiliser la liste de fallback
  if (suggestions.length === 0) {
    const fallbackWord = FALLBACK_WORDS.find(word => word.toLowerCase().startsWith(prefix));
    
    if (fallbackWord) {
      console.log('[SUGGEST] fallback', lastWord, '→', fallbackWord);
      suggestions.push({
        text: fallbackWord,
        confidence: 0.7,
        type: 'completion',
      });
    }
  }

  // L3 : IA désactivée temporairement (Edge Function non disponible)
  // TODO: Réactiver quand smart-complete sera déployé et fonctionnel
  // if (suggestions.length === 0 && lastWord.length >= 2) {
  //   fetchAISuggestion(fullPhrase, lastWord, abortSignal)
  //     .then((aiWord) => {
  //       if (aiWord && aiWord !== lastWord.toLowerCase()) {
  //         ghostCache.set(prefix, aiWord);
  //         console.log('[AI] parallèle', lastWord, '→', aiWord);
  //       }
  //     })
  //     .catch((e) => {
  //       if (import.meta.env.DEV) {
  //         console.warn('[AI] erreur parallèle', e);
  //       }
  //     });
  //   return [];
  // }

  const endTime = Date.now();
  const duration = endTime - startTime;

  // Mettre en cache avec nettoyage LRU
  if (suggestions.length > 0) {
    suggestionCache.set(cacheKey, {
      prefix: lastWord,
      suggestions,
      timestamp: Date.now(),
    });
    cleanLRUCache();
    
    // Mettre aussi dans le cache LRU rapide pour accès ultra-rapide
    ghostCache.set(prefix, suggestions[0].text);
  }

  // Log de performance
  console.log('[PERF] generateCompletions', lastWord, duration + 'ms');

  if (duration > 30) {
    console.warn(`⚠️ generateCompletions a pris ${duration}ms (objectif: < 30ms)`);
  }

  return suggestions;
}


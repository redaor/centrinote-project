/**
 * Service de chargement des données utilisateur pour l'IA
 * Charge et formate les notes et le vocabulaire pour le contexte IA
 */

import { notesService } from '../../../services/notesService';
import { vocabularyService } from '../../../services/vocabularyService';
import type { Note } from '../../../types';
import type { VocabularyEntry } from '../../../types';
import { logger } from '../../../utils/logger';

export interface UserDataForAI {
  notes: Array<{
    id: string;
    title: string;
    content: string;
    tags: string[];
    isPinned: boolean;
    updatedAt: Date;
  }>;
  vocabulary: Array<{
    word: string;
    definition: string;
    examples: string[];
    category?: string;
    mastery: number;
    createdAt?: Date;
  }>;
}

export interface FormattedUserContext {
  notesSummary: string;
  vocabularySummary: string;
  recentNotes: string;
  keyVocabulary: string;
  totalTokens: number;
}

class UserDataLoader {
  /**
   * Charge toutes les données utilisateur nécessaires pour l'IA
   */
  async loadUserData(userId: string): Promise<UserDataForAI> {
    try {
      logger.debug('📥 [UserDataLoader] Chargement des données utilisateur pour:', userId);
      console.log('📥 [UserDataLoader] Début chargement données utilisateur...');

      // Charger en parallèle avec gestion d'erreur individuelle
      const [notesResult, vocabularyResult] = await Promise.allSettled([
        notesService.getNotes(userId),
        vocabularyService.getVocabulary(userId),
      ]);

      // Extraire les résultats ou utiliser des tableaux vides en cas d'erreur
      const notes = notesResult.status === 'fulfilled' ? notesResult.value : [];
      const vocabulary = vocabularyResult.status === 'fulfilled' ? vocabularyResult.value : [];

      if (notesResult.status === 'rejected') {
        console.warn('⚠️ [UserDataLoader] Erreur chargement notes:', notesResult.reason);
      }
      if (vocabularyResult.status === 'rejected') {
        console.warn('⚠️ [UserDataLoader] Erreur chargement vocabulaire:', vocabularyResult.reason);
      }

      // Formater les notes
      const formattedNotes = notes.map((note: Note) => ({
        id: note.id,
        title: note.title,
        content: note.content || '',
        tags: (note.tags || []).map((tag: any) => tag.name || tag),
        isPinned: note.is_pinned || false,
        updatedAt: new Date(note.updated_at || note.created_at),
      }));

      // Formater le vocabulaire avec la date de création
      const formattedVocabulary = vocabulary.map((entry: VocabularyEntry & { createdAt?: Date }) => ({
        word: entry.word,
        definition: entry.definition || '',
        examples: Array.isArray(entry.examples) ? entry.examples : (entry.examples ? [entry.examples] : []),
        category: entry.category,
        mastery: entry.mastery || 0,
        createdAt: entry.createdAt || (entry as any).created_at ? new Date((entry as any).created_at) : new Date(),
      }));

      logger.debug(`✅ [UserDataLoader] Données chargées: ${formattedNotes.length} notes, ${formattedVocabulary.length} mots`);

      return {
        notes: formattedNotes,
        vocabulary: formattedVocabulary,
      };
    } catch (error) {
      logger.error('❌ [UserDataLoader] Erreur lors du chargement:', error);
      // Retourner des données vides en cas d'erreur
      return {
        notes: [],
        vocabulary: [],
      };
    }
  }

  /**
   * Formate les données utilisateur pour le contexte IA
   */
  formatUserContext(data: UserDataForAI, maxTokens: number = 5000): FormattedUserContext {
    const parts: string[] = [];
    let currentTokens = 0;

    // 1. Résumé des notes (notes récentes/épinglées priorisées)
    const sortedNotes = [...data.notes]
      .sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return b.updatedAt.getTime() - a.updatedAt.getTime();
      })
      .slice(0, 10); // Limiter à 10 notes les plus pertinentes

    if (sortedNotes.length > 0) {
      const notesText = sortedNotes
        .map(note => {
          const tagsText = note.tags.length > 0 ? ` [Tags: ${note.tags.join(', ')}]` : '';
          return `- "${note.title}": ${(note.content || '').substring(0, 200)}${note.content && note.content.length > 200 ? '...' : ''}${tagsText}`;
        })
        .join('\n');

      const notesSummary = `## Notes personnelles (${data.notes.length} notes au total)\n\n${notesText}`;
      const notesTokens = this.estimateTokens(notesSummary);
      
      if (currentTokens + notesTokens <= maxTokens) {
        parts.push(notesSummary);
        currentTokens += notesTokens;
      }
    }

    // 2. Résumé du vocabulaire (inclure TOUS les mots récents, même ceux avec mastery: 0)
    // Pour avoir les "derniers ajoutés" dans le contexte
    // Trier par date de création décroissante pour avoir les plus récents en premier
    const sortedVocabulary = [...data.vocabulary]
      .sort((a, b) => {
        const dateA = a.createdAt?.getTime() || 0;
        const dateB = b.createdAt?.getTime() || 0;
        return dateB - dateA; // Plus récent en premier
      })
      .slice(0, 30); // Prendre les 30 premiers (les plus récents)

    if (sortedVocabulary.length > 0) {
      const vocabText = sortedVocabulary
        .map(v => {
          const examplesText = v.examples.length > 0 ? ` (Ex: ${v.examples.slice(0, 2).join(', ')})` : '';
          return `- ${v.word} (${v.mastery}%): ${v.definition}${examplesText}`;
        })
        .join('\n');

      // Identifier explicitement le dernier mot ajouté
      const vocabTextWithMarkers = sortedVocabulary
        .map((v, index) => {
          const examplesText = v.examples.length > 0 ? ` (Ex: ${v.examples.slice(0, 2).join(', ')})` : '';
          const isLastAdded = index === 0 ? ' ⭐ [DERNIER AJOUTÉ]' : '';
          return `- ${v.word}${isLastAdded}${v.mastery ? ` (${v.mastery}% maîtrisé)` : ' (nouveau)'}: ${v.definition}${examplesText}`;
        })
        .join('\n');
      
      const vocabularySummary = `## Vocabulaire personnel (${data.vocabulary.length} mots au total)\n\nLes mots sont listés ci-dessous, avec le DERNIER AJOUTÉ en premier.\n\n${vocabTextWithMarkers}`;
      const vocabTokens = this.estimateTokens(vocabularySummary);
      
      if (currentTokens + vocabTokens <= maxTokens * 0.5) { // Limiter à 50% du budget
        parts.push(vocabularySummary);
        currentTokens += vocabTokens;
      }
    }

    // 3. Notes récentes détaillées (3-5 notes les plus récentes)
    // Inclure aussi les notes récemment ajoutées pour avoir le "dernier ajout"
    const recentNotes = sortedNotes
      .slice(0, 5)
      .map((note, index) => {
        const tagsText = note.tags.length > 0 ? `\nTags: ${note.tags.join(', ')}` : '';
        const isNewest = index === 0 ? ' (NOTE LA PLUS RÉCENTE)' : '';
        return `### Note ${index === 0 ? '[DERNIÈRE]' : `[${index + 1}]`}: ${note.title}${isNewest}${tagsText}\n${note.content || '(pas de contenu)'}`;
      })
      .join('\n\n');

    const recentNotesTokens = this.estimateTokens(recentNotes);
    let recentNotesText = '';
    if (currentTokens + recentNotesTokens <= maxTokens * 0.3) { // 30% du budget pour les détails
      recentNotesText = `\n## Détails des notes récentes\n\n${recentNotes}`;
      currentTokens += recentNotesTokens;
    }

    // 4. Vocabulaire clé (mots récents et bien maîtrisés)
    // Inclure les mots récemment ajoutés en priorité
    const keyVocab = sortedVocabulary
      .slice(0, 15) // Plus de mots pour inclure les récents
      .map((v, index) => {
        const isNewest = index === 0 ? ' [DERNIER AJOUTÉ]' : '';
        return `${v.word}${isNewest}: ${v.definition}${v.examples.length > 0 ? ` (Ex: ${v.examples[0]})` : ''}`;
      })
      .join('\n');

    const keyVocabTokens = this.estimateTokens(keyVocab);
    let keyVocabText = '';
    if (currentTokens + keyVocabTokens <= maxTokens * 0.2) { // 20% du budget
      keyVocabText = `\n## Vocabulaire clé maîtrisé\n\n${keyVocab}`;
    }

    return {
      notesSummary: parts[0] || '',
      vocabularySummary: parts[1] || '',
      recentNotes: recentNotesText,
      keyVocabulary: keyVocabText,
      totalTokens: currentTokens,
    };
  }

  /**
   * Génère un prompt contextuel personnalisé pour l'IA
   */
  generatePersonalizedPrompt(userData: UserDataForAI, userQuestion: string): string {
    const context = this.formatUserContext(userData, 3000); // Limiter à 3000 tokens de contexte

    let prompt = `Tu es l'assistant IA de Centrinote. Tu aides l'utilisateur avec ses questions en t'appuyant sur ses notes personnelles et son vocabulaire.

`;

    if (context.notesSummary) {
      prompt += `${context.notesSummary}\n\n`;
    }

    if (context.vocabularySummary) {
      prompt += `${context.vocabularySummary}\n\n`;
    }

    prompt += `INSTRUCTIONS :
- Utilise les notes et le vocabulaire ci-dessus pour répondre de manière PERSONNALISÉE
- Si la question concerne un sujet traité dans les notes, fais référence aux notes pertinentes
- Utilise le vocabulaire personnel de l'utilisateur dans tes réponses quand c'est approprié
- Adapte ton niveau de langage et tes exemples au contexte de l'utilisateur
- Sois précis et référencé aux données personnelles quand c'est pertinent

Question de l'utilisateur: "${userQuestion}"

Réponds maintenant de manière personnalisée en tenant compte du contexte ci-dessus :`;

    return prompt;
  }

  /**
   * Estime le nombre de tokens (approximation)
   */
  private estimateTokens(text: string): number {
    // Approximation: ~3-4 caractères = 1 token
    return Math.ceil(text.length / 3);
  }
}

export const userDataLoader = new UserDataLoader();


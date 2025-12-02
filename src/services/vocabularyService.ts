import { supabase } from '../lib/supabase';
import { VocabularyEntry } from '../types';
import { logger } from '../utils/logger';
// Import dynamique comme pour les notes (pour éviter les problèmes de circular dependencies)

class VocabularyService {
  /**
   * Récupère tous les mots de vocabulaire d'un utilisateur
   */
  async getVocabulary(userId: string): Promise<VocabularyEntry[]> {
    try {
      logger.debug('🔄 Chargement du vocabulaire pour:', userId);
      
      const { data, error } = await supabase
        .from('vocabulary')
        .select('*')
        .eq('userId', userId) // ✅ CORRECTION: userId (camelCase) pour table vocabulary
        .order('created_at', { ascending: false }) // ✅ Tri par date de création décroissante (plus récents en premier)
        .order('word', { ascending: true }); // Tri secondaire par ordre alphabétique
        
      if (error) {
        logger.error('❌ Erreur lors du chargement du vocabulaire:', error);
        throw error;
      }
      
      // Convertir les dates string en objets Date
      const formattedData = data.map(item => ({
        ...item,
        lastReviewed: item.last_reviewed ? new Date(item.last_reviewed) : undefined,
        timesReviewed: item.times_reviewed,
        createdAt: item.created_at ? new Date(item.created_at) : new Date(), // ✅ Ajouter createdAt pour le tri
        // Adapter les noms de champs si nécessaire
        id: item.id,
        word: item.word,
        definition: item.definition,
        category: item.category || item.letter_category || 'General', // Support les deux noms pour compatibilité
        examples: item.examples || [],
        difficulty: item.difficulty,
        mastery: item.mastery,
        userId: item.userId // ✅ userId (camelCase) pour table vocabulary
      }));
      
      logger.debug(`✅ ${formattedData.length} mots de vocabulaire chargés`);
      return formattedData;
    } catch (error) {
      logger.error('❌ Erreur lors du chargement du vocabulaire:', error);
      throw error;
    }
  }

  /**
   * Ajoute un nouveau mot de vocabulaire
   */
  async addVocabularyEntry(entry: Omit<VocabularyEntry, 'id'>): Promise<VocabularyEntry> {
    try {
      logger.debug('🔄 Ajout d\'un nouveau mot de vocabulaire:', entry.word, 'pour utilisateur:', entry.userId);

      // ✅ LOGIQUE IDENTIQUE AUX NOTES: Les données sont déjà .trim() au niveau du composant
      // Vérifier que les champs ne sont pas vides après trim
      const trimmedWord = (entry.word || '').trim();
      const trimmedDefinition = (entry.definition || '').trim();
      
      if (!trimmedWord || trimmedWord.length === 0) {
        throw new Error('Le mot ne peut pas être vide');
      }
      
      if (!trimmedDefinition || trimmedDefinition.length === 0) {
        throw new Error('La définition ne peut pas être vide');
      }
      
      // 📏 VALIDATION: Vérifier les tailles de texte
      const wordLength = trimmedWord.length;
      const definitionLength = trimmedDefinition.length;

      console.log('📏 [VocabularyService] Tailles de texte:', {
        wordLength,
        definitionLength,
        totalLength: wordLength + definitionLength
      });

      // Limites recommandées pour éviter les problèmes de performance
      const MAX_WORD_LENGTH = 500;  // 500 caractères pour le mot/expression
      const MAX_DEFINITION_LENGTH = 10000;  // 10 000 caractères pour la définition

      if (wordLength > MAX_WORD_LENGTH) {
        const error = `Le mot/expression est trop long (${wordLength} caractères, maximum ${MAX_WORD_LENGTH})`;
        console.error('❌ [VocabularyService] VALIDATION ERROR:', error);
        throw new Error(error);
      }

      if (definitionLength > MAX_DEFINITION_LENGTH) {
        const error = `La définition est trop longue (${definitionLength} caractères, maximum ${MAX_DEFINITION_LENGTH})`;
        console.error('❌ [VocabularyService] VALIDATION ERROR:', error);
        throw new Error(error);
      }

      logger.debug('📝 Données du vocabulaire:', {
        word: entry.word,
        definition: entry.definition?.substring(0, 50) + '...',
        category: entry.category,
        user_id: entry.userId,
        wordLength,
        definitionLength
      });
      
      // ✅ LOGIQUE IDENTIQUE AUX NOTES: Utiliser directement les valeurs (déjà trimées)
      // Préparer les données pour Supabase (adapter les noms de champs)
      // ⚠️ IMPORTANT: La base de données peut utiliser 'category' ou 'letter_category'
      // On essaie d'abord avec 'category' (selon la migration), puis fallback sur 'letter_category'
      const categoryValue = entry.category || 'General';
      const supabaseEntry = {
        userId: entry.userId, // ✅ userId (camelCase) pour table vocabulary
        word: trimmedWord, // ✅ Utiliser directement (déjà trimé au niveau composant)
        definition: trimmedDefinition, // ✅ Utiliser directement (déjà trimé au niveau composant)
        category: categoryValue, // ✅ Utiliser 'category' selon la migration SQL
        examples: Array.isArray(entry.examples) ? entry.examples : (entry.examples ? [entry.examples].filter(Boolean) : []),
        difficulty: entry.difficulty,
        mastery: entry.mastery,
        times_reviewed: entry.timesReviewed || 0,
        last_reviewed: entry.lastReviewed ? entry.lastReviewed.toISOString() : null
      };
      
      logger.debug('📤 Données envoyées à Supabase:', supabaseEntry);
      console.log('🚀 [VocabularyService] Début de l\'insertion Supabase...', {
        word: supabaseEntry.word,
        userId: supabaseEntry.userId,
        definitionLength: supabaseEntry.definition.length,
        timestamp: new Date().toISOString(),
      });

      // 🔍 VÉRIFICATION PRÉALABLE: Vérifier si le mot existe déjà (pour éviter le timeout)
      console.log('🔍 [VocabularyService] Vérification des doublons...');
      const { data: existingWords, error: checkError } = await supabase
        .from('vocabulary')
        .select('id, word')
        .eq('userId', supabaseEntry.userId)
        .eq('word', supabaseEntry.word)
        .limit(1);

      if (checkError) {
        console.error('⚠️ [VocabularyService] Erreur lors de la vérification des doublons:', checkError);
        // On continue quand même, ce n'est qu'une vérification
      } else if (existingWords && existingWords.length > 0) {
        const duplicateError = `Le mot "${supabaseEntry.word}" existe déjà dans votre vocabulaire`;
        console.error('❌ [VocabularyService] DUPLICATE ERROR:', duplicateError);
        throw new Error(duplicateError);
      } else {
        console.log('✅ [VocabularyService] Aucun doublon détecté, insertion...');
      }

      // ✅ LOGIQUE IDENTIQUE AUX NOTES: Insertion directe et simple
      // Les notes font une insertion directe, on fait pareil ici
      // ⚠️ MAIS: Ajout d'un timeout explicite pour éviter les blocages indéfinis
      const startTime = Date.now();
      console.log('⏱️ [VocabularyService] Avant await supabase.insert...');
      
      // Créer la promesse d'insertion
      // ⚠️ ESSAIER D'ABORD AVEC letter_category (comme en production précédemment)
      // Si ça échoue avec PGRST204, on réessaiera avec category
      let insertEntry = {
        ...supabaseEntry,
        letter_category: categoryValue,
      };
      delete (insertEntry as any).category; // Supprimer category pour utiliser letter_category
      
      console.log('📤 [VocabularyService] Tentative d\'insertion avec letter_category...');
      const insertPromise = supabase
        .from('vocabulary')
        .insert([insertEntry])
        .select()
        .single();

      // Créer une promesse de timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('TIMEOUT_SUPABASE: La requête Supabase a pris plus de 20 secondes. Vérifiez votre connexion réseau, les policies RLS, et les contraintes de la table.'));
        }, 20000); // 20 secondes max
      });

      let data: any = null;
      let error: any = null;

      try {
        // Utiliser Promise.race pour détecter le timeout
        const result = await Promise.race([insertPromise, timeoutPromise]);
        
        // Si on arrive ici, c'est que la requête a répondu (pas de timeout)
        data = (result as any).data;
        error = (result as any).error;
        
        const duration = Date.now() - startTime;
        console.log(`✅ [VocabularyService] Insertion terminée en ${duration}ms`, {
          hasData: !!data,
          hasError: !!error,
          errorMessage: error?.message,
          errorCode: error?.code,
        });

        // Si erreur PGRST204 (colonne non trouvée), réessayer avec category
        if (error && (error.code === 'PGRST204' || error.message?.includes('PGRST204') || error.message?.includes('letter_category'))) {
          console.warn('⚠️ [VocabularyService] Erreur colonne "letter_category", tentative avec "category"');
          
          const retryEntry = {
            ...supabaseEntry,
            category: categoryValue,
          };
          delete (retryEntry as any).letter_category;
          
          const retryTimeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => {
              reject(new Error('TIMEOUT_SUPABASE'));
            }, 20000);
          });
          
          try {
            const retryResult = await Promise.race([
              supabase.from('vocabulary').insert([retryEntry]).select().single(),
              retryTimeoutPromise
            ]);
            
            data = (retryResult as any).data;
            error = (retryResult as any).error;
            console.log(`✅ [VocabularyService] Insertion réussie avec category`);
          } catch (retryError) {
            console.error('❌ [VocabularyService] Échec avec category aussi:', retryError);
            throw retryError;
          }
        }
      } catch (timeoutOrError) {
        const duration = Date.now() - startTime;
        if (timeoutOrError instanceof Error && timeoutOrError.message.includes('TIMEOUT_SUPABASE')) {
          console.error(`⏱️ [VocabularyService] TIMEOUT après ${duration}ms - La requête Supabase ne répond pas`);
          console.error('🔍 [VocabularyService] DIAGNOSTIC:');
          console.error('  - Vérifiez votre connexion réseau');
          console.error('  - Vérifiez les policies RLS dans Supabase (doivent permettre INSERT pour userId)');
          console.error('  - Vérifiez les contraintes de la table (index unique sur userId+word ?)');
          console.error('  - Vérifiez les logs Supabase pour des erreurs serveur');
          console.error('📊 [VocabularyService] Données envoyées:', {
            userId: supabaseEntry.userId,
            word: supabaseEntry.word,
            definitionLength: supabaseEntry.definition.length,
            definitionPreview: supabaseEntry.definition.substring(0, 100),
            category: categoryValue,
          });
          throw timeoutOrError;
        } else {
          // Autre erreur
          error = timeoutOrError;
          console.error(`❌ [VocabularyService] Erreur après ${duration}ms:`, timeoutOrError);
          throw timeoutOrError;
        }
      }

      if (error) {
        console.error('❌ [VocabularyService] Erreur Supabase reçue:', error);
        logger.error('❌ Erreur lors de l\'ajout du mot:', error);
        logger.error('📊 Détails de l\'erreur:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }

      if (!data) {
        const noDataError = 'No data returned from Supabase INSERT';
        console.error('❌ [VocabularyService] Aucune donnée retournée:', noDataError);
        logger.error('❌ Aucune donnée retournée par Supabase (data is null/undefined)');
        throw new Error(noDataError);
      }

      console.log('✅ [VocabularyService] Mot inséré avec succès dans Supabase:', data.id, data.word);
      logger.debug('✅ Mot inséré avec succès dans Supabase:', data.id);
      
      // Convertir le résultat au format VocabularyEntry
      const newEntry: VocabularyEntry = {
        id: data.id,
        word: data.word,
        definition: data.definition,
        category: data.category || data.letter_category || 'General', // Support les deux noms pour compatibilité
        examples: Array.isArray(data.examples) ? data.examples : [],
        difficulty: data.difficulty,
        mastery: data.mastery,
        timesReviewed: data.times_reviewed || 0,
        lastReviewed: data.last_reviewed ? new Date(data.last_reviewed) : undefined,
        userId: data.userId // ✅ userId (camelCase) pour table vocabulary
      };
      
      console.log('✅ [VocabularyService] Mot converti et retourné:', {
        id: newEntry.id,
        word: newEntry.word,
        userId: newEntry.userId,
      });
      logger.debug('✅ Mot converti et retourné:', newEntry);
      
      // Indexer le vocabulaire en arrière-plan (fallback si le trigger SQL ne fonctionne pas)
      // Utiliser setTimeout comme pour les notes pour éviter de bloquer
      setTimeout(async () => {
        try {
          console.log('🔄 [VocabularyService] Appel indexVocabulary pour:', {
            vocabularyId: newEntry.id,
            userId: entry.userId
          });
          const { indexVocabulary } = await import('./vocabularyIndexService');
          await indexVocabulary(newEntry.id, entry.userId);
          console.log('✅ [VocabularyService] Indexation vocabulaire réussie');
        } catch (err) {
          console.error('❌ [VocabularyService] Indexation vocabulaire échouée:', err);
          logger.warn('⚠️ Erreur indexation vocabulaire (non bloquant):', err);
        }
      }, 0);
      
      return newEntry;
    } catch (error) {
      console.error('❌ [VocabularyService] Exception dans addVocabularyEntry:', error);
      console.error('❌ [VocabularyService] Stack:', error instanceof Error ? error.stack : 'N/A');
      logger.error('❌ Erreur lors de l\'ajout du mot:', error);
      // Re-throw pour que le hook puisse gérer l'erreur
      throw error;
    }
  }

  /**
   * Met à jour un mot de vocabulaire existant
   */
  async updateVocabularyEntry(entry: VocabularyEntry): Promise<VocabularyEntry> {
    try {
      logger.debug('🔄 Mise à jour du mot (ID:', entry.id, ')');
      console.log('🔄 [VocabularyService] Mise à jour vocabulaire:', {
        id: entry.id,
        word: entry.word,
        definitionLength: entry.definition?.length || 0,
        definitionPreview: entry.definition?.substring(0, 100),
      });
      
      if (!entry.id) {
        throw new Error('ID du vocabulaire manquant pour la mise à jour');
      }
      
      // 📏 VALIDATION: Vérifier les tailles de texte (identique à addVocabularyEntry)
      const wordLength = (entry.word || '').trim().length;
      const definitionLength = (entry.definition || '').trim().length;
      
      console.log('📏 [VocabularyService] Tailles de texte:', {
        wordLength,
        definitionLength,
        totalLength: wordLength + definitionLength
      });
      
      // Limites recommandées pour éviter les problèmes de performance
      const MAX_WORD_LENGTH = 500;  // 500 caractères pour le mot/expression
      const MAX_DEFINITION_LENGTH = 10000;  // 10 000 caractères pour la définition
      const MIN_DEFINITION_LENGTH = 10;  // Minimum 10 caractères pour une définition valide
      
      if (wordLength === 0) {
        throw new Error('Le mot ne peut pas être vide');
      }
      
      if (wordLength > MAX_WORD_LENGTH) {
        const error = `Le mot/expression est trop long (${wordLength} caractères, maximum ${MAX_WORD_LENGTH})`;
        console.error('❌ [VocabularyService] VALIDATION ERROR:', error);
        throw new Error(error);
      }
      
      if (definitionLength === 0) {
        throw new Error('La définition ne peut pas être vide');
      }
      
      if (definitionLength < MIN_DEFINITION_LENGTH) {
        const error = `La définition est trop courte (${definitionLength} caractères, minimum ${MIN_DEFINITION_LENGTH})`;
        console.error('❌ [VocabularyService] VALIDATION ERROR:', error);
        throw new Error(error);
      }
      
      if (definitionLength > MAX_DEFINITION_LENGTH) {
        const error = `La définition est trop longue (${definitionLength} caractères, maximum ${MAX_DEFINITION_LENGTH})`;
        console.error('❌ [VocabularyService] VALIDATION ERROR:', error);
        throw new Error(error);
      }
      
      // Vérifier que la définition n'est pas juste des fragments parasites
      const trimmedDefinition = entry.definition?.trim() || '';
      const invalidPatterns = [
        /^(?:à|à la|la|définition de|dans ton vocabulaire)[\s:]*$/i,
        /^(?:Actuellement, tu as noté que)/i,
        /^(?:je remarque que)/i,
      ];
      
      for (const pattern of invalidPatterns) {
        if (pattern.test(trimmedDefinition)) {
          const error = `La définition extraite semble être un fragment parasite: "${trimmedDefinition.substring(0, 100)}"`;
          console.error('❌ [VocabularyService] VALIDATION ERROR (fragment):', error);
          throw new Error('La définition proposée semble invalide. Veuillez vérifier que l\'IA a bien extrait la définition complète.');
        }
      }
      
      // Préparer les données pour Supabase
      const supabaseEntry: any = {
        word: entry.word?.trim(),
        definition: entry.definition?.trim(),
        letter_category: entry.category || 'General',
        examples: Array.isArray(entry.examples) ? entry.examples : (entry.examples ? [entry.examples] : []),
        difficulty: entry.difficulty || 1,
        mastery: entry.mastery || 0,
        times_reviewed: entry.timesReviewed || 0,
        last_reviewed: entry.lastReviewed ? entry.lastReviewed.toISOString() : null,
      };
      
      console.log('📤 [VocabularyService] Données Supabase validées:', {
        ...supabaseEntry,
        definition: supabaseEntry.definition.substring(0, 100) + '...',
      });
      
      const { data, error } = await supabase
        .from('vocabulary')
        .update(supabaseEntry)
        .eq('id', entry.id)
        .eq('userId', entry.userId) // S'assurer que l'utilisateur possède ce mot
        .select()
        .single();
      
      console.log('📥 [VocabularyService] Réponse Supabase:', {
        hasData: !!data,
        hasError: !!error,
        errorMessage: error?.message,
        errorCode: error?.code,
      });
        
      if (error) {
        console.error('❌ [VocabularyService] Erreur lors de la mise à jour:', error);
        logger.error('❌ Erreur lors de la mise à jour du mot:', error);
        throw error;
      }
      
      if (!data) {
        throw new Error('Aucune donnée retournée par Supabase lors de la mise à jour');
      }
      
      // Convertir le résultat au format VocabularyEntry
      const updatedEntry: VocabularyEntry = {
        id: data.id,
        word: data.word,
        definition: data.definition,
        category: data.letter_category,
        examples: data.examples || [],
        difficulty: data.difficulty,
        mastery: data.mastery,
        timesReviewed: data.times_reviewed || 0,
        lastReviewed: data.last_reviewed ? new Date(data.last_reviewed) : undefined,
        userId: data.userId // ✅ CORRECTION: userId (camelCase) pour table vocabulary
      };
      
      logger.debug('✅ Mot mis à jour avec succès');
      
      // ✅ NOUVEAU : Vérifier immédiatement si un milestone est atteint (si mastery >= 80)
      if (entry.mastery >= 80 && entry.userId) {
        // Déclencher la vérification du milestone en arrière-plan (ne pas bloquer)
        this.checkVocabMilestone(entry.userId).catch(err => {
          console.warn('⚠️ [VocabularyService] Erreur lors de la vérification du milestone:', err);
          // Ne pas bloquer la mise à jour si la vérification échoue
        });
      }
      
      // Indexer le vocabulaire mis à jour en arrière-plan (fallback si le trigger SQL ne fonctionne pas)
      if (entry.userId) {
        // Utiliser setTimeout comme pour les notes pour éviter de bloquer
        setTimeout(async () => {
          try {
            console.log('🔄 [VocabularyService] Appel indexVocabulary pour mise à jour:', {
              vocabularyId: entry.id,
              userId: entry.userId
            });
            const { indexVocabulary } = await import('./vocabularyIndexService');
            await indexVocabulary(entry.id, entry.userId);
            console.log('✅ [VocabularyService] Indexation vocabulaire réussie');
          } catch (err) {
            console.error('❌ [VocabularyService] Indexation vocabulaire échouée:', err);
            logger.warn('⚠️ Erreur réindexation vocabulaire (non bloquant):', err);
          }
        }, 0);
      }
      
      return updatedEntry;
    } catch (error) {
      logger.error('❌ Erreur lors de la mise à jour du mot:', error);
      throw error;
    }
  }

  /**
   * Vérifie immédiatement si un milestone vocabulaire est atteint
   * Appelle l'automation vocab-milestone en arrière-plan
   */
  private async checkVocabMilestone(userId: string): Promise<void> {
    try {
      // Récupérer l'automation vocab-milestone active pour cet utilisateur
      const { data: automations, error: autoError } = await supabase
        .from('automations')
        .select('id, trigger_config, is_active')
        .eq('user_id', userId)
        .eq('name', 'vocab-milestone')
        .eq('is_active', true)
        .limit(1);

      if (autoError || !automations || automations.length === 0) {
        // Pas d'automation active, on ne fait rien
        return;
      }

      const automation = automations[0];
      const config = automation.trigger_config || { milestone: 50 };

      // Appeler l'Edge Function automation-micro-runner
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        console.warn('⚠️ [VocabularyService] VITE_SUPABASE_URL non défini');
        return;
      }
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.warn('⚠️ [VocabularyService] Pas de session pour vérifier le milestone');
        return;
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/automation-micro-runner`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateId: 'vocab-milestone',
          userId: userId,
          config: config,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`⚠️ [VocabularyService] Erreur lors de la vérification du milestone: ${response.status} - ${errorText}`);
      } else {
        const result = await response.json();
        console.log('✅ [VocabularyService] Vérification du milestone effectuée:', result);
        
        // Afficher le détail du résultat pour debug
        if (result.result) {
          console.log('📊 [VocabularyService] Résultat détaillé:', {
            success: result.result.success,
            skipped: result.result.skipped,
            reason: result.result.reason,
            vocabCount: result.result.vocabCount,
            milestone: result.result.milestone
          });
          
          if (result.result.skipped) {
            console.warn('⚠️ [VocabularyService] Milestone ignoré:', result.result.reason);
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ [VocabularyService] Erreur lors de la vérification du milestone:', error);
      // Ne pas bloquer la mise à jour si la vérification échoue
    }
  }

  /**
   * Supprime un mot de vocabulaire
   */
  async deleteVocabularyEntry(id: string): Promise<boolean> {
    try {
      logger.debug('🔄 Suppression du mot:', id);
      
      const { error } = await supabase
        .from('vocabulary')
        .delete()
        .eq('id', id);
        
      if (error) {
        logger.error('❌ Erreur lors de la suppression du mot:', error);
        throw error;
      }
      
      logger.debug('✅ Mot supprimé avec succès');
      return true;
    } catch (error) {
      logger.error('❌ Erreur lors de la suppression du mot:', error);
      throw error;
    }
  }
}

// Exporter une instance singleton
export const vocabularyService = new VocabularyService();
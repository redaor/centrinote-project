// =====================================================
// SERVICE: Indexation du vocabulaire
// =====================================================
// Service pour indexer les entrées de vocabulaire via l'Edge Function index-vocabulary
// Utilisé comme fallback si le trigger SQL ne fonctionne pas

import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';

/**
 * Indexe une entrée de vocabulaire via l'Edge Function index-vocabulary
 * @param vocabularyId ID de l'entrée de vocabulaire
 * @param userId ID de l'utilisateur
 */
export async function indexVocabulary(vocabularyId: string, userId: string): Promise<void> {
  try {
    console.log('🚀 [vocabularyIndexService] ===== DÉBUT INDEXATION VOCABULAIRE =====');
    console.log('🚀 [vocabularyIndexService] Paramètres reçus:', {
      vocabularyId,
      userId,
      vocabularyIdLength: vocabularyId?.length,
      userIdLength: userId?.length
    });
    
    if (!vocabularyId || !userId) {
      console.error('❌ [vocabularyIndexService] Paramètres manquants:', {
        hasVocabularyId: !!vocabularyId,
        hasUserId: !!userId
      });
      throw new Error('vocabularyId et userId sont requis');
    }
    
    logger.debug('Indexation du vocabulaire', {
      vocabularyId: vocabularyId.substring(0, 8) + "...",
      userId: userId.substring(0, 8) + "..."
    });

    console.log('📞 [vocabularyIndexService] Appel Edge Function index-vocabulary...');
    console.log('📞 [vocabularyIndexService] URL Supabase:', import.meta.env.VITE_SUPABASE_URL);
    
    const { data, error } = await supabase.functions.invoke('index-vocabulary', {
      body: {
        vocabulary_id: vocabularyId,
        user_id: userId
      }
    });

    console.log('📥 [vocabularyIndexService] Réponse Edge Function reçue:', { 
      hasData: !!data, 
      hasError: !!error,
      dataSuccess: data?.success,
      errorMessage: error?.message
    });

    if (error) {
      console.error('❌ [vocabularyIndexService] Erreur Edge Function:', error);
      logger.error('Erreur indexation vocabulaire', new Error(error.message), {
        vocabularyId: vocabularyId.substring(0, 8) + "...",
        errorDetails: error
      });
      throw error;
    }

    if (data && !data.success) {
      console.warn('⚠️ [vocabularyIndexService] Indexation échouée:', data.error);
      logger.warn('Indexation vocabulaire échouée', {
        vocabularyId: vocabularyId.substring(0, 8) + "...",
        error: data.error
      });
      throw new Error(data.error || 'Indexation échouée');
    }

    console.log('✅ [vocabularyIndexService] Vocabulaire indexé avec succès', {
      vocabularyId,
      chunkCount: data?.chunk_count || 0
    });
    
    logger.info('Vocabulaire indexé avec succès', {
      vocabularyId: vocabularyId.substring(0, 8) + "...",
      chunkCount: data?.chunk_count || 0
    });
  } catch (err) {
    console.error('❌ [vocabularyIndexService] Exception indexation vocabulaire:', err);
    logger.error('Exception indexation vocabulaire', err instanceof Error ? err : new Error(String(err)), {
      vocabularyId: vocabularyId.substring(0, 8) + "..."
    });
    // Ne pas bloquer l'opération principale si l'indexation échoue
    // L'indexation peut être réessayée plus tard
  }
}

/**
 * Ré-indexe toutes les entrées de vocabulaire d'un utilisateur
 * Utile pour réparer l'indexation ou après un changement de modèle d'embedding
 * @param userId ID de l'utilisateur
 */
export async function reindexAllVocabularyForUser(userId: string): Promise<void> {
  try {
    logger.info('Ré-indexation de tout le vocabulaire', {
      userId: userId.substring(0, 8) + "..."
    });

    // Récupérer toutes les entrées de vocabulaire
    const { data: vocabulary, error } = await supabase
      .from('vocabulary')
      .select('id')
      .eq('userId', userId);

    if (error) {
      throw error;
    }

    if (!vocabulary || vocabulary.length === 0) {
      logger.info('Aucun vocabulaire à indexer', {
        userId: userId.substring(0, 8) + "..."
      });
      return;
    }

    logger.info(`Indexation de ${vocabulary.length} entrées de vocabulaire`, {
      userId: userId.substring(0, 8) + "..."
    });

    // Indexer chaque entrée (avec un délai pour éviter la surcharge)
    for (const entry of vocabulary) {
      await indexVocabulary(entry.id, userId);
      // Petit délai entre chaque indexation
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    logger.info('Ré-indexation terminée', {
      userId: userId.substring(0, 8) + "...",
      count: vocabulary.length
    });
  } catch (err) {
    logger.error('Erreur ré-indexation vocabulaire', err instanceof Error ? err : new Error(String(err)), {
      userId: userId.substring(0, 8) + "..."
    });
    throw err;
  }
}


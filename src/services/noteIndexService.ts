/**
 * Service pour indexer les notes dans le système RAG
 * 
 * Ce service appelle l'Edge Function index-note pour générer les embeddings
 * d'une note et les stocker dans note_chunks_embeddings.
 */

import { supabase } from '../lib/supabase';

export interface IndexNoteResponse {
  success: boolean;
  message?: string;
  chunk_count?: number;
  tags?: string[];
  error?: string;
}

/**
 * Indexe une note (appel manuel si le trigger SQL ne fonctionne pas)
 */
export async function indexNote(
  noteId: string,
  userId: string
): Promise<IndexNoteResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('index-note', {
      body: {
        note_id: noteId,
        user_id: userId
      }
    });

    if (error) {
      console.error('❌ Erreur indexation note:', error);
      return {
        success: false,
        error: error.message || 'Erreur inconnue'
      };
    }

    return data as IndexNoteResponse;
  } catch (err) {
    console.error('❌ Erreur appel index-note:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erreur inconnue'
    };
  }
}

/**
 * Réindexe toutes les notes d'un utilisateur
 * (Utile après un changement de modèle d'embeddings)
 */
export async function reindexAllNotesForUser(userId: string): Promise<{
  success: boolean;
  indexed_count?: number;
  error?: string;
}> {
  try {
    // Récupérer toutes les notes de l'utilisateur
    const { data: notes, error: fetchError } = await supabase
      .from('notes')
      .select('id')
      .eq('userId', userId);

    if (fetchError) {
      return {
        success: false,
        error: fetchError.message
      };
    }

    if (!notes || notes.length === 0) {
      return {
        success: true,
        indexed_count: 0
      };
    }

    // Indexer chaque note en parallèle (avec limite pour éviter la surcharge)
    const batchSize = 5;
    let indexedCount = 0;

    for (let i = 0; i < notes.length; i += batchSize) {
      const batch = notes.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (note) => {
          const result = await indexNote(note.id, userId);
          if (result.success) {
            indexedCount++;
          }
        })
      );

      // Petit délai entre les batches pour éviter la surcharge
      if (i + batchSize < notes.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return {
      success: true,
      indexed_count: indexedCount
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erreur inconnue'
    };
  }
}


// netlify/functions/embed-all-notes.ts
// Script pour générer les embeddings pour TOUTES les notes et vocabulaire existants
// (pas seulement celles modifiées depuis 24h)
// À utiliser une seule fois pour initialiser le système

import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Accepter les deux formats : avec ou sans préfixe VITE_
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY or VITE_OPENAI_API_KEY environment variable is required');
}
if (!SUPABASE_URL) {
  throw new Error('SUPABASE_URL or VITE_SUPABASE_URL environment variable is required');
}
if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_SERVICE_ROLE_KEY environment variable is required');
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface Note {
  id: string;
  userId: string;
  title: string;
  content: string | null;
  updated_at: string;
}

interface Vocabulary {
  id: number | string; // bigint peut être retourné comme string ou number par Supabase
  userId: string;
  word: string;
  definition: string;
  category: string;
  updated_at: string;
}

/**
 * Génère l'embedding pour un texte donné
 */
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text.trim(),
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

/**
 * Traite TOUTES les notes (pas seulement celles modifiées depuis 24h)
 */
async function processAllNotes(forceRegenerate: boolean = false): Promise<{ processed: number; errors: number }> {
  // Récupérer TOUTES les notes
  console.log('🔍 Fetching all notes...');
  const { data: notes, error: notesError } = await supabase
    .from('notes')
    .select('id, "userId", title, content, updated_at')
    .order('updated_at', { ascending: false });

  if (notesError) {
    console.error('❌ Error fetching notes:', {
      message: notesError.message,
      code: notesError.code,
      details: notesError.details,
      hint: notesError.hint,
    });
    return { processed: 0, errors: 1 };
  }

  if (!notes || notes.length === 0) {
    console.log('⚠️ No notes to process');
    return { processed: 0, errors: 0 };
  }

  console.log(`📝 Found ${notes.length} notes to process`);

  // Vérifier combien ont déjà des embeddings
  const { count: existingEmbeddingsCount } = await supabase
    .from('user_embeddings')
    .select('*', { count: 'exact', head: true })
    .eq('content_type', 'note');
  
  console.log(`📊 Existing note embeddings in DB: ${existingEmbeddingsCount || 0}`);

  let processed = 0;
  let errors = 0;
  let skipped = 0;
  let skippedShort = 0;

  for (const note of notes) {
    try {
      // Préparer le texte à embedder (titre + contenu)
      const textToEmbed = `${note.title}\n${note.content || ''}`.trim();
      if (!textToEmbed || textToEmbed.length < 10) {
        console.log(`⏭️  Skipping note ${note.id} (${note.title?.substring(0, 30)}) - content too short`);
        skippedShort++;
        continue;
      }

      // Vérifier si l'embedding existe déjà
      const { data: existing, error: checkError } = await supabase
        .from('user_embeddings')
        .select('id')
        .eq('user_id', note.userId)
        .eq('note_id', note.id)
        .maybeSingle();

      if (checkError) {
        console.error(`❌ Error checking existing embedding for note ${note.id}:`, checkError);
      }

      if (existing && !forceRegenerate) {
        console.log(`⏭️  Skipping note ${note.id} (${note.title?.substring(0, 30)}) - embedding already exists`);
        skipped++;
        continue;
      }
      
      if (existing && forceRegenerate) {
        console.log(`🔄 Force regenerate note ${note.id} (${note.title?.substring(0, 30)})`);
        // Supprimer l'ancien embedding avant de créer le nouveau
        await supabase
          .from('user_embeddings')
          .delete()
          .eq('id', existing.id);
      }

      // Générer l'embedding
      const embedding = await generateEmbedding(textToEmbed);

      const embeddingData = {
        user_id: note.userId,
        note_id: note.id,
        vocabulary_id: null,
        content_type: 'note',
        content: textToEmbed.substring(0, 2000),
        embedding: embedding,
        metadata: {
          title: note.title,
          updated_at: note.updated_at,
        },
        updated_at: new Date().toISOString(),
      };

      let error;
      if (existing) {
        const { error: updateError } = await supabase
          .from('user_embeddings')
          .update(embeddingData)
          .eq('id', existing.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('user_embeddings')
          .insert(embeddingData);
        error = insertError;
      }

      if (error) {
        console.error(`Error ${existing ? 'updating' : 'inserting'} embedding for note ${note.id}:`, error);
        errors++;
      } else {
        console.log(`✅ ${existing ? 'Updated' : 'Processed'} note ${note.id}`);
        processed++;
      }

      // Rate limiting: attendre 100ms entre chaque requête pour éviter rate limit OpenAI
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Error processing note ${note.id}:`, error);
      errors++;
    }
  }

  console.log(`📝 Notes: ${processed} processed, ${skipped} skipped (existing), ${skippedShort} skipped (too short), ${errors} errors`);
  return { processed, errors };
}

/**
 * Traite TOUT le vocabulaire (pas seulement celui modifié depuis 24h)
 */
async function processAllVocabulary(): Promise<{ processed: number; errors: number }> {
  // Récupérer TOUT le vocabulaire
  const { data: vocabulary, error: vocabError } = await supabase
    .from('vocabulary')
    .select('id, "userId", word, definition, category, updated_at')
    .order('updated_at', { ascending: false });

  if (vocabError) {
    console.error('❌ Error fetching vocabulary:', {
      message: vocabError.message,
      code: vocabError.code,
      details: vocabError.details,
      hint: vocabError.hint,
    });
    return { processed: 0, errors: 1 };
  }

  if (!vocabulary || vocabulary.length === 0) {
    console.log('No vocabulary to process');
    return { processed: 0, errors: 0 };
  }

  console.log(`📚 Found ${vocabulary.length} vocabulary entries to process`);

  // Vérifier combien ont déjà des embeddings
  const { count: existingVocabEmbeddingsCount } = await supabase
    .from('user_embeddings')
    .select('*', { count: 'exact', head: true })
    .eq('content_type', 'vocabulary');
  
  console.log(`📊 Existing vocabulary embeddings in DB: ${existingVocabEmbeddingsCount || 0}`);

  // Log détaillé des premiers termes pour debug
  if (vocabulary.length > 0) {
    console.log(`📋 Sample vocabulary entries:`, vocabulary.slice(0, 3).map(v => ({
      id: v.id,
      idType: typeof v.id,
      word: v.word,
      userId: v.userId?.substring(0, 8) + '...',
    })));
  }

  let processed = 0;
  let errors = 0;
  let skipped = 0;

  for (const vocab of vocabulary) {
    try {
      console.log(`🔄 Processing vocabulary ${vocab.id} (${vocab.word?.substring(0, 30)})...`);
      
      // Guard : vérifier que word et definition existent et ne sont pas vides
      if (!vocab.word?.trim() || !vocab.definition?.trim()) {
        console.warn(`⚠️  Vocabulaire ${vocab.id} ignoré (texte vide): word="${vocab.word}", definition="${vocab.definition?.substring(0, 50)}"`);
        skipped++;
        continue;
      }
      
      // Préparer le texte à embedder (mot + définition)
      const textToEmbed = `${vocab.word.trim()}: ${vocab.definition.trim()}`;
      if (textToEmbed.length < 10) {
        console.warn(`⚠️  Vocabulaire ${vocab.id} ignoré - contenu trop court (${textToEmbed.length} chars)`);
        skipped++;
        continue;
      }

      // Convertir vocab.id en number pour la comparaison (bigint)
      let vocabIdForCheck: number;
      if (typeof vocab.id === 'string') {
        vocabIdForCheck = parseInt(vocab.id, 10);
        if (isNaN(vocabIdForCheck)) {
          console.error(`❌ Cannot parse vocabulary ID for check: ${vocab.id}`);
          errors++;
          continue;
        }
      } else {
        vocabIdForCheck = vocab.id as number;
      }

      // Vérifier si l'embedding existe déjà
      console.log(`🔍 Checking existing embedding for vocab ${vocabIdForCheck} (user: ${vocab.userId?.substring(0, 8)}...)`);
      const { data: existing, error: checkError } = await supabase
        .from('user_embeddings')
        .select('id')
        .eq('user_id', vocab.userId)
        .eq('vocabulary_id', vocabIdForCheck)
        .maybeSingle();

      if (checkError) {
        console.error(`❌ Error checking existing embedding for vocab ${vocab.id}:`, {
          message: checkError.message,
          code: checkError.code,
          details: checkError.details,
        });
      }

      if (existing && !forceRegenerate) {
        console.log(`⏭️  Skipping vocabulary ${vocab.id} - embedding already exists`);
        skipped++;
        continue;
      }
      
      if (existing && forceRegenerate) {
        console.log(`🔄 Force regenerate vocabulary ${vocab.id}`);
        // Supprimer l'ancien embedding avant de créer le nouveau
        await supabase
          .from('user_embeddings')
          .delete()
          .eq('id', existing.id);
      }

      // Générer l'embedding
      console.log(`🔄 Generating embedding for: "${textToEmbed.substring(0, 50)}..."`);
      let embedding: number[];
      try {
        embedding = await generateEmbedding(textToEmbed);
        if (!embedding || embedding.length !== 1536) {
          throw new Error(`Embedding invalide: longueur ${embedding?.length || 0}, attendu 1536`);
        }
        console.log(`✅ Embedding generated (${embedding.length} dimensions)`);
      } catch (embedError: any) {
        console.error(`❌ Erreur génération embedding pour vocab ${vocab.id}:`, {
          message: embedError?.message,
          textLength: textToEmbed.length,
          textPreview: textToEmbed.substring(0, 100),
        });
        errors++;
        continue;
      }

      // vocabulary.id est bigint, Supabase le retourne comme string ou number
      // On doit s'assurer que c'est un nombre pour la foreign key
      let vocabularyId: number;
      if (typeof vocab.id === 'string') {
        // Si c'est une string, convertir en number (bigint)
        const parsed = parseInt(vocab.id, 10);
        if (isNaN(parsed)) {
          console.error(`❌ Cannot parse vocabulary ID as number: ${vocab.id}`);
          errors++;
          continue;
        }
        vocabularyId = parsed;
      } else if (typeof vocab.id === 'number') {
        vocabularyId = vocab.id;
      } else {
        console.error(`❌ Unexpected vocabulary ID type: ${typeof vocab.id}, value: ${vocab.id}`);
        errors++;
        continue;
      }
      
      console.log(`✅ Vocabulary ID converted to number: ${vocabularyId} (was ${typeof vocab.id})`);

      // Gérer category (peut être null)
      const category = vocab.category?.trim() || 'General';
      
      const embeddingData = {
        user_id: vocab.userId,
        note_id: null,
        vocabulary_id: vocabularyId,
        content_type: 'vocabulary',
        content: textToEmbed.substring(0, 2000), // Limiter à 2000 chars
        embedding: embedding,
        metadata: {
          word: vocab.word.trim(),
          definition: vocab.definition.trim(),
          category: category,
          updated_at: vocab.updated_at,
        },
        updated_at: new Date().toISOString(),
      };

      console.log(`💾 Inserting/updating embedding for vocab ${vocab.id}...`);
      let error;
      if (existing && forceRegenerate) {
        // On a déjà supprimé l'ancien, donc on insère
        const { error: insertError } = await supabase
          .from('user_embeddings')
          .insert(embeddingData);
        error = insertError;
      } else if (existing) {
        // Mise à jour (ne devrait pas arriver car on skip si existing)
        const { error: updateError } = await supabase
          .from('user_embeddings')
          .update(embeddingData)
          .eq('id', existing.id);
        error = updateError;
      } else {
        // Insertion
        const { error: insertError } = await supabase
          .from('user_embeddings')
          .insert(embeddingData);
        error = insertError;
      }

      if (error) {
        console.error(`❌ Error ${existing ? 'updating' : 'inserting'} embedding for vocabulary ${vocab.id}:`, {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        errors++;
      } else {
        console.log(`✅ ${existing ? 'Updated' : 'Processed'} vocabulary ${vocab.id} (${vocab.word})`);
        processed++;
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Error processing vocabulary ${vocab.id}:`, error);
      errors++;
    }
  }

  console.log(`📚 Vocabulary: ${processed} processed, ${skipped} skipped (existing/too short), ${errors} errors`);
  return { processed, errors };
}

/**
 * Handler principal
 */
export const handler: Handler = async (event, context) => {
  const startTime = Date.now();
  
  // Vérifier si on doit forcer la régénération (query param ?force=true)
  const url = new URL(event.rawUrl || `https://${event.headers.host}${event.path}`);
  const forceRegenerate = url.searchParams.get('force') === 'true';

  if (forceRegenerate) {
    console.log('🔄 Mode FORCE activé - régénération de tous les embeddings');
  }
  
  console.log('🚀 Starting embed-all-notes job at', new Date().toISOString());

  try {
    // Traiter toutes les notes
    const notesResult = await processAllNotes(forceRegenerate);
    console.log(`📝 Notes: ${notesResult.processed} processed, ${notesResult.errors} errors`);

    // Traiter tout le vocabulaire
    const vocabResult = await processAllVocabulary(forceRegenerate);
    console.log(`📚 Vocabulary: ${vocabResult.processed} processed, ${vocabResult.errors} errors`);

    const totalProcessed = notesResult.processed + vocabResult.processed;
    const totalErrors = notesResult.errors + vocabResult.errors;
    const duration = Date.now() - startTime;

    console.log(`✅ Job completed in ${duration}ms: ${totalProcessed} processed, ${totalErrors} errors`);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        stats: {
          notes: notesResult,
          vocabulary: vocabResult,
          total: {
            processed: totalProcessed,
            errors: totalErrors,
          },
          duration_ms: duration,
        },
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('❌ Job failed:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration_ms: duration,
        timestamp: new Date().toISOString(),
      }),
    };
  }
};


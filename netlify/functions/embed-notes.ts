// netlify/functions/embed-notes.ts
// Job nightly pour générer les embeddings des notes et vocabulaire
// Trigger: 0 3 * * * (3h UTC via Netlify Scheduled Functions)

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
  id: string;
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
 * Traite les notes créées ou modifiées depuis 24h
 */
async function processNotes(): Promise<{ processed: number; errors: number }> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  // Récupérer les notes modifiées depuis 24h
  const { data: notes, error: notesError } = await supabase
    .from('notes')
    .select('id, "userId", title, content, updated_at')
    .gte('updated_at', yesterday.toISOString())
    .order('updated_at', { ascending: false });

  if (notesError) {
    console.error('Error fetching notes:', notesError);
    return { processed: 0, errors: 1 };
  }

  if (!notes || notes.length === 0) {
    console.log('No notes to process');
    return { processed: 0, errors: 0 };
  }

  let processed = 0;
  let errors = 0;

  for (const note of notes) {
    try {
      // Préparer le texte à embedder (titre + contenu)
      const textToEmbed = `${note.title}\n${note.content || ''}`.trim();
      if (!textToEmbed || textToEmbed.length < 10) {
        console.log(`Skipping note ${note.id} - content too short`);
        continue;
      }

      // Vérifier si l'embedding existe déjà
      const { data: existing } = await supabase
        .from('user_embeddings')
        .select('id')
        .eq('user_id', note.userId)
        .eq('note_id', note.id)
        .maybeSingle();

      // Générer l'embedding
      const embedding = await generateEmbedding(textToEmbed);

      const embeddingData = {
        user_id: note.userId,
        note_id: note.id,
        vocabulary_id: null,
        content_type: 'note',
        content: textToEmbed.substring(0, 2000), // Limiter à 2000 caractères pour stockage
        embedding: embedding, // Array JavaScript - Supabase le convertit en vector
        metadata: {
          title: note.title,
          updated_at: note.updated_at,
        },
        updated_at: new Date().toISOString(),
      };

      let error;
      if (existing) {
        // Mettre à jour l'embedding existant
        const { error: updateError } = await supabase
          .from('user_embeddings')
          .update(embeddingData)
          .eq('id', existing.id);
        error = updateError;
      } else {
        // Insérer un nouvel embedding
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

      // Rate limiting: attendre 50ms entre chaque requête
      await new Promise(resolve => setTimeout(resolve, 50));
    } catch (error) {
      console.error(`Error processing note ${note.id}:`, error);
      errors++;
    }
  }

  return { processed, errors };
}

/**
 * Traite le vocabulaire créé ou modifié depuis 24h
 */
async function processVocabulary(): Promise<{ processed: number; errors: number }> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  // Récupérer le vocabulaire modifié depuis 24h
  const { data: vocabulary, error: vocabError } = await supabase
    .from('vocabulary')
    .select('id, "userId", word, definition, category, updated_at')
    .gte('updated_at', yesterday.toISOString())
    .order('updated_at', { ascending: false });

  if (vocabError) {
    console.error('Error fetching vocabulary:', vocabError);
    return { processed: 0, errors: 1 };
  }

  if (!vocabulary || vocabulary.length === 0) {
    console.log('No vocabulary to process');
    return { processed: 0, errors: 0 };
  }

  let processed = 0;
  let errors = 0;

  for (const vocab of vocabulary) {
    try {
      // Préparer le texte à embedder (mot + définition)
      const textToEmbed = `${vocab.word}: ${vocab.definition}`.trim();
      if (!textToEmbed || textToEmbed.length < 10) {
        console.log(`Skipping vocabulary ${vocab.id} - content too short`);
        continue;
      }

      // Vérifier si l'embedding existe déjà
      const { data: existing } = await supabase
        .from('user_embeddings')
        .select('id')
        .eq('user_id', vocab.userId)
        .eq('vocabulary_id', vocab.id)
        .maybeSingle();

      // Générer l'embedding
      const embedding = await generateEmbedding(textToEmbed);

      const embeddingData = {
        user_id: vocab.userId,
        note_id: null,
        vocabulary_id: vocab.id,
        content_type: 'vocabulary',
        content: textToEmbed.substring(0, 2000),
        embedding: embedding, // Array JavaScript - Supabase le convertit en vector
        metadata: {
          word: vocab.word,
          category: vocab.category,
          updated_at: vocab.updated_at,
        },
        updated_at: new Date().toISOString(),
      };

      let error;
      if (existing) {
        // Mettre à jour l'embedding existant
        const { error: updateError } = await supabase
          .from('user_embeddings')
          .update(embeddingData)
          .eq('id', existing.id);
        error = updateError;
      } else {
        // Insérer un nouvel embedding
        const { error: insertError } = await supabase
          .from('user_embeddings')
          .insert(embeddingData);
        error = insertError;
      }

      if (error) {
        console.error(`Error ${existing ? 'updating' : 'inserting'} embedding for vocabulary ${vocab.id}:`, error);
        errors++;
      } else {
        console.log(`✅ ${existing ? 'Updated' : 'Processed'} vocabulary ${vocab.id}`);
        processed++;
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 50));
    } catch (error) {
      console.error(`Error processing vocabulary ${vocab.id}:`, error);
      errors++;
    }
  }

  return { processed, errors };
}

/**
 * Handler principal
 */
export const handler: Handler = async (event, context) => {
  const startTime = Date.now();
  console.log('🚀 Starting embed-notes job at', new Date().toISOString());

  try {
    // Traiter les notes
    const notesResult = await processNotes();
    console.log(`📝 Notes: ${notesResult.processed} processed, ${notesResult.errors} errors`);

    // Traiter le vocabulaire
    const vocabResult = await processVocabulary();
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


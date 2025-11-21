// scripts/generate-embeddings.js
// Script pour générer les embeddings de toutes les notes et vocabulaire
// Usage: node scripts/generate-embeddings.js

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Utiliser les variables d'environnement système (sécurisé)
// Vous pouvez les définir dans votre terminal avant d'exécuter le script :
// export OPENAI_API_KEY="sk-..."
// export SUPABASE_SERVICE_ROLE_KEY="eyJ..."
// export SUPABASE_URL="https://..."

// Ou les passer en ligne de commande :
// OPENAI_API_KEY="sk-..." SUPABASE_SERVICE_ROLE_KEY="eyJ..." node scripts/generate-embeddings.js

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY manquante dans .env');
  process.exit(1);
}
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquants dans .env');
  process.exit(1);
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Génère l'embedding pour un texte donné
 */
async function generateEmbedding(text) {
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
 * Traite toutes les notes
 */
async function processAllNotes() {
  console.log('\n📝 Traitement des notes...');
  
  const { data: notes, error: notesError } = await supabase
    .from('notes')
    .select('id, "userId", title, content, updated_at')
    .order('updated_at', { ascending: false });

  if (notesError) {
    console.error('❌ Erreur récupération notes:', notesError);
    return { processed: 0, errors: 1, skipped: 0 };
  }

  if (!notes || notes.length === 0) {
    console.log('ℹ️  Aucune note à traiter');
    return { processed: 0, errors: 0, skipped: 0 };
  }

  console.log(`📊 ${notes.length} notes trouvées`);

  let processed = 0;
  let errors = 0;
  let skipped = 0;

  for (const note of notes) {
    try {
      const textToEmbed = `${note.title}\n${note.content || ''}`.trim();
      if (!textToEmbed || textToEmbed.length < 10) {
        skipped++;
        continue;
      }

      // Vérifier si l'embedding existe déjà
      const { data: existing } = await supabase
        .from('user_embeddings')
        .select('id')
        .eq('user_id', note.userId)
        .eq('note_id', note.id)
        .maybeSingle();

      if (existing) {
        skipped++;
        continue;
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

      const { error: insertError } = await supabase
        .from('user_embeddings')
        .insert(embeddingData);

      if (insertError) {
        console.error(`❌ Erreur note ${note.id}:`, insertError.message);
        errors++;
      } else {
        processed++;
        if (processed % 10 === 0) {
          console.log(`  ✅ ${processed} notes traitées...`);
        }
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`❌ Erreur traitement note ${note.id}:`, error.message);
      errors++;
    }
  }

  return { processed, errors, skipped };
}

/**
 * Traite tout le vocabulaire
 */
async function processAllVocabulary() {
  console.log('\n📚 Traitement du vocabulaire...');
  
  const { data: vocabulary, error: vocabError } = await supabase
    .from('vocabulary')
    .select('id, "userId", word, definition, category, updated_at')
    .order('updated_at', { ascending: false });

  if (vocabError) {
    console.error('❌ Erreur récupération vocabulaire:', vocabError);
    return { processed: 0, errors: 1, skipped: 0 };
  }

  if (!vocabulary || vocabulary.length === 0) {
    console.log('ℹ️  Aucun vocabulaire à traiter');
    return { processed: 0, errors: 0, skipped: 0 };
  }

  console.log(`📊 ${vocabulary.length} entrées de vocabulaire trouvées`);

  let processed = 0;
  let errors = 0;
  let skipped = 0;

  for (const vocab of vocabulary) {
    try {
      const textToEmbed = `${vocab.word}: ${vocab.definition}`.trim();
      if (!textToEmbed || textToEmbed.length < 10) {
        skipped++;
        continue;
      }

      // Vérifier si l'embedding existe déjà
      const { data: existing } = await supabase
        .from('user_embeddings')
        .select('id')
        .eq('user_id', vocab.userId)
        .eq('vocabulary_id', vocab.id)
        .maybeSingle();

      if (existing) {
        skipped++;
        continue;
      }

      // Générer l'embedding
      const embedding = await generateEmbedding(textToEmbed);

      const embeddingData = {
        user_id: vocab.userId,
        note_id: null,
        vocabulary_id: vocab.id,
        content_type: 'vocabulary',
        content: textToEmbed.substring(0, 2000),
        embedding: embedding,
        metadata: {
          word: vocab.word,
          category: vocab.category,
          updated_at: vocab.updated_at,
        },
        updated_at: new Date().toISOString(),
      };

      const { error: insertError } = await supabase
        .from('user_embeddings')
        .insert(embeddingData);

      if (insertError) {
        console.error(`❌ Erreur vocab ${vocab.id}:`, insertError.message);
        errors++;
      } else {
        processed++;
        if (processed % 10 === 0) {
          console.log(`  ✅ ${processed} entrées traitées...`);
        }
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`❌ Erreur traitement vocab ${vocab.id}:`, error.message);
      errors++;
    }
  }

  return { processed, errors, skipped };
}

/**
 * Fonction principale
 */
async function main() {
  console.log('🚀 Génération des embeddings pour toutes les notes et vocabulaire\n');
  console.log(`📍 Supabase: ${SUPABASE_URL ? SUPABASE_URL.substring(0, 30) + '...' : '❌ Non configuré'}`);
  console.log(`🔑 OpenAI: ${OPENAI_API_KEY ? '✅ Configuré' : '❌ Manquant'}`);
  console.log(`🔐 Service Role: ${SUPABASE_SERVICE_ROLE_KEY ? '✅ Configuré' : '❌ Manquant'}\n`);
  
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.log('\n💡 Pour définir les variables d\'environnement :');
    console.log('   export OPENAI_API_KEY="sk-..."');
    console.log('   export SUPABASE_SERVICE_ROLE_KEY="eyJ..."');
    console.log('   export SUPABASE_URL="https://..."');
    console.log('   node scripts/generate-embeddings.js\n');
    console.log('   Ou en une ligne :');
    console.log('   OPENAI_API_KEY="sk-..." SUPABASE_SERVICE_ROLE_KEY="eyJ..." SUPABASE_URL="https://..." node scripts/generate-embeddings.js\n');
  }

  const startTime = Date.now();

  try {
    // Traiter les notes
    const notesResult = await processAllNotes();
    console.log(`\n📝 Notes: ${notesResult.processed} créés, ${notesResult.skipped} ignorés, ${notesResult.errors} erreurs`);

    // Traiter le vocabulaire
    const vocabResult = await processAllVocabulary();
    console.log(`\n📚 Vocabulaire: ${vocabResult.processed} créés, ${vocabResult.skipped} ignorés, ${vocabResult.errors} erreurs`);

    const totalProcessed = notesResult.processed + vocabResult.processed;
    const totalErrors = notesResult.errors + vocabResult.errors;
    const duration = Math.round((Date.now() - startTime) / 1000);

    console.log(`\n✅ Terminé en ${duration}s`);
    console.log(`   Total: ${totalProcessed} embeddings créés, ${totalErrors} erreurs`);

    if (totalProcessed > 0) {
      console.log('\n🎉 Les embeddings ont été générés avec succès !');
      console.log('   Vous pouvez maintenant tester l\'IA enrichie.');
    }
  } catch (error) {
    console.error('\n❌ Erreur fatale:', error);
    process.exit(1);
  }
}

// Exécuter
main();


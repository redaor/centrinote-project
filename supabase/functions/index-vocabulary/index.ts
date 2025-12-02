/**
 * Edge Function: index-vocabulary
 * 
 * Indexe une entrée de vocabulaire en générant un embedding.
 * Cette fonction est appelée automatiquement lors de la création/mise à jour d'une entrée.
 */

import { serve } from "https://deno.land/std@0.200.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Logger simple (sans dépendance au fichier partagé pour compatibilité Dashboard)
const logger = {
  info: (msg: string, data?: any) => console.log(`[INFO] ${msg}`, data ? JSON.stringify(data) : ""),
  warn: (msg: string, data?: any) => console.warn(`[WARN] ${msg}`, data ? JSON.stringify(data) : ""),
  error: (msg: string, err?: Error | any, data?: any) => {
    const errorMsg = err instanceof Error ? err.message : String(err || "");
    console.error(`[ERROR] ${msg}`, errorMsg, data ? JSON.stringify(data) : "");
  },
  debug: (msg: string, data?: any) => console.debug(`[DEBUG] ${msg}`, data ? JSON.stringify(data) : "")
};

// ============================================================================
// Configuration
// ============================================================================

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings";
const EMBEDDING_MODEL = "text-embedding-3-small"; // 1536 dimensions

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://localhost:3000",
  "https://centrinote.fr",
  "https://www.centrinote.fr"
]);

// ============================================================================
// Types
// ============================================================================

interface IndexRequest {
  vocabulary_id: string;
  user_id: string;
}

interface VocabularyData {
  id: string;
  userId: string;
  word: string;
  definition: string;
  pronunciation: string | null;
  category: string;
  examples: string[];
  difficulty: number;
  mastery: number;
}

// ============================================================================
// Helpers: CORS
// ============================================================================

function buildCorsHeaders(origin: string | null, includeContentType = true): HeadersInit {
  const allowedOrigin = origin && allowedOrigins.has(origin) ? origin : "*";
  const headers: HeadersInit = {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin"
  };

  if (includeContentType) {
    headers["Content-Type"] = "application/json";
  }

  return headers;
}

// ============================================================================
// Helpers: Formatage du texte de vocabulaire
// ============================================================================

/**
 * Formate une entrée de vocabulaire en texte pour l'embedding
 */
function formatVocabularyText(vocab: VocabularyData): string {
  const parts: string[] = [];
  
  // Mot/expression
  parts.push(`Mot: ${vocab.word}`);
  
  // Prononciation (si disponible)
  if (vocab.pronunciation) {
    parts.push(`Prononciation: ${vocab.pronunciation}`);
  }
  
  // Définition
  parts.push(`Définition: ${vocab.definition}`);
  
  // Exemples (si disponibles)
  if (vocab.examples && vocab.examples.length > 0) {
    const examplesText = vocab.examples
      .map((ex, idx) => `Exemple ${idx + 1}: ${ex}`)
      .join("\n");
    parts.push(`Exemples:\n${examplesText}`);
  }
  
  // Catégorie
  if (vocab.category) {
    parts.push(`Catégorie: ${vocab.category}`);
  }
  
  return parts.join("\n\n");
}

// ============================================================================
// Helpers: Embeddings
// ============================================================================

/**
 * Génère un embedding pour un texte donné
 */
async function generateEmbedding(text: string): Promise<number[]> {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY manquante");
  }

  const response = await fetch(OPENAI_EMBEDDINGS_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text.trim()
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erreur génération embedding: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

// ============================================================================
// Helpers: Récupération du vocabulaire
// ============================================================================

/**
 * Récupère une entrée de vocabulaire depuis Supabase
 */
async function getVocabulary(vocabularyId: string, userId: string): Promise<VocabularyData | null> {
  const { data, error } = await supabase
    .from("vocabulary")
    .select("id, \"userId\", word, definition, pronunciation, category, examples, difficulty, mastery")
    .eq("id", vocabularyId)
    .eq("userId", userId)
    .single();

  if (error || !data) {
    logger.error("Erreur récupération vocabulaire", new Error(error?.message || "Vocabulaire non trouvé"), {
      vocabularyId: vocabularyId.substring(0, 8) + "...",
      userId: userId.substring(0, 8) + "..."
    });
    return null;
  }

  // Convertir examples de jsonb en array de strings
  const examples = Array.isArray(data.examples) 
    ? data.examples.map((ex: any) => String(ex))
    : [];

  return {
    id: data.id,
    userId: data.userId,
    word: data.word,
    definition: data.definition,
    pronunciation: data.pronunciation,
    category: data.category || "General",
    examples: examples,
    difficulty: data.difficulty || 1,
    mastery: data.mastery || 0
  };
}

// ============================================================================
// Helpers: Upsert du chunk
// ============================================================================

/**
 * Supprime l'ancien chunk d'une entrée de vocabulaire et insère le nouveau
 */
async function upsertVocabularyChunkEmbedding(
  vocabularyId: string,
  userId: string,
  chunkText: string,
  embedding: number[],
  metadata: Record<string, any>
): Promise<void> {
  // 1. Supprimer l'ancien chunk
  const { error: deleteError } = await supabase
    .from("vocabulary_chunks_embeddings")
    .delete()
    .eq("vocabulary_id", vocabularyId);

  if (deleteError) {
    logger.warn("Erreur suppression ancien chunk", {
      vocabularyId: vocabularyId.substring(0, 8) + "...",
      error: new Error(deleteError.message)
    });
    // Continuer quand même
  }

  if (!chunkText || chunkText.trim().length === 0) {
    logger.info("Aucun texte à indexer", { vocabularyId: vocabularyId.substring(0, 8) + "..." });
    return;
  }

  // 2. Insérer le nouveau chunk
  const { error: insertError } = await supabase
    .from("vocabulary_chunks_embeddings")
    .insert({
      vocabulary_id: vocabularyId,
      user_id: userId,
      chunk_text: chunkText.trim(),
      embedding: `[${embedding.join(",")}]`, // Format string pour pgvector
      metadata: metadata
    });

  if (insertError) {
    logger.error("Erreur insertion chunk", new Error(insertError.message), {
      vocabularyId: vocabularyId.substring(0, 8) + "...",
      errorDetails: insertError
    });
    throw new Error(`Erreur insertion chunk: ${insertError.message}`);
  }

  logger.info("Chunk vocabulaire indexé avec succès", {
    vocabularyId: vocabularyId.substring(0, 8) + "..."
  });
}

// ============================================================================
// Handler principal
// ============================================================================

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = buildCorsHeaders(origin, true);

  logger.info("=== index-vocabulary appelé ===", {
    method: req.method,
    url: req.url,
    origin: origin || "none"
  });

  try {
    // Gérer OPTIONS (preflight CORS)
    if (req.method === "OPTIONS") {
      logger.info("OPTIONS preflight request");
      const preflightHeaders = buildCorsHeaders(origin, false);
      return new Response(null, { status: 204, headers: preflightHeaders });
    }

    if (!OPENAI_API_KEY) {
      logger.error("OPENAI_API_KEY manquante");
      throw new Error("OPENAI_API_KEY manquante");
    }

    // Valider et parser la requête
    logger.info("Parsing request body...");
    const body: IndexRequest = await req.json();
    logger.info("Request body parsé", {
      vocabulary_id: body.vocabulary_id?.substring(0, 8) + "...",
      user_id: body.user_id?.substring(0, 8) + "..."
    });
    
    const { vocabulary_id, user_id } = body;

    if (!vocabulary_id || !user_id) {
      logger.error("Paramètres manquants", {
        has_vocabulary_id: !!vocabulary_id,
        has_user_id: !!user_id
      });
      throw new Error("vocabulary_id et user_id sont requis");
    }

    logger.info("=== Indexation de vocabulaire démarrée ===", {
      vocabularyId: vocabulary_id,
      userId: user_id
    });

    // 1. Récupérer l'entrée de vocabulaire
    const vocabulary = await getVocabulary(vocabulary_id, user_id);
    if (!vocabulary) {
      throw new Error("Vocabulaire non trouvé ou accès refusé");
    }

    // 2. Formater le texte pour l'embedding
    const chunkText = formatVocabularyText(vocabulary);
    
    if (!chunkText || chunkText.trim().length === 0) {
      logger.info("Vocabulaire vide, pas d'indexation", {
        vocabularyId: vocabulary_id.substring(0, 8) + "..."
      });
      return new Response(
        JSON.stringify({
          success: true,
          message: "Vocabulaire vide, pas d'indexation nécessaire",
          chunk_count: 0
        }),
        { headers: corsHeaders }
      );
    }

    logger.debug("Vocabulaire formaté", {
      vocabularyId: vocabulary_id.substring(0, 8) + "...",
      chunkTextLength: chunkText.length
    });

    // 3. Générer l'embedding
    const embedding = await generateEmbedding(chunkText);

    // 4. Préparer les métadonnées
    const metadata = {
      word: vocabulary.word,
      category: vocabulary.category,
      difficulty: vocabulary.difficulty,
      mastery: vocabulary.mastery,
      has_pronunciation: !!vocabulary.pronunciation,
      examples_count: vocabulary.examples.length
    };

    // 5. Upsert le chunk dans la base de données
    await upsertVocabularyChunkEmbedding(
      vocabulary_id,
      user_id,
      chunkText,
      embedding,
      metadata
    );

    logger.info("Indexation terminée avec succès", {
      vocabularyId: vocabulary_id.substring(0, 8) + "..."
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Vocabulaire indexé avec succès",
        chunk_count: 1,
        word: vocabulary.word
      }),
      { headers: corsHeaders }
    );

  } catch (err: any) {
    logger.error("Erreur index-vocabulary", err instanceof Error ? err : new Error(err.message || String(err)), {
      function: "index-vocabulary"
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || "Erreur inconnue"
      }),
      {
        status: 200, // Toujours 200 pour ne pas bloquer le frontend
        headers: corsHeaders
      }
    );
  }
});


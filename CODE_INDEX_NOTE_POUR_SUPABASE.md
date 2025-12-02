# Code complet pour créer l'Edge Function `index-note` dans Supabase Dashboard

## Instructions

1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Allez dans **Edge Functions** dans le menu de gauche
4. Cliquez sur **"Create a new function"** ou **"New Function"**
5. Nommez-la : `index-note`
6. **Copiez-collez le code ci-dessous** dans l'éditeur
7. Cliquez sur **"Deploy"** ou **"Save"**

---

## Code à copier-coller

```typescript
/**
 * Edge Function: index-note
 * 
 * Indexe une note en la découpant en chunks et en générant des embeddings.
 * Cette fonction est appelée automatiquement lors de la création/mise à jour d'une note.
 */

import { serve } from "https://deno.land/std@0.200.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Logger simple (console.log pour Supabase)
const logger = {
  info: (msg: string, data?: any) => console.log(`[INFO] ${msg}`, data || ""),
  warn: (msg: string, data?: any) => console.warn(`[WARN] ${msg}`, data || ""),
  error: (msg: string, err?: Error | any, data?: any) => {
    console.error(`[ERROR] ${msg}`, err || "", data || "");
  },
  debug: (msg: string, data?: any) => console.debug(`[DEBUG] ${msg}`, data || "")
};

// ============================================================================
// Configuration
// ============================================================================

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings";
const EMBEDDING_MODEL = "text-embedding-3-small"; // 1536 dimensions

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// Configuration du chunking
const CHUNK_SIZE_TOKENS = 400; // Taille cible d'un chunk (tokens)
const CHUNK_OVERLAP_TOKENS = 50; // Chevauchement entre chunks (pour contexte)
const TOKEN_RATIO = 4; // Approximation: 1 token ≈ 4 caractères
const MIN_CHUNK_SIZE = 50; // Taille minimum d'un chunk (caractères)

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
  note_id: string;
  user_id: string;
}

interface NoteData {
  id: string;
  userId: string;
  title: string;
  content: string | null;
}

interface NoteChunk {
  index: number;
  text: string;
  embedding: number[];
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
// Helpers: Chunking
// ============================================================================

/**
 * Découpe un texte en chunks avec chevauchement
 */
function chunkNoteContent(title: string, content: string | null): string[] {
  const fullText = `${title}\n\n${content || ""}`.trim();
  
  if (!fullText || fullText.length < MIN_CHUNK_SIZE) {
    // Note trop courte, retourner un seul chunk
    return fullText ? [fullText] : [];
  }

  const chunks: string[] = [];
  const chunkSizeChars = CHUNK_SIZE_TOKENS * TOKEN_RATIO;
  const overlapChars = CHUNK_OVERLAP_TOKENS * TOKEN_RATIO;
  
  let start = 0;
  let chunkIndex = 0;

  while (start < fullText.length) {
    let end = start + chunkSizeChars;
    
    // Si on n'est pas à la fin, essayer de couper à un espace ou saut de ligne
    if (end < fullText.length) {
      // Chercher le dernier espace/saut de ligne avant la limite
      const lastSpace = fullText.lastIndexOf(" ", end);
      const lastNewline = fullText.lastIndexOf("\n", end);
      const cutPoint = Math.max(lastSpace, lastNewline);
      
      if (cutPoint > start) {
        end = cutPoint;
      }
    }

    const chunk = fullText.slice(start, end).trim();
    
    if (chunk.length >= MIN_CHUNK_SIZE) {
      chunks.push(chunk);
    }

    // Avancer avec chevauchement
    start = end - overlapChars;
    if (start <= 0) {
      start = end;
    }
    
    chunkIndex++;
    
    // Protection contre boucle infinie
    if (chunkIndex > 1000) {
      logger.warn("Trop de chunks générés, arrêt", { noteLength: fullText.length });
      break;
    }
  }

  return chunks.length > 0 ? chunks : [fullText];
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

/**
 * Génère des embeddings pour plusieurs textes en parallèle (avec limite)
 */
async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  // Limiter le nombre de textes pour éviter de surcharger l'API
  const maxBatchSize = 10;
  const batches: string[][] = [];
  
  for (let i = 0; i < texts.length; i += maxBatchSize) {
    batches.push(texts.slice(i, i + maxBatchSize));
  }

  const allEmbeddings: number[][] = [];

  for (const batch of batches) {
    const batchPromises = batch.map(text => generateEmbedding(text));
    const batchEmbeddings = await Promise.all(batchPromises);
    allEmbeddings.push(...batchEmbeddings);
  }

  return allEmbeddings;
}

// ============================================================================
// Helpers: Récupération de la note
// ============================================================================

/**
 * Récupère une note depuis Supabase
 */
async function getNote(noteId: string, userId: string): Promise<NoteData | null> {
  const { data, error } = await supabase
    .from("notes")
    .select("id, \"userId\", title, content")
    .eq("id", noteId)
    .eq("userId", userId)
    .single();

  if (error || !data) {
    logger.error("Erreur récupération note", new Error(error?.message || "Note non trouvée"), {
      noteId: noteId.substring(0, 8) + "...",
      userId: userId.substring(0, 8) + "..."
    });
    return null;
  }

  return {
    id: data.id,
    userId: data.userId,
    title: data.title,
    content: data.content
  };
}

/**
 * Récupère les tags d'une note
 */
async function getNoteTags(noteId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("note_tags")
    .select("tag_id, tags(name)")
    .eq("note_id", noteId);

  if (error || !data) {
    return [];
  }

  return data
    .map((row: any) => row.tags?.name)
    .filter((name: string | undefined): name is string => !!name);
}

// ============================================================================
// Helpers: Upsert des chunks
// ============================================================================

/**
 * Supprime les anciens chunks d'une note et insère les nouveaux
 */
async function upsertNoteChunksEmbeddings(
  noteId: string,
  userId: string,
  chunks: NoteChunk[],
  tags: string[]
): Promise<void> {
  // 1. Supprimer les anciens chunks
  const { error: deleteError } = await supabase
    .from("note_chunks_embeddings")
    .delete()
    .eq("note_id", noteId);

  if (deleteError) {
    logger.warn("Erreur suppression anciens chunks", {
      noteId: noteId.substring(0, 8) + "...",
      error: new Error(deleteError.message)
    });
    // Continuer quand même
  }

  if (chunks.length === 0) {
    logger.info("Aucun chunk à insérer", { noteId: noteId.substring(0, 8) + "..." });
    return;
  }

  // 2. Préparer les données à insérer
  const chunksToInsert = chunks.map((chunk) => ({
    note_id: noteId,
    user_id: userId,
    chunk_index: chunk.index,
    chunk_text: chunk.text,
    embedding: `[${chunk.embedding.join(",")}]`, // Format string pour pgvector
    metadata: {
      tags: tags,
      chunk_count: chunks.length
    }
  }));

  // 3. Insérer les nouveaux chunks (par batch pour éviter les limites)
  const batchSize = 50;
  for (let i = 0; i < chunksToInsert.length; i += batchSize) {
    const batch = chunksToInsert.slice(i, i + batchSize);
    
    const { error: insertError } = await supabase
      .from("note_chunks_embeddings")
      .insert(batch);

    if (insertError) {
      logger.error("Erreur insertion chunks", new Error(insertError.message), {
        noteId: noteId.substring(0, 8) + "...",
        batchIndex: i,
        batchSize: batch.length
      });
      throw new Error(`Erreur insertion chunks: ${insertError.message}`);
    }
  }

  logger.info("Chunks indexés avec succès", {
    noteId: noteId.substring(0, 8) + "...",
    chunkCount: chunks.length
  });
}

// ============================================================================
// Handler principal
// ============================================================================

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = buildCorsHeaders(origin, true);

  try {
    // Gérer OPTIONS (preflight CORS)
    if (req.method === "OPTIONS") {
      const preflightHeaders = buildCorsHeaders(origin, false);
      return new Response(null, { status: 204, headers: preflightHeaders });
    }

    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY manquante");
    }

    // Valider et parser la requête
    const body: IndexRequest = await req.json();
    const { note_id, user_id } = body;

    if (!note_id || !user_id) {
      throw new Error("note_id et user_id sont requis");
    }

    logger.info("Indexation de note démarrée", {
      noteId: note_id.substring(0, 8) + "...",
      userId: user_id.substring(0, 8) + "..."
    });

    // 1. Récupérer la note
    const note = await getNote(note_id, user_id);
    if (!note) {
      throw new Error("Note non trouvée ou accès refusé");
    }

    // 2. Récupérer les tags de la note
    const tags = await getNoteTags(note_id);

    // 3. Découper la note en chunks
    const chunkTexts = chunkNoteContent(note.title, note.content);
    
    if (chunkTexts.length === 0) {
      logger.info("Note vide, pas d'indexation", {
        noteId: note_id.substring(0, 8) + "..."
      });
      return new Response(
        JSON.stringify({
          success: true,
          message: "Note vide, pas d'indexation nécessaire",
          chunk_count: 0
        }),
        { headers: corsHeaders }
      );
    }

    logger.debug("Note découpée en chunks", {
      noteId: note_id.substring(0, 8) + "...",
      chunkCount: chunkTexts.length
    });

    // 4. Générer les embeddings pour tous les chunks
    const embeddings = await generateEmbeddingsBatch(chunkTexts);

    // 5. Préparer les chunks avec leurs embeddings
    const chunks: NoteChunk[] = chunkTexts.map((text, index) => ({
      index,
      text,
      embedding: embeddings[index]
    }));

    // 6. Upsert les chunks dans la base de données
    await upsertNoteChunksEmbeddings(note_id, user_id, chunks, tags);

    logger.info("Indexation terminée avec succès", {
      noteId: note_id.substring(0, 8) + "...",
      chunkCount: chunks.length
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Note indexée avec succès",
        chunk_count: chunks.length,
        tags: tags
      }),
      { headers: corsHeaders }
    );

  } catch (err: any) {
    logger.error("Erreur index-note", err instanceof Error ? err : new Error(err.message || String(err)), {
      function: "index-note"
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
```

---

## ⚠️ Important : Configurer le secret OPENAI_API_KEY

Après avoir créé la fonction, vous DEVEZ configurer le secret :

1. Allez dans **Settings** > **Edge Functions** > **Secrets**
2. Cliquez sur **"Add a new secret"**
3. Nom : `OPENAI_API_KEY`
4. Valeur : Votre clé API OpenAI
5. Cliquez sur **"Save"**

Sans ce secret, la fonction ne pourra pas générer les embeddings !

---

## ✅ Vérification

Après le déploiement :

1. Créez une note dans votre application
2. Attendez quelques secondes
3. Vérifiez dans **Edge Functions** > **Logs** que `index-note` a été appelée
4. Vérifiez dans la base de données :

```sql
SELECT COUNT(*) FROM note_chunks_embeddings WHERE note_id = 'ID_DE_VOTRE_NOTE';
```

Si vous voyez des chunks, l'indexation fonctionne ! 🎉


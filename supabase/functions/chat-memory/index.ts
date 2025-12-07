/**
 * Edge Function: chat-memory
 * 
 * Système de mémoire de conversation avec recherche sémantique via pgvector.
 * 
 * Fonctionnalités:
 * - Création/gestion de conversations persistantes
 * - Sauvegarde des messages avec embeddings
 * - Recherche sémantique pour mémoire contextuelle
 * - Résumés périodiques pour conversations longues
 * - Gestion intelligente des limites de tokens
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
const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings";
const EMBEDDING_MODEL = "text-embedding-3-small"; // 1536 dimensions
const CHAT_MODEL = "gpt-4o-mini"; // Modèle économique pour production

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// Limites de configuration
const MAX_RECENT_MESSAGES = 20; // Nombre de messages récents à inclure
const MAX_SEMANTIC_RESULTS = 10; // Nombre de résultats de recherche sémantique
const MAX_NOTE_CHUNKS = 8; // Nombre maximum de chunks de notes à inclure
const MAX_VOCABULARY_CHUNKS = 5; // Nombre maximum d'entrées de vocabulaire à inclure
const MIN_NOTE_SIMILARITY = 0.5; // Score minimum de similarité pour un chunk de note (réduit de 0.7 à 0.5 pour plus de résultats)
const MIN_VOCABULARY_SIMILARITY = 0.5; // Score minimum de similarité pour une entrée de vocabulaire
const MAX_CONVERSATION_MESSAGES = 50; // Seuil pour déclencher un résumé
const MAX_TOKENS_ESTIMATE = 8000; // Estimation max de tokens dans le prompt
const TOKEN_RATIO = 4; // Approximation: 1 token ≈ 4 caractères

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

interface ChatRequest {
  user_id: string;
  conversation_id: string | null;
  message: string;
}

interface ChatResponse {
  success: boolean;
  conversation_id: string;
  response: string;
  metadata?: {
    recent_messages_count: number;
    semantic_messages_count: number;
    summaries_count: number;
    note_chunks_count: number;
    vocabulary_chunks_count: number;
    notes_used?: Array<{ note_id: string; title: string }>;
    vocabulary_used?: Array<{ vocabulary_id: string; word: string }>;
    total_tokens_estimate: number;
  };
  error?: string;
}

interface Conversation {
  id: string;
  user_id: string;
  title: string | null;
  created_at: string;
}

interface Message {
  id: string;
  conversation_id: string;
  user_id: string | null;
  role: "user" | "assistant" | "system";
  content: string;
  embedding: number[] | null;
  created_at: string;
}

interface SemanticMessage {
  id: string;
  role: string;
  content: string;
  created_at: string;
  similarity: number;
}

interface NoteChunk {
  id: string;
  note_id: string;
  chunk_index: number;
  chunk_text: string;
  similarity: number;
  note_title: string;
  note_tags: string[];
  note_updated_at: string;
}

interface VocabularyChunk {
  id: string;
  vocabulary_id: string;
  chunk_text: string;
  similarity: number;
  word: string;
  definition: string;
  category: string;
  examples: string[];
  difficulty: number;
  mastery: number;
  vocabulary_updated_at: string;
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
// Helpers: Embeddings
// ============================================================================

/**
 * Génère un embedding pour un texte donné via l'API OpenAI
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
// Helpers: Conversations
// ============================================================================

/**
 * Crée ou récupère une conversation
 */
async function getOrCreateConversation(
  userId: string,
  conversationId: string | null,
  firstMessage: string
): Promise<Conversation> {
  // Si conversation_id fourni, vérifier qu'elle existe et appartient à l'utilisateur
  if (conversationId) {
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", conversationId)
      .eq("user_id", userId)
      .single();

    if (!error && data) {
      return data as Conversation;
    }
    // Si erreur ou conversation non trouvée, créer une nouvelle
    logger.warn(`Conversation non trouvée, création d'une nouvelle`, {
      conversationId: conversationId.substring(0, 8) + "...",
      userId: userId.substring(0, 8) + "..."
    });
  }

  // Créer une nouvelle conversation avec un titre basé sur les premiers mots
  const title = firstMessage.slice(0, 50).trim() + (firstMessage.length > 50 ? "..." : "");

  const { data, error } = await supabase
    .from("conversations")
    .insert({
      user_id: userId,
      title: title
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Erreur création conversation: ${error?.message || "Données manquantes"}`);
  }

  return data as Conversation;
}

// ============================================================================
// Helpers: Messages
// ============================================================================

/**
 * Sauvegarde un message avec son embedding
 */
async function saveMessageWithEmbedding(
  conversationId: string,
  userId: string | null,
  role: "user" | "assistant" | "system",
  content: string,
  generateEmbeddingFor: boolean = true
): Promise<Message> {
  let embedding: number[] | null = null;

  // Générer l'embedding uniquement pour les messages utilisateur et assistant
  if (generateEmbeddingFor && (role === "user" || role === "assistant")) {
    try {
      embedding = await generateEmbedding(content);
    } catch (err) {
      logger.warn(`Erreur génération embedding pour message ${role}`, { 
        role, 
        error: err instanceof Error ? err : new Error(String(err)) 
      });
      // Continuer sans embedding plutôt que d'échouer
    }
  }

  // Préparer les données d'insertion
  const insertData: any = {
    conversation_id: conversationId,
    user_id: userId,
    role: role,
    content: content,
    token_count: Math.ceil(content.length / TOKEN_RATIO) // Estimation
  };

  // Ajouter l'embedding si disponible (format array pour pgvector)
  if (embedding) {
    insertData.embedding = `[${embedding.join(",")}]`;
  }

  const { data, error } = await supabase
    .from("messages")
    .insert(insertData)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Erreur sauvegarde message: ${error?.message || "Données manquantes"}`);
  }

  return data as Message;
}

/**
 * Récupère les N derniers messages d'une conversation
 */
async function getRecentMessages(
  conversationId: string,
  limit: number = MAX_RECENT_MESSAGES
): Promise<Message[]> {
  const { data, error } = await supabase
    .rpc("get_recent_messages", {
      p_conversation_id: conversationId,
      p_limit: limit
    });

  if (error) {
    throw new Error(`Erreur récupération messages récents: ${error.message}`);
  }

  // Convertir en format Message (l'ordre est DESC, donc inverser)
  return (data || []).reverse().map((msg: any) => ({
    id: msg.id,
    conversation_id: conversationId,
    user_id: null,
    role: msg.role,
    content: msg.content,
    embedding: null,
    created_at: msg.created_at
  })) as Message[];
}

// ============================================================================
// Helpers: Recherche sémantique
// ============================================================================

/**
 * Recherche sémantique de messages pertinents
 */
async function retrieveSemanticMemory(
  conversationId: string,
  queryEmbedding: number[],
  limit: number = MAX_SEMANTIC_RESULTS,
  excludeIds: string[] = []
): Promise<SemanticMessage[]> {
  // Convertir l'embedding en format string pour pgvector
  const embeddingString = `[${queryEmbedding.join(",")}]`;
  
  const { data, error } = await supabase
    .rpc("search_semantic_messages", {
      p_conversation_id: conversationId,
      p_query_embedding: embeddingString,
      p_limit: limit,
      p_exclude_ids: excludeIds.length > 0 ? excludeIds : null
    });

  if (error) {
    logger.warn(`Erreur recherche sémantique`, { 
      conversationId, 
      error: new Error(error.message) 
    });
    return []; // Retourner tableau vide plutôt que d'échouer
  }

  return (data || []) as SemanticMessage[];
}

/**
 * Récupère les résumés de conversation
 */
async function getConversationSummaries(conversationId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from("conversation_summaries")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(3); // Derniers 3 résumés

  if (error) {
    logger.warn(`Erreur récupération résumés`, { 
      conversationId, 
      error: new Error(error.message) 
    });
    return [];
  }

  return data || [];
}

/**
 * Récupère la dernière note créée/modifiée par l'utilisateur
 * Utile pour répondre à "quelle est ma dernière note" sans nom explicite
 */
async function getLastNote(userId: string): Promise<{ id: string; title: string; content: string | null; updated_at: string } | null> {
  const { data, error } = await supabase
    .from("notes")
    .select("id, title, content, updated_at")
    .eq("userId", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    logger.debug(`Aucune note trouvée pour l'utilisateur`, {
      userId: userId.substring(0, 8) + "...",
      error: error?.message
    });
    return null;
  }

  return {
    id: data.id,
    title: data.title,
    content: data.content,
    updated_at: data.updated_at
  };
}

/**
 * Récupère la dernière entrée de vocabulaire créée/modifiée par l'utilisateur
 * Utile pour répondre à "mon dernier vocabulaire" sans nom explicite
 */
async function getLastVocabulary(userId: string): Promise<{ id: string; word: string; definition: string; category: string; examples: string[]; updated_at: string } | null> {
  const { data, error } = await supabase
    .from("vocabulary")
    .select("id, word, definition, category, examples, updated_at")
    .eq("userId", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    logger.debug(`Aucune entrée de vocabulaire trouvée pour l'utilisateur`, {
      userId: userId.substring(0, 8) + "...",
      error: error?.message
    });
    return null;
  }

  const examples = Array.isArray(data.examples) 
    ? data.examples.map((ex: any) => String(ex))
    : [];

  return {
    id: data.id,
    word: data.word,
    definition: data.definition,
    category: data.category || "General",
    examples: examples,
    updated_at: data.updated_at
  };
}

/**
 * Recherche les chunks de notes pertinents pour une requête
 * Utilise la fonction SQL search_note_chunks qui retourne déjà les métadonnées
 */
async function retrieveRelevantNoteChunks(
  userId: string,
  queryEmbedding: number[],
  limit: number = MAX_NOTE_CHUNKS,
  minSimilarity: number = MIN_NOTE_SIMILARITY
): Promise<NoteChunk[]> {
  if (!queryEmbedding || queryEmbedding.length === 0) {
    return [];
  }

  const embeddingString = `[${queryEmbedding.join(",")}]`;

  logger.info(`Recherche chunks de notes`, {
    userId: userId.substring(0, 8) + "...",
    embeddingLength: queryEmbedding.length,
    limit,
    minSimilarity,
    embeddingStringPreview: embeddingString.substring(0, 50) + "..."
  });

  const { data, error } = await supabase
    .rpc("search_note_chunks", {
      p_user_id: userId,
      p_query_embedding: embeddingString,
      p_limit: limit,
      p_similarity_threshold: minSimilarity,
      p_tag_filter: null
    });

  if (error) {
    logger.error(`Erreur recherche chunks de notes`, new Error(error.message), { 
      userId: userId.substring(0, 8) + "...",
      errorDetails: error
    });
    return [];
  }

  logger.info(`Résultat recherche chunks de notes`, {
    resultCount: data?.length || 0,
    results: data?.slice(0, 3).map((r: any) => ({
      note_id: r.note_id?.substring(0, 8) + "...",
      similarity: r.similarity,
      chunk_preview: r.chunk_text?.substring(0, 50) + "..."
    })) || []
  });

  // La fonction SQL retourne déjà les métadonnées, on les mappe directement
  return (data || []).map((row: any) => ({
    id: row.id,
    note_id: row.note_id,
    chunk_index: row.chunk_index,
    chunk_text: row.chunk_text,
    similarity: row.similarity,
    note_title: row.note_title || "Note sans titre",
    note_tags: row.note_tags || [],
    note_updated_at: row.note_updated_at
  })) as NoteChunk[];
}

/**
 * Recherche les entrées de vocabulaire pertinentes pour une requête
 * Utilise la fonction SQL search_vocabulary_chunks
 */
async function retrieveRelevantVocabularyChunks(
  userId: string,
  queryEmbedding: number[],
  limit: number = MAX_VOCABULARY_CHUNKS,
  minSimilarity: number = MIN_VOCABULARY_SIMILARITY
): Promise<VocabularyChunk[]> {
  if (!queryEmbedding || queryEmbedding.length === 0) {
    return [];
  }

  const embeddingString = `[${queryEmbedding.join(",")}]`;

  logger.info(`Recherche chunks de vocabulaire`, {
    userId: userId.substring(0, 8) + "...",
    embeddingLength: queryEmbedding.length,
    limit,
    minSimilarity
  });

  const { data, error } = await supabase
    .rpc("search_vocabulary_chunks", {
      p_user_id: userId,
      p_query_embedding: embeddingString,
      p_limit: limit,
      p_similarity_threshold: minSimilarity,
      p_category_filter: null
    });

  if (error) {
    logger.error(`Erreur recherche chunks de vocabulaire`, new Error(error.message), { 
      userId: userId.substring(0, 8) + "...",
      errorDetails: error
    });
    return [];
  }

  logger.info(`Résultat recherche chunks de vocabulaire`, {
    resultCount: data?.length || 0,
    results: data?.slice(0, 3).map((r: any) => ({
      vocabulary_id: r.vocabulary_id?.substring(0, 8) + "...",
      word: r.word,
      similarity: r.similarity
    })) || []
  });

  // La fonction SQL retourne déjà les métadonnées, on les mappe directement
  return (data || []).map((row: any) => ({
    id: row.id,
    vocabulary_id: row.vocabulary_id,
    chunk_text: row.chunk_text,
    similarity: row.similarity,
    word: row.word || "",
    definition: row.definition || "",
    category: row.category || "General",
    examples: Array.isArray(row.examples) ? row.examples : [],
    difficulty: row.difficulty || 1,
    mastery: row.mastery || 0,
    vocabulary_updated_at: row.vocabulary_updated_at
  })) as VocabularyChunk[];
}

// ============================================================================
// Helpers: Construction du prompt
// ============================================================================

/**
 * Construit le prompt final pour le LLM avec mémoire contextuelle et notes
 */
function buildPrompt(
  userMessage: string,
  recentMessages: Message[],
  semanticMessages: SemanticMessage[],
  summaries: any[],
  noteChunks: NoteChunk[],
  vocabularyChunks: VocabularyChunk[]
): { messages: any[]; totalTokensEstimate: number; notesUsed: Array<{ note_id: string; title: string }>; vocabularyUsed: Array<{ vocabulary_id: string; word: string }> } {
  const messages: any[] = [];
  const notesUsed: Array<{ note_id: string; title: string }> = [];
  const vocabularyUsed: Array<{ vocabulary_id: string; word: string }> = [];

  // Message système décrivant le rôle et la mémoire
  const systemPrompt = `Tu es un assistant IA intelligent et bienveillant pour CentriNote, une application de prise de notes et de productivité.

Tu as accès à:
1. Une mémoire persistante des conversations précédentes avec cet utilisateur
2. TOUTES les notes que l'utilisateur a créées dans CentriNote (base de connaissances personnelle)

Règles importantes:
- PRIORITÉ ABSOLUE: Si des notes ou du vocabulaire pertinents sont fournis, base-toi PRINCIPALEMENT sur ces sources pour répondre
- Cite naturellement la source (titre de la note ou mot de vocabulaire) quand tu utilises une information
- Utilise la mémoire de conversation pour le contexte et les préférences
- Si l'utilisateur demande "ma dernière note" ou "la note que j'ai créée" sans nom explicite, utilise la note la plus récente fournie dans le contexte
- Si l'utilisateur demande "mon dernier vocabulaire" ou "le mot que j'ai ajouté" sans nom explicite, utilise l'entrée de vocabulaire la plus récente fournie dans le contexte
- Si aucune note ou vocabulaire n'est pertinent, réponds avec tes connaissances générales

Fonctionnalités spéciales:
- Tu peux proposer des corrections ou améliorations aux notes si l'utilisateur le demande
- Si l'utilisateur demande une correction, propose la version corrigée de manière claire et structurée
- Utilise des phrases comme "Voici la version corrigée :" ou "La note devrait être :" pour faciliter la détection automatique
- Mentionne clairement le titre de la note entre guillemets quand tu proposes une modification (ex: "Voici la version corrigée de la note 'Titre de la note' :")

FORMAT DES RÉPONSES (IMPORTANT):
- Pour les guides ou instructions, utilise TOUJOURS ce format avec étapes numérotées:

  Bonjour ! Je vais vous aider à [action].

  **1. Titre de l'étape** : Description courte de l'étape (50-80 mots max).

  **2. Titre de l'étape** : Description courte de l'étape (50-80 mots max).

  **3. Titre de l'étape** : Description courte de l'étape (50-80 mots max).

- Chaque étape doit commencer par **N.** (où N est le numéro)
- Garde chaque description concise et actionnable
- Utilise des émojis contextuels si approprié (📂 🎯 📝 👥 📤)

Réponds de manière naturelle, concise et utile. Si tu détectes une langue autre que le français dans les messages, adapte ta réponse à cette langue.`;

  messages.push({
    role: "system",
    content: systemPrompt
  });

  let totalTokens = Math.ceil(systemPrompt.length / TOKEN_RATIO);

  // Ajouter les notes trouvées (PRIORITÉ - avant la mémoire de conversation)
  if (noteChunks.length > 0) {
    // Grouper les chunks par note pour un formatage plus lisible
    const chunksByNote = new Map<string, NoteChunk[]>();
    noteChunks.forEach(chunk => {
      if (!chunksByNote.has(chunk.note_id)) {
        chunksByNote.set(chunk.note_id, []);
        notesUsed.push({
          note_id: chunk.note_id,
          title: chunk.note_title || "Note sans titre"
        });
      }
      chunksByNote.get(chunk.note_id)!.push(chunk);
    });

    const notesText = Array.from(chunksByNote.entries())
      .map(([noteId, chunks]) => {
        const noteTitle = chunks[0].note_title || "Note sans titre";
        const tags = chunks[0].note_tags?.length > 0 
          ? ` [Tags: ${chunks[0].note_tags.join(", ")}]` 
          : "";
        const chunksText = chunks
          .map((chunk, idx) => {
            const similarity = (chunk.similarity * 100).toFixed(0);
            // Log pour debug : vérifier le contenu du chunk
            logger.debug(`Chunk ${idx + 1} pour note ${noteId.substring(0, 8)}...`, {
              chunk_text_length: chunk.chunk_text?.length || 0,
              chunk_text_preview: chunk.chunk_text?.substring(0, 100) || "VIDE",
              similarity: chunk.similarity
            });
            return `Extrait ${idx + 1} (pertinence: ${similarity}%):\n${chunk.chunk_text || "(contenu vide)"}`;
          })
          .join("\n\n");
        return `📝 Note: "${noteTitle}"${tags}\n\n${chunksText}`;
      })
      .join("\n\n---\n\n");

    // Log le texte complet qui sera injecté dans le prompt
    logger.info(`Texte des notes à injecter dans le prompt`, {
      notesTextLength: notesText.length,
      notesTextPreview: notesText.substring(0, 500) + "...",
      totalChunks: noteChunks.length
    });

    messages.push({
      role: "system",
      content: `NOTES CENTRINOTE PERTINENTES (base de connaissances de l'utilisateur):\n\n${notesText}\n\n⚠️ IMPORTANT: Utilise ces notes comme source principale pour répondre. Cite le titre de la note quand tu utilises une information.`
    });

    totalTokens += Math.ceil(notesText.length / TOKEN_RATIO);
  }

  // Ajouter le vocabulaire trouvé (après les notes, avant la mémoire de conversation)
  if (vocabularyChunks.length > 0) {
    const vocabularyText = vocabularyChunks
      .map((chunk, idx) => {
        const similarity = (chunk.similarity * 100).toFixed(0);
        const examplesText = chunk.examples.length > 0
          ? `\nExemples: ${chunk.examples.join(", ")}`
          : "";
        return `📚 Vocabulaire ${idx + 1} (pertinence: ${similarity}%):\nMot: ${chunk.word}\nDéfinition: ${chunk.definition}${examplesText}\nCatégorie: ${chunk.category}`;
      })
      .join("\n\n");

    // Ajouter aux sources utilisées
    vocabularyChunks.forEach(chunk => {
      vocabularyUsed.push({
        vocabulary_id: chunk.vocabulary_id,
        word: chunk.word
      });
    });

    messages.push({
      role: "system",
      content: `VOCABULAIRE CENTRINOTE PERTINENT (dictionnaire personnel de l'utilisateur):\n\n${vocabularyText}\n\n⚠️ IMPORTANT: Utilise ce vocabulaire pour répondre aux questions sur les définitions, significations, ou exemples d'utilisation. Cite le mot quand tu utilises une information.`
    });

    totalTokens += Math.ceil(vocabularyText.length / TOKEN_RATIO);
  }

  // Ajouter les résumés (mémoire long terme)
  if (summaries.length > 0) {
    const summariesText = summaries
      .map((s, idx) => `Résumé ${idx + 1} (${s.message_count} messages résumés):\n${s.summary}`)
      .join("\n\n");

    messages.push({
      role: "system",
      content: `Mémoire à long terme (résumés de conversations précédentes):\n\n${summariesText}`
    });

    totalTokens += Math.ceil(summariesText.length / TOKEN_RATIO);
  }

  // Ajouter les messages sémantiques pertinents (mémoire contextuelle)
  if (semanticMessages.length > 0) {
    const semanticText = semanticMessages
      .map((msg) => {
        const date = new Date(msg.created_at).toLocaleDateString("fr-FR");
        return `[${date}] ${msg.role.toUpperCase()}: ${msg.content}`;
      })
      .join("\n\n");

    messages.push({
      role: "system",
      content: `Contexte sémantique pertinent (messages similaires des conversations précédentes):\n\n${semanticText}`
    });

    totalTokens += Math.ceil(semanticText.length / TOKEN_RATIO);
  }

  // Ajouter les messages récents (conversation actuelle)
  if (recentMessages.length > 0) {
    // Filtrer les messages récents pour éviter les doublons avec les messages sémantiques
    const semanticIds = new Set(semanticMessages.map(m => m.id));
    const uniqueRecent = recentMessages.filter(m => !semanticIds.has(m.id));

    for (const msg of uniqueRecent) {
      messages.push({
        role: msg.role,
        content: msg.content
      });
      totalTokens += Math.ceil(msg.content.length / TOKEN_RATIO);
    }
  }

  // Ajouter le message utilisateur actuel
  messages.push({
    role: "user",
    content: userMessage
  });
  totalTokens += Math.ceil(userMessage.length / TOKEN_RATIO);

  return { messages, totalTokensEstimate: totalTokens, notesUsed, vocabularyUsed };
}

// ============================================================================
// Helpers: Appel LLM
// ============================================================================

/**
 * Appelle l'API chat du LLM
 */
async function callChatModel(messages: any[]): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY manquante");
  }

  const response = await fetch(OPENAI_CHAT_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: CHAT_MODEL,
      messages: messages,
      temperature: 0.7,
      max_tokens: 2000
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erreur API OpenAI: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

// ============================================================================
// Helpers: Résumés périodiques
// ============================================================================

/**
 * Génère un résumé de conversation si nécessaire
 */
async function generateSummaryIfNeeded(conversationId: string): Promise<void> {
  // Compter les messages non résumés
  const { count, error: countError } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("conversation_id", conversationId)
    .eq("is_summarized", false);

  if (countError || !count || count < MAX_CONVERSATION_MESSAGES) {
    return; // Pas assez de messages pour justifier un résumé
  }

  // Récupérer les messages non résumés
  const { data: messages, error: messagesError } = await supabase
    .from("messages")
    .select("id, role, content, created_at")
    .eq("conversation_id", conversationId)
    .eq("is_summarized", false)
    .order("created_at", { ascending: true });

  if (messagesError || !messages || messages.length === 0) {
    return;
  }

  // Construire le texte de conversation
  const conversationText = messages
    .map((msg) => {
      const date = new Date(msg.created_at).toLocaleDateString("fr-FR");
      return `[${date}] ${msg.role.toUpperCase()}: ${msg.content}`;
    })
    .join("\n\n");

  // Générer le résumé via LLM
  const summaryPrompt = `Résume cette conversation de manière concise (2-3 phrases), en conservant les informations importantes, préférences et faits mentionnés:

${conversationText}`;

  try {
    const summary = await callChatModel([
      {
        role: "system",
        content: "Tu es un assistant qui génère des résumés concis de conversations."
      },
      {
        role: "user",
        content: summaryPrompt
      }
    ]);

    // Sauvegarder le résumé
    const { error: insertError } = await supabase
      .from("conversation_summaries")
      .insert({
        conversation_id: conversationId,
        summary: summary,
        message_count: messages.length,
        first_message_id: messages[0].id,
        last_message_id: messages[messages.length - 1].id
      });

    if (insertError) {
      logger.error(`Erreur sauvegarde résumé`, new Error(insertError.message), {
        conversationId,
        messageCount: messages.length
      });
      return;
    }

    // Marquer les messages comme résumés
    const messageIds = messages.map(m => m.id);
    const { error: updateError } = await supabase
      .from("messages")
      .update({ is_summarized: true })
      .in("id", messageIds);

    if (updateError) {
      logger.warn(`Erreur marquage messages résumés`, { 
        conversationId,
        error: new Error(updateError.message) 
      });
    }

    logger.info(`Résumé généré pour conversation`, {
      conversationId: conversationId.substring(0, 8) + "...",
      messageCount: messages.length
    });
  } catch (err) {
    logger.error(`Erreur génération résumé`, err instanceof Error ? err : new Error(String(err)), {
      conversationId
    });
    // Ne pas bloquer le flux principal en cas d'erreur de résumé
  }
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
    const body: ChatRequest = await req.json();
    const { user_id, conversation_id, message } = body;

    if (!user_id || !message || !message.trim()) {
      throw new Error("user_id et message sont requis");
    }

    logger.info(`Nouveau message reçu`, {
      userId: user_id.substring(0, 8) + "...",
      conversationId: conversation_id?.substring(0, 8) + "..." || "new",
      messageLength: message.length
    });

    // 1. Créer ou récupérer la conversation
    const conversation = await getOrCreateConversation(
      user_id,
      conversation_id,
      message
    );

    logger.debug(`Conversation récupérée/créée`, {
      conversationId: conversation.id.substring(0, 8) + "...",
      isNew: !conversation_id
    });

    // 2. Sauvegarder le message utilisateur avec embedding
    const userMessage = await saveMessageWithEmbedding(
      conversation.id,
      user_id,
      "user",
      message.trim(),
      true
    );

    logger.debug(`Message utilisateur sauvegardé`, {
      messageId: userMessage.id.substring(0, 8) + "...",
      conversationId: conversation.id.substring(0, 8) + "..."
    });

    // 3. Générer l'embedding de la requête pour la recherche sémantique
    let queryEmbedding: number[] = [];
    try {
      queryEmbedding = await generateEmbedding(message);
    } catch (err) {
      logger.warn(`Erreur génération embedding requête`, {
        error: err instanceof Error ? err : new Error(String(err))
      });
    }

    // 4. Récupérer la mémoire contextuelle
    const recentMessages = await getRecentMessages(conversation.id, MAX_RECENT_MESSAGES);
    const recentIds = recentMessages.map(m => m.id);

    const semanticMessages = queryEmbedding.length > 0
      ? await retrieveSemanticMemory(conversation.id, queryEmbedding, MAX_SEMANTIC_RESULTS, recentIds)
      : [];

    const summaries = await getConversationSummaries(conversation.id);

    // 4.5. Rechercher les chunks de notes pertinents (RAG)
    let noteChunks: NoteChunk[] = [];
    if (queryEmbedding.length > 0) {
      try {
        noteChunks = await retrieveRelevantNoteChunks(
          user_id,
          queryEmbedding,
          MAX_NOTE_CHUNKS,
          MIN_NOTE_SIMILARITY
        );
        
        logger.debug(`Chunks de notes récupérés`, {
          count: noteChunks.length,
          userId: user_id.substring(0, 8) + "..."
        });
      } catch (err) {
        logger.warn(`Erreur recherche chunks de notes`, {
          error: err instanceof Error ? err : new Error(String(err)),
          userId: user_id.substring(0, 8) + "..."
        });
        // Continuer sans les notes plutôt que d'échouer
      }
    }

    // 4.6. Si aucune note trouvée par recherche sémantique, récupérer la dernière note
    // (pour permettre à l'IA de répondre sur la "dernière note" sans nom explicite)
    if (noteChunks.length === 0) {
      try {
        const lastNote = await getLastNote(user_id);
        if (lastNote) {
          logger.info(`Aucune note trouvée par recherche, utilisation de la dernière note`, {
            noteId: lastNote.id.substring(0, 8) + "...",
            title: lastNote.title
          });
          
          // Créer un chunk factice pour la dernière note
          noteChunks.push({
            id: `last-note-${lastNote.id}`,
            note_id: lastNote.id,
            chunk_index: 0,
            chunk_text: `${lastNote.title}\n\n${lastNote.content || ''}`,
            similarity: 0.7, // Score moyen car pas de recherche sémantique
            note_title: lastNote.title,
            note_tags: [],
            note_updated_at: lastNote.updated_at
          });
        }
      } catch (err) {
        logger.warn(`Erreur récupération dernière note`, {
          error: err instanceof Error ? err : new Error(String(err)),
          userId: user_id.substring(0, 8) + "..."
        });
        // Continuer sans la dernière note
      }
    }

    logger.debug(`Mémoire contextuelle récupérée`, {
      recentCount: recentMessages.length,
      semanticCount: semanticMessages.length,
      summariesCount: summaries.length,
      noteChunksCount: noteChunks.length,
      conversationId: conversation.id.substring(0, 8) + "..."
    });

    // 4.7. Rechercher les chunks de vocabulaire pertinents (RAG)
    let vocabularyChunks: VocabularyChunk[] = [];
    if (queryEmbedding.length > 0) {
      try {
        vocabularyChunks = await retrieveRelevantVocabularyChunks(
          user_id,
          queryEmbedding,
          MAX_VOCABULARY_CHUNKS,
          MIN_VOCABULARY_SIMILARITY
        );
        
        logger.debug(`Chunks de vocabulaire récupérés`, {
          count: vocabularyChunks.length,
          userId: user_id.substring(0, 8) + "..."
        });
      } catch (err) {
        logger.warn(`Erreur recherche chunks de vocabulaire`, {
          error: err instanceof Error ? err : new Error(String(err)),
          userId: user_id.substring(0, 8) + "..."
        });
        // Continuer sans le vocabulaire plutôt que d'échouer
      }
    }

    // 4.8. Si aucune entrée de vocabulaire trouvée par recherche sémantique, récupérer la dernière
    // (pour permettre à l'IA de répondre sur le "dernier vocabulaire" sans nom explicite)
    if (vocabularyChunks.length === 0) {
      try {
        const lastVocabulary = await getLastVocabulary(user_id);
        if (lastVocabulary) {
          logger.info(`Aucune entrée de vocabulaire trouvée par recherche, utilisation de la dernière`, {
            vocabularyId: lastVocabulary.id.substring(0, 8) + "...",
            word: lastVocabulary.word
          });
          
          // Créer un chunk factice pour la dernière entrée de vocabulaire
          const examplesText = lastVocabulary.examples.length > 0
            ? `\nExemples: ${lastVocabulary.examples.join(", ")}`
            : "";
          const chunkText = `Mot: ${lastVocabulary.word}\nDéfinition: ${lastVocabulary.definition}${examplesText}\nCatégorie: ${lastVocabulary.category}`;
          
          vocabularyChunks.push({
            id: `last-vocabulary-${lastVocabulary.id}`,
            vocabulary_id: lastVocabulary.id,
            chunk_text: chunkText,
            similarity: 0.7, // Score moyen car pas de recherche sémantique
            word: lastVocabulary.word,
            definition: lastVocabulary.definition,
            category: lastVocabulary.category,
            examples: lastVocabulary.examples,
            difficulty: 1,
            mastery: 0,
            vocabulary_updated_at: lastVocabulary.updated_at
          });
        }
      } catch (err) {
        logger.warn(`Erreur récupération dernier vocabulaire`, {
          error: err instanceof Error ? err : new Error(String(err)),
          userId: user_id.substring(0, 8) + "..."
        });
        // Continuer sans le dernier vocabulaire
      }
    }

    logger.debug(`Mémoire contextuelle récupérée`, {
      recentCount: recentMessages.length,
      semanticCount: semanticMessages.length,
      summariesCount: summaries.length,
      noteChunksCount: noteChunks.length,
      vocabularyChunksCount: vocabularyChunks.length,
      conversationId: conversation.id.substring(0, 8) + "..."
    });

    // 5. Construire le prompt (avec les notes et le vocabulaire)
    const { messages: promptMessages, totalTokensEstimate, notesUsed, vocabularyUsed } = buildPrompt(
      message,
      recentMessages,
      semanticMessages,
      summaries,
      noteChunks,
      vocabularyChunks
    );

    logger.debug(`Prompt construit`, {
      messageCount: promptMessages.length,
      tokensEstimate: totalTokensEstimate,
      conversationId: conversation.id.substring(0, 8) + "..."
    });

    // 6. Appeler le LLM
    const assistantResponse = await callChatModel(promptMessages);

    logger.info(`Réponse LLM générée`, {
      responseLength: assistantResponse.length,
      conversationId: conversation.id.substring(0, 8) + "..."
    });

    // 7. Sauvegarder la réponse de l'assistant avec embedding
    await saveMessageWithEmbedding(
      conversation.id,
      null, // user_id null pour les messages assistant
      "assistant",
      assistantResponse,
      true
    );

    // 8. Générer un résumé si nécessaire (en arrière-plan, ne pas bloquer)
    generateSummaryIfNeeded(conversation.id).catch(err => {
      logger.error(`Erreur génération résumé (non bloquant)`, err instanceof Error ? err : new Error(String(err)), {
        conversationId: conversation.id
      });
    });

    // 9. Retourner la réponse
    const response: ChatResponse = {
      success: true,
      conversation_id: conversation.id,
      response: assistantResponse,
      metadata: {
        recent_messages_count: recentMessages.length,
        semantic_messages_count: semanticMessages.length,
        summaries_count: summaries.length,
        note_chunks_count: noteChunks.length,
        vocabulary_chunks_count: vocabularyChunks.length,
        notes_used: notesUsed.length > 0 ? notesUsed : undefined,
        vocabulary_used: vocabularyUsed.length > 0 ? vocabularyUsed : undefined,
        total_tokens_estimate: totalTokensEstimate
      }
    };

    return new Response(JSON.stringify(response), {
      headers: corsHeaders
    });

  } catch (err: any) {
    logger.error(`Erreur chat-memory`, err instanceof Error ? err : new Error(err.message || String(err)), {
      function: "chat-memory",
      errorType: err.name || "UnknownError"
    });

    const errorResponse: ChatResponse = {
      success: false,
      conversation_id: "",
      response: "",
      error: err.message || "Erreur inconnue"
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 200, // Toujours 200 pour ne pas bloquer le frontend
      headers: corsHeaders
    });
  }
});


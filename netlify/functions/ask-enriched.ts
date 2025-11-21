// netlify/functions/ask-enriched.ts
// Edge function pour enrichir automatiquement les réponses IA avec les notes et vocabulaire utilisateur

import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Nettoyer et valider la clé API OpenAI
function cleanApiKey(key: string | undefined): string {
  if (!key) {
    throw new Error('OPENAI_API_KEY or VITE_OPENAI_API_KEY environment variable is required');
  }
  
  // Nettoyer : supprimer espaces, retours à la ligne, etc.
  const cleaned = key.trim().replace(/\s+/g, '');
  
  // Validation format : doit commencer par sk-
  if (!cleaned.startsWith('sk-')) {
    throw new Error(`Invalid OpenAI API key format. Key must start with 'sk-'. Got: ${cleaned.substring(0, 10)}...`);
  }
  
  // Validation longueur minimale (les clés OpenAI font généralement 50+ caractères)
  if (cleaned.length < 20) {
    throw new Error(`OpenAI API key appears to be truncated. Expected length > 20, got: ${cleaned.length}`);
  }
  
  return cleaned;
}

// Ne pas throw au niveau module - vérifier dans le handler
const getEnvVars = () => {
  // Accepter les deux formats : OPENAI_API_KEY ou VITE_OPENAI_API_KEY
  const rawOpenAIKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
  // Brave API pour recherche web (optionnel)
  const BRAVE_API_KEY = process.env.BRAVE_API_KEY || process.env.VITE_BRAVE_API_KEY;

  const OPENAI_API_KEY = cleanApiKey(rawOpenAIKey);
  
  if (!SUPABASE_URL) {
    throw new Error('SUPABASE_URL or VITE_SUPABASE_URL environment variable is required');
  }
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  }

  return {
    OPENAI_API_KEY,
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    BRAVE_API_KEY, // Peut être undefined si non configuré
  };
};

// CORS headers
function corsHeaders(origin?: string | null): Record<string, string> {
  const allowedOrigins = [
    'https://centrinote.fr',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
  ];
  const allowedOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Expose-Headers': 'X-Response-Time, X-Enrichment-Used',
    'Vary': 'Origin',
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
  };
}

/**
 * Extrait le user_id depuis le JWT Supabase
 */
async function getUserIdFromToken(authHeader: string | undefined, supabaseClient: any): Promise<string | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  try {
    const token = authHeader.replace('Bearer ', '');
    // Pour Supabase, on peut aussi utiliser le client directement
    const { data: { user }, error } = await supabaseClient.auth.getUser(token);
    if (error || !user) {
      return null;
    }
    return user.id;
  } catch (error) {
    console.error('Error extracting user from token:', error);
    return null;
  }
}

/**
 * Génère l'embedding pour la question utilisateur
 */
async function generateQueryEmbedding(question: string, openaiClient: OpenAI): Promise<number[]> {
  try {
    const response = await openaiClient.embeddings.create({
      model: 'text-embedding-3-small',
      input: question.trim(),
    });
    return response.data[0].embedding;
  } catch (error: any) {
    console.error('[ask-enriched] Error generating query embedding:', {
      message: error?.message,
      status: error?.status,
      code: error?.code,
      type: error?.type,
    });
    
    // Erreur spécifique pour clé API invalide
    if (error?.status === 401 || error?.message?.includes('Incorrect API key')) {
      throw new Error('OpenAI API key is invalid or expired. Please check your VITE_OPENAI_API_KEY in Netlify Dashboard.');
    }
    
    throw error;
  }
}

/**
 * Recherche les chunks pertinents via similarité vectorielle
 */
async function searchSimilarChunks(
  queryEmbedding: number[],
  userId: string,
  supabaseClient: any,
  maxResults: number = 10,
  similarityThreshold: number = 0.8
): Promise<Array<{ content: string; content_type: string; metadata: any }>> {
  try {
    // Vérifier d'abord si des embeddings existent pour cet utilisateur
    const { count: totalEmbeddings, error: countError } = await supabaseClient
      .from('user_embeddings')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    console.log(`[ask-enriched] Total embeddings pour user ${userId.substring(0, 8)}: ${totalEmbeddings || 0}`);

    if (countError) {
      console.error('[ask-enriched] Erreur comptage embeddings:', countError);
    }

    if (!totalEmbeddings || totalEmbeddings === 0) {
      console.warn(`[ask-enriched] ⚠️ Aucun embedding trouvé pour user ${userId.substring(0, 8)}. Exécutez embed-all-notes pour générer les embeddings.`);
      return [];
    }

    // Utiliser la fonction SQL de recherche de similarité
    // Note: Supabase convertit automatiquement le array JavaScript en vector PostgreSQL
    const { data, error } = await supabaseClient.rpc('search_similar_embeddings', {
      query_embedding: queryEmbedding, // Array JavaScript - Supabase le convertit en vector
      target_user_id: userId,
      similarity_threshold: similarityThreshold,
      max_results: maxResults,
    });

    if (error) {
      console.error('[ask-enriched] Erreur recherche similarité:', error);
      return [];
    }

    const results = (data || []).map((item: any) => ({
      content: item.content,
      content_type: item.content_type,
      metadata: item.metadata || {},
    }));

    console.log(`[ask-enriched] Chunks trouvés: ${results.length} (seuil: ${similarityThreshold}, max: ${maxResults})`);

    return results;
  } catch (error) {
    console.error('[ask-enriched] Erreur dans searchSimilarChunks:', error);
    return [];
  }
}

/**
 * Construit le prompt système enrichi
 */
function buildEnrichedSystemPrompt(
  notes: Array<{ content: string; metadata: any }>,
  vocabulary: Array<{ content: string; metadata: any }>,
  webSearchResults?: string | null
): string {
  // Obtenir la date et l'heure actuelles en français
  const now = new Date();
  const currentDate = now.toLocaleDateString('fr-FR', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric',
    timeZone: 'Europe/Paris'
  });
  const currentTime = now.toLocaleTimeString('fr-FR', { 
    hour: '2-digit', 
    minute: '2-digit',
    timeZone: 'Europe/Paris'
  });

  const notesText = notes.length > 0
    ? notes.map(n => `- ${n.content}${n.metadata?.title ? ` (${n.metadata.title})` : ''}`).join('\n')
    : 'Aucune note pertinente.';

  const vocabText = vocabulary.length > 0
    ? vocabulary.map(v => `- ${v.content}${v.metadata?.category ? ` [${v.metadata.category}]` : ''}`).join('\n')
    : 'Aucun vocabulaire pertinent.';

  let prompt = `Tu es Centrinote-AI, assistant privé et pédagogique.

Date et heure actuelles : ${currentDate} à ${currentTime} (heure française).

Données personnelles de l'utilisateur (non visibles dans ta réponse) :

<NOTES>
${notesText}
</NOTES>

<VOCABULAIRE>
${vocabText}
</VOCABULAIRE>`;

  // Ajouter les résultats de recherche web si disponibles
  if (webSearchResults) {
    prompt += `\n\n<ACTUALITÉS_WEB>
${webSearchResults}
</ACTUALITÉS_WEB>

Utilise ces informations web actualisées pour répondre aux questions sur l'actualité, la météo, les prix, etc.`;
  }

  prompt += `\n\nRègles strictes :
- Reformule automatiquement si la question est longue ou complexe
- Résume si la réponse dépasse 3 phrases
- Définis les termes complexes en utilisant le vocabulaire ci-dessus quand pertinent
- Ne cite JAMAIS ces balises <NOTES>, <VOCABULAIRE> ou <ACTUALITÉS_WEB> dans ta réponse
- Ne mentionne JAMAIS que tu utilises des données personnelles ou web
- Garde un ton concis, pédagogique et personnel
- Utilise les informations des notes et du vocabulaire de manière naturelle et contextuelle
- Pour les questions d'actualité, utilise les informations web fournies ci-dessus
- Si l'utilisateur demande la date ou l'heure, utilise la date et l'heure actuelles fournies ci-dessus`;

  return prompt;
}

/**
 * Estime le nombre de tokens (approximation)
 */
function estimateTokens(text: string): number {
  // Approximation: ~4 caractères par token
  return Math.ceil(text.length / 4);
}

/**
 * Handler principal
 */
export const handler: Handler = async (event, context) => {
  const startTime = Date.now();
  const origin = event.headers.origin || event.headers.Origin;

  // OPTIONS pour CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders(origin),
      body: '',
    };
  }

  // Vérifier la méthode
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders(origin),
      body: JSON.stringify({ error: 'Method Not Allowed', allowedMethods: ['POST'] }),
    };
  }

  try {
    // Vérifier les variables d'environnement et initialiser les clients
    let envVars;
    try {
      envVars = getEnvVars();
      
      // Log sécurisé pour déboguer (sans exposer la clé complète)
      const keyPreview = envVars.OPENAI_API_KEY.substring(0, 7) + '...' + envVars.OPENAI_API_KEY.substring(envVars.OPENAI_API_KEY.length - 4);
      console.log('[ask-enriched] Configuration chargée:', {
        hasOpenAIKey: !!envVars.OPENAI_API_KEY,
        keyLength: envVars.OPENAI_API_KEY.length,
        keyPreview: keyPreview,
        keyStartsWith: envVars.OPENAI_API_KEY.startsWith('sk-'),
        hasSupabaseUrl: !!envVars.SUPABASE_URL,
        hasServiceKey: !!envVars.SUPABASE_SERVICE_ROLE_KEY,
      });
    } catch (envError) {
      console.error('[ask-enriched] Erreur variables d\'environnement:', envError);
      return {
        statusCode: 500,
        headers: corsHeaders(origin),
        body: JSON.stringify({
          success: false,
          error: envError instanceof Error ? envError.message : 'Configuration manquante',
        }),
      };
    }

    const openai = new OpenAI({ apiKey: envVars.OPENAI_API_KEY });
    const supabase = createClient(envVars.SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

    // Parser le body
    const body = JSON.parse(event.body || '{}');
    const { question } = body;

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return {
        statusCode: 400,
        headers: corsHeaders(origin),
        body: JSON.stringify({ error: 'Question is required' }),
      };
    }

    // Extraire le user_id depuis le token JWT
    const authHeader = event.headers.authorization || event.headers.Authorization;
    const userId = await getUserIdFromToken(authHeader, supabase);

    if (!userId) {
      return {
        statusCode: 401,
        headers: corsHeaders(origin),
        body: JSON.stringify({ error: 'Unauthorized - Valid JWT token required' }),
      };
    }

    console.log(`[ask-enriched] Processing question for user ${userId.substring(0, 8)}...`);

    // Détecter les questions spéciales (dernière note, notes récentes, etc.)
    const questionLower = question.toLowerCase().trim();
    const isLastNoteQuestion = questionLower.includes('dernière') || 
                               questionLower.includes('dernier') ||
                               questionLower.includes('derniere') ||
                               questionLower.includes('last note') ||
                               questionLower.includes('récente') ||
                               questionLower.includes('recente');
    
    let chunks: Array<{ content: string; content_type: string; metadata: any }> = [];

    if (isLastNoteQuestion) {
      // Pour les questions sur la dernière note, chercher directement par date
      console.log('[ask-enriched] Question sur dernière note détectée - recherche par date');
      const { data: lastNotes, error: lastNotesError } = await supabase
        .from('user_embeddings')
        .select('content, content_type, metadata, created_at')
        .eq('user_id', userId)
        .eq('content_type', 'note')
        .order('created_at', { ascending: false })
        .limit(5);

      if (!lastNotesError && lastNotes && lastNotes.length > 0) {
        chunks = lastNotes.map((item: any) => ({
          content: item.content,
          content_type: item.content_type,
          metadata: item.metadata || {},
        }));
        console.log(`[ask-enriched] ${chunks.length} dernières notes trouvées par date`);
      }
    } else {
      // Pour les autres questions, utiliser la recherche par similarité avec un seuil plus bas
      const queryEmbedding = await generateQueryEmbedding(question, openai);
      
      // Seuil réduit à 0.5 pour capturer plus de résultats (au lieu de 0.8)
      chunks = await searchSimilarChunks(queryEmbedding, userId, supabase, 10, 0.5);
    }

    // Séparer notes et vocabulaire
    const notes = chunks.filter(c => c.content_type === 'note');
    const vocabulary = chunks.filter(c => c.content_type === 'vocabulary');

    // Limiter à 4000 tokens max pour le contexte
    let notesContext = notes;
    let vocabContext = vocabulary;
    let totalTokens = estimateTokens(question);

    // Ajouter les notes jusqu'à la limite
    const notesText = notesContext.map(n => n.content).join('\n');
    const notesTokens = estimateTokens(notesText);
    if (totalTokens + notesTokens > 3000) {
      // Réduire le nombre de notes
      let accumulatedTokens = 0;
      notesContext = notes.filter(n => {
        const tokens = estimateTokens(n.content);
        if (accumulatedTokens + tokens > 2000) return false;
        accumulatedTokens += tokens;
        return true;
      });
    }
    totalTokens += estimateTokens(notesContext.map(n => n.content).join('\n'));

    // Ajouter le vocabulaire jusqu'à la limite
    const vocabText = vocabContext.map(v => v.content).join('\n');
    const vocabTokens = estimateTokens(vocabText);
    if (totalTokens + vocabTokens > 4000) {
      // Réduire le nombre de vocab
      let accumulatedTokens = 0;
      vocabContext = vocabulary.filter(v => {
        const tokens = estimateTokens(v.content);
        if (accumulatedTokens + tokens > 1000) return false;
        accumulatedTokens += tokens;
        return true;
      });
    }

    // Vérifier si la question nécessite une recherche web (actualités, météo, etc.)
    let webSearchResults: string | null = null;
    let searched = false;

    // Détecter si la question nécessite des informations actualisées
    const needsWebSearch = /(actualité|actualités|news|météo|weather|prix|price|résultat|result|événement|event|récent|recent|aujourd'hui|today|maintenant|now|dernière|dernier|latest)/i.test(question);
    
    console.log('[ask-enriched] Vérification recherche web:', {
      question: question.substring(0, 50),
      needsWebSearch,
      hasBraveKey: !!envVars.BRAVE_API_KEY,
    });

    if (needsWebSearch && envVars.BRAVE_API_KEY) {
      console.log('[ask-enriched] Recherche web détectée, utilisation de Brave API');
      
      try {
        const BRAVE_URL = 'https://api.search.brave.com/res/v1/web/search';
        // Améliorer la requête de recherche pour les actualités
        const searchQuery = question.includes('actualité') || question.includes('actualités') 
          ? 'actualités France aujourd\'hui'
          : question;
        
        console.log('[ask-enriched] Requête Brave:', searchQuery);
        
        const braveRes = await fetch(
          `${BRAVE_URL}?q=${encodeURIComponent(searchQuery)}&count=5&freshness=pw`,
          {
            headers: { 'X-Subscription-Token': envVars.BRAVE_API_KEY }
          }
        );

        console.log('[ask-enriched] Brave API response status:', braveRes.status);

        if (braveRes.ok) {
          const braveJson = await braveRes.json();
          const results = braveJson.web?.results || [];

          console.log('[ask-enriched] Résultats Brave:', results.length);

          if (results.length > 0) {
            webSearchResults = results
              .map((r: any, i: number) => `[${i + 1}] ${r.title}\n${r.description}\nSource: ${r.url}`)
              .join('\n\n');
            searched = true;
            console.log(`[ask-enriched] ✅ ${results.length} résultats web trouvés et intégrés`);
          } else {
            console.warn('[ask-enriched] ⚠️ Aucun résultat trouvé dans la réponse Brave');
          }
        } else {
          const errorText = await braveRes.text();
          console.error('[ask-enriched] ❌ Erreur Brave API:', {
            status: braveRes.status,
            statusText: braveRes.statusText,
            error: errorText.substring(0, 200),
          });
        }
      } catch (braveError: any) {
        console.error('[ask-enriched] ❌ Erreur recherche web:', {
          message: braveError.message,
          stack: braveError.stack?.substring(0, 200),
        });
        // Continuer sans recherche web si erreur
      }
    } else if (needsWebSearch && !envVars.BRAVE_API_KEY) {
      console.warn('[ask-enriched] ⚠️ Recherche web nécessaire mais BRAVE_API_KEY non configurée');
    }

    // Construire le prompt système enrichi
    const systemPrompt = buildEnrichedSystemPrompt(notesContext, vocabContext, webSearchResults);

    // Appeler OpenAI
    let completion;
    try {
      completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question },
        ],
        temperature: 0.7,
        max_tokens: 500,
      });
    } catch (openaiError: any) {
      console.error('[ask-enriched] Error calling OpenAI chat completion:', {
        message: openaiError?.message,
        status: openaiError?.status,
        code: openaiError?.code,
        type: openaiError?.type,
      });
      
      // Erreur spécifique pour clé API invalide
      if (openaiError?.status === 401 || openaiError?.message?.includes('Incorrect API key')) {
        return {
          statusCode: 401,
          headers: corsHeaders(origin),
          body: JSON.stringify({
            success: false,
            error: 'OpenAI API key is invalid or expired. Please check your VITE_OPENAI_API_KEY in Netlify Dashboard and ensure it starts with "sk-" and has no extra spaces.',
          }),
        };
      }
      
      throw openaiError;
    }

    const response = completion.choices[0]?.message?.content || 'Désolé, je n\'ai pas pu générer de réponse.';
    const duration = Date.now() - startTime;
    const enrichmentUsed = notesContext.length > 0 || vocabContext.length > 0;

    console.log(`[ask-enriched] Response generated in ${duration}ms, enrichment: ${enrichmentUsed}`);

    const headers = corsHeaders(origin);
    headers['X-Response-Time'] = `${duration}ms`;
    headers['X-Enrichment-Used'] = enrichmentUsed ? 'true' : 'false';

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        response,
        metadata: {
          duration_ms: duration,
          enrichment_used: enrichmentUsed,
          notes_count: notesContext.length,
          vocabulary_count: vocabContext.length,
          web_search_used: searched,
          model: 'gpt-3.5-turbo',
        },
      }),
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[ask-enriched] Error:', error);

    return {
      statusCode: 500,
      headers: corsHeaders(origin),
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration_ms: duration,
      }),
    };
  }
};


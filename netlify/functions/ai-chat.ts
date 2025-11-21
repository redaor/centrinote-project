// netlify/functions/ai-chat.ts
// Edge function pour enrichir automatiquement les réponses IA avec les notes, vocabulaire et actualités

import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { XMLParser } from 'fast-xml-parser';

// Nettoyer et valider la clé API OpenAI
function cleanApiKey(key: string | undefined): string {
  if (!key) {
    throw new Error('OPENAI_API_KEY or VITE_OPENAI_API_KEY environment variable is required');
  }
  
  const cleaned = key.trim().replace(/\s+/g, '');
  
  if (!cleaned.startsWith('sk-')) {
    throw new Error(`Invalid OpenAI API key format. Key must start with 'sk-'. Got: ${cleaned.substring(0, 10)}...`);
  }
  
  if (cleaned.length < 20) {
    throw new Error(`OpenAI API key appears to be truncated. Expected length > 20, got: ${cleaned.length}`);
  }
  
  return cleaned;
}

// Récupérer les variables d'environnement
const getEnvVars = () => {
  const rawOpenAIKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
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
    BRAVE_API_KEY,
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
    console.warn('[ai-chat] ⚠️ Auth header manquant ou invalide');
    return null;
  }

  try {
    const token = authHeader.replace('Bearer ', '');
    console.log('[ai-chat] 🔑 Token extrait, longueur:', token.length);
    
    const { data: { user }, error } = await supabaseClient.auth.getUser(token);
    
    if (error) {
      console.error('[ai-chat] ❌ Erreur getUser:', {
        message: error.message,
        code: error.code,
      });
      return null;
    }
    
    if (!user) {
      console.warn('[ai-chat] ⚠️ User null après getUser');
      return null;
    }
    
    console.log('[ai-chat] ✅ User récupéré:', user.id.substring(0, 8) + '...');
    return user.id;
  } catch (error: any) {
    console.error('[ai-chat] ❌ Exception getUserIdFromToken:', {
      message: error?.message,
      stack: error?.stack?.substring(0, 200),
    });
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
    console.error('[ai-chat] Error generating query embedding:', {
      message: error?.message,
      status: error?.status,
    });
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
  similarityThreshold: number = 0.5
): Promise<Array<{ content: string; content_type: string; metadata: any }>> {
  try {
    const { data, error } = await supabaseClient.rpc('search_similar_embeddings', {
      query_embedding: queryEmbedding,
      target_user_id: userId,
      similarity_threshold: similarityThreshold,
      max_results: maxResults,
    });

    if (error) {
      console.error('[ai-chat] Erreur recherche similarité:', error);
      return [];
    }

    return (data || []).map((item: any) => ({
      content: item.content,
      content_type: item.content_type,
      metadata: item.metadata || {},
    }));
  } catch (error) {
    console.error('[ai-chat] Erreur dans searchSimilarChunks:', error);
    return [];
  }
}

/**
 * Récupère les notes et vocabulaire pertinents pour l'utilisateur (max 3000 tokens)
 */
async function fetchUserNotesAndVocab(
  userId: string,
  question: string,
  openaiClient: OpenAI,
  supabaseClient: any
): Promise<{ notes: string; vocabulary: string; notesCount: number; vocabCount: number }> {
  try {
    console.log(`[ai-chat] 🔍 Recherche notes/vocabulaire pour user ${userId.substring(0, 8)}...`);
    
    // Vérifier d'abord si des embeddings existent
    const { count: totalEmbeddings, error: countError } = await supabaseClient
      .from('user_embeddings')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    console.log(`[ai-chat] 📊 Total embeddings pour user: ${totalEmbeddings || 0}`);

    if (countError) {
      console.error('[ai-chat] ❌ Erreur comptage embeddings:', countError);
    }

    if (!totalEmbeddings || totalEmbeddings === 0) {
      console.warn(`[ai-chat] ⚠️ Aucun embedding trouvé pour user ${userId.substring(0, 8)}`);
      console.warn(`[ai-chat] 💡 Exécutez: https://centrinote.fr/.netlify/functions/embed-all-notes?force=true`);
      
      // Vérifier séparément notes et vocabulaire
      const { count: notesCount } = await supabaseClient
        .from('user_embeddings')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('content_type', 'note');
      
      const { count: vocabCount } = await supabaseClient
        .from('user_embeddings')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('content_type', 'vocabulary');
      
      console.warn(`[ai-chat] 📊 Embeddings existants: ${notesCount || 0} notes, ${vocabCount || 0} vocabulaire`);
      
      return { notes: '', vocabulary: '', notesCount: 0, vocabCount: 0 };
    }

    // Générer l'embedding de la question
    console.log(`[ai-chat] 🔄 Génération embedding pour: "${question.substring(0, 50)}..."`);
    const queryEmbedding = await generateQueryEmbedding(question, openaiClient);
    console.log(`[ai-chat] ✅ Embedding généré (${queryEmbedding.length} dimensions)`);

    // Rechercher les chunks similaires
    console.log(`[ai-chat] 🔍 Recherche similarité vectorielle (seuil: 0.5, max: 10)...`);
    const chunks = await searchSimilarChunks(queryEmbedding, userId, supabaseClient, 10, 0.5);
    console.log(`[ai-chat] 📦 ${chunks.length} chunks trouvés`);

    const notes = chunks.filter(c => c.content_type === 'note').slice(0, 5);
    const vocabulary = chunks.filter(c => c.content_type === 'vocabulary').slice(0, 5);

    console.log(`[ai-chat] 📝 ${notes.length} notes pertinentes, 📚 ${vocabulary.length} termes vocab pertinents`);

    // Formater les notes : "titre: contenu"
    const notesText = notes
      .map(n => {
        const title = n.metadata?.title || 'Note sans titre';
        const content = n.content || '';
        return `- ${title}: ${content}`;
      })
      .join('\n')
      .substring(0, 8000); // max 2000 tokens ≈ 8000 caractères

    // Formater le vocabulaire : "mot: définition"
    const vocabText = vocabulary
      .map(v => {
        // Le content contient déjà "mot: définition" ou on peut extraire depuis metadata
        const word = v.metadata?.word || v.content.split(':')[0] || 'Terme';
        const definition = v.metadata?.definition || v.content.split(':').slice(1).join(':') || v.content;
        const category = v.metadata?.category ? ` [${v.metadata.category}]` : '';
        return `- ${word}: ${definition}${category}`;
      })
      .join('\n')
      .substring(0, 4000); // max 1000 tokens ≈ 4000 caractères

    if (notesText) {
      console.log(`[ai-chat] ✅ Notes formatées: ${notesText.substring(0, 100)}...`);
    }
    if (vocabText) {
      console.log(`[ai-chat] ✅ Vocabulaire formaté: ${vocabText.substring(0, 100)}...`);
    }

    return {
      notes: notesText,
      vocabulary: vocabText,
      notesCount: notes.length,
      vocabCount: vocabulary.length,
    };
  } catch (error: any) {
    console.error('[ai-chat] ❌ Erreur fetchUserNotesAndVocab:', {
      message: error?.message,
      stack: error?.stack?.substring(0, 200),
    });
    return { notes: '', vocabulary: '', notesCount: 0, vocabCount: 0 };
  }
}

/**
 * Récupère les actualités RSS 20 Minutes si nécessaire (max 400 tokens)
 */
async function fetchNewsIfNeeded(question: string): Promise<{ news: string; newsInjected: boolean }> {
  // Détecter si la question nécessite des actualités
  const needsNews = /(actualité|actualités|news|nouvelle|nouvelles|aujourd'hui|today|récent|recent|dernière|dernier|latest)/i.test(question);

  if (!needsNews) {
    return { news: '', newsInjected: false };
  }

  try {
    const RSS_URL = 'https://www.20minutes.fr/rss/une.xml';
    const response = await fetch(RSS_URL, {
      headers: {
        'User-Agent': 'Centrinote/1.0',
      },
    });

    if (!response.ok) {
      console.warn('[ai-chat] Erreur fetch RSS:', response.status);
      return { news: '', newsInjected: false };
    }

    const xmlText = await response.text();
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
    });
    const parsed = parser.parse(xmlText);

    // Extraire les 5 premiers articles
    const items = parsed?.rss?.channel?.item || [];
    const newsItems = items.slice(0, 5).map((item: any, index: number) => {
      const title = item.title || '';
      const description = item.description || '';
      const link = item.link || '';
      return `[${index + 1}] ${title}\n${description}\nSource: ${link}`;
    });

    const newsText = newsItems.join('\n\n').substring(0, 1600); // Max 400 tokens

    console.log(`[ai-chat] ✅ ${newsItems.length} actualités récupérées depuis RSS`);

    return {
      news: newsText,
      newsInjected: true,
    };
  } catch (error: any) {
    console.error('[ai-chat] Erreur fetchNewsIfNeeded:', error.message);
    return { news: '', newsInjected: false };
  }
}

/**
 * Construit le prompt système enrichi
 */
function buildSystemPrompt(
  notes: string,
  vocabulary: string,
  news: string
): string {
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

  let prompt = `Tu es Centrinote-AI, assistant privé et pédagogique.

Date et heure actuelles : ${currentDate} à ${currentTime} (heure française).`;

  if (notes) {
    prompt += `\n\nDonnées personnelles de l'utilisateur (non visibles dans ta réponse) :

<NOTES>
${notes}
</NOTES>`;
  }

  if (vocabulary) {
    if (!notes) {
      prompt += `\n\nDonnées personnelles de l'utilisateur (non visibles dans ta réponse) :`;
    }
    prompt += `\n\n<VOCABULAIRE>
${vocabulary}
</VOCABULAIRE>`;
  }

  if (news) {
    prompt += `\n\n<ACTUALITÉS>
${news}
</ACTUALITÉS>`;
  }

  prompt += `\n\nRègles strictes :
- Reformule automatiquement si la question est longue ou complexe
- Résume si la réponse dépasse 3 phrases
- Définis les termes complexes en utilisant le vocabulaire ci-dessus quand pertinent
- Ne cite JAMAIS ces balises <NOTES>, <VOCABULAIRE> ou <ACTUALITÉS> dans ta réponse
- Ne mentionne JAMAIS que tu utilises des données personnelles ou web
- Garde un ton concis, pédagogique et personnel
- Utilise les informations des notes et du vocabulaire de manière naturelle et contextuelle
- Pour les questions d'actualité, utilise les informations <ACTUALITÉS> fournies ci-dessus
- Si l'utilisateur demande la date ou l'heure, utilise la date et l'heure actuelles fournies ci-dessus`;

  return prompt;
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
    } catch (envError) {
      console.error('[ai-chat] Erreur variables d\'environnement:', envError);
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
    console.log('[ai-chat] 🔐 Auth header présent:', !!authHeader);
    
    const userId = await getUserIdFromToken(authHeader, supabase);
    console.log('[ai-chat] 👤 User ID extrait:', userId ? `${userId.substring(0, 8)}...` : 'null');

    // Récupérer notes/vocabulaire et actualités
    let notes = '';
    let vocabulary = '';
    let notesCount = 0;
    let vocabCount = 0;
    let news = '';
    let newsInjected = false;

    if (userId) {
      console.log(`[ai-chat] ✅ User ID récupéré: ${userId.substring(0, 8)}...`);
      
      // Récupérer notes et vocabulaire
      try {
        const userData = await fetchUserNotesAndVocab(userId, question, openai, supabase);
        notes = userData.notes;
        vocabulary = userData.vocabulary;
        notesCount = userData.notesCount;
        vocabCount = userData.vocabCount;

        console.log(`[ai-chat] 📊 Enrichissement: Notes=${notesCount}, Vocab=${vocabCount}`);
        
        if (notesCount === 0 && vocabCount === 0) {
          console.warn(`[ai-chat] ⚠️ Aucune note/vocabulaire trouvée pour user ${userId.substring(0, 8)}`);
          console.warn(`[ai-chat] 💡 Vérifiez que les embeddings existent: SELECT COUNT(*) FROM user_embeddings WHERE user_id = '${userId}'`);
        }
      } catch (enrichError: any) {
        console.error('[ai-chat] ❌ Erreur fetchUserNotesAndVocab:', enrichError.message);
        // Continuer sans enrichissement si erreur
      }
    } else {
      console.warn('[ai-chat] ⚠️ User ID non récupéré - pas d\'enrichissement possible');
      console.warn('[ai-chat] 💡 Vérifiez que le token JWT est valide et contient user_id');
    }

    // Récupérer actualités si nécessaire
    const newsData = await fetchNewsIfNeeded(question);
    news = newsData.news;
    newsInjected = newsData.newsInjected;

    // Construire le prompt système enrichi
    const systemPrompt = buildSystemPrompt(notes, vocabulary, news);

    // Vérifier si recherche web nécessaire (Brave API)
    let webSearchResults: string | null = null;
    let searched = false;

    if (envVars.BRAVE_API_KEY) {
      const needsWebSearch = /(actualité|actualités|news|météo|weather|prix|price|résultat|result|événement|event|récent|recent|aujourd'hui|today|maintenant|now|dernière|dernier|latest)/i.test(question);
      
      if (needsWebSearch && !newsInjected) {
        // Si on a déjà les actualités RSS, pas besoin de Brave
        console.log('[ai-chat] Recherche web détectée, utilisation de Brave API');
        
        try {
          const BRAVE_URL = 'https://api.search.brave.com/res/v1/web/search';
          const searchQuery = question.includes('actualité') || question.includes('actualités') 
            ? 'actualités France aujourd\'hui'
            : question;
          
          const braveRes = await fetch(
            `${BRAVE_URL}?q=${encodeURIComponent(searchQuery)}&count=5&freshness=pw`,
            {
              headers: { 'X-Subscription-Token': envVars.BRAVE_API_KEY }
            }
          );

          if (braveRes.ok) {
            const braveJson = await braveRes.json();
            const results = braveJson.web?.results || [];

            if (results.length > 0) {
              webSearchResults = results
                .map((r: any, i: number) => `[${i + 1}] ${r.title}\n${r.description}\nSource: ${r.url}`)
                .join('\n\n');
              searched = true;
              console.log(`[ai-chat] ✅ ${results.length} résultats web trouvés`);
            }
          }
        } catch (braveError: any) {
          console.error('[ai-chat] Erreur recherche web:', braveError.message);
        }
      }
    }

    // Ajouter résultats web au prompt si disponibles
    let finalSystemPrompt = systemPrompt;
    if (webSearchResults) {
      finalSystemPrompt += `\n\n<RECHERCHE_WEB>
${webSearchResults}
</RECHERCHE_WEB>

Utilise ces résultats de recherche web pour répondre. Cite tes sources si pertinent.`;
    }

    // Appeler OpenAI
    let completion;
    try {
      completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: finalSystemPrompt },
          { role: 'user', content: question },
        ],
        temperature: 0.7,
        max_tokens: 500,
      });
    } catch (openaiError: any) {
      console.error('[ai-chat] Error calling OpenAI:', {
        message: openaiError?.message,
        status: openaiError?.status,
      });
      
      if (openaiError?.status === 401 || openaiError?.message?.includes('Incorrect API key')) {
        return {
          statusCode: 401,
          headers: corsHeaders(origin),
          body: JSON.stringify({
            success: false,
            error: 'OpenAI API key is invalid or expired.',
          }),
        };
      }
      
      throw openaiError;
    }

    const response = completion.choices[0]?.message?.content || 'Désolé, je n\'ai pas pu générer de réponse.';
    const duration = Date.now() - startTime;
    const enrichmentUsed = notesCount > 0 || vocabCount > 0 || newsInjected || searched;

    console.log(`[ai-chat] Response generated in ${duration}ms, enrichment: ${enrichmentUsed}`);

    const headers = corsHeaders(origin);
    headers['X-Response-Time'] = `${duration}ms`;
    headers['X-Enrichment-Used'] = enrichmentUsed ? 'true' : 'false';

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        reply: response,
        timestamp: new Date().toISOString(),
        enrichment_used: enrichmentUsed,
        notes_count: notesCount,
        vocabulary_count: vocabCount,
        news_injected: newsInjected,
        searched: searched,
        cached: false,
      }),
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[ai-chat] Error:', error);

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


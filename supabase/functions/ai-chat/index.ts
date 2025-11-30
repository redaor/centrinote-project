import { serve } from "https://deno.land/std@0.200.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { franc } from "https://esm.sh/franc@6.1.0";

const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY");
const BRAVE_KEY = Deno.env.get("BRAVE_API_KEY");
const BRAVE_URL = "https://api.search.brave.com/res/v1/web/search";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 Mo
const MAX_HISTORY = 30; // MEM-FIX: Limite de messages à charger depuis la BDD

// Supabase client pour accéder aux notes et vocabulaire
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://localhost:3000",
  "https://centrinote.fr",
  "https://www.centrinote.fr"
]);

function buildCorsHeaders(origin: string | null, includeContentType = true): HeadersInit {
  const allowedOrigin = origin && allowedOrigins.has(origin) ? origin : "*";
  const headers: HeadersInit = {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin"
  };

  // Ne pas inclure Content-Type pour OPTIONS (preflight)
  if (includeContentType) {
    headers["Content-Type"] = "application/json";
  }

  return headers;
}

// Note: L'extraction de texte des fichiers est maintenant gérée côté frontend
// Le backend reçoit directement le texte extrait via le champ "fileText"

// Fonction pour parser le multipart/form-data
async function parseMultipartForm(req: Request): Promise<{ question: string; fileText?: string; context?: string; messages?: any[] }> {
  const contentType = req.headers.get("content-type") || "";

  if (!contentType.includes("multipart/form-data")) {
    throw new Error("Content-Type doit être multipart/form-data");
  }

  const formData = await req.formData();

  const question = formData.get("question")?.toString() || "";
  const fileText = formData.get("fileText")?.toString() || "";
  const context = formData.get("context")?.toString() || "";
  const messagesStr = formData.get("messages")?.toString();
  const messages = messagesStr ? JSON.parse(messagesStr) : null;

  return { question, fileText: fileText || undefined, context, messages };
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = buildCorsHeaders(origin, true); // MEM-FIX: Déclarer en dehors du try/catch

  try {
    // Gérer OPTIONS (preflight CORS) sans Content-Type
    if (req.method === "OPTIONS") {
      const preflightHeaders = buildCorsHeaders(origin, false);
      return new Response(null, { status: 204, headers: preflightHeaders });
    }

    if (!OPENAI_KEY) {
      console.error("❌ OPENAI_API_KEY manquante");
      throw new Error("OPENAI_API_KEY manquante");
    }

    // MEM-FIX: Récupérer ou créer un session_id
    let sessionId: string | null = null;

    // Détecter si c'est un upload de fichier ou une requête JSON classique
    const contentType = req.headers.get("content-type") || "";
    let question = "";
    let context = "";
    let messages = null;
    let fileText = "";
    let fileProcessed = false;

    if (contentType.includes("multipart/form-data")) {
      console.log("📤 Requête avec fichier détectée");
      const formData = await parseMultipartForm(req);
      question = formData.question;
      context = formData.context || "";
      messages = formData.messages;
      sessionId = (formData as any).sessionId || null; // MEM-FIX: Récupérer session_id depuis form

      if (formData.fileText && formData.fileText.length > 0) {
        fileText = formData.fileText;
        fileProcessed = true;
        console.log(`✅ Fichier traité: ${fileText.length} caractères reçus`);
      }
    } else {
      // Requête JSON classique (sans fichier)
      const body = await req.json();
      question = body.question;
      context = body.context || "";
      messages = body.messages;
      sessionId = body.session_id || null; // MEM-FIX: Récupérer session_id depuis body
    }

    // MEM-FIX: Générer ou réutiliser un session_id
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      console.log("🆕 Nouvelle session créée:", sessionId);
    } else {
      console.log("🔄 Session existante:", sessionId);
    }

    // 🔍 Récupérer le user_id et charger l'historique
    const authHeader = req.headers.get("authorization");
    let userId: string | null = null;

    // MEM-FIX: Charger l'historique depuis la BDD si session_id existe
    let dbHistory: Array<{ role: string; content: string }> = [];
    let chatMemory: { summary?: string; key_topics?: string[]; language?: string; mood?: string } | null = null;
    
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.replace("Bearer ", "");
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);

        if (!userError && user) {
          userId = user.id; // MEM-FIX: Stocker userId pour la sauvegarde ultérieure
          console.log("✅ User ID récupéré:", userId.substring(0, 8) + "...");

          // Charger la dernière mémoire persistante de l'utilisateur (peu importe la session)
          const { data: memoryData, error: memoryError } = await supabase
            .from('chat_memory')
            .select('summary, key_topics, language, mood')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false })
            .limit(1)
            .single();

          if (!memoryError && memoryData) {
            chatMemory = memoryData;
            console.log(`🧠 Mémoire chargée (dernière session): ${memoryData.summary?.substring(0, 50)}...`);
          } else {
            console.log(`ℹ️ Aucune mémoire trouvée pour cet utilisateur`);
            chatMemory = null;
          }

          console.log(`🔍 [DEBUG] Tentative chargement historique pour session_id: ${sessionId.substring(0, 8)}...`);

          const { data: historyData, error: historyError } = await supabase
            .from('chat_history')
            .select('role, content, created_at')
            .eq('session_id', sessionId)
            .eq('user_id', user.id)
            .order('created_at', { ascending: true })
            .order('id', { ascending: true })  // MEM-FIX: Garantir ordre stable même si timestamps identiques
            .limit(MAX_HISTORY);

          if (historyError) {
            console.error(`❌ [DEBUG] Erreur chargement historique:`, historyError.message, historyError.code, historyError.details);
          }

          if (!historyError && historyData && historyData.length > 0) {
            dbHistory = historyData;
            console.log(`📜 ${dbHistory.length} messages chargés depuis la BDD`);
          } else {
            console.log(`⚠️ [DEBUG] Aucun historique trouvé (${historyData?.length || 0} messages)`);
          }
        }
      } catch (dbError: any) {
        console.warn("⚠️ Erreur chargement historique BDD:", dbError.message);
      }
    }

    // Construire l'historique de conversation (priorité à la BDD, fallback sur messages frontend)
    const history = dbHistory.length > 0
      ? dbHistory
          .map((msg) => {
            const role = msg.role.toUpperCase();
            const content = msg.content.slice(0, 400);
            return `${role}: ${content}`;
          })
          .join("\n")
      : Array.isArray(messages)
      ? messages
          .slice(-20) // Garder seulement les 20 derniers messages
          .map((msg: { role?: string; content?: string }) => {
            const role = (msg.role || "user").toUpperCase();
            const content = (msg.content || "").slice(0, 400);
            return `${role}: ${content}`;
          })
          .join("\n")
      : String(context || "");

    console.log(`📜 [DEBUG] Historique construit (${history.length} caractères):`, history.slice(0, 200));

    const effectiveQuestion =
      typeof question === "string" && question.trim().length > 0
        ? question
        : Array.isArray(messages)
        ? [...messages]
            .reverse()
            .find((msg) => (msg.role || "").toLowerCase() === "user")?.content ?? ""
        : "";

    if (!effectiveQuestion.trim()) {
      console.error("❌ Question vide");
      throw new Error("Question vide");
    }

    // 🔍 Détecter les commandes "souviens-toi"
    const rememberPatterns = [
      /souviens-toi\s+(?:que|de|qu'|d'|que\s+je|que\s+mon|que\s+ma|que\s+mes)/i,
      /note\s+(?:que|que\s+je|que\s+mon|que\s+ma|que\s+mes)/i,
      /retiens\s+(?:que|que\s+je|que\s+mon|que\s+ma|que\s+mes)/i,
      /mémorise\s+(?:que|que\s+je|que\s+mon|que\s+ma|que\s+mes)/i,
      /rappelle-toi\s+(?:que|de|qu'|d'|que\s+je|que\s+mon|que\s+ma|que\s+mes)/i,
    ];

    const isRememberCommand = rememberPatterns.some(pattern => pattern.test(effectiveQuestion));
    let cleanedCommand = effectiveQuestion;

    if (isRememberCommand) {
      console.log("🧠 Commande 'souviens-toi' détectée !");
      
      // Nettoyer la commande (enlever les mots-clés)
      cleanedCommand = effectiveQuestion
        .replace(/^(?:souviens-toi|note|retiens|mémorise|rappelle-toi)\s+(?:que|de|qu'|d'|que\s+je|que\s+mon|que\s+ma|que\s+mes)\s*/i, '')
        .trim();

      console.log(`📝 Commande nettoyée: "${cleanedCommand}"`);

      // Si userId existe, appeler ai-memory avec is_command=true
      if (userId && sessionId) {
        const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
        
        // Appeler ai-memory de manière synchrone (on attend la réponse pour confirmer)
        try {
          const memoryRes = await fetch(`${supabaseUrl}/functions/v1/ai-memory`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              session_id: sessionId,
              user_id: userId,
              messages: [
                { role: 'user', content: effectiveQuestion },
                { role: 'assistant', content: 'Information mémorisée' }
              ],
              is_command: true,
              command_text: cleanedCommand
            })
          });

          if (memoryRes.ok) {
            console.log("✅ Information mémorisée avec succès");
            // Répondre immédiatement sans appeler GPT
            return new Response(
              JSON.stringify({
                reply: "✅ J'ai enregistré cette information.",
                session_id: sessionId,
                timestamp: now,
                searched: false,
                fileProcessed: false,
                cached: false,
                enrichment_used: false,
                notes_count: 0,
                vocabulary_count: 0,
                memory_saved: true // Flag pour afficher le toast
              }),
              {
                headers: corsHeaders
              }
            );
          } else {
            console.error("❌ Erreur lors de la sauvegarde de la mémoire");
            // Continuer avec le traitement normal si erreur
          }
        } catch (memoryError: any) {
          console.error("❌ Erreur appel ai-memory:", memoryError.message);
          // Continuer avec le traitement normal si erreur
        }
      } else {
        console.warn("⚠️ userId ou sessionId manquant, impossible de mémoriser");
        // Continuer avec le traitement normal
      }
    }

    // Détecter si l'utilisateur demande "Que sais-tu sur moi ?"
    const isMemoryQuery = /^(?:que\s+sais-tu\s+sur\s+moi|que\s+connais-tu\s+de\s+moi|qu['']est-ce\s+que\s+tu\s+sais\s+sur\s+moi|raconte-moi\s+ce\s+que\s+tu\s+sais\s+sur\s+moi)/i.test(effectiveQuestion);

    console.log("🤖 AI Question:", effectiveQuestion.slice(0, 100));
    if (fileProcessed) {
      console.log("📄 Avec fichier:", fileText.slice(0, 100) + "...");
    }

    // Détecter la langue de la question
    const detectedLang = franc(effectiveQuestion);
    const isArabic = detectedLang === 'ara';
    const userLanguage = chatMemory?.language || detectedLang || 'fr';
    
    console.log(`🌐 Langue détectée: ${detectedLang}, Langue mémoire: ${chatMemory?.language || 'N/A'}, Utilisation: ${userLanguage}`);

    const now = new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" });

    // 🔍 Récupérer notes et vocabulaire via recherche vectorielle
    let userNotes: string = "";
    let userVocabulary: string = "";

    if (userId) { // MEM-FIX: userId est déjà récupéré plus haut
      try {
          // Récupérer les notes et vocabulaire pertinents via recherche vectorielle
          try {
            // Générer l'embedding de la question
            const embeddingRes = await fetch(OPENAI_URL, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${OPENAI_KEY}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                model: "text-embedding-3-small",
                input: effectiveQuestion.trim()
              })
            });

            if (embeddingRes.ok) {
              const embeddingJson = await embeddingRes.json();
              const queryEmbedding = embeddingJson.data[0].embedding;

              // Rechercher les chunks similaires
              const { data: chunks, error: searchError } = await supabase.rpc('search_similar_embeddings', {
                query_embedding: queryEmbedding,
                target_user_id: userId,
                similarity_threshold: 0.5,
                max_results: 10
              });

              if (!searchError && chunks && chunks.length > 0) {
                const notes = chunks.filter((c: any) => c.content_type === 'note').slice(0, 5);
                const vocabulary = chunks.filter((c: any) => c.content_type === 'vocabulary').slice(0, 5);

                if (notes.length > 0) {
                  userNotes = notes.map((n: any) => 
                    `- ${n.content}${n.metadata?.title ? ` (${n.metadata.title})` : ''}`
                  ).join('\n');
                  console.log(`📝 ${notes.length} notes pertinentes trouvées`);
                }

                if (vocabulary.length > 0) {
                  userVocabulary = vocabulary.map((v: any) => 
                    `- ${v.content}${v.metadata?.category ? ` [${v.metadata.category}]` : ''}`
                  ).join('\n');
                  console.log(`📚 ${vocabulary.length} termes de vocabulaire pertinents trouvés`);
                }
              } else if (searchError) {
                console.warn("⚠️ Erreur recherche vectorielle:", searchError.message);
              }
            }
          } catch (enrichError: any) {
            console.warn("⚠️ Erreur enrichissement notes/vocabulaire:", enrichError.message);
            // Continuer sans enrichissement si erreur
          }
      } catch (enrichError: any) {
        console.warn("⚠️ Erreur enrichissement:", enrichError.message);
      }
    }

    // 1️⃣ Vérifier si la question nécessite une recherche web (sauf si fichier fourni)
    let finalReply = "";
    let searched = false;

    if (!fileProcessed) {
      // Pas de fichier → comportement normal avec recherche web possible
      const toolQuery = {
        model: "gpt-4o-mini", // Plus rapide et moins cher que gpt-4
        messages: [
          {
            role: "system",
            content: `Il est ${now}. Analyse si la question nécessite des informations actualisées ou en temps réel (météo, prix, actualités, résultats sportifs, événements récents, etc.). Si OUI, réponds uniquement : <<SEARCH>>[question reformulée pour recherche]<<SEARCH>>. Si NON, réponds normalement à la question.`
          },
          { role: "user", content: effectiveQuestion }
        ],
        temperature: 0,
        max_tokens: 150 // Réduit de 200 à 150
      };

      console.log("🔍 Vérification besoin de recherche...");
      const checkRes = await fetch(OPENAI_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(toolQuery)
      });

      if (!checkRes.ok) {
        const txt = await checkRes.text();
        console.error(`❌ OpenAI check error ${checkRes.status}:`, txt);
        throw new Error(`OpenAI ${checkRes.status}: ${txt}`);
      }

      const checkJson = await checkRes.json();
      const checkReply = checkJson.choices?.[0]?.message?.content?.trim() ?? "";

      finalReply = checkReply;
      const needSearch = checkReply.includes("<<SEARCH>>") && checkReply.split("<<SEARCH>>").length >= 3;

      // 2️⃣ Si besoin de recherche ET clé Brave disponible
      if (needSearch && BRAVE_KEY) {
        console.log("🌐 Recherche web détectée !");

        const searchQuery = checkReply.split("<<SEARCH>>")[1]?.trim() || effectiveQuestion;
        console.log("🔎 Requête Brave:", searchQuery.slice(0, 80));

        try {
          const braveRes = await fetch(
            `${BRAVE_URL}?q=${encodeURIComponent(searchQuery)}&count=5&freshness=pw`,
            {
              headers: { "X-Subscription-Token": BRAVE_KEY }
            }
          );

          if (!braveRes.ok) {
            console.error(`⚠️ Brave API error ${braveRes.status}`);
            throw new Error(`Brave ${braveRes.status}`);
          }

          const braveJson = await braveRes.json();
          const results = braveJson.web?.results || [];

          if (results.length === 0) {
            console.log("⚠️ Aucun résultat Brave trouvé");
            throw new Error("Aucun résultat de recherche");
          }

          const snippets = results
            .map((r: any, i: number) => `[${i + 1}] ${r.title}\n${r.description}\nSource: ${r.url}`)
            .join("\n\n");

          console.log(`✅ ${results.length} résultats Brave trouvés`);

          // Construire le prompt système avec recherche web + notes/vocabulaire + mémoire
          const memoryContext = chatMemory?.summary 
            ? `\n\nMémoire utilisateur :\n{memory}\n${chatMemory.summary}${chatMemory.key_topics && chatMemory.key_topics.length > 0 ? `\nConcepts clés : ${chatMemory.key_topics.join(', ')}` : ''}`
            : '\n\nMémoire utilisateur :\n{memory}\n';

          const languageInstruction = isArabic || userLanguage === 'ara'
            ? '\n\n⚠️ IMPORTANT : La question est en arabe. Réponds TOUJOURS en arabe avec les bonnes lettres connectées (ligatures).'
            : userLanguage !== 'fr'
            ? `\n\n⚠️ IMPORTANT : Réponds dans la langue détectée : ${userLanguage}`
            : '';

          // Si l'utilisateur demande "Que sais-tu sur moi ?", répondre uniquement avec la mémoire
          const memoryOnlyInstruction = isMemoryQuery && chatMemory?.summary
            ? '\n\n⚠️ IMPORTANT : L\'utilisateur demande ce que tu sais sur lui. Réponds UNIQUEMENT avec les informations de la mémoire utilisateur ci-dessus. Ne cherche pas sur le web, ne mentionne pas les notes ou le vocabulaire. Réponds uniquement avec la mémoire.'
            : '';

          let systemContent = `Tu es Centrinote AI, l'assistant personnel intelligent de l'application Centrinote.

Ton rôle est d'aider l'utilisateur à :
- Comprendre, résumer et retrouver ses notes
- Enrichir son vocabulaire (traduction, définition, exemples)
- Effectuer des recherches web lorsque ses notes ne suffisent pas
- Te souvenir de ses préférences et du contexte de ses conversations (via mémoire persistante)

Règles :
- Réponds toujours dans la langue détectée (français, arabe, anglais, etc.)
- Sois concis, bienveillant et précis
- Cite tes sources (notes, vocabulaire, web) de manière claire
- N'invente jamais d'informations non présentes dans les notes
- Si tu utilises la recherche web, indique "Source : Web"
- Si tu utilises une note, indique "Source : Note <titre>"
- Si tu utilises le vocabulaire, indique "Source : Vocabulaire <terme>"

Il est ${now} (heure française).${memoryContext}${languageInstruction}${memoryOnlyInstruction}

Voici les résultats de recherche web actualisés :\n\n${snippets}\n\nUtilise ces informations pour répondre de manière précise et concise à la question de l'utilisateur.`;

          if (userNotes || userVocabulary) {
            systemContent += `\n\nContexte utilisateur :\n`;
            if (userNotes) {
              systemContent += `\n{notes}\n${userNotes}\n`;
            }
            if (userVocabulary) {
              systemContent += `\n{vocabulaire}\n${userVocabulary}\n`;
            }
            systemContent += `\nUtilise ces informations personnelles de manière naturelle et contextuelle.`;
          }

          const finalPayload = {
            model: "gpt-4o-mini", // Plus rapide que gpt-4
            messages: [
              {
                role: "system",
                content: systemContent
              },
              ...(history
                ? [
                    {
                      role: "system",
                      content: `Historique de la conversation:\n${history}`,
                    },
                  ]
                : []),
              { role: "user", content: effectiveQuestion }
            ],
            temperature: 0.25,
            max_tokens: 500 // Réduit de 600 à 500
          };

          console.log("🤖 Génération réponse avec données web...");
          const finalRes = await fetch(OPENAI_URL, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${OPENAI_KEY}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify(finalPayload)
          });

          if (!finalRes.ok) {
            const txt = await finalRes.text();
            console.error(`❌ OpenAI final error ${finalRes.status}:`, txt);
            throw new Error(`OpenAI final ${finalRes.status}: ${txt}`);
          }

          const finalJson = await finalRes.json();
          finalReply = finalJson.choices?.[0]?.message?.content?.trim() ?? "Pas de réponse";
          searched = true;

          console.log("✅ Réponse avec recherche web générée:", finalReply.slice(0, 100));
        } catch (braveError: any) {
          console.error("❌ Erreur recherche web:", braveError.message);
          searched = false;
        }
      } else {
        console.log("💬 Réponse directe (sans recherche web)");
      }

      // Si pas de recherche web ET pas de réponse générée, générer une réponse avec notes/vocabulaire si disponibles
      if (!searched && !finalReply && (userNotes || userVocabulary)) {
        const memoryContext = chatMemory?.summary 
          ? `\n\nMémoire utilisateur :\n{memory}\n${chatMemory.summary}${chatMemory.key_topics && chatMemory.key_topics.length > 0 ? `\nConcepts clés : ${chatMemory.key_topics.join(', ')}` : ''}`
          : '\n\nMémoire utilisateur :\n{memory}\n';

        const languageInstruction = isArabic || userLanguage === 'ara'
          ? '\n\n⚠️ IMPORTANT : La question est en arabe. Réponds TOUJOURS en arabe avec les bonnes lettres connectées (ligatures).'
          : userLanguage !== 'fr'
          ? `\n\n⚠️ IMPORTANT : Réponds dans la langue détectée : ${userLanguage}`
          : '';

        // Si l'utilisateur demande "Que sais-tu sur moi ?", répondre uniquement avec la mémoire
        const memoryOnlyInstruction = isMemoryQuery && chatMemory?.summary
          ? '\n\n⚠️ IMPORTANT : L\'utilisateur demande ce que tu sais sur lui. Réponds UNIQUEMENT avec les informations de la mémoire utilisateur ci-dessus. Ne cherche pas sur le web, ne mentionne pas les notes ou le vocabulaire. Réponds uniquement avec la mémoire.'
          : '';

        let directSystemContent = `Tu es Centrinote AI, l'assistant personnel intelligent de l'application Centrinote.

Ton rôle est d'aider l'utilisateur à :
- Comprendre, résumer et retrouver ses notes
- Enrichir son vocabulaire (traduction, définition, exemples)
- Effectuer des recherches web lorsque ses notes ne suffisent pas
- Te souvenir de ses préférences et du contexte de ses conversations (via mémoire persistante)

Règles :
- Réponds toujours dans la langue détectée (français, arabe, anglais, etc.)
- Sois concis, bienveillant et précis
- Cite tes sources (notes, vocabulaire, web) de manière claire
- N'invente jamais d'informations non présentes dans les notes
- Si tu utilises la recherche web, indique "Source : Web"
- Si tu utilises une note, indique "Source : Note <titre>"
- Si tu utilises le vocabulaire, indique "Source : Vocabulaire <terme>"

Il est ${now} (heure française).${memoryContext}${languageInstruction}${memoryOnlyInstruction}`;
        
        if (userNotes || userVocabulary) {
          directSystemContent += `\n\nContexte utilisateur :\n`;
          if (userNotes) {
            directSystemContent += `\n{notes}\n${userNotes}\n`;
          }
          if (userVocabulary) {
            directSystemContent += `\n{vocabulaire}\n${userVocabulary}\n`;
          }
          directSystemContent += `\nUtilise ces informations personnelles de manière naturelle et contextuelle.`;
        }

        const directPayload = {
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: directSystemContent
            },
            ...(history
              ? [
                  {
                    role: "system",
                    content: `Historique de la conversation:\n${history}`,
                  },
                ]
              : []),
            { role: "user", content: effectiveQuestion }
          ],
          temperature: 0.7,
          max_tokens: 500
        };

        try {
          const directRes = await fetch(OPENAI_URL, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${OPENAI_KEY}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify(directPayload)
          });

          if (directRes.ok) {
            const directJson = await directRes.json();
            finalReply = directJson.choices?.[0]?.message?.content?.trim() ?? "Pas de réponse";
            console.log("✅ Réponse avec notes/vocabulaire générée:", finalReply.slice(0, 100));
          } else {
            // Si erreur, utiliser la réponse du check initial
            finalReply = checkReply;
          }
        } catch (directError: any) {
          console.error("❌ Erreur génération réponse directe:", directError.message);
          // Si erreur, utiliser la réponse du check initial
          finalReply = checkReply;
        }
      } else if (!searched && !finalReply) {
        // Si pas de notes/vocabulaire et pas de recherche, utiliser la réponse du check
        finalReply = checkReply;
      }
    } else {
      // 3️⃣ Fichier fourni → réponse basée sur le document
      console.log("📄 Mode analyse de document");

      const documentPrompt = fileText
        ? `\n\n=== DOCUMENT FOURNI ===\n${fileText}\n=== FIN DU DOCUMENT ===\n\nRéponds à la question en te basant principalement sur ce document. Il est actuellement ${now}.`
        : "";

      const memoryContext = chatMemory?.summary 
        ? `\n\nMémoire utilisateur :\n{memory}\n${chatMemory.summary}${chatMemory.key_topics && chatMemory.key_topics.length > 0 ? `\nConcepts clés : ${chatMemory.key_topics.join(', ')}` : ''}`
        : '\n\nMémoire utilisateur :\n{memory}\n';

      const languageInstruction = isArabic || userLanguage === 'ara'
        ? '\n\n⚠️ IMPORTANT : La question est en arabe. Réponds TOUJOURS en arabe avec les bonnes lettres connectées (ligatures).'
        : userLanguage !== 'fr'
        ? `\n\n⚠️ IMPORTANT : Réponds dans la langue détectée : ${userLanguage}`
        : '';

      // Si l'utilisateur demande "Que sais-tu sur moi ?", répondre uniquement avec la mémoire
      const memoryOnlyInstruction = isMemoryQuery && chatMemory?.summary
        ? '\n\n⚠️ IMPORTANT : L\'utilisateur demande ce que tu sais sur lui. Réponds UNIQUEMENT avec les informations de la mémoire utilisateur ci-dessus. Ne cherche pas sur le web, ne mentionne pas les notes ou le vocabulaire. Réponds uniquement avec la mémoire.'
        : '';

      // Construire le prompt système pour analyse de document + notes/vocabulaire
      let fileSystemContent = `Tu es Centrinote AI, l'assistant personnel intelligent de l'application Centrinote.

Ton rôle est d'aider l'utilisateur à :
- Comprendre, résumer et retrouver ses notes
- Enrichir son vocabulaire (traduction, définition, exemples)
- Effectuer des recherches web lorsque ses notes ne suffisent pas
- Te souvenir de ses préférences et du contexte de ses conversations (via mémoire persistante)

Règles :
- Réponds toujours dans la langue détectée (français, arabe, anglais, etc.)
- Sois concis, bienveillant et précis
- Cite tes sources (notes, vocabulaire, web) de manière claire
- N'invente jamais d'informations non présentes dans les notes
- Si tu utilises la recherche web, indique "Source : Web"
- Si tu utilises une note, indique "Source : Note <titre>"
- Si tu utilises le vocabulaire, indique "Source : Vocabulaire <terme>"

Il est ${now} (heure française).${memoryContext}${languageInstruction}${memoryOnlyInstruction}

L'utilisateur t'a fourni un document à analyser. Réponds de manière concise, amicale et professionnelle en te basant sur le contenu du document.`;

      if (userNotes || userVocabulary) {
        fileSystemContent += `\n\nContexte utilisateur :\n`;
        if (userNotes) {
          fileSystemContent += `\n{notes}\n${userNotes}\n`;
        }
        if (userVocabulary) {
          fileSystemContent += `\n{vocabulaire}\n${userVocabulary}\n`;
        }
        fileSystemContent += `\nUtilise ces informations personnelles de manière naturelle et contextuelle.`;
      }

      const filePayload = {
        model: "gpt-4o-mini", // Plus rapide que gpt-4
        messages: [
          {
            role: "system",
            content: fileSystemContent
          },
          ...(history
            ? [
                {
                  role: "system",
                  content: `Historique de la conversation:\n${history}`,
                },
              ]
            : []),
          { role: "user", content: effectiveQuestion + documentPrompt }
        ],
        temperature: 0.25,
        max_tokens: 600 // Réduit de 800 à 600
      };

      console.log("🤖 Génération réponse basée sur le document...");
      const fileRes = await fetch(OPENAI_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(filePayload)
      });

      if (!fileRes.ok) {
        const txt = await fileRes.text();
        console.error(`❌ OpenAI file error ${fileRes.status}:`, txt);
        throw new Error(`OpenAI ${fileRes.status}: ${txt}`);
      }

      const fileJson = await fileRes.json();
      finalReply = fileJson.choices?.[0]?.message?.content?.trim() ?? "Pas de réponse";

      console.log("✅ Réponse basée sur document générée:", finalReply.slice(0, 100));
    }

    // MEM-FIX: Sauvegarder l'historique dans la BDD (user + assistant)
    if (userId && sessionId) {
      try {
        console.log(`🔍 [DEBUG] Tentative sauvegarde historique pour session_id: ${sessionId.substring(0, 8)}...`);

        // Insérer le message user d'abord
        const { error: userSaveError } = await supabase.from('chat_history').insert({
          session_id: sessionId,
          user_id: userId,
          role: 'user',
          content: effectiveQuestion
        });

        if (userSaveError) {
          console.error("❌ [DEBUG] Erreur sauvegarde user:", userSaveError.message);
        }

        // Micro-délai pour garantir created_at différent
        await new Promise(resolve => setTimeout(resolve, 10));

        // Insérer le message assistant ensuite
        const { error: assistantSaveError } = await supabase.from('chat_history').insert({
          session_id: sessionId,
          user_id: userId,
          role: 'assistant',
          content: finalReply
        });

        if (assistantSaveError) {
          console.error("❌ [DEBUG] Erreur sauvegarde assistant:", assistantSaveError.message);
        }

        if (!userSaveError && !assistantSaveError) {
          console.log("💾 Historique sauvegardé dans la BDD (user + assistant)");
        }
      } catch (saveError: any) {
        console.error("⚠️ [DEBUG] Exception sauvegarde historique:", saveError.message, saveError.stack);
        // Ne pas bloquer la réponse si la sauvegarde échoue
      }
    } else {
      console.warn(`⚠️ [DEBUG] Sauvegarde ignorée - userId: ${userId ? 'OK' : 'NULL'}, sessionId: ${sessionId ? 'OK' : 'NULL'}`);
    }

    return new Response(
      JSON.stringify({
        reply: finalReply,
        session_id: sessionId, // MEM-FIX: Renvoyer le session_id au client
        timestamp: now,
        searched,
        fileProcessed,
        cached: false,
        enrichment_used: !!(userNotes || userVocabulary),
        notes_count: userNotes ? userNotes.split('\n').length : 0,
        vocabulary_count: userVocabulary ? userVocabulary.split('\n').length : 0
      }),
      {
        headers: corsHeaders
      }
    );
  } catch (err: any) {
    console.error("❌ ai-chat error:", err.message);

    return new Response(
      JSON.stringify({
        error: err.message,
        fallback: true,
        reply: "Désolé, le service IA est momentanément indisponible. Veuillez réessayer dans quelques instants."
      }),
      {
        status: 200,
        headers: corsHeaders
      }
    );
  }
});

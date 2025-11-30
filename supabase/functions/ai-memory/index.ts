import { serve } from "https://deno.land/std@0.200.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

// Supabase client
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

  if (includeContentType) {
    headers["Content-Type"] = "application/json";
  }

  return headers;
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = buildCorsHeaders(origin, true);

  try {
    // Gérer OPTIONS (preflight CORS)
    if (req.method === "OPTIONS") {
      const preflightHeaders = buildCorsHeaders(origin, false);
      return new Response(null, { status: 204, headers: preflightHeaders });
    }

    if (!OPENAI_KEY) {
      throw new Error("OPENAI_API_KEY manquante");
    }

    // Récupérer le body
    const body = await req.json();
    const { session_id, messages, user_id } = body;

    if (!session_id || !messages || !Array.isArray(messages) || messages.length === 0) {
      throw new Error("session_id et messages (array) requis");
    }

    if (!user_id) {
      throw new Error("user_id requis");
    }

    console.log(`🧠 [ai-memory] Génération mémoire pour session: ${session_id.substring(0, 8)}...`);

    // Construire l'historique de conversation pour analyse
    const conversationText = messages
      .slice(-20) // Derniers 20 messages
      .map((msg: { role?: string; content?: string }) => {
        const role = (msg.role || "user").toUpperCase();
        const content = (msg.content || "").slice(0, 500); // Limiter la longueur
        return `${role}: ${content}`;
      })
      .join("\n\n");

    // Appeler GPT-4o-mini pour générer le résumé et les concepts clés
    const memoryPrompt = `Analyse cette conversation et génère :
1. Un résumé concis (2-3 phrases) de ce qui a été discuté
2. Les concepts clés abordés (liste de 3-5 mots-clés ou phrases courtes)
3. La langue principale utilisée (fr, ar, en, es, de, etc.)
4. L'humeur/tone général (optionnel : formel, décontracté, technique, etc.)

Format de réponse JSON strict :
{
  "summary": "résumé en 2-3 phrases",
  "key_topics": ["concept1", "concept2", "concept3"],
  "language": "fr",
  "mood": "décontracté"
}

Conversation :
${conversationText}`;

    const memoryRes = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Tu es un analyseur de conversations. Génère UNIQUEMENT du JSON valide, sans texte supplémentaire."
          },
          {
            role: "user",
            content: memoryPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 300,
        response_format: { type: "json_object" }
      })
    });

    if (!memoryRes.ok) {
      const txt = await memoryRes.text();
      console.error(`❌ OpenAI memory error ${memoryRes.status}:`, txt);
      throw new Error(`OpenAI ${memoryRes.status}: ${txt}`);
    }

    const memoryJson = await memoryRes.json();
    const memoryContent = memoryJson.choices?.[0]?.message?.content?.trim() || "{}";
    
    let memoryData: {
      summary?: string;
      key_topics?: string[];
      language?: string;
      mood?: string;
    } = {};

    try {
      memoryData = JSON.parse(memoryContent);
    } catch (parseError) {
      console.warn("⚠️ Erreur parsing JSON mémoire, utilisation des valeurs par défaut");
      memoryData = {
        summary: "Conversation en cours",
        key_topics: [],
        language: "fr",
        mood: null
      };
    }

    // Upsert dans chat_memory (mise à jour si existe, sinon création)
    // Utiliser ON CONFLICT pour gérer le cas où la clé primaire existe déjà
    const { data, error: upsertError } = await supabase
      .from("chat_memory")
      .upsert(
        {
          user_id: user_id,
          session_id: session_id,
          summary: memoryData.summary || null,
          key_topics: memoryData.key_topics || [],
          language: memoryData.language || "fr",
          mood: memoryData.mood || null,
          updated_at: new Date().toISOString()
        },
        {
          onConflict: "user_id,session_id",
          ignoreDuplicates: false // Mettre à jour si existe
        }
      )
      .select()
      .single();

    if (upsertError) {
      console.error("❌ Erreur upsert mémoire:", upsertError);
      throw new Error(`Erreur sauvegarde mémoire: ${upsertError.message}`);
    }

    console.log(`✅ [ai-memory] Mémoire sauvegardée pour session: ${session_id.substring(0, 8)}...`);

    return new Response(
      JSON.stringify({
        success: true,
        memory: {
          summary: memoryData.summary,
          key_topics: memoryData.key_topics,
          language: memoryData.language,
          mood: memoryData.mood
        }
      }),
      {
        headers: corsHeaders
      }
    );
  } catch (err: any) {
    console.error("❌ ai-memory error:", err.message);

    return new Response(
      JSON.stringify({
        success: false,
        error: err.message
      }),
      {
        status: 200, // Toujours 200 pour ne pas bloquer le frontend
        headers: corsHeaders
      }
    );
  }
});


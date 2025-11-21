import { serve } from "https://deno.land/std@0.200.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const QUOTA_LIMIT = 50;
const QUOTA_WINDOW_HOURS = 24;

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://localhost:3000",
  "https://centrinote.fr",
  "https://www.centrinote.fr"
]);

function buildCorsHeaders(origin: string | null): HeadersInit {
  const allowedOrigin = origin && allowedOrigins.has(origin) ? origin : "*";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
    "Content-Type": "application/json",
  };
}

function stripPII(text: string): string {
  return text
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, "[EMAIL]")
    .replace(/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, "[PHONE]")
    .replace(/\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g, "[SSN]")
    .replace(/\b\d{4}[-.\s]?\d{4}[-.\s]?\d{4}[-.\s]?\d{4}\b/g, "[CARD]");
}

async function checkQuota(userId: string): Promise<{ ok: boolean; code?: string }> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - QUOTA_WINDOW_HOURS * 60 * 60 * 1000);

  const { data: usage, error } = await supabase
    .from('ai_usage')
    .select('used, expires_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    return { ok: false, code: 'DB_ERROR' };
  }

  if (!usage || new Date(usage.expires_at) < now) {
    await supabase.from('ai_usage').upsert({
      user_id: userId,
      quota: QUOTA_LIMIT,
      used: 0,
      expires_at: new Date(now.getTime() + QUOTA_WINDOW_HOURS * 60 * 60 * 1000).toISOString(),
    });
    return { ok: true };
  }

  if (usage.used >= QUOTA_LIMIT) {
    return { ok: false, code: 'QUOTA_EXCEEDED' };
  }

  return { ok: true };
}

async function incrementUsage(userId: string, tokens: number): Promise<void> {
  await supabase.rpc('increment_ai_usage', { p_user_id: userId });
}

async function logAudit(
  userId: string,
  action: string,
  tokens: number,
  ip: string | null,
  userAgent: string | null
): Promise<void> {
  await supabase.from('ai_audit_log').insert({
    user_id: userId,
    action,
    tokens,
    ip,
    user_agent: userAgent,
  });
}

async function callOpenAI(prompt: string, maxTokens = 500): Promise<{ text: string; tokens: number }> {
  const response = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI ${response.status}`);
  }

  const json = await response.json();
  const text = json.choices?.[0]?.message?.content?.trim() || "";
  const tokens = json.usage?.total_tokens || 0;

  return { text, tokens };
}

const ACTIONS: Record<string, { prompt: string; maxTokens: number }> = {
  reformuler: {
    prompt: "Reformule ce texte de manière claire et concise, en conservant le sens original :\n\n",
    maxTokens: 600,
  },
  resumer: {
    prompt: "Résume ce texte en 3-5 points clés au format HTML avec des <li> :\n\n",
    maxTokens: 400,
  },
  ameliorer: {
    prompt: "Améliore ce texte en corrigeant grammaire, orthographe et style :\n\n",
    maxTokens: 700,
  },
  definir: {
    prompt: "Définis ce terme ou concept de manière claire et pédagogique :\n\n",
    maxTokens: 300,
  },
  rechercher: {
    prompt: "Explique ce concept en détail avec des exemples concrets :\n\n",
    maxTokens: 800,
  },
};

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = buildCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    if (!OPENAI_KEY) {
      throw new Error("OPENAI_API_KEY manquante");
    }

    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ ok: false, code: "UNAUTHORIZED" }),
        { status: 401, headers: corsHeaders }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ ok: false, code: "INVALID_TOKEN" }),
        { status: 401, headers: corsHeaders }
      );
    }

    const body = await req.json();
    const { action, text } = body;

    if (!action || !ACTIONS[action]) {
      return new Response(
        JSON.stringify({ ok: false, code: "INVALID_ACTION" }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return new Response(
        JSON.stringify({ ok: false, code: "EMPTY_TEXT" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const quotaCheck = await checkQuota(user.id);
    if (!quotaCheck.ok) {
      return new Response(
        JSON.stringify({ ok: false, code: quotaCheck.code }),
        { status: 429, headers: corsHeaders }
      );
    }

    const cleanText = stripPII(text.trim());
    const actionConfig = ACTIONS[action];
    const fullPrompt = actionConfig.prompt + cleanText;

    const { text: result, tokens } = await callOpenAI(fullPrompt, actionConfig.maxTokens);

    await incrementUsage(user.id, tokens);

    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");
    const userAgent = req.headers.get("user-agent");
    await logAudit(user.id, action, tokens, ip, userAgent);

    return new Response(
      JSON.stringify({ ok: true, html: result, tokens }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, code: "SERVER_ERROR", message: err.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});

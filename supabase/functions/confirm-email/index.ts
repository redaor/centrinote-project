import { serve } from "https://deno.land/std@0.200.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { jwtVerify } from "npm:jose@4.15.5";

const corsHeaders: HeadersInit = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const jwtSecret = Deno.env.get("JWT_SECRET") ?? Deno.env.get("VITE_JWT_SECRET");

if (!supabaseUrl) {
  throw new Error("SUPABASE_URL is not set");
}
if (!serviceRoleKey) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
}
if (!jwtSecret) {
  throw new Error("JWT_SECRET is not set");
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

const encoder = new TextEncoder();
const jwtSecretBytes = encoder.encode(jwtSecret);

async function verifyToken(token: string) {
  const { payload } = await jwtVerify(token, jwtSecretBytes);
  if (payload.type !== "email_confirmation") {
    throw new Error("Invalid token type");
  }
  return payload as { userId: string; email: string; };
}

async function fetchTokenRecord(token: string) {
  const { data, error } = await supabaseAdmin
    .from("user_confirmations")
    .select("user_id, expires_at, used")
    .eq("token", token)
    .single();

  if (error || !data) {
    console.error("❌ [confirm-email] Token lookup failed:", error);
    throw new Error("Invalid or expired token");
  }
  return data;
}

async function markTokenAsUsed(token: string) {
  console.log("🔄 [confirm-email] Marking token as used...");
  const { data, error, count } = await supabaseAdmin
    .from("user_confirmations")
    .update({ used: true, used_at: new Date().toISOString() })
    .eq("token", token)
    .select();

  if (error) {
    console.error("❌ [confirm-email] Unable to mark token used:", JSON.stringify(error, null, 2));
    throw new Error(`Failed to update token status: ${error.message || JSON.stringify(error)}`);
  }

  console.log("✅ [confirm-email] Token marked as used:", { data, count });
}

async function confirmUser(userId: string) {
  const now = new Date().toISOString();
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    email_confirm: true,
    user_metadata: {
      email_verified_at: now
    }
  });

  if (error) {
    console.error("❌ [confirm-email] Failed to confirm user:", error);
    throw new Error("Failed to confirm user email");
  }
}

async function fetchUserEmail(userId: string): Promise<string> {
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (error || !data.user?.email) {
    console.error("❌ [confirm-email] Unable to fetch user email:", error);
    throw new Error("User not found");
  }
  return data.user.email;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }

  try {
    const { token } = await req.json();

    if (!token || typeof token !== "string") {
      return new Response(JSON.stringify({ error: "Missing token" }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    const payload = await verifyToken(token);
    const record = await fetchTokenRecord(token);

    if (record.used) {
      return new Response(JSON.stringify({ error: "Token already used" }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    const expiresAt = new Date(record.expires_at);
    if (expiresAt < new Date()) {
      return new Response(JSON.stringify({ error: "Token expired" }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    await markTokenAsUsed(token);
    await confirmUser(record.user_id);
    const email = await fetchUserEmail(record.user_id);

    return new Response(JSON.stringify({ success: true, email }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error("❌ [confirm-email] Unexpected error:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    const status = message.includes("Invalid or expired token") ? 400 : 500;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});

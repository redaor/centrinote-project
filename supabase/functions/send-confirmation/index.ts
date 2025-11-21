import { serve } from "https://deno.land/std@0.200.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { SignJWT } from "npm:jose@4.15.5";

const corsHeaders: HeadersInit = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

const TOKEN_EXPIRATION_SECONDS = 24 * 60 * 60; // 24 heures

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const jwtSecret = Deno.env.get("JWT_SECRET") ?? Deno.env.get("VITE_JWT_SECRET");
const publicSiteUrl = Deno.env.get("PUBLIC_SITE_URL") ?? Deno.env.get("APP_BASE_URL") ?? "https://centrinote.fr";

// SMTP Ionos configuration
const smtpHost = Deno.env.get("SMTP_HOST");
const smtpPort = Deno.env.get("SMTP_PORT");
const smtpUser = Deno.env.get("SMTP_USER");
const smtpPassword = Deno.env.get("SMTP_PASSWORD");
const smtpFrom = Deno.env.get("SMTP_FROM");

if (!supabaseUrl) {
  throw new Error("SUPABASE_URL is not set");
}
if (!serviceRoleKey) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
}
if (!jwtSecret) {
  throw new Error("JWT_SECRET is not set");
}
if (!smtpHost || !smtpPort || !smtpUser || !smtpPassword || !smtpFrom) {
  throw new Error("SMTP configuration incomplete (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM required)");
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

const encoder = new TextEncoder();
const jwtSecretBytes = encoder.encode(jwtSecret);

function buildConfirmationUrl(token: string): string {
  const baseUrl = publicSiteUrl.replace(/\/$/, "");
  return `${baseUrl}/confirm-email?token=${token}`;
}

async function canResendConfirmation(userId: string): Promise<boolean> {
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
  const { data, error } = await supabaseAdmin
    .from("user_confirmations")
    .select("id")
    .eq("user_id", userId)
    .eq("used", false)
    .gte("created_at", oneMinuteAgo)
    .limit(1);

  if (error) {
    console.error("❌ [send-confirmation] Rate limit error:", error);
    return false;
  }

  return !data || data.length === 0;
}

async function invalidateOldTokens(userId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("user_confirmations")
    .update({ used: true, used_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("used", false);

  if (error) {
    console.warn("⚠️ [send-confirmation] Could not invalidate old tokens:", error);
  }
}

async function createConfirmationToken(userId: string, email: string): Promise<{ token: string; expiresAt: string; }>
{
  const token = await new SignJWT({
    userId,
    email,
    type: "email_confirmation"
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_EXPIRATION_SECONDS}s`)
    .sign(jwtSecretBytes);

  const expiresAt = new Date(Date.now() + TOKEN_EXPIRATION_SECONDS * 1000).toISOString();

  const { error } = await supabaseAdmin
    .from("user_confirmations")
    .insert({
      user_id: userId,
      token,
      expires_at: expiresAt,
      used: false
    });

  if (error) {
    console.error("❌ [send-confirmation] Failed to store token:", error);
    throw new Error("Failed to store confirmation token");
  }

  return { token, expiresAt };
}

async function sendEmail(email: string, confirmationUrl: string): Promise<void> {
  const htmlContent = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Confirmez votre compte Centrinote</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background-color:#ffffff;border-radius:16px;box-shadow:0 10px 25px rgba(0,0,0,0.1);overflow:hidden;">
    <div style="background:linear-gradient(135deg,#3b82f6 0%,#14b8a6 100%);padding:40px 30px;text-align:center;color:#ffffff;">
      <h1 style="margin:0;font-size:28px;font-weight:700;">Bienvenue sur Centrinote !</h1>
      <p style="margin:10px 0 0 0;font-size:16px;">Plus qu'une étape pour commencer</p>
    </div>
    <div style="padding:40px 30px;">
      <p style="font-size:16px;color:#1f2937;margin:0 0 20px 0;">Bonjour 👋</p>
      <p style="font-size:15px;color:#4b5563;margin:0 0 30px 0;">Pour activer votre compte, cliquez sur le bouton ci-dessous :</p>
      <div style="text-align:center;margin:30px 0;">
        <a href="${confirmationUrl}" style="display:inline-block;padding:16px 40px;background:linear-gradient(135deg,#3b82f6 0%,#14b8a6 100%);color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;border-radius:12px;">✅ Confirmer mon email</a>
      </div>
      <div style="padding:20px;background-color:#f9fafb;border-radius:8px;margin:30px 0;">
        <p style="margin:0 0 10px 0;color:#6b7280;font-size:13px;font-weight:600;">Le bouton ne fonctionne pas ?</p>
        <p style="margin:0;color:#4b5563;font-size:14px;">Copiez ce lien : <a href="${confirmationUrl}" style="color:#3b82f6;">${confirmationUrl}</a></p>
      </div>
    </div>
    <div style="padding:30px;background-color:#f9fafb;text-align:center;color:#6b7280;font-size:13px;">
      © ${new Date().getFullYear()} Centrinote. Tous droits réservés.
    </div>
  </div>
</body>
</html>`;

  // Construct MIME email
  const boundary = "----=_Part_" + Date.now() + Math.random().toString(36);
  const mimeMessage = [
    `From: ${smtpFrom}`,
    `To: ${email}`,
    `Subject: =?UTF-8?B?${btoa("Confirmez votre compte Centrinote")}?=`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    ``,
    btoa(unescape(encodeURIComponent(htmlContent))),
    `--${boundary}--`
  ].join("\r\n");

  try {
    // Connect via TLS (port 465)
    const conn = await Deno.connectTls({
      hostname: smtpHost!,
      port: parseInt(smtpPort!, 10)
    });

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    // Helper functions
    async function readResponse(): Promise<string> {
      const buffer = new Uint8Array(1024);
      const n = await conn.read(buffer);
      if (n === null) throw new Error("Connection closed");
      return decoder.decode(buffer.subarray(0, n));
    }

    async function sendCommand(cmd: string): Promise<string> {
      await conn.write(encoder.encode(cmd + "\r\n"));
      return await readResponse();
    }

    // SMTP conversation
    await readResponse(); // Wait for 220 greeting
    await sendCommand(`EHLO ${smtpHost}`);
    await sendCommand(`AUTH LOGIN`);
    await sendCommand(btoa(smtpUser!));
    await sendCommand(btoa(smtpPassword!));
    await sendCommand(`MAIL FROM:<${smtpUser}>`);
    await sendCommand(`RCPT TO:<${email}>`);
    await sendCommand(`DATA`);
    await conn.write(encoder.encode(mimeMessage + "\r\n.\r\n"));
    const dataResponse = await readResponse();

    if (!dataResponse.startsWith("250")) {
      throw new Error(`SMTP error: ${dataResponse}`);
    }

    await sendCommand(`QUIT`);
    conn.close();

    console.log(`✅ [send-confirmation] Email sent successfully to ${email}`);
  } catch (error) {
    console.error("❌ [send-confirmation] SMTP error:", error);
    throw new Error("Failed to send confirmation email via SMTP");
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: corsHeaders
    });
  }

  try {
    const { userId, email, force } = await req.json();

    if (!userId || !email) {
      return new Response(JSON.stringify({ error: "Missing userId or email" }), {
        status: 400,
        headers: corsHeaders
      });
    }

    const lowerEmail = String(email).toLowerCase();

    if (!force) {
      const allowed = await canResendConfirmation(userId);
      if (!allowed) {
        return new Response(JSON.stringify({ error: "Too many requests" }), {
          status: 429,
          headers: corsHeaders
        });
      }
    }

    await invalidateOldTokens(userId);
    const { token, expiresAt } = await createConfirmationToken(userId, lowerEmail);
    const confirmationUrl = buildConfirmationUrl(token);

    await sendEmail(lowerEmail, confirmationUrl);

    return new Response(JSON.stringify({ success: true, confirmationUrl, token, expiresAt }), {
      status: 200,
      headers: corsHeaders
    });
  } catch (error) {
    console.error("❌ [send-confirmation] Unexpected error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }), {
      status: 500,
      headers: corsHeaders
    });
  }
});

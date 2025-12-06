// supabase/functions/automation-email/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders, status: 200 });

  try {
    const { to, subject, text, html, body } = await req.json();
    const textBody = text || body || '';
    const htmlBody = html || '';

    if (!to || !subject || (!textBody && !htmlBody))
      throw new Error('Missing to/subject + text/html');

    console.log(`📨 [EMAIL] Request received: to=${to}, subject=${subject}`);

    // ✅ PROTECTION CONTRE LES DOUBLONS : Utiliser la fonction RPC atomique avec verrou
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://wjzlicokhxitmeoxkjzv.supabase.co';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseServiceKey) {
      console.error('❌ [EMAIL] SUPABASE_SERVICE_ROLE_KEY not found, skipping deduplication check');
    } else {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      // ✅ Utiliser la fonction RPC atomique avec verrou FOR UPDATE
      const { data: canSend, error: dedupeError } = await supabase.rpc('check_and_log_email_send', {
        p_email_to: to,
        p_email_subject: subject,
        p_dedupe_window_minutes: 5
      });
      
      if (dedupeError) {
        console.error(`❌ [EMAIL] Error checking for duplicates:`, dedupeError);
        // ⚠️ Si la fonction n'existe pas, on continue quand même (fallback)
        // Mais on log l'erreur pour que vous sachiez qu'il faut appliquer la migration
        console.warn(`⚠️ [EMAIL] Migration may not be applied. Please run: supabase/migrations/20251202_email_deduplication.sql`);
      } else if (canSend === false) {
        console.log(`🚫 [EMAIL] DUPLICATE BLOCKED: subject="${subject}" to="${to}" was sent recently, skipping`);
        return new Response(
          JSON.stringify({ 
            ok: true, 
            skipped: true, 
            reason: 'Duplicate email (sent recently)',
            timestamp: new Date().toISOString()
          }), 
          { status: 200, headers: corsHeaders }
        );
      } else {
        console.log(`✅ [EMAIL] Email approved for sending (no duplicate found in last 5 minutes)`);
      }
    }

    console.log(`📨 to:${to} | html:${!!htmlBody} | text:${textBody.length}`);

    // ---------- SMTP IONOS ----------
    // ✅ Vérification explicite des variables d'environnement
    const host = Deno.env.get('SMTP_HOST');
    const portStr = Deno.env.get('SMTP_PORT');
    const user = Deno.env.get('SMTP_USER');
    const pass = Deno.env.get('SMTP_PASSWORD');
    const from = Deno.env.get('SMTP_FROM');

    // Vérifier que toutes les variables sont définies
    const missingVars = [];
    if (!host) missingVars.push('SMTP_HOST');
    if (!portStr) missingVars.push('SMTP_PORT');
    if (!user) missingVars.push('SMTP_USER');
    if (!pass) missingVars.push('SMTP_PASSWORD');
    if (!from) missingVars.push('SMTP_FROM');

    if (missingVars.length > 0) {
      const errorMsg = `❌ Variables d'environnement SMTP manquantes: ${missingVars.join(', ')}. Veuillez les configurer dans Supabase Dashboard → Settings → Edge Functions → Secrets`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    const port = Number(portStr);
    if (isNaN(port) || port <= 0) {
      throw new Error(`SMTP_PORT invalide: ${portStr}. Doit être un nombre positif.`);
    }

    console.log(`✅ Configuration SMTP chargée: ${host}:${port} (user: ${user?.substring(0, 3)}...)`);

    const conn = await Deno.connectTls({ hostname: host, port });
    const dec = new TextDecoder();
    const enc = new TextEncoder();
    const cmd = (c: string, hide = false) => {
      console.log(`→ ${hide ? '***' : c}`);
      return conn.write(enc.encode(c + '\r\n'));
    };
    const rsp = async () => {
      const buf = new Uint8Array(4096);
      const n = await conn.read(buf);
      const r = dec.decode(buf.subarray(0, n!));
      console.log(`← ${r.trim()}`);
      return r;
    };

    await rsp();                       // greeting
    await cmd(`EHLO ${host}`); await rsp();
    await cmd('AUTH LOGIN'); await rsp();
    await cmd(btoa(user), true); await rsp();
    await cmd(btoa(pass), true); await rsp();
    await cmd(`MAIL FROM:<${user}>`); await rsp();
    await cmd(`RCPT TO:<${to}>`); await rsp();
    await cmd('DATA'); await rsp();

    // Corps complet
    const boundary = `----=_NextPart_${Date.now()}`;
    const content = htmlBody
      ? `From:${from}\r\nTo:${to}\r\nSubject:${subject}\r\nMIME-Version:1.0\r\nContent-Type:multipart/alternative; boundary="${boundary}"\r\n\r\n--${boundary}\r\nContent-Type:text/plain;charset=utf-8\r\n\r\n${textBody}\r\n--${boundary}\r\nContent-Type:text/html;charset=utf-8\r\n\r\n${htmlBody}\r\n--${boundary}--\r\n.\r\n`
      : `From:${from}\r\nTo:${to}\r\nSubject:${subject}\r\nContent-Type:text/plain;charset=utf-8\r\n\r\n${textBody}\r\n.\r\n`;

    await conn.write(enc.encode(content));
    await rsp(); // 250 OK
    await cmd('QUIT');
    conn.close();

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
  } catch (e) {
    console.error('❌', e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
});

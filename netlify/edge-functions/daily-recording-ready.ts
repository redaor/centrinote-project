import type { Context } from "@netlify/edge-functions";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// Vérification de la signature HMAC Daily.co
async function verifyDailyWebhookSignature(
  body: string,
  signature: string,
  timestamp: string,
  secret: string
): Promise<boolean> {
  try {
    // Daily.co utilise HMAC-SHA256
    // Format: sha256=<hash>
    const [algorithm, expectedHash] = signature.split('=');
    if (algorithm !== 'sha256') {
      console.error('[WEBHOOK] Invalid signature algorithm:', algorithm);
      return false;
    }

    // Créer le payload à signer: timestamp.body
    const payload = `${timestamp}.${body}`;

    // Encoder la clé secrète
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);

    // Importer la clé pour HMAC
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    // Calculer le HMAC
    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(payload)
    );

    // Convertir en hex
    const hashArray = Array.from(new Uint8Array(signatureBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Comparer les signatures
    const isValid = hashHex === expectedHash;

    if (!isValid) {
      console.error('[WEBHOOK] Signature mismatch');
      console.error('[WEBHOOK] Expected:', expectedHash);
      console.error('[WEBHOOK] Got:', hashHex);
    }

    return isValid;
  } catch (error) {
    console.error('[WEBHOOK] Error verifying signature:', error);
    return false;
  }
}

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);
  console.log('[WEBHOOK] Daily recording ready webhook called', {
    method: request.method,
    queryParams: Object.fromEntries(url.searchParams)
  });

  // 1. Daily envoie TOUJOURS POST (jamais GET)
  if (request.method !== 'POST') {
    console.warn('[WEBHOOK] Invalid method:', request.method);
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    // 2. Lire le body
    const bodyText = await request.text();

    // 3. ✅ VALIDATION DAILY.CO : body vide ou {} → retourner "OK" en text/plain
    if (!bodyText || bodyText.trim() === '' || bodyText === '{}') {
      console.log('[WEBHOOK] Daily.co validation request - returning 200 OK text/plain');
      return new Response('OK', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    // 4. Récupérer les en-têtes de signature Daily.co
    const signature = request.headers.get('Daily-Webhook-Signature');
    const timestamp = request.headers.get('Daily-Webhook-Timestamp');

    if (!signature || !timestamp) {
      console.error('[WEBHOOK] Missing signature headers');
      return new Response('Unauthorized', { status: 401 });
    }

    // 5. Vérifier la signature HMAC
    const dailyApiKey = Deno.env.get('DAILY_API_KEY');
    if (!dailyApiKey) {
      console.error('[WEBHOOK] DAILY_API_KEY not configured');
      return new Response('Server configuration error', { status: 500 });
    }

    const isValidSignature = await verifyDailyWebhookSignature(
      bodyText,
      signature,
      timestamp,
      dailyApiKey
    );

    if (!isValidSignature) {
      console.error('[WEBHOOK] Invalid signature');
      return new Response('Unauthorized', { status: 401 });
    }

    console.log('[WEBHOOK] Signature verified ✓');

    // 6. Parser le payload
    const payload = JSON.parse(bodyText);
    console.log('[WEBHOOK] Payload received:', JSON.stringify(payload, null, 2));

    // 7. Vérifier le type d'événement
    if (payload.type !== 'recording.ready-to-download') {
      console.log('[WEBHOOK] Ignoring event type:', payload.type);
      return new Response('OK', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    // 8. Extraire les données de l'événement
    const recordingId = payload.payload?.recording_id || payload.data?.recording_id;
    const roomName = payload.payload?.room_name || payload.data?.room_name;

    if (!recordingId || !roomName) {
      console.error('[WEBHOOK] Missing recording_id or room_name in payload');
      return new Response('Invalid payload', { status: 400 });
    }

    console.log('[WEBHOOK] Processing recording:', { recordingId, roomName });

    // 9. Appeler Daily.co API pour récupérer le download_url
    const accessLinkResponse = await fetch(
      `https://api.daily.co/v1/recordings/${recordingId}/access-link`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${dailyApiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!accessLinkResponse.ok) {
      const errorText = await accessLinkResponse.text();
      console.error('[WEBHOOK] Failed to get access link:', errorText);
      return new Response('Daily API error', { status: 502 });
    }

    const accessLinkData = await accessLinkResponse.json();
    const downloadUrl = accessLinkData.download_link || accessLinkData.download_url;
    const expiresAt = accessLinkData.expires;

    if (!downloadUrl) {
      console.error('[WEBHOOK] No download URL in access link response');
      return new Response('No download URL available', { status: 500 });
    }

    console.log('[WEBHOOK] Access link retrieved:', { downloadUrl, expiresAt });

    // 10. Mettre à jour Supabase avec recording_url et recording_id
    const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[WEBHOOK] Supabase credentials not configured');
      return new Response('Server configuration error', { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Mettre à jour le meeting avec recording_url et recording_ready_at
    const { data: updateData, error: updateError } = await supabase
      .from('meetings')
      .update({
        recording_id: recordingId,
        recording_url: downloadUrl,
        recording_ready_at: new Date().toISOString(),
      })
      .eq('room_name', roomName)
      .select('id')
      .single();

    if (updateError) {
      console.error('[WEBHOOK] Error updating meeting:', updateError);
      return new Response('Database error', { status: 500 });
    }

    if (!updateData) {
      console.error('[WEBHOOK] Meeting not found for room:', roomName);
      return new Response('Meeting not found', { status: 404 });
    }

    const meetingId = updateData.id;
    console.log('[WEBHOOK] Meeting updated successfully:', meetingId);

    // 11. Appeler generate-summary-auto server-side avec le vrai recording_url
    try {
      console.log('[WEBHOOK] Calling generate-summary-auto...');

      const summaryResponse = await fetch(
        `${context.site.url}/.netlify/functions/generate-summary-auto`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            meetingId,
            recordingUrl: downloadUrl,
            recordingId,
          }),
        }
      );

      const summaryResult = await summaryResponse.json();

      if (summaryResult.success) {
        console.log('[WEBHOOK] Summary generated successfully:', summaryResult.summaryId);
      } else {
        console.warn('[WEBHOOK] Summary generation failed:', summaryResult.error);
        // Ne pas échouer le webhook si le résumé échoue
      }
    } catch (summaryError) {
      console.error('[WEBHOOK] Error calling generate-summary-auto:', summaryError);
      // Ne pas échouer le webhook si le résumé échoue
    }

    // 12. ✅ Retourner OK en text/plain (Daily.co exige ce format)
    return new Response('OK', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });

  } catch (error) {
    console.error('[WEBHOOK] Unexpected error:', error);
    // Même en cas d'erreur, retourner 200 pour que Daily.co ne désactive pas le webhook
    return new Response('OK', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
};

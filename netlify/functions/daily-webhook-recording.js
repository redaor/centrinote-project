// 🎬 Webhook Daily.co pour traiter les enregistrements (SANS n8n)
const { createClient } = require('@supabase/supabase-js');
const { getBoss } = require('./lib/queue.cjs');
const crypto = require('crypto');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

// Clé secrète Daily.co pour vérifier la signature (à configurer dans Netlify)
const DAILY_WEBHOOK_SECRET = process.env.DAILY_WEBHOOK_SECRET;

/**
 * Vérifie la signature du webhook Daily.co
 */
function verifyWebhookSignature(payload, signature) {
  if (!DAILY_WEBHOOK_SECRET) {
    console.warn('⚠️ [DAILY-WEBHOOK] DAILY_WEBHOOK_SECRET non configuré, skip vérification');
    return true; // En dev, on peut skip
  }

  if (!signature) {
    console.warn('⚠️ [DAILY-WEBHOOK] Signature absente, skip vérification');
    return true; // Pas de signature = mode test
  }

  const hmac = crypto.createHmac('sha256', DAILY_WEBHOOK_SECRET);
  const digest = hmac.update(JSON.stringify(payload)).digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}

exports.handler = async (event, context) => {
  console.log('📥 [DAILY-WEBHOOK-RECORDING] Webhook reçu');

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const payload = JSON.parse(event.body);
    
    // Vérifier la signature
    const signature = event.headers['x-webhook-signature'] || event.headers['x-daily-signature'];
    if (!verifyWebhookSignature(payload, signature)) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Signature invalide' })
      };
    }

    // Vérifier que c'est un événement d'enregistrement
    // Daily.co utilise: recording.started, recording.stopped, recording.ready-to-download
    const validEvents = ['recording.completed', 'recording.started', 'recording.stopped', 'recording.ready-to-download'];
    if (!validEvents.includes(payload.type)) {
      console.log('ℹ️ [DAILY-WEBHOOK-RECORDING] Événement ignoré:', payload.type);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Événement ignoré' })
      };
    }

    // Vérifier que le room_name commence par "centrinote-"
    if (!payload.room_name || !payload.room_name.startsWith('centrinote-')) {
      console.log('⚠️ [DAILY-WEBHOOK-RECORDING] Room name invalide:', payload.room_name);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Room name invalide' })
      };
    }

    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Configuration Supabase manquante' })
      };
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Trouver la réunion
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select('*')
      .eq('room_name', payload.room_name)
      .single();

    if (meetingError || !meeting) {
      console.error('❌ [DAILY-WEBHOOK-RECORDING] Réunion non trouvée:', payload.room_name);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Réunion non trouvée' })
      };
    }

    // Si recording.completed ou recording.ready-to-download, mettre à jour l'URL et lancer le résumé IA
    if ((payload.type === 'recording.completed' || payload.type === 'recording.ready-to-download') && payload.recording) {
      const recording = payload.recording;
      
      // Extraire l'URL de téléchargement depuis le payload Daily.co
      const recordingUrl = recording.download_link || recording.url;
      
      if (!recordingUrl) {
        console.error('❌ [DAILY-WEBHOOK-RECORDING] download_link manquant dans le payload:', recording);
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'download_link manquant dans le payload' })
        };
      }

      console.log('📥 [DAILY-WEBHOOK-RECORDING] Enregistrement disponible:', {
        recordingId: recording.id,
        recordingUrl: recordingUrl.substring(0, 80) + '...',
        hasDownloadLink: !!recording.download_link,
        hasUrl: !!recording.url
      });

      // Mettre à jour la réunion avec l'URL d'enregistrement (SAUVER IMMÉDIATEMENT)
      const { error: updateError } = await supabase
        .from('meetings')
        .update({
          recording_url: recordingUrl,  // URL complète depuis download_link
          recording_id: recording.id,
          status: 'ended',
          ended_at: new Date().toISOString(),
        })
        .eq('id', meeting.id);

      if (updateError) {
        console.error('❌ [DAILY-WEBHOOK-RECORDING] Erreur mise à jour réunion:', updateError);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Erreur mise à jour réunion', details: updateError.message })
        };
      }

      console.log('✅ [DAILY-WEBHOOK-RECORDING] Réunion mise à jour avec recording_url');

      // Vérifier si le résumé IA est activé (invitation ai@centrinote.fr présente)
      const { data: iaInvite } = await supabase
        .from('meeting_invitations')
        .select('do_not_record')
        .eq('meeting_id', meeting.id)
        .eq('email', 'ai@centrinote.fr')
        .maybeSingle();

      // Si invitation IA existe ET do_not_record est false, générer le résumé
      if (iaInvite && !iaInvite.do_not_record) {
        console.log('🚀 [DAILY-WEBHOOK-RECORDING] Lancement génération résumé pour:', meeting.id);
        console.log('🔗 [DAILY-WEBHOOK-RECORDING] URL enregistrement:', recordingUrl.substring(0, 80) + '...');

        // Essayer d'abord pg-boss, puis fallback sur Netlify Function generate-summary
        try {
          const boss = await getBoss();
          const jobId = await boss.send('generateSummary', {
            meetingId: meeting.id,
            recordingUrl: recordingUrl
          });
          console.log('✅ [DAILY-WEBHOOK-RECORDING] Job pg-boss créé:', jobId);
        } catch (bossError) {
          console.error('❌ [DAILY-WEBHOOK-RECORDING] Erreur pg-boss:', bossError.message);
          console.log('🔄 [DAILY-WEBHOOK-RECORDING] Fallback: appel Netlify Function generate-summary');
          
          // Fallback : appeler la Netlify Function generate-summary (non bloquant)
          const netlifyUrl = process.env.NETLIFY_URL || process.env.DEPLOY_PRIME_URL || 'https://centrinote.fr';
          fetch(`${netlifyUrl}/.netlify/functions/generate-summary`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              meetingId: meeting.id,
              recordingUrl: recordingUrl
            })
          })
            .then(response => response.json())
            .then(result => {
              console.log('✅ [DAILY-WEBHOOK-RECORDING] Résumé généré via Netlify Function:', result);
            })
            .catch(err => {
              console.error('❌ [DAILY-WEBHOOK-RECORDING] Erreur génération via Netlify Function:', err);
            });
        }
      } else {
        console.log('ℹ️ [DAILY-WEBHOOK-RECORDING] Résumé IA non demandé pour cette réunion');
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        meetingId: meeting.id,
      })
    };

  } catch (error) {
    console.error('❌ [DAILY-WEBHOOK-RECORDING] Erreur:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Erreur interne',
        message: error.message
      })
    };
  }
};


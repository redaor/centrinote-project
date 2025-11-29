// 🤖 Fonction robuste pour générer un résumé automatiquement
// Récupère automatiquement l'URL depuis Daily.co et génère le résumé
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { getDownloadUrl } = require('./lib/dailyRecordings');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async (event, context) => {
  console.log('🤖 [GENERATE-SUMMARY-AUTO] Fonction appelée');

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
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const OPENAI_API_KEY = process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    const DAILY_API_KEY = process.env.DAILY_API_KEY || process.env.REACT_APP_DAILY_API_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Configuration Supabase manquante' })
      };
    }

    if (!OPENAI_API_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'OPENAI_API_KEY non configurée' })
      };
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

    // Récupérer meetingId, recordingId et recordingUrl depuis le body
    const body = JSON.parse(event.body || '{}');
    const meetingId = body.meetingId;
    const providedRecordingId = body.recordingId; // ID fourni depuis le client
    const forcedUrl = body.recordingUrl; // URL fournie manuellement

    if (!meetingId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'meetingId requis' })
      };
    }

    console.log('📊 [GENERATE-SUMMARY-AUTO] Traitement pour meeting:', meetingId);
    if (providedRecordingId) {
      console.log('📹 [GENERATE-SUMMARY-AUTO] Recording ID fourni:', providedRecordingId);
    }
    if (forcedUrl) {
      console.log('🔗 [GENERATE-SUMMARY-AUTO] URL fournie manuellement:', forcedUrl.substring(0, 80) + '...');
    }

    // 1. Récupérer la réunion
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select('*')
      .eq('id', meetingId)
      .single();

    if (meetingError || !meeting) {
      console.error('❌ [GENERATE-SUMMARY-AUTO] Réunion non trouvée:', meetingError?.message);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Meeting introuvable' })
      };
    }

    console.log('✅ [GENERATE-SUMMARY-AUTO] Réunion trouvée:', {
      title: meeting.title,
      room_name: meeting.room_name,
      recording_url: meeting.recording_url ? meeting.recording_url.substring(0, 50) + '...' : null,
      recording_id: meeting.recording_id
    });

    // 2. Priorité 1 : URL fournie manuellement
    let downloadUrl = forcedUrl;

    // 3. Priorité 2 : URL déjà en base
    if (!downloadUrl) {
      downloadUrl = meeting.recording_url;
      if (downloadUrl) {
        console.log('✅ [GENERATE-SUMMARY-AUTO] URL trouvée en base');
      }
    }

    // 4. Priorité 3 : Récupérer via Daily API avec recordingId fourni (PRIORITÉ HAUTE)
    // NOUVELLE MÉTHODE : Utilise l'endpoint /access-link qui retourne directement l'URL de téléchargement
    if (!downloadUrl && providedRecordingId && DAILY_API_KEY) {
      try {
        console.log('📡 [GENERATE-SUMMARY-AUTO] Récupération par recordingId fourni (access-link):', providedRecordingId);
        const { download_url } = await getDownloadUrl(providedRecordingId);
        downloadUrl = download_url;
        console.log('✅ [GENERATE-SUMMARY-AUTO] URL récupérée par recordingId fourni:', downloadUrl.substring(0, 80) + '...');

        // Sauvegarde immédiate
        await supabase
          .from('meetings')
          .update({
            recording_id: providedRecordingId,
            recording_url: downloadUrl
          })
          .eq('id', meetingId);
      } catch (e) {
        console.warn('⚠️ [GENERATE-SUMMARY-AUTO] Erreur API recordingId fourni:', e.message);
      }
    }

    // 5. Priorité 4 : Récupérer via Daily API (si recording_id en base)
    // NOUVELLE MÉTHODE : Utilise l'endpoint /access-link
    if (!downloadUrl && meeting.recording_id && DAILY_API_KEY) {
      try {
        console.log('📡 [GENERATE-SUMMARY-AUTO] Récupération par recording_id (access-link):', meeting.recording_id);
        const { download_url } = await getDownloadUrl(meeting.recording_id);
        downloadUrl = download_url;
        console.log('✅ [GENERATE-SUMMARY-AUTO] URL récupérée par recording_id:', downloadUrl.substring(0, 80) + '...');

        // Sauvegarde immédiate
        await supabase
          .from('meetings')
          .update({ recording_url: downloadUrl })
          .eq('id', meetingId);
      } catch (e) {
        console.warn('⚠️ [GENERATE-SUMMARY-AUTO] Erreur API recording_id:', e.message);
      }
    }

    // 6. Priorité 5 : Lister par room_name
    if (!downloadUrl && meeting.room_name && DAILY_API_KEY) {
      try {
        console.log('📡 [GENERATE-SUMMARY-AUTO] Recherche par room_name:', meeting.room_name);
        const res = await fetch(`https://api.daily.co/v1/recordings?room_name=${meeting.room_name}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${DAILY_API_KEY}`,
            'Content-Type': 'application/json'
          }
        });

        if (res.ok) {
          const list = await res.json();
          if (list.data && list.data.length > 0) {
            // Prendre le plus récent
            const latestRecording = list.data[0];
            downloadUrl = latestRecording.download_link || latestRecording.url;
            console.log('✅ [GENERATE-SUMMARY-AUTO] URL récupérée par room_name:', downloadUrl.substring(0, 80) + '...');
            
            // Sauvegarde immédiate
            await supabase
              .from('meetings')
              .update({
                recording_url: downloadUrl,
                recording_id: latestRecording.id
              })
              .eq('id', meetingId);
          } else {
            console.warn('⚠️ [GENERATE-SUMMARY-AUTO] Aucun enregistrement trouvé pour room_name');
          }
        } else {
          const errorText = await res.text().catch(() => '');
          console.warn('⚠️ [GENERATE-SUMMARY-AUTO] API room_name échoué:', res.status, errorText.substring(0, 200));
        }
      } catch (e) {
        console.warn('⚠️ [GENERATE-SUMMARY-AUTO] Erreur API room_name:', e.message);
      }
    }

    // Vérification finale
    if (!downloadUrl || !downloadUrl.startsWith('http')) {
      console.error('❌ [GENERATE-SUMMARY-AUTO] Aucune URL valide trouvée');
      return {
        statusCode: 422,
        headers,
        body: JSON.stringify({
          error: 'URL de téléchargement invalide',
          message: 'Vérifiez que l\'enregistrement existe et que DAILY_API_KEY est correcte.',
          details: `Aucune URL trouvée pour meeting ${meetingId}`,
          hint: DAILY_API_KEY ? 'L\'API Daily.co n\'a pas retourné d\'URL. Vérifiez que l\'enregistrement existe.' : 'DAILY_API_KEY non configurée dans Netlify. Configurez-la dans Site settings → Environment variables.'
        })
      };
    }

    console.log('📥 [GENERATE-SUMMARY-AUTO] Téléchargement depuis:', downloadUrl.substring(0, 80) + '...');

    // 6. Télécharger l'enregistrement
    const tmpDir = '/tmp';
    let fileExtension = 'webm';
    
    // Détecter le format depuis l'URL
    if (downloadUrl.includes('.mp4')) fileExtension = 'mp4';
    else if (downloadUrl.includes('.webm')) fileExtension = 'webm';
    else if (downloadUrl.includes('.m4a')) fileExtension = 'm4a';
    
    const audioPath = path.join(tmpDir, `recording-${meetingId}.${fileExtension}`);

    try {
      const res = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Centrinote/1.0',
          'Accept': '*/*'
        }
      });

      if (!res.ok) {
        throw new Error(`Erreur téléchargement: ${res.status} ${res.statusText}`);
      }

      const buffer = await res.arrayBuffer();
      const fileSize = buffer.byteLength;
      console.log('📦 [GENERATE-SUMMARY-AUTO] Taille fichier:', (fileSize / 1024 / 1024).toFixed(2), 'MB');

      if (fileSize === 0) {
        throw new Error('Fichier téléchargé vide');
      }

      // Vérifier que ce n'est pas une page HTML
      const firstBytesText = Buffer.from(buffer.slice(0, 200)).toString('utf-8');
      if (firstBytesText.trim().toLowerCase().startsWith('<!doctype') || 
          firstBytesText.trim().toLowerCase().startsWith('<html')) {
        throw new Error('URL de téléchargement invalide: Daily.co a retourné une page HTML au lieu d\'un fichier audio.');
      }

      await fs.writeFile(audioPath, Buffer.from(buffer));
      console.log('✅ [GENERATE-SUMMARY-AUTO] Fichier téléchargé:', audioPath);

      // 7. Transcrire avec Whisper
      console.log('🎤 [GENERATE-SUMMARY-AUTO] Début transcription...');
      const fileStream = fsSync.createReadStream(audioPath);
      
      const transcription = await openai.audio.transcriptions.create({
        file: fileStream,
        model: 'whisper-1',
        language: 'fr',
        response_format: 'text',
      });

      console.log('✅ [GENERATE-SUMMARY-AUTO] Transcription terminée, longueur:', transcription.length);

      // 8. Générer le résumé avec GPT
      console.log('🤖 [GENERATE-SUMMARY-AUTO] Génération résumé...');
      const prompt = `Résume en français clair et structuré. Retourne UNIQUEMENT du JSON valide :
{
  "title": "Titre du résumé",
  "key_points": ["point 1", "point 2", "point 3"],
  "decisions": [{"what": "décision", "who": "personne", "deadline": "date"}],
  "actions": [{"task": "action", "owner": "responsable", "due": "échéance"}]
}`;

      const gptResponse = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: `Transcription de la réunion "${meeting.title}":\n\n${transcription}` }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      });

      const summary = JSON.parse(gptResponse.choices[0].message.content);
      console.log('✅ [GENERATE-SUMMARY-AUTO] Résumé généré');

      // 9. Générer le markdown
      const markdown = `# ${summary.title || meeting.title}

## Points clés
${summary.key_points?.map((p) => `- ${p}`).join('\n') || 'Aucun point clé identifié'}

## Décisions
${summary.decisions?.map((d) => `- **${d.what}**${d.who ? ` (${d.who})` : ''}${d.deadline ? ` - ${d.deadline}` : ''}`).join('\n') || 'Aucune décision identifiée'}

## Actions
${summary.actions?.map((a) => `- [ ] **${a.task}**${a.owner ? ` – ${a.owner}` : ''}${a.due ? ` (échéance : ${a.due})` : ''}`).join('\n') || 'Aucune action identifiée'}

## Transcription complète
${transcription}
`;

      // 10. Sauvegarder dans Supabase
      const summaryData = {
        meeting_id: meetingId,
        raw_transcript: transcription,
        summary: summary,
        markdown: markdown,
        generated_at: new Date().toISOString(),
      };

      // Sauvegarder dans meeting_summaries (pour historique)
      const { data: savedSummary, error: saveError } = await supabase
        .from('meeting_summaries')
        .upsert(summaryData, { onConflict: 'meeting_id' })
        .select()
        .single();

      if (saveError) {
        console.error('⚠️ [GENERATE-SUMMARY-AUTO] Erreur sauvegarde meeting_summaries:', saveError);
        // Ne pas échouer si meeting_summaries échoue, on continue avec meetings
      } else {
        console.log('✅ [GENERATE-SUMMARY-AUTO] Résumé sauvegardé dans meeting_summaries');
      }

      // ✅ CRITIQUE: Mettre à jour meetings.ai_summary pour l'affichage dans l'UI
      const { error: updateError } = await supabase
        .from('meetings')
        .update({
          ai_summary: summary,
          transcript: JSON.stringify({
            text: transcription,
            transcribed_at: new Date().toISOString(),
            words_count: transcription.split(/\s+/).length,
            duration: meeting.duration_minutes || 0
          })
        })
        .eq('id', meetingId);

      if (updateError) {
        console.error('❌ [GENERATE-SUMMARY-AUTO] Erreur mise à jour meetings.ai_summary:', updateError);
        throw new Error(`Erreur mise à jour meetings.ai_summary: ${updateError.message}`);
      } else {
        console.log('✅ [GENERATE-SUMMARY-AUTO] meetings.ai_summary mis à jour avec succès');
      }

      // Nettoyer le fichier temporaire
      await fs.unlink(audioPath).catch(() => {});

      console.log('✅ [GENERATE-SUMMARY-AUTO] Résumé sauvegardé avec succès');

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          meetingId,
          summaryId: savedSummary.id,
          summary,
          markdown
        })
      };

    } catch (error) {
      console.error('❌ [GENERATE-SUMMARY-AUTO] Erreur:', error);
      
      // Nettoyer le fichier temporaire en cas d'erreur
      await fs.unlink(audioPath).catch(() => {});

      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Erreur génération résumé',
          message: error.message,
          details: error.stack
        })
      };
    }

  } catch (error) {
    console.error('❌ [GENERATE-SUMMARY-AUTO] Erreur interne:', error);
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

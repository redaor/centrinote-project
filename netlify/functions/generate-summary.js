// 🤖 Fonction Netlify pour générer un résumé de réunion (alternative à pg-boss)
// Cette fonction peut être appelée directement ou via webhook
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');
const fs = require('fs').promises;
const fsSync = require('fs'); // Pour createReadStream
const path = require('path');
// fetch est disponible nativement dans Netlify Functions (Node.js 18+)

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async (event, context) => {
  console.log('🤖 [GENERATE-SUMMARY] Fonction appelée');

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const OPENAI_API_KEY = process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;

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

    // Récupérer meetingId depuis le body ou les query params
    let meetingId, recordingUrl;
    
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      meetingId = body.meetingId;
      recordingUrl = body.recordingUrl;
    } else if (event.httpMethod === 'GET') {
      meetingId = event.queryStringParameters?.meetingId;
      recordingUrl = event.queryStringParameters?.recordingUrl;
    }

    if (!meetingId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'meetingId requis' })
      };
    }

    console.log('📊 [GENERATE-SUMMARY] Traitement pour meeting:', meetingId);

    // Récupérer la réunion
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select('*')
      .eq('id', meetingId)
      .single();

    if (meetingError || !meeting) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Réunion non trouvée' })
      };
    }

    // Vérifier si un résumé existe déjà
    const { data: existingSummary } = await supabase
      .from('meeting_summaries')
      .select('*')
      .eq('meeting_id', meetingId)
      .maybeSingle();

    if (existingSummary && existingSummary.raw_transcript) {
      console.log('⚠️ [GENERATE-SUMMARY] Résumé existe déjà');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Résumé existe déjà',
          summaryId: existingSummary.id
        })
      };
    }

    // Utiliser recordingUrl passé en paramètre ou celui de la réunion
    // Normalement, le webhook a déjà mis à jour recording_url avec download_link
    let audioUrl = recordingUrl || meeting.recording_url;
    if (!audioUrl) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Aucun enregistrement disponible' })
      };
    }

    console.log('🔍 [GENERATE-SUMMARY] Diagnostic:', {
      audioUrl: audioUrl.substring(0, 80) + '...',
      isUrl: audioUrl.startsWith('http'),
      source: recordingUrl ? 'paramètre' : 'meeting.recording_url',
      hasRecordingUrl: !!recordingUrl,
      hasMeetingRecordingUrl: !!meeting.recording_url,
      isRoomUrl: audioUrl.includes('centrinote.daily.co/centrinote-') && !audioUrl.includes('recordings') && !audioUrl.includes('cdn.daily.co')
    });

    // Si audioUrl est une URL de room (pas une URL de téléchargement), récupérer l'URL via l'API Daily.co
    const DAILY_API_KEY = process.env.DAILY_API_KEY || process.env.REACT_APP_DAILY_API_KEY;
    const isRoomUrl = audioUrl.includes('centrinote.daily.co/centrinote-') && !audioUrl.includes('recordings') && !audioUrl.includes('cdn.daily.co');
    
    // Si c'est une URL de room, essayer de récupérer l'URL de téléchargement automatiquement
    if (isRoomUrl) {
      if (!DAILY_API_KEY) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'DAILY_API_KEY manquante',
            message: `L'URL fournie est une URL de room Daily.co. Pour récupérer automatiquement l'URL de téléchargement, DAILY_API_KEY doit être configurée dans Netlify.`,
            hint: 'Configurez DAILY_API_KEY dans Netlify Dashboard → Site settings → Environment variables, ou fournissez directement l\'URL de téléchargement depuis Daily.co Dashboard → Recordings'
          })
        };
      }
      
      // Récupérer l'URL de téléchargement via l'API Daily.co
      console.log('🔄 [GENERATE-SUMMARY] URL de room détectée, récupération automatique de download_link...');
    }
    
    if (DAILY_API_KEY && (isRoomUrl || (!audioUrl.startsWith('http') && meeting.recording_id))) {
      // URL de room ou ID : récupérer les détails via l'API Daily.co
      try {
        const recordingId = isRoomUrl ? meeting.recording_id : audioUrl;
        
        if (!recordingId) {
          // Si c'est une URL de room mais pas d'ID, chercher par room_name
          console.log('📡 [GENERATE-SUMMARY] Recherche enregistrement par room_name:', meeting.room_name);
          const roomName = meeting.room_name;
          
          const recordingsResponse = await fetch(`https://api.daily.co/v1/recordings?room_name=${roomName}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${DAILY_API_KEY}`,
              'Content-Type': 'application/json'
            }
          });

          if (recordingsResponse.ok) {
            const recordingsData = await recordingsResponse.json();
            if (recordingsData.data && recordingsData.data.length > 0) {
              // Prendre le plus récent
              const latestRecording = recordingsData.data[0];
              audioUrl = latestRecording.download_link || latestRecording.url;
              console.log('✅ [GENERATE-SUMMARY] URL récupérée via room_name:', audioUrl.substring(0, 80) + '...');
            } else {
              throw new Error('Aucun enregistrement trouvé pour cette room');
            }
          } else {
            throw new Error(`Erreur API Daily.co: ${recordingsResponse.status}`);
          }
        } else {
          // Utiliser l'ID pour récupérer l'URL
          console.log('📡 [GENERATE-SUMMARY] Récupération détails enregistrement via API Daily.co');
          console.log('📋 [GENERATE-SUMMARY] Recording ID:', recordingId);
        
          // S'assurer que l'URL est absolue
          const apiUrl = `https://api.daily.co/v1/recordings/${recordingId}`;
        console.log('🔗 [GENERATE-SUMMARY] URL API:', apiUrl);
        console.log('🔑 [GENERATE-SUMMARY] API Key présente:', !!DAILY_API_KEY);
        
        const recordingResponse = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${DAILY_API_KEY}`,
            'Content-Type': 'application/json'
          }
        });

        console.log('📡 [GENERATE-SUMMARY] Réponse API:', {
          status: recordingResponse.status,
          statusText: recordingResponse.statusText,
          ok: recordingResponse.ok
        });

        if (recordingResponse.ok) {
          const recordingData = await recordingResponse.json();
          console.log('📊 [GENERATE-SUMMARY] Données API reçues:', {
            hasDownloadLink: !!recordingData.download_link,
            hasUrl: !!recordingData.url,
            downloadLink: recordingData.download_link ? recordingData.download_link.substring(0, 50) + '...' : 'N/A',
            url: recordingData.url ? recordingData.url.substring(0, 50) + '...' : 'N/A'
          });
          
          const downloadUrl = recordingData.download_link || recordingData.url;
          
          if (downloadUrl && downloadUrl.startsWith('http')) {
            audioUrl = downloadUrl;
            console.log('✅ [GENERATE-SUMMARY] URL récupérée avec succès:', audioUrl.substring(0, 80) + '...');
          } else {
            console.error('❌ [GENERATE-SUMMARY] download_link invalide ou manquant:', {
              downloadLink: recordingData.download_link,
              url: recordingData.url,
              recordingData: JSON.stringify(recordingData).substring(0, 200)
            });
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({
                error: 'URL de téléchargement introuvable',
                message: `L'API Daily.co n'a pas retourné d'URL de téléchargement valide pour l'enregistrement ${audioUrl}`,
                details: `Réponse API: ${JSON.stringify(recordingData).substring(0, 200)}`
              })
            };
          }
        } else {
          const errorText = await recordingResponse.text();
          console.error('❌ [GENERATE-SUMMARY] Erreur API Daily.co:', {
            status: recordingResponse.status,
            statusText: recordingResponse.statusText,
            error: errorText
          });
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              error: 'Erreur API Daily.co',
              message: `Impossible de récupérer les détails de l'enregistrement: ${recordingResponse.status} ${recordingResponse.statusText}`,
              details: errorText.substring(0, 200)
            })
          };
        }
      } catch (apiError) {
        console.error('❌ [GENERATE-SUMMARY] Erreur récupération API:', {
          message: apiError.message,
          stack: apiError.stack,
          name: apiError.name
        });
        // Si l'API échoue, on ne peut pas continuer avec juste l'ID
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'Impossible de récupérer l\'URL de l\'enregistrement',
            message: `Erreur lors de l'appel à l'API Daily.co: ${apiError.message}`,
            hint: 'Vérifiez que DAILY_API_KEY est correctement configurée dans Netlify',
            details: apiError.message
          })
        };
      }
    }
    
    // Vérifier une dernière fois que l'URL est valide avant de continuer
    if (!audioUrl.startsWith('http://') && !audioUrl.startsWith('https://')) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'URL invalide',
          message: `L'URL fournie (${audioUrl}) n'est pas valide. Elle doit commencer par http:// ou https://`,
          hint: 'Fournissez une URL complète depuis Daily.co Dashboard ou utilisez l\'ID avec DAILY_API_KEY configurée'
        })
      };
    }

    // Télécharger l'enregistrement
    console.log('📥 [GENERATE-SUMMARY] Téléchargement:', audioUrl);
    const tmpDir = '/tmp';
    const audioPath = path.join(tmpDir, `recording-${meetingId}.webm`);

    try {
      // S'assurer que l'URL est absolue
      if (!audioUrl.startsWith('http://') && !audioUrl.startsWith('https://')) {
        throw new Error(`URL invalide (doit être absolue): ${audioUrl}`);
      }
      
      // Si c'est encore une URL de room après la récupération automatique, c'est qu'on n'a pas pu récupérer l'URL
      // (DAILY_API_KEY manquante ou enregistrement introuvable)
      if (audioUrl.includes('centrinote.daily.co/centrinote-') && !audioUrl.includes('recordings') && !audioUrl.includes('cdn.daily.co')) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'URL de room détectée',
            message: `L'URL fournie est une URL de room Daily.co, pas une URL de téléchargement. Le système a tenté de récupérer automatiquement l'URL de téléchargement mais a échoué.`,
            hint: 'Vérifiez que DAILY_API_KEY est configurée dans Netlify, ou fournissez directement l\'URL de téléchargement depuis Daily.co Dashboard → Recordings',
            details: 'Si DAILY_API_KEY est configurée, vérifiez les logs pour voir pourquoi la récupération automatique a échoué.'
          })
        };
      }
      
      console.log('📥 [GENERATE-SUMMARY] Téléchargement depuis:', audioUrl);
      const res = await fetch(audioUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Centrinote/1.0'
        }
      });
      
      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        throw new Error(`Erreur téléchargement: ${res.status} - ${errorText.substring(0, 100)}`);
      }
      
      const buffer = await res.arrayBuffer();
      await fs.writeFile(audioPath, Buffer.from(buffer));
      console.log('✅ [GENERATE-SUMMARY] Fichier téléchargé:', audioPath);

      // Transcription
      console.log('🎤 [GENERATE-SUMMARY] Début transcription...');
      const fileStream = fsSync.createReadStream(audioPath);
      const transcription = await openai.audio.transcriptions.create({
        file: fileStream,
        model: 'whisper-1',
        language: 'fr',
        response_format: 'text',
      });
      const transcript = transcription;
      console.log('✅ [GENERATE-SUMMARY] Transcription terminée:', transcript.length, 'caractères');

      // Générer le résumé
      console.log('🤖 [GENERATE-SUMMARY] Génération résumé...');
      const prompt = `You are a meeting assistant. Analyze the following French meeting transcript and generate a structured summary.

Transcript:
${transcript}

Language: French
Output valid JSON only (no markdown, no code blocks):
{
  "title": "Résumé en 1 phrase",
  "key_points": ["point 1", "point 2", "point 3"],
  "decisions": [{"what": "décision prise", "who": "personne responsable", "deadline": "YYYY-MM-DD"}],
  "actions": [{"task": "action à faire", "owner": "responsable", "due": "YYYY-MM-DD"}]
}`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a professional meeting assistant. Always respond with valid JSON only, no markdown, no explanations.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });

      const summaryText = completion.choices[0].message.content;
      let summary;
      
      try {
        summary = JSON.parse(summaryText);
      } catch (e) {
        const jsonMatch = summaryText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          summary = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Impossible de parser le résumé JSON');
        }
      }

      console.log('✅ [GENERATE-SUMMARY] Résumé généré');

      // Générer le markdown
      let md = `# Résumé de réunion: ${meeting.title}\n\n`;
      
      if (summary.title) {
        md += `**${summary.title}**\n\n`;
      }

      if (summary.key_points && summary.key_points.length > 0) {
        md += `## Points clés\n\n`;
        summary.key_points.forEach(point => {
          md += `- ${point}\n`;
        });
        md += `\n`;
      }

      if (summary.decisions && summary.decisions.length > 0) {
        md += `## Décisions\n\n`;
        summary.decisions.forEach(decision => {
          md += `- **${decision.what}**`;
          if (decision.who) md += ` (${decision.who})`;
          if (decision.deadline) md += ` - Échéance: ${decision.deadline}`;
          md += `\n`;
        });
        md += `\n`;
      }

      if (summary.actions && summary.actions.length > 0) {
        md += `## Actions\n\n`;
        summary.actions.forEach(action => {
          md += `- [ ] **${action.task}**`;
          if (action.owner) md += ` (@${action.owner})`;
          if (action.due) md += ` - ${action.due}`;
          md += `\n`;
        });
        md += `\n`;
      }

      // Sauvegarder dans Supabase
      const summaryData = {
        meeting_id: meetingId,
        raw_transcript: transcript,
        summary: summary,
        markdown: md,
        generated_at: new Date().toISOString(),
      };

      const { data: savedSummary, error: saveError } = await supabase
        .from('meeting_summaries')
        .upsert(summaryData, { onConflict: 'meeting_id' })
        .select()
        .single();

      if (saveError) {
        throw new Error(`Erreur sauvegarde résumé: ${saveError.message}`);
      }

      console.log('✅ [GENERATE-SUMMARY] Résumé sauvegardé:', savedSummary.id);

      // Nettoyer le fichier temporaire
      await fs.unlink(audioPath).catch(() => {});

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          summaryId: savedSummary.id,
          message: 'Résumé généré avec succès'
        })
      };

    } catch (error) {
      // Nettoyer le fichier temporaire en cas d'erreur
      await fs.unlink(audioPath).catch(() => {});
      throw error;
    }

  } catch (error) {
    console.error('❌ [GENERATE-SUMMARY] Erreur:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Erreur génération résumé',
        message: error.message
      })
    };
  }
};


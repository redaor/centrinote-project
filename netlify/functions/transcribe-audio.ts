/**
 * 🎤 Fonction Netlify pour transcription automatique des enregistrements
 *
 * SOLUTION DEEPGRAM (2h d'audio en 1 appel):
 * 1. Récupère l'URL de l'enregistrement Daily.co (déjà fait)
 * 2. Envoie l'URL directement à Deepgram (pas de téléchargement local)
 * 3. Deepgram transcrit directement depuis l'URL (modèle nova-2)
 * 4. Génère un résumé IA avec GPT-4
 * 5. Stocke tout dans Supabase
 *
 * Note: Deepgram supporte jusqu'à 2h d'audio sans limite de taille fichier
 *
 * Endpoint: /.netlify/functions/transcribe-audio
 * Method: POST
 * Body: { meetingId: "uuid", audioUrl: "https://..." }
 */

import { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

interface DeepgramResponse {
  request_id: string;
  metadata: {
    transaction_key: string;
    request_id: string;
    sha256: string;
    created: string;
    duration: number;
    channels: number;
  };
  results: {
    channels: Array<{
      alternatives: Array<{
        transcript: string;
        confidence: number;
        words?: Array<{
          word: string;
          start: number;
          end: number;
          confidence: number;
          speaker?: number;
        }>;
      }>;
    }>;
  };
}

export const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
) => {
  console.log('🎤 [TRANSCRIBE] Fonction appelée');

  // CORS preflight
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
    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { meetingId, audioUrl } = body;

    if (!meetingId || !audioUrl) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing required fields: meetingId and audioUrl'
        })
      };
    }

    console.log(`🎤 [TRANSCRIBE] Meeting ID: ${meetingId}`);
    console.log(`🎤 [TRANSCRIBE] Audio URL: ${audioUrl.substring(0, 50)}...`);

    // Vérifier les variables d'environnement
    const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!DEEPGRAM_API_KEY) {
      console.error('❌ [TRANSCRIBE] DEEPGRAM_API_KEY manquante');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Deepgram API key not configured' })
      };
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      console.error('❌ [TRANSCRIBE] Configuration Supabase manquante');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Supabase configuration missing' })
      };
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // 1. Transcription directe avec Deepgram (pas de téléchargement)
    console.log('🔊 [TRANSCRIBE] Transcription avec Deepgram...');
    console.log('📡 [TRANSCRIBE] Envoi URL à Deepgram (modèle nova-2)...');

    // 🔍 DEBUG: Vérifier la clé Deepgram
    console.log('🔑 [DEBUG] Deepgram key length:', DEEPGRAM_API_KEY?.length);
    console.log('🔑 [DEBUG] Deepgram key start:', DEEPGRAM_API_KEY?.slice(0, 10) + '...');
    console.log('🔑 [DEBUG] Deepgram key end:', '...' + DEEPGRAM_API_KEY?.slice(-10));

    const deepgramResponse = await fetch(
      'https://api.deepgram.com/v1/listen?model=nova-2&language=fr&punctuate=true&diarize=true',
      {
        method: 'POST',
        headers: {
          'Authorization': `Token ${DEEPGRAM_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: audioUrl
        })
      }
    );

    if (!deepgramResponse.ok) {
      const errorText = await deepgramResponse.text();
      console.error(`❌ [TRANSCRIBE] Erreur Deepgram (${deepgramResponse.status}):`, errorText);
      throw new Error(`Deepgram API error: ${deepgramResponse.status} - ${errorText}`);
    }

    const deepgramData: DeepgramResponse = await deepgramResponse.json();

    // Extraire la transcription complète
    const fullTranscript = deepgramData.results.channels[0]?.alternatives[0]?.transcript || '';
    const confidence = deepgramData.results.channels[0]?.alternatives[0]?.confidence || 0;
    const words = deepgramData.results.channels[0]?.alternatives[0]?.words || [];
    const duration = deepgramData.metadata?.duration || 0;

    console.log(`✅ [TRANSCRIBE] Transcription réussie: ${fullTranscript.substring(0, 100)}...`);
    console.log(`📊 [TRANSCRIBE] Confiance: ${(confidence * 100).toFixed(1)}%`);
    console.log(`📊 [TRANSCRIBE] Mots: ${words.length}`);
    console.log(`⏱️ [TRANSCRIBE] Durée: ${duration}s`);

    // 2. Sauvegarder la transcription dans Supabase
    console.log('💾 [TRANSCRIBE] Sauvegarde dans Supabase...');

    const transcript = {
      text: fullTranscript,
      words: words,
      confidence: confidence,
      duration: duration,
      language: 'fr',
      transcribed_at: new Date().toISOString(),
      provider: 'deepgram',
      model: 'nova-2'
    };

    const { error: transcriptError } = await supabase
      .from('meetings')
      .update({ transcript })
      .eq('id', meetingId);

    if (transcriptError) {
      console.error('❌ [TRANSCRIBE] Erreur sauvegarde transcript:', transcriptError);
      throw transcriptError;
    }

    console.log('✅ [TRANSCRIBE] Transcript sauvegardé');

    // 3. Générer un résumé IA avec GPT-4 (optionnel, garde OpenAI pour le résumé)
    console.log('🤖 [TRANSCRIBE] Génération du résumé IA...');

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    if (!OPENAI_API_KEY) {
      console.warn('⚠️ [TRANSCRIBE] OPENAI_API_KEY manquante - résumé IA désactivé');

      // Retour sans résumé IA
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          meetingId,
          transcript: {
            text: fullTranscript.substring(0, 200) + '...',
            words_count: words.length,
            duration: duration,
            confidence: confidence
          },
          ai_summary: null
        })
      };
    }

    const summaryPrompt = `Tu es un assistant qui résume des réunions professionnelles.

Voici la transcription complète d'une réunion (durée: ${Math.round(duration / 60)} minutes) :

${fullTranscript}

Génère un résumé structuré avec :
1. **Sujets principaux** (3-5 points clés)
2. **Décisions prises**
3. **Actions à suivre** (qui fait quoi)
4. **Points à clarifier**

Format JSON :
{
  "summary": "résumé en 2-3 phrases",
  "key_points": ["point 1", "point 2", ...],
  "decisions": ["décision 1", ...],
  "action_items": [{"task": "...", "assignee": "..."}],
  "questions": ["question 1", ...]
}`;

    try {
      const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'Tu es un assistant qui résume des réunions. Réponds toujours en JSON valide.' },
            { role: 'user', content: summaryPrompt }
          ],
          temperature: 0.3,
          response_format: { type: 'json_object' }
        })
      });

      if (!gptResponse.ok) {
        throw new Error(`OpenAI API error: ${gptResponse.status}`);
      }

      const gptData = await gptResponse.json();
      const aiSummary = JSON.parse(gptData.choices[0].message.content || '{}');

      console.log('✅ [TRANSCRIBE] Résumé IA généré');

      // Sauvegarder le résumé IA
      const { error: summaryError } = await supabase
        .from('meetings')
        .update({ ai_summary: aiSummary })
        .eq('id', meetingId);

      if (summaryError) {
        console.error('⚠️ [TRANSCRIBE] Erreur sauvegarde résumé (non bloquant):', summaryError);
      } else {
        console.log('✅ [TRANSCRIBE] Résumé IA sauvegardé');
      }

      // Retourner tout
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          meetingId,
          transcript: {
            text: fullTranscript.substring(0, 200) + '...',
            words_count: words.length,
            duration: duration,
            confidence: confidence
          },
          ai_summary: aiSummary
        })
      };
    } catch (gptError) {
      console.error('⚠️ [TRANSCRIBE] Erreur GPT (non bloquant):', gptError);

      // Retour sans résumé IA si erreur
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          meetingId,
          transcript: {
            text: fullTranscript.substring(0, 200) + '...',
            words_count: words.length,
            duration: duration,
            confidence: confidence
          },
          ai_summary: null
        })
      };
    }

  } catch (error) {
    console.error('❌ [TRANSCRIBE] Erreur:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Transcription failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};

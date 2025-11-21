/**
 * 💾 Fonction pour sauvegarder le recording_id en base de données
 *
 * Appelée automatiquement quand Daily.co déclenche l'événement 'recording-started'
 * Sauvegarde le recording_id immédiatement pour pouvoir le réutiliser plus tard
 */

const { createClient } = require('@supabase/supabase-js');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async (event, context) => {
  console.log('💾 [UPDATE-RECORDING] Fonction appelée');

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

    const body = JSON.parse(event.body || '{}');
    const { meetingId, recordingId } = body;

    if (!meetingId || !recordingId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'meetingId et recordingId requis',
          received: { meetingId, recordingId }
        })
      };
    }

    console.log(`💾 [UPDATE-RECORDING] Sauvegarde recording_id pour meeting ${meetingId}:`, recordingId);

    // Mettre à jour la réunion avec le recording_id
    const { data, error } = await supabase
      .from('meetings')
      .update({
        recording_id: recordingId,
        updated_at: new Date().toISOString()
      })
      .eq('id', meetingId)
      .select();

    if (error) {
      console.error('❌ [UPDATE-RECORDING] Erreur mise à jour:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Erreur mise à jour base de données',
          details: error.message
        })
      };
    }

    if (!data || data.length === 0) {
      console.warn('⚠️ [UPDATE-RECORDING] Meeting non trouvé:', meetingId);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          error: 'Meeting non trouvé',
          meetingId
        })
      };
    }

    console.log('✅ [UPDATE-RECORDING] Recording ID sauvegardé avec succès');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        meetingId,
        recordingId,
        meeting: data[0]
      })
    };

  } catch (error) {
    console.error('❌ [UPDATE-RECORDING] Erreur:', error);
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

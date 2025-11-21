// 🏁 Fonction Netlify pour marquer une réunion comme terminée
const { createClient } = require('@supabase/supabase-js');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async (event, context) => {
  console.log('🏁 [END-MEETING] Requête reçue');

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
    const { meetingId } = JSON.parse(event.body);

    if (!meetingId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'meetingId requis' })
      };
    }

    // Mettre à jour la réunion
    const { data: updatedMeeting, error: updateError } = await supabase
      .from('meetings')
      .update({
        status: 'ended',
        ended_at: new Date().toISOString(),
      })
      .eq('id', meetingId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ [END-MEETING] Erreur mise à jour:', updateError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: updateError.message })
      };
    }

    console.log('✅ [END-MEETING] Réunion marquée comme terminée:', meetingId);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        meeting: updatedMeeting,
      })
    };

  } catch (error) {
    console.error('❌ [END-MEETING] Erreur:', error);
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


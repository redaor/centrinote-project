// 🔍 Fonction de diagnostic pour les réunions Daily.co
const { createClient } = require('@supabase/supabase-js');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { id } = event.queryStringParameters || {};
    
    // Configuration
    const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const DAILY_API_KEY = process.env.DAILY_API_KEY;

    console.log('🔍 [DEBUG] Diagnostic démarré pour:', id);

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Configuration Supabase manquante',
          config: {
            hasSupabaseUrl: !!SUPABASE_URL,
            hasSupabaseKey: !!SUPABASE_SERVICE_KEY
          }
        })
      };
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Récupérer la réunion
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select('*')
      .eq('id', id)
      .single();

    const diagnostic = {
      timestamp: new Date().toISOString(),
      meetingId: id,
      supabase: {
        found: !!meeting,
        error: meetingError?.message || null,
        meeting: meeting || null
      },
      daily: {
        hasApiKey: !!DAILY_API_KEY
      }
    };

    // Vérifier la salle Daily.co si on a la clé API
    if (DAILY_API_KEY && meeting?.room_name) {
      try {
        const response = await fetch(`https://api.daily.co/v1/rooms/${meeting.room_name}`, {
          headers: { 'Authorization': `Bearer ${DAILY_API_KEY}` }
        });
        
        if (response.ok) {
          const roomData = await response.json();
          diagnostic.daily.room = {
            exists: true,
            data: roomData
          };
        } else {
          diagnostic.daily.room = {
            exists: false,
            status: response.status,
            error: await response.text()
          };
        }
      } catch (dailyError) {
        diagnostic.daily.room = {
          exists: false,
          error: dailyError.message
        };
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(diagnostic)
    };

  } catch (error) {
    console.error('❌ [DEBUG] Erreur:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Erreur diagnostic',
        message: error.message
      })
    };
  }
};
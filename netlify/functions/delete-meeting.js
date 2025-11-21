// 🗑️ Fonction Netlify pour supprimer une réunion Daily.co + entrée Supabase
const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Configuration Daily.co - Variables configurées sur Netlify Dashboard
const DAILY_API_KEY = process.env.DAILY_API_KEY;
const DAILY_BASE_URL = 'https://api.daily.co/v1';

exports.handler = async (event, context) => {
  // Configuration CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Gérer les requêtes OPTIONS (preflight)
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Seules les requêtes DELETE sont autorisées
  if (event.httpMethod !== 'DELETE') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    // Parser les données
    const { meetingId } = JSON.parse(event.body);

    console.log('🗑️ [DELETE-MEETING] Suppression réunion:', meetingId);

    if (!meetingId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'ID de réunion manquant' })
      };
    }

    if (!DAILY_API_KEY) {
      console.error('❌ DAILY_API_KEY non configurée');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Configuration Daily.co manquante' })
      };
    }

    // Récupérer les infos de la réunion depuis Supabase
    const { data: meeting, error: fetchError } = await supabase
      .from('meetings')
      .select('room_name, room_url, title, status')
      .eq('id', meetingId)
      .single();

    if (fetchError) {
      console.error('❌ [DELETE-MEETING] Erreur récupération:', fetchError);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Réunion non trouvée' })
      };
    }

    if (!meeting) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Réunion non trouvée' })
      };
    }

    console.log('📊 [DELETE-MEETING] Réunion trouvée:', {
      title: meeting.title,
      room_name: meeting.room_name,
      status: meeting.status
    });

    // Supprimer la salle Daily.co (si elle existe encore)
    try {
      const dailyResponse = await fetch(`${DAILY_BASE_URL}/rooms/${meeting.room_name}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${DAILY_API_KEY}`
        }
      });

      if (dailyResponse.ok) {
        console.log('✅ [DELETE-MEETING] Salle Daily.co supprimée:', meeting.room_name);
      } else {
        // La salle n'existe peut-être plus (expirée ou déjà supprimée)
        console.warn('⚠️ [DELETE-MEETING] Salle Daily.co déjà supprimée ou expirée:', meeting.room_name);
      }
    } catch (dailyError) {
      console.error('❌ [DELETE-MEETING] Erreur suppression Daily.co:', dailyError);
      // On continue même si la suppression Daily.co échoue
    }

    // Supprimer l'entrée Supabase
    const { error: deleteError } = await supabase
      .from('meetings')
      .delete()
      .eq('id', meetingId);

    if (deleteError) {
      console.error('❌ [DELETE-MEETING] Erreur suppression Supabase:', deleteError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: `Erreur suppression base de données: ${deleteError.message}` 
        })
      };
    }

    console.log('✅ [DELETE-MEETING] Réunion supprimée avec succès:', meetingId);

    // Réponse de succès
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Réunion supprimée avec succès'
      })
    };

  } catch (error) {
    console.error('❌ [DELETE-MEETING] Erreur générale:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: error.message || 'Erreur interne du serveur' 
      })
    };
  }
};
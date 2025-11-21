// 🎥 Fonction Netlify pour créer une réunion Daily.co + entrée Supabase
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
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Gérer les requêtes OPTIONS (preflight)
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Seules les requêtes POST sont autorisées
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    // Parser les données du formulaire
    const { 
      title, 
      description, 
      scheduled_at, 
      duration_minutes = 60, 
      participants = [],
      created_by 
    } = JSON.parse(event.body);

    console.log('📝 [CREATE-MEETING] Données reçues:', {
      title,
      description,
      scheduled_at,
      duration_minutes,
      participants: participants.length,
      created_by
    });

    // Validation
    if (!title || !title.trim()) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Le titre de la réunion est obligatoire' })
      };
    }

    if (!created_by) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Utilisateur non identifié' })
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

    // Générer un nom de salle unique
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    const roomName = `centrinote-${timestamp}-${random}`;

    console.log('🏠 [CREATE-MEETING] Création salle Daily.co:', roomName);

    // Créer la salle Daily.co
    const dailyResponse = await fetch(`${DAILY_BASE_URL}/rooms`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DAILY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: roomName,
        privacy: 'private',
        properties: {
          enable_recording: 'cloud',
          enable_chat: true,
          enable_screenshare: true,
          enable_knocking: false,
          lang: 'fr',
          max_participants: 10,
          // Webhooks vers n8n - Variables configurées sur Netlify Dashboard
          meeting_join_hook: process.env.REACT_APP_N8N_EVENTS_WEBHOOK,
          recording_started_webhook: process.env.REACT_APP_N8N_RECORDING_WEBHOOK,
          // Expiration dans 24h par défaut
          exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
        }
      })
    });

    if (!dailyResponse.ok) {
      const dailyError = await dailyResponse.text();
      console.error('❌ [CREATE-MEETING] Erreur Daily.co:', dailyError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: `Erreur Daily.co: ${dailyResponse.status} - ${dailyError}` 
        })
      };
    }

    const dailyRoom = await dailyResponse.json();
    console.log('✅ [CREATE-MEETING] Salle Daily.co créée:', dailyRoom.name);

    // Sauvegarder dans Supabase
    const { data: meeting, error: supabaseError } = await supabase
      .from('meetings')
      .insert({
        room_name: dailyRoom.name,
        room_url: dailyRoom.url,
        title: title.trim(),
        description: description?.trim() || null,
        scheduled_at: scheduled_at || null,
        duration_minutes: parseInt(duration_minutes),
        participants: participants.filter(p => p && p.trim()),
        status: 'scheduled',
        created_by: created_by
      })
      .select()
      .single();

    if (supabaseError) {
      console.error('❌ [CREATE-MEETING] Erreur Supabase:', supabaseError);
      
      // Nettoyer la salle Daily.co en cas d'erreur Supabase
      try {
        await fetch(`${DAILY_BASE_URL}/rooms/${dailyRoom.name}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${DAILY_API_KEY}` }
        });
        console.log('🧹 [CREATE-MEETING] Salle Daily.co nettoyée après erreur');
      } catch (cleanupError) {
        console.error('❌ [CREATE-MEETING] Erreur nettoyage:', cleanupError);
      }

      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: `Erreur base de données: ${supabaseError.message}` 
        })
      };
    }

    console.log('✅ [CREATE-MEETING] Réunion sauvegardée:', meeting.id);

    // TODO: Envoyer les invitations par email (optionnel)
    // if (participants.length > 0) {
    //   await sendInvitations(participants, dailyRoom.url, title);
    // }

    // Réponse de succès
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        meetingId: meeting.id,
        roomName: dailyRoom.name,
        roomUrl: dailyRoom.url,
        meeting: meeting
      })
    };

  } catch (error) {
    console.error('❌ [CREATE-MEETING] Erreur générale:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: error.message || 'Erreur interne du serveur' 
      })
    };
  }
};
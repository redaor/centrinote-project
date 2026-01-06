// 🎥 Fonction Netlify AMÉLIORÉE pour créer une réunion Daily.co + Supabase
// Version 3.0 avec debug amélioré et gestion d'erreurs

const { createClient } = require('@supabase/supabase-js');

// Headers CORS
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async (event, context) => {
  console.log('📥 [CREATE-MEETING-V3] Requête reçue:', event.httpMethod);
  console.log('🔧 [CREATE-MEETING-V3] Context:', context.functionName);

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
    // Configuration - Vérification des variables d'environnement
    console.log('🔍 [CREATE-MEETING-V3] Vérification des variables d\'environnement...');
    
    // Variables pour Daily.co
    const DAILY_API_KEY = process.env.DAILY_API_KEY || process.env.REACT_APP_DAILY_API_KEY;
    const DAILY_DOMAIN = process.env.REACT_APP_DAILY_DOMAIN || 'centrinote.daily.co';
    
    // Variables pour Supabase
    const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    // Variables pour n8n webhooks
    const N8N_EVENTS_WEBHOOK = process.env.REACT_APP_N8N_EVENTS_WEBHOOK;
    const N8N_RECORDING_WEBHOOK = process.env.REACT_APP_N8N_RECORDING_WEBHOOK;

    // Log des variables (sans les clés sensibles)
    console.log('📋 [CREATE-MEETING-V3] Configuration:', {
      hasDaily: !!DAILY_API_KEY,
      dailyDomain: DAILY_DOMAIN,
      hasSupabaseUrl: !!SUPABASE_URL,
      hasSupabaseKey: !!SUPABASE_SERVICE_KEY,
      hasEventsWebhook: !!N8N_EVENTS_WEBHOOK,
      hasRecordingWebhook: !!N8N_RECORDING_WEBHOOK
    });

    // Validation critique
    if (!DAILY_API_KEY) {
      console.error('❌ [CREATE-MEETING-V3] DAILY_API_KEY manquante');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Configuration Daily.co manquante',
          debug: 'DAILY_API_KEY not configured in Netlify environment'
        })
      };
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      console.error('❌ [CREATE-MEETING-V3] Configuration Supabase manquante');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Configuration Supabase manquante',
          debug: 'SUPABASE_URL or SERVICE_KEY not configured'
        })
      };
    }

    // Initialiser Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Parser les données du formulaire
    const requestBody = JSON.parse(event.body);
    const { 
      title, 
      description, 
      scheduled_at, 
      duration_minutes = 60, 
      participants = [],
      created_by 
    } = requestBody;

    console.log('📝 [CREATE-MEETING-V3] Données reçues:', {
      title,
      hasDescription: !!description,
      scheduled_at,
      duration_minutes,
      participantsCount: participants.length,
      created_by
    });

    // Log participants pour debug
    console.log('👥 [CREATE-MEETING-V3] participants.count =', participants.length);
    if (participants.length > 0) {
      console.log('👤 [CREATE-MEETING-V3] Première adresse (sanity check):', participants[0]?.email);
      console.log('👥 [CREATE-MEETING-V3] payload participants sample:', participants[0]);
    }

    // Validation des données
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

    // Validation des participants
    if (!Array.isArray(participants)) {
      console.error('❌ [CREATE-MEETING-V3] participants n\'est pas un array:', typeof participants);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Format participants invalide' })
      };
    }

    // Validation de chaque participant
    const invalidParticipants = participants.filter(p => 
      !p || typeof p !== 'object' || !p.name || !p.email || 
      typeof p.name !== 'string' || typeof p.email !== 'string' ||
      !p.name.trim() || !p.email.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)
    );

    if (invalidParticipants.length > 0) {
      console.error('❌ [CREATE-MEETING-V3] Participants invalides:', invalidParticipants);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Certains participants ont des données invalides',
          invalidCount: invalidParticipants.length
        })
      };
    }

    // Sanitiser les participants
    const sanitizedParticipants = participants.map(p => ({
      name: p.name.trim(),
      email: p.email.trim().toLowerCase(),
      role: p.role || 'guest'
    }));

    console.log('✅ [CREATE-MEETING-V3] Participants validés et sanitisés:', sanitizedParticipants.length);

    // Générer un nom de salle unique
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    const roomName = `centrinote-${timestamp}-${random}`;
    
    console.log('🏠 [CREATE-MEETING-V3] Création salle Daily.co:', roomName);

    // Configuration de la requête Daily.co - PAYLOAD MINIMALE
    const dailyRoomConfig = {
      name: roomName,
      privacy: 'public',
      properties: {
        enable_knocking: false,
        start_video_off: false,
        start_audio_off: false,
        max_participants: 10,
      },
    };
    
    console.log('🔒 [STEP-6] Configuration room:', {
      privacy: dailyRoomConfig.privacy,
      knocking: dailyRoomConfig.properties.enable_knocking,
      maxParticipants: dailyRoomConfig.properties.max_participants
    });

    // ⚠️ WEBHOOKS SUPPRIMÉS DE LA PAYLOAD ROOM
    // Les webhooks doivent être configurés au niveau ACCOUNT dans Daily Dashboard
    console.log('ℹ️ [CREATE-MEETING-V3] Webhooks configurés au niveau account Daily Dashboard');
    console.log('🔗 N8N Events webhook:', N8N_EVENTS_WEBHOOK);
    console.log('🎬 N8N Recording webhook:', N8N_RECORDING_WEBHOOK);

    // Créer la salle Daily.co
    console.log('🚀 [CREATE-MEETING-V3] Appel API Daily.co...');
    const DAILY_BASE_URL = 'https://api.daily.co/v1';
    
    const dailyResponse = await fetch(`${DAILY_BASE_URL}/rooms`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DAILY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(dailyRoomConfig)
    });

    const dailyResponseText = await dailyResponse.text();
    console.log('📡 [CREATE-MEETING-V3] Réponse Daily.co status:', dailyResponse.status);

    if (!dailyResponse.ok) {
      console.error('[DAILY] Create room failed', dailyResponse.status, dailyResponseText);
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({
          success: false,
          reason: 'daily_room_create_failed',
          status: dailyResponse.status,
          detail: dailyResponseText
        }),
      };
    }

    let dailyRoom;
    try {
      dailyRoom = JSON.parse(dailyResponseText);
      console.log('✅ [CREATE-MEETING-V3] Salle Daily.co créée:', {
        name: dailyRoom.name,
        url: dailyRoom.url,
        domain_name: dailyRoom.domain_name,
        created: dailyRoom.created_at
      });
      console.log('🌐 [DOMAIN-CHECK] Room URL complète:', dailyRoom.url);
      console.log('🏷️ [DOMAIN-CHECK] Domain name:', dailyRoom.domain_name || 'undefined');
      console.log('🔍 [DOMAIN-CHECK] URL hostname:', new URL(dailyRoom.url).hostname);
    } catch (parseError) {
      console.error('❌ [CREATE-MEETING-V3] Erreur parsing Daily.co response:', parseError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Erreur parsing réponse Daily.co',
          debug: dailyResponseText
        })
      };
    }

    // Sauvegarder dans Supabase
    console.log('💾 [CREATE-MEETING-V3] Sauvegarde dans Supabase...');
    
    const meetingData = {
      room_name: dailyRoom.name,
      room_url: dailyRoom.url,
      title: title.trim(),
      description: description?.trim() || null,
      scheduled_at: scheduled_at || null,
      duration_minutes: parseInt(duration_minutes),
      participants: sanitizedParticipants, // Utiliser les participants sanitisés
      status: 'scheduled',
      created_by: created_by
    };

    console.log('💾 [CREATE-MEETING-V3] Meeting data with participants:', {
      ...meetingData,
      participants: `${meetingData.participants.length} participants`
    });

    const { data: meeting, error: supabaseError } = await supabase
      .from('meetings')
      .insert(meetingData)
      .select()
      .single();

    if (supabaseError) {
      console.error('❌ [CREATE-MEETING-V3] Erreur Supabase:', supabaseError);
      
      // Nettoyer la salle Daily.co en cas d'erreur Supabase
      try {
        console.log('🧹 [CREATE-MEETING-V3] Nettoyage salle Daily.co...');
        await fetch(`${DAILY_BASE_URL}/rooms/${dailyRoom.name}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${DAILY_API_KEY}` }
        });
      } catch (cleanupError) {
        console.error('❌ [CREATE-MEETING-V3] Erreur nettoyage:', cleanupError);
      }

      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Erreur base de données',
          details: supabaseError.message,
          code: supabaseError.code,
          debug: 'Check if meetings table exists in Supabase'
        })
      };
    }

    console.log('✅ [CREATE-MEETING-V3] Réunion sauvegardée:', meeting.id);
    console.log('👥 [CREATE-MEETING-V3] Participants sauvegardés:', meeting.participants?.length || 0);

    // Réponse de succès complète
    const successResponse = {
      success: true,
      meetingId: meeting.id,
      roomName: dailyRoom.name,
      roomUrl: dailyRoom.url,
      meeting: meeting,
      dailyConfig: {
        domain: DAILY_DOMAIN,
        hasWebhooks: !!N8N_EVENTS_WEBHOOK || !!N8N_RECORDING_WEBHOOK
      }
    };

    // (Option) Fire-and-forget webhook vers n8n pour notifier de la création
    if (N8N_EVENTS_WEBHOOK) {
      try {
        console.log('🔔 [CREATE-MEETING-V3] Envoi notification n8n...');
        
        // Extraire les informations des invités pour n8n
        const organizer = sanitizedParticipants.find(p => p.role === 'organizer');
        const guests = sanitizedParticipants.filter(p => p.role === 'guest');
        
        const notificationPayload = {
          type: 'meeting.created',
          meetingId: meeting.id,
          roomName: dailyRoom.name,
          room_url: dailyRoom.url,
          participants: sanitizedParticipants,
          title: meeting.title,
          created_by: meeting.created_by,
          timestamp: new Date().toISOString(),
          // 📧 Nouvelles données pour l'email d'invitation
          invited_by: organizer ? organizer.email : null,
          invited_name: guests.length > 0 ? guests[0].name : null,
          invited_email: guests.length > 0 ? guests[0].email : null,
          // Si plusieurs invités, inclure la liste complète
          all_invited: guests.map(g => ({ name: g.name, email: g.email }))
        };

        console.log('📧 [N8N-PAYLOAD] Données enrichies pour email:', {
          invited_by: notificationPayload.invited_by,
          invited_name: notificationPayload.invited_name,
          invited_email: notificationPayload.invited_email,
          roomName: notificationPayload.roomName,
          all_invited_count: notificationPayload.all_invited.length
        });

        // Fire-and-forget - ne pas bloquer la création si ça échoue
        fetch(N8N_EVENTS_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(notificationPayload)
        }).catch(webhookError => {
          console.warn('⚠️ [CREATE-MEETING-V3] Webhook n8n échoué (non bloquant):', webhookError.message);
        });
        
      } catch (webhookError) {
        console.warn('⚠️ [CREATE-MEETING-V3] Erreur webhook n8n (non bloquant):', webhookError);
      }
    }

    console.log('🎉 [CREATE-MEETING-V3] Réponse complète:', {
      meetingId: successResponse.meetingId,
      roomName: successResponse.roomName,
      roomUrl: successResponse.roomUrl,
      redirectUrl: `/meeting/${successResponse.meetingId}`
    });
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(successResponse)
    };

  } catch (error) {
    console.error('❌ [CREATE-MEETING-V3] Erreur générale:', error);
    console.error('Stack:', error.stack);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Erreur interne du serveur',
        message: error.message,
        type: error.name,
        debug: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};
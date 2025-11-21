// 🎥 Fonction Netlify v3 : Création réunion SANS n8n (100% autonome)
const { createClient } = require('@supabase/supabase-js');
const { processInvitation } = require('./lib/sendInvitation.cjs');
const crypto = require('crypto');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async (event, context) => {
  console.log('📥 [CREATE-MEETING-V3] Requête reçue');

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
    // Configuration
    const DAILY_API_KEY = process.env.DAILY_API_KEY || process.env.REACT_APP_DAILY_API_KEY;
    const DAILY_BASE_URL = 'https://api.daily.co/v1';
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!DAILY_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Configuration manquante' })
      };
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Parser les données
    const requestBody = JSON.parse(event.body);
    const {
      title,
      description,
      scheduled_at,
      duration_minutes = 60,
      participants = [],
      created_by,
      enable_ai_summary = false, // Nouveau: toggle IA
    } = requestBody;

    // Validation
    if (!title || !title.trim() || !created_by) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Titre et utilisateur requis' })
      };
    }

    // Valider et sanitizer les participants
    if (!Array.isArray(participants)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Format participants invalide' })
      };
    }

    console.log(`📊 [CREATE-MEETING-V3] Participants reçus (raw):`, JSON.stringify(participants, null, 2));
    
    const sanitizedParticipants = participants
      .filter(p => p && p.name && p.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email))
      .map(p => ({
        name: p.name.trim(),
        email: p.email.trim().toLowerCase(),
        role: p.role || 'guest'
      }));
    
    console.log(`📊 [CREATE-MEETING-V3] Participants sanitizés:`, sanitizedParticipants.length, sanitizedParticipants);

    // Générer nom de salle
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    const roomName = `centrinote-${timestamp}-${random}`;

    // Créer la salle Daily.co (SANS webhooks n8n)
    // URL de base pour les webhooks (production)
    // Utiliser URL depuis les headers de la requête ou fallback
    const host = event.headers.host || event.headers.Host || 'centrinote.fr';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const BASE_URL = `${protocol}://${host}`;
    const webhookUrl = `${BASE_URL}/.netlify/functions/daily-webhook-recording`;
    
    // Construire la configuration de la salle
    // ⚠️ IMPORTANT: Les webhooks d'enregistrement NE PEUVENT PAS être configurés dans les propriétés de la room
    // Ils doivent être configurés au niveau ACCOUNT dans Daily Dashboard ou via l'API webhooks
    const dailyRoomConfig = {
      name: roomName,
      privacy: 'public',
      properties: {
        enable_knocking: false,
        start_video_off: false,
        start_audio_off: false,
        max_participants: 10,
        enable_recording: enable_ai_summary ? 'cloud' : false, // Enregistrement si IA activée
      },
    };
    
    console.log('📡 [CREATE-MEETING-V3] Configuration room:', {
      enable_ai_summary,
      enable_recording: dailyRoomConfig.properties.enable_recording,
      note: 'Webhooks doivent être configurés au niveau compte Daily.co (Dashboard ou API)',
    });

    const dailyResponse = await fetch(`${DAILY_BASE_URL}/rooms`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DAILY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(dailyRoomConfig)
    });

    if (!dailyResponse.ok) {
      const errorText = await dailyResponse.text();
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Erreur création salle Daily.co',
          detail: errorText
        })
      };
    }

    const dailyRoom = await dailyResponse.json();

    // Sauvegarder dans Supabase
    const meetingData = {
      room_name: dailyRoom.name,
      room_url: dailyRoom.url,
      title: title.trim(),
      description: description?.trim() || null,
      scheduled_at: scheduled_at || null,
      duration_minutes: parseInt(duration_minutes),
      participants: sanitizedParticipants,
      status: 'scheduled',
      created_by: created_by
    };

    const { data: meeting, error: supabaseError } = await supabase
      .from('meetings')
      .insert(meetingData)
      .select()
      .single();

    if (supabaseError) {
      // Nettoyer la salle Daily.co
      await fetch(`${DAILY_BASE_URL}/rooms/${dailyRoom.name}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${DAILY_API_KEY}` }
      }).catch(() => {});

      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Erreur base de données',
          details: supabaseError.message
        })
      };
    }

    // Créer les invitations dans meeting_invitations et envoyer les emails
    const invitations = [];
    const emailPromises = [];
    
    console.log(`📧 [CREATE-MEETING-V3] Préparation envoi emails pour ${sanitizedParticipants.length} participant(s)`);
    
    // Filtrer les participants qui ont besoin d'une invitation (pas l'organisateur)
    const participantsToInvite = sanitizedParticipants.filter(p => p.role !== 'organizer');
    console.log(`📧 [CREATE-MEETING-V3] Participants à inviter: ${participantsToInvite.length}`, participantsToInvite.map(p => ({ email: p.email, role: p.role })));

    for (const participant of sanitizedParticipants) {
      if (participant.role === 'organizer') {
        console.log(`⏭️ [CREATE-MEETING-V3] Ignorer organisateur: ${participant.email}`);
        continue; // L'organisateur n'a pas besoin d'invitation
      }

      const token = crypto.randomBytes(32).toString('base64url');
      
      const { data: invitation, error: inviteError } = await supabase
        .from('meeting_invitations')
        .insert({
          meeting_id: meeting.id,
          email: participant.email,
          name: participant.name,
          token,
          status: 'pending', // 'pending' jusqu'à ce que l'email soit envoyé
          do_not_record: !enable_ai_summary, // Respecter le choix de l'utilisateur
        })
        .select()
        .single();

      if (!inviteError && invitation) {
        invitations.push(invitation);
        
        console.log(`📧 [CREATE-MEETING-V3] Préparation envoi email pour: ${participant.email} (invitation ID: ${invitation.id})`);
        
        // Préparer l'envoi d'email en parallèle
        emailPromises.push(
          processInvitation(invitation.id)
            .then(result => {
              console.log(`✅ [CREATE-MEETING-V3] Email envoyé avec succès à: ${participant.email}`);
              return result;
            })
            .catch(err => {
              console.error(`❌ [CREATE-MEETING-V3] Erreur envoi email à ${participant.email}:`, {
                error: err.message,
                stack: err.stack,
                invitationId: invitation.id
              });
              // Marquer comme 'failed' dans la DB
              supabase
                .from('meeting_invitations')
                .update({ status: 'failed' })
                .eq('id', invitation.id)
                .then(() => {})
                .catch(updateErr => {
                  console.error(`❌ [CREATE-MEETING-V3] Erreur mise à jour statut invitation:`, updateErr);
                });
              return { success: false, email: participant.email, error: err.message };
            })
        );
      } else {
        console.error(`❌ [CREATE-MEETING-V3] Erreur création invitation pour ${participant.email}:`, inviteError);
      }
    }

    // Envoyer les emails en parallèle - IMPORTANT: attendre que tous soient envoyés
    // Dans Netlify Functions, si on répond avant, la fonction peut se terminer et les emails ne seront pas envoyés
    if (emailPromises.length > 0) {
      console.log(`📧 [CREATE-MEETING-V3] Envoi de ${emailPromises.length} email(s) d'invitation...`);
      
      try {
        // ATTENDRE que tous les emails soient envoyés (avec timeout de sécurité)
        const emailResults = await Promise.race([
          Promise.all(emailPromises),
          new Promise((resolve) => 
            setTimeout(() => resolve({ timeout: true, results: [] }), 25000) // 25s timeout
          )
        ]);
        
        if (emailResults.timeout) {
          console.error(`❌ [CREATE-MEETING-V3] TIMEOUT: L'envoi des emails a pris plus de 25s`);
          console.error(`❌ [CREATE-MEETING-V3] Les emails peuvent ne pas avoir été envoyés`);
          console.error(`❌ [CREATE-MEETING-V3] Vérifiez les logs Netlify pour plus de détails`);
        } else {
          const results = emailResults;
          const successCount = results.filter(r => r && r.success !== false).length;
          const failedCount = results.filter(r => r && r.success === false).length;
          console.log(`✅ [CREATE-MEETING-V3] ${successCount}/${emailPromises.length} email(s) envoyé(s) avec succès`);
          if (failedCount > 0) {
            console.error(`❌ [CREATE-MEETING-V3] ${failedCount} email(s) ont échoué:`, 
              results.filter(r => r && r.success === false).map(r => ({ email: r.email, error: r.error }))
            );
          }
        }
      } catch (error) {
        console.error(`❌ [CREATE-MEETING-V3] Erreur lors de l'envoi des emails:`, error);
        console.error(`❌ [CREATE-MEETING-V3] Stack:`, error.stack);
      }
    } else {
      console.warn(`⚠️ [CREATE-MEETING-V3] Aucun email à envoyer (emailPromises.length = 0)`);
      console.warn(`⚠️ [CREATE-MEETING-V3] Participants sanitizés:`, sanitizedParticipants.length);
      console.warn(`⚠️ [CREATE-MEETING-V3] Participants à inviter (sans organizer):`, participantsToInvite.length);
      console.warn(`⚠️ [CREATE-MEETING-V3] Invitations créées:`, invitations.length);
    }

    // Si IA activée, créer une invitation "virtuelle" pour le système IA
    if (enable_ai_summary) {
      try {
        await supabase
          .from('meeting_invitations')
          .insert({
            meeting_id: meeting.id,
            email: 'ai@centrinote.fr',
            name: 'Assistant IA',
            token: crypto.randomBytes(32).toString('base64url'),
            status: 'sent',
            do_not_record: false,
          });
      } catch (err) {
        console.warn('⚠️ [CREATE-MEETING-V3] Erreur création invitation IA:', err);
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        meetingId: meeting.id,
        roomName: dailyRoom.name,
        roomUrl: dailyRoom.url,
        meeting,
        invitations,
        emailsStatus: {
          total: emailPromises.length,
          sent: emailPromises.length > 0 ? 'en_cours' : 'aucun_a_envoyer',
          invitationsCreated: invitations.length
        }
      })
    };

  } catch (error) {
    console.error('❌ [CREATE-MEETING-V3] Erreur:', error);
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


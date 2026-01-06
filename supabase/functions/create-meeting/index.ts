// 🎥 Supabase Edge Function pour créer une réunion Daily.co + Supabase
// Version utilisant les secrets Supabase

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface MeetingParticipant {
  name: string;
  email: string;
  role: 'organizer' | 'guest';
}

interface CreateMeetingRequest {
  title: string;
  description?: string;
  scheduled_at?: string;
  duration_minutes?: number;
  participants: MeetingParticipant[];
  created_by: string;
  enable_ai_summary?: boolean;
}

serve(async (req) => {
  // Gérer les requêtes OPTIONS (preflight CORS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method Not Allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    console.log('📥 [CREATE-MEETING] Requête reçue');

    // 🔐 Récupérer les secrets depuis Supabase
    const DAILY_API_KEY = Deno.env.get('DAILY_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const N8N_EVENTS_WEBHOOK = Deno.env.get('VITE_N8N_DAILY_EVENTS');
    const DAILY_DOMAIN = Deno.env.get('VITE_DAILY_DOMAIN') || 'centrinote.daily.co';

    console.log('🔍 [CREATE-MEETING] Vérification des secrets:', {
      hasDaily: !!DAILY_API_KEY,
      dailyDomain: DAILY_DOMAIN,
      hasSupabaseUrl: !!SUPABASE_URL,
      hasSupabaseKey: !!SUPABASE_SERVICE_ROLE_KEY,
      hasEventsWebhook: !!N8N_EVENTS_WEBHOOK,
    });

    // Validation critique
    if (!DAILY_API_KEY) {
      console.error('❌ [CREATE-MEETING] DAILY_API_KEY manquante');
      return new Response(
        JSON.stringify({
          error: 'Configuration Daily.co manquante',
          debug: 'DAILY_API_KEY not configured in Supabase secrets',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ [CREATE-MEETING] Configuration Supabase manquante');
      return new Response(
        JSON.stringify({
          error: 'Configuration Supabase manquante',
          debug: 'SUPABASE_URL or SERVICE_KEY not configured',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialiser Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parser les données du formulaire
    const requestBody: CreateMeetingRequest = await req.json();
    const {
      title,
      description,
      scheduled_at,
      duration_minutes = 60,
      participants = [],
      created_by,
      enable_ai_summary = false,
    } = requestBody;

    console.log('📝 [CREATE-MEETING] Données reçues:', {
      title,
      hasDescription: !!description,
      scheduled_at,
      duration_minutes,
      participantsCount: participants.length,
      created_by,
      enable_ai_summary,
    });

    // Validation des données
    if (!title || !title.trim()) {
      return new Response(
        JSON.stringify({ error: 'Le titre de la réunion est obligatoire' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!created_by) {
      return new Response(
        JSON.stringify({ error: 'Utilisateur non identifié' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validation des participants
    if (!Array.isArray(participants)) {
      console.error('❌ [CREATE-MEETING] participants n\'est pas un array:', typeof participants);
      return new Response(
        JSON.stringify({ error: 'Format participants invalide' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validation de chaque participant
    const invalidParticipants = participants.filter(
      (p) =>
        !p ||
        typeof p !== 'object' ||
        !p.name ||
        !p.email ||
        typeof p.name !== 'string' ||
        typeof p.email !== 'string' ||
        !p.name.trim() ||
        !p.email.trim() ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)
    );

    if (invalidParticipants.length > 0) {
      console.error('❌ [CREATE-MEETING] Participants invalides:', invalidParticipants);
      return new Response(
        JSON.stringify({
          error: 'Certains participants ont des données invalides',
          invalidCount: invalidParticipants.length,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitiser les participants
    const sanitizedParticipants = participants.map((p) => ({
      name: p.name.trim(),
      email: p.email.trim().toLowerCase(),
      role: p.role || 'guest',
    }));

    console.log('✅ [CREATE-MEETING] Participants validés:', sanitizedParticipants.length);

    // Générer un nom de salle unique
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    const roomName = `centrinote-${timestamp}-${random}`;

    console.log('🏠 [CREATE-MEETING] Création salle Daily.co:', roomName);

    // Configuration de la requête Daily.co
    const dailyRoomConfig = {
      name: roomName,
      privacy: 'public',
      properties: {
        enable_knocking: false,
        start_video_off: false,
        start_audio_off: false,
        max_participants: 10,
        // Activer l'enregistrement cloud si résumé IA activé
        ...(enable_ai_summary && { enable_recording: 'cloud' }),
      },
    };

    console.log('🔒 [CREATE-MEETING] Configuration room:', {
      privacy: dailyRoomConfig.privacy,
      knocking: dailyRoomConfig.properties.enable_knocking,
      maxParticipants: dailyRoomConfig.properties.max_participants,
      enableRecording: dailyRoomConfig.properties.enable_recording || false,
      enableAiSummary: enable_ai_summary,
    });

    // Créer la salle Daily.co
    console.log('🚀 [CREATE-MEETING] Appel API Daily.co...');
    const DAILY_BASE_URL = 'https://api.daily.co/v1';

    const dailyResponse = await fetch(`${DAILY_BASE_URL}/rooms`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${DAILY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dailyRoomConfig),
    });

    const dailyResponseText = await dailyResponse.text();
    console.log('📡 [CREATE-MEETING] Réponse Daily.co status:', dailyResponse.status);

    if (!dailyResponse.ok) {
      console.error('[DAILY] Create room failed', dailyResponse.status, dailyResponseText);
      return new Response(
        JSON.stringify({
          success: false,
          reason: 'daily_room_create_failed',
          status: dailyResponse.status,
          detail: dailyResponseText,
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let dailyRoom;
    try {
      dailyRoom = JSON.parse(dailyResponseText);
      console.log('✅ [CREATE-MEETING] Salle Daily.co créée:', {
        name: dailyRoom.name,
        url: dailyRoom.url,
        domain_name: dailyRoom.domain_name,
        created: dailyRoom.created_at,
      });
    } catch (parseError) {
      console.error('❌ [CREATE-MEETING] Erreur parsing Daily.co response:', parseError);
      return new Response(
        JSON.stringify({
          error: 'Erreur parsing réponse Daily.co',
          debug: dailyResponseText,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sauvegarder dans Supabase
    console.log('💾 [CREATE-MEETING] Sauvegarde dans Supabase...');

    const meetingData = {
      room_name: dailyRoom.name,
      room_url: dailyRoom.url,
      title: title.trim(),
      description: description?.trim() || null,
      scheduled_at: scheduled_at || null,
      duration_minutes: parseInt(duration_minutes.toString()),
      participants: sanitizedParticipants,
      status: 'scheduled',
      created_by: created_by,
    };

    console.log('💾 [CREATE-MEETING] Meeting data:', {
      ...meetingData,
      participants: `${meetingData.participants.length} participants`,
    });

    const { data: meeting, error: supabaseError } = await supabase
      .from('meetings')
      .insert(meetingData)
      .select()
      .single();

    if (supabaseError) {
      console.error('❌ [CREATE-MEETING] Erreur Supabase:', supabaseError);

      // Nettoyer la salle Daily.co en cas d'erreur Supabase
      try {
        console.log('🧹 [CREATE-MEETING] Nettoyage salle Daily.co...');
        await fetch(`${DAILY_BASE_URL}/rooms/${dailyRoom.name}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${DAILY_API_KEY}` },
        });
      } catch (cleanupError) {
        console.error('❌ [CREATE-MEETING] Erreur nettoyage:', cleanupError);
      }

      return new Response(
        JSON.stringify({
          error: 'Erreur base de données',
          details: supabaseError.message,
          code: supabaseError.code,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ [CREATE-MEETING] Réunion sauvegardée:', meeting.id);
    console.log('👥 [CREATE-MEETING] Participants sauvegardés:', meeting.participants?.length || 0);

    // Réponse de succès complète
    const successResponse = {
      success: true,
      meetingId: meeting.id,
      roomName: dailyRoom.name,
      roomUrl: dailyRoom.url,
      meeting: meeting,
      dailyConfig: {
        domain: DAILY_DOMAIN,
        hasWebhooks: !!N8N_EVENTS_WEBHOOK,
      },
    };

    // 📧 Envoyer les invitations automatiquement si des invités sont présents
    const guests = sanitizedParticipants.filter((p) => p.role === 'guest');
    const organizer = sanitizedParticipants.find((p) => p.role === 'organizer');

    console.log('📧 [CREATE-MEETING] Vérification envoi invitations:', {
      totalParticipants: sanitizedParticipants.length,
      guestsCount: guests.length,
      hasOrganizer: !!organizer,
      willSendInvites: guests.length > 0 && !!organizer
    });

    if (guests.length > 0 && organizer) {
      console.log('📧 [CREATE-MEETING] Envoi direct des invitations via automation-email...');

      // Pour chaque invité, envoyer un email directement via automation-email
      for (const guest of guests) {
        try {
          const organizerName = organizer.name || organizer.email.split('@')[0];
          const recipientName = guest.name || guest.email.split('@')[0];

          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #6366f1;">📅 Invitation à une réunion</h2>
              <p>Bonjour ${recipientName},</p>
              <p>${organizerName} vous invite à rejoindre la réunion : <strong>${meeting.title}</strong></p>
              ${meeting.description ? `<p>${meeting.description}</p>` : ''}
              ${meeting.scheduled_at ? `<p><strong>📆 Date :</strong> ${new Date(meeting.scheduled_at).toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' })}</p>` : ''}
              ${meeting.duration_minutes ? `<p><strong>⏱️ Durée :</strong> ${meeting.duration_minutes} minutes</p>` : ''}
              <div style="margin: 30px 0; text-align: center;">
                <a href="${dailyRoom.url}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Rejoindre la réunion
                </a>
              </div>
              <p style="color: #6b7280; font-size: 14px;">
                Ou copiez ce lien : <a href="${dailyRoom.url}">${dailyRoom.url}</a>
              </p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
              <p style="color: #6b7280; font-size: 12px;">Centrinote - Invitation à une réunion</p>
            </div>
          `;

          const emailText = `
Invitation à une réunion

Bonjour ${recipientName},

${organizerName} vous invite à rejoindre la réunion : ${meeting.title}

${meeting.description || ''}

${meeting.scheduled_at ? `Date : ${new Date(meeting.scheduled_at).toLocaleString('fr-FR')}` : ''}
${meeting.duration_minutes ? `Durée : ${meeting.duration_minutes} minutes` : ''}

Rejoindre la réunion : ${dailyRoom.url}

--
Centrinote
          `;

          // Appel direct à automation-email (fire-and-forget)
          fetch(`${SUPABASE_URL}/functions/v1/automation-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
            },
            body: JSON.stringify({
              to: guest.email,
              subject: `📅 Invitation : ${meeting.title}`,
              text: emailText,
              html: emailHtml,
            }),
          })
          .then(async (response) => {
            if (response.ok) {
              console.log(`✅ [CREATE-MEETING] Email envoyé à ${guest.email}`);
            } else {
              const errorText = await response.text();
              console.error(`❌ [CREATE-MEETING] Erreur email ${guest.email}:`, errorText);
            }
          })
          .catch((err) => {
            console.error(`❌ [CREATE-MEETING] Erreur envoi email ${guest.email}:`, err);
          });
        } catch (emailError) {
          console.warn(`⚠️ [CREATE-MEETING] Erreur email ${guest.email} (non bloquant):`, emailError);
        }
      }
    }

    // (Option) Fire-and-forget webhook vers n8n pour notifier de la création
    if (N8N_EVENTS_WEBHOOK) {
      try {
        console.log('🔔 [CREATE-MEETING] Envoi notification n8n...');

        const organizer = sanitizedParticipants.find((p) => p.role === 'organizer');
        const guests = sanitizedParticipants.filter((p) => p.role === 'guest');

        const notificationPayload = {
          type: 'meeting.created',
          meetingId: meeting.id,
          roomName: dailyRoom.name,
          room_url: dailyRoom.url,
          participants: sanitizedParticipants,
          title: meeting.title,
          created_by: meeting.created_by,
          timestamp: new Date().toISOString(),
          invited_by: organizer ? organizer.email : null,
          invited_name: guests.length > 0 ? guests[0].name : null,
          invited_email: guests.length > 0 ? guests[0].email : null,
          all_invited: guests.map((g) => ({ name: g.name, email: g.email })),
        };

        // Fire-and-forget
        fetch(N8N_EVENTS_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(notificationPayload),
        }).catch((webhookError) => {
          console.warn('⚠️ [CREATE-MEETING] Webhook n8n échoué (non bloquant):', webhookError.message);
        });
      } catch (webhookError) {
        console.warn('⚠️ [CREATE-MEETING] Erreur webhook n8n (non bloquant):', webhookError);
      }
    }

    console.log('🎉 [CREATE-MEETING] Réponse complète:', {
      meetingId: successResponse.meetingId,
      roomName: successResponse.roomName,
      roomUrl: successResponse.roomUrl,
    });

    return new Response(JSON.stringify(successResponse), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('❌ [CREATE-MEETING] Erreur générale:', error);
    console.error('Stack:', error.stack);

    return new Response(
      JSON.stringify({
        error: 'Erreur interne du serveur',
        message: error instanceof Error ? error.message : 'Erreur inconnue',
        type: error instanceof Error ? error.name : 'UnknownError',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

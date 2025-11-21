// 📧 Version simplifiée de sendInvitation pour Netlify Functions (SANS pg-boss)
const { sendEmailTemplate } = require('../../../utils/emailTemplates.cjs');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BASE_URL = process.env.NETLIFY_URL ||
                 process.env.VITE_APP_URL ||
                 process.env.REACT_APP_URL ||
                 'https://centrinote.fr';

/**
 * Génère un token unique pour l'invitation
 */
function generateToken() {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Traite une invitation à envoyer
 */
async function processInvitation(invitationId) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Récupérer l'invitation et la réunion
  const { data: invitation, error: inviteError } = await supabase
    .from('meeting_invitations')
    .select(`
      *,
      meeting:meetings (
        id,
        title,
        description,
        scheduled_at,
        duration_minutes,
        room_url,
        created_by,
        participants
      )
    `)
    .eq('id', invitationId)
    .single();

  if (inviteError || !invitation) {
    console.error('❌ [SEND-INVITATION] Erreur récupération invitation:', inviteError);
    throw new Error(`Invitation non trouvée: ${invitationId}`);
  }

  if (!invitation.meeting) {
    console.error('❌ [SEND-INVITATION] Réunion non trouvée pour invitation:', invitationId);
    throw new Error(`Réunion non trouvée pour l'invitation ${invitationId}`);
  }

  // Générer le token si absent
  if (!invitation.token) {
    const token = generateToken();
    await supabase
      .from('meeting_invitations')
      .update({ token })
      .eq('id', invitationId);
    invitation.token = token;
  }

  // Construire l'URL d'invitation
  const tokenUrl = `${BASE_URL}/meetings/accept?token=${invitation.token}`;

  // Récupérer le nom de l'organisateur
  let organizerName = 'Organisateur';
  try {
    const participants = invitation.meeting.participants || [];
    const organizer = participants.find(p => p && p.role === 'organizer');
    if (organizer && organizer.name) {
      organizerName = organizer.name;
    } else if (organizer && organizer.email) {
      organizerName = organizer.email.split('@')[0];
    }
  } catch (err) {
    console.warn('⚠️ [SEND-INVITATION] Impossible de récupérer le nom de l\'organisateur');
  }

  // Envoyer l'email
  try {
    console.log(`📧 [SEND-INVITATION] Début envoi email à: ${invitation.email}`);

    const emailResult = await sendEmailTemplate({
      to: invitation.email,
      template: 'invitation',
      vars: {
        recipientName: invitation.name || invitation.email.split('@')[0],
        organizerName,
        meetingTitle: invitation.meeting.title,
        meetingDescription: invitation.meeting.description || '',
        scheduledAt: invitation.meeting.scheduled_at
          ? new Date(invitation.meeting.scheduled_at).toLocaleString('fr-FR', {
              dateStyle: 'full',
              timeStyle: 'short'
            })
          : null,
        durationMinutes: invitation.meeting.duration_minutes || 60,
        tokenUrl,
        roomUrl: invitation.meeting.room_url,
        icsFile: invitation.meeting.scheduled_at
          ? generateICS(invitation.meeting, invitation.token)
          : null,
      }
    });

    console.log(`✅ [SEND-INVITATION] Email envoyé avec succès à ${invitation.email}`);

    // Mettre à jour le statut
    await supabase
      .from('meeting_invitations')
      .update({
        sent_at: new Date().toISOString(),
        status: 'sent'
      })
      .eq('id', invitationId);

    return { success: true, invitationId, messageId: emailResult.messageId };

  } catch (error) {
    console.error('❌ [SEND-INVITATION] Erreur envoi email:', error.message);

    // Marquer comme bounced si erreur d'email
    if (error.message.includes('email') || error.message.includes('bounce') || error.message.includes('SMTP')) {
      await supabase
        .from('meeting_invitations')
        .update({ status: 'bounced' })
        .eq('id', invitationId)
        .catch(() => {});
    }

    throw error;
  }
}

/**
 * Génère un fichier ICS pour le calendrier
 */
function generateICS(meeting, token) {
  const startDate = meeting.scheduled_at
    ? new Date(meeting.scheduled_at).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    : null;

  const endDate = meeting.scheduled_at && meeting.duration_minutes
    ? new Date(new Date(meeting.scheduled_at).getTime() + meeting.duration_minutes * 60000)
        .toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    : null;

  if (!startDate || !endDate) return null;

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Centrinote//Meeting Invitation//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${meeting.id}@centrinote.fr`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
    `DTSTART:${startDate}`,
    `DTEND:${endDate}`,
    `SUMMARY:${meeting.title}`,
    `DESCRIPTION:${meeting.description || ''}\\n\\nRejoindre: ${BASE_URL}/meetings/accept?token=${token}`,
    `LOCATION:${meeting.room_url}`,
    `URL:${BASE_URL}/meetings/accept?token=${token}`,
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  return {
    filename: `invitation-${meeting.id}.ics`,
    content: Buffer.from(ics, 'utf8'),
    contentType: 'text/calendar; charset=utf-8'
  };
}

module.exports = {
  processInvitation,
  generateICS,
};

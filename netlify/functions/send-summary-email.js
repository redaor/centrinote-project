// 📧 Fonction Netlify pour envoyer un résumé de réunion par email
// Réutilise le système d'envoi d'emails existant (sendEmailTemplate)

const { createClient } = require('@supabase/supabase-js');
const { sendEmailTemplate } = require('../../utils/emailTemplates.cjs');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BASE_URL = process.env.NETLIFY_URL ||
                 process.env.VITE_APP_URL ||
                 process.env.REACT_APP_URL ||
                 'https://centrinote.fr';

exports.handler = async (event, context) => {
  console.log('📧 [SEND-SUMMARY] Début traitement envoi résumé par email');

  // Gérer les requêtes OPTIONS (preflight)
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
    // Vérifier la configuration
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Configuration Supabase manquante',
          required: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']
        })
      };
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const body = JSON.parse(event.body || '{}');
    const { meetingId, recipientEmail, recipientName, customMessage } = body;

    // Validation des données
    if (!meetingId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Meeting ID manquant',
          required: ['meetingId', 'recipientEmail']
        })
      };
    }

    if (!recipientEmail) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Email destinataire manquant',
          required: ['meetingId', 'recipientEmail']
        })
      };
    }

    // Validation basique de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Adresse email invalide'
        })
      };
    }

    console.log('📊 [SEND-SUMMARY] Récupération résumé:', {
      meetingId,
      recipientEmail
    });

    // Récupérer le résumé depuis Supabase
    const { data: meeting, error: dbError } = await supabase
      .from('meetings')
      .select('id, title, started_at, participants, transcript, ai_summary')
      .eq('id', meetingId)
      .single();

    if (dbError || !meeting) {
      console.error('❌ [SEND-SUMMARY] Erreur récupération résumé:', dbError);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          error: 'Résumé non trouvé',
          meetingId
        })
      };
    }

    // Vérifier que le résumé existe
    if (!meeting.ai_summary || !meeting.transcript) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          error: 'Résumé non encore généré pour cette réunion',
          meetingId
        })
      };
    }

    // Parser les données JSONB
    const aiSummary = typeof meeting.ai_summary === 'string'
      ? JSON.parse(meeting.ai_summary)
      : meeting.ai_summary;

    const transcript = typeof meeting.transcript === 'string'
      ? JSON.parse(meeting.transcript)
      : meeting.transcript;

    const participants = typeof meeting.participants === 'string'
      ? JSON.parse(meeting.participants)
      : meeting.participants;

    // Construire l'URL du résumé
    const summaryUrl = `${BASE_URL}/meetings/${meetingId}/summary`;

    // Formater le résumé en texte pour l'email
    let summaryText = `📅 Résumé de la réunion : ${meeting.title}\n\n`;

    // Date de la réunion
    if (meeting.started_at) {
      const meetingDate = new Date(meeting.started_at).toLocaleString('fr-FR', {
        dateStyle: 'full',
        timeStyle: 'short'
      });
      summaryText += `📆 Date : ${meetingDate}\n\n`;
    }

    // Participants
    if (participants && participants.length > 0) {
      summaryText += `👥 Participants :\n`;
      participants.forEach(p => {
        summaryText += `  • ${p.name}${p.role === 'organizer' ? ' (Organisateur)' : ''}\n`;
      });
      summaryText += '\n';
    }

    // Message personnalisé (si fourni)
    if (customMessage && customMessage.trim()) {
      summaryText += `💬 Message :\n${customMessage}\n\n`;
      summaryText += '─────────────────────────────────\n\n';
    }

    // Résumé principal
    if (aiSummary?.summary) {
      summaryText += `📝 Résumé :\n${aiSummary.summary}\n\n`;
    }

    // Points clés
    if (aiSummary?.key_points && aiSummary.key_points.length > 0) {
      summaryText += `🎯 Points clés :\n`;
      aiSummary.key_points.forEach(point => {
        summaryText += `  • ${point}\n`;
      });
      summaryText += '\n';
    }

    // Décisions
    if (aiSummary?.decisions && aiSummary.decisions.length > 0) {
      summaryText += `✅ Décisions :\n`;
      aiSummary.decisions.forEach(decision => {
        summaryText += `  • ${decision}\n`;
      });
      summaryText += '\n';
    }

    // Actions
    if (aiSummary?.action_items && aiSummary.action_items.length > 0) {
      summaryText += `📋 Actions à faire :\n`;
      aiSummary.action_items.forEach(action => {
        const task = typeof action === 'string' ? action : action.task;
        const assignee = typeof action === 'object' && action.assignee ? ` (${action.assignee})` : '';
        summaryText += `  • ${task}${assignee}\n`;
      });
      summaryText += '\n';
    }

    // Lien retiré pour des raisons de sécurité

    // Envoyer l'email
    try {
      console.log(`📧 [SEND-SUMMARY] Envoi email à: ${recipientEmail}`);

      await sendEmailTemplate({
        to: recipientEmail,
        template: 'summary',
        vars: {
          recipientName: recipientName || recipientEmail.split('@')[0],
          meetingTitle: meeting.title,
          meetingDate: meeting.started_at
            ? new Date(meeting.started_at).toLocaleString('fr-FR', {
                dateStyle: 'full',
                timeStyle: 'short'
              })
            : null,
          participants: participants || [],
          customMessage: customMessage || null,
          summary: aiSummary?.summary || '',
          keyPoints: aiSummary?.key_points || [],
          decisions: aiSummary?.decisions || [],
          actions: aiSummary?.action_items || [],
          summaryUrl,
          summaryText // Version texte brut pour fallback
        }
      });

      console.log(`✅ [SEND-SUMMARY] Email envoyé avec succès à ${recipientEmail}`);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: `Résumé envoyé à ${recipientEmail}`,
          recipientEmail,
          meetingId
        })
      };

    } catch (emailError) {
      console.error('❌ [SEND-SUMMARY] Erreur envoi email:', emailError);

      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Erreur lors de l\'envoi de l\'email',
          message: emailError.message
        })
      };
    }

  } catch (error) {
    console.error('❌ [SEND-SUMMARY] Erreur générale:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: error.message,
        debug: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};

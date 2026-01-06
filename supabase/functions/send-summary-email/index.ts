/**
 * 📧 Supabase Edge Function pour envoyer un résumé de réunion par email
 * Utilise automation-email pour l'envoi d'emails
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

serve(async (req) => {
  console.log('📧 [SEND-SUMMARY] Début traitement envoi résumé par email');

  // Gérer les requêtes OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method Not Allowed' }),
      { status: 405, headers: corsHeaders }
    );
  }

  try {
    // Vérifier la configuration
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const BASE_URL = Deno.env.get('VITE_APP_URL') || 'https://centrinote.fr';

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({
          error: 'Configuration Supabase manquante',
          required: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json();
    const { meetingId, recipientEmail, recipientName, customMessage } = body;

    // Validation des données
    if (!meetingId) {
      return new Response(
        JSON.stringify({
          error: 'Meeting ID manquant',
          required: ['meetingId', 'recipientEmail']
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (!recipientEmail) {
      return new Response(
        JSON.stringify({
          error: 'Email destinataire manquant',
          required: ['meetingId', 'recipientEmail']
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Validation basique de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      return new Response(
        JSON.stringify({
          error: 'Adresse email invalide'
        }),
        { status: 400, headers: corsHeaders }
      );
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
      return new Response(
        JSON.stringify({
          error: 'Résumé non trouvé',
          meetingId
        }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Vérifier que le résumé existe
    if (!meeting.ai_summary || !meeting.transcript) {
      return new Response(
        JSON.stringify({
          error: 'Résumé non encore généré pour cette réunion',
          meetingId
        }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Parser les données JSONB
    const aiSummary = typeof meeting.ai_summary === 'string'
      ? JSON.parse(meeting.ai_summary)
      : meeting.ai_summary;

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
      participants.forEach((p: any) => {
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
      aiSummary.key_points.forEach((point: string) => {
        summaryText += `  • ${point}\n`;
      });
      summaryText += '\n';
    }

    // Décisions
    if (aiSummary?.decisions && aiSummary.decisions.length > 0) {
      summaryText += `✅ Décisions :\n`;
      aiSummary.decisions.forEach((decision: string) => {
        summaryText += `  • ${decision}\n`;
      });
      summaryText += '\n';
    }

    // Actions
    if (aiSummary?.action_items && aiSummary.action_items.length > 0) {
      summaryText += `📋 Actions à faire :\n`;
      aiSummary.action_items.forEach((action: any) => {
        const task = typeof action === 'string' ? action : action.task;
        const assignee = typeof action === 'object' && action.assignee ? ` (${action.assignee})` : '';
        summaryText += `  • ${task}${assignee}\n`;
      });
      summaryText += '\n';
    }

    // Construire le HTML
    const meetingDate = meeting.started_at
      ? new Date(meeting.started_at).toLocaleString('fr-FR', {
          dateStyle: 'full',
          timeStyle: 'short'
        })
      : null;

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #6366f1;">📝 Résumé de la réunion</h2>
        <h3 style="color: #1f2937;">${meeting.title}</h3>
        ${meetingDate ? `<p><strong>📆 Date :</strong> ${meetingDate}</p>` : ''}
        ${participants && participants.length > 0 ? `
          <p><strong>👥 Participants :</strong></p>
          <ul>
            ${participants.map((p: any) => `<li>${p.name}${p.role === 'organizer' ? ' (Organisateur)' : ''}</li>`).join('')}
          </ul>
        ` : ''}
        ${customMessage && customMessage.trim() ? `<p><strong>💬 Message :</strong><br>${customMessage}</p><hr style="margin: 20px 0;" />` : ''}
        ${aiSummary?.summary ? `<div style="margin: 20px 0;"><strong>📝 Résumé :</strong><p>${aiSummary.summary.replace(/\n/g, '<br>')}</p></div>` : ''}
        ${aiSummary?.key_points && aiSummary.key_points.length > 0 ? `
          <div style="margin: 20px 0;">
            <strong>🎯 Points clés :</strong>
            <ul>
              ${aiSummary.key_points.map((point: string) => `<li>${point}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        ${aiSummary?.decisions && aiSummary.decisions.length > 0 ? `
          <div style="margin: 20px 0;">
            <strong>✅ Décisions :</strong>
            <ul>
              ${aiSummary.decisions.map((decision: string) => `<li>${decision}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        ${aiSummary?.action_items && aiSummary.action_items.length > 0 ? `
          <div style="margin: 20px 0;">
            <strong>📋 Actions à faire :</strong>
            <ul>
              ${aiSummary.action_items.map((action: any) => {
                const task = typeof action === 'string' ? action : action.task;
                const assignee = typeof action === 'object' && action.assignee ? ` (${action.assignee})` : '';
                return `<li>${task}${assignee}</li>`;
              }).join('')}
            </ul>
          </div>
        ` : ''}
        <div style="margin: 30px 0; text-align: center;">
          <a href="${summaryUrl}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Voir le résumé complet
          </a>
        </div>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="color: #6b7280; font-size: 12px;">Centrinote - Résumé de réunion</p>
      </div>
    `;

    // Envoyer l'email
    try {
      console.log(`📧 [SEND-SUMMARY] Envoi email à: ${recipientEmail}`);

      const emailResponse = await fetch(`${SUPABASE_URL}/functions/v1/automation-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: recipientEmail,
          subject: `📝 Résumé de votre réunion - ${meeting.title}`,
          text: summaryText,
          html: emailHtml,
        }),
      });

      if (!emailResponse.ok) {
        const errorText = await emailResponse.text();
        throw new Error(`Erreur envoi email: ${errorText}`);
      }

      console.log(`✅ [SEND-SUMMARY] Email envoyé avec succès à ${recipientEmail}`);

      return new Response(
        JSON.stringify({
          success: true,
          message: `Résumé envoyé à ${recipientEmail}`,
          recipientEmail,
          meetingId
        }),
        { status: 200, headers: corsHeaders }
      );

    } catch (emailError) {
      console.error('❌ [SEND-SUMMARY] Erreur envoi email:', emailError);

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Erreur lors de l\'envoi de l\'email',
          message: emailError instanceof Error ? emailError.message : 'Erreur inconnue'
        }),
        { status: 500, headers: corsHeaders }
      );
    }

  } catch (error) {
    console.error('❌ [SEND-SUMMARY] Erreur générale:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});




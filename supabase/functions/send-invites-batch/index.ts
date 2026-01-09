/**
 * 📧 Supabase Edge Function pour envoyer des invitations en lot
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

// Helper pour diviser en groupes
function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Attendre un délai
function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Générer un token unique
async function generateToken(): Promise<string> {
  const array = new Uint8Array(32);
  globalThis.crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// Fonction pour créer ou récupérer une invitation dans meeting_invitations
async function getOrCreateInvitation(
  supabase: any,
  meetingId: string,
  guest: { name?: string; email: string }
): Promise<string> {
  // Vérifier si l'invitation existe déjà
  const { data: existing, error: checkError } = await supabase
    .from('meeting_invitations')
    .select('id')
    .eq('meeting_id', meetingId)
    .eq('email', guest.email)
    .maybeSingle();

  // Si erreur lors de la vérification (autre que "not found")
  if (checkError && checkError.code !== 'PGRST116') {
    console.error(`❌ [INVITATION] Erreur vérification invitation existante:`, checkError);
    throw new Error(`Erreur vérification invitation: ${checkError.message || checkError.code || 'Erreur inconnue'}`);
  }

  // Si l'invitation existe déjà, retourner son ID
  if (existing && existing.id) {
    console.log(`✅ [INVITATION] Invitation existante trouvée pour ${guest.email}: ${existing.id}`);
    return existing.id;
  }

  // Créer une nouvelle invitation
  console.log(`📝 [INVITATION] Création nouvelle invitation pour ${guest.email}`);
  const token = await generateToken();
  
  const { data: invitation, error: insertError } = await supabase
    .from('meeting_invitations')
    .insert({
      meeting_id: meetingId,
      email: guest.email,
      name: guest.name || guest.email.split('@')[0],
      token,
      status: 'pending',
      do_not_record: false,
    })
    .select('id')
    .single();

  if (insertError) {
    console.error(`❌ [INVITATION] Erreur insertion invitation:`, insertError);
    throw new Error(`Erreur création invitation: ${insertError.message || insertError.code || insertError.hint || 'Erreur inconnue'}`);
  }

  if (!invitation || !invitation.id) {
    throw new Error('Invitation créée mais ID non retourné');
  }

  console.log(`✅ [INVITATION] Nouvelle invitation créée: ${invitation.id}`);
  return invitation.id;
}

// Fonction pour traiter une invitation (créer dans DB et envoyer l'email)
async function processInvitation(
  supabase: any,
  supabaseUrl: string,
  serviceKey: string,
  meeting: any,
  invitationId: string,
  guest: { name?: string; email: string },
  baseUrl: string
): Promise<void> {
  // Récupérer l'invitation avec le token
  const { data: invitation, error: inviteError } = await supabase
    .from('meeting_invitations')
    .select('*')
    .eq('id', invitationId)
    .single();

  if (inviteError || !invitation || !invitation.token) {
    throw new Error(`Invitation non trouvée ou token manquant: ${invitationId}`);
  }

  const tokenUrl = `${baseUrl}/meetings/accept?token=${invitation.token}`;
  
  // Récupérer le nom de l'organisateur
  let organizerName = 'Organisateur';
  try {
    const participants = meeting.participants || [];
    const organizer = participants.find((p: any) => p && p.role === 'organizer');
    if (organizer && organizer.name) {
      organizerName = organizer.name;
    } else if (organizer && organizer.email) {
      organizerName = organizer.email.split('@')[0];
    }
  } catch (err) {
    console.warn('⚠️ [SEND-INVITATION] Impossible de récupérer le nom de l\'organisateur');
  }

  // Construire le HTML de l'email
  const scheduledAt = meeting.scheduled_at
    ? new Date(meeting.scheduled_at).toLocaleString('fr-FR', {
        dateStyle: 'full',
        timeStyle: 'short'
      })
    : null;

  const recipientName = invitation.name || invitation.email.split('@')[0];
  
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #6366f1;">📅 Invitation à une réunion</h2>
      <p>Bonjour ${recipientName},</p>
      <p>${organizerName} vous invite à rejoindre la réunion : <strong>${meeting.title}</strong></p>
      ${meeting.description ? `<p>${meeting.description}</p>` : ''}
      ${scheduledAt ? `<p><strong>📆 Date :</strong> ${scheduledAt}</p>` : ''}
      ${meeting.duration_minutes ? `<p><strong>⏱️ Durée :</strong> ${meeting.duration_minutes} minutes</p>` : ''}
      <div style="margin: 30px 0; text-align: center;">
        <a href="${tokenUrl}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Rejoindre la réunion
        </a>
      </div>
      <p style="color: #6b7280; font-size: 14px;">
        Ou copiez ce lien : <a href="${tokenUrl}">${tokenUrl}</a>
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

${scheduledAt ? `Date : ${scheduledAt}` : ''}
${meeting.duration_minutes ? `Durée : ${meeting.duration_minutes} minutes` : ''}

Rejoindre la réunion : ${tokenUrl}

--
Centrinote
  `;

  // Envoyer l'email via automation-email
  const emailResponse = await fetch(`${supabaseUrl}/functions/v1/automation-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceKey,
    },
    body: JSON.stringify({
      to: invitation.email,
      subject: `📅 Invitation : ${meeting.title}`,
      text: emailText,
      html: emailHtml,
    }),
  });

  if (!emailResponse.ok) {
    const errorText = await emailResponse.text();
    throw new Error(`Erreur envoi email: ${errorText}`);
  }

  // Mettre à jour le statut
  await supabase
    .from('meeting_invitations')
    .update({
      sent_at: new Date().toISOString(),
      status: 'sent'
    })
    .eq('id', invitationId);
}

serve(async (req) => {
  console.log('📧 [SEND-INVITES] Début traitement batch emails');
  
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

    // Utiliser SERVICE_ROLE_KEY pour bypass auth (backend-to-backend)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const body = await req.json();
    const { meeting, invited } = body;
    
    // Validation des données
    if (!meeting || !meeting.id || !meeting.title || !meeting.room_url) {
      return new Response(
        JSON.stringify({ 
          error: 'Meeting data incomplete',
          required: ['id', 'title', 'room_url']
        }),
        { status: 400, headers: corsHeaders }
      );
    }
    
    if (!Array.isArray(invited) || invited.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No invited participants provided'
        }),
        { status: 400, headers: corsHeaders }
      );
    }
    
    console.log('📊 [SEND-INVITES] Traitement:', {
      meetingId: meeting.id,
      meetingTitle: meeting.title,
      invitedCount: invited.length
    });
    
    // Diviser en chunks de 20 pour éviter les timeouts
    const chunks = chunk(invited, 20);
    console.log(`📦 [SEND-INVITES] ${chunks.length} batch(es) de maximum 20 emails`);
    
    const results = {
      total: invited.length,
      sent: 0,
      failed: [] as Array<{ email: string; name: string; reason: string; attempts: number }>,
      batches: chunks.length
    };
    
    // Traiter chaque batch séquentiellement
    for (let batchIndex = 0; batchIndex < chunks.length; batchIndex++) {
      const batch = chunks[batchIndex];
      console.log(`📧 [BATCH-${batchIndex + 1}] Traitement de ${batch.length} emails`);
      
      // Traiter les emails du batch en parallèle
      const batchPromises = batch.map(async (guest: { name?: string; email: string }) => {
        try {
          console.log(`📧 [BATCH] Traitement invitation pour: ${guest.email}`);
          
          // Créer ou récupérer l'invitation dans meeting_invitations
          const invitationId = await getOrCreateInvitation(supabase, meeting.id, guest);
          
          if (!invitationId) {
            throw new Error('Impossible d\'obtenir l\'ID d\'invitation');
          }
          
          // Envoyer l'email via processInvitation
          console.log(`📤 [BATCH] Envoi email pour invitation ID: ${invitationId}`);
          await processInvitation(supabase, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, meeting, invitationId, guest, BASE_URL);
          
          results.sent += 1;
          console.log(`✅ [EMAIL] Envoyé à ${guest.email} (invitation ID: ${invitationId})`);
          return { success: true, email: guest.email };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`❌ [EMAIL] Échec ${guest.email}:`, {
            message: errorMessage,
            error: error
          });
          results.failed.push({
            email: guest.email,
            name: guest.name || guest.email,
            reason: errorMessage,
            attempts: 1
          });
          return { success: false, email: guest.email, error: errorMessage };
        }
      });
      
      // Attendre que tous les emails du batch soient traités
      await Promise.all(batchPromises);
      
      // Pause entre les batches (sauf pour le dernier) pour éviter la surcharge
      if (batchIndex < chunks.length - 1) {
        console.log(`⏳ [BATCH-${batchIndex + 1}] Pause 1s avant le prochain batch`);
        await wait(1000);
      }
    }
    
    console.log('✅ [SEND-INVITES] Traitement terminé:', {
      total: results.total,
      sent: results.sent,
      failed: results.failed.length
    });
    
    return new Response(
      JSON.stringify({
        success: true,
        results,
        message: `${results.sent}/${results.total} emails envoyés avec succès`
      }),
      { status: 200, headers: corsHeaders }
    );
    
  } catch (error) {
    console.error('❌ [SEND-INVITES] Erreur générale:', error);
    
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








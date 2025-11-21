// 📧 Fonction Netlify pour envoyer des invitations en lot (SANS n8n)
// Utilise le système d'invitations via processInvitation

const { createClient } = require('@supabase/supabase-js');
const { processInvitation } = require('./lib/sendInvitation.cjs');
const crypto = require('crypto');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Chunker helper pour diviser en groupes
function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Attendre un délai
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Fonction pour créer ou récupérer une invitation dans meeting_invitations
async function getOrCreateInvitation(supabase, meetingId, guest) {
  // Vérifier si l'invitation existe déjà (utiliser .maybeSingle() pour éviter erreur si aucune ligne)
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
  const token = crypto.randomBytes(32).toString('base64url');
  
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

exports.handler = async (event, context) => {
  console.log('📧 [SEND-INVITES] Début traitement batch emails');
  
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
    const { meeting, invited } = body;
    
    // Validation des données
    if (!meeting || !meeting.id || !meeting.title || !meeting.room_url) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Meeting data incomplete',
          required: ['id', 'title', 'room_url']
        })
      };
    }
    
    if (!Array.isArray(invited) || invited.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'No invited participants provided'
        })
      };
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
      failed: [],
      batches: chunks.length
    };
    
    // Traiter chaque batch séquentiellement
    for (let batchIndex = 0; batchIndex < chunks.length; batchIndex++) {
      const batch = chunks[batchIndex];
      console.log(`📧 [BATCH-${batchIndex + 1}] Traitement de ${batch.length} emails`);
      
      // Traiter les emails du batch en parallèle
      const batchPromises = batch.map(async (guest) => {
        try {
          console.log(`📧 [BATCH] Traitement invitation pour: ${guest.email}`);
          
          // Créer ou récupérer l'invitation dans meeting_invitations
          const invitationId = await getOrCreateInvitation(supabase, meeting.id, guest);
          
          if (!invitationId) {
            throw new Error('Impossible d\'obtenir l\'ID d\'invitation');
          }
          
          // Envoyer l'email via processInvitation (même système que create-meeting-v3)
          console.log(`📤 [BATCH] Envoi email pour invitation ID: ${invitationId}`);
          await processInvitation(invitationId);
          
          results.sent += 1;
          console.log(`✅ [EMAIL] Envoyé à ${guest.email} (invitation ID: ${invitationId})`);
          return { success: true, email: guest.email };
        } catch (error) {
          const errorMessage = error?.message || error?.toString() || 'Erreur inconnue';
          console.error(`❌ [EMAIL] Échec ${guest.email}:`, {
            message: errorMessage,
            error: error,
            stack: error?.stack
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
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        results,
        message: `${results.sent}/${results.total} emails envoyés avec succès`
      })
    };
    
  } catch (error) {
    console.error('❌ [SEND-INVITES] Erreur générale:', error);
    
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
// 🔗 Proxy enrichi Daily.co → n8n avec données des invités
// Cette fonction reçoit les événements Daily.co et les enrichit avec les données Supabase

const { createClient } = require('@supabase/supabase-js');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async (event, context) => {
  console.log('🔗 [DAILY-PROXY] Webhook Daily.co reçu:', event.httpMethod);
  
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
    // Configuration Supabase
    const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const N8N_EVENTS_WEBHOOK = process.env.REACT_APP_N8N_EVENTS_WEBHOOK;
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      console.error('❌ [DAILY-PROXY] Configuration Supabase manquante');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Configuration Supabase manquante' })
      };
    }
    
    if (!N8N_EVENTS_WEBHOOK) {
      console.error('❌ [DAILY-PROXY] N8N_EVENTS_WEBHOOK manquant');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Configuration n8n manquante' })
      };
    }
    
    // Parser les données Daily.co
    const dailyPayload = JSON.parse(event.body);
    console.log('📥 [DAILY-PROXY] Event Daily.co:', {
      type: dailyPayload.type,
      room_name: dailyPayload.room_name,
      participant: dailyPayload.participant?.user_name || 'undefined'
    });
    
    // Initialiser Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    // Récupérer les données de la réunion depuis Supabase
    let meetingData = null;
    if (dailyPayload.room_name) {
      console.log('🔍 [DAILY-PROXY] Recherche réunion:', dailyPayload.room_name);
      
      const { data: meeting, error } = await supabase
        .from('meetings')
        .select('*')
        .eq('room_name', dailyPayload.room_name)
        .single();
        
      if (error) {
        console.warn('⚠️ [DAILY-PROXY] Réunion non trouvée dans Supabase:', error.message);
      } else {
        meetingData = meeting;
        console.log('✅ [DAILY-PROXY] Réunion trouvée:', {
          id: meeting.id,
          title: meeting.title,
          participants_count: meeting.participants?.length || 0
        });
      }
    }
    
    // Enrichir le payload avec les données des invités
    let enrichedPayload = {
      ...dailyPayload,
      timestamp: new Date().toISOString(),
      source: 'daily_webhook_proxy'
    };
    
    if (meetingData) {
      // Extraire organizer et guests
      const participants = meetingData.participants || [];
      const organizer = participants.find(p => p.role === 'organizer');
      const guests = participants.filter(p => p.role === 'guest');
      
      // Ajouter les données enrichies
      enrichedPayload = {
        ...enrichedPayload,
        // Données de la réunion
        meetingId: meetingData.id,
        meetingTitle: meetingData.title,
        meetingDescription: meetingData.description,
        
        // 📧 Données pour l'email d'invitation
        invited_by: organizer ? organizer.email : null,
        invited_by_name: organizer ? organizer.name : null,
        invited_name: guests.length > 0 ? guests[0].name : null,
        invited_email: guests.length > 0 ? guests[0].email : null,
        
        // Tous les invités
        all_invited: guests.map(g => ({ name: g.name, email: g.email })),
        organizer_info: organizer ? { name: organizer.name, email: organizer.email } : null
      };
      
      console.log('📧 [DAILY-PROXY] Données enrichies:', {
        invited_by: enrichedPayload.invited_by,
        invited_name: enrichedPayload.invited_name,
        invited_email: enrichedPayload.invited_email,
        meetingTitle: enrichedPayload.meetingTitle
      });
    }
    
    // Envoyer vers n8n
    console.log('🚀 [DAILY-PROXY] Envoi vers n8n...');
    const n8nResponse = await fetch(N8N_EVENTS_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(enrichedPayload)
    });
    
    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text();
      console.error('❌ [DAILY-PROXY] Erreur n8n:', n8nResponse.status, errorText);
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({
          error: 'Erreur envoi vers n8n',
          status: n8nResponse.status,
          detail: errorText
        })
      };
    }
    
    const n8nResult = await n8nResponse.json();
    console.log('✅ [DAILY-PROXY] Succès n8n:', {
      workflowId: n8nResult.workflowId || n8nResult.executionId,
      status: n8nResponse.status
    });
    
    // Retourner succès à Daily.co
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Webhook traité avec succès',
        enriched: !!meetingData,
        forwarded_to_n8n: true
      })
    };
    
  } catch (error) {
    console.error('❌ [DAILY-PROXY] Erreur:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Erreur interne',
        message: error.message,
        debug: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};
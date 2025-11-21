// 🔗 Function pour configurer le webhook Daily.co → n8n
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async (event, context) => {
  console.log('🔗 [DAILY-WEBHOOK] Setup webhook Daily.co...');
  
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
    const DAILY_API_KEY = process.env.DAILY_API_KEY || process.env.REACT_APP_DAILY_API_KEY;
    
    if (!DAILY_API_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'DAILY_API_KEY non configurée',
          debug: 'Configure DAILY_API_KEY dans Netlify Environment Variables'
        })
      };
    }
    
    // Configuration du webhook - pointer vers notre proxy enrichi
    const webhookConfig = {
      url: 'https://centrinote.netlify.app/.netlify/functions/daily-webhook-proxy',
      events: [
        'participant.joined',
        'participant.left', 
        'meeting.started',
        'meeting.ended'
      ]
    };
    
    console.log('🎯 [DAILY-WEBHOOK] Configuration:', webhookConfig);
    
    // 1. Vérifier les webhooks existants
    console.log('🔍 [DAILY-WEBHOOK] Vérification webhooks existants...');
    const getResponse = await fetch('https://api.daily.co/v1/webhooks', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${DAILY_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!getResponse.ok) {
      const error = await getResponse.text();
      throw new Error(`GET webhooks failed: ${getResponse.status} - ${error}`);
    }
    
    const existingWebhooks = await getResponse.json();
    console.log('📋 [DAILY-WEBHOOK] Webhooks existants:', existingWebhooks);
    
    // 2. Supprimer les anciens webhooks s'ils existent
    if (existingWebhooks && existingWebhooks.length > 0) {
      console.log('🗑️ [DAILY-WEBHOOK] Suppression anciens webhooks...');
      for (const webhook of existingWebhooks) {
        console.log(`Suppression webhook ID: ${webhook.id}`);
        const deleteResponse = await fetch(`https://api.daily.co/v1/webhooks/${webhook.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${DAILY_API_KEY}`
          }
        });
        
        if (!deleteResponse.ok) {
          console.warn(`⚠️ Erreur suppression webhook ${webhook.id}:`, deleteResponse.status);
        } else {
          console.log(`✅ Webhook ${webhook.id} supprimé`);
        }
      }
    }
    
    // 3. Créer le nouveau webhook
    console.log('🆕 [DAILY-WEBHOOK] Création nouveau webhook...');
    const createResponse = await fetch('https://api.daily.co/v1/webhooks', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DAILY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(webhookConfig)
    });
    
    const createResponseText = await createResponse.text();
    console.log('📡 [DAILY-WEBHOOK] Réponse création:', createResponse.status, createResponseText);
    
    if (!createResponse.ok) {
      return {
        statusCode: createResponse.status,
        headers,
        body: JSON.stringify({
          error: 'Erreur création webhook Daily.co',
          status: createResponse.status,
          detail: createResponseText,
          config: webhookConfig
        })
      };
    }
    
    const newWebhook = JSON.parse(createResponseText);
    console.log('✅ [DAILY-WEBHOOK] Webhook créé:', newWebhook);
    
    // 4. Vérification finale
    const finalCheck = await fetch('https://api.daily.co/v1/webhooks', {
      headers: { 'Authorization': `Bearer ${DAILY_API_KEY}` }
    });
    
    const finalWebhooks = await finalCheck.json();
    console.log('🔍 [DAILY-WEBHOOK] Vérification finale:', finalWebhooks);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        webhook: newWebhook,
        config: webhookConfig,
        verification: finalWebhooks,
        message: 'Webhook Daily.co configuré avec succès'
      })
    };
    
  } catch (error) {
    console.error('❌ [DAILY-WEBHOOK] Erreur:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Erreur interne',
        message: error.message,
        debug: error.stack
      })
    };
  }
};
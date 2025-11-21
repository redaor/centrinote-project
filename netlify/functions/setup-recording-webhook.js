// 🔗 Function pour configurer le webhook d'enregistrement Daily.co au niveau compte
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async (event, context) => {
  console.log('🔗 [SETUP-RECORDING-WEBHOOK] Configuration webhook d\'enregistrement...');
  
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
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

    // URL du webhook (production)
    const BASE_URL = process.env.NETLIFY_URL || process.env.VITE_APP_URL || 'https://centrinote.fr';
    const webhookUrl = `${BASE_URL}/.netlify/functions/daily-webhook-recording`;
    
    console.log('🎯 [SETUP-RECORDING-WEBHOOK] Configuration:', webhookUrl);
    
    // 1. Vérifier les webhooks existants
    console.log('🔍 [SETUP-RECORDING-WEBHOOK] Vérification webhooks existants...');
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
    console.log('📋 [SETUP-RECORDING-WEBHOOK] Webhooks existants:', existingWebhooks);
    
    // 2. Vérifier si un webhook pour recording existe déjà
    const recordingWebhook = existingWebhooks?.find(w => 
      w.url === webhookUrl && 
      w.events && 
      (w.events.includes('recording.started') || w.events.includes('recording.completed'))
    );
    
    if (recordingWebhook) {
      console.log('✅ [SETUP-RECORDING-WEBHOOK] Webhook d\'enregistrement existe déjà:', recordingWebhook.id);
      
      // Vérifier si tous les événements sont présents
      const hasStarted = recordingWebhook.events.includes('recording.started');
      const hasCompleted = recordingWebhook.events.includes('recording.completed');
      
      if (hasStarted && hasCompleted) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'Webhook d\'enregistrement déjà configuré',
            webhook: recordingWebhook
          })
        };
      } else {
        // Mettre à jour le webhook pour ajouter les événements manquants
        console.log('🔄 [SETUP-RECORDING-WEBHOOK] Mise à jour webhook pour ajouter événements manquants...');
        const updatedEvents = [...new Set([
          ...(recordingWebhook.events || []),
          'recording.started',
          'recording.completed'
        ])];
        
        const updateResponse = await fetch(`https://api.daily.co/v1/webhooks/${recordingWebhook.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${DAILY_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            url: webhookUrl,
            events: updatedEvents
          })
        });
        
        if (!updateResponse.ok) {
          const error = await updateResponse.text();
          throw new Error(`Update webhook failed: ${updateResponse.status} - ${error}`);
        }
        
        const updatedWebhook = await updateResponse.json();
        console.log('✅ [SETUP-RECORDING-WEBHOOK] Webhook mis à jour:', updatedWebhook);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'Webhook d\'enregistrement mis à jour',
            webhook: updatedWebhook
          })
        };
      }
    }
    
    // 3. Créer un nouveau webhook pour les enregistrements
    console.log('🆕 [SETUP-RECORDING-WEBHOOK] Création nouveau webhook d\'enregistrement...');
    const createResponse = await fetch('https://api.daily.co/v1/webhooks', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DAILY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: webhookUrl,
        events: ['recording.started', 'recording.completed']
      })
    });
    
    if (!createResponse.ok) {
      const error = await createResponse.text();
      throw new Error(`Create webhook failed: ${createResponse.status} - ${error}`);
    }
    
    const newWebhook = await createResponse.json();
    console.log('✅ [SETUP-RECORDING-WEBHOOK] Webhook créé:', newWebhook);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Webhook d\'enregistrement configuré avec succès',
        webhook: newWebhook
      })
    };
    
  } catch (error) {
    console.error('❌ [SETUP-RECORDING-WEBHOOK] Erreur:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Erreur configuration webhook',
        message: error.message
      })
    };
  }
};


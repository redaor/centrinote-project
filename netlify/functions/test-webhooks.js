// 🔗 Test des webhooks n8n et configuration
exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Variables d'environnement
    const N8N_EVENTS_WEBHOOK = process.env.REACT_APP_N8N_EVENTS_WEBHOOK;
    const N8N_RECORDING_WEBHOOK = process.env.REACT_APP_N8N_RECORDING_WEBHOOK;
    const DAILY_API_KEY = process.env.DAILY_API_KEY;

    console.log('🔗 [TEST-WEBHOOKS] Test des webhooks...');

    const config = {
      webhooks: {
        events: {
          configured: !!N8N_EVENTS_WEBHOOK,
          url: N8N_EVENTS_WEBHOOK || null,
          valid: N8N_EVENTS_WEBHOOK?.startsWith('https://') || false
        },
        recording: {
          configured: !!N8N_RECORDING_WEBHOOK,
          url: N8N_RECORDING_WEBHOOK || null,
          valid: N8N_RECORDING_WEBHOOK?.startsWith('https://') || false
        }
      },
      daily: {
        hasApiKey: !!DAILY_API_KEY
      }
    };

    // Test de connexion au webhook events
    if (N8N_EVENTS_WEBHOOK) {
      try {
        console.log('📡 [TEST-WEBHOOKS] Test connexion webhook events...');
        const response = await fetch(N8N_EVENTS_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            test: true,
            event: 'connection_test',
            timestamp: new Date().toISOString()
          })
        });
        
        config.webhooks.events.testStatus = response.status;
        config.webhooks.events.testResponse = await response.text();
        
        console.log('✅ [TEST-WEBHOOKS] Test webhook events:', response.status);
      } catch (error) {
        config.webhooks.events.testError = error.message;
        console.error('❌ [TEST-WEBHOOKS] Erreur test webhook events:', error);
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        config,
        message: 'Test webhooks terminé'
      })
    };

  } catch (error) {
    console.error('❌ [TEST-WEBHOOKS] Erreur:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Erreur test webhooks',
        message: error.message
      })
    };
  }
};
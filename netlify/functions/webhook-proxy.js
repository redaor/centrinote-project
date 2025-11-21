// 🚀 Proxy Netlify pour résoudre les problèmes CORS des webhooks
exports.handler = async (event, context) => {
  console.log('🎯 [WEBHOOK-PROXY] Requête reçue:', {
    method: event.httpMethod,
    headers: event.headers,
    hasBody: !!event.body,
    bodyLength: event.body?.length
  });

  // Gérer les requêtes CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Max-Age': '86400'
      },
      body: ''
    };
  }

  // Vérifier la méthode
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        success: false, 
        error: 'Method not allowed' 
      })
    };
  }

  try {
    // Parser le body
    let payload;
    try {
      payload = JSON.parse(event.body || '{}');
    } catch (parseError) {
      console.error('❌ [WEBHOOK-PROXY] Erreur parsing JSON:', parseError);
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          success: false, 
          error: 'Invalid JSON payload' 
        })
      };
    }

    console.log('📦 [WEBHOOK-PROXY] Payload reçu:', {
      event: payload.event,
      hasData: !!payload.data,
      targetUrl: payload.targetUrl,
      timestamp: payload.timestamp
    });

    // Vérifier que targetUrl est fournie
    if (!payload.targetUrl) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          success: false, 
          error: 'targetUrl is required' 
        })
      };
    }

    // Extraire targetUrl et nettoyer le payload
    const { targetUrl, ...webhookPayload } = payload;

    const startTime = Date.now();

    // Envoyer vers le webhook n8n
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Centrinote-Proxy/1.0'
      },
      body: JSON.stringify(webhookPayload)
    });

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      console.error('❌ [WEBHOOK-PROXY] Webhook failed:', {
        status: response.status,
        statusText: response.statusText,
        url: targetUrl,
        responseTime
      });

      return {
        statusCode: response.status,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          success: false, 
          error: `Webhook failed: ${response.status} ${response.statusText}`,
          responseTime
        })
      };
    }

    // Lire la réponse du webhook
    let webhookResult;
    try {
      webhookResult = await response.json();
    } catch (jsonError) {
      console.warn('⚠️ [WEBHOOK-PROXY] Webhook response not JSON, using text');
      webhookResult = { message: await response.text() };
    }

    console.log('✅ [WEBHOOK-PROXY] Webhook success:', {
      status: response.status,
      responseTime,
      workflowId: webhookResult.workflowId || webhookResult.executionId,
      event: payload.event
    });

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        responseTime,
        workflowId: webhookResult.workflowId || webhookResult.executionId,
        result: webhookResult
      })
    };

  } catch (error) {
    console.error('❌ [WEBHOOK-PROXY] Erreur générale:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error' 
      })
    };
  }
};
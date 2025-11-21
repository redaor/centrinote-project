// 🧪 Test ultra-simple pour vérifier Daily.co
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
    const DAILY_API_KEY = process.env.DAILY_API_KEY;
    
    if (!DAILY_API_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'DAILY_API_KEY manquante' })
      };
    }

    console.log('🧪 Test Daily.co API...');

    // Test simple : lister les salles existantes
    const response = await fetch('https://api.daily.co/v1/rooms', {
      headers: {
        'Authorization': `Bearer ${DAILY_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.text();
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        status: response.status,
        hasApiKey: true,
        response: data.substring(0, 500) // Limiter la réponse
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Test failed',
        message: error.message
      })
    };
  }
};
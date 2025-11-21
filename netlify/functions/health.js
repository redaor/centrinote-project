// 🚀 Netlify Function - Health Check
// Endpoint serverless pour vérifier le statut de l'API
// ===============================================

// 🌐 Headers CORS pour Netlify
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json'
};

// 🚀 Handler principal Netlify Function
exports.handler = async (event, context) => {
  console.log('🏥 Netlify Function - Health endpoint appelé');

  // Gestion des requêtes OPTIONS (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'CORS preflight OK' })
    };
  }

  // Seul GET est supporté
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Method Not Allowed',
        message: `Method ${event.httpMethod} not supported`,
        supportedMethods: ['GET', 'OPTIONS']
      })
    };
  }

  try {
    const startTime = Date.now();
    
    // Données de santé
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      serverless: true,
      platform: 'netlify',
      functions: {
        reports: true,
        health: true,
        'generate-key': true
      },
      endpoints: {
        reports: '/.netlify/functions/reports',
        health: '/.netlify/functions/health',
        'generate-key': '/.netlify/functions/generate-key'
      },
      database: {
        provider: 'supabase',
        connected: !!process.env.VITE_SUPABASE_URL
      },
      responseTime: `${Date.now() - startTime}ms`
    };

    console.log('✅ Health check réussi:', {
      timestamp: healthData.timestamp,
      responseTime: healthData.responseTime,
      serverless: true
    });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(healthData)
    };

  } catch (error) {
    console.error('❌ Erreur health check:', error);
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Internal Server Error',
        message: 'Health check failed',
        serverless: true
      })
    };
  }
};
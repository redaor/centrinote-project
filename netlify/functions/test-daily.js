// 🧪 Fonction de test pour diagnostiquer Daily.co
exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Gérer OPTIONS
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  console.log('🧪 [TEST-DAILY] Fonction appelée');

  // Vérifier les variables d'environnement
  const config = {
    hasDailyKey: !!process.env.DAILY_API_KEY,
    hasDailyDomain: !!process.env.REACT_APP_DAILY_DOMAIN,
    hasSupabaseUrl: !!process.env.REACT_APP_SUPABASE_URL,
    hasSupabaseKey: !!process.env.REACT_APP_SUPABASE_ANON_KEY,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasN8nEvents: !!process.env.REACT_APP_N8N_EVENTS_WEBHOOK,
    hasN8nRecording: !!process.env.REACT_APP_N8N_RECORDING_WEBHOOK,
    // Versions VITE au cas où
    hasViteDailyKey: !!process.env.VITE_DAILY_API_KEY,
    hasViteSupabaseUrl: !!process.env.VITE_SUPABASE_URL,
    // Info environnement
    nodeEnv: process.env.NODE_ENV,
    isNetlify: !!process.env.NETLIFY,
    functionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
    // Nombre total de variables
    totalEnvVars: Object.keys(process.env).length
  };

  // Test Daily.co API si la clé existe
  let dailyTest = { status: 'not_tested' };
  
  if (process.env.DAILY_API_KEY) {
    try {
      console.log('🔑 Test avec Daily.co API...');
      const response = await fetch('https://api.daily.co/v1/rooms', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.DAILY_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      dailyTest = {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      };
      
      if (!response.ok) {
        const errorText = await response.text();
        dailyTest.error = errorText.substring(0, 200); // Premiers 200 caractères
      }
    } catch (error) {
      dailyTest = {
        status: 'error',
        message: error.message
      };
    }
  } else {
    dailyTest = {
      status: 'no_api_key',
      message: 'DAILY_API_KEY non configurée'
    };
  }

  // Test Supabase si configuré
  let supabaseTest = { status: 'not_tested' };
  
  const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (supabaseUrl && supabaseKey) {
    try {
      console.log('🗄️ Test connexion Supabase...');
      const response = await fetch(`${supabaseUrl}/rest/v1/meetings?limit=1`, {
        method: 'GET',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      });
      
      supabaseTest = {
        status: response.status,
        ok: response.ok,
        hasTable: response.status !== 404
      };
    } catch (error) {
      supabaseTest = {
        status: 'error',
        message: error.message
      };
    }
  } else {
    supabaseTest = {
      status: 'not_configured',
      message: 'Supabase URL ou Service Key manquante'
    };
  }

  const result = {
    success: true,
    timestamp: new Date().toISOString(),
    environment: config,
    dailyTest,
    supabaseTest,
    debug: {
      method: event.httpMethod,
      path: event.path,
      hasBody: !!event.body
    }
  };

  console.log('✅ [TEST-DAILY] Résultat:', JSON.stringify(result, null, 2));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(result, null, 2)
  };
};
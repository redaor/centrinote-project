// 🧪 Version ultra-simple pour tester Daily.co
exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

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
    console.log('🧪 [SIMPLE] Fonction appelée');
    
    // Variables
    const DAILY_API_KEY = process.env.DAILY_API_KEY;
    
    if (!DAILY_API_KEY) {
      console.error('❌ [SIMPLE] DAILY_API_KEY manquante');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'DAILY_API_KEY non configurée',
          debug: 'Vérifiez les variables Netlify Dashboard'
        })
      };
    }

    // Données de test minimales
    const roomName = `test-${Date.now()}`;
    
    console.log('🏠 [SIMPLE] Création salle:', roomName);

    // Configuration minimaliste Daily.co - SANS WEBHOOKS
    const roomConfig = {
      name: roomName,
      privacy: 'public',  // Changé en public pour éviter les problèmes d'autorisation
      properties: {
        enable_recording: 'cloud',
        enable_chat: true,
        enable_screenshare: true,
        enable_knocking: false,  // Accès direct sans autorisation
        start_video_off: false,  // Vidéo activée par défaut
        start_audio_off: false,  // Audio activé par défaut
        max_participants: 10,
        lang: 'fr',
        exp: Math.floor(Date.now() / 1000) + (2 * 60 * 60) // 2h
        // PAS DE WEBHOOKS pour éviter les erreurs
      }
    };

    console.log('📤 [SIMPLE] Config envoyée:', JSON.stringify(roomConfig, null, 2));

    // Appel Daily.co API
    const response = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DAILY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(roomConfig)
    });

    console.log('📡 [SIMPLE] Response status:', response.status);
    
    const responseText = await response.text();
    console.log('📄 [SIMPLE] Response body:', responseText);

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ 
          error: 'Erreur Daily.co',
          status: response.status,
          details: responseText,
          sentConfig: roomConfig
        })
      };
    }

    const roomData = JSON.parse(responseText);
    
    console.log('✅ [SIMPLE] Salle créée:', roomData.name);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        roomName: roomData.name,
        roomUrl: roomData.url,
        message: 'Salle Daily.co créée avec succès',
        debug: {
          configSent: roomConfig,
          responseReceived: roomData
        }
      })
    };

  } catch (error) {
    console.error('❌ [SIMPLE] Erreur:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Erreur interne',
        message: error.message,
        stack: error.stack
      })
    };
  }
};
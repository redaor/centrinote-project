// 📋 CRUD pour les résumés de réunions
// Version: 1.0.1 - Force redeploy
const { createClient } = require('@supabase/supabase-js');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async (event, context) => {
  console.log('📋 [SUMMARIES-CRUD] Fonction appelée:', event.httpMethod, event.path);

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Configuration Supabase manquante' })
      };
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Extraire l'ID depuis le path
    // Path format: /.netlify/functions/summaries-crud/{meetingId}
    const pathParts = event.path.split('/');
    const meetingId = pathParts[pathParts.length - 1];

    if (!meetingId || meetingId === 'summaries-crud') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'meetingId requis dans le path' })
      };
    }

    console.log('📊 [SUMMARIES-CRUD] Meeting ID:', meetingId);

    // GET /summaries-crud/:id
    if (event.httpMethod === 'GET') {
      const { data, error } = await supabase
        .from('meeting_summaries')
        .select('*')
        .eq('meeting_id', meetingId)
        .single();

      if (error || !data) {
        console.log('⚠️ [SUMMARIES-CRUD] Résumé non trouvé pour meeting:', meetingId);
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Pas encore de résumé', meetingId })
        };
      }

      console.log('✅ [SUMMARIES-CRUD] Résumé trouvé');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(data)
      };
    }

    // PATCH /summaries-crud/:id (validation)
    if (event.httpMethod === 'PATCH') {
      const body = JSON.parse(event.body || '{}');
      const { validated } = body;

      // Récupérer l'utilisateur depuis les headers (si disponible)
      let userId = null;
      try {
        const authHeader = event.headers.authorization || event.headers.Authorization;
        if (authHeader) {
          // Format: Bearer {token} ou directement {user_id}
          const token = authHeader.replace('Bearer ', '');
          // Ici tu pourrais décoder le token JWT pour obtenir l'user_id
          // Pour l'instant, on accepte directement l'user_id dans le body
          userId = body.userId || token;
        }
      } catch (e) {
        console.warn('⚠️ [SUMMARIES-CRUD] Erreur parsing auth:', e.message);
      }

      const updateData = {
        validated: validated !== undefined ? validated : true,
        validated_at: new Date().toISOString()
      };

      if (userId) {
        updateData.validated_by = userId;
      }

      const { data, error } = await supabase
        .from('meeting_summaries')
        .update(updateData)
        .eq('meeting_id', meetingId)
        .select()
        .single();

      if (error) {
        console.error('❌ [SUMMARIES-CRUD] Erreur mise à jour:', error.message);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: error.message })
        };
      }

      console.log('✅ [SUMMARIES-CRUD] Résumé mis à jour');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, data })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };

  } catch (error) {
    console.error('❌ [SUMMARIES-CRUD] Erreur:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Erreur interne',
        message: error.message
      })
    };
  }
};

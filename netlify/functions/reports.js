// 🚀 Netlify Function - Réception Rapports n8n
// Endpoint serverless pour recevoir les rapports de réunion
// ========================================================

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// 🔐 Configuration Supabase
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// 🔑 Validation des clés API (serverless)
async function validateApiKey(apiKey) {
  try {
    if (!apiKey || !apiKey.startsWith('cnt_live_')) {
      return { valid: false, error: 'Invalid API key format' };
    }

    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    
    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('key_hash', keyHash)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('🔍 Supabase validation error:', error);
      return { valid: false, error: `Database error: ${error.message}` };
    }
    
    if (!data) {
      console.error('🔍 API key not found in database:', { keyHash: keyHash.substring(0, 10) + '...' });
      return { valid: false, error: 'API key not found or inactive' };
    }

    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return { valid: false, error: 'API key expired' };
    }

    // Mettre à jour usage (fire-and-forget en serverless)
    supabase
      .from('api_keys')
      .update({ 
        last_used: new Date().toISOString(),
        usage_count: (data.usage_count || 0) + 1
      })
      .eq('id', data.id)
      .then(() => {}).catch(() => {});

    return { 
      valid: true, 
      keyData: {
        id: data.id,
        name: data.name,
        permissions: data.permissions || ['reports:write']
      }
    };
  } catch (error) {
    return { valid: false, error: 'Internal validation error' };
  }
}

// 📝 Validation des données
function validateReportData(data) {
  const errors = [];
  
  if (!data.reportId || typeof data.reportId !== 'string') {
    errors.push('reportId is required and must be a string');
  }
  
  if (!data.roomName || typeof data.roomName !== 'string') {
    errors.push('roomName is required and must be a string');
  }
  
  if (!data.reportData) {
    errors.push('reportData is required');
  }
  
  if (typeof data.reportData === 'string') {
    try {
      JSON.parse(data.reportData);
    } catch {
      errors.push('reportData must be valid JSON if provided as string');
    }
  }
  
  return errors;
}

// 🌐 Headers CORS pour Netlify
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json'
};

// 🚀 Handler principal Netlify Function
exports.handler = async (event, context) => {
  console.log('📥 Netlify Function - Reports endpoint appelé');
  console.log('Method:', event.httpMethod);
  console.log('Headers:', event.headers);

  // Gestion des requêtes OPTIONS (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'CORS preflight OK' })
    };
  }

  // GET - Récupérer les rapports
  if (event.httpMethod === 'GET') {
    try {
      const authHeader = event.headers.authorization || event.headers.Authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return {
          statusCode: 401,
          headers: corsHeaders,
          body: JSON.stringify({
            error: 'Unauthorized',
            message: 'Missing or invalid Bearer token'
          })
        };
      }

      const apiKey = authHeader.substring(7);
      const validation = await validateApiKey(apiKey);

      if (!validation.valid) {
        return {
          statusCode: 401,
          headers: corsHeaders,
          body: JSON.stringify({
            error: 'Unauthorized',
            message: validation.error
          })
        };
      }

      // Parse query parameters
      const params = event.queryStringParameters || {};
      const limit = parseInt(params.limit) || 50;
      const offset = parseInt(params.offset) || 0;

      let query = supabase
        .from('meeting_reports')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      // Filtres optionnels
      if (params.roomName) {
        query = query.eq('room_name', params.roomName);
      }
      if (params.reportType) {
        query = query.eq('report_type', params.reportType);
      }
      if (params.startDate) {
        query = query.gte('created_at', params.startDate);
      }
      if (params.endDate) {
        query = query.lte('created_at', params.endDate);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Erreur récupération rapports:', error);
        return {
          statusCode: 500,
          headers: corsHeaders,
          body: JSON.stringify({
            error: 'Query Error',
            message: 'Failed to retrieve reports'
          })
        };
      }

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          data: data || [],
          pagination: {
            limit,
            offset,
            total: data?.length || 0
          }
        })
      };

    } catch (error) {
      console.error('❌ Erreur GET reports:', error);
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Internal Server Error',
          message: 'Failed to process request'
        })
      };
    }
  }

  // POST - Recevoir un nouveau rapport
  if (event.httpMethod === 'POST') {
    try {
      const authHeader = event.headers.authorization || event.headers.Authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return {
          statusCode: 401,
          headers: corsHeaders,
          body: JSON.stringify({
            error: 'Unauthorized',
            message: 'Missing or invalid Bearer token'
          })
        };
      }

      const apiKey = authHeader.substring(7);
      const validation = await validateApiKey(apiKey);

      if (!validation.valid) {
        return {
          statusCode: 401,
          headers: corsHeaders,
          body: JSON.stringify({
            error: 'Unauthorized',
            message: validation.error
          })
        };
      }

      // Parse body
      let body;
      try {
        body = JSON.parse(event.body);
      } catch {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({
            error: 'Bad Request',
            message: 'Invalid JSON body'
          })
        };
      }

      console.log('📥 Réception rapport depuis n8n:', {
        reportId: body.reportId,
        roomName: body.roomName,
        timestamp: new Date().toISOString(),
        apiKeyId: validation.keyData.id
      });

      // Validation des données
      const validationErrors = validateReportData(body);
      if (validationErrors.length > 0) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({
            error: 'Validation Error',
            message: 'Invalid request data',
            details: validationErrors
          })
        };
      }

      const {
        reportId,
        roomName,
        reportData,
        participantEmails,
        metadata = {},
        reportType = 'meeting_report'
      } = body;

      // Préparer les données
      const reportRecord = {
        report_id: reportId,
        room_name: roomName,
        report_type: reportType,
        report_data: typeof reportData === 'string' ? JSON.parse(reportData) : reportData,
        participant_emails: participantEmails ? 
          participantEmails.split(',').map(email => email.trim()) : [],
        metadata: {
          ...metadata,
          received_at: new Date().toISOString(),
          api_key_id: validation.keyData.id,
          source: 'n8n_workflow',
          serverless: true
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Stocker en Supabase
      const { data, error } = await supabase
        .from('meeting_reports')
        .insert(reportRecord)
        .select()
        .single();

      if (error) {
        console.error('❌ Erreur stockage rapport:', error);
        return {
          statusCode: 500,
          headers: corsHeaders,
          body: JSON.stringify({
            error: 'Storage Error',
            message: 'Failed to store report',
            reportId
          })
        };
      }

      console.log('✅ Rapport stocké avec succès:', data.id);

      return {
        statusCode: 201,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          message: 'Report received and stored successfully',
          data: {
            id: data.id,
            reportId: reportId,
            roomName: roomName,
            storedAt: data.created_at,
            participantCount: reportRecord.participant_emails.length,
            serverless: true
          }
        })
      };

    } catch (error) {
      console.error('❌ Erreur traitement rapport:', error);
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Internal Server Error',
          message: 'Report processing failed',
          reportId: JSON.parse(event.body || '{}').reportId || 'unknown'
        })
      };
    }
  }

  // Méthode non supportée
  return {
    statusCode: 405,
    headers: corsHeaders,
    body: JSON.stringify({
      error: 'Method Not Allowed',
      message: `Method ${event.httpMethod} not supported`,
      supportedMethods: ['GET', 'POST', 'OPTIONS']
    })
  };
};
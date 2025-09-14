// 🚀 Netlify Function - Génération Clés API
// Endpoint serverless pour créer et gérer les clés API
// =================================================

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// 🔐 Configuration Supabase
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// 🔑 Générateur de clés API sécurisées
function generateApiKey() {
  const randomBytes = crypto.randomBytes(32);
  const keyBody = randomBytes.toString('hex');
  const apiKey = `cnt_live_${keyBody}`;
  
  return {
    key: apiKey,
    hash: crypto.createHash('sha256').update(apiKey).digest('hex'),
    prefix: 'cnt_live_'
  };
}

// 🔐 Validation du master token (pour sécuriser la génération)
function validateMasterToken(token) {
  const expectedToken = process.env.MASTER_API_TOKEN;
  return expectedToken && token === expectedToken;
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
  console.log('🔑 Netlify Function - Generate Key endpoint appelé');
  console.log('Method:', event.httpMethod);

  // Gestion des requêtes OPTIONS (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'CORS preflight OK' })
    };
  }

  // GET - Lister les clés existantes (avec master token)
  if (event.httpMethod === 'GET') {
    try {
      const authHeader = event.headers.authorization || event.headers.Authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return {
          statusCode: 401,
          headers: corsHeaders,
          body: JSON.stringify({
            error: 'Unauthorized',
            message: 'Master token required for key management'
          })
        };
      }

      const masterToken = authHeader.substring(7);
      if (!validateMasterToken(masterToken)) {
        return {
          statusCode: 401,
          headers: corsHeaders,
          body: JSON.stringify({
            error: 'Unauthorized',
            message: 'Invalid master token'
          })
        };
      }

      // Récupérer toutes les clés (sans les hashes)
      const { data, error } = await supabase
        .from('api_keys')
        .select('id, name, key_prefix, permissions, is_active, expires_at, usage_count, last_used, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erreur récupération clés:', error);
        return {
          statusCode: 500,
          headers: corsHeaders,
          body: JSON.stringify({
            error: 'Database Error',
            message: 'Failed to retrieve API keys'
          })
        };
      }

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          data: data || [],
          count: data?.length || 0
        })
      };

    } catch (error) {
      console.error('❌ Erreur GET keys:', error);
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

  // POST - Créer une nouvelle clé API
  if (event.httpMethod === 'POST') {
    try {
      const authHeader = event.headers.authorization || event.headers.Authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return {
          statusCode: 401,
          headers: corsHeaders,
          body: JSON.stringify({
            error: 'Unauthorized',
            message: 'Master token required for key generation'
          })
        };
      }

      const masterToken = authHeader.substring(7);
      if (!validateMasterToken(masterToken)) {
        return {
          statusCode: 401,
          headers: corsHeaders,
          body: JSON.stringify({
            error: 'Unauthorized',
            message: 'Invalid master token'
          })
        };
      }

      // Parse body
      let body;
      try {
        body = JSON.parse(event.body || '{}');
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

      const {
        name,
        permissions = ['reports:write'],
        expiresIn = null, // en jours
        metadata = {}
      } = body;

      if (!name || typeof name !== 'string') {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({
            error: 'Validation Error',
            message: 'Name is required and must be a string'
          })
        };
      }

      // Générer la nouvelle clé
      const { key, hash, prefix } = generateApiKey();
      
      // Calculer la date d'expiration
      let expiresAt = null;
      if (expiresIn && typeof expiresIn === 'number') {
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiresIn);
      }

      // Créer l'enregistrement
      const keyRecord = {
        name,
        key_hash: hash,
        key_prefix: prefix,
        permissions,
        is_active: true,
        expires_at: expiresAt?.toISOString() || null,
        usage_count: 0,
        metadata: {
          ...metadata,
          created_via: 'netlify_function',
          serverless: true,
          generated_at: new Date().toISOString()
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('🔑 Génération nouvelle clé API:', {
        name,
        prefix,
        expiresAt: expiresAt?.toISOString() || 'never',
        permissions
      });

      // Stocker en Supabase
      const { data, error } = await supabase
        .from('api_keys')
        .insert(keyRecord)
        .select('id, name, key_prefix, permissions, is_active, expires_at, created_at')
        .single();

      if (error) {
        console.error('❌ Erreur stockage clé:', error);
        console.error('📊 Détails erreur Supabase:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        return {
          statusCode: 500,
          headers: corsHeaders,
          body: JSON.stringify({
            error: 'Storage Error',
            message: `Failed to store API key: ${error.message}`,
            details: error.code,
            supabaseError: true
          })
        };
      }

      console.log('✅ Clé API créée avec succès:', data.id);

      return {
        statusCode: 201,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          message: 'API key generated successfully',
          data: {
            id: data.id,
            name: data.name,
            key: key, // ⚠️ Seule fois où la clé est retournée en clair
            keyPreview: `${prefix}...${key.slice(-8)}`,
            permissions: data.permissions,
            expiresAt: data.expires_at,
            createdAt: data.created_at,
            serverless: true
          },
          warning: 'Store this key securely. It will not be shown again.'
        })
      };

    } catch (error) {
      console.error('❌ Erreur génération clé:', error);
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Internal Server Error',
          message: 'Key generation failed'
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
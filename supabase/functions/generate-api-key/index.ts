import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// 🔐 Configuration
const MASTER_API_TOKEN = Deno.env.get('MASTER_API_TOKEN');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// Client Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Origines autorisées pour CORS
const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://localhost:3000',
  'https://centrinote.fr',
  'https://www.centrinote.fr',
]);

// Headers CORS
function buildCorsHeaders(origin: string | null, includeContentType = true): HeadersInit {
  const allowedOrigin = origin && allowedOrigins.has(origin) ? origin : '*';
  const headers: HeadersInit = {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };

  if (includeContentType) {
    headers['Content-Type'] = 'application/json';
  }

  return headers;
}

// 🔑 Générateur de clés API sécurisées
async function generateApiKey() {
  // Utiliser crypto Web API de Deno
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  const keyBody = Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  const apiKey = `cnt_live_${keyBody}`;

  // Hash SHA-256 (asynchrone dans Deno)
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return {
    key: apiKey,
    hash: hash,
    prefix: 'cnt_live_',
  };
}

// 🔐 Validation du master token
function validateMasterToken(token: string | null): boolean {
  if (!token || !MASTER_API_TOKEN) {
    return false;
  }
  return token === MASTER_API_TOKEN;
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = buildCorsHeaders(origin, true);

  // Gestion OPTIONS (preflight CORS)
  if (req.method === 'OPTIONS') {
    const preflightHeaders = buildCorsHeaders(origin, false);
    return new Response(null, { status: 204, headers: preflightHeaders });
  }

  try {
    // GET - Lister les clés existantes
    if (req.method === 'GET') {
      const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(
          JSON.stringify({
            error: 'Unauthorized',
            message: 'Master token required for key management',
          }),
          { status: 401, headers: corsHeaders }
        );
      }

      const masterToken = authHeader.substring(7);
      if (!validateMasterToken(masterToken)) {
        return new Response(
          JSON.stringify({
            error: 'Unauthorized',
            message: 'Invalid master token',
          }),
          { status: 401, headers: corsHeaders }
        );
      }

      // Récupérer toutes les clés (sans les hashes)
      const { data, error } = await supabase
        .from('api_keys')
        .select('id, name, key_prefix, permissions, is_active, expires_at, usage_count, last_used, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erreur récupération clés:', error);
        return new Response(
          JSON.stringify({
            error: 'Database Error',
            message: 'Failed to retrieve API keys',
          }),
          { status: 500, headers: corsHeaders }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: data || [],
          count: data?.length || 0,
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    // POST - Créer une nouvelle clé API
    if (req.method === 'POST') {
      const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(
          JSON.stringify({
            error: 'Unauthorized',
            message: 'Master token required for key generation',
          }),
          { status: 401, headers: corsHeaders }
        );
      }

      const masterToken = authHeader.substring(7);
      if (!validateMasterToken(masterToken)) {
        return new Response(
          JSON.stringify({
            error: 'Unauthorized',
            message: 'Invalid master token',
          }),
          { status: 401, headers: corsHeaders }
        );
      }

      // Parse body
      let body: any;
      try {
        body = await req.json();
      } catch {
        return new Response(
          JSON.stringify({
            error: 'Bad Request',
            message: 'Invalid JSON body',
          }),
          { status: 400, headers: corsHeaders }
        );
      }

      const {
        name,
        permissions = ['reports:write'],
        expiresIn = null, // en jours
        metadata = {},
      } = body;

      if (!name || typeof name !== 'string') {
        return new Response(
          JSON.stringify({
            error: 'Validation Error',
            message: 'Name is required and must be a string',
          }),
          { status: 400, headers: corsHeaders }
        );
      }

      // Générer la nouvelle clé
      const { key, hash, prefix } = await generateApiKey();

      // Calculer la date d'expiration
      let expiresAt: string | null = null;
      if (expiresIn && typeof expiresIn === 'number') {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + expiresIn);
        expiresAt = expiryDate.toISOString();
      }

      // Créer l'enregistrement
      const keyRecord = {
        name,
        key_hash: hash,
        key_prefix: prefix,
        permissions,
        is_active: true,
        expires_at: expiresAt,
        usage_count: 0,
        metadata: {
          ...metadata,
          created_via: 'supabase_edge_function',
          serverless: true,
          generated_at: new Date().toISOString(),
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log('🔑 Génération nouvelle clé API:', {
        name,
        prefix,
        expiresAt: expiresAt || 'never',
        permissions,
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
          hint: error.hint,
        });
        return new Response(
          JSON.stringify({
            error: 'Storage Error',
            message: `Failed to store API key: ${error.message}`,
            details: error.code,
            supabaseError: true,
          }),
          { status: 500, headers: corsHeaders }
        );
      }

      console.log('✅ Clé API créée avec succès:', data.id);

      return new Response(
        JSON.stringify({
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
            serverless: true,
          },
          warning: 'Store this key securely. It will not be shown again.',
        }),
        { status: 201, headers: corsHeaders }
      );
    }

    // Méthode non supportée
    return new Response(
      JSON.stringify({
        error: 'Method Not Allowed',
        message: `Method ${req.method} not supported`,
        supportedMethods: ['GET', 'POST', 'OPTIONS'],
      }),
      { status: 405, headers: corsHeaders }
    );
  } catch (error) {
    console.error('❌ Erreur générique:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});


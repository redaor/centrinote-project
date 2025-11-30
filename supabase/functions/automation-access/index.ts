// =====================================================
// AUTOMATION ACCESS - Edge Function sécurisée
// Vérifie l'accès utilisateur aux automatisations
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
};

interface AutomationAccessResponse {
  user_id: string;
  has_access: boolean;
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  try {
    console.log('🔐 [AUTOMATION-ACCESS] Request received');

    // Récupérer le token JWT depuis le header Authorization
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('⚠️ [AUTOMATION-ACCESS] No Authorization header');
      return new Response(
        JSON.stringify({
          user_id: '',
          has_access: false,
          error: 'Missing or invalid Authorization header'
        } as AutomationAccessResponse),
        { status: 401, headers: corsHeaders }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Initialiser Supabase avec le service role pour vérifier le token
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://wjzlicokhxitmeoxkjzv.supabase.co';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseServiceKey) {
      console.error('❌ [AUTOMATION-ACCESS] SUPABASE_SERVICE_ROLE_KEY not set');
      return new Response(
        JSON.stringify({
          user_id: '',
          has_access: false,
          error: 'Server configuration error'
        } as AutomationAccessResponse),
        { status: 500, headers: corsHeaders }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Vérifier le token et récupérer l'utilisateur
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.warn('⚠️ [AUTOMATION-ACCESS] Invalid token:', userError?.message);
      return new Response(
        JSON.stringify({
          user_id: '',
          has_access: false,
          error: 'Invalid or expired token'
        } as AutomationAccessResponse),
        { status: 401, headers: corsHeaders }
      );
    }

    // Vérifier si l'utilisateur a accès aux automatisations
    // (Vous pouvez ajouter votre logique métier ici)
    // Pour l'instant, on considère que tous les utilisateurs authentifiés ont accès
    const hasAccess = true; // TODO: Ajouter votre logique de vérification d'accès

    // Logger côté serveur
    console.log(`✅ [AUTOMATION-ACCESS] User ${user.id} - Access: ${hasAccess}`);

    // Optionnel: Logger dans error_logs (niveau info)
    try {
      await supabase.from('error_logs').insert({
        user_id: user.id,
        message: `Automation access check - Access: ${hasAccess}`,
        level: 'info',
        source: 'edge-function',
        meta: {
          function: 'automation-access',
          endpoint: '/api/user/automation-access',
          has_access: hasAccess
        }
      });
    } catch (logError) {
      // Ne pas faire échouer la requête si le log échoue
      console.warn('⚠️ [AUTOMATION-ACCESS] Could not log to error_logs:', logError);
    }

    // Retourner la réponse
    return new Response(
      JSON.stringify({
        user_id: user.id,
        has_access: hasAccess
      } as AutomationAccessResponse),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('❌ [AUTOMATION-ACCESS] Error:', error);
    
    return new Response(
      JSON.stringify({
        user_id: '',
        has_access: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      } as AutomationAccessResponse),
      { status: 500, headers: corsHeaders }
    );
  }
});


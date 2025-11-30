// =====================================================
// LOG-ERROR - Edge Function pour logger les erreurs silencieusement
// =====================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

interface LogErrorRequest {
  message: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  meta?: Record<string, any>;
  source?: string;
  stack_trace?: string;
  url?: string;
  user_agent?: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight - IMPORTANT: doit être la première chose
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: {
        ...corsHeaders,
        'Access-Control-Max-Age': '86400',
      }
    });
  }

  try {
    // Récupérer le token JWT depuis le header Authorization (optionnel)
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      
      // Initialiser Supabase avec le service role pour vérifier le token
      const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://wjzlicokhxitmeoxkjzv.supabase.co';
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

      if (supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        
        // Vérifier le token et récupérer l'utilisateur
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user) {
          userId = user.id;
        }
      }
    }

    // Parser le body
    const body: LogErrorRequest = await req.json();

    // Valider les données
    if (!body.message || !body.level) {
      return new Response(
        JSON.stringify({ success: false, error: 'message and level are required' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Initialiser Supabase avec le service role pour insérer dans error_logs
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://wjzlicokhxitmeoxkjzv.supabase.co';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseServiceKey) {
      console.error('❌ SUPABASE_SERVICE_ROLE_KEY not set');
      return new Response(
        JSON.stringify({ success: false, error: 'Server configuration error' }),
        { status: 500, headers: corsHeaders }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Insérer dans error_logs
    const { error: insertError } = await supabase.from('error_logs').insert({
      user_id: userId,
      message: body.message,
      level: body.level,
      meta: body.meta || {},
      source: body.source || 'frontend',
      stack_trace: body.stack_trace,
      url: body.url,
      user_agent: body.user_agent,
    });

    if (insertError) {
      console.error('❌ Error inserting log:', insertError);
      return new Response(
        JSON.stringify({ success: false, error: insertError.message }),
        { status: 500, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('❌ Error in log-error function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});

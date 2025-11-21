// =====================================================
// GET DAILY QUOTE - Edge Function
// Retourne une citation non utilisée aujourd'hui
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Content-Type': 'application/json',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  try {
    // Parse request body (optional parameters)
    let lang = 'fr';
    let category = 'motivation';

    if (req.method === 'POST') {
      try {
        const body = await req.json();
        lang = body.lang || body.language || 'fr';
        category = body.category || body.cat || 'motivation';
      } catch {
        // Body is optional, use defaults
      }
    } else if (req.method === 'GET') {
      const url = new URL(req.url);
      lang = url.searchParams.get('lang') || url.searchParams.get('language') || 'fr';
      category = url.searchParams.get('category') || url.searchParams.get('cat') || 'motivation';
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Call the SQL function
    const { data, error } = await supabase.rpc('get_today_quote', {
      lang,
      cat: category,
    });

    if (error) {
      console.error('❌ Error calling get_today_quote:', error);
      throw error;
    }

    if (!data) {
      return new Response(
        JSON.stringify({ error: 'No quote found' }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Log pour debug
    console.log(`📖 Citation récupérée : « ${data.quote} » — ${data.author || 'Anonyme'}`);

    return new Response(
      JSON.stringify(data),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('❌ Error in get-daily-quote:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    );
  }
});


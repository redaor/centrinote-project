/**
 * 🏁 Supabase Edge Function pour marquer une réunion comme terminée
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

serve(async (req) => {
  console.log('🏁 [END-MEETING] Requête reçue');

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method Not Allowed' }),
      { status: 405, headers: corsHeaders }
    );
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: 'Configuration Supabase manquante' }),
        { status: 500, headers: corsHeaders }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { meetingId } = await req.json();

    if (!meetingId) {
      return new Response(
        JSON.stringify({ error: 'meetingId requis' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Mettre à jour la réunion
    const { data: updatedMeeting, error: updateError } = await supabase
      .from('meetings')
      .update({
        status: 'ended',
        ended_at: new Date().toISOString(),
      })
      .eq('id', meetingId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ [END-MEETING] Erreur mise à jour:', updateError);
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 500, headers: corsHeaders }
      );
    }

    console.log('✅ [END-MEETING] Réunion marquée comme terminée:', meetingId);

    return new Response(
      JSON.stringify({
        success: true,
        meeting: updatedMeeting,
      }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('❌ [END-MEETING] Erreur:', error);
    return new Response(
      JSON.stringify({
        error: 'Erreur interne',
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});





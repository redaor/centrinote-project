/**
 * 💾 Supabase Edge Function pour sauvegarder le recording_id en base de données
 * Appelée automatiquement quand Daily.co déclenche l'événement 'recording-started'
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
  console.log('💾 [UPDATE-RECORDING] Fonction appelée');

  // CORS preflight
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

    const body = await req.json();
    const { meetingId, recordingId } = body;

    if (!meetingId || !recordingId) {
      return new Response(
        JSON.stringify({
          error: 'meetingId et recordingId requis',
          received: { meetingId, recordingId }
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    console.log(`💾 [UPDATE-RECORDING] Sauvegarde recording_id pour meeting ${meetingId}:`, recordingId);

    // Mettre à jour la réunion avec le recording_id
    const { data, error } = await supabase
      .from('meetings')
      .update({
        recording_id: recordingId,
        updated_at: new Date().toISOString()
      })
      .eq('id', meetingId)
      .select();

    if (error) {
      console.error('❌ [UPDATE-RECORDING] Erreur mise à jour:', error);
      return new Response(
        JSON.stringify({
          error: 'Erreur mise à jour base de données',
          details: error.message
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    if (!data || data.length === 0) {
      console.warn('⚠️ [UPDATE-RECORDING] Meeting non trouvé:', meetingId);
      return new Response(
        JSON.stringify({
          error: 'Meeting non trouvé',
          meetingId
        }),
        { status: 404, headers: corsHeaders }
      );
    }

    console.log('✅ [UPDATE-RECORDING] Recording ID sauvegardé avec succès');

    return new Response(
      JSON.stringify({
        success: true,
        meetingId,
        recordingId,
        meeting: data[0]
      }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('❌ [UPDATE-RECORDING] Erreur:', error);
    return new Response(
      JSON.stringify({
        error: 'Erreur interne',
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});




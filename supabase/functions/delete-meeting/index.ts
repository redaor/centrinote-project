/**
 * 🗑️ Supabase Edge Function pour supprimer une réunion Daily.co + entrée Supabase
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

const DAILY_BASE_URL = 'https://api.daily.co/v1';

serve(async (req) => {
  // Gérer les requêtes OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Accepter POST (supabase.functions.invoke utilise POST par défaut)
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method Not Allowed' }),
      { status: 405, headers: corsHeaders }
    );
  }

  try {
    // Récupérer les secrets depuis Supabase
    const DAILY_API_KEY = Deno.env.get('DAILY_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!DAILY_API_KEY) {
      console.error('❌ [DELETE-MEETING] DAILY_API_KEY manquante');
      return new Response(
        JSON.stringify({ error: 'Configuration Daily.co manquante' }),
        { status: 500, headers: corsHeaders }
      );
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ [DELETE-MEETING] Configuration Supabase manquante');
      return new Response(
        JSON.stringify({ error: 'Configuration Supabase manquante' }),
        { status: 500, headers: corsHeaders }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parser les données
    const { meetingId } = await req.json();

    console.log('🗑️ [DELETE-MEETING] Suppression réunion:', meetingId);

    if (!meetingId) {
      return new Response(
        JSON.stringify({ error: 'ID de réunion manquant' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Récupérer les infos de la réunion depuis Supabase
    const { data: meeting, error: fetchError } = await supabase
      .from('meetings')
      .select('room_name, room_url, title, status')
      .eq('id', meetingId)
      .single();

    if (fetchError) {
      console.error('❌ [DELETE-MEETING] Erreur récupération:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Réunion non trouvée' }),
        { status: 404, headers: corsHeaders }
      );
    }

    if (!meeting) {
      return new Response(
        JSON.stringify({ error: 'Réunion non trouvée' }),
        { status: 404, headers: corsHeaders }
      );
    }

    console.log('📊 [DELETE-MEETING] Réunion trouvée:', {
      title: meeting.title,
      room_name: meeting.room_name,
      status: meeting.status
    });

    // Supprimer la salle Daily.co (si elle existe encore)
    try {
      const dailyResponse = await fetch(`${DAILY_BASE_URL}/rooms/${meeting.room_name}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${DAILY_API_KEY}`
        }
      });

      if (dailyResponse.ok) {
        console.log('✅ [DELETE-MEETING] Salle Daily.co supprimée:', meeting.room_name);
      } else {
        // La salle n'existe peut-être plus (expirée ou déjà supprimée)
        console.warn('⚠️ [DELETE-MEETING] Salle Daily.co déjà supprimée ou expirée:', meeting.room_name);
      }
    } catch (dailyError) {
      console.error('❌ [DELETE-MEETING] Erreur suppression Daily.co:', dailyError);
      // On continue même si la suppression Daily.co échoue
    }

    // Supprimer l'entrée Supabase
    const { error: deleteError } = await supabase
      .from('meetings')
      .delete()
      .eq('id', meetingId);

    if (deleteError) {
      console.error('❌ [DELETE-MEETING] Erreur suppression Supabase:', deleteError);
      return new Response(
        JSON.stringify({
          error: `Erreur suppression base de données: ${deleteError.message}`
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    console.log('✅ [DELETE-MEETING] Réunion supprimée avec succès:', meetingId);

    // Réponse de succès
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Réunion supprimée avec succès'
      }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('❌ [DELETE-MEETING] Erreur générale:', error);
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Erreur interne du serveur'
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});








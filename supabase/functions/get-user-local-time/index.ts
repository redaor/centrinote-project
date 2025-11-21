// =====================================================
// GET USER LOCAL TIME - Supabase Edge Function
// Récupère l'heure locale de l'utilisateur connecté
// Utilisé pour le système d'automatisation
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Content-Type': 'application/json',
};

interface GetUserLocalTimeRequest {
  userId?: string;
  timezone?: string; // Optionnel : si fourni, l'utilise directement
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  try {
    console.log('🕐 Get User Local Time - Starting');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: corsHeaders }
      );
    }

    // Parse request body (optional)
    let requestData: GetUserLocalTimeRequest = {};
    if (req.method === 'POST') {
      try {
        requestData = await req.json();
      } catch {
        // Body is optional for POST
      }
    }

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('❌ Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: corsHeaders }
      );
    }

    const userId = requestData.userId || user.id;
    console.log(`👤 User ID: ${userId}`);

    // Get user timezone from profile (if not provided in request)
    let userTimezone = requestData.timezone;

    if (!userTimezone) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('timezone')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.warn('⚠️ Could not fetch profile, using UTC as fallback:', profileError);
      }

      userTimezone = profile?.timezone || 'UTC';
    }

    // If timezone is still not set, try to detect from browser (if available in request)
    // Note: In Edge Functions, we can't detect browser timezone directly
    // So we rely on the profile or a provided timezone
    if (!userTimezone || userTimezone === 'UTC') {
      console.log('ℹ️ No timezone found, using UTC');
      userTimezone = 'UTC';
    }

    console.log(`🌍 User timezone: ${userTimezone}`);

    // Get current time in UTC
    const now = new Date();
    const utcTime = now.toISOString();

    // Get current local time in user's timezone
    const localTimeFormatter = new Intl.DateTimeFormat('fr-FR', {
      timeZone: userTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    const localTimeParts = localTimeFormatter.formatToParts(now);
    const localPartsObj: Record<string, string> = {};
    localTimeParts.forEach(part => {
      if (part.type !== 'literal') {
        localPartsObj[part.type] = part.value;
      }
    });

    const localTime = {
      year: parseInt(localPartsObj.year),
      month: parseInt(localPartsObj.month),
      day: parseInt(localPartsObj.day),
      hour: parseInt(localPartsObj.hour),
      minute: parseInt(localPartsObj.minute),
      second: parseInt(localPartsObj.second),
      formatted: `${localPartsObj.day}/${localPartsObj.month}/${localPartsObj.year} ${localPartsObj.hour}:${localPartsObj.minute}:${localPartsObj.second}`,
      timeString: `${localPartsObj.hour}:${localPartsObj.minute}` // HH:MM format
    };

    // Calculate timezone offset in hours
    const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }));
    const offsetHours = (tzDate.getTime() - utcDate.getTime()) / (1000 * 60 * 60);

    const response = {
      success: true,
      userId,
      timezone: userTimezone,
      utc: {
        iso: utcTime,
        timestamp: now.getTime()
      },
      local: localTime,
      offset: {
        hours: offsetHours,
        minutes: offsetHours * 60
      },
      timestamp: now.toISOString()
    };

    console.log(`✅ Local time retrieved: ${localTime.formatted} (${userTimezone})`);

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('❌ Error in get-user-local-time:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});


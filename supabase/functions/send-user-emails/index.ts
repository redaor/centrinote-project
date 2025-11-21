// =====================================================
// SEND USER EMAILS - Supabase Edge Function
// Cron appelé chaque minute pour envoyer les emails à l'heure choisie par l'utilisateur
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  try {
    console.log('⏰ send-user-emails - Starting batch');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const sb = createClient(supabaseUrl, serviceKey);

    // Heure actuelle en format HH:MM (Europe/Paris)
    const now = new Date();
    const parisTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
    const currentTime = parisTime.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    console.log(`📅 Current Paris time: ${currentTime}`);
    console.log(`🔍 Searching users with email_time = ${currentTime}`);

    // Récupérer tous les users avec cette heure
    const { data: users, error: usersError } = await sb
      .from('user_preferences')
      .select('user_id, quote_disabled, backup_disabled, session_completion_disabled')
      .eq('email_time', currentTime);

    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      throw usersError;
    }

    if (!users || users.length === 0) {
      console.log(`✅ No users scheduled for ${currentTime}`);
      return new Response(
        JSON.stringify({
          success: true,
          message: `No users for ${currentTime}`,
          time: currentTime
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    console.log(`👥 Found ${users.length} users for ${currentTime}`);

    const results = {
      quotes: 0,
      backups: 0,
      sessions: 0,
      errors: 0
    };

    // Pour chaque utilisateur, envoyer les emails appropriés
    for (const user of users) {
      try {
        // 1. Citation quotidienne (si non désactivée)
        if (!user.quote_disabled) {
          console.log(`📧 Sending quote to user ${user.user_id}`);

          // Récupérer l'email de l'utilisateur
          const { data: { user: authUser }, error: authError } = await sb.auth.admin.getUserById(user.user_id);

          if (authError || !authUser?.email) {
            console.error(`❌ Could not fetch email for user ${user.user_id}`);
            results.errors++;
            continue;
          }

          // Récupérer une citation aléatoire
          const { data: quotes } = await sb
            .from('quotes')
            .select('text, author')
            .limit(10);

          const randomQuote = quotes && quotes.length > 0
            ? quotes[Math.floor(Math.random() * quotes.length)]
            : { text: '« Le succès est la somme de petits efforts répétés jour après jour. »', author: 'Robert Collier' };

          // Envoyer l'email via automation-email
          const emailResponse = await fetch(`${supabaseUrl}/functions/v1/automation-email`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${serviceKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: authUser.email,
              subject: '💭 Citation du jour - Centrinote',
              text: `${randomQuote.text}\n\n— ${randomQuote.author}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h2 style="color: #6366f1;">💭 Citation du jour</h2>
                  <blockquote style="font-size: 18px; font-style: italic; color: #374151; border-left: 4px solid #6366f1; padding-left: 20px; margin: 20px 0;">
                    ${randomQuote.text}
                  </blockquote>
                  <p style="text-align: right; color: #6b7280;">— ${randomQuote.author}</p>
                  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
                  <p style="color: #6b7280; font-size: 12px;">Centrinote - Votre citation quotidienne personnalisée</p>
                </div>
              `
            }),
          });

          if (emailResponse.ok) {
            results.quotes++;
            console.log(`✅ Quote sent to ${authUser.email}`);
          } else {
            results.errors++;
            console.error(`❌ Failed to send quote to ${authUser.email}`);
          }
        }

        // 2. Backup reminder (dimanche uniquement, si non désactivé)
        const isDaySunday = parisTime.getDay() === 0;
        if (isDaySunday && !user.backup_disabled) {
          console.log(`📦 Sending backup reminder to user ${user.user_id}`);

          const { data: { user: authUser }, error: authError } = await sb.auth.admin.getUserById(user.user_id);

          if (authError || !authUser?.email) {
            results.errors++;
            continue;
          }

          const emailResponse = await fetch(`${supabaseUrl}/functions/v1/automation-email`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${serviceKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: authUser.email,
              subject: '📦 Rappel de sauvegarde - Centrinote',
              text: 'N\'oubliez pas de sauvegarder vos notes cette semaine !',
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h2 style="color: #6366f1;">📦 Rappel de sauvegarde</h2>
                  <p>N'oubliez pas de sauvegarder vos notes cette semaine !</p>
                  <p style="color: #6b7280; font-size: 12px;">Centrinote - Automatisation</p>
                </div>
              `
            }),
          });

          if (emailResponse.ok) {
            results.backups++;
            console.log(`✅ Backup reminder sent to ${authUser.email}`);
          } else {
            results.errors++;
          }
        }

        // 3. Ajouter ici d'autres types d'emails (session completed, badges, etc.)

      } catch (userError) {
        console.error(`❌ Error processing user ${user.user_id}:`, userError);
        results.errors++;
      }
    }

    console.log(`🏁 Batch completed for ${currentTime}:`, results);

    return new Response(
      JSON.stringify({
        success: true,
        time: currentTime,
        users_count: users.length,
        results,
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('❌ send-user-emails error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});

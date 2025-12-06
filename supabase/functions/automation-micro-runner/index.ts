// =====================================================
// AUTOMATION MICRO RUNNER - Supabase Edge Function
// Micro-moteur pour exécuter les templates simples 🟢
// 100% edge, pas de dépendance n8n
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-service-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

interface MicroRunnerRequest {
  templateId: string;
  userId: string;
  config?: Record<string, any>;
  testMode?: boolean; // Flag optionnel pour indiquer un test manuel
}

/**
 * Vérifie si un email peut être envoyé (toggle emails activé)
 * @returns true si les emails sont activés, false sinon
 */
async function canSendEmail(userId: string, supabase: any): Promise<boolean> {
  try {
    const { data: userSettings, error } = await supabase
      .from('user_settings')
      .select('settings')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.log(`⚠️ [EMAIL-CHECK] Could not load user settings, allowing email by default:`, error.message);
      return true; // Par défaut, autoriser
    }

    const emailsEnabled = userSettings?.settings?.notifications?.emails;

    if (emailsEnabled === false) {
      console.log(`📧 [EMAIL-CHECK] User has disabled email notifications, blocking email`);
      return false;
    }

    console.log(`✅ [EMAIL-CHECK] Email notifications enabled for user ${userId}`);
    return true;
  } catch (error) {
    console.error(`❌ [EMAIL-CHECK] Error checking email preference:`, error);
    return true; // En cas d'erreur, autoriser par défaut
  }
}

/**
 * Vérifie si un rappel peut être envoyé (toggle reminders activé)
 * @returns true si les rappels sont activés, false sinon
 */
async function canSendReminder(userId: string, supabase: any): Promise<boolean> {
  try {
    const { data: userSettings, error } = await supabase
      .from('user_settings')
      .select('settings')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.log(`⚠️ [REMINDER-CHECK] Could not load user settings, allowing reminder by default:`, error.message);
      return true; // Par défaut, autoriser
    }

    const remindersEnabled = userSettings?.settings?.notifications?.reminders;

    if (remindersEnabled === false) {
      console.log(`🔔 [REMINDER-CHECK] User has disabled reminders, blocking reminder`);
      return false;
    }

    console.log(`✅ [REMINDER-CHECK] Reminders enabled for user ${userId}`);
    return true;
  } catch (error) {
    console.error(`❌ [REMINDER-CHECK] Error checking reminder preference:`, error);
    return true; // En cas d'erreur, autoriser par défaut
  }
}

/**
 * Vérifie si une notification peut être envoyée en respectant les heures calmes
 * @returns true si la notification peut être envoyée, false sinon
 */
async function shouldSendNotification(userId: string, supabase: any): Promise<boolean> {
  try {
    // Charger les préférences utilisateur depuis user_settings
    const { data: userSettings, error } = await supabase
      .from('user_settings')
      .select('settings')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.log(`⚠️ [QUIET-HOURS] Could not load user settings (table may not exist), allowing notification:`, error.message);
      return true; // Par défaut, autoriser si les settings n'existent pas
    }

    const quietHours = userSettings?.settings?.notifications?.quietHours;

    // Si les heures calmes ne sont pas activées, autoriser
    if (!quietHours?.enabled) {
      console.log(`✅ [QUIET-HOURS] Quiet hours not enabled for user ${userId}, allowing notification`);
      return true;
    }

    // Obtenir le fuseau horaire de l'utilisateur
    const timezone = userSettings?.settings?.notifications?.timezone || 'Europe/Paris';

    // Obtenir l'heure locale actuelle dans le fuseau horaire de l'utilisateur
    const now = new Date();
    const localTimeFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    const currentLocalTime = localTimeFormatter.format(now);
    const [currentHour, currentMinute] = currentLocalTime.split(':').map(Number);
    const currentMinutes = currentHour * 60 + currentMinute;

    const [startHour, startMinute] = quietHours.start.split(':').map(Number);
    const [endHour, endMinute] = quietHours.end.split(':').map(Number);
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    console.log(`🔍 [QUIET-HOURS] Checking for user ${userId}:`, {
      currentTime: currentLocalTime,
      quietStart: quietHours.start,
      quietEnd: quietHours.end,
      timezone
    });

    // Vérifier si on est dans les heures calmes
    let isQuietTime: boolean;
    if (startMinutes <= endMinutes) {
      // Plage normale (ex: 22:00 → 08:00)
      isQuietTime = currentMinutes >= startMinutes && currentMinutes < endMinutes;
    } else {
      // Plage qui traverse minuit (ex: 22:00 → 02:00)
      isQuietTime = currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }

    if (isQuietTime) {
      console.log(`🌙 [QUIET-HOURS] Currently in quiet hours (${quietHours.start} - ${quietHours.end}), blocking notification`);
      return false;
    } else {
      console.log(`✅ [QUIET-HOURS] Outside quiet hours, allowing notification`);
      return true;
    }
  } catch (error) {
    console.error(`❌ [QUIET-HOURS] Error checking quiet hours:`, error);
    return true; // En cas d'erreur, autoriser par défaut
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  const startTime = performance.now();
  const executionId = crypto.randomUUID();

  try {
    console.log(`🚀 Micro Runner - Execution ${executionId}`);

    // Parse request
    const { templateId, userId, config = {}, testMode = false }: MicroRunnerRequest = await req.json();

    if (!templateId || !userId) {
      throw new Error('templateId and userId are required');
    }

    console.log(`📋 Template ID: ${templateId}`);
    console.log(`👤 User ID: ${userId}`);
    if (testMode) {
      console.log(`🧪 TEST MODE ACTIVATED - Manual test from UI`);
    }

    // Initialize Supabase client
    // ✅ Comme automation-runner : utiliser uniquement les secrets de l'Edge Function
    // Ne pas lire depuis Authorization pour éviter la validation JWT automatique de Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseServiceKey) {
      console.error('❌ [AUTOMATION-MICRO-RUNNER] SUPABASE_SERVICE_ROLE_KEY not found in environment');
      console.error('   Configurez SUPABASE_SERVICE_ROLE_KEY dans les secrets de l\'Edge Function');
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is required. Configure it in Edge Functions secrets (Settings > Edge Functions > automation-micro-runner > Secrets)');
    }
    
    console.log('🔑 [AUTOMATION-MICRO-RUNNER] Service key récupérée depuis l\'environnement (secrets)');
    
    console.log('✅ [AUTOMATION-MICRO-RUNNER] Initialisation du client Supabase avec service key');
    // ✅ IMPORTANT : Utiliser le service key directement, pas comme JWT utilisateur
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Execute based on template ID
    let result: any;
    let actionType: string;

    switch (templateId) {
      case 'focus_mode':
        actionType = 'send_notification';
        result = await executeFocusMode(userId, config, supabaseUrl, supabaseServiceKey);
        break;

      case 'break_time':
        actionType = 'send_email_and_notification';
        result = await executeBreakTime(userId, config, supabaseUrl, supabaseServiceKey);
        break;

      case 'daily_quote':
        actionType = 'send_email';
        result = await executeDailyQuote(userId, config, supabase, supabaseUrl, supabaseServiceKey);
        break;

      case 'study-reminder':
        actionType = 'send_notification';
        result = await executeStudyReminder(userId, config, supabaseUrl, supabaseServiceKey, supabase);
        break;

      case 'daily-review':
        actionType = 'send_notification';
        result = await executeDailyReview(userId, config, supabaseUrl, supabaseServiceKey);
        break;

      case 'vocab-milestone':
        actionType = 'send_notification';
        result = await executeVocabMilestone(userId, config, supabaseUrl, supabaseServiceKey, supabase);
        break;

      case 'forgotten-notes':
        actionType = 'send_notification';
        result = await executeForgottenNotes(userId, config, supabaseUrl, supabaseServiceKey, supabase);
        break;

      case 'weekly-summary':
        actionType = 'send_email';
        result = await executeWeeklySummary(userId, config, supabase, supabaseUrl, supabaseServiceKey);
        break;

      case 'monthly-report':
        actionType = 'send_email';
        result = await executeMonthlyReport(userId, config, supabase, supabaseUrl, supabaseServiceKey);
        break;

      case 'task-reminder':
        actionType = 'check_task_reminders';
        result = await executeTaskReminder(userId, config, supabaseUrl, supabaseServiceKey);
        break;

      default:
        throw new Error(`Unknown template: ${templateId}`);
    }

    // Log execution
    await logExecution(supabase, {
      id: executionId,
      template_id: templateId,
      user_id: userId,
      status: 'success',
      action_type: actionType,
      config,
      result,
      execution_time_ms: Math.round(performance.now() - startTime),
    });

    console.log(`✅ Micro template executed successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        execution_id: executionId,
        template_id: templateId,
        result,
        execution_time_ms: Math.round(performance.now() - startTime),
      }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('❌ Micro runner error:', error);
    const executionTime = Math.round(performance.now() - startTime);

    return new Response(
      JSON.stringify({
        success: false,
        execution_id: executionId,
        error: error.message,
        execution_time_ms: executionTime
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});

/**
 * FOCUS_MODE - Notification silencieuse au démarrage de session
 */
async function executeFocusMode(
  userId: string,
  config: Record<string, any>,
  supabaseUrl: string,
  serviceKey: string
): Promise<any> {
  console.log(`🎯 [FOCUS-MODE] Starting execution for user: ${userId}`);

  const supabase = createClient(supabaseUrl, serviceKey);

  // ✅ Vérifier les heures calmes
  const canSend = await shouldSendNotification(userId, supabase);
  if (!canSend) {
    console.log(`🌙 [FOCUS-MODE] Skipping due to quiet hours`);
    return {
      success: true,
      skipped: true,
      reason: 'Quiet hours active'
    };
  }

  const notifUrl = `${supabaseUrl}/functions/v1/automation-notification`;
  const message = config.message || 'Mode focus activé – notifications silencieuses';

  const response = await fetch(notifUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_id: userId,
      title: '🎯 Mode Focus',
      message,
      type: 'info',
      priority: 'low',
    }),
  });

  if (!response.ok) {
    throw new Error(`Notification service returned ${response.status}`);
  }

  return await response.json();
}

/**
 * BREAK_TIME - Email + notification 15 min après session ≥ 45 min
 */
async function executeBreakTime(
  userId: string,
  config: Record<string, any>,
  supabaseUrl: string,
  serviceKey: string
): Promise<any> {
  console.log(`☕ [BREAK-TIME] Starting execution for user: ${userId}`);

  const delayMinutes = config.delay_minutes || 15;

  // Get user email from Supabase auth
  const supabase = createClient(supabaseUrl, serviceKey);

  // ✅ Vérifier les préférences avant d'envoyer (c'est un email + rappel)
  const canEmail = await canSendEmail(userId, supabase);
  if (!canEmail) {
    console.log(`📧 [BREAK-TIME] Skipping email due to user preferences`);
    return {
      success: true,
      skipped: true,
      reason: 'Email notifications disabled by user'
    };
  }

  const canRemind = await canSendReminder(userId, supabase);
  if (!canRemind) {
    console.log(`🔔 [BREAK-TIME] Skipping reminder due to user preferences`);
    return {
      success: true,
      skipped: true,
      reason: 'Reminders disabled by user'
    };
  }

  // ✅ Vérifier les heures calmes
  const canSend = await shouldSendNotification(userId, supabase);
  if (!canSend) {
    console.log(`🌙 [BREAK-TIME] Skipping due to quiet hours`);
    return {
      success: true,
      skipped: true,
      reason: 'Quiet hours active'
    };
  }

  const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId);

  if (userError || !user?.email) {
    throw new Error('Could not fetch user email');
  }

  // Send notification immediately
  const notifUrl = `${supabaseUrl}/functions/v1/automation-notification`;
  await fetch(notifUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_id: userId,
      title: '☕ Pause Active',
      message: `Bravo ! Session terminée. Rappel dans ${delayMinutes} minutes.`,
      type: 'success',
      priority: 'normal',
    }),
  });

  // Send email reminder
  const emailUrl = `${supabaseUrl}/functions/v1/automation-email`;
  const emailResponse = await fetch(emailUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: user.email,
      subject: '☕ Pause Active - Centrinote',
      body: `Bravo pour cette session ! Prenez une pause bien méritée.\n\nRappel dans ${delayMinutes} minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #6366f1;">☕ Pause Active</h2>
          <p>Bravo pour cette session ! Prenez une pause bien méritée.</p>
          <p><strong>Rappel dans ${delayMinutes} minutes.</strong></p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="color: #6b7280; font-size: 12px;">Centrinote - Votre assistant d'étude</p>
        </div>
      `,
    }),
  });

  if (!emailResponse.ok) {
    throw new Error(`Email service returned ${emailResponse.status}`);
  }

  return {
    notification_sent: true,
    email_sent: true,
    delay_minutes: delayMinutes,
  };
}

/**
 * DAILY_QUOTE - Citation du jour envoyée par email
 * ✅ NOUVEAU SYSTÈME : Utilise get_today_quote() pour éviter les répétitions
 * ✅ DÉDOUBLONNAGE : Vérifie last_executed_at avant d'envoyer
 */
async function executeDailyQuote(
  userId: string,
  config: Record<string, any>,
  supabase: any,
  supabaseUrl: string,
  serviceKey: string
): Promise<any> {
  console.log(`💭 [DAILY-QUOTE] Starting execution for user: ${userId}`);

  // ✅ DÉDOUBLONNAGE ATOMIQUE : Vérifier et mettre à jour last_executed_at AVANT d'envoyer
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Récupérer l'automatisation
  const { data: automations, error: autoError } = await supabase
    .from('automations')
    .select('id, last_executed_at, execution_count, name')
    .eq('user_id', userId)
    .eq('name', 'daily_quote')
    .eq('is_active', true)
    .limit(1);

  if (!autoError && automations && automations.length > 0) {
    const automation = automations[0];
    if (automation.last_executed_at) {
      const lastExecuted = new Date(automation.last_executed_at);
      const lastExecutedDate = new Date(lastExecuted);
      lastExecutedDate.setHours(0, 0, 0, 0);
      
      if (lastExecutedDate.getTime() === today.getTime()) {
        console.log(`⚠️ [DAILY-QUOTE] Already executed today (${automation.last_executed_at}), skipping`);
        return {
          success: true,
          skipped: true,
          reason: 'Already executed today',
          last_executed_at: automation.last_executed_at
        };
      }
    }
    
    // ✅ VERROU ATOMIQUE : Utiliser la fonction RPC PostgreSQL pour garantir l'atomicité
    // Cette fonction utilise FOR UPDATE pour éviter les race conditions
    const { data: lockResult, error: lockError } = await supabase.rpc('try_lock_and_update_automation', {
      p_automation_id: automation.id,
      p_lock_duration_minutes: 5,
      p_execution_time: new Date().toISOString()
    });

    if (lockError) {
      console.warn(`⚠️ [DAILY-QUOTE] RPC lock function not available, using fallback:`, lockError.message);
      // Fallback : Vérifier si déjà exécuté aujourd'hui
      if (automation.last_executed_at) {
        const lastExecuted = new Date(automation.last_executed_at);
        const lastExecutedDate = new Date(lastExecuted);
        lastExecutedDate.setHours(0, 0, 0, 0);
        
        if (lastExecutedDate.getTime() === today.getTime()) {
          console.log(`⚠️ [DAILY-QUOTE] Already executed today (fallback check), skipping`);
          return {
            success: true,
            skipped: true,
            reason: 'Already executed today (fallback)',
            last_executed_at: automation.last_executed_at
          };
        }
      }
      // Si pas de verrou RPC, on continue quand même (risque de doublon)
      console.warn(`⚠️ [DAILY-QUOTE] Continuing without atomic lock (risk of duplicate)`);
    } else if (lockResult === false) {
      console.log(`⚠️ [DAILY-QUOTE] Failed to acquire atomic lock (already executed by another instance), skipping`);
      return {
        success: true,
        skipped: true,
        reason: 'Lock acquisition failed (already executed)'
      };
    } else {
      console.log(`🔒 [DAILY-QUOTE] Atomic lock acquired via RPC, proceeding with email send`);
    }
  } else if (autoError) {
    console.warn(`⚠️ [DAILY-QUOTE] Could not fetch automation:`, autoError);
  }

  // ✅ Vérifier les préférences avant d'envoyer
  const canEmail = await canSendEmail(userId, supabase);
  if (!canEmail) {
    console.log(`📧 [DAILY-QUOTE] Skipping email due to user preferences`);
    return {
      success: true,
      skipped: true,
      reason: 'Email notifications disabled by user'
    };
  }

  // ✅ Vérifier les heures calmes
  const canSend = await shouldSendNotification(userId, supabase);
  if (!canSend) {
    console.log(`🌙 [DAILY-QUOTE] Skipping email due to quiet hours`);
    return {
      success: true,
      skipped: true,
      reason: 'Quiet hours active'
    };
  }

  // ✅ NOUVEAU : Récupérer une citation non utilisée aujourd'hui via la fonction SQL
  const { data: quote, error: quoteError } = await supabase.rpc('get_today_quote', {
    lang: 'fr',
    cat: 'motivation',
  });

  if (quoteError || !quote) {
    console.error('❌ Error fetching daily quote:', quoteError);
    throw new Error('No quote available');
  }

  console.log(`📖 Citation récupérée : « ${quote.quote} » — ${quote.author || 'Anonyme'}`);

  // Get user email
  const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId);

  if (userError || !user?.email) {
    throw new Error('Could not fetch user email');
  }

  // ✅ NOUVEAU : Template HTML moderne et élégant (responsive et professionnel)
  const quoteHtml = `
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>💭 Citation du jour - Centrinote</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        margin: 0;
        padding: 40px 20px;
        line-height: 1.6;
      }
      .email-wrapper {
        max-width: 600px;
        margin: 0 auto;
      }
      .header {
        text-align: center;
        margin-bottom: 30px;
      }
      .header-icon {
        font-size: 48px;
        margin-bottom: 10px;
      }
      .header-title {
        color: #ffffff;
        font-size: 24px;
        font-weight: 600;
        margin-bottom: 5px;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }
      .header-subtitle {
        color: rgba(255, 255, 255, 0.9);
        font-size: 14px;
        font-weight: 400;
      }
      .card {
        background: #ffffff;
        border-radius: 20px;
        padding: 50px 40px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        margin-bottom: 30px;
        position: relative;
        overflow: hidden;
      }
      .card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 5px;
        background: linear-gradient(90deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
      }
      .quote-icon {
        text-align: center;
        font-size: 32px;
        margin-bottom: 25px;
        opacity: 0.3;
      }
      .quote {
        font-size: 1.75em;
        line-height: 1.8;
        color: #1f2937;
        font-style: italic;
        margin-bottom: 30px;
        text-align: center;
        padding: 30px 20px;
        position: relative;
        font-weight: 400;
      }
      .quote::before {
        content: '"';
        position: absolute;
        top: -10px;
        left: 10px;
        font-size: 4em;
        color: #e5e7eb;
        font-family: Georgia, serif;
        line-height: 1;
      }
      .quote::after {
        content: '"';
        position: absolute;
        bottom: -30px;
        right: 10px;
        font-size: 4em;
        color: #e5e7eb;
        font-family: Georgia, serif;
        line-height: 1;
      }
      .author-container {
        text-align: center;
        margin-top: 30px;
        padding-top: 25px;
        border-top: 2px solid #f3f4f6;
      }
      .author-label {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 1.5px;
        color: #9ca3af;
        margin-bottom: 8px;
        font-weight: 600;
      }
      .author {
        color: #4b5563;
        font-size: 1.15em;
        font-weight: 500;
        font-style: normal;
      }
      .footer {
        text-align: center;
        margin-top: 30px;
      }
      .footer-brand {
        color: rgba(255, 255, 255, 0.95);
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 8px;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
      }
      .footer-tagline {
        color: rgba(255, 255, 255, 0.8);
        font-size: 13px;
        font-weight: 400;
      }
      .footer-divider {
        width: 60px;
        height: 3px;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 2px;
        margin: 20px auto;
      }
      @media only screen and (max-width: 600px) {
        body { padding: 20px 10px; }
        .card {
          padding: 35px 25px;
          border-radius: 16px;
        }
        .quote {
          font-size: 1.4em;
          padding: 25px 15px;
        }
        .header-title { font-size: 20px; }
        .quote-icon { font-size: 28px; }
      }
    </style>
  </head>
  <body>
    <div class="email-wrapper">
      <div class="header">
        <div class="header-icon">💭</div>
        <div class="header-title">Citation du jour</div>
        <div class="header-subtitle">Votre dose quotidienne de motivation</div>
      </div>
      
      <div class="card">
        <div class="quote-icon">✨</div>
        <p class="quote">${(quote.quote || '').replace(/"/g, '&quot;')}</p>
        <div class="author-container">
          <div class="author-label">Auteur</div>
          <p class="author">${(quote.author || 'Anonyme').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
        </div>
      </div>
      
      <div class="footer">
        <div class="footer-divider"></div>
        <div class="footer-brand">Centrinote</div>
        <div class="footer-tagline">Votre assistant d'étude intelligent</div>
      </div>
    </div>
  </body>
</html>`;

  // Send email with quote
  const emailUrl = `${supabaseUrl}/functions/v1/automation-email`;
  const emailResponse = await fetch(emailUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: user.email,
      subject: '💭 Citation du jour - Centrinote',
      body: `${quote.quote || ''}\n\n— ${quote.author || 'Anonyme'}\n\nCentrinote – Citation du jour`,
      html: quoteHtml,
    }),
  });

  if (!emailResponse.ok) {
    // En cas d'erreur, on ne peut pas annuler la mise à jour de last_executed_at
    // mais c'est acceptable car l'email n'a pas été envoyé
    throw new Error(`Email service returned ${emailResponse.status}`);
  }

  // ✅ last_executed_at a déjà été mis à jour AVANT l'envoi (verrou atomique)
  console.log(`✅ [DAILY-QUOTE] Email sent and last_executed_at already updated (atomic lock)`);

  return {
    quote_sent: true,
    quote_id: quote.id,
    quote_body: quote.quote,
    quote_author: quote.author,
  };
}

/**
 * STUDY_REMINDER - Notification de rappel pour session d'étude
 */
/**
 * STUDY_REMINDER - Notification de rappel pour session d'étude
 * ✅ Aligné sur le modèle break_time qui fonctionne
 * ✅ Respecte les heures calmes de l'utilisateur
 */
async function executeStudyReminder(
  userId: string,
  config: Record<string, any>,
  supabaseUrl: string,
  serviceKey: string,
  supabase: any
): Promise<any> {
  console.log(`📚 [STUDY-REMINDER] Starting execution for user: ${userId}`);
  console.log(`📚 [STUDY-REMINDER] Config:`, JSON.stringify(config));

  // ✅ Vérifier le toggle reminders
  const canRemind = await canSendReminder(userId, supabase);
  if (!canRemind) {
    console.log(`🔔 [STUDY-REMINDER] Skipping reminder due to user preferences`);
    return {
      success: true,
      skipped: true,
      reason: 'Reminders disabled by user'
    };
  }

  // ✅ Vérifier les heures calmes avant d'envoyer
  const canSend = await shouldSendNotification(userId, supabase);
  if (!canSend) {
    console.log(`🌙 [STUDY-REMINDER] Skipping notification due to quiet hours`);
    return {
      success: true,
      skipped: true,
      reason: 'Quiet hours active'
    };
  }

  const notifUrl = `${supabaseUrl}/functions/v1/automation-notification`;
  const message = config.message || 'C\'est l\'heure d\'étudier ! 💪';

  console.log(`📚 [STUDY-REMINDER] Calling automation-notification: ${notifUrl}`);

  try {
    const response = await fetch(notifUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        title: '📚 Session d\'étude',
        message,
        type: 'info',
        priority: 'normal',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [STUDY-REMINDER] Notification service error: ${response.status} - ${errorText}`);
      throw new Error(`Notification service returned ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log(`✅ [STUDY-REMINDER] Notification sent successfully:`, result);

    return result;
  } catch (error) {
    console.error(`❌ [STUDY-REMINDER] Error sending notification:`, error);
    throw error;
  }
}

/**
 * DAILY_REVIEW - Notification de révision quotidienne
 * ✅ Aligné sur le modèle study-reminder qui fonctionne
 */
async function executeDailyReview(
  userId: string,
  config: Record<string, any>,
  supabaseUrl: string,
  serviceKey: string
): Promise<any> {
  console.log(`📚 [DAILY-REVIEW] Starting execution for user: ${userId}`);
  console.log(`📚 [DAILY-REVIEW] Config:`, JSON.stringify(config));

  const supabase = createClient(supabaseUrl, serviceKey);

  // ✅ Vérifier le toggle reminders
  const canRemind = await canSendReminder(userId, supabase);
  if (!canRemind) {
    console.log(`🔔 [DAILY-REVIEW] Skipping reminder due to user preferences`);
    return {
      success: true,
      skipped: true,
      reason: 'Reminders disabled by user'
    };
  }

  // ✅ Vérifier les heures calmes
  const canSend = await shouldSendNotification(userId, supabase);
  if (!canSend) {
    console.log(`🌙 [DAILY-REVIEW] Skipping due to quiet hours`);
    return {
      success: true,
      skipped: true,
      reason: 'Quiet hours active'
    };
  }

  const notifUrl = `${supabaseUrl}/functions/v1/automation-notification`;
  const message = config.message || 'Il est temps de réviser vos notes ! 📝';

  console.log(`📚 [DAILY-REVIEW] Calling automation-notification: ${notifUrl}`);
  
  try {
    const response = await fetch(notifUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        title: '📝 Révision quotidienne',
        message,
        type: 'info',
        priority: 'normal',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [DAILY-REVIEW] Notification service error: ${response.status} - ${errorText}`);
      throw new Error(`Notification service returned ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log(`✅ [DAILY-REVIEW] Notification sent successfully:`, result);
    
    return result;
  } catch (error) {
    console.error(`❌ [DAILY-REVIEW] Error sending notification:`, error);
    throw error;
  }
}

/**
 * VOCAB_MILESTONE - Vérifie si l'utilisateur a atteint un seuil de vocabulaire
 * ✅ Vérifie le nombre total de mots dans le vocabulaire de l'utilisateur
 * ✅ Envoie une notification si un seuil est atteint (50, 100, 200, etc.)
 */
async function executeVocabMilestone(
  userId: string,
  config: Record<string, any>,
  supabaseUrl: string,
  serviceKey: string,
  supabase: any
): Promise<any> {
  console.log(`🏆 [VOCAB-MILESTONE] Starting execution for user: ${userId}`);
  console.log(`🏆 [VOCAB-MILESTONE] Config:`, JSON.stringify(config));

  try {
    // ✅ Vérifier les heures calmes
    const canSend = await shouldSendNotification(userId, supabase);
    if (!canSend) {
      console.log(`🌙 [VOCAB-MILESTONE] Skipping due to quiet hours`);
      return {
        success: true,
        skipped: true,
        reason: 'Quiet hours active'
      };
    }

    // 1. Récupérer le seuil configuré (par défaut 50)
    const milestone = config.milestone || 50;
    
    console.log(`🏆 [VOCAB-MILESTONE] Config reçue:`, JSON.stringify(config));
    console.log(`🏆 [VOCAB-MILESTONE] Milestone configuré: ${milestone} (config.milestone: ${config.milestone || 'non défini, utilisation du défaut 50'})`);
    
    // 2. Compter le nombre total de mots dans le vocabulaire de l'utilisateur
    // ✅ RESTAURATION : Compter TOUS les mots (comme avant)
    const { data: vocabData, error: vocabError, count } = await supabase
      .from('vocabulary')
      .select('id', { count: 'exact', head: false })
      .eq('userId', userId);
    
    const vocabCount = count || vocabData?.length || 0;
    
    if (vocabError) {
      console.error(`❌ [VOCAB-MILESTONE] Error counting vocabulary:`, vocabError);
      throw vocabError;
    }
    
    console.log(`🏆 [VOCAB-MILESTONE] Vocabulary count: ${vocabCount}, milestone: ${milestone}`);
    console.log(`🏆 [VOCAB-MILESTONE] Comparaison: ${vocabCount} >= ${milestone} ? ${vocabCount >= milestone}`);
    
    // 3. Vérifier si le seuil est atteint
    if (vocabCount < milestone) {
      console.log(`⏭️ [VOCAB-MILESTONE] Milestone not reached (${vocabCount} < ${milestone}), skipping notification`);
      return {
        success: true,
        skipped: true,
        reason: `Milestone not reached: ${vocabCount} < ${milestone}`,
        vocabCount,
        milestone
      };
    }
    
    // 4. Vérifier si une notification a déjà été envoyée pour ce seuil récemment (éviter les doublons)
    const { data: recentNotifs, error: notifCheckError } = await supabase
      .from('notifications')
      .select('id, created_at')
      .eq('user_id', userId)
      .eq('title', `🏆 Milestone vocabulaire : ${milestone} mots !`)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Dernières 24h
      .limit(1);
    
    if (notifCheckError) {
      console.warn(`⚠️ [VOCAB-MILESTONE] Error checking recent notifications:`, notifCheckError);
    } else if (recentNotifs && recentNotifs.length > 0) {
      console.log(`⏭️ [VOCAB-MILESTONE] Notification already sent for milestone ${milestone} in last 24h, skipping`);
      console.log(`⏭️ [VOCAB-MILESTONE] Notification trouvée:`, recentNotifs[0]);
      return {
        success: true,
        skipped: true,
        reason: 'Notification already sent recently',
        vocabCount,
        milestone,
        lastNotificationAt: recentNotifs[0].created_at
      };
    } else {
      console.log(`✅ [VOCAB-MILESTONE] Aucune notification récente trouvée, on peut envoyer`);
    }
    
    // 5. Envoyer la notification
    const notifUrl = `${supabaseUrl}/functions/v1/automation-notification`;
    const message = config.message || `Félicitations ! Vous avez atteint ${vocabCount} mots dans votre vocabulaire ! 🎉`;
    
    console.log(`🏆 [VOCAB-MILESTONE] Calling automation-notification: ${notifUrl}`);
    
    const response = await fetch(notifUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        title: `🏆 Milestone vocabulaire : ${milestone} mots !`,
        message,
        type: 'success',
        priority: 'normal',
        metadata: {
          vocab_count: vocabCount,
          milestone,
          automation_type: 'vocab-milestone'
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [VOCAB-MILESTONE] Notification service error: ${response.status} - ${errorText}`);
      throw new Error(`Notification service returned ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log(`✅ [VOCAB-MILESTONE] Notification sent successfully:`, result);
    
    return {
      success: true,
      vocabCount,
      milestone,
      notification: result
    };
  } catch (error) {
    console.error(`❌ [VOCAB-MILESTONE] Error:`, error);
    throw error;
  }
}

/**
 * FORGOTTEN_NOTES - Vérifie les notes non consultées depuis X jours
 * ✅ Trouve les notes non consultées depuis le nombre de jours configuré
 * ✅ Envoie une notification avec la liste des notes à réviser
 */
async function executeForgottenNotes(
  userId: string,
  config: Record<string, any>,
  supabaseUrl: string,
  serviceKey: string,
  supabase: any
): Promise<any> {
  console.log(`📝 [FORGOTTEN-NOTES] Starting execution for user: ${userId}`);
  console.log(`📝 [FORGOTTEN-NOTES] Config:`, JSON.stringify(config));

  try {
    // ✅ Vérifier les heures calmes
    const canSend = await shouldSendNotification(userId, supabase);
    if (!canSend) {
      console.log(`🌙 [FORGOTTEN-NOTES] Skipping due to quiet hours`);
      return {
        success: true,
        skipped: true,
        reason: 'Quiet hours active'
      };
    }

    // 1. Récupérer les paramètres de configuration
    const delayDays = config.delayDays || 7;
    const maxNotes = config.maxNotes || 3;
    
    // 2. Calculer la date limite (notes non consultées depuis delayDays jours)
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() - delayDays);
    
    console.log(`📝 [FORGOTTEN-NOTES] Looking for notes not viewed since: ${limitDate.toISOString()}`);
    
    // 3. Récupérer les notes non consultées
    // On utilise updated_at pour déterminer si une note a été consultée récemment
    const { data: forgottenNotes, error: notesError } = await supabase
      .from('notes')
      .select('id, title, updated_at, created_at')
      .eq('userId', userId)
      .lt('updated_at', limitDate.toISOString())
      .order('updated_at', { ascending: true })
      .limit(maxNotes);
    
    if (notesError) {
      console.error(`❌ [FORGOTTEN-NOTES] Error fetching notes:`, notesError);
      // Si la requête échoue, on essaie avec created_at seulement
      const { data: fallbackNotes, error: fallbackError } = await supabase
        .from('notes')
        .select('id, title, created_at')
        .eq('userId', userId)
        .lt('created_at', limitDate.toISOString())
        .order('created_at', { ascending: true })
        .limit(maxNotes);
      
      if (fallbackError) {
        console.error(`❌ [FORGOTTEN-NOTES] Fallback query also failed:`, fallbackError);
        throw fallbackError;
      }
      
      console.log(`📝 [FORGOTTEN-NOTES] Using fallback query, found ${fallbackNotes?.length || 0} notes`);
      
      if (!fallbackNotes || fallbackNotes.length === 0) {
        console.log(`⏭️ [FORGOTTEN-NOTES] No forgotten notes found, skipping notification`);
        return {
          success: true,
          skipped: true,
          reason: 'No forgotten notes found',
          delayDays,
          notesFound: 0
        };
      }
      
      // Envoyer notification avec les notes trouvées
      const notesList = fallbackNotes.map((n: any) => n.title || 'Sans titre').join(', ');
      const message = config.message || `Vous avez ${fallbackNotes.length} note(s) non consultée(s) depuis ${delayDays} jour(s) : ${notesList}`;
      
      const notifUrl = `${supabaseUrl}/functions/v1/automation-notification`;
      const response = await fetch(notifUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          title: `📝 Notes oubliées (${fallbackNotes.length})`,
          message,
          type: 'info',
          priority: 'normal',
          metadata: {
            notes_count: fallbackNotes.length,
            delay_days: delayDays,
            notes: fallbackNotes.map((n: any) => ({ id: n.id, title: n.title })),
            automation_type: 'forgotten-notes'
          }
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Notification service returned ${response.status}: ${errorText}`);
      }
      
      return await response.json();
    }
    
    if (!forgottenNotes || forgottenNotes.length === 0) {
      console.log(`⏭️ [FORGOTTEN-NOTES] No forgotten notes found, skipping notification`);
      return {
        success: true,
        skipped: true,
        reason: 'No forgotten notes found',
        delayDays,
        notesFound: 0
      };
    }
    
    console.log(`📝 [FORGOTTEN-NOTES] Found ${forgottenNotes.length} forgotten notes`);
    
    // 4. Vérifier si une notification a déjà été envoyée récemment (éviter les doublons)
    const { data: recentNotifs, error: notifCheckError } = await supabase
      .from('notifications')
      .select('id, created_at')
      .eq('user_id', userId)
      .eq('title', `📝 Notes oubliées (${forgottenNotes.length})`)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Dernières 24h
      .limit(1);
    
    if (notifCheckError) {
      console.warn(`⚠️ [FORGOTTEN-NOTES] Error checking recent notifications:`, notifCheckError);
    } else if (recentNotifs && recentNotifs.length > 0) {
      console.log(`⏭️ [FORGOTTEN-NOTES] Notification already sent in last 24h, skipping`);
      return {
        success: true,
        skipped: true,
        reason: 'Notification already sent recently',
        notesFound: forgottenNotes.length
      };
    }
    
    // 5. Construire le message avec la liste des notes
    const notesList = forgottenNotes.map((n: any) => n.title || 'Sans titre').join(', ');
    const message = config.message || `Vous avez ${forgottenNotes.length} note(s) non consultée(s) depuis ${delayDays} jour(s) : ${notesList}`;
    
    // 6. Envoyer la notification
    const notifUrl = `${supabaseUrl}/functions/v1/automation-notification`;
    console.log(`📝 [FORGOTTEN-NOTES] Calling automation-notification: ${notifUrl}`);
    
    const response = await fetch(notifUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        title: `📝 Notes oubliées (${forgottenNotes.length})`,
        message,
        type: 'info',
        priority: 'normal',
        metadata: {
          notes_count: forgottenNotes.length,
          delay_days: delayDays,
          notes: forgottenNotes.map((n: any) => ({ id: n.id, title: n.title })),
          automation_type: 'forgotten-notes'
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [FORGOTTEN-NOTES] Notification service error: ${response.status} - ${errorText}`);
      throw new Error(`Notification service returned ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log(`✅ [FORGOTTEN-NOTES] Notification sent successfully:`, result);
    
    return {
      success: true,
      notesFound: forgottenNotes.length,
      delayDays,
      notification: result
    };
  } catch (error) {
    console.error(`❌ [FORGOTTEN-NOTES] Error:`, error);
    throw error;
  }
}

/**
 * WEEKLY_SUMMARY - Résumé hebdomadaire par email
 * ✅ Similaire à daily_quote mais pour un résumé hebdomadaire
 * ✅ DÉDOUBLONNAGE : Vérifie last_executed_at avant d'envoyer
 */
async function executeWeeklySummary(
  userId: string,
  config: Record<string, any>,
  supabase: any,
  supabaseUrl: string,
  serviceKey: string
): Promise<any> {
  console.log(`📊 [WEEKLY-SUMMARY] Starting execution for user: ${userId}`);
  console.log(`📊 [WEEKLY-SUMMARY] Config:`, JSON.stringify(config));

  try {
    // ✅ DÉDOUBLONNAGE ATOMIQUE : Vérifier et mettre à jour last_executed_at AVANT d'envoyer
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    // Récupérer l'automatisation
    const { data: automations, error: autoError } = await supabase
      .from('automations')
      .select('id, last_executed_at, execution_count, name')
      .eq('user_id', userId)
      .eq('name', 'weekly-summary')
      .eq('is_active', true)
      .limit(1);

    if (!autoError && automations && automations.length > 0) {
      const automation = automations[0];
      if (automation.last_executed_at) {
        const lastExecuted = new Date(automation.last_executed_at);
        
        if (lastExecuted.getTime() > weekAgo.getTime()) {
          console.log(`⚠️ [WEEKLY-SUMMARY] Already executed this week (${automation.last_executed_at}), skipping`);
          return {
            success: true,
            skipped: true,
            reason: 'Already executed this week',
            last_executed_at: automation.last_executed_at
          };
        }
      }
      
      // ✅ VERROU ATOMIQUE : Utiliser la fonction RPC PostgreSQL pour garantir l'atomicité
      const { data: lockResult, error: lockError } = await supabase.rpc('try_lock_and_update_automation', {
        p_automation_id: automation.id,
        p_lock_duration_minutes: 5,
        p_execution_time: new Date().toISOString()
      });

      if (lockError) {
        console.warn(`⚠️ [WEEKLY-SUMMARY] RPC lock function not available, using fallback:`, lockError.message);
        // Fallback : Vérifier si déjà exécuté cette semaine
        if (automation.last_executed_at) {
          const lastExecuted = new Date(automation.last_executed_at);
          if (lastExecuted.getTime() > weekAgo.getTime()) {
            console.log(`⚠️ [WEEKLY-SUMMARY] Already executed this week (fallback check), skipping`);
            return {
              success: true,
              skipped: true,
              reason: 'Already executed this week (fallback)',
              last_executed_at: automation.last_executed_at
            };
          }
        }
        // Si pas de verrou RPC, on continue quand même (risque de doublon)
        console.warn(`⚠️ [WEEKLY-SUMMARY] Continuing without atomic lock (risk of duplicate)`);
      } else if (lockResult === false) {
        console.log(`⚠️ [WEEKLY-SUMMARY] Failed to acquire atomic lock (already executed by another instance), skipping`);
        return {
          success: true,
          skipped: true,
          reason: 'Lock acquisition failed (already executed)'
        };
      } else {
        console.log(`🔒 [WEEKLY-SUMMARY] Atomic lock acquired via RPC, proceeding with email send`);
      }
    } else if (autoError) {
      console.warn(`⚠️ [WEEKLY-SUMMARY] Could not fetch automation:`, autoError);
    }

    // ✅ Vérifier les préférences avant d'envoyer
    const canEmail = await canSendEmail(userId, supabase);
    if (!canEmail) {
      console.log(`📧 [WEEKLY-SUMMARY] Skipping email due to user preferences`);
      return {
        success: true,
        skipped: true,
        reason: 'Email notifications disabled by user'
      };
    }

    // ✅ Vérifier les heures calmes
    const canSend = await shouldSendNotification(userId, supabase);
    if (!canSend) {
      console.log(`🌙 [WEEKLY-SUMMARY] Skipping email due to quiet hours`);
      return {
        success: true,
        skipped: true,
        reason: 'Quiet hours active'
      };
    }

    // 1. Récupérer les statistiques de l'utilisateur pour la semaine
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    // Compter les notes créées cette semaine
    const { count: notesCount } = await supabase
      .from('notes')
      .select('*', { count: 'exact', head: true })
      .eq('userId', userId)
      .gte('created_at', weekAgo.toISOString());

    // Compter les mots de vocabulaire ajoutés cette semaine
    const { count: vocabCount } = await supabase
      .from('vocabulary')
      .select('*', { count: 'exact', head: true })
      .eq('userId', userId)
      .gte('created_at', weekAgo.toISOString());

    // Compter les mots maîtrisés (mastery >= 80)
    const { count: masteredCount } = await supabase
      .from('vocabulary')
      .select('*', { count: 'exact', head: true })
      .eq('userId', userId)
      .gte('mastery', 80);

    // Compter le total de notes
    const { count: totalNotesCount } = await supabase
      .from('notes')
      .select('*', { count: 'exact', head: true })
      .eq('userId', userId);

    // Compter le total de vocabulaire
    const { count: totalVocabCount } = await supabase
      .from('vocabulary')
      .select('*', { count: 'exact', head: true })
      .eq('userId', userId);

    console.log(`📊 [WEEKLY-SUMMARY] Stats:`, {
      notesThisWeek: notesCount || 0,
      vocabThisWeek: vocabCount || 0,
      masteredWords: masteredCount || 0,
      totalNotes: totalNotesCount || 0,
      totalVocab: totalVocabCount || 0
    });

    // 2. Récupérer l'email de l'utilisateur
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId);

    if (userError || !user?.email) {
      throw new Error('Could not fetch user email');
    }

    // 3. Construire le résumé hebdomadaire
    const summaryHtml = `
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>📊 Résumé hebdomadaire - Centrinote</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 20px;
        line-height: 1.6;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        background: white;
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      }
      .header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 40px 30px;
        text-align: center;
      }
      .header h1 {
        font-size: 28px;
        margin-bottom: 10px;
      }
      .header p {
        opacity: 0.9;
        font-size: 16px;
      }
      .content {
        padding: 40px 30px;
      }
      .stats-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 20px;
        margin: 30px 0;
      }
      .stat-card {
        background: #f8f9fa;
        padding: 20px;
        border-radius: 12px;
        text-align: center;
        border: 2px solid #e9ecef;
      }
      .stat-number {
        font-size: 32px;
        font-weight: bold;
        color: #667eea;
        margin-bottom: 5px;
      }
      .stat-label {
        color: #6c757d;
        font-size: 14px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .section {
        margin: 30px 0;
        padding: 20px;
        background: #f8f9fa;
        border-radius: 12px;
      }
      .section h2 {
        color: #495057;
        margin-bottom: 15px;
        font-size: 20px;
      }
      .section p {
        color: #6c757d;
        margin: 10px 0;
      }
      .footer {
        background: #f8f9fa;
        padding: 30px;
        text-align: center;
        border-top: 1px solid #e9ecef;
      }
      .footer p {
        color: #6c757d;
        font-size: 14px;
        margin: 5px 0;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>📊 Résumé Hebdomadaire</h1>
        <p>Vos progrès de la semaine</p>
      </div>
      <div class="content">
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-number">${notesCount || 0}</div>
            <div class="stat-label">Notes créées</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">${vocabCount || 0}</div>
            <div class="stat-label">Mots ajoutés</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">${masteredCount || 0}</div>
            <div class="stat-label">Mots maîtrisés</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">${totalVocabCount || 0}</div>
            <div class="stat-label">Total vocabulaire</div>
          </div>
        </div>
        
        <div class="section">
          <h2>📝 Notes</h2>
          <p><strong>Cette semaine:</strong> ${notesCount || 0} nouvelle(s) note(s)</p>
          <p><strong>Total:</strong> ${totalNotesCount || 0} note(s)</p>
        </div>
        
        <div class="section">
          <h2>📚 Vocabulaire</h2>
          <p><strong>Cette semaine:</strong> ${vocabCount || 0} nouveau(x) mot(s)</p>
          <p><strong>Maîtrisés:</strong> ${masteredCount || 0} mot(s)</p>
          <p><strong>Total:</strong> ${totalVocabCount || 0} mot(s)</p>
        </div>
      </div>
      <div class="footer">
        <p><strong>Centrinote</strong></p>
        <p>Votre assistant d'étude intelligent</p>
        <p style="margin-top: 15px; font-size: 12px; color: #adb5bd;">
          Résumé généré le ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>
    </div>
  </body>
</html>`;

    // 4. Envoyer l'email via automation-email
    const emailUrl = `${supabaseUrl}/functions/v1/automation-email`;
    const emailResponse = await fetch(emailUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: user.email,
        subject: '📊 Résumé hebdomadaire - Centrinote',
        body: `Résumé de votre semaine d'apprentissage:

📝 Notes créées cette semaine: ${notesCount || 0}
📚 Mots ajoutés cette semaine: ${vocabCount || 0}
🏆 Mots maîtrisés: ${masteredCount || 0}
📊 Total vocabulaire: ${totalVocabCount || 0}

Continuez comme ça ! 💪

Centrinote - Votre assistant d'étude`,
        html: summaryHtml,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      throw new Error(`Email service returned ${emailResponse.status}: ${errorText}`);
    }

    const emailResult = await emailResponse.json();
    console.log(`✅ [WEEKLY-SUMMARY] Email sent successfully:`, emailResult);

    // ✅ last_executed_at a déjà été mis à jour AVANT l'envoi (verrou atomique)
    console.log(`✅ [WEEKLY-SUMMARY] Email sent and last_executed_at already updated (atomic lock)`);

    return {
      success: true,
      email_sent: true,
      stats: {
        notesThisWeek: notesCount || 0,
        vocabThisWeek: vocabCount || 0,
        masteredWords: masteredCount || 0,
        totalNotes: totalNotesCount || 0,
        totalVocab: totalVocabCount || 0
      },
      email: emailResult
    };
  } catch (error) {
    console.error(`❌ [WEEKLY-SUMMARY] Error:`, error);
    throw error;
  }
}

/**
 * MONTHLY_REPORT - Bilan mensuel par email
 * ✅ Similaire à weekly-summary mais pour un bilan mensuel (30 jours)
 */
async function executeMonthlyReport(
  userId: string,
  config: Record<string, any>,
  supabase: any,
  supabaseUrl: string,
  serviceKey: string
): Promise<any> {
  console.log(`📊 [MONTHLY-REPORT] Starting execution for user: ${userId}`);
  console.log(`📊 [MONTHLY-REPORT] Config:`, JSON.stringify(config));

  try {
    // ✅ DÉDOUBLONNAGE ATOMIQUE : Vérifier et mettre à jour last_executed_at AVANT d'envoyer
    const now = new Date();
    const monthAgo = new Date(now);
    monthAgo.setDate(monthAgo.getDate() - 30);
    
    // Récupérer l'automatisation
    const { data: automations, error: autoError } = await supabase
      .from('automations')
      .select('id, last_executed_at, execution_count, name')
      .eq('user_id', userId)
      .eq('name', 'monthly-report')
      .eq('is_active', true)
      .limit(1);

    if (!autoError && automations && automations.length > 0) {
      const automation = automations[0];
      if (automation.last_executed_at) {
        const lastExecuted = new Date(automation.last_executed_at);
        
        if (lastExecuted.getTime() > monthAgo.getTime()) {
          console.log(`⚠️ [MONTHLY-REPORT] Already executed this month (${automation.last_executed_at}), skipping`);
          return {
            success: true,
            skipped: true,
            reason: 'Already executed this month',
            last_executed_at: automation.last_executed_at
          };
        }
      }
      
      // ✅ VERROU ATOMIQUE : Utiliser la fonction RPC PostgreSQL pour garantir l'atomicité
      const { data: lockResult, error: lockError } = await supabase.rpc('try_lock_and_update_automation', {
        p_automation_id: automation.id,
        p_lock_duration_minutes: 5,
        p_execution_time: new Date().toISOString()
      });

      if (lockError) {
        console.warn(`⚠️ [MONTHLY-REPORT] RPC lock function not available, using fallback:`, lockError.message);
        // Fallback : Vérifier si déjà exécuté ce mois
        if (automation.last_executed_at) {
          const lastExecuted = new Date(automation.last_executed_at);
          if (lastExecuted.getTime() > monthAgo.getTime()) {
            console.log(`⚠️ [MONTHLY-REPORT] Already executed this month (fallback check), skipping`);
            return {
              success: true,
              skipped: true,
              reason: 'Already executed this month (fallback)',
              last_executed_at: automation.last_executed_at
            };
          }
        }
        // Si pas de verrou RPC, on continue quand même (risque de doublon)
        console.warn(`⚠️ [MONTHLY-REPORT] Continuing without atomic lock (risk of duplicate)`);
      } else if (lockResult === false) {
        console.log(`⚠️ [MONTHLY-REPORT] Failed to acquire atomic lock (already executed by another instance), skipping`);
        return {
          success: true,
          skipped: true,
          reason: 'Lock acquisition failed (already executed)'
        };
      } else {
        console.log(`🔒 [MONTHLY-REPORT] Atomic lock acquired via RPC, proceeding with email send`);
      }
    } else if (autoError) {
      console.warn(`⚠️ [MONTHLY-REPORT] Could not fetch automation:`, autoError);
    }

    // ✅ Vérifier les préférences avant d'envoyer
    const canEmail = await canSendEmail(userId, supabase);
    if (!canEmail) {
      console.log(`📧 [MONTHLY-REPORT] Skipping email due to user preferences`);
      return {
        success: true,
        skipped: true,
        reason: 'Email notifications disabled by user'
      };
    }

    // ✅ Vérifier les heures calmes
    const canSend = await shouldSendNotification(userId, supabase);
    if (!canSend) {
      console.log(`🌙 [MONTHLY-REPORT] Skipping email due to quiet hours`);
      return {
        success: true,
        skipped: true,
        reason: 'Quiet hours active'
      };
    }

    // 1. Récupérer les statistiques de l'utilisateur pour le mois (30 jours)
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);

    // Compter les notes créées ce mois
    const { count: notesCount } = await supabase
      .from('notes')
      .select('*', { count: 'exact', head: true })
      .eq('userId', userId)
      .gte('created_at', monthAgo.toISOString());

    // Compter les mots de vocabulaire ajoutés ce mois
    const { count: vocabCount } = await supabase
      .from('vocabulary')
      .select('*', { count: 'exact', head: true })
      .eq('userId', userId)
      .gte('created_at', monthAgo.toISOString());

    // Compter les mots maîtrisés (mastery >= 80)
    const { count: masteredCount } = await supabase
      .from('vocabulary')
      .select('*', { count: 'exact', head: true })
      .eq('userId', userId)
      .gte('mastery', 80);

    // Compter le total de notes
    const { count: totalNotesCount } = await supabase
      .from('notes')
      .select('*', { count: 'exact', head: true })
      .eq('userId', userId);

    // Compter le total de vocabulaire
    const { count: totalVocabCount } = await supabase
      .from('vocabulary')
      .select('*', { count: 'exact', head: true })
      .eq('userId', userId);

    console.log(`📊 [MONTHLY-REPORT] Stats:`, {
      notesThisMonth: notesCount || 0,
      vocabThisMonth: vocabCount || 0,
      masteredWords: masteredCount || 0,
      totalNotes: totalNotesCount || 0,
      totalVocab: totalVocabCount || 0
    });

    // 2. Récupérer l'email de l'utilisateur
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId);

    if (userError || !user?.email) {
      throw new Error('Could not fetch user email');
    }

    // 3. Construire le bilan mensuel
    const reportHtml = `
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>📊 Bilan Mensuel - Centrinote</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 20px;
        line-height: 1.6;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        background: white;
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      }
      .header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 40px 30px;
        text-align: center;
      }
      .header h1 {
        font-size: 28px;
        margin-bottom: 10px;
      }
      .header p {
        opacity: 0.9;
        font-size: 16px;
      }
      .content {
        padding: 40px 30px;
      }
      .stats-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 20px;
        margin: 30px 0;
      }
      .stat-card {
        background: #f8f9fa;
        padding: 20px;
        border-radius: 12px;
        text-align: center;
        border: 2px solid #e9ecef;
      }
      .stat-number {
        font-size: 32px;
        font-weight: bold;
        color: #667eea;
        margin-bottom: 5px;
      }
      .stat-label {
        color: #6c757d;
        font-size: 14px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .section {
        margin: 30px 0;
        padding: 20px;
        background: #f8f9fa;
        border-radius: 12px;
      }
      .section h2 {
        color: #495057;
        margin-bottom: 15px;
        font-size: 20px;
      }
      .section p {
        color: #6c757d;
        margin: 10px 0;
      }
      .footer {
        background: #f8f9fa;
        padding: 30px;
        text-align: center;
        border-top: 1px solid #e9ecef;
      }
      .footer p {
        color: #6c757d;
        font-size: 14px;
        margin: 5px 0;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>📊 Bilan Mensuel</h1>
        <p>Vos progrès du mois</p>
      </div>
      <div class="content">
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-number">${notesCount || 0}</div>
            <div class="stat-label">Notes créées</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">${vocabCount || 0}</div>
            <div class="stat-label">Mots ajoutés</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">${masteredCount || 0}</div>
            <div class="stat-label">Mots maîtrisés</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">${totalVocabCount || 0}</div>
            <div class="stat-label">Total vocabulaire</div>
          </div>
        </div>

        <div class="section">
          <h2>📝 Notes</h2>
          <p><strong>Ce mois:</strong> ${notesCount || 0} nouvelle(s) note(s)</p>
          <p><strong>Total:</strong> ${totalNotesCount || 0} note(s)</p>
        </div>

        <div class="section">
          <h2>📚 Vocabulaire</h2>
          <p><strong>Ce mois:</strong> ${vocabCount || 0} nouveau(x) mot(s)</p>
          <p><strong>Maîtrisés:</strong> ${masteredCount || 0} mot(s)</p>
          <p><strong>Total:</strong> ${totalVocabCount || 0} mot(s)</p>
        </div>
      </div>
      <div class="footer">
        <p><strong>Centrinote</strong></p>
        <p>Votre assistant d'étude intelligent</p>
        <p style="margin-top: 15px; font-size: 12px; color: #adb5bd;">
          Bilan généré le ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>
    </div>
  </body>
</html>`;

    // 4. Envoyer l'email via automation-email
    const emailUrl = `${supabaseUrl}/functions/v1/automation-email`;
    const emailResponse = await fetch(emailUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: user.email,
        subject: '📊 Bilan Mensuel - Centrinote',
        body: `Bilan de votre mois d'apprentissage:

📝 Notes créées ce mois: ${notesCount || 0}
📚 Mots ajoutés ce mois: ${vocabCount || 0}
🏆 Mots maîtrisés: ${masteredCount || 0}
📊 Total vocabulaire: ${totalVocabCount || 0}

Excellent travail ! 💪

Centrinote - Votre assistant d'étude`,
        html: reportHtml,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      throw new Error(`Email service returned ${emailResponse.status}: ${errorText}`);
    }

    const emailResult = await emailResponse.json();
    console.log(`✅ [MONTHLY-REPORT] Email sent successfully:`, emailResult);

    // ✅ last_executed_at a déjà été mis à jour AVANT l'envoi (verrou atomique)
    console.log(`✅ [MONTHLY-REPORT] Email sent and last_executed_at already updated (atomic lock)`);

    return {
      success: true,
      email_sent: true,
      stats: {
        notesThisMonth: notesCount || 0,
        vocabThisMonth: vocabCount || 0,
        masteredWords: masteredCount || 0,
        totalNotes: totalNotesCount || 0,
        totalVocab: totalVocabCount || 0
      },
      email: emailResult
    };
  } catch (error) {
    console.error(`❌ [MONTHLY-REPORT] Error:`, error);
    throw error;
  }
}

/**
 * TASK_REMINDER - Vérifie les rappels de tâches du planning
 * ✅ Appelle task-reminder-checker pour vérifier les tâches avec rappels
 */
async function executeTaskReminder(
  userId: string,
  config: Record<string, any>,
  supabaseUrl: string,
  serviceKey: string
): Promise<any> {
  console.log(`⏰ [TASK-REMINDER] Starting execution for user: ${userId}`);

  try {
    // Appeler la fonction task-reminder-checker
    const checkerUrl = `${supabaseUrl}/functions/v1/task-reminder-checker`;
    console.log(`⏰ [TASK-REMINDER] Calling task-reminder-checker: ${checkerUrl}`);

    const response = await fetch(checkerUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [TASK-REMINDER] Task reminder checker error: ${response.status} - ${errorText}`);
      throw new Error(`Task reminder checker returned ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log(`✅ [TASK-REMINDER] Task reminder check completed:`, result);

    return result;
  } catch (error) {
    console.error(`❌ [TASK-REMINDER] Error checking task reminders:`, error);
    throw error;
  }
}

/**
 * Log execution in automation_executions table
 */
async function logExecution(
  supabase: any,
  executionData: {
    id: string;
    template_id: string;
    user_id: string;
    status: string;
    action_type: string;
    config: Record<string, any>;
    result: any;
    execution_time_ms: number;
  }
): Promise<void> {
  const { error } = await supabase
    .from('automation_executions')
    .insert([{
      id: executionData.id,
      automation_id: null, // Micro templates don't have automation_id
      status: executionData.status,
      trigger_data: {
        template_id: executionData.template_id,
        user_id: executionData.user_id,
        config: executionData.config,
        micro_template: true,
      },
      action_result: executionData.result,
      execution_time_ms: executionData.execution_time_ms,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    }]);

  if (error) {
    console.error('⚠️ Failed to log execution:', error);
  }
}

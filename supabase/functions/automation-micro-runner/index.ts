// =====================================================
// AUTOMATION MICRO RUNNER - Supabase Edge Function
// Micro-moteur pour exécuter les templates simples 🟢
// 100% edge, pas de dépendance n8n
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

interface MicroRunnerRequest {
  templateId: string;
  userId: string;
  config?: Record<string, any>;
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
    const { templateId, userId, config = {} }: MicroRunnerRequest = await req.json();

    if (!templateId || !userId) {
      throw new Error('templateId and userId are required');
    }

    console.log(`📋 Template ID: ${templateId}`);
    console.log(`👤 User ID: ${userId}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
  const delayMinutes = config.delay_minutes || 15;

  // Get user email from Supabase auth
  const supabase = createClient(supabaseUrl, serviceKey);
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
 * DAILY_QUOTE - Citation aléatoire envoyée par email à 08:00
 */
async function executeDailyQuote(
  userId: string,
  config: Record<string, any>,
  supabase: any,
  supabaseUrl: string,
  serviceKey: string
): Promise<any> {
  // Get random quote from database
  const { data: quotes, error: quotesError } = await supabase
    .from('quotes')
    .select('*')
    .limit(50);

  if (quotesError || !quotes || quotes.length === 0) {
    throw new Error('No quotes available');
  }

  // Pick random quote
  const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];

  // Get user email
  const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId);

  if (userError || !user?.email) {
    throw new Error('Could not fetch user email');
  }

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
      body: `${randomQuote.body}\n\n— ${randomQuote.author || 'Anonyme'}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #6366f1;">💭 Citation du jour</h2>
          <blockquote style="font-size: 18px; font-style: italic; color: #374151; border-left: 4px solid #6366f1; padding-left: 20px; margin: 30px 0;">
            ${randomQuote.body}
          </blockquote>
          <p style="text-align: right; color: #6b7280;">— ${randomQuote.author || 'Anonyme'}</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="color: #6b7280; font-size: 12px;">Centrinote - Votre dose quotidienne de motivation</p>
        </div>
      `,
    }),
  });

  if (!emailResponse.ok) {
    throw new Error(`Email service returned ${emailResponse.status}`);
  }

  return {
    quote_sent: true,
    quote_id: randomQuote.id,
    quote_body: randomQuote.body,
    quote_author: randomQuote.author,
  };
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

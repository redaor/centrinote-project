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
    // ✅ Récupérer la clé depuis l'environnement OU depuis le header Authorization
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    let supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    // Si la clé n'est pas dans l'environnement, essayer de la récupérer depuis le header
    if (!supabaseServiceKey) {
      const authHeader = req.headers.get('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        supabaseServiceKey = authHeader.substring(7); // Enlever "Bearer "
        console.log('🔑 Service key récupérée depuis le header Authorization');
      } else {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY not found in environment and no Authorization header provided');
      }
    }
    
    if (!supabaseServiceKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is required. Configure it in Edge Functions secrets or pass it in Authorization header');
    }
    
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
 * DAILY_QUOTE - Citation du jour envoyée par email
 * ✅ NOUVEAU SYSTÈME : Utilise get_today_quote() pour éviter les répétitions
 */
async function executeDailyQuote(
  userId: string,
  config: Record<string, any>,
  supabase: any,
  supabaseUrl: string,
  serviceKey: string
): Promise<any> {
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

  // ✅ NOUVEAU : Template HTML amélioré (responsive et propre)
  const quoteHtml = `
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        color: #222;
        background: #f7f7f7;
        margin: 0;
        padding: 40px 20px;
        line-height: 1.6;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
      }
      .card {
        background: #ffffff;
        border-radius: 12px;
        padding: 40px 30px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        margin-bottom: 20px;
      }
      .quote {
        font-size: 1.5em;
        line-height: 1.6;
        color: #333;
        font-style: italic;
        margin-bottom: 20px;
        text-align: center;
        padding: 20px 0;
        border-left: 4px solid #6366f1;
        padding-left: 20px;
      }
      .author {
        text-align: right;
        margin-top: 20px;
        color: #666;
        font-size: 1.1em;
        font-weight: 500;
      }
      .author::before {
        content: '— ';
        color: #999;
      }
      footer {
        margin-top: 40px;
        font-size: 0.85em;
        color: #999;
        text-align: center;
        padding-top: 20px;
        border-top: 1px solid #e5e7eb;
      }
      @media only screen and (max-width: 600px) {
        body { padding: 20px 10px; }
        .card { padding: 30px 20px; }
        .quote { font-size: 1.3em; }
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="card">
        <p class="quote">« ${(quote.quote || '').replace(/"/g, '&quot;')} »</p>
        <p class="author">${(quote.author || 'Anonyme').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
      </div>
      <footer>Centrinote – Citation du jour</footer>
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
    throw new Error(`Email service returned ${emailResponse.status}`);
  }

  return {
    quote_sent: true,
    quote_id: quote.id,
    quote_body: quote.quote,
    quote_author: quote.author,
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

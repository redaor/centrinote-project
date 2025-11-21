// =====================================================
// AUTOMATION RUNNER - Supabase Edge Function
// Executes automation actions based on triggers
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

interface RunnerRequest {
  automation_id: string;
  trigger_data: Record<string, any>;
  test_mode?: boolean;
}

interface Automation {
  id: string;
  user_id: string;
  name: string;
  trigger_type: string;
  trigger_config: any;
  action_type: string;
  action_config: any;
  conditions: any[];
  retry_config: {
    max_retries: number;
    retry_delay: number;
    backoff_multiplier?: number;
  };
  execution_count: number;
  success_count: number;
  failure_count: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  const startTime = performance.now();
  const executionId = crypto.randomUUID();

  try {
    console.log(`🚀 Automation Runner - Execution ${executionId}`);

    // Parse request
    const { automation_id, trigger_data, test_mode = false }: RunnerRequest = await req.json();

    if (!automation_id) {
      throw new Error('automation_id is required');
    }

    console.log(`📋 Automation ID: ${automation_id}`);
    console.log(`🔍 Test mode: ${test_mode}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch automation details
    const { data: automation, error: fetchError } = await supabase
      .from('automations')
      .select('*')
      .eq('id', automation_id)
      .single();

    if (fetchError || !automation) {
      throw new Error(`Automation not found: ${automation_id}`);
    }

    console.log(`✅ Loaded automation: ${automation.name}`);

    // Check if automation is active
    if (!automation.is_active && !test_mode) {
      console.log('⚠️ Automation is inactive');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Automation is not active',
          execution_id: executionId
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Create execution record
    const executionRecord = {
      id: executionId,
      automation_id: automation_id,
      status: 'running',
      trigger_data,
      started_at: new Date().toISOString(),
      retry_count: 0,
      is_retry: false,
    };

    const { error: insertError } = await supabase
      .from('automation_executions')
      .insert([executionRecord]);

    if (insertError) {
      console.error('❌ Error creating execution record:', insertError);
    }

    // Evaluate conditions
    if (automation.conditions && automation.conditions.length > 0) {
      const conditionsMet = evaluateConditions(automation.conditions, trigger_data);

      if (!conditionsMet) {
        console.log('⏭️ Conditions not met, skipping execution');
        await updateExecutionStatus(supabase, executionId, 'cancelled', null, startTime, 'Conditions not met');

        return new Response(
          JSON.stringify({
            success: true,
            execution_id: executionId,
            status: 'skipped',
            reason: 'Conditions not met'
          }),
          { status: 200, headers: corsHeaders }
        );
      }
    }

    console.log(`🎯 Executing action: ${automation.action_type}`);

    // Execute action based on action_type
    let actionResult: any;
    let actionError: string | null = null;

    try {
      actionResult = await executeAction(
        automation as Automation,
        trigger_data,
        supabaseUrl,
        supabaseServiceKey
      );
      console.log('✅ Action executed successfully');
    } catch (error) {
      actionError = error.message;
      console.error('❌ Action execution failed:', error);

      // Handle retry logic
      if (automation.retry_config && automation.retry_config.max_retries > 0) {
        console.log(`🔄 Scheduling retry (max: ${automation.retry_config.max_retries})`);
        // In production, this would trigger a retry job
        // For now, we'll just log it
      }
    }

    // Update execution record
    const finalStatus = actionError ? 'failed' : 'success';
    await updateExecutionStatus(supabase, executionId, finalStatus, actionResult, startTime, actionError);

    // Update automation statistics
    await supabase
      .from('automations')
      .update({
        execution_count: automation.execution_count + 1,
        success_count: actionError ? automation.success_count : automation.success_count + 1,
        failure_count: actionError ? automation.failure_count + 1 : automation.failure_count,
        last_executed_at: new Date().toISOString(),
      })
      .eq('id', automation_id);

    const executionTime = Math.round(performance.now() - startTime);
    console.log(`🏁 Execution completed in ${executionTime}ms with status: ${finalStatus}`);

    return new Response(
      JSON.stringify({
        success: !actionError,
        execution_id: executionId,
        status: finalStatus,
        execution_time_ms: executionTime,
        action_result: actionResult,
        error: actionError,
      }),
      { status: actionError ? 500 : 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('❌ Runner error:', error);
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
 * Evaluate automation conditions
 */
function evaluateConditions(conditions: any[], triggerData: Record<string, any>): boolean {
  if (!conditions || conditions.length === 0) return true;

  let result = true;
  let logicalOperator = 'AND';

  for (const condition of conditions) {
    const fieldValue = getNestedValue(triggerData, condition.field);
    const conditionMet = evaluateCondition(fieldValue, condition.operator, condition.value);

    if (logicalOperator === 'AND') {
      result = result && conditionMet;
    } else {
      result = result || conditionMet;
    }

    logicalOperator = condition.logical_operator || 'AND';
  }

  return result;
}

function evaluateCondition(fieldValue: any, operator: string, expectedValue: any): boolean {
  switch (operator) {
    case 'equals':
      return fieldValue === expectedValue;
    case 'not_equals':
      return fieldValue !== expectedValue;
    case 'contains':
      return String(fieldValue).includes(String(expectedValue));
    case 'greater_than':
      return Number(fieldValue) > Number(expectedValue);
    case 'less_than':
      return Number(fieldValue) < Number(expectedValue);
    default:
      return false;
  }
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Execute automation action
 */
async function executeAction(
  automation: Automation,
  triggerData: Record<string, any>,
  supabaseUrl: string,
  serviceKey: string
): Promise<any> {
  const { action_type, action_config, user_id } = automation;

  switch (action_type) {
    case 'send_email':
      return await sendEmail(action_config, triggerData, supabaseUrl, serviceKey);

    case 'send_notification':
      return await sendNotification(action_config, triggerData, user_id, supabaseUrl, serviceKey);

    case 'create_note':
      return await createNote(action_config, triggerData, user_id, supabaseUrl, serviceKey);

    case 'webhook_call':
      return await callWebhook(action_config, triggerData);

    case 'update_tag':
      return await updateTag(action_config, triggerData, supabaseUrl, serviceKey);

    default:
      throw new Error(`Unsupported action type: ${action_type}`);
  }
}

async function sendEmail(config: any, triggerData: any, supabaseUrl: string, serviceKey: string): Promise<any> {
  const emailUrl = `${supabaseUrl}/functions/v1/automation-email`;

  const response = await fetch(emailUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: config.recipient || triggerData.user_email,
      subject: replacePlaceholders(config.subject, triggerData),
      body: replacePlaceholders(config.body, triggerData),
      html: config.html_template ? replacePlaceholders(config.html_template, triggerData) : undefined,
    }),
  });

  if (!response.ok) {
    throw new Error(`Email service returned ${response.status}`);
  }

  return await response.json();
}

async function sendNotification(config: any, triggerData: any, userId: string, supabaseUrl: string, serviceKey: string): Promise<any> {
  const notifUrl = `${supabaseUrl}/functions/v1/automation-notification`;

  const response = await fetch(notifUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_id: userId,
      title: replacePlaceholders(config.title, triggerData),
      message: replacePlaceholders(config.message, triggerData),
      type: config.notification_type || 'info',
      priority: config.priority || 'normal',
    }),
  });

  if (!response.ok) {
    throw new Error(`Notification service returned ${response.status}`);
  }

  return await response.json();
}

async function createNote(config: any, triggerData: any, userId: string, supabaseUrl: string, serviceKey: string): Promise<any> {
  const supabase = createClient(supabaseUrl, serviceKey);

  const noteData = {
    user_id: userId,
    title: replacePlaceholders(config.title, triggerData),
    content: replacePlaceholders(config.content, triggerData),
    tags: config.tags || [],
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('notes')
    .insert([noteData])
    .select()
    .single();

  if (error) throw error;

  return { note_id: data.id, title: data.title };
}

async function callWebhook(config: any, triggerData: any): Promise<any> {
  const response = await fetch(config.webhook_url, {
    method: config.method || 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(config.headers || {}),
    },
    body: JSON.stringify({
      ...triggerData,
      ...config.payload,
    }),
  });

  if (!response.ok) {
    throw new Error(`Webhook returned ${response.status}`);
  }

  return await response.json();
}

async function updateTag(config: any, triggerData: any, supabaseUrl: string, serviceKey: string): Promise<any> {
  const supabase = createClient(supabaseUrl, serviceKey);

  if (config.target_type === 'note' && triggerData.note_id) {
    const { data, error } = await supabase
      .from('notes')
      .update({ tags: config.tags })
      .eq('id', triggerData.note_id)
      .select();

    if (error) throw error;
    return { updated_note_id: triggerData.note_id, tags: config.tags };
  }

  throw new Error('Invalid tag update configuration');
}

/**
 * Replace placeholders in text with trigger data
 */
function replacePlaceholders(text: string, data: Record<string, any>): string {
  if (!text) return '';

  return text.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
    const value = getNestedValue(data, path);
    return value !== undefined ? String(value) : match;
  });
}

/**
 * Update execution status in database
 */
async function updateExecutionStatus(
  supabase: any,
  executionId: string,
  status: string,
  actionResult: any,
  startTime: number,
  errorMessage: string | null
): Promise<void> {
  const executionTime = Math.round(performance.now() - startTime);

  const { error } = await supabase
    .from('automation_executions')
    .update({
      status,
      action_result: actionResult || {},
      error_message: errorMessage,
      execution_time_ms: executionTime,
      completed_at: new Date().toISOString(),
    })
    .eq('id', executionId);

  if (error) {
    console.error('❌ Failed to update execution status:', error);
  }
}

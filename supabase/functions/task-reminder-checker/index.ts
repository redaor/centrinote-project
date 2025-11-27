// =====================================================
// TASK REMINDER CHECKER - Supabase Edge Function
// Vérifie les tâches avec rappels et envoie des notifications
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
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  try {
    console.log('⏰ [TASK-REMINDER] Starting task reminder check');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!supabaseServiceKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculer la fenêtre de temps : tâches qui commencent dans les 15 prochaines minutes
    const now = new Date();
    const in15Minutes = new Date(now.getTime() + 15 * 60 * 1000);

    console.log(`⏰ [TASK-REMINDER] Checking tasks between ${now.toISOString()} and ${in15Minutes.toISOString()}`);

    // Récupérer les tâches avec rappel qui commencent bientôt et ne sont pas complétées
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*, profiles:user_id(name, email)')
      .eq('reminder', true)
      .eq('completed', false)
      .gte('start_time', now.toISOString())
      .lte('start_time', in15Minutes.toISOString());

    if (tasksError) {
      console.error('❌ [TASK-REMINDER] Error fetching tasks:', tasksError);
      throw tasksError;
    }

    console.log(`📋 [TASK-REMINDER] Found ${tasks?.length || 0} tasks with reminders`);

    if (!tasks || tasks.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          reminders_sent: 0,
          message: 'No tasks with reminders found',
          timestamp: new Date().toISOString()
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    let remindersSent = 0;

    // Pour chaque tâche, envoyer une notification
    for (const task of tasks) {
      try {
        const startTime = new Date(task.start_time);
        const minutesUntilStart = Math.round((startTime.getTime() - now.getTime()) / 60000);

        // Construire le message de notification
        const title = `📅 Rappel : ${task.title}`;
        let message = `Ta tâche commence `;
        if (minutesUntilStart <= 0) {
          message += 'maintenant !';
        } else if (minutesUntilStart === 1) {
          message += 'dans 1 minute';
        } else {
          message += `dans ${minutesUntilStart} minutes`;
        }

        if (task.description) {
          message += `\n${task.description}`;
        }

        // Déterminer le type et la priorité
        let notifPriority: 'low' | 'normal' | 'high' | 'urgent' = 'normal';
        if (task.priority === 'high') {
          notifPriority = 'urgent';
        } else if (task.priority === 'medium') {
          notifPriority = 'high';
        }

        // Icône selon la catégorie
        const categoryEmojis: Record<string, string> = {
          study: '📚',
          meeting: '👥',
          review: '🔄',
          break: '☕',
          personal: '👤'
        };

        const emoji = categoryEmojis[task.category] || '📌';

        console.log(`📤 [TASK-REMINDER] Sending notification for task ${task.id} to user ${task.user_id}`);

        // Appeler la fonction automation-notification
        const notificationUrl = `${supabaseUrl}/functions/v1/automation-notification`;
        const notificationResponse = await fetch(notificationUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: task.user_id,
            title: `${emoji} ${title}`,
            message: message,
            type: 'info',
            priority: notifPriority,
            action_url: '/planning',
            metadata: {
              task_id: task.id,
              task_category: task.category,
              task_priority: task.priority,
              start_time: task.start_time,
              reminder_type: 'task'
            }
          })
        });

        if (!notificationResponse.ok) {
          const errorText = await notificationResponse.text();
          console.error(`❌ [TASK-REMINDER] Failed to send notification for task ${task.id}:`, errorText);
        } else {
          console.log(`✅ [TASK-REMINDER] Notification sent for task ${task.id}`);
          remindersSent++;
        }

      } catch (taskError) {
        console.error(`❌ [TASK-REMINDER] Error processing task ${task.id}:`, taskError);
      }
    }

    console.log(`✅ [TASK-REMINDER] Task reminder check completed. Sent ${remindersSent}/${tasks.length} reminders`);

    return new Response(
      JSON.stringify({
        success: true,
        tasks_checked: tasks.length,
        reminders_sent: remindersSent,
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('❌ [TASK-REMINDER] Task reminder checker error:', error);
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

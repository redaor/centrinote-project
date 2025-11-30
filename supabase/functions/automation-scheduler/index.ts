// =====================================================
// AUTOMATION SCHEDULER - Supabase Edge Function
// Cron-triggered scheduler for autonomous automations
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Content-Type': 'application/json',
};

interface ScheduledAutomation {
  id: string;
  user_id: string;
  name: string;
  trigger_type: string;
  trigger_config: any;
  action_type: string;
  action_config: any;
  conditions: any[];
  schedule_config: {
    cron_expression?: string;
    interval_minutes?: number;
    timezone?: string;
  };
  priority: number;
  last_executed_at: string | null;
  next_execution_at: string | null;
  user_local_time?: string; // Format "HH:mm" (ex: "22:00")
  user_timezone?: string; // Format IANA (ex: "Europe/Paris")
}

serve(async (req) => {
  // Debug: Vérifier le header Authorization reçu
  const authHeader = req.headers.get('Authorization');
  console.log('🔑 Authorization header reçu :', authHeader ? `${authHeader.substring(0, 20)}...` : 'AUCUN HEADER');
  console.log('📋 Tous les headers reçus :', Object.fromEntries(req.headers.entries()));

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  try {
    console.log('🕐 Automation Scheduler - Starting execution');

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://wjzlicokhxitmeoxkjzv.supabase.co';

    // 🔐 SÉCURITÉ : Utiliser uniquement les variables d'environnement
    // Configurées via: supabase secrets set SUPABASE_SERVICE_ROLE_KEY="..."
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseServiceKey) {
      console.error('❌ CRITICAL: SUPABASE_SERVICE_ROLE_KEY non définie');
      throw new Error('SUPABASE_SERVICE_ROLE_KEY must be set in Edge Function secrets');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const schedulerRunId = crypto.randomUUID();

    console.log(`📅 Scheduler Run ID: ${schedulerRunId}`);
    console.log(`⏰ Current time: ${now.toISOString()}`);

    // Fetch all active automations
    // Pour les automations avec user_local_time, on vérifie toutes les heures
    const { data: automations, error: fetchError } = await supabase
      .from('automations')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: false });
    
    // Récupérer les timezones des utilisateurs depuis profiles
    const userIds = [...new Set((automations || []).map(a => a.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, timezone')
      .in('id', userIds);
    
    const timezoneMap = new Map((profiles || []).map(p => [p.id, p.timezone]));
    
    // Enrichir les automations avec le timezone depuis profiles
    const enrichedAutomations = (automations || []).map(automation => ({
      ...automation,
      user_timezone: automation.user_timezone || timezoneMap.get(automation.user_id) || 'Europe/Paris'
    }));

    if (fetchError) {
      console.error('❌ Error fetching automations:', fetchError);
      throw fetchError;
    }

    if (!automations || automations.length === 0) {
      console.log('✅ No automations due for execution');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No automations scheduled',
          scheduler_run_id: schedulerRunId,
          timestamp: now.toISOString()
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    console.log(`📋 Found ${automations.length} automations to process`);

    const results = [];

    // Process each automation
    for (const automation of enrichedAutomations as ScheduledAutomation[]) {
      console.log(`\n🔄 Processing automation: ${automation.name} (${automation.id})`);
      console.log(`   - is_active: ${automation.is_active}`);
      console.log(`   - user_local_time: ${automation.user_local_time || 'N/A'}`);
      console.log(`   - user_timezone: ${automation.user_timezone || 'N/A'}`);
      console.log(`   - next_execution_at: ${automation.next_execution_at || 'N/A'}`);

      try {
        // Check if it's time to execute based on schedule config or local time
        const shouldExecute = await checkExecutionTime(automation, now);
        console.log(`   - shouldExecute: ${shouldExecute}`);

        if (!shouldExecute) {
          console.log(`⏭️ Skipping ${automation.name} - not yet due`);
          continue;
        }

        console.log(`✅ Automation ${automation.name} should execute NOW`);

        // ✅ PROTECTION 1 : Vérifier si déjà exécutée récemment (dans les 5 dernières minutes)
        if (automation.last_executed_at) {
          const lastExec = new Date(automation.last_executed_at);
          const minutesSinceLastExec = (now.getTime() - lastExec.getTime()) / (1000 * 60);
          
          if (minutesSinceLastExec < 5) {
            console.log(`⏭️ Automation ${automation.name} was executed ${minutesSinceLastExec.toFixed(1)} minutes ago, skipping (too recent)`);
            results.push({
              automation_id: automation.id,
              automation_name: automation.name,
              status: 'skipped',
              reason: `Executed ${minutesSinceLastExec.toFixed(1)} minutes ago (too recent)`
            });
            continue;
          }
        }

        // ✅ PROTECTION 2 : Vérifier le verrou d'exécution (si la fonction existe)
        let lockAcquired = true;
        try {
          const { data: lockResult, error: lockError } = await supabase.rpc('try_lock_automation_execution', {
            p_automation_id: automation.id,
            p_lock_duration_minutes: 5
          });

          if (lockError) {
            // Si la fonction n'existe pas encore, on continue (fallback)
            console.warn(`⚠️ Lock function not available for ${automation.name} (migration may not be applied):`, lockError.message);
            lockAcquired = true; // On continue quand même
          } else if (lockResult === false) {
            console.log(`🔒 Automation ${automation.name} is already locked (execution in progress), skipping`);
            results.push({
              automation_id: automation.id,
              automation_name: automation.name,
              status: 'skipped',
              reason: 'Already executing (locked)'
            });
            continue;
          } else {
            console.log(`🔓 Lock acquired for ${automation.name}`);
            lockAcquired = true;
          }
        } catch (err) {
          // Si la fonction RPC n'existe pas, on continue avec la protection temporelle uniquement
          console.warn(`⚠️ Could not check lock for ${automation.name} (function may not exist):`, err);
          lockAcquired = true;
        }

        // ✅ PROTECTION 3 : Vérifier le verrou directement dans la table (fallback)
        if (automation.execution_lock) {
          const lockTime = new Date(automation.execution_lock);
          if (lockTime > now) {
            const minutesUntilUnlock = (lockTime.getTime() - now.getTime()) / (1000 * 60);
            console.log(`🔒 Automation ${automation.name} is locked until ${lockTime.toISOString()} (${minutesUntilUnlock.toFixed(1)} min remaining), skipping`);
            results.push({
              automation_id: automation.id,
              automation_name: automation.name,
              status: 'skipped',
              reason: `Locked until ${lockTime.toISOString()}`
            });
            continue;
          }
        }

        // ✅ Détecter si c'est un micro template (focus_mode, break_time, daily_quote, study-reminder, daily-review, vocab-milestone, forgotten-notes, weekly-summary, monthly-report)
        const microTemplates = ['focus_mode', 'break_time', 'daily_quote', 'study-reminder', 'daily-review', 'vocab-milestone', 'forgotten-notes', 'weekly-summary', 'monthly-report'];
        const isMicroTemplate = microTemplates.includes(automation.name);

        let runnerResult: any;
        
        if (isMicroTemplate) {
          // Appeler automation-micro-runner pour les micro templates
          console.log(`🔧 Detected micro template: ${automation.name}`);
          console.log(`   → Calling automation-micro-runner with templateId: ${automation.name}`);
          const microRunnerUrl = `${supabaseUrl}/functions/v1/automation-micro-runner`;
          console.log(`   → URL: ${microRunnerUrl}`);
          console.log(`   → Service key length: ${supabaseServiceKey.length}`);
          console.log(`   → Service key prefix: ${supabaseServiceKey.substring(0, 20)}...`);
          
          // ✅ Envoyer le service key pour l'authentification
          // Supabase valide le JWT dans le header Authorization
          const microRunnerResponse = await fetch(microRunnerUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              templateId: automation.name,
              userId: automation.user_id,
              config: automation.trigger_config || {},
            }),
          });

          if (!microRunnerResponse.ok) {
            const errorText = await microRunnerResponse.text();
            console.error(`❌ Micro runner error: ${microRunnerResponse.status} - ${errorText}`);
            throw new Error(`Micro runner returned ${microRunnerResponse.status}: ${errorText}`);
          }

          runnerResult = await microRunnerResponse.json();
          console.log(`✅ Triggered micro template: ${automation.name}`);
          console.log(`   → Execution ID: ${runnerResult.execution_id || 'N/A'}`);
          console.log(`   → Result: ${JSON.stringify(runnerResult).substring(0, 200)}`);
        } else {
          // Appeler automation-runner pour les automations classiques
          console.log(`🔧 Calling automation-runner for classic automation: ${automation.name}`);
          const runnerUrl = `${supabaseUrl}/functions/v1/automation-runner`;
          console.log(`   → URL: ${runnerUrl}`);
          const runnerResponse = await fetch(runnerUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              automation_id: automation.id,
              trigger_data: {
                type: 'scheduled',
                scheduler_run_id: schedulerRunId,
                scheduled_at: now.toISOString(),
              },
            }),
          });

          if (!runnerResponse.ok) {
            const errorText = await runnerResponse.text();
            throw new Error(`Runner returned ${runnerResponse.status}: ${errorText}`);
          }

          runnerResult = await runnerResponse.json();
          console.log(`✅ Triggered automation: ${automation.name}`);
        }

        // Calculate next execution time
        // Pour les automations avec user_local_time, on recalcule pour demain à la même heure locale
        let nextExecution: string | null;
        if (automation.user_local_time) {
          const timezone = automation.user_timezone || 'Europe/Paris';
          nextExecution = calculateNextExecutionFromLocalTime(automation.user_local_time, timezone, now);
        } else {
          nextExecution = calculateNextExecution(automation, now);
        }

        // Update automation with next execution time and release lock
        // IMPORTANT: Mettre à jour last_executed_at IMMÉDIATEMENT pour éviter les exécutions multiples
        await supabase
          .from('automations')
          .update({
            last_executed_at: now.toISOString(), // ✅ Mise à jour IMMÉDIATE pour protection
            next_execution_at: nextExecution,
            updated_at: now.toISOString(),
            execution_lock: null, // Libérer le verrou après exécution réussie
          })
          .eq('id', automation.id);

        // Libérer le verrou explicitement (au cas où)
        try {
          await supabase.rpc('release_automation_lock', {
            p_automation_id: automation.id
          });
        } catch (err) {
          // Si la fonction n'existe pas, ce n'est pas grave
          console.warn(`⚠️ Could not release lock (function may not exist yet):`, err);
        }

        results.push({
          automation_id: automation.id,
          automation_name: automation.name,
          status: 'triggered',
          execution_id: runnerResult.execution_id,
          next_execution: nextExecution,
        });

      } catch (error) {
        console.error(`❌ Error processing automation ${automation.id}:`, error);
        
        // Libérer le verrou en cas d'erreur
        await supabase.rpc('release_automation_lock', {
          p_automation_id: automation.id
        }).catch(err => {
          console.error(`⚠️ Error releasing lock:`, err);
        });
        
        results.push({
          automation_id: automation.id,
          automation_name: automation.name,
          status: 'error',
          error: error.message,
        });
      }
    }

    console.log(`\n🏁 Scheduler completed: ${results.length} automations processed`);

    return new Response(
      JSON.stringify({
        success: true,
        scheduler_run_id: schedulerRunId,
        timestamp: now.toISOString(),
        processed_count: results.length,
        results,
      }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('❌ Scheduler error:', error);
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

/**
 * Check if automation should execute based on schedule config or local time
 * NOUVELLE LOGIQUE SIMPLIFIÉE : Vérifie si c'est l'heure locale de l'utilisateur
 */
async function checkExecutionTime(automation: ScheduledAutomation, now: Date): Promise<boolean> {
  const { schedule_config, last_executed_at, user_local_time, user_timezone, next_execution_at } = automation;

  // ✅ PRIORITÉ 1 : Vérifier next_execution_at (plus fiable)
  if (next_execution_at) {
    const nextExec = new Date(next_execution_at);
    const diffMs = now.getTime() - nextExec.getTime();
    const diffMinutes = diffMs / (1000 * 60);
    
    // Exécuter si next_execution_at est passé (avec une marge de 2 minutes pour le cron)
    if (diffMinutes >= -2 && diffMinutes <= 5) {
      console.log(`✅ next_execution_at atteint pour ${automation.name}: ${next_execution_at} (diff: ${diffMinutes.toFixed(1)} min)`);
      return true;
    } else {
      console.log(`⏰ next_execution_at pour ${automation.name}: ${next_execution_at} (diff: ${diffMinutes.toFixed(1)} min, pas encore l'heure)`);
      return false;
    }
  }

  // ✅ PRIORITÉ 2 : Si user_local_time est défini, vérifier l'heure locale
  if (user_local_time) {
    const timezone = user_timezone || 'Europe/Paris';
    
    // Obtenir l'heure locale actuelle dans le fuseau horaire de l'utilisateur
    const localTimeFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    const currentLocalTime = localTimeFormatter.format(now);
    
    // Comparer avec l'heure cible (format "HH:mm")
    // ⚠️ IMPORTANT : Le format de Intl.DateTimeFormat peut varier selon la locale
    // On normalise pour s'assurer du format "HH:mm"
    const normalizedCurrent = currentLocalTime.padStart(5, '0'); // S'assurer du format "HH:mm"
    const normalizedTarget = user_local_time.padStart(5, '0');
    
    // 🔍 DEBUG : Log détaillé pour daily_quote et study-reminder
    if (automation.name === 'daily_quote' || automation.name === 'study-reminder') {
      console.log(`🔍 DEBUG ${automation.name}:`);
      console.log(`   - user_local_time (raw): ${user_local_time}`);
      console.log(`   - user_timezone (raw): ${user_timezone}`);
      console.log(`   - timezone utilisé: ${timezone}`);
      console.log(`   - currentLocalTime (format): ${currentLocalTime}`);
      console.log(`   - normalizedCurrent: ${normalizedCurrent}`);
      console.log(`   - normalizedTarget: ${normalizedTarget}`);
      console.log(`   - Comparaison: "${normalizedCurrent}" === "${normalizedTarget}" ?`);
    }
    
    const isTime = normalizedCurrent === normalizedTarget;
    
    if (isTime) {
      console.log(`✅ Heure locale atteinte pour ${automation.name}: ${normalizedCurrent} === ${normalizedTarget} (timezone: ${timezone})`);
      return true;
    } else {
      // Log pour debug (seulement si proche de l'heure cible OU pour daily_quote/study-reminder)
      const [targetHour, targetMinute] = normalizedTarget.split(':').map(Number);
      const [currentHour, currentMinute] = normalizedCurrent.split(':').map(Number);
      const diffMinutes = (currentHour * 60 + currentMinute) - (targetHour * 60 + targetMinute);
      
      // Log toujours pour daily_quote/study-reminder, ou si proche de l'heure cible
      if (automation.name === 'daily_quote' || automation.name === 'study-reminder' || Math.abs(diffMinutes) <= 5) {
        console.log(`⏰ Heure locale pour ${automation.name}: ${normalizedCurrent} (cible: ${normalizedTarget}, diff: ${diffMinutes} min, timezone: ${timezone})`);
      }
    }
    
    // Si ce n'est pas l'heure, ne pas exécuter
    return false;
  }

  // Ancienne logique pour les automations sans user_local_time
  // If no schedule config, execute immediately
  if (!schedule_config) return true;

  // Check interval-based execution
  if (schedule_config.interval_minutes) {
    if (!last_executed_at) return true;

    const lastExec = new Date(last_executed_at);
    const minutesSinceLastExec = (now.getTime() - lastExec.getTime()) / (1000 * 60);

    return minutesSinceLastExec >= schedule_config.interval_minutes;
  }

  // For cron expressions, rely on next_execution_at which should be pre-calculated
  return true;
}

/**
 * Calculate next execution time from local time (simplified logic)
 */
function calculateNextExecutionFromLocalTime(localTime: string, timezone: string, now: Date): string {
  const [targetHours, targetMinutes] = localTime.split(':').map(Number);
  
  // Obtenir l'heure locale actuelle
  const localTimeFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  const localParts = localTimeFormatter.formatToParts(now);
  const localPartsObj: Record<string, string> = {};
  localParts.forEach(part => {
    if (part.type !== 'literal') {
      localPartsObj[part.type] = part.value;
    }
  });

  const currentLocalYear = parseInt(localPartsObj.year);
  const currentLocalMonth = parseInt(localPartsObj.month) - 1;
  const currentLocalDay = parseInt(localPartsObj.day);
  const currentLocalHour = parseInt(localPartsObj.hour);
  const currentLocalMinute = parseInt(localPartsObj.minute);

  // Comparer l'heure actuelle avec l'heure cible
  const currentLocalTime = currentLocalHour * 60 + currentLocalMinute;
  const targetTime = targetHours * 60 + targetMinutes;

  // Déterminer la date cible (aujourd'hui ou demain)
  let targetYear = currentLocalYear;
  let targetMonth = currentLocalMonth;
  let targetDay = currentLocalDay;

  // Si l'heure cible est déjà passée aujourd'hui → programmer pour demain
  if (targetTime <= currentLocalTime) {
    targetDay = currentLocalDay + 1;
  }

  // Créer une date locale pour demain à l'heure cible
  const localDate = new Date(currentLocalYear, currentLocalMonth, targetDay, targetHours, targetMinutes, 0, 0);
  
  // Convertir en UTC en utilisant le fuseau horaire
  // On utilise une approche simple : créer une date "naive" et la convertir
  const dateStr = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}T${String(targetHours).padStart(2, '0')}:${String(targetMinutes).padStart(2, '0')}:00`;
  
  // Obtenir l'offset UTC pour cette date dans ce fuseau horaire
  const tempDate = new Date(dateStr + 'Z');
  const utcFormatter = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', hour12: false });
  const tzFormatter = new Intl.DateTimeFormat('en-US', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: false });
  
  // Calculer l'offset (approximation simple)
  const utcTime = new Date(tempDate).getTime();
  const tzTime = new Date(tempDate.toLocaleString('en-US', { timeZone: timezone })).getTime();
  const offset = tzTime - utcTime;
  
  // Créer la date UTC finale
  const nextExecutionUTC = new Date(utcTime - offset);
  
  return nextExecutionUTC.toISOString();
}

/**
 * Calculate next execution time based on schedule config
 */
function calculateNextExecution(automation: ScheduledAutomation, now: Date): string | null {
  const { schedule_config } = automation;

  if (!schedule_config) return null;

  // Interval-based scheduling
  if (schedule_config.interval_minutes) {
    const next = new Date(now.getTime() + schedule_config.interval_minutes * 60 * 1000);
    return next.toISOString();
  }

  // Cron expression (simplified - for complex cron, use a library)
  if (schedule_config.cron_expression) {
    // Simple implementation for common patterns
    const cron = schedule_config.cron_expression;

    // Daily at specific time: "0 9 * * *" (9 AM daily)
    if (cron.match(/^\d+ \d+ \* \* \*$/)) {
      const [minute, hour] = cron.split(' ').map(Number);
      const next = new Date(now);
      next.setHours(hour, minute, 0, 0);

      // If time has passed today, schedule for tomorrow
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }
      return next.toISOString();
    }

    // Hourly: "0 * * * *"
    if (cron === '0 * * * *') {
      const next = new Date(now);
      next.setMinutes(0, 0, 0);
      next.setHours(next.getHours() + 1);
      return next.toISOString();
    }

    // Every X hours: "0 */X * * *"
    const hourlyMatch = cron.match(/^0 \*\/(\d+) \* \* \*$/);
    if (hourlyMatch) {
      const hours = parseInt(hourlyMatch[1]);
      const next = new Date(now.getTime() + hours * 60 * 60 * 1000);
      next.setMinutes(0, 0, 0);
      return next.toISOString();
    }
  }

  // Default: execute again in 1 hour
  const next = new Date(now.getTime() + 60 * 60 * 1000);
  return next.toISOString();
}

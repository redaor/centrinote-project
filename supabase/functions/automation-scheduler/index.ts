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

    // ➜ LOG BRUT : Récupérer les infos de l'appelant
    const callerIp = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";
    const userAgent = req.headers.get("user-agent") ?? "unknown";

    // ➜ LOG BRUT : chaque fois qu'une instance démarre
    try {
      await supabase.from("scheduler_run_log").insert({
        scheduler_run_id: schedulerRunId,
        caller_ip: callerIp,
        user_agent: userAgent,
        automation_name: null, // on remplira plus tard pour chaque automation
        automation_id: null,
        execution_time: now.toISOString(),
      });
      console.log(`📝 Logged scheduler entry: ${schedulerRunId} from ${callerIp}`);
    } catch (logError) {
      // Si la table n'existe pas encore, on continue quand même
      console.warn(`⚠️ Could not log scheduler entry (table may not exist):`, logError);
    }

    console.log(`📅 Scheduler Run ID: ${schedulerRunId}`);
    console.log(`⏰ Current time: ${now.toISOString()}`);
    console.log(`🌐 Caller IP: ${callerIp}`);
    console.log(`🔍 User-Agent: ${userAgent}`);

    // ✅ VERROU GLOBAL : Empêcher les exécutions multiples simultanées du scheduler
    try {
      const { data: globalLockResult, error: globalLockError } = await supabase.rpc('try_lock_scheduler', {
        p_lock_duration_minutes: 5,
        p_scheduler_run_id: schedulerRunId
      });

      if (globalLockError) {
        console.warn(`⚠️ Global lock function not available (migration may not be applied):`, globalLockError.message);
        // Continuer sans verrou global si la fonction n'existe pas encore
      } else if (globalLockResult === false) {
        console.log(`🔒 Scheduler is already locked (another instance is running), skipping this execution`);
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Scheduler already running (locked)',
            scheduler_run_id: schedulerRunId,
            timestamp: now.toISOString(),
            skipped: true
          }),
          { status: 200, headers: corsHeaders }
        );
      } else {
        console.log(`🔓 Global scheduler lock acquired (run ID: ${schedulerRunId})`);
      }
    } catch (err) {
      console.warn(`⚠️ Could not acquire global lock (function may not exist):`, err);
      // Continuer sans verrou global si la fonction n'existe pas encore
    }

    console.log(`📅 Scheduler Run ID: ${schedulerRunId}`);
    console.log(`⏰ Current time: ${now.toISOString()}`);

    // Fetch all active automations
    // Pour les automations avec user_local_time, on vérifie toutes les heures
    // ✅ IMPORTANT : Récupérer aussi last_executed_at pour la vérification de dédoublonnage
    const { data: automations, error: fetchError } = await supabase
      .from('automations')
      .select('*, last_executed_at, next_execution_at')
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
      console.log(`   - last_executed_at: ${automation.last_executed_at || 'N/A'}`);

      try {
        // ✅ PROTECTION CRITIQUE : Vérifier last_executed_at AVANT checkExecutionTime
        // Si déjà exécuté dans les 5 dernières minutes, skip immédiatement
        if (automation.last_executed_at) {
          const lastExec = new Date(automation.last_executed_at);
          const minutesSinceLastExec = (now.getTime() - lastExec.getTime()) / (1000 * 60);
          
          if (minutesSinceLastExec < 5) {
            console.log(`⏭️ [SCHEDULER] Automation ${automation.name} was executed ${minutesSinceLastExec.toFixed(1)} minutes ago, skipping (too recent)`);
            results.push({
              automation_id: automation.id,
              automation_name: automation.name,
              status: 'skipped',
              reason: `Executed ${minutesSinceLastExec.toFixed(1)} minutes ago (too recent)`
            });
            continue;
          }
        }

        // Check if it's time to execute based on schedule config or local time
        const shouldExecute = await checkExecutionTime(automation, now);
        console.log(`   - shouldExecute: ${shouldExecute}`);

        if (!shouldExecute) {
          console.log(`⏭️ Skipping ${automation.name} - not yet due`);
          continue;
        }

        console.log(`✅ Automation ${automation.name} should execute NOW`);

        // ➜ LOG BRUT : chaque automation traitée
        try {
          await supabase.from("scheduler_run_log").insert({
            scheduler_run_id: schedulerRunId,
            caller_ip: callerIp,
            user_agent: userAgent,
            automation_name: automation.name,
            automation_id: automation.id,
            execution_time: now.toISOString(),
          }).catch(() => {
            // Ignore les erreurs de contrainte unique (déjà loggé)
          });
        } catch (logError) {
          // Si la table n'existe pas encore, on continue quand même
          console.warn(`⚠️ Could not log automation entry:`, logError);
        }

        // ✅ CRITIQUE : Mettre à jour next_execution_at IMMÉDIATEMENT pour éviter les déclenchements multiples
        // Calculer la prochaine exécution AVANT d'appeler automation-micro-runner
        let nextExecution: string | null;
        if (automation.user_local_time) {
          const timezone = automation.user_timezone || 'Europe/Paris';
          nextExecution = calculateNextExecutionFromLocalTime(automation.user_local_time, timezone, now);
        } else {
          nextExecution = calculateNextExecution(automation, now);
        }

        // Mettre à jour next_execution_at IMMÉDIATEMENT (verrou pour empêcher les autres instances)
        // Utiliser une condition optimiste : mettre à jour seulement si next_execution_at n'a pas changé
        let updateNextExecQuery = supabase
          .from('automations')
          .update({
            next_execution_at: nextExecution,
            updated_at: now.toISOString()
          })
          .eq('id', automation.id);
        
        // Condition optimiste : seulement si next_execution_at n'a pas changé
        if (automation.next_execution_at) {
          updateNextExecQuery = updateNextExecQuery.eq('next_execution_at', automation.next_execution_at);
        } else {
          updateNextExecQuery = updateNextExecQuery.is('next_execution_at', null);
        }
        
        const { data: updateNextExecData, error: nextExecError } = await updateNextExecQuery.select('id').limit(1);

        // Si la mise à jour n'a affecté aucune ligne (quelqu'un d'autre a déjà mis à jour), skip
        if (nextExecError || !updateNextExecData || updateNextExecData.length === 0) {
          console.log(`⚠️ [SCHEDULER] Failed to update next_execution_at for ${automation.name} (already updated by another instance), skipping`);
          results.push({
            automation_id: automation.id,
            automation_name: automation.name,
            status: 'skipped',
            reason: 'next_execution_at already updated by another instance'
          });
          continue;
        }

        console.log(`🔒 [SCHEDULER] next_execution_at updated for ${automation.name}, proceeding with execution`);

        // ✅ PROTECTION ATOMIQUE : Verrou + mise à jour last_executed_at dans la même transaction
        let lockAcquired = false;
        try {
          // Utiliser la nouvelle fonction atomique qui fait tout en une transaction
          const { data: lockResult, error: lockError } = await supabase.rpc('try_lock_and_update_automation', {
            p_automation_id: automation.id,
            p_lock_duration_minutes: 5,
            p_execution_time: now.toISOString()
          });

          if (lockError) {
            // Si la fonction n'existe pas encore, fallback sur l'ancienne méthode
            console.warn(`⚠️ Atomic lock function not available for ${automation.name} (migration may not be applied):`, lockError.message);
            
            // Fallback : Vérifier si déjà exécutée récemment
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
            
            // Fallback : Vérifier le verrou directement dans la table
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
            
            lockAcquired = true; // On continue avec les protections de fallback
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
            console.log(`🔓 Atomic lock acquired for ${automation.name} (last_executed_at updated in same transaction)`);
            lockAcquired = true;
          }
        } catch (err) {
          // Si la fonction RPC n'existe pas, on continue avec les protections de fallback
          console.warn(`⚠️ Could not acquire atomic lock for ${automation.name} (function may not exist):`, err);
          
          // Fallback : Vérifier si déjà exécutée récemment
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
          
          lockAcquired = true; // On continue avec les protections de fallback
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

        // ✅ next_execution_at a déjà été mis à jour AVANT l'appel à automation-micro-runner
        // Il ne reste plus qu'à libérer le verrou si nécessaire
        try {
          // Libérer le verrou si la fonction existe
          await supabase.rpc('release_automation_lock', {
            p_automation_id: automation.id
          });
          console.log(`✅ Lock released for ${automation.name}`);
        } catch (releaseErr) {
          // Si la fonction n'existe pas, ce n'est pas grave
          console.warn(`⚠️ Could not release lock (function may not exist yet):`, releaseErr);
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

    // ✅ Libérer le verrou global du scheduler
    try {
      await supabase.rpc('release_scheduler_lock');
      console.log(`🔓 Global scheduler lock released`);
    } catch (err) {
      console.warn(`⚠️ Could not release global lock (function may not exist):`, err);
    }

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
    
    // ✅ Libérer le verrou global en cas d'erreur
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://wjzlicokhxitmeoxkjzv.supabase.co';
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      if (supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        await supabase.rpc('release_scheduler_lock');
        console.log(`🔓 Global scheduler lock released (after error)`);
      }
    } catch (releaseErr) {
      console.warn(`⚠️ Could not release global lock after error:`, releaseErr);
    }
    
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
    
    // ✅ CORRECTION : Exécuter SEULEMENT si next_execution_at est passé (>= 0) et dans les 2 minutes suivantes
    // Cela évite les déclenchements avant l'heure (09h58, 09h59) et limite à une fenêtre de 2 minutes après
    if (diffMinutes >= 0 && diffMinutes <= 2) {
      console.log(`✅ next_execution_at atteint pour ${automation.name}: ${next_execution_at} (diff: ${diffMinutes.toFixed(1)} min)`);
      return true;
    } else {
      if (diffMinutes < 0) {
        console.log(`⏰ next_execution_at pour ${automation.name}: ${next_execution_at} (diff: ${diffMinutes.toFixed(1)} min, pas encore l'heure - trop tôt)`);
      } else {
        console.log(`⏰ next_execution_at pour ${automation.name}: ${next_execution_at} (diff: ${diffMinutes.toFixed(1)} min, trop tard - fenêtre dépassée)`);
      }
      return false;
    }
  }

  // ✅ PRIORITÉ 2 : Si user_local_time est défini, vérifier l'heure locale
  // ⚠️ ATTENTION : Si next_execution_at n'est pas défini, on utilise user_local_time
  // Mais on doit aussi vérifier last_executed_at pour éviter les doublons
  if (user_local_time && !next_execution_at) {
    const timezone = user_timezone || 'Europe/Paris';
    
    // ✅ PROTECTION : Vérifier si déjà exécuté aujourd'hui (pour daily) ou cette semaine (pour weekly)
    if (last_executed_at) {
      const lastExec = new Date(last_executed_at);
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      const lastExecDate = new Date(lastExec);
      lastExecDate.setHours(0, 0, 0, 0);
      
      // Pour daily_quote : vérifier si déjà exécuté aujourd'hui
      if (automation.name === 'daily_quote' && lastExecDate.getTime() === today.getTime()) {
        console.log(`⏭️ [SCHEDULER] ${automation.name} already executed today (${last_executed_at}), skipping`);
        return false;
      }
      
      // Pour weekly-summary : vérifier si déjà exécuté cette semaine
      if (automation.name === 'weekly-summary') {
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        if (lastExec.getTime() > weekAgo.getTime()) {
          console.log(`⏭️ [SCHEDULER] ${automation.name} already executed this week (${last_executed_at}), skipping`);
          return false;
        }
      }
      
      // Pour monthly-report : vérifier si déjà exécuté ce mois
      if (automation.name === 'monthly-report') {
        const monthAgo = new Date(now);
        monthAgo.setDate(monthAgo.getDate() - 30);
        if (lastExec.getTime() > monthAgo.getTime()) {
          console.log(`⏭️ [SCHEDULER] ${automation.name} already executed this month (${last_executed_at}), skipping`);
          return false;
        }
      }
    }
    
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
    if (automation.name === 'daily_quote' || automation.name === 'study-reminder' || automation.name === 'weekly-summary' || automation.name === 'monthly-report') {
      console.log(`🔍 DEBUG ${automation.name}:`);
      console.log(`   - user_local_time (raw): ${user_local_time}`);
      console.log(`   - user_timezone (raw): ${user_timezone}`);
      console.log(`   - timezone utilisé: ${timezone}`);
      console.log(`   - currentLocalTime (format): ${currentLocalTime}`);
      console.log(`   - normalizedCurrent: ${normalizedCurrent}`);
      console.log(`   - normalizedTarget: ${normalizedTarget}`);
      console.log(`   - Comparaison: "${normalizedCurrent}" === "${normalizedTarget}" ?`);
      console.log(`   - last_executed_at: ${last_executed_at || 'NULL'}`);
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
      
      // Log toujours pour daily_quote/study-reminder/weekly-summary/monthly-report, ou si proche de l'heure cible
      if (automation.name === 'daily_quote' || automation.name === 'study-reminder' || automation.name === 'weekly-summary' || automation.name === 'monthly-report' || Math.abs(diffMinutes) <= 5) {
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

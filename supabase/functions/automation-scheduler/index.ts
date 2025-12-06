// Ajouter au début du fichier
const LOCK_DURATION_SECONDS = 120; // 2 minutes pour permettre l'exécution complète

// Fonction helper pour créer un ID de verrou unique
function createLockId(automationId: string): number {
    // Utiliser les 16 premiers caractères du UUID pour créer un BIGINT
    const hexPrefix = automationId.replace(/-/g, '').substring(0, 16);
    return parseInt(hexPrefix, 16) % 9223372036854775807; // Max BIGINT
}

// Fonction pour essayer d'obtenir un verrou
async function tryAcquireLock(
    supabase: any,
    automationId: string,
    automationName: string
): Promise<boolean> {
    try {
        const { data, error } = await supabase.rpc('try_lock_automation', {
            p_automation_id: automationId,
            p_lock_duration_seconds: LOCK_DURATION_SECONDS
        });

        if (error) {
            console.error(`❌ [LOCK] Error acquiring lock for ${automationName}:`, error);
            return false;
        }

        return data === true;
    } catch (err) {
        console.error(`❌ [LOCK] Exception acquiring lock for ${automationName}:`, err);
        return false;
    }
}

// Fonction pour libérer un verrou
async function releaseLock(
    supabase: any,
    automationId: string,
    automationName: string
): Promise<void> {
    try {
        await supabase.rpc('release_automation_lock', {
            p_automation_id: automationId
        });
        console.log(`🔓 [LOCK] Lock released for ${automationName}`);
    } catch (err) {
        console.error(`❌ [LOCK] Error releasing lock for ${automationName}:`, err);
    }
}

// Modifier la boucle principale dans serve()
async function serve(req: Request) {
    // ... code existant ...

    // Récupérer les automations actives
    const { data: automations, error } = await getActiveAutomations(supabase);
    
    if (error || !automations) {
        console.error('❌ [SCHEDULER] Error fetching automations:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch automations' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    console.log(`🔍 [SCHEDULER] Found ${automations.length} active automations`);

    // Nettoyer les verrous expirés
    try {
        const { data: cleanedCount } = await supabase.rpc('cleanup_expired_automation_locks');
        if (cleanedCount > 0) {
            console.log(`🧹 [SCHEDULER] Cleaned up ${cleanedCount} expired locks`);
        }
    } catch (err) {
        console.error('❌ [SCHEDULER] Error cleaning expired locks:', err);
    }

    // Traiter chaque automation
    for (const automation of automations) {
        try {
            console.log(`\n--- Processing automation: ${automation.name} (ID: ${automation.id}) ---`);

            // 1. ESSAYER D'OBTENIR LE VERROU (étape cruciale)
            const lockAcquired = await tryAcquireLock(supabase, automation.id, automation.name);
            
            if (!lockAcquired) {
                console.log(`⏭️ [SCHEDULER] ${automation.name} is locked by another instance, skipping`);
                continue;
            }

            console.log(`🔒 [SCHEDULER] Lock acquired for ${automation.name}`);

            // 2. Maintenant qu'on a le verrou, vérifier si c'est l'heure d'exécuter
            const now = new Date();
            
            // Toujours calculer next_execution_at AVANT la vérification
            let nextExecution = null;
            if (automation.user_local_time) {
                nextExecution = calculateNextExecutionFromLocalTime(
                    automation.user_local_time,
                    automation.user_timezone || 'Europe/Paris',
                    now
                );
            } else if (automation.next_execution_at) {
                nextExecution = new Date(automation.next_execution_at);
            }

            // Si next_execution_at est NULL, le calculer et mettre à jour IMMÉDIATEMENT
            if (!automation.next_execution_at && nextExecution) {
                console.log(`🔧 [SCHEDULER] Setting next_execution_at for ${automation.name} to ${nextExecution.toISOString()}`);
                
                const { data: updateData, error: updateError } = await supabase
                    .from('automations')
                    .update({ 
                        next_execution_at: nextExecution.toISOString(),
                        updated_at: now.toISOString()
                    })
                    .eq('id', automation.id)
                    .select('id')
                    .single();

                if (updateError) {
                    console.error(`❌ [SCHEDULER] Error updating next_execution_at for ${automation.name}:`, updateError);
                    await releaseLock(supabase, automation.id, automation.name);
                    continue;
                }

                automation.next_execution_at = nextExecution.toISOString();
            }

            // 3. ✅ Vérification ULTRA-STRICTE du timing (fenêtre de 30 secondes)
            const shouldExecute = await checkExecutionTimeStrict(automation, now);
            
            if (!shouldExecute) {
                console.log(`⏰ [SCHEDULER] ${automation.name} is not in execution window`);
                await releaseLock(supabase, automation.id, automation.name);
                continue;
            }

            console.log(`✅ [SCHEDULER] ${automation.name} is in execution window`);

            // 4. ✅ Mise à jour IMMÉDIATE de next_execution_at POUR LA PROCHAINE FOIS
            // Calculer la prochaine exécution (aujourd'hui si pas encore passée, sinon demain)
            let nextExecutionAfter: Date | null = null;
            
            if (automation.user_local_time) {
                const timezone = automation.user_timezone || 'Europe/Paris';
                nextExecutionAfter = calculateNextExecutionFromLocalTime(
                    automation.user_local_time,
                    timezone,
                    now
                );
            } else {
                nextExecutionAfter = calculateNextExecution(automation, now);
            }

            if (!nextExecutionAfter) {
                console.error(`❌ [SCHEDULER] Could not calculate next execution for ${automation.name}`);
                await releaseLock(supabase, automation.id, automation.name);
                continue;
            }

            // ✅ Mise à jour avec condition optimiste (empêche les doublons)
            const { data: updateData, error: updateError } = await supabase
                .from('automations')
                .update({ 
                    next_execution_at: nextExecutionAfter.toISOString(),
                    updated_at: now.toISOString()
                })
                .eq('id', automation.id)
                .eq('next_execution_at', automation.next_execution_at) // ✅ Condition optimiste
                .select('id')
                .single();

            if (updateError || !updateData) {
                console.log(`⏭️ [SCHEDULER] ${automation.name} next_execution_at was already updated by another instance`);
                await releaseLock(supabase, automation.id, automation.name);
                continue;
            }

            console.log(`🔄 [SCHEDULER] Set next execution for ${automation.name} to ${nextExecutionAfter.toISOString()}`);

            // 5. Appeler le micro-runner
            console.log(`🚀 [SCHEDULER] Calling automation-micro-runner for ${automation.name}`);
            
            const { error: runnerError } = await supabase.functions.invoke('automation-micro-runner', {
                body: { 
                    automation_id: automation.id,
                    test_mode: false
                }
            });

            if (runnerError) {
                console.error(`❌ [SCHEDULER] Error calling automation-micro-runner for ${automation.name}:`, runnerError);
                // Ne pas libérer le verrou immédiatement en cas d'erreur, 
                // laisser l'expiration s'occuper de ça pour éviter les réexécutions rapides
            } else {
                console.log(`✅ [SCHEDULER] Successfully triggered automation-micro-runner for ${automation.name}`);
            }

        } catch (error) {
            console.error(`❌ [SCHEDULER] Error processing automation ${automation.name}:`, error);
        } finally {
            // 6. TOUJOURS libérer le verrou à la fin
            try {
                await releaseLock(supabase, automation.id, automation.name);
            } catch (unlockError) {
                console.error(`❌ [SCHEDULER] Error releasing lock for ${automation.name}:`, unlockError);
            }
        }

        // Petit délai entre les automations pour éviter la surcharge
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n✅ [SCHEDULER] Completed processing ${automations.length} automations`);

    return new Response(JSON.stringify({ 
        success: true, 
        processed_count: automations.length,
        timestamp: new Date().toISOString()
    }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
}

/**
 * Calculate next execution time from local time
 * @param localTime - Format "HH:mm" (ex: "20:00")
 * @param timezone - IANA timezone (ex: "Europe/Paris")
 * @param now - Current date/time
 * @returns Date object of next execution time in UTC
 */
function calculateNextExecutionFromLocalTime(localTime: string, timezone: string, now: Date): Date {
    const [targetHours, targetMinutes] = localTime.split(':').map(Number);
    
    // Obtenir l'heure locale actuelle dans le fuseau horaire de l'utilisateur
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
    const currentLocalMonth = parseInt(localPartsObj.month) - 1; // Month is 0-indexed
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

    // Créer une date string au format ISO pour la date/heure cible dans le fuseau horaire
    const dateStr = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}T${String(targetHours).padStart(2, '0')}:${String(targetMinutes).padStart(2, '0')}:00`;
    
    // Méthode plus fiable : utiliser Intl.DateTimeFormat pour convertir la date locale en UTC
    // On crée une date "naive" (sans timezone) et on utilise toLocaleString pour obtenir l'offset
    const naiveDate = new Date(`${dateStr}Z`); // Créer une date UTC de référence
    
    // Obtenir l'heure UTC correspondant à l'heure locale dans le fuseau horaire
    // On utilise une approche : créer une date à minuit dans le fuseau horaire et calculer l'offset
    const midnightLocal = new Date(`${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}T00:00:00`);
    
    // Obtenir l'offset en comparant minuit UTC avec minuit dans le fuseau horaire
    const midnightUTC = new Date(`${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}T00:00:00Z`);
    const midnightLocalStr = midnightUTC.toLocaleString('en-US', { timeZone: timezone });
    const midnightLocalDate = new Date(midnightLocalStr);
    const offsetMs = midnightUTC.getTime() - midnightLocalDate.getTime();
    
    // Créer la date UTC finale : date locale + offset
    const targetLocalDate = new Date(`${dateStr}`);
    const nextExecutionUTC = new Date(targetLocalDate.getTime() - offsetMs);
    
    return nextExecutionUTC;
}

/**
 * Calculate next execution time based on schedule config
 * @param automation - Automation object with schedule_config
 * @param now - Current date/time
 * @returns ISO string of next execution time or null
 */
function calculateNextExecution(automation: any, now: Date): Date | null {
    const { schedule_config } = automation;

    if (!schedule_config) return null;

    // Interval-based scheduling
    if (schedule_config.interval_minutes) {
        const next = new Date(now.getTime() + schedule_config.interval_minutes * 60 * 1000);
        return next;
    }

    // Cron expression (simplified - for complex cron, use a library)
    if (schedule_config.cron_expression) {
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
            return next;
        }

        // Hourly: "0 * * * *"
        if (cron === '0 * * * *') {
            const next = new Date(now);
            next.setMinutes(0, 0, 0);
            next.setHours(next.getHours() + 1);
            return next;
        }

        // Every N hours: "0 */N * * *"
        const hourlyMatch = cron.match(/^0 \*\/(\d+) \* \* \*$/);
        if (hourlyMatch) {
            const hours = parseInt(hourlyMatch[1]);
            const next = new Date(now);
            next.setMinutes(0, 0, 0);
            next.setHours(next.getHours() + hours);
            return next;
        }
    }

    return null;
}

/**
 * Vérification stricte du timing d'exécution
 * Fenêtre de 30 secondes AVANT ou APRÈS l'heure prévue
 */
async function checkExecutionTimeStrict(automation: any, now: Date): Promise<boolean> {
    const { next_execution_at, last_executed_at } = automation;
    
    if (!next_execution_at) {
        console.log(`❌ [STRICT-CHECK] ${automation.name}: No next_execution_at`);
        return false;
    }
    
    // ✅ PROTECTION : Si déjà exécuté dans les 5 dernières minutes, skip
    if (last_executed_at) {
        const lastExec = new Date(last_executed_at);
        const minutesSinceLastExec = (now.getTime() - lastExec.getTime()) / (1000 * 60);
        if (minutesSinceLastExec < 5) {
            console.log(`⏭️ [STRICT-CHECK] ${automation.name}: Executed ${minutesSinceLastExec.toFixed(1)} min ago, skipping`);
            return false;
        }
    }
    
    const nextExec = new Date(next_execution_at);
    const diffMs = nextExec.getTime() - now.getTime();
    const diffSeconds = diffMs / 1000;
    
    console.log(`⏰ [STRICT-CHECK] ${automation.name}: next=${nextExec.toISOString()}, now=${now.toISOString()}, diff=${diffSeconds.toFixed(1)}s`);
    
    // ✅ RÈGLE ULTRA-STRICTE : 
    // - On doit être dans les 30 secondes AVANT ou APRÈS l'heure prévue
    // - Permet d'attraper l'exécution même si le scheduler est légèrement en avance/retard
    if (diffSeconds >= -30 && diffSeconds <= 30) {
        console.log(`✅ [STRICT-CHECK] ${automation.name}: In strict execution window (${diffSeconds.toFixed(1)}s)`);
        return true;
    } else {
        if (diffSeconds < -30) {
            console.log(`⏰ [STRICT-CHECK] ${automation.name}: Too early (${diffSeconds.toFixed(1)}s before target)`);
        } else {
            console.log(`⏰ [STRICT-CHECK] ${automation.name}: Too late (${diffSeconds.toFixed(1)}s after target)`);
        }
        return false;
    }
}
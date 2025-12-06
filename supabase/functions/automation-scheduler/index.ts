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

            // 3. Vérifier si c'est l'heure d'exécuter
            const shouldExecute = await checkExecutionTime(automation, now);
            
            if (!shouldExecute) {
                console.log(`⏰ [SCHEDULER] ${automation.name} is not ready for execution yet`);
                await releaseLock(supabase, automation.id, automation.name);
                continue;
            }

            console.log(`✅ [SCHEDULER] ${automation.name} is ready for execution`);

            // 4. Mise à jour optimiste de next_execution_at AVANT l'appel au micro-runner
            const nextExecutionAfter = calculateNextExecution(automation, now);
            
            const { data: updateNextExecData, error: nextExecError } = await supabase
                .from('automations')
                .update({ 
                    next_execution_at: nextExecutionAfter.toISOString(),
                    updated_at: now.toISOString()
                })
                .eq('id', automation.id)
                .eq('next_execution_at', automation.next_execution_at) // Condition optimiste
                .select('id')
                .limit(1);

            if (!updateNextExecData || updateNextExecData.length === 0) {
                console.log(`⏭️ [SCHEDULER] ${automation.name} next_execution_at was already updated by another instance`);
                await releaseLock(supabase, automation.id, automation.name);
                continue;
            }

            console.log(`🔄 [SCHEDULER] Updated next_execution_at for ${automation.name} to ${nextExecutionAfter.toISOString()}`);

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
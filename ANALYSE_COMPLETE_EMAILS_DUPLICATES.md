# 🔍 Analyse Complète : Emails et Notifications en Double

## 📋 Résumé Exécutif

**Problèmes identifiés :**
1. ✅ Emails envoyés 3 fois au lieu d'une
2. ✅ Automatisations déclenchées 2 minutes avant l'heure prévue
3. ✅ Répétitions à 1 minute d'intervalle jusqu'à l'heure programmée
4. ✅ Notifications "révision quotidienne" envoyées 3 fois

**Cause racine :** La logique de `checkExecutionTime` dans `automation-scheduler` permet des déclenchements multiples dans une fenêtre de 2 minutes, et la comparaison directe avec `user_local_time` (sans `next_execution_at`) permet des déclenchements répétés à chaque exécution du scheduler.

---

## 🔬 Analyse Détaillée

### 1. Architecture du Système

#### 1.1. Déclenchement du Scheduler
- **Fréquence :** Le scheduler `automation-scheduler` s'exécute **toutes les minutes** (cron job Supabase)
- **Fonction :** Vérifie toutes les automations actives et déclenche celles qui sont prêtes

#### 1.2. Flux d'Exécution
```
Cron (toutes les minutes)
  ↓
automation-scheduler (Edge Function)
  ↓
checkExecutionTime() → shouldExecute = true/false
  ↓
Si shouldExecute = true:
  - Mise à jour next_execution_at (verrou optimiste)
  - Appel automation-micro-runner
    ↓
  automation-micro-runner
    ↓
  executeDailyQuote() / executeWeeklySummary() / etc.
    ↓
  Appel automation-email
    ↓
  check_and_log_email_send() (déduplication)
    ↓
  Envoi SMTP
```

---

### 2. Problèmes Identifiés

#### 2.1. Problème #1 : Fenêtre de 2 Minutes pour `next_execution_at`

**Code problématique :**
```typescript
// supabase/functions/automation-scheduler/index.ts:529
if (diffMinutes >= 0 && diffMinutes <= 2) {
  console.log(`✅ next_execution_at atteint pour ${automation.name}`);
  return true;
}
```

**Scénario :**
- Automation programmée pour **20h00**
- `next_execution_at` = `2025-01-02T20:00:00Z`
- Scheduler s'exécute toutes les minutes

**Comportement actuel :**
| Heure | diffMinutes | shouldExecute | Résultat |
|-------|-------------|---------------|----------|
| 19h58 | -2 | ❌ false | ✅ Correct |
| 19h59 | -1 | ❌ false | ✅ Correct |
| 20h00 | 0 | ✅ true | ✅ Correct |
| 20h01 | 1 | ✅ true | ❌ **PROBLÈME** |
| 20h02 | 2 | ✅ true | ❌ **PROBLÈME** |

**Conséquence :** Si `next_execution_at` n'est pas mis à jour immédiatement (race condition), l'automation peut être déclenchée **3 fois** (20h00, 20h01, 20h02).

**Solution :** Réduire la fenêtre à **30 secondes** ou **1 minute maximum**, et s'assurer que `next_execution_at` est mis à jour **AVANT** l'appel à `automation-micro-runner`.

---

#### 2.2. Problème #2 : Comparaison Directe avec `user_local_time` (sans `next_execution_at`)

**Code problématique :**
```typescript
// supabase/functions/automation-scheduler/index.ts:612
if (user_local_time && !next_execution_at) {
  // ...
  const isTime = normalizedCurrent === normalizedTarget;
  if (isTime) {
    return true; // ⚠️ Pas de protection contre les déclenchements multiples
  }
}
```

**Scénario :**
- Automation avec `user_local_time = "20:00"` mais `next_execution_at = NULL`
- Scheduler s'exécute toutes les minutes

**Comportement actuel :**
| Heure | normalizedCurrent | normalizedTarget | isTime | shouldExecute |
|-------|-------------------|-----------------|--------|---------------|
| 19h58 | "19:58" | "20:00" | false | ❌ false |
| 19h59 | "19:59" | "20:00" | false | ❌ false |
| 20h00 | "20:00" | "20:00" | true | ✅ true |
| 20h00 (2e exécution) | "20:00" | "20:00" | true | ✅ true ❌ **PROBLÈME** |
| 20h00 (3e exécution) | "20:00" | "20:00" | true | ✅ true ❌ **PROBLÈME** |

**Conséquence :** Si le scheduler s'exécute **plusieurs fois dans la même minute** (ex: 20h00:00, 20h00:30, 20h00:59), l'automation sera déclenchée **plusieurs fois**.

**Solution :** Toujours calculer et mettre à jour `next_execution_at` **AVANT** de vérifier `checkExecutionTime`, même pour les automations avec `user_local_time`.

---

#### 2.3. Problème #3 : Mise à Jour de `next_execution_at` Non Atomique

**Code actuel :**
```typescript
// supabase/functions/automation-scheduler/index.ts:240-267
// Mise à jour next_execution_at avec verrou optimiste
const { data: updateNextExecData, error: nextExecError } = await updateNextExecQuery
  .eq('next_execution_at', automation.next_execution_at)
  .select('id')
  .limit(1);

if (!updateNextExecData || updateNextExecData.length === 0) {
  // Skip si déjà mis à jour par une autre instance
  continue;
}
```

**Problème :** Entre la vérification de `checkExecutionTime` et la mise à jour de `next_execution_at`, plusieurs instances du scheduler peuvent passer la vérification.

**Scénario :**
1. **Instance A** (20h00:00) : `checkExecutionTime` → `true`, commence mise à jour
2. **Instance B** (20h00:15) : `checkExecutionTime` → `true` (car `next_execution_at` pas encore mis à jour), commence mise à jour
3. **Instance C** (20h00:30) : `checkExecutionTime` → `true` (car `next_execution_at` pas encore mis à jour), commence mise à jour

**Conséquence :** Les 3 instances peuvent toutes mettre à jour `next_execution_at` et déclencher l'automation.

**Solution :** Utiliser un verrou atomique **AVANT** `checkExecutionTime`, ou utiliser une transaction PostgreSQL avec `FOR UPDATE`.

---

#### 2.4. Problème #4 : Déduplication Email Non Fonctionnelle

**Problème :** La table `email_sent_log` est vide, ce qui signifie que :
1. La fonction `check_and_log_email_send` n'est pas appelée
2. OU la fonction est appelée mais l'insertion échoue silencieusement
3. OU la migration SQL n'est pas appliquée

**Vérification nécessaire :**
```sql
-- Vérifier que la fonction existe
SELECT proname FROM pg_proc WHERE proname = 'check_and_log_email_send';

-- Vérifier que la table existe
SELECT * FROM information_schema.tables WHERE table_name = 'email_sent_log';

-- Tester la fonction manuellement
SELECT check_and_log_email_send('test@example.com', 'Test Subject', 5);
SELECT * FROM email_sent_log;
```

---

### 3. Solutions Proposées

#### 3.1. Solution #1 : Réduire la Fenêtre d'Exécution

**Modification :**
```typescript
// supabase/functions/automation-scheduler/index.ts:529
// AVANT
if (diffMinutes >= 0 && diffMinutes <= 2) {
  return true;
}

// APRÈS
if (diffMinutes >= 0 && diffMinutes <= 0.5) { // 30 secondes maximum
  return true;
}
```

**Avantage :** Réduit la fenêtre d'exécution à 30 secondes, limitant les déclenchements multiples.

---

#### 3.2. Solution #2 : Toujours Calculer `next_execution_at` pour `user_local_time`

**Modification :**
```typescript
// supabase/functions/automation-scheduler/index.ts:231-236
// AVANT
if (automation.user_local_time) {
  nextExecution = calculateNextExecutionFromLocalTime(automation.user_local_time, timezone, now);
} else {
  nextExecution = calculateNextExecution(automation, now);
}

// APRÈS
// Toujours calculer next_execution_at, même pour user_local_time
if (automation.user_local_time && !automation.next_execution_at) {
  // Calculer next_execution_at pour la première fois
  nextExecution = calculateNextExecutionFromLocalTime(automation.user_local_time, timezone, now);
} else if (automation.user_local_time) {
  // Utiliser next_execution_at existant
  nextExecution = calculateNextExecutionFromLocalTime(automation.user_local_time, timezone, now);
} else {
  nextExecution = calculateNextExecution(automation, now);
}
```

**Modification de `checkExecutionTime` :**
```typescript
// supabase/functions/automation-scheduler/index.ts:545
// AVANT
if (user_local_time && !next_execution_at) {
  // Comparaison directe
  const isTime = normalizedCurrent === normalizedTarget;
  if (isTime) return true;
}

// APRÈS
// Toujours utiliser next_execution_at si disponible
if (next_execution_at) {
  // Utiliser la logique next_execution_at (plus fiable)
  // ...
} else if (user_local_time) {
  // Fallback : calculer next_execution_at maintenant
  const nextExec = calculateNextExecutionFromLocalTime(user_local_time, user_timezone, now);
  // Mettre à jour next_execution_at immédiatement (dans une transaction)
  // Puis utiliser la logique next_execution_at
}
```

---

#### 3.3. Solution #3 : Verrou Atomique Avant `checkExecutionTime`

**Modification :**
```typescript
// supabase/functions/automation-scheduler/index.ts:200
// AVANT
const shouldExecute = await checkExecutionTime(automation, now);

// APRÈS
// Acquérir un verrou atomique AVANT checkExecutionTime
const { data: lockAcquired, error: lockError } = await supabase.rpc('try_lock_automation_for_check', {
  p_automation_id: automation.id,
  p_lock_duration_seconds: 60
});

if (!lockAcquired) {
  console.log(`⏭️ [SCHEDULER] Automation ${automation.name} is locked, skipping`);
  continue;
}

try {
  const shouldExecute = await checkExecutionTime(automation, now);
  // ... reste du code
} finally {
  // Libérer le verrou
  await supabase.rpc('release_automation_lock', { p_automation_id: automation.id });
}
```

**Nouvelle fonction SQL :**
```sql
CREATE OR REPLACE FUNCTION try_lock_automation_for_check(
  p_automation_id UUID,
  p_lock_duration_seconds INTEGER DEFAULT 60
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_lock TIMESTAMP WITH TIME ZONE;
  v_rows_updated INTEGER;
BEGIN
  -- Récupérer le verrou actuel avec FOR UPDATE
  SELECT execution_lock INTO v_current_lock
  FROM automations
  WHERE id = p_automation_id
  FOR UPDATE;
  
  IF NOT FOUND THEN RETURN FALSE; END IF;

  -- Si un verrou existe et n'est pas expiré, retourner false
  IF v_current_lock IS NOT NULL AND v_current_lock > NOW() THEN
    RETURN FALSE;
  END IF;
  
  -- Poser un nouveau verrou
  UPDATE automations
  SET execution_lock = NOW() + (p_lock_duration_seconds || ' seconds')::INTERVAL
  WHERE id = p_automation_id
    AND (execution_lock IS NULL OR execution_lock <= NOW());
  
  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
  
  RETURN v_rows_updated > 0;
END;
$$ LANGUAGE plpgsql;
```

---

#### 3.4. Solution #4 : Vérifier et Corriger la Déduplication Email

**Actions :**
1. Vérifier que la migration `20251202_email_deduplication.sql` est appliquée
2. Tester la fonction `check_and_log_email_send` manuellement
3. Vérifier les logs de `automation-email` pour voir si la fonction est appelée
4. Redéployer `automation-email` avec les logs améliorés

---

## 🎯 Plan d'Action Prioritaire

### Priorité 1 : Corriger la Logique de `checkExecutionTime`
1. ✅ Réduire la fenêtre d'exécution à 30 secondes
2. ✅ Toujours utiliser `next_execution_at` (ne jamais utiliser la comparaison directe avec `user_local_time`)
3. ✅ Calculer et mettre à jour `next_execution_at` **AVANT** `checkExecutionTime`

### Priorité 2 : Ajouter un Verrou Atomique
1. ✅ Créer la fonction `try_lock_automation_for_check`
2. ✅ Acquérir le verrou **AVANT** `checkExecutionTime`
3. ✅ Libérer le verrou après l'exécution

### Priorité 3 : Vérifier la Déduplication Email
1. ✅ Vérifier que la migration est appliquée
2. ✅ Tester la fonction manuellement
3. ✅ Vérifier les logs après redéploiement

---

## 📊 Résultats Attendus

Après les corrections :

1. **Emails :** Un seul email envoyé par automation, même si le scheduler s'exécute plusieurs fois
2. **Horaires :** Automatisations déclenchées **exactement** à l'heure prévue (pas 2 minutes avant)
3. **Répétitions :** Aucune répétition, même si le scheduler s'exécute plusieurs fois dans la même minute
4. **Notifications :** Une seule notification par automation

---

## 🔧 Fichiers à Modifier

1. `supabase/functions/automation-scheduler/index.ts`
   - Modifier `checkExecutionTime` (réduire fenêtre, toujours utiliser `next_execution_at`)
   - Ajouter verrou atomique avant `checkExecutionTime`
   - Calculer `next_execution_at` avant `checkExecutionTime`

2. `supabase/migrations/20251201_global_lock_and_atomic_update.sql`
   - Ajouter fonction `try_lock_automation_for_check`

3. `supabase/functions/automation-email/index.ts`
   - Vérifier que les logs sont corrects (déjà fait)

---

## ✅ Validation

Après les modifications, tester :
1. Automation programmée pour 20h00 → doit se déclencher **exactement** à 20h00
2. Vérifier les logs : un seul appel à `automation-micro-runner` par automation
3. Vérifier `email_sent_log` : une seule ligne par email envoyé
4. Vérifier les emails reçus : un seul email par automation


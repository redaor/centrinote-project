# 🔒 Verrou Global et Fonction Atomique - Protection contre les Race Conditions

## 📋 Problème résolu

Même avec `FOR UPDATE` dans la fonction `try_lock_automation_execution`, il y avait encore des race conditions car :
1. Le verrou et la mise à jour de `last_executed_at` se faisaient en deux opérations séparées
2. Pas de verrou global au niveau du scheduler (plusieurs instances pouvaient s'exécuter en même temps)
3. Les deux schedulers (hourly + 5min) pouvaient toujours déclencher la même automatisation

## ✅ Solutions implémentées

### 1. Verrou Global du Scheduler

**Table : `scheduler_locks`**
- Verrou global pour empêcher plusieurs instances du scheduler de s'exécuter simultanément
- Utilise `FOR UPDATE` pour éviter les race conditions

**Fonction : `try_lock_scheduler()`**
```sql
SELECT try_lock_scheduler(5, 'scheduler-run-id');
-- Retourne TRUE si le verrou a été posé, FALSE si déjà verrouillé
```

**Fonction : `release_scheduler_lock()`**
```sql
SELECT release_scheduler_lock();
-- Libère le verrou global
```

### 2. Fonction Atomique : Verrou + Mise à jour `last_executed_at`

**Fonction : `try_lock_and_update_automation()`**
```sql
SELECT try_lock_and_update_automation(
  'automation-id'::UUID,
  5, -- Durée du verrou en minutes
  NOW() -- Temps d'exécution
);
```

**Avantages :**
- ✅ Utilise `FOR UPDATE` pour éviter les race conditions
- ✅ Met à jour `last_executed_at` **dans la même transaction** que le verrou
- ✅ Transaction atomique : soit tout réussit, soit tout échoue
- ✅ Impossible d'avoir un verrou sans mise à jour de `last_executed_at`

### 3. Fonction de Libération Atomique

**Fonction : `release_automation_lock_and_schedule_next()`**
```sql
SELECT release_automation_lock_and_schedule_next(
  'automation-id'::UUID,
  '2025-12-02 09:40:00+00'::TIMESTAMPTZ -- Prochaine exécution
);
```

**Avantages :**
- ✅ Libère le verrou ET programme la prochaine exécution en une seule opération
- ✅ Cohérence garantie

## 🔄 Flux d'exécution amélioré

```
1. Scheduler s'exécute (toutes les heures ou toutes les 5 min)
   ↓
2. ✅ VERROU GLOBAL : try_lock_scheduler()
   → Si échec → SKIP (autre instance en cours)
   ↓
3. Pour chaque automatisation à exécuter :
   ↓
4. ✅ VERROU ATOMIQUE : try_lock_and_update_automation()
   → Pose le verrou ET met à jour last_executed_at dans la même transaction
   → Utilise FOR UPDATE pour éviter les race conditions
   → Si échec → SKIP (déjà verrouillée)
   ↓
5. ✅ Exécute l'automatisation (envoi email, etc.)
   ↓
6. ✅ LIBÉRATION ATOMIQUE : release_automation_lock_and_schedule_next()
   → Libère le verrou ET programme la prochaine exécution
   ↓
7. ✅ Libère le verrou global : release_scheduler_lock()
```

## 📁 Fichiers créés/modifiés

### Migration SQL
- `supabase/migrations/20251201_global_lock_and_atomic_update.sql`
  - Table `scheduler_locks` pour le verrou global
  - Fonction `try_lock_scheduler()` avec `FOR UPDATE`
  - Fonction `release_scheduler_lock()`
  - Fonction `try_lock_and_update_automation()` avec `FOR UPDATE` + transaction atomique
  - Fonction `release_automation_lock_and_schedule_next()`
  - Fonction `cleanup_expired_scheduler_locks()`

### Scheduler modifié
- `supabase/functions/automation-scheduler/index.ts`
  - Ajout du verrou global au début
  - Utilisation de `try_lock_and_update_automation()` au lieu de `try_lock_automation_execution()`
  - Utilisation de `release_automation_lock_and_schedule_next()` pour la libération
  - Libération du verrou global à la fin (même en cas d'erreur)

## 🚀 Déploiement

### Étape 1 : Exécuter la migration SQL

Dans Supabase Dashboard → SQL Editor, exécutez :
```sql
-- Fichier : supabase/migrations/20251201_global_lock_and_atomic_update.sql
```

Cette migration :
- ✅ Crée la table `scheduler_locks`
- ✅ Crée toutes les fonctions de verrou
- ✅ Initialise la table de verrous

### Étape 2 : Redéployer le scheduler

Le scheduler a été modifié et commité. Il sera automatiquement redéployé via Netlify, ou vous pouvez le déployer manuellement :

```bash
supabase functions deploy automation-scheduler
```

### Étape 3 : Vérifier

Vérifiez que les fonctions existent :
```sql
-- Vérifier les fonctions
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN (
    'try_lock_scheduler',
    'release_scheduler_lock',
    'try_lock_and_update_automation',
    'release_automation_lock_and_schedule_next'
  );

-- Vérifier la table
SELECT * FROM scheduler_locks;
```

## 🧪 Test

### Test 1 : Verrou global
```sql
-- Tenter de poser un verrou
SELECT try_lock_scheduler(5, 'test-run-1');
-- Devrait retourner TRUE

-- Tenter de poser un autre verrou (devrait échouer)
SELECT try_lock_scheduler(5, 'test-run-2');
-- Devrait retourner FALSE (déjà verrouillé)

-- Libérer
SELECT release_scheduler_lock();
```

### Test 2 : Verrou atomique
```sql
-- Tenter de poser un verrou atomique
SELECT try_lock_and_update_automation(
  'votre-automation-id'::UUID,
  5,
  NOW()
);
-- Devrait retourner TRUE et mettre à jour last_executed_at

-- Vérifier
SELECT id, name, execution_lock, last_executed_at
FROM automations
WHERE id = 'votre-automation-id';
```

### Test 3 : Attendre la prochaine exécution

Attendez demain à 9h40 et vérifiez :
- ✅ Vous devriez recevoir **un seul email** au lieu de 3
- ✅ Les logs du scheduler devraient montrer le verrou global actif
- ✅ Les logs devraient montrer les verrous atomiques posés

## 📊 Monitoring

### Vérifier les verrous actifs
```sql
-- Verrou global
SELECT * FROM scheduler_locks WHERE locked_until > NOW();

-- Verrous d'automatisations
SELECT id, name, execution_lock, last_executed_at
FROM automations
WHERE execution_lock IS NOT NULL
  AND execution_lock > NOW();
```

### Vérifier les dernières exécutions
```sql
SELECT 
  id,
  name,
  last_executed_at,
  next_execution_at,
  execution_lock
FROM automations
WHERE is_active = true
  AND name IN ('weekly-summary', 'daily_quote', 'monthly-report')
ORDER BY last_executed_at DESC;
```

## ⚠️ Notes importantes

- **Transaction atomique** : Le verrou et la mise à jour de `last_executed_at` sont dans la même transaction, impossible d'avoir l'un sans l'autre
- **FOR UPDATE** : Utilisé dans toutes les fonctions pour éviter les race conditions au niveau SQL
- **Verrou global** : Empêche plusieurs instances du scheduler de s'exécuter simultanément
- **Libération automatique** : Les verrous expirent automatiquement après 10 minutes (nettoyage via cron)
- **Fallback** : Si les fonctions n'existent pas encore, le scheduler utilise les protections de fallback (vérification temporelle + verrou direct)

## 🎯 Résultat attendu

Après le déploiement et l'exécution de la migration :
- ✅ **Un seul email** par automatisation (au lieu de 3)
- ✅ **Pas de race conditions** grâce à `FOR UPDATE`
- ✅ **Cohérence garantie** grâce aux transactions atomiques
- ✅ **Protection globale** grâce au verrou du scheduler


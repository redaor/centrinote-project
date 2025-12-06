# 🔍 Diagnostic des emails en double

## Solution finale appliquée

### ✅ Protection au niveau de l'envoi d'email (`automation-email`)

J'ai ajouté une **protection finale au niveau de l'envoi d'email** qui empêche les doublons même si `automation-micro-runner` est appelé plusieurs fois.

**Fichiers modifiés :**
1. `supabase/functions/automation-email/index.ts` - Protection contre les doublons
2. `supabase/migrations/20251202_email_deduplication.sql` - Table et fonction RPC pour dédoublonnage

**Comment ça fonctionne :**
- Avant d'envoyer un email, `automation-email` vérifie si un email avec le même destinataire et sujet a été envoyé dans les 5 dernières minutes
- Si oui, l'email est ignoré (skip)
- La vérification est atomique grâce à une fonction RPC PostgreSQL

## Étapes pour déployer la solution

### 1. Appliquer la migration SQL

```bash
# Dans Supabase Dashboard → SQL Editor, exécuter :
supabase/migrations/20251202_email_deduplication.sql
```

Ou via CLI :
```bash
supabase db push
```

### 2. Redéployer les Edge Functions

```bash
# Redéployer automation-email
supabase functions deploy automation-email

# Redéployer automation-micro-runner (si nécessaire)
supabase functions deploy automation-micro-runner

# Redéployer automation-scheduler (si nécessaire)
supabase functions deploy automation-scheduler
```

## Vérifications à faire

### 1. Vérifier que la migration est appliquée

```sql
-- Vérifier que la table existe
SELECT * FROM email_sent_log LIMIT 5;

-- Vérifier que la fonction existe
SELECT proname FROM pg_proc WHERE proname = 'check_and_log_email_send';
```

### 2. Vérifier les logs du scheduler

```sql
-- Voir combien de fois le scheduler s'exécute
SELECT 
  DATE_TRUNC('minute', execution_time) as minute,
  COUNT(*) as execution_count,
  COUNT(DISTINCT scheduler_run_id) as unique_runs
FROM scheduler_run_log
WHERE automation_name IN ('daily_quote', 'weekly-summary', 'monthly-report')
  AND execution_time >= NOW() - INTERVAL '1 hour'
GROUP BY DATE_TRUNC('minute', execution_time)
ORDER BY minute DESC;
```

### 3. Vérifier les emails envoyés

```sql
-- Voir les emails envoyés récemment
SELECT 
  email_to,
  email_subject,
  sent_at,
  COUNT(*) as send_count
FROM email_sent_log
WHERE sent_at >= NOW() - INTERVAL '1 hour'
GROUP BY email_to, email_subject, sent_at
ORDER BY sent_at DESC;
```

### 4. Vérifier les automations

```sql
-- Voir l'état des automations
SELECT 
  name,
  last_executed_at,
  execution_count,
  next_execution_at,
  is_active
FROM automations
WHERE name IN ('daily_quote', 'weekly-summary', 'monthly-report')
ORDER BY last_executed_at DESC;
```

## Si le problème persiste

### Vérifier le cron Supabase

1. Aller dans Supabase Dashboard → Database → Cron Jobs
2. Vérifier si `automation-scheduler` est configuré
3. Vérifier la fréquence d'exécution (ne devrait pas être toutes les minutes)

### Vérifier les logs Edge Functions

Dans Supabase Dashboard → Edge Functions → Logs, vérifier :
- Combien de fois `automation-scheduler` est appelé
- Combien de fois `automation-micro-runner` est appelé
- Combien de fois `automation-email` est appelé

### Solution de contournement temporaire

Si le problème persiste, vous pouvez :
1. Désactiver temporairement les automations dans la base de données
2. Vérifier les logs pour identifier la source exacte
3. Réactiver une par une pour isoler le problème

```sql
-- Désactiver temporairement
UPDATE automations 
SET is_active = false 
WHERE name IN ('daily_quote', 'weekly-summary', 'monthly-report');

-- Réactiver une par une pour tester
UPDATE automations 
SET is_active = true 
WHERE name = 'daily_quote';
```

## Résumé des protections en place

1. ✅ **Verrou global du scheduler** - Empêche les exécutions multiples simultanées
2. ✅ **Verrou par automation** - Empêche qu'une automation soit exécutée plusieurs fois
3. ✅ **Mise à jour de `next_execution_at`** - Avant l'appel à `automation-micro-runner`
4. ✅ **Verrou atomique RPC** - Dans `automation-micro-runner` pour `last_executed_at`
5. ✅ **Protection au niveau email** - Dernière ligne de défense dans `automation-email`

Avec toutes ces protections, vous devriez recevoir **un seul email** même si le scheduler s'exécute plusieurs fois.


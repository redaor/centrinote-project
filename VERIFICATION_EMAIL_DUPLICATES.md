# 🔍 Vérification et diagnostic des emails en double

## ✅ Solution finale implémentée

J'ai créé une **protection atomique au niveau de l'envoi d'email** qui utilise un **verrou de ligne PostgreSQL** (`FOR UPDATE`) pour garantir qu'une seule instance peut envoyer un email à la fois.

### Protection en place

1. **Table `email_sent_log`** - Enregistre chaque email envoyé
2. **Fonction RPC `check_and_log_email_send`** - Vérifie et enregistre de manière atomique avec `FOR UPDATE`
3. **Protection dans `automation-email`** - Vérifie les doublons AVANT d'envoyer

## ⚠️ IMPORTANT : Vérifications à faire

### 1. Appliquer la migration SQL

**La migration doit être appliquée dans Supabase !**

```bash
# Option 1 : Via Supabase Dashboard
# Dashboard → SQL Editor → Exécuter le contenu de :
supabase/migrations/20251202_email_deduplication.sql

# Option 2 : Via CLI
supabase db push
```

**Vérifier que la migration est appliquée :**
```sql
-- Vérifier que la table existe
SELECT * FROM email_sent_log LIMIT 1;

-- Vérifier que la fonction existe
SELECT proname FROM pg_proc WHERE proname = 'check_and_log_email_send';
```

### 2. Redéployer l'Edge Function

```bash
supabase functions deploy automation-email
```

### 3. Vérifier les logs

Après le déploiement, vérifier les logs dans Supabase Dashboard → Edge Functions → automation-email → Logs :

**Si la protection fonctionne, vous devriez voir :**
```
✅ [EMAIL] Email approved for sending (no duplicate found in last 5 minutes)
```

**Si un doublon est détecté, vous devriez voir :**
```
🚫 [EMAIL] DUPLICATE BLOCKED: subject="..." to="..." was sent recently, skipping
```

**Si la migration n'est pas appliquée, vous verrez :**
```
❌ [EMAIL] Error checking for duplicates: function "check_and_log_email_send" does not exist
⚠️ [EMAIL] Migration may not be applied. Please run: supabase/migrations/20251202_email_deduplication.sql
```

## 🔍 Diagnostic si le problème persiste

### Vérifier combien de fois automation-email est appelé

```sql
-- Voir les appels récents à automation-email
-- (nécessite d'activer les logs dans Supabase)
SELECT * FROM edge_function_logs 
WHERE function_name = 'automation-email'
ORDER BY created_at DESC 
LIMIT 20;
```

### Vérifier les emails envoyés

```sql
-- Voir les emails enregistrés dans email_sent_log
SELECT 
  email_to,
  email_subject,
  sent_at,
  COUNT(*) as count
FROM email_sent_log
WHERE sent_at >= NOW() - INTERVAL '1 hour'
GROUP BY email_to, email_subject, sent_at
HAVING COUNT(*) > 1  -- Trouver les doublons
ORDER BY sent_at DESC;
```

### Vérifier les appels à automation-micro-runner

```sql
-- Voir les exécutions du scheduler
SELECT 
  DATE_TRUNC('minute', execution_time) as minute,
  automation_name,
  COUNT(*) as execution_count,
  COUNT(DISTINCT scheduler_run_id) as unique_runs
FROM scheduler_run_log
WHERE automation_name IN ('daily_quote', 'weekly-summary', 'monthly-report')
  AND execution_time >= NOW() - INTERVAL '1 hour'
GROUP BY DATE_TRUNC('minute', execution_time), automation_name
ORDER BY minute DESC, automation_name;
```

## 🛠️ Solution de contournement temporaire

Si le problème persiste après avoir appliqué la migration et redéployé, vous pouvez :

### Option 1 : Augmenter la fenêtre de dédoublonnage

Modifier la fonction pour augmenter la fenêtre de 5 à 10 minutes :

```sql
-- Dans la fonction check_and_log_email_send, changer :
p_dedupe_window_minutes INTEGER DEFAULT 10  -- Au lieu de 5
```

### Option 2 : Désactiver temporairement les automations

```sql
-- Désactiver toutes les automations
UPDATE automations 
SET is_active = false 
WHERE name IN ('daily_quote', 'weekly-summary', 'monthly-report');

-- Réactiver une par une pour tester
UPDATE automations 
SET is_active = true 
WHERE name = 'daily_quote';
```

### Option 3 : Vérifier si le problème vient du scheduler

Vérifier dans Supabase Dashboard → Database → Cron Jobs si `automation-scheduler` est configuré pour s'exécuter plusieurs fois par minute.

## 📊 Logs à surveiller

Après le déploiement, surveiller ces logs dans Supabase :

1. **Edge Functions → automation-email → Logs**
   - Chercher `🚫 [EMAIL] DUPLICATE BLOCKED` (bon signe = protection fonctionne)
   - Chercher `❌ [EMAIL] Error checking for duplicates` (mauvais signe = migration non appliquée)

2. **Edge Functions → automation-micro-runner → Logs**
   - Chercher `🔒 [DAILY-QUOTE] Atomic lock acquired` (bon signe)
   - Chercher `⚠️ [DAILY-QUOTE] Failed to acquire lock` (normal si plusieurs appels)

3. **Edge Functions → automation-scheduler → Logs**
   - Chercher `🔓 Global scheduler lock acquired` (bon signe)
   - Chercher `🔒 Scheduler is already locked` (normal si plusieurs appels)

## ✅ Résultat attendu

Après avoir appliqué la migration et redéployé :

1. ✅ Un seul email devrait être envoyé même si `automation-micro-runner` est appelé 3 fois
2. ✅ Les logs devraient montrer `🚫 [EMAIL] DUPLICATE BLOCKED` pour les tentatives suivantes
3. ✅ La table `email_sent_log` devrait contenir un seul enregistrement par email envoyé

## 🆘 Si rien ne fonctionne

Si après toutes ces vérifications le problème persiste :

1. **Vérifier les logs Supabase** pour voir exactement ce qui se passe
2. **Vérifier que la migration est bien appliquée** (la fonction doit exister)
3. **Vérifier que automation-email est bien redéployée** avec le nouveau code
4. **Me fournir les logs** pour que je puisse diagnostiquer plus précisément


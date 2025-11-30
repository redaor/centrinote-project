# 🔍 Système de Logging pour Diagnostiquer les Exécutions Multiples

## 📋 Problème

Malgré tous les verrous implémentés, vous recevez encore **3 emails** pour chaque automatisation. Cela indique que **3 exécutions réelles** ont lieu, ce qui signifie que le **scheduler lui-même est invoqué 3 fois**.

## ✅ Solution : Logging Brut

Un système de logging a été ajouté pour **tracer chaque invocation** du scheduler et identifier la source des exécutions multiples.

---

## 🗄️ Migration SQL

### Table créée : `scheduler_run_log`

```sql
CREATE TABLE scheduler_run_log (
  id SERIAL PRIMARY KEY,
  received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  scheduler_run_id TEXT NOT NULL,
  caller_ip TEXT,
  user_agent TEXT,
  automation_name TEXT,
  automation_id UUID,
  execution_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (scheduler_run_id, automation_id)
);
```

**Colonnes importantes :**
- `scheduler_run_id` : ID unique de chaque exécution du scheduler
- `caller_ip` : IP de l'appelant (header `x-forwarded-for` ou `x-real-ip`)
- `user_agent` : User-Agent de l'appelant (révèle la source : Supabase, cron, webhook, etc.)
- `automation_name` : Nom de l'automatisation traitée (NULL si c'est juste l'entrée du scheduler)
- `automation_id` : ID de l'automatisation traitée (NULL si c'est juste l'entrée du scheduler)

---

## 📝 Logging Implémenté

### 1. Log au démarrage du scheduler

Chaque fois qu'une instance du scheduler démarre, une entrée est créée avec :
- `scheduler_run_id` unique
- `caller_ip` (IP de l'appelant)
- `user_agent` (User-Agent de l'appelant)
- `automation_name` = NULL
- `automation_id` = NULL

### 2. Log pour chaque automatisation traitée

Pour chaque automatisation traitée, une entrée est créée avec :
- Même `scheduler_run_id`
- Même `caller_ip` et `user_agent`
- `automation_name` = nom de l'automatisation
- `automation_id` = ID de l'automatisation

---

## 🔍 Diagnostic (Demain matin)

### Requête pour voir toutes les exécutions

```sql
SELECT *
FROM scheduler_run_log
WHERE execution_time >= '2025-12-02 09:30:00'
ORDER BY received_at;
```

### Requête pour identifier les exécutions multiples

```sql
-- Compter les scheduler_run_id distincts par automation
SELECT 
  automation_name,
  COUNT(DISTINCT scheduler_run_id) as distinct_runs,
  array_agg(DISTINCT scheduler_run_id) as run_ids,
  array_agg(DISTINCT caller_ip) as caller_ips,
  array_agg(DISTINCT user_agent) as user_agents
FROM scheduler_run_log
WHERE execution_time >= '2025-12-02 09:30:00'
  AND automation_name IS NOT NULL
GROUP BY automation_name
HAVING COUNT(DISTINCT scheduler_run_id) > 1;
```

### Requête pour voir les détails de chaque exécution

```sql
-- Détails de chaque exécution
SELECT 
  scheduler_run_id,
  caller_ip,
  user_agent,
  COUNT(*) as automations_processed,
  array_agg(automation_name) as automations,
  MIN(received_at) as started_at,
  MAX(received_at) as ended_at
FROM scheduler_run_log
WHERE execution_time >= '2025-12-02 09:30:00'
GROUP BY scheduler_run_id, caller_ip, user_agent
ORDER BY started_at;
```

---

## 🎯 Ce que vous allez découvrir

### Scénario 1 : 3 `scheduler_run_id` différents
→ **3 instances distinctes** du scheduler ont été invoquées
- **Même `caller_ip`** → Possible retry CDN, cron multiple, ou webhook qui retry
- **IPs différentes** → Plusieurs sources (cron jobs multiples, webhooks différents, etc.)

### Scénario 2 : Même `scheduler_run_id` mais 3 entrées pour la même automation
→ Le scheduler s'exécute une fois mais traite l'automatisation 3 fois
- Problème dans la logique de traitement (boucle, retry interne, etc.)

### Scénario 3 : User-Agent révélateur
- `Supabase` → Cron job Supabase (pg_cron)
- `Render` → Service Render
- `Vercel` → Service Vercel
- `GitHub Actions` → CI/CD
- `Postman` → Test manuel
- `Mozilla/5.0...` → Navigateur (test manuel)
- `curl` → Script shell
- `IFTTT` / `Zapier` → Automatisation externe

---

## 🔧 Actions selon les résultats

### Si 3 `scheduler_run_id` différents avec même `caller_ip`
→ **Cron job qui retry** ou **CDN qui retry**
- **Solution** : Vérifier les cron jobs pg_cron (peut-être plusieurs schedulers configurés)
- **Solution** : Ajouter un header secret pour authentifier les appels

### Si 3 `scheduler_run_id` différents avec IPs différentes
→ **Plusieurs sources** (cron jobs multiples, webhooks, etc.)
- **Solution** : Identifier et désactiver les sources en double
- **Solution** : Ajouter une authentification par header secret

### Si même `scheduler_run_id` mais 3 entrées pour la même automation
→ **Problème dans la logique** du scheduler
- **Solution** : Vérifier la boucle de traitement des automations
- **Solution** : Vérifier les verrous atomiques

### Si User-Agent révèle une source externe
→ **Webhook externe** ou **service tiers**
- **Solution** : Désactiver ou authentifier la source
- **Solution** : Ajouter une whitelist d'IPs

---

## 📊 Exemple de résultats attendus

### Cas 1 : 3 cron jobs différents
```
scheduler_run_id          | caller_ip    | user_agent        | automation_name
--------------------------|--------------|-------------------|------------------
abc-123-def-456          | 10.0.0.1     | Supabase/pg_cron  | weekly-summary
xyz-789-ghi-012          | 10.0.0.1     | Supabase/pg_cron  | weekly-summary
mno-345-pqr-678          | 10.0.0.1     | Supabase/pg_cron  | weekly-summary
```
→ **3 cron jobs pg_cron** s'exécutent en même temps

### Cas 2 : Retry CDN
```
scheduler_run_id          | caller_ip    | user_agent        | automation_name
--------------------------|--------------|-------------------|------------------
abc-123-def-456          | 192.168.1.1  | Netlify           | weekly-summary
abc-123-def-456          | 192.168.1.1  | Netlify           | weekly-summary
abc-123-def-456          | 192.168.1.1  | Netlify           | weekly-summary
```
→ **Même exécution retry 3 fois** (problème réseau ou timeout)

### Cas 3 : Webhook externe
```
scheduler_run_id          | caller_ip    | user_agent        | automation_name
--------------------------|--------------|-------------------|------------------
abc-123-def-456          | 54.123.45.67 | IFTTT             | weekly-summary
xyz-789-ghi-012          | 54.123.45.67 | Zapier            | weekly-summary
mno-345-pqr-678          | 54.123.45.67 | Make              | weekly-summary
```
→ **3 services d'automatisation externes** appellent le scheduler

---

## 🚀 Déploiement

### Étape 1 : Migration SQL (déjà exécutée)
✅ La table `scheduler_run_log` a été créée

### Étape 2 : Scheduler modifié
✅ Le scheduler a été modifié pour logger chaque entrée et chaque automation traitée

### Étape 3 : Redéploiement
Le scheduler sera automatiquement redéployé via Netlify, ou vous pouvez le déployer manuellement :
```bash
supabase functions deploy automation-scheduler
```

---

## 📅 Plan d'action

1. **Aujourd'hui** : Migration SQL exécutée ✅
2. **Aujourd'hui** : Scheduler modifié et déployé ✅
3. **Demain matin (9h40)** : Exécution de l'automatisation
4. **Après 9h40** : Exécuter la requête de diagnostic
5. **Analyser les résultats** : Identifier la source des 3 exécutions
6. **Corriger** : Selon les résultats (désactiver cron en double, ajouter header secret, etc.)

---

## 🧹 Nettoyage (optionnel)

Pour nettoyer les vieux logs (garder seulement 7 jours) :
```sql
SELECT cleanup_old_scheduler_logs(7);
```

Ou manuellement :
```sql
DELETE FROM scheduler_run_log
WHERE received_at < NOW() - INTERVAL '7 days';
```

---

## 📝 Notes

- Le logging est **non-bloquant** : si la table n'existe pas, le scheduler continue de fonctionner
- Les logs sont **idempotents** : contrainte UNIQUE sur `(scheduler_run_id, automation_id)`
- Les logs incluent **toutes les informations** nécessaires pour diagnostiquer le problème
- Le système est **prêt pour la production** : index pour performances, fonction de nettoyage


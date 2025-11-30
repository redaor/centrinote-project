# 🔧 Correction des exécutions multiples d'automatisations

## 📋 Problème identifié

Vous receviez **3 fois** la même automatisation (résumé hebdomadaire et citation du jour) à cause de :

1. **Deux schedulers pg_cron qui s'exécutent en même temps** :
   - `automation-scheduler-hourly` : toutes les heures à la minute 0 (ex: 10:00, 11:00)
   - `automation-scheduler-every-5min` : toutes les 5 minutes (ex: 10:00, 10:05, 10:10)
   - **À 10:00, les deux schedulers s'exécutent simultanément** et déclenchent la même automatisation

2. **Absence de protection contre les exécutions multiples** :
   - Pas de verrou pour empêcher deux exécutions simultanées
   - Si deux requêtes arrivent en même temps, elles voient toutes les deux que `next_execution_at` est passé et déclenchent l'automatisation

3. **Possibles doublons dans la table `automations`** :
   - Plusieurs entrées pour le même utilisateur avec le même nom d'automatisation

## ✅ Solution implémentée

### 1. Migration SQL (`20251201_fix_duplicate_automations.sql`)

- **Suppression des doublons** : Supprime automatiquement les doublons d'automatisations (garde le plus récent)
- **Index unique** : Crée un index unique `(user_id, name)` pour éviter les doublons futurs
- **Système de verrou** : Ajoute une colonne `execution_lock` pour verrouiller les exécutions
- **Fonctions SQL** :
  - `try_lock_automation_execution()` : Tente de poser un verrou (retourne `false` si déjà verrouillé)
  - `release_automation_lock()` : Libère le verrou
  - `cleanup_expired_automation_locks()` : Nettoie les verrous expirés
- **Cron job** : Nettoie automatiquement les verrous expirés toutes les heures

### 2. Modification du scheduler (`automation-scheduler/index.ts`)

- **Vérification du verrou** : Avant d'exécuter, le scheduler vérifie et pose un verrou
- **Skip si verrouillé** : Si l'automatisation est déjà verrouillée (en cours d'exécution), elle est ignorée
- **Libération du verrou** : Le verrou est libéré après exécution réussie ou en cas d'erreur

## 🚀 Déploiement

### Étape 1 : Diagnostic (RECOMMANDÉ)

Exécutez d'abord le script de diagnostic pour identifier le problème :

```sql
-- Dans Supabase Dashboard → SQL Editor
-- Exécutez : supabase/migrations/20251201_diagnostic_duplicates.sql
```

Ce script vous montrera :
- Les doublons d'automatisations
- Les automations actives par utilisateur
- Les verrous actifs
- Les dernières exécutions

### Étape 2 : Exécuter la migration de correction V2

```sql
-- Dans Supabase Dashboard → SQL Editor
-- Exécutez : supabase/migrations/20251201_fix_duplicate_automations_v2.sql
```

Cette migration :
- ✅ Supprime automatiquement tous les doublons
- ✅ Crée un index unique pour éviter les doublons futurs
- ✅ Ajoute/vérifie la colonne `execution_lock`
- ✅ Crée les fonctions de verrou
- ✅ Programme le nettoyage automatique des verrous

### Étape 3 : Vérifier les résultats

La migration affichera dans les logs :
- Les doublons trouvés et supprimés
- Le nombre de verrous nettoyés
- Un résumé des actions effectuées

### Étape 4 : Redéployer l'Edge Function (si nécessaire)

Le scheduler a été mis à jour avec une protection renforcée :
- ✅ Vérification temporelle (pas d'exécution si déjà exécutée dans les 5 dernières minutes)
- ✅ Vérification du verrou (si la fonction existe)
- ✅ Vérification directe du verrou dans la table (fallback)

Le déploiement se fait automatiquement via Netlify, mais vous pouvez aussi :
```bash
supabase functions deploy automation-scheduler
```

## 🧪 Test

1. **Vérifier qu'il n'y a plus de doublons** :
   ```sql
   SELECT user_id, name, COUNT(*) 
   FROM automations 
   WHERE is_active = true 
   GROUP BY user_id, name 
   HAVING COUNT(*) > 1;
   ```
   → Devrait retourner **0 lignes**

2. **Vérifier vos automations spécifiques** :
   ```sql
   SELECT id, name, user_local_time, last_executed_at, next_execution_at
   FROM automations
   WHERE is_active = true
     AND name IN ('weekly-summary', 'daily_quote', 'monthly-report')
   ORDER BY name, created_at;
   ```
   → Devrait retourner **1 seule ligne par automatisation**

3. **Vérifier le système de verrou** :
   ```sql
   -- Tenter de poser un verrou
   SELECT try_lock_automation_execution('votre-automation-id'::UUID, 5);
   -- Devrait retourner TRUE la première fois, FALSE si déjà verrouillé
   ```

4. **Attendre la prochaine exécution** :
   - Le résumé hebdomadaire devrait maintenant s'exécuter **une seule fois**
   - La citation du jour devrait également s'exécuter **une seule fois**
   - **IMPORTANT** : Si vous recevez encore 3 emails, vérifiez qu'il n'y a pas plusieurs entrées dans la table `automations` pour le même utilisateur avec le même nom

## 📊 Résultat attendu

- ✅ **Une seule exécution** par automatisation au lieu de 3
- ✅ **Pas de doublons** dans la table `automations`
- ✅ **Protection contre les exécutions simultanées** via le système de verrou
- ✅ **Nettoyage automatique** des verrous expirés

## 🔍 Monitoring

Pour vérifier que tout fonctionne correctement :

```sql
-- Voir les verrous actifs
SELECT id, name, execution_lock, last_executed_at, next_execution_at
FROM automations
WHERE execution_lock IS NOT NULL
  AND execution_lock > NOW();

-- Voir les dernières exécutions
SELECT automation_id, automation_name, status, COUNT(*) as count
FROM automation_executions
WHERE started_at > NOW() - INTERVAL '24 hours'
GROUP BY automation_id, automation_name, status
ORDER BY count DESC;
```

## ⚠️ Notes importantes

- Le système de verrou est **rétrocompatible** : si les fonctions SQL n'existent pas encore, le scheduler continue de fonctionner (avec un warning)
- Les verrous expirent automatiquement après 10 minutes pour éviter les blocages
- Le scheduler 5min est toujours actif pour les automations sans `user_local_time`, mais le verrou empêche les exécutions multiples
- **Protection renforcée** : Le scheduler vérifie maintenant si l'automatisation a déjà été exécutée dans les 5 dernières minutes (protection temporelle)
- **Triple protection** :
  1. Vérification temporelle (5 minutes)
  2. Vérification du verrou via fonction SQL
  3. Vérification directe du verrou dans la table (fallback)

## 🔧 Si le problème persiste

Si vous recevez toujours 3 emails après avoir exécuté la migration :

1. **Vérifiez les doublons** :
   ```sql
   SELECT user_id, name, COUNT(*), array_agg(id)
   FROM automations 
   WHERE is_active = true 
   GROUP BY user_id, name 
   HAVING COUNT(*) > 1;
   ```

2. **Vérifiez les automations spécifiques** :
   ```sql
   SELECT id, name, user_id, created_at, is_active
   FROM automations
   WHERE name IN ('weekly-summary', 'daily_quote', 'monthly-report')
   ORDER BY user_id, name, created_at;
   ```

3. **Supprimez manuellement les doublons** si nécessaire :
   ```sql
   -- Garder seulement le plus récent, supprimer les autres
   DELETE FROM automations
   WHERE id IN (
     SELECT id FROM (
       SELECT id, 
              ROW_NUMBER() OVER (PARTITION BY user_id, name ORDER BY created_at DESC) as rn
       FROM automations
       WHERE is_active = true
         AND name IN ('weekly-summary', 'daily_quote', 'monthly-report')
     ) t
     WHERE rn > 1
   );
   ```


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

### Étape 1 : Exécuter la migration SQL

```bash
# Dans Supabase Dashboard → SQL Editor
# Ou via Supabase CLI :
supabase db push
```

### Étape 2 : Vérifier les doublons supprimés

La migration affichera dans les logs les doublons trouvés et supprimés.

### Étape 3 : Redéployer l'Edge Function

```bash
# Le scheduler sera automatiquement mis à jour lors du prochain déploiement
# Ou manuellement :
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
   → Devrait retourner 0 lignes

2. **Vérifier le système de verrou** :
   ```sql
   -- Tenter de poser un verrou
   SELECT try_lock_automation_execution('votre-automation-id'::UUID, 5);
   -- Devrait retourner TRUE la première fois, FALSE si déjà verrouillé
   ```

3. **Attendre la prochaine exécution** :
   - Le résumé hebdomadaire devrait maintenant s'exécuter **une seule fois**
   - La citation du jour devrait également s'exécuter **une seule fois**

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


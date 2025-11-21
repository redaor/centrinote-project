# 🔍 Debug 401 - Instructions

## ✅ Actions effectuées

1. ✅ Logs de debug ajoutés dans `automation-scheduler/index.ts`
2. ✅ Fonction redéployée avec succès

## 🧪 Test maintenant

### Attendre 1 minute (pour que le cron s'exécute)

Puis exécutez :

```bash
supabase functions logs automation-scheduler \
  --project-ref wjzlicokhxitmeoxkjzv \
  --tail 10
```

## 📋 Ce que vous devriez voir

### ✅ Si le header est bien reçu :

```
🔑 Authorization header reçu : Bearer eyJhbGciOiJIUzI1...
📋 Tous les headers reçus : { ... }
🕐 Automation Scheduler - Starting execution
```

### ❌ Si le header est absent ou incorrect :

```
🔑 Authorization header reçu : AUCUN HEADER
```

OU

```
🔑 Authorization header reçu : Bearer VOTRE_SERVICE_ROLE_KEY_ICI...
```

(Si vous voyez le placeholder, c'est que le cron SQL n'a pas été mis à jour avec la vraie clé)

## 🔧 Solutions selon le résultat

### Cas 1 : Header absent ou "AUCUN HEADER"

**Problème** : Le cron n'envoie pas le header Authorization

**Solution** : Vérifier que le cron SQL a bien été exécuté avec la vraie clé (pas le placeholder)

### Cas 2 : Header avec placeholder "VOTRE_SERVICE_ROLE_KEY_ICI"

**Problème** : Le cron SQL contient encore le placeholder

**Solution** : 
1. Ouvrir `fix_cron_401.sql`
2. Remplacer `VOTRE_SERVICE_ROLE_KEY_ICI` par la vraie clé
3. Réexécuter dans SQL Editor

### Cas 3 : Header présent mais toujours 401

**Problème** : La clé est incorrecte ou expirée

**Solution** :
1. Vérifier que la clé dans le cron SQL correspond à celle du Dashboard
2. Vérifier que le secret Edge Function `SUPABASE_SERVICE_ROLE_KEY` est configuré
3. Régénérer la clé si nécessaire

## 📊 Analyse des logs

Après avoir exécuté la commande, **collez-moi les logs** et je vous dirai exactement ce qui ne va pas.


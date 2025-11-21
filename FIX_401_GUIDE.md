# 🔧 Fix 401 sur automation-scheduler - Guide Rapide

## 🎯 Problème

Le cron appelle `automation-scheduler` mais reçoit une erreur **401 Unauthorized**.

## 🔍 Cause

L'Edge Function `automation-scheduler` utilise `SUPABASE_SERVICE_ROLE_KEY` depuis les variables d'environnement, mais :
- ❌ Le secret n'est pas configuré dans Edge Functions
- ❌ OU le cron SQL utilise une clé incorrecte/placeholder

---

## ✅ Solution en 3 étapes (5 minutes)

### Étape 1 : Configurer le secret Edge Function

1. **Aller dans** : Dashboard → Settings → API → **service_role key**
2. **Copier** la clé complète
3. **Aller dans** : Dashboard → Settings → Edge Functions → **Secrets**
4. **Ajouter** :
   - Nom : `SUPABASE_SERVICE_ROLE_KEY`
   - Valeur : (collez la clé copiée)
5. **Sauvegarder**

**OU via CLI** :
```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="VOTRE_CLE_ICI" \
  --project-ref wjzlicokhxitmeoxkjzv
```

---

### Étape 2 : Corriger le cron SQL

1. **Ouvrir** le fichier `fix_cron_401.sql`
2. **Remplacer** `VOTRE_SERVICE_ROLE_KEY_ICI` par votre vraie clé (même que l'étape 1)
3. **Copier** tout le contenu
4. **Aller dans** : Dashboard → SQL Editor
5. **Coller** et **exécuter**

**Le script** :
- Supprime les anciens crons
- Crée un nouveau cron avec la clé en dur (évite les problèmes de variables PG)

---

### Étape 3 : Redéployer l'Edge Function (optionnel mais recommandé)

```bash
supabase functions deploy automation-scheduler \
  --project-ref wjzlicokhxitmeoxkjzv \
  --no-verify-jwt
```

---

## 🧪 Test

### Attendre 1 minute, puis vérifier les logs :

```bash
# Vérifier le status code (doit être 200)
supabase functions logs automation-scheduler \
  --project-ref wjzlicokhxitmeoxkjzv \
  --tail 10 | grep -i "status\|200\|401"
```

**Résultat attendu** :
- ✅ Status 200 (au lieu de 401)
- ✅ Logs montrent "Automation Scheduler - Starting execution"
- ✅ Pas d'erreur "Unauthorized"

---

## 🔍 Diagnostic

Si le problème persiste, exécutez :

```bash
./fix_401_automation_scheduler.sh
```

Ce script vérifie :
- ✅ Si le secret `SUPABASE_SERVICE_ROLE_KEY` existe
- ✅ Les derniers logs
- ✅ Le code de l'Edge Function

---

## 📋 Checklist

- [ ] Secret `SUPABASE_SERVICE_ROLE_KEY` configuré dans Edge Functions
- [ ] Cron SQL mis à jour avec la vraie clé (fichier `fix_cron_401.sql`)
- [ ] Edge Function redéployée (optionnel)
- [ ] Logs montrent status 200 (pas 401)

---

## ⚠️ Important

**Ne jamais exposer la Service Role Key publiquement** :
- ❌ Ne pas la commiter dans Git
- ❌ Ne pas la partager
- ✅ Utiliser les secrets Edge Functions
- ✅ Utiliser des placeholders dans les fichiers SQL (`VOTRE_SERVICE_ROLE_KEY_ICI`)

---

## 🆘 Si ça ne marche toujours pas

1. **Vérifier les logs détaillés** :
   ```bash
   supabase functions logs automation-scheduler \
     --project-ref wjzlicokhxitmeoxkjzv \
     --tail 20
   ```

2. **Vérifier que le secret est bien configuré** :
   - Dashboard → Settings → Edge Functions → Secrets
   - Doit voir `SUPABASE_SERVICE_ROLE_KEY` dans la liste

3. **Vérifier le cron** :
   ```sql
   SELECT jobid, schedule, jobname, active
   FROM cron.job
   WHERE jobname LIKE '%automation%';
   ```

4. **Tester manuellement** :
   - Dashboard → Edge Functions → `automation-scheduler` → Invoke
   - Vérifier les logs immédiatement après

---

## ✅ Résultat attendu

Après correction :
- ✅ Status 200 dans les logs
- ✅ Le scheduler s'exécute toutes les minutes
- ✅ Les automations sont détectées et exécutées
- ✅ Les emails sont envoyés


# 📋 Quels fichiers SQL exécuter ?

## ⚠️ IMPORTANT

**Ne jamais exécuter les fichiers `.md` dans l'éditeur SQL !**

Les fichiers `.md` sont de la **documentation**, pas du code SQL.

---

## ✅ Fichiers SQL à exécuter (dans l'ordre)

### 1. **Migration de base de données** (si pas déjà fait)

**Fichier** : `apply_migration_automation_time.sql`

**Où l'exécuter** : Supabase Dashboard → PRODUCTION → SQL Editor

**Quand** : Une seule fois, pour ajouter les colonnes `user_local_time` et `user_timezone`

**Contenu** : Ajoute les colonnes nécessaires à la table `automations`

---

### 2. **Configuration du cron toutes les minutes** (CRITIQUE)

**Fichier** : `fix_cron_every_minute.sql`

**Où l'exécuter** : Supabase Dashboard → PRODUCTION → SQL Editor

**Quand** : Une seule fois, pour que le cron tourne toutes les minutes

**Contenu** : 
- Supprime l'ancien cron horaire (`0 * * * *`)
- Crée un nouveau cron toutes les minutes (`* * * * *`)

**⚠️ IMPORTANT** : Avant d'exécuter, remplacez :
- `VOTRE_SERVICE_ROLE_KEY_ICI` par votre vraie Service Role Key
- Vérifiez que l'URL Supabase est correcte

---

### 3. **Tester manuellement le scheduler** (optionnel)

**Fichier** : `trigger_scheduler_now_fixed.sql`

**Où l'exécuter** : Supabase Dashboard → PRODUCTION → SQL Editor

**Quand** : Pour tester manuellement si le scheduler fonctionne

**Contenu** : Déclenche manuellement le scheduler

---

## ❌ Fichiers à NE PAS exécuter dans SQL Editor

Ces fichiers sont de la **documentation** (`.md`), pas du SQL :

- ❌ `ANALYSE_DIFFERENCES_SANDBOX_PRODUCTION.md`
- ❌ `EXPLICATION_SIMPLE_PROBLEME.md`
- ❌ `README_DEPLOY.md`
- ❌ `QUELS_FICHIERS_SQL_EXECUTER.md` (ce fichier)
- ❌ Tous les autres fichiers `.md`

---

## 📝 Comment exécuter un fichier SQL

1. **Ouvrir** le fichier `.sql` dans votre éditeur de code
2. **Copier** tout le contenu
3. **Aller** dans Supabase Dashboard → PRODUCTION → SQL Editor
4. **Coller** le contenu
5. **Vérifier** que les valeurs (URL, Service Role Key) sont correctes
6. **Exécuter** avec le bouton "Run"

---

## ✅ Checklist

- [ ] Migration appliquée : `apply_migration_automation_time.sql`
- [ ] Cron configuré : `fix_cron_every_minute.sql` (avec Service Role Key remplacée)
- [ ] Secrets SMTP configurés dans Dashboard → Settings → Edge Functions → Secrets
- [ ] Edge Functions déployées (via `./deploy-to-prod.sh`)

---

## 🔍 Vérification

Après avoir exécuté `fix_cron_every_minute.sql`, vérifiez que le cron est bien créé :

```sql
SELECT 
  jobid,
  schedule,
  jobname,
  active
FROM cron.job
WHERE jobname LIKE '%automation%'
ORDER BY jobid;
```

**Résultat attendu** : Un job avec `schedule = '* * * * *'` (toutes les minutes)


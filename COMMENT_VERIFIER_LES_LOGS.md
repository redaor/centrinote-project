# 📋 Comment vérifier les logs (Terminal vs SQL Editor)

## ⚠️ Erreur courante

Vous avez essayé d'exécuter une **commande bash** dans l'**éditeur SQL**.

**Les commandes `supabase functions logs` sont des commandes TERMINAL, pas du SQL !**

---

## ✅ Solution : Utiliser le Terminal

### Option 1 : Terminal intégré de Cursor

1. **Ouvrir le terminal** dans Cursor :
   - `Ctrl + `` (backtick) sur Windows/Linux
   - `Cmd + `` sur Mac
   - OU : Menu → Terminal → New Terminal

2. **Exécuter la commande** :
   ```bash
   supabase functions logs automation-scheduler \
     --project-ref wjzlicokhxitmeoxkjzv \
     --tail 10
   ```

### Option 2 : Terminal système

1. **Ouvrir** Terminal.app (Mac) ou PowerShell/CMD (Windows)
2. **Naviguer** vers le projet :
   ```bash
   cd /Users/redasahraoui/Projects/centrinote-project
   ```
3. **Exécuter** la commande :
   ```bash
   supabase functions logs automation-scheduler \
     --project-ref wjzlicokhxitmeoxkjzv \
     --tail 10
   ```

---

## 📊 Alternative : Dashboard Supabase

Si vous préférez ne pas utiliser le terminal :

1. **Aller dans** : Dashboard → Edge Functions → `automation-scheduler`
2. **Cliquer sur** : "Logs"
3. **Voir** les logs en temps réel

---

## 🔍 Différence : Terminal vs SQL Editor

| Type | Où l'exécuter | Exemples |
|------|---------------|----------|
| **Commandes bash** | Terminal | `supabase functions logs`, `supabase deploy`, `npm install` |
| **Requêtes SQL** | SQL Editor | `SELECT * FROM automations`, `CREATE TABLE ...` |

---

## ✅ Commandes à exécuter dans le Terminal

```bash
# 1. Vérifier les logs automation-scheduler
supabase functions logs automation-scheduler \
  --project-ref wjzlicokhxitmeoxkjzv \
  --tail 10

# 2. Vérifier les logs automation-email
supabase functions logs automation-email \
  --project-ref wjzlicokhxitmeoxkjzv \
  --tail 10

# 3. Déployer une fonction
supabase functions deploy automation-scheduler \
  --project-ref wjzlicokhxitmeoxkjzv \
  --no-verify-jwt
```

---

## ❌ Commandes à NE PAS exécuter dans SQL Editor

- ❌ `supabase functions logs ...`
- ❌ `supabase deploy ...`
- ❌ `npm install ...`
- ❌ Toutes les commandes qui commencent par `supabase`, `npm`, `git`, etc.

---

## ✅ Commandes à exécuter dans SQL Editor

- ✅ `SELECT * FROM automations;`
- ✅ `CREATE TABLE ...`
- ✅ `ALTER TABLE ...`
- ✅ Toutes les requêtes SQL

---

## 🎯 Résumé

**Pour vérifier les logs** :
- ✅ Utiliser le **Terminal** (pas SQL Editor)
- ✅ OU utiliser le **Dashboard** → Edge Functions → Logs

**Pour exécuter du SQL** :
- ✅ Utiliser le **SQL Editor** du Dashboard


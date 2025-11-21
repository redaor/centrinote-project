# 🔍 Guide de Diagnostic Production - Emails non reçus

## Problème
Les emails fonctionnent en **bac à sable** mais pas en **production**.

## Étapes de diagnostic

### 1. Vérifier les logs des Edge Functions en production

#### A. Logs de `automation-scheduler`
1. **Supabase Dashboard** → **PRODUCTION** → **Edge Functions** → `automation-scheduler` → **Logs**
2. Chercher les exécutions récentes
3. Vérifier :
   - ✅ Le scheduler tourne-t-il ?
   - ✅ Détecte-t-il l'heure locale ?
   - ✅ Appelle-t-il `automation-micro-runner` ?
   - ❌ Y a-t-il des erreurs ?

#### B. Logs de `automation-micro-runner`
1. **Edge Functions** → `automation-micro-runner` → **Logs**
2. Chercher les exécutions pour `daily_quote`
3. Vérifier :
   - ✅ Est-il appelé par le scheduler ?
   - ✅ Récupère-t-il la citation ?
   - ✅ Appelle-t-il `automation-email` ?
   - ❌ Y a-t-il des erreurs ?

#### C. Logs de `automation-email`
1. **Edge Functions** → `automation-email` → **Logs**
2. Chercher les tentatives d'envoi
3. Vérifier :
   - ✅ Est-il appelé ?
   - ✅ Les variables SMTP sont-elles définies ?
   - ❌ Erreurs SMTP ?

### 2. Exécuter le diagnostic SQL

Exécuter `diagnostic_complet_production.sql` dans **SQL Editor** pour voir :
- L'état de l'automation
- Les exécutions récentes
- Les erreurs éventuelles

### 3. Test manuel d'exécution

Exécuter `test_manual_execution_production.sql` pour :
- Tester `automation-micro-runner` directement
- Tester `automation-email` directement
- Identifier où ça bloque

### 4. Vérifier les variables d'environnement

#### Variables SMTP (CRITIQUE)
1. **Settings** → **Edge Functions** → **Secrets**
2. Vérifier que ces variables existent :
   - `SMTP_HOST`
   - `SMTP_PORT`
   - `SMTP_USER`
   - `SMTP_PASSWORD`
   - `SMTP_FROM`

#### Variables Supabase
1. Vérifier que ces variables sont configurées :
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

### 5. Vérifier le cron job

Exécuter ce SQL pour vérifier les jobs actifs :

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

Vérifier qu'il y a un job qui tourne **toutes les minutes** (`schedule = '* * * * *'`).

## Points de blocage possibles

### ❌ Blocage 1 : Le scheduler ne tourne pas
**Symptôme** : Aucun log dans `automation-scheduler`
**Solution** : Vérifier le cron job et le créer si nécessaire

### ❌ Blocage 2 : Le scheduler ne détecte pas l'heure
**Symptôme** : Logs montrent "⏭️ Skipping - not yet due"
**Solution** : Vérifier la logique de détection d'heure dans `checkExecutionTime`

### ❌ Blocage 3 : automation-micro-runner n'est pas appelé
**Symptôme** : Logs du scheduler montrent l'appel mais pas de logs dans micro-runner
**Solution** : Vérifier que le code détecte bien les micro templates

### ❌ Blocage 4 : automation-email échoue (variables SMTP manquantes)
**Symptôme** : Erreur "SMTP_HOST is not defined" dans les logs
**Solution** : Configurer les variables SMTP dans les secrets

### ❌ Blocage 5 : Email envoyé mais non reçu
**Symptôme** : Logs montrent "✅ Email sent" mais pas d'email reçu
**Solution** : Vérifier le dossier spam, les filtres email, les logs SMTP

## Checklist de résolution

- [ ] Logs de `automation-scheduler` vérifiés
- [ ] Logs de `automation-micro-runner` vérifiés
- [ ] Logs de `automation-email` vérifiés
- [ ] Variables SMTP configurées en production
- [ ] Cron job actif et tourne toutes les minutes
- [ ] Test manuel exécuté avec succès
- [ ] Diagnostic SQL exécuté
- [ ] Email reçu ou erreur identifiée

## Commandes utiles

### Vérifier les exécutions récentes
```sql
SELECT * FROM automation_executions 
WHERE started_at >= NOW() - INTERVAL '1 hour'
ORDER BY started_at DESC;
```

### Vérifier l'automation
```sql
SELECT * FROM automations WHERE name = 'daily_quote';
```

### Forcer une exécution manuelle
Voir `test_manual_execution_production.sql`


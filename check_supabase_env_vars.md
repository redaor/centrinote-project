# 🔍 Vérification des Variables d'Environnement Supabase

## Problème identifié
Les emails fonctionnent en bac à sable mais pas en production. La cause probable : **variables d'environnement SMTP non configurées en production**.

## Variables SMTP requises pour `automation-email`

La fonction `supabase/functions/automation-email/index.ts` nécessite ces variables :

```bash
SMTP_HOST          # Ex: smtp.ionos.fr
SMTP_PORT          # Ex: 465
SMTP_USER          # Votre email SMTP
SMTP_PASSWORD      # Votre mot de passe SMTP
SMTP_FROM          # Ex: Centrinote <contact@centrinote.fr>
```

## ✅ Comment vérifier et configurer

### 1. Vérifier les variables dans Supabase Dashboard (PRODUCTION)

1. Aller dans **Supabase Dashboard** → Votre projet **PRODUCTION**
2. **Settings** → **Edge Functions** → **Secrets**
3. Vérifier que ces variables existent :
   - `SMTP_HOST`
   - `SMTP_PORT`
   - `SMTP_USER`
   - `SMTP_PASSWORD`
   - `SMTP_FROM`

### 2. Comparer avec le bac à sable

1. Aller dans **Supabase Dashboard** → Votre projet **BAC À SABLE**
2. **Settings** → **Edge Functions** → **Secrets**
3. Noter toutes les variables SMTP configurées
4. Les copier dans l'environnement de **PRODUCTION**

### 3. Vérifier les logs des Edge Functions

#### Logs de `automation-scheduler` (PRODUCTION)
1. **Edge Functions** → `automation-scheduler` → **Logs**
2. Chercher les exécutions autour de l'heure configurée (ex: 08:28)
3. Vérifier s'il y a des erreurs

#### Logs de `automation-micro-runner` (PRODUCTION)
1. **Edge Functions** → `automation-micro-runner` → **Logs**
2. Chercher les exécutions pour `daily_quote`
3. Vérifier les erreurs éventuelles

#### Logs de `automation-email` (PRODUCTION)
1. **Edge Functions** → `automation-email` → **Logs**
2. Chercher les tentatives d'envoi d'emails
3. **Erreurs probables** :
   - `SMTP_HOST is not defined`
   - `SMTP_USER is not defined`
   - `SMTP_PASSWORD is not defined`
   - Erreurs de connexion SMTP

## 🔧 Solution

### Étape 1 : Configurer les variables SMTP en production

Dans **Supabase Dashboard** → **PRODUCTION** → **Settings** → **Edge Functions** → **Secrets** :

```bash
# Ajouter/Modifier ces secrets :
SMTP_HOST=smtp.ionos.fr          # (ou votre serveur SMTP)
SMTP_PORT=465
SMTP_USER=votre-email@domain.com
SMTP_PASSWORD=votre-mot-de-passe
SMTP_FROM=Centrinote <contact@centrinote.fr>
```

### Étape 2 : Redéployer la fonction (si nécessaire)

Après avoir ajouté les secrets, la fonction devrait automatiquement les utiliser. Si besoin :

1. **Edge Functions** → `automation-email`
2. Cliquer sur **"Redeploy"** ou **"Update"**

### Étape 3 : Tester manuellement

Exécuter ce SQL dans **SQL Editor** pour tester l'envoi :

```sql
-- Tester l'envoi d'email via automation-email
SELECT
  net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/automation-email',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'to', 'votre-email@test.com',
      'subject', 'Test Email Production',
      'body', 'Ceci est un test depuis la production',
      'html', '<h1>Test Email Production</h1><p>Ceci est un test depuis la production</p>'
    )
  ) AS request_id;
```

## 📊 Checklist de diagnostic

- [ ] Variables SMTP configurées en production
- [ ] Variables SMTP identiques au bac à sable
- [ ] Fonction `automation-email` déployée en production
- [ ] Fonction `automation-scheduler` déployée en production
- [ ] Fonction `automation-micro-runner` déployée en production
- [ ] Cron job `automation-scheduler-hourly` actif
- [ ] Automation `daily_quote` active (`is_active = true`)
- [ ] `user_local_time` configuré correctement
- [ ] Logs vérifiés sans erreur SMTP

## 🐛 Erreurs courantes

1. **"SMTP_HOST is not defined"**
   → Variable `SMTP_HOST` manquante dans les secrets

2. **"Connection refused"**
   → `SMTP_HOST` ou `SMTP_PORT` incorrect

3. **"Authentication failed"**
   → `SMTP_USER` ou `SMTP_PASSWORD` incorrect

4. **"Email not sent"**
   → Vérifier les logs de `automation-email` pour l'erreur exacte


# 🧪 Guide de Test - Système de Notifications 100% Fonctionnel

## 📋 Prérequis

1. ✅ Être connecté à l'application Centrinote
2. ✅ Avoir accès au **Supabase Dashboard** (SQL Editor + Logs)
3. ✅ Avoir au moins une automation active (ex: `daily_quote`, `study-reminder`)

---

## 🎯 Test 1 : Toggle "Notifications par email"

### Objectif
Vérifier que désactiver le toggle "Notifications par email" bloque tous les emails.

### Étapes

#### 1. Désactiver les emails dans l'interface

1. Ouvrir l'application : `http://localhost:5173/settings` (ou votre URL de production)
2. Aller dans **Paramètres → Notifications**
3. **Désactiver** le toggle "Notifications par email" (il doit devenir gris/off)
4. Ouvrir la console du navigateur (F12)
5. Vérifier les logs :
   ```
   [SettingsService] Updating notifications: { userId: "...", updates: { emails: false } }
   ✅ [SettingsService] Notifications update completed successfully
   ```

#### 2. Vérifier que la préférence est bien sauvegardée dans la BDD

1. Ouvrir le **Supabase Dashboard**
2. Aller dans **SQL Editor**
3. Copier-coller et exécuter ce SQL :
   ```sql
   SELECT
     user_id,
     settings->'notifications'->>'emails' as emails_enabled
   FROM user_settings
   WHERE user_id = auth.uid();
   ```
4. ✅ **Résultat attendu** : `emails_enabled` doit être `"false"` (ou `null`)

#### 3. Forcer une automation qui envoie des emails

1. Toujours dans le **SQL Editor**, copier-coller le contenu du fichier **`test_email_toggle.sql`**
2. Exécuter le script (clic sur "Run")
3. Vérifier la sortie : `next_execution_at` doit être `NOW()`

#### 4. Vérifier les logs de l'Edge Function

1. Attendre **1-2 minutes** (le temps que `automation-scheduler` s'exécute)
2. Aller dans **Supabase Dashboard → Edge Functions → automation-micro-runner → Logs**
3. Rafraîchir les logs (bouton "Refresh")
4. Chercher les lignes contenant `[DAILY-QUOTE]`

#### 5. Résultat attendu

**Si le toggle fonctionne correctement, vous devriez voir** :
```
📧 [EMAIL-CHECK] User has disabled email notifications, blocking email
📧 [DAILY-QUOTE] Skipping email due to user preferences
```

**Vous NE devriez PAS voir** :
```
✅ [EMAIL-CHECK] Email notifications enabled for user abc123
📖 Citation récupérée : « ... »
```

**Et surtout : AUCUN EMAIL reçu dans votre boîte mail.**

#### 6. Test inverse : Réactiver les emails

1. Retourner dans **Paramètres → Notifications**
2. **Réactiver** le toggle "Notifications par email"
3. Relancer le script SQL `test_email_toggle.sql`
4. Attendre 1-2 minutes
5. Vérifier les logs :
   ```
   ✅ [EMAIL-CHECK] Email notifications enabled for user abc123
   📖 Citation récupérée : « ... »
   ✅ Email sent successfully
   ```
6. ✅ **Résultat attendu** : Vous recevez un email avec la citation du jour

---

## 🎯 Test 2 : Toggle "Rappels"

### Objectif
Vérifier que désactiver le toggle "Rappels" bloque toutes les notifications de rappel.

### Étapes

#### 1. Désactiver les rappels dans l'interface

1. Ouvrir **Paramètres → Notifications**
2. **Désactiver** le toggle "Rappels"
3. Vérifier les logs dans la console (F12) :
   ```
   [SettingsService] Updating notifications: { userId: "...", updates: { reminders: false } }
   ```

#### 2. Vérifier que la préférence est bien sauvegardée dans la BDD

```sql
SELECT
  user_id,
  settings->'notifications'->>'reminders' as reminders_enabled
FROM user_settings
WHERE user_id = auth.uid();
```
✅ **Résultat attendu** : `reminders_enabled` doit être `"false"`

#### 3. Forcer une automation qui envoie des rappels

1. Dans le **SQL Editor**, copier-coller le contenu du fichier **`test_reminders_toggle.sql`**
2. Exécuter le script
3. Attendre 1-2 minutes

#### 4. Vérifier les logs de l'Edge Function

1. Aller dans **Edge Functions → automation-micro-runner → Logs**
2. Chercher `[STUDY-REMINDER]`

#### 5. Résultat attendu

**Si le toggle fonctionne correctement** :
```
🔔 [REMINDER-CHECK] User has disabled reminders, blocking reminder
🔔 [STUDY-REMINDER] Skipping reminder due to user preferences
```

**Aucune notification ne doit apparaître dans l'interface** (icône 🔔 dans le header).

#### 6. Vérifier dans la BDD qu'aucune notification n'a été créée

```sql
SELECT
  id,
  title,
  message,
  created_at
FROM notifications
WHERE
  user_id = auth.uid()
  AND created_at > NOW() - INTERVAL '5 minutes';
```
✅ **Résultat attendu** : **Aucune ligne retournée** (ou seulement les anciennes notifications)

#### 7. Test inverse : Réactiver les rappels

1. **Réactiver** le toggle "Rappels"
2. Relancer le script `test_reminders_toggle.sql`
3. Attendre 1-2 minutes
4. Vérifier les logs :
   ```
   ✅ [REMINDER-CHECK] Reminders enabled for user abc123
   ✅ [STUDY-REMINDER] Notification sent successfully
   ```
5. ✅ **Résultat attendu** : Une notification apparaît dans l'interface (icône 🔔 avec un badge rouge)

---

## 🎯 Test 3 : Heures calmes

### Objectif
Vérifier que les heures calmes bloquent TOUTES les notifications (emails + rappels) pendant la plage définie.

### Test 3A : Heures calmes couvrant toute la journée (test facile)

#### 1. Activer les heures calmes pour toute la journée

1. Ouvrir **Paramètres → Notifications**
2. **Activer** le toggle "Heures calmes"
3. Définir **Début** : `00:00` (minuit)
4. Définir **Fin** : `23:59` (23h59)
5. Vérifier les logs dans la console (F12) :
   ```
   [SettingsService] Updating notifications: { quietHours: { enabled: true, start: "00:00", end: "23:59" } }
   ```

#### 2. Vérifier que la préférence est bien sauvegardée

```sql
SELECT
  user_id,
  settings->'notifications'->'quietHours'->>'enabled' as quiet_hours_enabled,
  settings->'notifications'->'quietHours'->>'start' as quiet_start,
  settings->'notifications'->'quietHours'->>'end' as quiet_end
FROM user_settings
WHERE user_id = auth.uid();
```
✅ **Résultat attendu** :
- `quiet_hours_enabled` = `"true"`
- `quiet_start` = `"00:00"`
- `quiet_end` = `"23:59"`

#### 3. Forcer TOUTES les automations à s'exécuter

1. Dans le **SQL Editor**, copier-coller le contenu du fichier **`test_quiet_hours.sql`**
2. Exécuter le script
3. Attendre 1-2 minutes

#### 4. Vérifier les logs de l'Edge Function

1. Aller dans **Edge Functions → automation-micro-runner → Logs**
2. Chercher les lignes contenant `[QUIET-HOURS]`

#### 5. Résultat attendu

**Pour CHAQUE automation exécutée, vous devriez voir** :
```
🔍 [QUIET-HOURS] Checking for user abc123: {
  currentTime: "14:30",
  quietStart: "00:00",
  quietEnd: "23:59",
  timezone: "Europe/Paris"
}
🌙 [QUIET-HOURS] Currently in quiet hours (00:00 - 23:59), blocking notification
🌙 [FOCUS-MODE] Skipping due to quiet hours
```

**Et pour les autres automations** :
```
🌙 [DAILY-QUOTE] Skipping email due to quiet hours
🌙 [STUDY-REMINDER] Skipping due to quiet hours
🌙 [VOCAB-MILESTONE] Skipping due to quiet hours
```

#### 6. Vérifier qu'aucune notification n'a été créée

```sql
SELECT
  COUNT(*) as notifications_count
FROM notifications
WHERE
  user_id = auth.uid()
  AND created_at > NOW() - INTERVAL '5 minutes';
```
✅ **Résultat attendu** : `notifications_count` = `0`

#### 7. Vérifier qu'aucun email n'a été envoyé

✅ **Résultat attendu** : Aucun email reçu dans votre boîte mail

### Test 3B : Heures calmes avec plage précise (test avancé)

#### 1. Définir une plage qui traverse minuit

1. **Activer** "Heures calmes"
2. Définir **Début** : `22:00` (22h)
3. Définir **Fin** : `08:00` (8h du matin)
4. Tester à **23h30** (devrait bloquer)
5. Tester à **02:00** (devrait bloquer)
6. Tester à **10:00** (devrait autoriser)

#### 2. Vérifier les logs selon l'heure

**Si testé à 23h30 (dans les heures calmes)** :
```
🔍 [QUIET-HOURS] Checking for user abc123: { currentTime: "23:30", quietStart: "22:00", quietEnd: "08:00" }
🌙 [QUIET-HOURS] Currently in quiet hours (22:00 - 08:00), blocking notification
```

**Si testé à 10h00 (hors des heures calmes)** :
```
🔍 [QUIET-HOURS] Checking for user abc123: { currentTime: "10:00", quietStart: "22:00", quietEnd: "08:00" }
✅ [QUIET-HOURS] Outside quiet hours, allowing notification
✅ [STUDY-REMINDER] Notification sent successfully
```

#### 3. Test inverse : Désactiver les heures calmes

1. **Désactiver** le toggle "Heures calmes"
2. Relancer le script `test_quiet_hours.sql`
3. Attendre 1-2 minutes
4. Vérifier les logs :
   ```
   ✅ [QUIET-HOURS] Quiet hours not enabled for user abc123, allowing notification
   ```
5. ✅ **Résultat attendu** : Toutes les notifications sont envoyées normalement

---

## 🎯 Test 4 : Combinaison de préférences

### Objectif
Vérifier que les vérifications se cumulent correctement.

### Scénario 1 : Emails désactivés + Heures calmes activées

1. **Désactiver** "Notifications par email"
2. **Activer** "Heures calmes" (00:00 → 23:59)
3. Forcer `daily_quote`
4. ✅ **Résultat attendu** : Bloqué dès la première vérification (emails désactivés)
   ```
   📧 [DAILY-QUOTE] Skipping email due to user preferences
   ```
   Note : Le système ne va même pas vérifier les heures calmes car déjà bloqué par le toggle emails

### Scénario 2 : Tout activé + Hors des heures calmes

1. **Activer** "Notifications par email"
2. **Activer** "Rappels"
3. **Activer** "Heures calmes" mais définir une plage hors de l'heure actuelle (ex: 01:00 → 02:00 alors qu'il est 10:00)
4. Forcer toutes les automations
5. ✅ **Résultat attendu** : Toutes les notifications sont envoyées normalement
   ```
   ✅ [EMAIL-CHECK] Email notifications enabled for user abc123
   ✅ [REMINDER-CHECK] Reminders enabled for user abc123
   ✅ [QUIET-HOURS] Outside quiet hours, allowing notification
   ✅ [DAILY-QUOTE] Email sent successfully
   ✅ [STUDY-REMINDER] Notification sent successfully
   ```

### Scénario 3 : Tout désactivé

1. **Désactiver** "Notifications par email"
2. **Désactiver** "Rappels"
3. **Activer** "Heures calmes" (00:00 → 23:59)
4. Forcer toutes les automations
5. ✅ **Résultat attendu** : Aucune notification envoyée, toutes bloquées au premier check

---

## 📊 Checklist de validation finale

| Test | Attendu | Résultat | ✅/❌ |
|------|---------|----------|------|
| Toggle emails OFF → Aucun email envoyé | Aucun email reçu | ... | ... |
| Toggle emails ON → Emails envoyés | Email reçu | ... | ... |
| Toggle reminders OFF → Aucune notif | Aucune notification | ... | ... |
| Toggle reminders ON → Notifs envoyées | Notification reçue | ... | ... |
| Heures calmes (toute la journée) | Aucune notification | ... | ... |
| Heures calmes (plage précise dans) | Aucune notification | ... | ... |
| Heures calmes (plage précise hors) | Notifications envoyées | ... | ... |
| Heures calmes OFF | Notifications envoyées | ... | ... |
| Logs détaillés visibles | Logs présents dans Dashboard | ... | ... |

---

## 🐛 Dépannage

### Problème : Les préférences ne se sauvegardent pas

**Symptôme** : Après avoir changé un toggle, la requête SQL montre toujours l'ancienne valeur.

**Solution** :
1. Vérifier la console du navigateur (F12) pour voir les erreurs
2. Vérifier que la table `user_settings` existe :
   ```sql
   SELECT * FROM user_settings WHERE user_id = auth.uid();
   ```
3. Si la table n'existe pas, créer une migration (voir `SYNCHRONISATION_PREFERENCES_IMPLEMENTED.md`)

### Problème : Les automations ne se déclenchent pas

**Symptôme** : Après avoir mis `next_execution_at = NOW()`, aucune exécution dans les logs.

**Solution** :
1. Vérifier que `automation-scheduler` s'exécute bien (cron toutes les heures à :00)
2. Vérifier les logs de `automation-scheduler` :
   ```
   Supabase Dashboard → Edge Functions → automation-scheduler → Logs
   ```
3. Attendre jusqu'à 2 minutes (le cron s'exécute toutes les heures mais peut prendre du temps)

### Problème : Les logs ne s'affichent pas

**Symptôme** : Aucun log visible dans le Dashboard malgré l'exécution.

**Solution** :
1. Rafraîchir la page des logs (bouton "Refresh")
2. Vérifier que vous êtes sur le bon environnement (production vs staging)
3. Les logs peuvent prendre 10-30 secondes à apparaître

### Problème : Les heures calmes ne fonctionnent pas

**Symptôme** : Des notifications sont envoyées pendant les heures calmes.

**Solution** :
1. Vérifier le fuseau horaire dans `user_settings` :
   ```sql
   SELECT settings->'notifications'->>'timezone' FROM user_settings WHERE user_id = auth.uid();
   ```
2. Si `null`, le système utilise `Europe/Paris` par défaut
3. Comparer l'heure actuelle avec la plage définie (attention à la plage qui traverse minuit)

---

## 📁 Fichiers de test fournis

1. **`test_email_toggle.sql`** - Test du toggle "Notifications par email"
2. **`test_reminders_toggle.sql`** - Test du toggle "Rappels"
3. **`test_quiet_hours.sql`** - Test des heures calmes

---

## 🎉 Validation complète

Une fois tous les tests passés, vous pouvez être sûr que le système de notifications est **100% fonctionnel** !

**Points clés à retenir** :
- ✅ Les toggles dans l'interface sont maintenant **fonctionnels**, pas cosmétiques
- ✅ Les préférences sont **respectées** par toutes les 9 automations
- ✅ Les logs sont **détaillés** pour faciliter le debugging
- ✅ Le système est **fail-safe** : en cas d'erreur, il autorise par défaut plutôt que de bloquer

---

**Créé le** : 26 novembre 2025
**Version** : 1.0.0

# 🔔 Préférences de Notifications - Explication Complète

## 📋 Vue d'ensemble

Les préférences de notifications dans Centrinote permettent aux utilisateurs de contrôler **comment** et **quand** ils reçoivent des notifications. Ces préférences sont accessibles dans **Paramètres → Notifications**.

## ⚙️ Interface utilisateur

### 1. Notifications par email 📧
**Localisation** : `src/components/settings/sections/NotificationsSection.tsx` (lignes 52-59)

**Description** : Toggle pour activer/désactiver les notifications par email.

**Texte affiché** :
- Label : "Notifications par email"
- Description : "Recevoir des notifications importantes par email"

**État par défaut** : `true` (activé)

**Comportement** :
- ✅ Quand activé : L'utilisateur peut choisir l'heure d'envoi
- ❌ Quand désactivé : Le champ d'heure d'envoi est caché

---

### 2. Heure d'envoi des emails 📧
**Localisation** : `src/components/settings/sections/NotificationsSection.tsx` (lignes 62-104)

**Description** : Champ de sélection de l'heure pour les emails automatiques.

**Texte affiché** :
- Label : "Heure d'envoi des emails 📧"
- Description : "Citations, rappels et autres emails seront envoyés à cette heure"

**Type de champ** : `<input type="time">` (sélecteur d'heure)

**État par défaut** : `"08:00"` (8h du matin)

**Format** : `"HH:mm"` (exemple : "18:50")

**Visibilité** : Visible uniquement si `notifications.emails === true`

**Comportement** :
- L'heure est sauvegardée dans `user_settings` → `settings.notifications.emailTime`
- Animation slide-down lors de l'affichage
- Border left colorée (bleu) pour indiquer le lien avec le toggle parent

---

### 3. Rappels
**Localisation** : `src/components/settings/sections/NotificationsSection.tsx` (lignes 107-114)

**Description** : Toggle pour activer/désactiver les rappels.

**Texte affiché** :
- Label : "Rappels"
- Description : "Notifications pour vos tâches et échéances"

**État par défaut** : `true` (activé)

**Comportement** :
- Contrôle l'envoi de rappels pour les tâches et échéances
- Actuellement sauvegardé mais non utilisé par le système d'automations

---

### 4. Notifications push
**Localisation** : `src/components/settings/sections/NotificationsSection.tsx` (lignes 117-124)

**Description** : Toggle pour activer/désactiver les notifications push.

**Texte affiché** :
- Label : "Notifications push"
- Description : "Recevoir des notifications push sur votre appareil"

**État par défaut** : `false` (désactivé)

**Comportement** :
- **⚠️ Non implémenté** : Les notifications push ne sont pas encore fonctionnelles
- Sera utilisé plus tard pour les notifications natives (iOS/Android/Web)

---

### 5. Heures calmes 🌙
**Localisation** : `src/components/settings/sections/NotificationsSection.tsx` (lignes 127-222)

**Description** : Toggle + configuration des heures sans notifications.

**Texte affiché** :
- Label : "Heures calmes"
- Description : "Ne pas déranger pendant certaines heures"

**État par défaut** :
```typescript
{
  enabled: false,
  start: "22:00",
  end: "08:00"
}
```

**Comportement** :
- ✅ Quand activé : Affiche deux champs de sélection d'heure
- Champ 1 : **Début** (heure de début des heures calmes)
- Champ 2 : **Fin** (heure de fin des heures calmes)
- Format : `"HH:mm"`
- Les deux champs sont **modifiables** par l'utilisateur
- Animation slide-down lors de l'affichage
- Background grisé pour distinguer la section

**Note importante** : Contrairement à ce que vous avez mentionné, **les deux champs (début ET fin) sont modifiables**. Le code permet de changer les deux valeurs :
- `handleQuietHoursChange('start', value)` pour le début
- `handleQuietHoursChange('end', value)` pour la fin

---

## 💾 Sauvegarde des données

### Structure de données
Les préférences sont sauvegardées dans deux endroits :

#### 1. Table `user_settings` (Base de données Supabase)
```sql
CREATE TABLE user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  settings JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Structure du champ `settings` (JSONB)** :
```json
{
  "profile": { ... },
  "appearance": { ... },
  "notifications": {
    "emails": true,
    "reminders": true,
    "push": false,
    "emailTime": "18:50",
    "quietHours": {
      "enabled": true,
      "start": "00:06",
      "end": "08:00"
    }
  },
  "security": { ... }
}
```

#### 2. LocalStorage (Cache navigateur)
Clé : `settings_${userId}`

**Fonctionnement** :
- Sauvegarde immédiate dans localStorage (optimistic update)
- Sauvegarde asynchrone dans Supabase via `settingsService.saveSettings()`
- Si Supabase échoue, les données restent dans localStorage

### Flux de sauvegarde

```
1. Utilisateur change une préférence
   ↓
2. NotificationsSection appelle onUpdate()
   ↓
3. useSettings fait un optimistic update (state local)
   ↓
4. settingsService.updateNotifications() est appelé
   ↓
5. Les données sont mergées avec les préférences existantes
   ↓
6. Sauvegarde dans localStorage (immédiat)
   ↓
7. Sauvegarde dans Supabase (asynchrone)
   ↓
8. Si erreur Supabase → rollback du state local
```

---

## 🔗 Connexion avec le système de notifications

### État actuel (Janvier 2025)

#### ✅ Ce qui fonctionne

1. **Interface complète** : Tous les toggles et champs fonctionnent
2. **Sauvegarde persistante** : Les préférences sont sauvegardées en BDD et localStorage
3. **Optimistic updates** : L'UI répond instantanément aux changements
4. **Rollback automatique** : En cas d'erreur, l'état précédent est restauré

#### ❌ Ce qui ne fonctionne pas encore

1. **Respect de emailTime** : Le système d'automations (`automation-scheduler`) utilise `user_local_time` dans la table `automations`, mais ne lit pas `emailTime` depuis `user_settings`

2. **Respect des heures calmes** : Les notifications ne vérifient pas les `quietHours` avant d'être envoyées

3. **Filtrage par type** : Les toggles `emails`, `reminders`, `push` sont sauvegardés mais non utilisés pour filtrer les notifications

4. **Notifications push** : Non implémentées (pas de service worker, pas de tokens push)

### Comment les automations fonctionnent actuellement

**Fichier** : `supabase/functions/automation-scheduler/index.ts`

Le scheduler vérifie l'heure d'exécution via :
1. **`next_execution_at`** : Timestamp UTC calculé à la dernière exécution
2. **`user_local_time`** : Heure locale (format "HH:mm") stockée dans la table `automations`
3. **`user_timezone`** : Fuseau horaire IANA (ex: "Europe/Paris")

**Problème** : Le scheduler ne lit jamais `user_settings.settings.notifications.emailTime`

---

## 🔧 Comment connecter les préférences

Pour que les préférences de notifications soient respectées, voici ce qu'il faut faire :

### 1. Synchroniser `emailTime` avec `user_local_time`

**Option A : Lors de la sauvegarde des préférences**

Modifier `settingsService.updateNotifications()` pour mettre à jour automatiquement les automations :

```typescript
// Dans src/services/settings/settingsService.ts

async updateNotifications(userId: string, updates: NotificationUpdate): Promise<void> {
  try {
    const currentSettings = await this.getSettings(userId);

    const updatedSettings: SettingsState = {
      ...currentSettings,
      notifications: {
        ...currentSettings.notifications,
        ...updates
      }
    };

    await this.saveSettings(userId, updatedSettings);

    // ✅ NOUVEAU : Si emailTime a changé, mettre à jour les automations
    if (updates.emailTime) {
      await this.updateAutomationsTimes(userId, updates.emailTime);
    }
  } catch (error) {
    console.error('Error updating notifications:', error);
    throw new Error('Impossible de mettre à jour les notifications');
  }
}

private async updateAutomationsTimes(userId: string, emailTime: string): Promise<void> {
  try {
    // Mettre à jour toutes les automations de type "daily" pour cet utilisateur
    const { error } = await supabase
      .from('automations')
      .update({ user_local_time: emailTime })
      .eq('user_id', userId)
      .in('name', ['daily_quote', 'study-reminder', 'daily-review']);

    if (error) {
      console.error('Error updating automations times:', error);
    } else {
      console.log(`✅ Updated automations times to ${emailTime} for user ${userId}`);
    }
  } catch (error) {
    console.error('Error updating automations times:', error);
  }
}
```

**Option B : Dans le scheduler**

Lire les préférences depuis `user_settings` au moment de l'exécution :

```typescript
// Dans supabase/functions/automation-scheduler/index.ts

// Avant de traiter les automations
const { data: userSettings } = await supabase
  .from('user_settings')
  .select('settings')
  .eq('user_id', automation.user_id)
  .single();

const emailTime = userSettings?.settings?.notifications?.emailTime;

// Remplacer user_local_time par emailTime si disponible
if (emailTime) {
  automation.user_local_time = emailTime;
}
```

### 2. Respecter les heures calmes

**Dans** : `supabase/functions/automation-scheduler/index.ts` ou `automation-micro-runner/index.ts`

Avant de créer une notification :

```typescript
async function shouldSendNotification(userId: string, now: Date): Promise<boolean> {
  // Charger les préférences
  const { data: userSettings } = await supabase
    .from('user_settings')
    .select('settings')
    .eq('user_id', userId)
    .single();

  const quietHours = userSettings?.settings?.notifications?.quietHours;

  if (!quietHours?.enabled) {
    return true; // Pas d'heures calmes, envoyer
  }

  // Obtenir l'heure locale de l'utilisateur
  const timezone = userSettings?.settings?.notifications?.timezone || 'Europe/Paris';
  const localTimeFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  const currentLocalTime = localTimeFormatter.format(now);
  const [currentHour, currentMinute] = currentLocalTime.split(':').map(Number);
  const currentMinutes = currentHour * 60 + currentMinute;

  const [startHour, startMinute] = quietHours.start.split(':').map(Number);
  const [endHour, endMinute] = quietHours.end.split(':').map(Number);
  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;

  // Vérifier si on est dans les heures calmes
  if (startMinutes <= endMinutes) {
    // Plage normale (ex: 22:00 → 08:00)
    return currentMinutes < startMinutes || currentMinutes >= endMinutes;
  } else {
    // Plage qui traverse minuit (ex: 22:00 → 02:00)
    return currentMinutes >= endMinutes && currentMinutes < startMinutes;
  }
}

// Avant de créer la notification
if (await shouldSendNotification(userId, new Date())) {
  await supabase.from('notifications').insert({
    user_id: userId,
    title: '...',
    message: '...',
    // ...
  });
}
```

### 3. Filtrer par type de notification

Ajouter un champ `channel` aux notifications :

```sql
ALTER TABLE notifications ADD COLUMN channel TEXT DEFAULT 'in_app';
-- Valeurs possibles: 'in_app', 'email', 'push'
```

Puis vérifier les préférences :

```typescript
const shouldSendEmail = userSettings?.settings?.notifications?.emails;
const shouldSendPush = userSettings?.settings?.notifications?.push;

// Créer notification in-app (toujours)
await createNotification({ channel: 'in_app', ... });

// Email si activé
if (shouldSendEmail) {
  await createNotification({ channel: 'email', ... });
}

// Push si activé
if (shouldSendPush) {
  await createNotification({ channel: 'push', ... });
}
```

---

## 📊 Résumé de l'état actuel

| Fonctionnalité | État UI | État Backend | Priorité |
|---------------|---------|--------------|----------|
| Toggle emails | ✅ Fonctionne | ❌ Non utilisé | 🔴 Haute |
| Heure d'envoi emails | ✅ Fonctionne | ❌ Non synchronisé avec automations | 🔴 Haute |
| Toggle rappels | ✅ Fonctionne | ❌ Non utilisé | 🟠 Moyenne |
| Toggle push | ✅ Fonctionne | ❌ Non implémenté | 🟢 Basse |
| Heures calmes (toggle) | ✅ Fonctionne | ❌ Non vérifiées | 🔴 Haute |
| Heures calmes (début) | ✅ Modifiable | ❌ Non vérifiées | 🔴 Haute |
| Heures calmes (fin) | ✅ Modifiable | ❌ Non vérifiées | 🔴 Haute |

---

## 🎯 Prochaines étapes recommandées

### Court terme (1-2 jours)
1. ✅ **Synchroniser emailTime avec automations**
   - Modifier `settingsService.updateNotifications()` pour mettre à jour les automations
   - Ou lire `user_settings` dans le scheduler

2. ✅ **Respecter les heures calmes**
   - Ajouter une fonction `shouldSendNotification()` dans le micro-runner
   - Vérifier les heures calmes avant d'envoyer une notification

### Moyen terme (1 semaine)
3. ✅ **Créer la table user_settings**
   - Migration SQL pour créer la table si elle n'existe pas
   - Policies RLS pour sécuriser l'accès

4. ✅ **Ajouter un champ channel aux notifications**
   - Distinguer in-app, email, push
   - Filtrer selon les préférences

### Long terme (1 mois)
5. ✅ **Implémenter les notifications push**
   - Service Worker pour les notifications web
   - Intégration avec FCM/APNs pour mobile

6. ✅ **Ajouter des statistiques**
   - Nombre de notifications envoyées par jour
   - Taux d'ouverture
   - Respect des heures calmes

---

## 🐛 Bugs connus

### 1. emailTime non synchronisé
**Symptôme** : Changer l'heure d'envoi dans les paramètres ne change pas l'heure d'exécution des automations.

**Cause** : `automation-scheduler` lit `user_local_time` depuis la table `automations`, mais ne lit pas `emailTime` depuis `user_settings`.

**Solution** : Voir section "Comment connecter les préférences" ci-dessus.

### 2. Heures calmes non respectées
**Symptôme** : Les notifications sont envoyées même pendant les heures calmes.

**Cause** : Aucune vérification des heures calmes dans `automation-micro-runner`.

**Solution** : Ajouter la fonction `shouldSendNotification()` avant de créer une notification.

### 3. Table user_settings peut ne pas exister
**Symptôme** : Erreur lors de la sauvegarde des préférences si la table n'existe pas.

**Cause** : Aucune migration ne crée la table `user_settings`.

**Solution** : Créer une migration SQL.

---

## 📚 Fichiers concernés

### Frontend
- `src/components/settings/sections/NotificationsSection.tsx` - Interface utilisateur
- `src/types/settings.types.ts` - Types TypeScript
- `src/hooks/settings/useSettings.ts` - Hook de gestion d'état
- `src/services/settings/settingsService.ts` - Service de sauvegarde

### Backend
- `supabase/functions/automation-scheduler/index.ts` - Scheduler principal
- `supabase/functions/automation-micro-runner/index.ts` - Exécuteur de micro-templates
- `supabase/migrations/20251110_automation_edge.sql` - Migration des tables

### Base de données
- Table `user_settings` - Stockage des préférences (à créer)
- Table `automations` - Automations avec `user_local_time`
- Table `notifications` - Notifications in-app

---

**Dernière mise à jour** : 25 novembre 2025
**Auteur** : Équipe Centrinote

# 🏗️ Architecture : automation-scheduler vs automation-email

## 📋 Vue d'Ensemble

Ces deux Edge Functions ont des rôles **complémentaires mais distincts** dans le système d'automatisation :

| Edge Function | Rôle | Déclenchement | Responsabilité |
|---------------|------|---------------|----------------|
| **`automation-scheduler`** | 🕐 **Planificateur** | Cron (toutes les minutes) | Vérifie les horaires et déclenche les automations |
| **`automation-email`** | 📧 **Envoi d'emails** | Appelé par d'autres fonctions | Envoie les emails via SMTP avec déduplication |

---

## 🔄 Flux Complet d'Exécution

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. CRON JOB (Supabase)                                          │
│    Déclenche toutes les minutes                                 │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. automation-scheduler                                         │
│    ┌──────────────────────────────────────────────────────┐    │
│    │ • Vérifie toutes les automations actives              │    │
│    │ • Vérifie next_execution_at et user_local_time        │    │
│    │ • Acquiert un verrou pour éviter les doublons         │    │
│    │ • Vérifie si c'est l'heure d'exécuter (fenêtre 30s)  │    │
│    │ • Met à jour next_execution_at pour la prochaine fois │    │
│    └────────────────────┬─────────────────────────────────┘    │
└─────────────────────────┼───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. automation-micro-runner                                      │
│    ┌──────────────────────────────────────────────────────┐    │
│    │ • Exécute la logique métier de l'automation           │    │
│    │ • Exemple: daily_quote, weekly-summary, etc.          │    │
│    │ • Génère le contenu de l'email                        │    │
│    │ • Prépare les données (sujet, corps HTML, destinataire)│   │
│    └────────────────────┬─────────────────────────────────┘    │
└─────────────────────────┼───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. automation-email                                             │
│    ┌──────────────────────────────────────────────────────┐    │
│    │ • Vérifie les doublons (check_and_log_email_send)     │    │
│    │ • Enregistre l'envoi dans email_sent_log             │    │
│    │ • Envoie l'email via SMTP (IONOS)                    │    │
│    │ • Retourne le statut (succès/échec/doublon)          │    │
│    └──────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🕐 automation-scheduler : Le Planificateur

### Rôle Principal
**Détermine QUAND exécuter les automations** et les déclenche au bon moment.

### Fonctionnalités

1. **Vérification des horaires**
   - Lit `next_execution_at` de chaque automation
   - Compare avec l'heure actuelle
   - Utilise une fenêtre de 30 secondes pour éviter les déclenchements multiples

2. **Gestion des verrous**
   - Acquiert un verrou atomique avant de vérifier
   - Empêche les exécutions simultanées par plusieurs instances

3. **Mise à jour de `next_execution_at`**
   - Calcule la prochaine exécution
   - Met à jour immédiatement pour éviter les doublons

4. **Déclenchement**
   - Appelle `automation-micro-runner` pour exécuter l'automation

### Code Clé

```typescript
// automation-scheduler/index.ts

// 1. Vérifie si c'est l'heure
const shouldExecute = await checkExecutionTimeStrict(automation, now);

// 2. Met à jour next_execution_at
await supabase.from('automations').update({ 
    next_execution_at: nextExecutionAfter.toISOString() 
});

// 3. Déclenche l'automation
await supabase.functions.invoke('automation-micro-runner', {
    body: { automation_id: automation.id }
});
```

### Déclenchement
- **Cron job Supabase** : Toutes les minutes
- **Manuel** : Possible via l'API

### Ne fait PAS
- ❌ N'envoie pas d'emails directement
- ❌ Ne génère pas le contenu des emails
- ❌ Ne gère pas la déduplication des emails

---

## 📧 automation-email : L'Envoi d'Emails

### Rôle Principal
**Envoie les emails via SMTP** avec protection contre les doublons.

### Fonctionnalités

1. **Déduplication**
   - Vérifie si un email identique a été envoyé récemment (5 minutes)
   - Utilise `check_and_log_email_send` (RPC PostgreSQL)
   - Enregistre dans `email_sent_log`

2. **Envoi SMTP**
   - Connexion à IONOS SMTP
   - Envoi de l'email (HTML et/ou texte)
   - Gestion des erreurs

3. **Logging**
   - Logs détaillés pour le debugging
   - Indique si l'email a été envoyé ou bloqué (doublon)

### Code Clé

```typescript
// automation-email/index.ts

// 1. Vérifie les doublons
const { data: canSend } = await supabase.rpc('check_and_log_email_send', {
    p_email_to: to,
    p_email_subject: subject,
    p_dedupe_window_minutes: 5
});

if (canSend === false) {
    return { ok: true, skipped: true, reason: 'Duplicate' };
}

// 2. Envoie l'email via SMTP
const conn = await Deno.connectTls({ hostname: host, port });
// ... envoi SMTP ...
```

### Déclenchement
- **Appelé par** : `automation-micro-runner`, `automation-runner`, `notify-support`, etc.
- **Pas de cron** : Fonction utilitaire, pas un scheduler

### Ne fait PAS
- ❌ Ne vérifie pas les horaires
- ❌ Ne décide pas quand envoyer
- ❌ Ne génère pas le contenu des emails

---

## 🔍 Différences Clés

| Aspect | automation-scheduler | automation-email |
|--------|----------------------|------------------|
| **Type** | Scheduler/Planificateur | Service utilitaire |
| **Déclenchement** | Cron (toutes les minutes) | Appelé par d'autres fonctions |
| **Responsabilité** | QUAND exécuter | COMMENT envoyer |
| **Base de données** | Lit `automations.next_execution_at` | Lit/écrit `email_sent_log` |
| **Verrous** | Verrous d'automation | Déduplication d'emails |
| **Appels externes** | Appelle `automation-micro-runner` | Appelle SMTP IONOS |
| **Logs** | Logs de planification | Logs d'envoi d'emails |

---

## 📊 Exemple Concret : daily_quote

### Scénario : Automation "Citation du jour" programmée pour 10h00

#### 10h00:00 - automation-scheduler s'exécute

```typescript
// automation-scheduler
1. ✅ Verrou acquis pour daily_quote
2. ✅ Vérifie next_execution_at = 2025-12-06T10:00:00Z
3. ✅ Différence = 0 secondes (dans la fenêtre de 30s)
4. ✅ Met à jour next_execution_at = 2025-12-07T10:00:00Z
5. ✅ Appelle automation-micro-runner
```

#### 10h00:01 - automation-micro-runner s'exécute

```typescript
// automation-micro-runner
1. ✅ Récupère la citation du jour
2. ✅ Génère le contenu HTML de l'email
3. ✅ Prépare les données :
   {
     to: "user@example.com",
     subject: "💭 Citation du jour",
     html: "<h1>Citation...</h1>"
   }
4. ✅ Appelle automation-email
```

#### 10h00:02 - automation-email s'exécute

```typescript
// automation-email
1. ✅ Vérifie check_and_log_email_send()
   - Aucun email identique dans les 5 dernières minutes
   - Enregistre dans email_sent_log
2. ✅ Envoie l'email via SMTP IONOS
3. ✅ Retourne { ok: true }
```

#### 10h00:15 - automation-scheduler s'exécute à nouveau

```typescript
// automation-scheduler
1. ✅ Verrou acquis pour daily_quote
2. ✅ Vérifie next_execution_at = 2025-12-07T10:00:00Z
3. ❌ Différence = -24 heures (trop tôt)
4. ⏭️ Skip (pas encore l'heure)
```

#### 10h00:30 - automation-email appelé par erreur (doublon)

```typescript
// automation-email
1. ✅ Vérifie check_and_log_email_send()
   - Email identique trouvé dans email_sent_log (envoyé à 10h00:02)
   - Retourne canSend = false
2. 🚫 Bloque l'envoi
3. ✅ Retourne { ok: true, skipped: true, reason: 'Duplicate' }
```

---

## 🎯 Pourquoi Deux Fonctions Séparées ?

### 1. **Séparation des Responsabilités**
- `automation-scheduler` : Gère le timing
- `automation-email` : Gère l'envoi

### 2. **Réutilisabilité**
- `automation-email` peut être appelé par plusieurs fonctions :
  - `automation-micro-runner`
  - `automation-runner`
  - `notify-support`
  - `send-user-emails`

### 3. **Déduplication Centralisée**
- Tous les emails passent par `automation-email`
- Protection unique contre les doublons
- Logs centralisés dans `email_sent_log`

### 4. **Maintenance**
- Modifications de l'envoi SMTP → seulement `automation-email`
- Modifications de la planification → seulement `automation-scheduler`

---

## 🔧 Cas d'Usage

### Cas 1 : Email programmé (daily_quote)
```
automation-scheduler → automation-micro-runner → automation-email
```

### Cas 2 : Email immédiat (notification)
```
Application → automation-runner → automation-email
```

### Cas 3 : Email de support
```
Application → notify-support → automation-email
```

---

## 📝 Résumé

- **`automation-scheduler`** = 🕐 **"QUAND"** exécuter les automations
- **`automation-email`** = 📧 **"COMMENT"** envoyer les emails

Ils travaillent ensemble mais ont des responsabilités distinctes :
- Le scheduler décide du timing
- L'email service envoie avec protection contre les doublons


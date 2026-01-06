# 🚀 PLAN DE MIGRATION & NETTOYAGE DES FUNCTIONS

Date: 2026-01-03
Projet: Centrinote - Migration Netlify → Supabase Edge Functions

---

## 📋 RÉSUMÉ EXÉCUTIF

- **40 Netlify Functions** identifiées
- **36+ Supabase Edge Functions** déjà déployées
- **3 doublons critiques** à résoudre
- **17 fonctions Netlify à supprimer** (deprecated/test/doublons)
- **20 fonctions Netlify à migrer** vers Supabase
- **4 fonctions manquantes** à créer

---

## 🗑️ PHASE 1 : SUPPRESSION (17 fichiers)

### 1.1 DOUBLONS CONFIRMÉS (Supabase déjà active) ✅

**À supprimer immédiatement :**

```bash
# Ces fonctions existent déjà sur Supabase ET sont utilisées via supabase.functions.invoke()
rm netlify/functions/ai-chat.ts           # ✅ Supabase active (5 appels)
rm netlify/functions/improve-content.ts   # ✅ Supabase active (4 appels)
```

**⚠️ NE PAS supprimer encore :**
```bash
# netlify/functions/transcribe-audio.ts
# → Version Netlify encore appelée dans useRecordingPolling.ts:98
# → Migrer d'abord (voir PHASE 2)
```

---

### 1.2 VERSIONS DEPRECATED (Anciennes versions) 🗂️

**À supprimer :**

```bash
# Anciennes versions de create-meeting (v3 est la version active)
rm netlify/functions/create-meeting.js         # v1 deprecated
rm netlify/functions/create-meeting-simple.js  # Version simplifiée deprecated
rm netlify/functions/create-meeting-v2.js      # v2 legacy (seulement utilisée en debug)
```

**⚠️ GARDER pour l'instant :**
```bash
# netlify/functions/create-meeting-v3.js
# → Version ACTIVE (2 appels en production)
# → À migrer vers Supabase plus tard (PHASE 3)
```

---

### 1.3 FONCTIONS DE TEST/DEBUG 🧪

**À supprimer (ou déplacer dans un dossier /test si besoin en dev) :**

```bash
rm netlify/functions/test-daily.js          # Tests Daily.co
rm netlify/functions/test-daily-simple.js   # Tests Daily.co simplifiés
rm netlify/functions/test-smtp.js           # Tests email
rm netlify/functions/test-webhooks.js       # Tests webhooks
rm netlify/functions/debug-meeting.js       # Debug meetings
```

---

### 1.4 DOUBLONS HEALTHCHECK 🏥

**Garder UN SEUL healthcheck, supprimer les autres :**

```bash
# Option 1 : Garder health.ts (TypeScript)
rm netlify/functions/health.js
rm netlify/functions/healthz.ts

# OU Option 2 : Garder healthz.ts (convention k8s)
rm netlify/functions/health.js
rm netlify/functions/health.ts
```

---

### 1.5 SCRIPTS DE SETUP (One-time use) ⚙️

**À supprimer (scripts d'installation, pas des endpoints) :**

```bash
rm netlify/functions/setup-daily-webhook.js      # Setup initial Daily.co
rm netlify/functions/setup-recording-webhook.js  # Setup recording webhook
```

---

### 1.6 FONCTIONS NON UTILISÉES 💤

**À supprimer (aucune référence trouvée dans le code) :**

```bash
rm netlify/functions/generate-summary.js       # Non référencée
rm netlify/functions/generate-summary-auto.js  # Non référencée
rm netlify/functions/reports.js                # Non référencée
rm netlify/functions/summaries-crud.js         # Non référencée
rm netlify/functions/embed-all-notes.ts        # Non référencée
rm netlify/functions/embed-notes.ts            # Non référencée
rm netlify/functions/generate-key.js           # Possiblement remplacée par Supabase
```

---

## 🔄 PHASE 2 : MIGRATIONS PRIORITAIRES (4 fonctions)

### 2.1 DOUBLON TRANSCRIBE-AUDIO (URGENT) 🎯

**Problème :** Fonction existe sur Supabase mais version Netlify encore utilisée

**Actions :**

1. **Modifier le code appelant :**
   ```typescript
   // Fichier : src/hooks/useRecordingPolling.ts:98

   // ❌ AVANT (Netlify)
   const transcribeResponse = await fetch('/.netlify/functions/transcribe-audio', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ audioUrl: recordingUrl })
   });

   // ✅ APRÈS (Supabase)
   const { data, error } = await supabase.functions.invoke('transcribe-audio', {
     body: { audioUrl: recordingUrl }
   });
   ```

2. **Tester la version Supabase**

3. **Supprimer la version Netlify :**
   ```bash
   rm netlify/functions/transcribe-audio.ts
   ```

---

### 2.2 AUTOMATISATIONS (2 fonctions)

**Fonctions à migrer :**

```bash
# Ces fonctions sont sur Netlify mais équivalents existent sur Supabase
automation-get.ts      → Migrer vers Supabase (ou utiliser automation-access ?)
automation-upsert.ts   → Migrer vers Supabase
```

**Code à modifier :**
- `src/hooks/useAutomations.ts:29` (automation-get)
- `src/hooks/useAutomations.ts:62` (automation-upsert)

**Actions :**

1. **Vérifier si équivalent Supabase existe** (automation-access ?)
2. **Créer nouvelles Edge Functions si nécessaire**
3. **Modifier les appels :**
   ```typescript
   // AVANT
   fetch('/.netlify/functions/automation-get', {...})

   // APRÈS
   supabase.functions.invoke('automation-get', {...})
   ```

---

### 2.3 AI ENRICHISSEMENT

**Fonction à migrer :**

```bash
ask-enriched.ts  # 4 appels dans src/services/ai-enrich.ts
```

**Code à modifier :**
- `src/services/ai-enrich.ts:73, 74, 138, 139`

**Actions :**

1. **Créer Edge Function Supabase `ask-enriched`**
2. **Modifier ai-enrich.ts :**
   ```typescript
   // AVANT
   const url = isDevelopment
     ? 'http://localhost:8888/.netlify/functions/ask-enriched'
     : '/.netlify/functions/ask-enriched';
   const response = await fetch(url, {...});

   // APRÈS
   const { data, error } = await supabase.functions.invoke('ask-enriched', {...});
   ```

---

## 🏗️ PHASE 3 : MIGRATIONS MEETING (8 fonctions)

**Fonctions à migrer progressivement :**

| Fonction Netlify | Fichier | Appelée depuis | Priorité |
|------------------|---------|----------------|----------|
| `create-meeting-v3.js` | ✅ | `useMeetings.tsx:180`, `MeetingList.tsx:266` | 🔴 Haute |
| `delete-meeting.js` | ✅ | `useMeetings.tsx:279`, `DailyTestPanel.tsx:205` | 🔴 Haute |
| `end-meeting.js` | ✅ | `MeetingRoom.tsx:385` | 🔴 Haute |
| `get-recording-url.ts` | ✅ | `useRecordingPolling.ts:59` | 🟡 Moyenne |
| `update-meeting-recording.js` | ✅ | `useDaily.ts:613` | 🟡 Moyenne |
| `send-invites-batch.js` | ✅ | `MeetingList.tsx:482` | 🟡 Moyenne |
| `send-summary-email.js` | ✅ | `MeetingSummary.tsx:178` | 🟡 Moyenne |

**Plan de migration :**

1. **Créer Edge Functions Supabase** pour chaque fonction
2. **Migrer les secrets** (DAILY_API_KEY, etc.) vers Supabase Secrets
3. **Modifier les appels** pour utiliser `supabase.functions.invoke()`
4. **Tester chaque migration**
5. **Supprimer les versions Netlify**

---

## 🌐 PHASE 4 : MIGRATIONS WEBHOOKS (4 fonctions)

**Fonctions à évaluer :**

| Fonction | Type | Action recommandée |
|----------|------|-------------------|
| `webhook-proxy.js` | ✅ Active | Migrer vers Supabase |
| `n8n-proxy.ts` | ✅ Active | Migrer vers Supabase |
| `daily-webhook-proxy.js` | 🟡 Externe | Vérifier si appelée par Daily.co, migrer si nécessaire |
| `daily-webhook-recording.js` | 🟡 Externe | Vérifier si appelée par Daily.co, migrer si nécessaire |

**⚠️ Attention :** Les webhooks externes (Daily.co, n8n, Stripe) nécessitent de mettre à jour les URLs côté service externe.

---

## 👤 PHASE 5 : MIGRATIONS ADMIN/AUTH (2 fonctions)

**Fonctions à migrer :**

```bash
admin.ts    # Appelée depuis adminClient.ts:29, 174
auth-me.ts  # Appelée depuis apiClient.ts:160
```

**Actions :**

1. **Créer Edge Functions Supabase**
2. **Migrer vers Supabase Auth** si possible
3. **Modifier les clients** pour utiliser Supabase

---

## ⏰ PHASE 6 : MIGRATION CRON JOB (1 fonction)

**Fonction planifiée Netlify :**

```toml
# netlify.toml
[functions."check-meetings-duration"]
  schedule = "*/5 * * * *"  # Toutes les 5 minutes
```

**Migration vers Supabase pg_cron :**

1. **Créer Edge Function `check-meetings-duration`**
2. **Configurer pg_cron dans Supabase :**
   ```sql
   SELECT cron.schedule(
     'check-meetings-duration',
     '*/5 * * * *',
     $$
     SELECT net.http_post(
       url := 'https://[project].supabase.co/functions/v1/check-meetings-duration',
       headers := '{"Authorization": "Bearer [anon-key]"}'::jsonb
     );
     $$
   );
   ```

---

## ✨ PHASE 7 : CRÉER FONCTIONS MANQUANTES (4 fonctions)

**Fonctions appelées mais non trouvées :**

| Fonction | Appelée depuis | Ligne | Action |
|----------|----------------|-------|--------|
| `get-meeting` | `MeetingRoom.tsx` | 329 | Créer sur Supabase |
| `share-summary` | `MeetingSummaryTab.tsx` | 48 | Créer sur Supabase |
| `suggest-improvements` | `MeetingSummaryTab.tsx` | 84 | Créer sur Supabase |
| `send-email` | `email.ts` | 63 | Créer sur Supabase |

**Plan :**

1. **Créer ces 4 Edge Functions sur Supabase**
2. **Implémenter la logique métier**
3. **Tester les appels existants**

---

## 📊 RÉCAPITULATIF PAR PHASE

| Phase | Description | Fichiers | Complexité | Durée estimée |
|-------|-------------|----------|------------|---------------|
| **Phase 1** | Suppression | 17 fichiers | 🟢 Faible | 30 min |
| **Phase 2** | Migrations prioritaires | 4 fonctions | 🟡 Moyenne | 2-3h |
| **Phase 3** | Migrations Meetings | 8 fonctions | 🔴 Haute | 1-2 jours |
| **Phase 4** | Migrations Webhooks | 4 fonctions | 🔴 Haute | 1 jour |
| **Phase 5** | Migrations Admin/Auth | 2 fonctions | 🟡 Moyenne | 4h |
| **Phase 6** | Migration Cron Job | 1 fonction | 🟡 Moyenne | 2h |
| **Phase 7** | Créer manquantes | 4 fonctions | 🟡 Moyenne | 1 jour |

**TOTAL** : ~5-6 jours de travail

---

## ✅ CHECKLIST DE MIGRATION

### Avant de supprimer une fonction Netlify :
- [ ] Vérifier qu'aucun appel `/.netlify/functions/[nom]` dans le code
- [ ] Vérifier que la version Supabase fonctionne
- [ ] Tester en production

### Avant de migrer une fonction :
- [ ] Créer l'Edge Function Supabase
- [ ] Migrer les secrets/env vars
- [ ] Modifier le code appelant
- [ ] Tester localement avec `supabase functions serve`
- [ ] Déployer : `supabase functions deploy [nom]`
- [ ] Tester en production
- [ ] Supprimer la version Netlify

### Pour les webhooks externes :
- [ ] Mettre à jour l'URL côté service externe (Daily.co, n8n, Stripe)
- [ ] Tester avec un webhook de test
- [ ] Vérifier les logs

---

## 🚨 RISQUES & PRÉCAUTIONS

### Risques identifiés :

1. **Webhooks externes** : URLs à changer côté Daily.co, n8n, Stripe
2. **Secrets** : Bien migrer toutes les variables d'environnement
3. **CORS** : Supabase Edge Functions ont des headers CORS différents
4. **Timeouts** : Supabase = 30s max (vs Netlify configurable)
5. **Déploiements** : Tester chaque migration individuellement

### Précautions :

- ✅ **Toujours tester en dev** avec `supabase functions serve`
- ✅ **Déployer progressivement** (une fonction à la fois)
- ✅ **Garder les backups** (ne pas supprimer immédiatement après migration)
- ✅ **Monitorer les logs** Supabase après chaque déploiement
- ✅ **Rollback plan** : Garder les versions Netlify 48h après migration

---

## 📝 COMMANDES UTILES

### Supabase :
```bash
# Lister les fonctions déployées
supabase functions list

# Déployer une fonction
supabase functions deploy [nom]

# Tester localement
supabase functions serve [nom]

# Voir les logs
supabase functions logs [nom]

# Supprimer une fonction
supabase functions delete [nom]
```

### Netlify :
```bash
# Lister les fonctions déployées
netlify functions:list

# Voir les logs
netlify functions:log [nom]
```

---

## 🎯 ORDRE D'EXÉCUTION RECOMMANDÉ

1. **JOUR 1** : Phase 1 (Suppression) + Phase 2.1 (transcribe-audio)
2. **JOUR 2** : Phase 2.2-2.3 (Automatisations + AI)
3. **JOUR 3-4** : Phase 3 (Meetings)
4. **JOUR 5** : Phase 4 (Webhooks) + Phase 5 (Admin/Auth)
5. **JOUR 6** : Phase 6 (Cron) + Phase 7 (Créer manquantes)
6. **JOUR 7** : Tests finaux + Cleanup + Documentation

---

## ❓ QUESTIONS À RÉSOUDRE

1. **Healthcheck** : Garder `health.ts` ou `healthz.ts` ?
2. **automation-get/upsert** : Équivalent `automation-access` existe sur Supabase ?
3. **Webhooks Daily.co** : URLs à mettre à jour où ? (Dashboard Daily.co)
4. **Cron Job** : Utiliser pg_cron ou autre solution ?

---

**Date de création** : 2026-01-03
**Dernière mise à jour** : 2026-01-03
**Status** : 📋 Plan prêt - En attente d'exécution

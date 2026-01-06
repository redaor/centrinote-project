# 🔍 INVENTAIRE COMPLET DES NETLIFY FUNCTIONS

**Date**: 2026-01-04
**Scan complet**: Code source + netlify.toml + fichiers existants

---

## 📊 RÉSUMÉ EXÉCUTIF

| Statut | Nombre | Description |
|--------|--------|-------------|
| ✅ **ACTIVES** | **18** | Appelées dans le code source (src/) |
| 🟡 **À VÉRIFIER** | **7** | Appelées indirectement (webhooks, cron, edge functions) |
| ❌ **OBSOLÈTES** | **15** | Non référencées, tests, ou deprecated |
| 👻 **FANTÔMES** | **5** | Appelées mais fichier n'existe PAS |
| **TOTAL FICHIERS** | **40** | Fonctions dans netlify/functions/ |

---

## ✅ FONCTIONS ACTIVES (18 fonctions)

### **Appelées directement depuis src/ en PRODUCTION**

| # | Fonction | Fichier Existe | Appelée depuis | Ligne | Statut |
|---|----------|----------------|----------------|-------|--------|
| 1 | `create-meeting-v3` | ✅ .js | `useMeetings.tsx`<br/>`MeetingList.tsx` | 180<br/>266 | ✅ **ACTIVE PRODUCTION** |
| 2 | `delete-meeting` | ✅ .js | `useMeetings.tsx`<br/>`DailyTestPanel.tsx` | 279<br/>205 | ✅ **ACTIVE PRODUCTION** |
| 3 | `end-meeting` | ✅ .js | `MeetingRoom.tsx` | 385 | ✅ **ACTIVE PRODUCTION** |
| 4 | `update-meeting-recording` | ✅ .js | `useDaily.ts` | 613 | ✅ **ACTIVE PRODUCTION** |
| 5 | `send-invites-batch` | ✅ .js | `MeetingList.tsx` | 482 | ✅ **ACTIVE PRODUCTION** |
| 6 | `send-summary-email` | ✅ .js | `MeetingSummary.tsx` | 178 | ✅ **ACTIVE PRODUCTION** |
| 7 | `get-recording-url` | ✅ .ts | `useRecordingPolling.ts` | 59 | ✅ **ACTIVE PRODUCTION** |
| 8 | `transcribe-audio` | ✅ .ts | `useRecordingPolling.ts` | 98 | ✅ **ACTIVE** ⚠️ Doublon Supabase |
| 9 | `webhook-proxy` | ✅ .js | `webhookRouter.ts` | 169 | ✅ **ACTIVE PRODUCTION** |
| 10 | `n8n-proxy` | ✅ .ts | `webhookService.ts`<br/>`AIDebugPanel.tsx` | 17<br/>17 | ✅ **ACTIVE PRODUCTION** |
| 11 | `automation-get` | ✅ .ts | `useAutomations.ts` | 29 | ✅ **ACTIVE PRODUCTION** |
| 12 | `automation-upsert` | ✅ .ts | `useAutomations.ts` | 62 | ✅ **ACTIVE PRODUCTION** |
| 13 | `ask-enriched` | ✅ .ts | `ai-enrich.ts` | 73, 74, 138, 139 | ✅ **ACTIVE PRODUCTION** |
| 14 | `admin` | ✅ .ts | `adminClient.ts` | 29, 174 | ✅ **ACTIVE PRODUCTION** |
| 15 | `auth-me` | ✅ .ts | `apiClient.ts` | 160 (commentaire) | 🟡 **Probablement active** |
| 16 | `create-meeting-v2` | ✅ .js | `DailyTestPanel.tsx` | 112 | 🟡 **DEBUG ONLY** |
| 17 | `ai-chat` | ✅ .ts | - | - | ❌ **DOUBLON** (Supabase utilisée) |
| 18 | `improve-content` | ✅ .ts | - | - | ❌ **DOUBLON** (Supabase utilisée) |

---

## 🟡 FONCTIONS À VÉRIFIER (7 fonctions)

### **Appelées indirectement (webhooks externes, cron, edge functions)**

| # | Fonction | Fichier Existe | Type | Appelée depuis | Vérification nécessaire |
|---|----------|----------------|------|----------------|-------------------------|
| 19 | `check-meetings-duration` | ✅ .js | **CRON JOB** | `netlify.toml:113` (*/5 min) | ✅ Active via cron planifié |
| 20 | `generate-summary-auto` | ✅ .js | Webhook | `daily-recording-ready.ts:213` | 🟡 Appelée par Edge Function |
| 21 | `generate-summary` | ✅ .js | Webhook | `daily-webhook-recording.js:190`<br/>`check-meetings-duration.js:156` | 🟡 Appelée par webhooks internes |
| 22 | `daily-webhook-proxy` | ✅ .js | **WEBHOOK EXTERNE** | `setup-daily-webhook.js:41` | 🟡 URL configurée sur Daily.co Dashboard |
| 23 | `daily-webhook-recording` | ✅ .js | **WEBHOOK EXTERNE** | `setup-recording-webhook.js:32` | 🟡 URL configurée sur Daily.co Dashboard |
| 24 | `embed-all-notes` | ✅ .ts | Référence log | `ai-chat.ts:192` (log uniquement) | 🟡 Fonction batch manuelle |
| 25 | `summaries-crud` | ✅ .js | API REST | Commentaire ligne 34 | 🟡 Endpoint REST (non appelé directement) |

**⚠️ ACTION REQUISE** :
- Vérifier Daily.co Dashboard pour confirmer que `daily-webhook-proxy` et `daily-webhook-recording` sont configurés
- Confirmer si `generate-summary`, `generate-summary-auto` sont encore utilisés
- Vérifier si `embed-all-notes` est appelé manuellement/via admin

---

## ❌ FONCTIONS OBSOLÈTES (15 fonctions)

### **Non référencées, tests, ou deprecated - SUPPRIMER**

| # | Fonction | Fichier Existe | Raison | Action |
|---|----------|----------------|--------|--------|
| 26 | `create-meeting` | ✅ .js | Version deprecated (v3 existe) | 🗑️ **SUPPRIMER** |
| 27 | `create-meeting-simple` | ✅ .js | Version deprecated | 🗑️ **SUPPRIMER** |
| 28 | `test-daily` | ✅ .js | Tests uniquement | 🗑️ **SUPPRIMER** |
| 29 | `test-daily-simple` | ✅ .js | Tests uniquement | 🗑️ **SUPPRIMER** |
| 30 | `test-smtp` | ✅ .ts | Tests uniquement | 🗑️ **SUPPRIMER** |
| 31 | `test-webhooks` | ✅ .js | Tests uniquement | 🗑️ **SUPPRIMER** |
| 32 | `debug-meeting` | ✅ .js | Debug uniquement | 🗑️ **SUPPRIMER** |
| 33 | `setup-daily-webhook` | ✅ .js | Script setup one-time | 🗑️ **SUPPRIMER** |
| 34 | `setup-recording-webhook` | ✅ .js | Script setup one-time | 🗑️ **SUPPRIMER** |
| 35 | `health.js` | ✅ .js | Doublon healthcheck | 🗑️ **SUPPRIMER** (garder .ts) |
| 36 | `healthz` | ✅ .ts | Doublon healthcheck | 🗑️ **SUPPRIMER** (garder health.ts) |
| 37 | `embed-notes` | ✅ .ts | Non référencée | 🗑️ **SUPPRIMER** |
| 38 | `generate-key` | ✅ .js | Non référencée | 🗑️ **SUPPRIMER** |
| 39 | `reports` | ✅ .js | Non référencée | 🗑️ **SUPPRIMER** |
| 40 | `health` | ✅ .ts | **GARDER** (healthcheck principal) | ✅ **CONSERVER** |

**Note healthcheck** : Garder UN SEUL healthcheck. Recommandé : `health.ts` (TypeScript)

---

## 👻 FONCTIONS FANTÔMES (5 fonctions)

### **⚠️ CRITIQUES : Appelées dans le code mais fichier N'EXISTE PAS !**

| # | Fonction Appelée | Existe ? | Appelée depuis | Ligne | Impact | Action |
|---|------------------|----------|----------------|-------|--------|--------|
| 1 | `ghost-autocomplete` | ❌ NON | `ARCHITECTURE_OPENAI.md` | 97 | 🟢 **Documentation uniquement** | ℹ️ Migré vers Supabase |
| 2 | `send-email` | ❌ NON | `email.ts` | 63 | 🔴 **PRODUCTION CASSÉE** | ⚠️ **CRÉER ou MIGRER** |
| 3 | `get-meeting` | ❌ NON | `MeetingRoom.tsx` | 329 | 🔴 **PRODUCTION CASSÉE** | ⚠️ **CRÉER ou MIGRER** |
| 4 | `share-summary` | ❌ NON | `MeetingSummaryTab.tsx` | 48 | 🔴 **PRODUCTION CASSÉE** | ⚠️ **CRÉER ou MIGRER** |
| 5 | `suggest-improvements` | ❌ NON | `MeetingSummaryTab.tsx` | 84 | 🔴 **PRODUCTION CASSÉE** | ⚠️ **CRÉER ou MIGRER** |

**🚨 URGENCE CRITIQUE** :
- **4 fonctions en production** sont appelées mais n'existent nulle part !
- Ces appels échouent systématiquement en production
- Vérifier les logs d'erreurs pour confirmer l'impact

---

## 🔄 DOUBLONS NETLIFY ↔ SUPABASE (2 fonctions)

| Fonction | Netlify | Supabase | Version Active | Action |
|----------|---------|----------|----------------|--------|
| `ai-chat` | ✅ .ts | ✅ Déployée | 🟢 **Supabase** (5 appels via invoke) | 🗑️ **Supprimer Netlify** |
| `improve-content` | ✅ .ts | ✅ Déployée | 🟢 **Supabase** (4 appels via invoke) | 🗑️ **Supprimer Netlify** |
| `transcribe-audio` | ✅ .ts | ✅ Déployée | 🔴 **Netlify** (1 appel fetch) | 🔄 **Migrer vers Supabase** |

---

## 📋 PLAN D'ACTION DÉTAILLÉ

### 🚨 **PHASE 0 - URGENCE : Réparer les fonctions fantômes**

**Avant toute suppression, résoudre les 4 appels cassés :**

```bash
# Fonctions à créer ou migrer IMMÉDIATEMENT
1. send-email         → Créer Edge Function Supabase
2. get-meeting        → Créer Edge Function Supabase
3. share-summary      → Créer Edge Function Supabase
4. suggest-improvements → Créer Edge Function Supabase
```

**Vérifier impact :**
```bash
# Chercher les erreurs dans les logs Netlify/Supabase
# Ces fonctions échouent probablement en production !
```

---

### 🗑️ **PHASE 1 - SUPPRESSIONS IMMÉDIATES (12 fichiers)**

**Sans risque - Aucune référence active :**

```bash
# Doublons Supabase (déjà migrées)
rm netlify/functions/ai-chat.ts
rm netlify/functions/improve-content.ts

# Versions deprecated
rm netlify/functions/create-meeting.js
rm netlify/functions/create-meeting-simple.js

# Tests
rm netlify/functions/test-daily.js
rm netlify/functions/test-daily-simple.js
rm netlify/functions/test-smtp.ts
rm netlify/functions/test-webhooks.js
rm netlify/functions/debug-meeting.js

# Scripts setup
rm netlify/functions/setup-daily-webhook.js
rm netlify/functions/setup-recording-webhook.js

# Doublons healthcheck (garder health.ts)
rm netlify/functions/health.js
rm netlify/functions/healthz.ts

# Non référencées
rm netlify/functions/embed-notes.ts
rm netlify/functions/generate-key.js
rm netlify/functions/reports.js
```

**⚠️ NE PAS supprimer create-meeting-v2.js** (utilisée en debug)

---

### 🔍 **PHASE 2 - VÉRIFICATIONS (7 fonctions)**

**Avant de supprimer, vérifier si encore utilisées :**

#### 1. Webhooks Daily.co
```bash
# Vérifier Daily.co Dashboard → Webhooks
# URL à chercher :
# - https://centrinote.netlify.app/.netlify/functions/daily-webhook-proxy
# - https://centrinote.netlify.app/.netlify/functions/daily-webhook-recording

# Si configurés sur Daily.co → GARDER
# Si non configurés → SUPPRIMER
```

#### 2. Fonctions de résumé
```bash
# Vérifier si generate-summary et generate-summary-auto sont appelées
# Option 1 : Chercher dans logs Netlify Functions
# Option 2 : Tester création de meeting + recording

# Si jamais appelées dans les logs → SUPPRIMER
# Si logs montrent des appels → GARDER
```

#### 3. Embeddings
```bash
# embed-all-notes : Vérifier si utilisée en admin/batch
# Tester : https://centrinote.fr/.netlify/functions/embed-all-notes?force=true
# Si erreur/404 → SUPPRIMER
# Si fonctionne → GARDER (fonction batch)
```

---

### 🔄 **PHASE 3 - MIGRATIONS (18 fonctions actives)**

**Migrer progressivement vers Supabase :**

#### Priorité 1 - Doublon transcribe-audio
```typescript
// useRecordingPolling.ts:98
// AVANT
const transcribeResponse = await fetch('/.netlify/functions/transcribe-audio', {...})

// APRÈS
const { data, error } = await supabase.functions.invoke('transcribe-audio', {...})
```

#### Priorité 2 - Automatisations
- `automation-get` → Supabase
- `automation-upsert` → Supabase

#### Priorité 3 - AI
- `ask-enriched` → Supabase

#### Priorité 4 - Meetings (7 fonctions)
- `create-meeting-v3`, `delete-meeting`, `end-meeting`, etc.

#### Priorité 5 - Webhooks/Admin
- `webhook-proxy`, `n8n-proxy`, `admin`, `auth-me`

---

## 📊 RÉCAPITULATIF FINAL

### Fichiers par action :

| Action | Nombre | Fichiers |
|--------|--------|----------|
| 🗑️ **SUPPRIMER IMMÉDIATEMENT** | 15 | ai-chat, improve-content, create-meeting, create-meeting-simple, tests (5), setup (2), health doublons (2), non référencées (3) |
| 🔍 **VÉRIFIER AVANT SUPPRESSION** | 7 | daily-webhook-*, generate-summary*, embed-all-notes, summaries-crud, check-meetings-duration |
| 🔄 **MIGRER VERS SUPABASE** | 18 | Toutes les fonctions actives en production |
| ⚠️ **CRÉER (FANTÔMES)** | 4 | send-email, get-meeting, share-summary, suggest-improvements |
| ✅ **GARDER** | 1 | health.ts (healthcheck) |

### Fonctions Edge (déjà sur Netlify Edge) :
- `daily-recording-ready` (configurée dans netlify.toml)
- `daily-webhook-test` (configurée dans netlify.toml)

---

## ⚠️ POINTS D'ATTENTION

### 1. **create-meeting-v2 en DEBUG**
- Fichier : `DailyTestPanel.tsx:112`
- **NE PAS supprimer** tant que debug panel utilisé
- Alternative : Migrer le debug panel vers create-meeting-v3

### 2. **auth-me non appelée directement**
- Référencée dans un commentaire `apiClient.ts:160`
- Vérifier si `apiClient` utilise `/.netlify/functions` comme base URL
- Si oui → auth-me est active

### 3. **Cron job check-meetings-duration**
- Configuré dans netlify.toml ligne 113
- **Ne PAS supprimer** le fichier sans migrer vers pg_cron Supabase

### 4. **Webhooks externes**
- `daily-webhook-proxy` et `daily-webhook-recording` peuvent être configurés sur Daily.co Dashboard
- Vérifier avant suppression pour éviter de casser les webhooks

---

## ✅ VALIDATION RECOMMANDÉE

### Avant suppression :
```bash
# 1. Vérifier aucune erreur actuelle
netlify functions:log --follow

# 2. Chercher appels dans TOUS les fichiers (y compris config)
grep -r "nom-fonction" .

# 3. Vérifier Daily.co Dashboard webhooks

# 4. Tester localement
netlify dev

# 5. Backup
git add .
git commit -m "Backup avant nettoyage Netlify Functions"
```

---

**Date du scan** : 2026-01-04
**Fichiers scannés** : 40 fonctions Netlify + tous fichiers src/
**Statut** : ✅ Inventaire complet prêt pour action

# 🚀 Migration vers Supabase Edge Function - create-meeting

**Date** : 2026-01-04
**Raison** : Utiliser les secrets Supabase au lieu des variables Netlify

---

## ✅ CE QUI A ÉTÉ FAIT

### 1. Création de l'Edge Function Supabase

**Fichier** : `supabase/functions/create-meeting/index.ts`

Cette fonction :
- ✅ Utilise les **secrets Supabase** via `Deno.env.get()`
- ✅ Crée une salle Daily.co
- ✅ Sauvegarde le meeting dans Supabase
- ✅ Envoie une notification n8n (optionnel)
- ✅ Identique à `netlify/functions/create-meeting-v3.js` mais en Deno/TypeScript

### 2. Modification du code frontend

**Fichier** : `src/hooks/useMeetings.tsx` (ligne 180)

**Avant (Netlify Function)** :
```typescript
const response = await fetch('/.netlify/functions/create-meeting-v3', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
});
```

**Après (Supabase Edge Function)** :
```typescript
const { data, error } = await supabase.functions.invoke('create-meeting', {
  body: payload
});
```

---

## 🔐 CONFIGURATION DES SECRETS SUPABASE

### Étape 1 : Vérifier les secrets existants

```bash
supabase secrets list
```

### Étape 2 : Ajouter les secrets manquants

```bash
# Daily.co API Key
supabase secrets set DAILY_API_KEY=ta_cle_daily_ici

# Supabase Service Role Key (déjà disponible dans Supabase)
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=ta_service_role_key

# URLs Supabase (déjà disponibles automatiquement)
# SUPABASE_URL est automatiquement disponible dans les Edge Functions

# Webhooks n8n (optionnel)
supabase secrets set VITE_N8N_DAILY_EVENTS=https://n8n.srv886297.hstgr.cloud/webhook/daily-meeting-events
supabase secrets set VITE_DAILY_DOMAIN=centrinote.daily.co
```

---

## 🚀 DÉPLOIEMENT

### 1. Déployer l'Edge Function

```bash
supabase functions deploy create-meeting
```

### 2. Tester localement (optionnel)

```bash
# Démarrer Supabase local
supabase start

# Servir la fonction localement
supabase functions serve create-meeting

# Tester avec curl
curl -i --location --request POST 'http://localhost:54321/functions/v1/create-meeting' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "title": "Test Meeting",
    "description": "Test description",
    "participants": [
      {"name": "John", "email": "john@example.com", "role": "organizer"}
    ],
    "created_by": "user-id-here"
  }'
```

### 3. Vérifier les logs

```bash
supabase functions logs create-meeting
```

---

## 📋 CHECKLIST DE DÉPLOIEMENT

- [ ] Edge Function créée : `supabase/functions/create-meeting/index.ts`
- [ ] Code frontend modifié : `src/hooks/useMeetings.tsx`
- [ ] Secrets Supabase configurés :
  - [ ] `DAILY_API_KEY`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
  - [ ] `VITE_N8N_DAILY_EVENTS` (optionnel)
  - [ ] `VITE_DAILY_DOMAIN` (optionnel)
- [ ] Edge Function déployée : `supabase functions deploy create-meeting`
- [ ] Tests effectués en production
- [ ] Logs vérifiés : `supabase functions logs create-meeting`

---

## 🔍 VÉRIFICATION QUE ÇA MARCHE

### 1. Tester la création de réunion

1. Aller sur l'interface de création de réunion
2. Remplir le formulaire (titre + participants)
3. Cliquer sur "Créer"
4. **Vérifier dans la console** :
   ```
   📤 [MEETINGS] Payload envoyé à Supabase Edge Function create-meeting
   ✅ [MEETINGS] Réunion créée
   ```

### 2. Vérifier les logs Supabase

```bash
supabase functions logs create-meeting --tail
```

**Logs attendus** :
```
📥 [CREATE-MEETING] Requête reçue
🔍 [CREATE-MEETING] Vérification des secrets: { hasDaily: true, ... }
📝 [CREATE-MEETING] Données reçues: { title: "...", ... }
✅ [CREATE-MEETING] Participants validés: 2
🏠 [CREATE-MEETING] Création salle Daily.co: centrinote-xxx
🚀 [CREATE-MEETING] Appel API Daily.co...
📡 [CREATE-MEETING] Réponse Daily.co status: 200
✅ [CREATE-MEETING] Salle Daily.co créée
💾 [CREATE-MEETING] Sauvegarde dans Supabase...
✅ [CREATE-MEETING] Réunion sauvegardée: xxx
🎉 [CREATE-MEETING] Réponse complète
```

### 3. Vérifier dans Supabase

1. Aller sur Supabase Dashboard
2. Table `meetings`
3. Vérifier que la nouvelle réunion apparaît avec :
   - `room_name`
   - `room_url`
   - `participants` (tableau JSON)
   - `status: 'scheduled'`

---

## 🆚 DIFFÉRENCES NETLIFY vs SUPABASE

| Aspect | Netlify Function | Supabase Edge Function |
|--------|------------------|------------------------|
| **Variables env** | `process.env.DAILY_API_KEY` | `Deno.env.get('DAILY_API_KEY')` |
| **Secrets** | Netlify Dashboard | Supabase Secrets |
| **Runtime** | Node.js | Deno |
| **Appel frontend** | `fetch('/.netlify/functions/...')` | `supabase.functions.invoke('...')` |
| **Logs** | Netlify Dashboard | `supabase functions logs` |
| **Timeout** | Configurable (10s-26s) | 30s max |

---

## ⚠️ POINTS D'ATTENTION

### 1. CORS

L'Edge Function a **CORS configuré** pour accepter toutes les origines (`*`).
Si tu veux restreindre, modifie les `corsHeaders` dans `index.ts`.

### 2. Authentification

L'Edge Function **NE VÉRIFIE PAS** l'authentification Supabase actuellement.
Elle fait confiance au `created_by` envoyé par le client.

**Pour sécuriser** (optionnel) :
```typescript
// Dans l'Edge Function, ajouter :
const authHeader = req.headers.get('Authorization');
if (!authHeader) {
  return new Response(
    JSON.stringify({ error: 'Non authentifié' }),
    { status: 401, headers: corsHeaders }
  );
}

// Vérifier le JWT
const supabaseClient = createClient(
  SUPABASE_URL!,
  SUPABASE_SERVICE_ROLE_KEY!,
  { global: { headers: { Authorization: authHeader } } }
);

const { data: { user }, error } = await supabaseClient.auth.getUser();
if (error || !user) {
  return new Response(
    JSON.stringify({ error: 'Token invalide' }),
    { status: 401, headers: corsHeaders }
  );
}

// Utiliser user.id au lieu de created_by du payload
```

### 3. Timeout

Les Edge Functions Supabase ont un **timeout de 30s maximum**.
Si la création de réunion prend plus de 30s, elle échouera.

---

## 🗑️ NETTOYAGE (APRÈS TESTS)

Une fois que tout fonctionne, tu peux supprimer :

```bash
# Supprimer l'ancienne fonction Netlify
rm netlify/functions/create-meeting-v3.js

# Supprimer les variables Netlify (via Dashboard)
# - DAILY_API_KEY (maintenant dans Supabase)
# - SUPABASE_SERVICE_ROLE_KEY (maintenant dans Supabase)
```

---

## 🎯 AVANTAGES DE LA MIGRATION

✅ **Secrets centralisés** : Tout dans Supabase
✅ **Pas besoin de .env local** : Les secrets sont dans le cloud
✅ **Meilleure intégration** : `supabase.functions.invoke()` au lieu de `fetch()`
✅ **TypeScript** : Typage fort avec Deno
✅ **Logs unifiés** : Tous les logs Supabase au même endroit

---

## 📚 DOCUMENTATION

- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase Secrets](https://supabase.com/docs/guides/functions/secrets)
- [Daily.co API](https://docs.daily.co/reference/rest-api)

---

**Date de création** : 2026-01-04
**Statut** : ✅ Prêt pour déploiement

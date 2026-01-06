# 🔍 SYNTHÈSE : Problème de Création de Réunions

**Date** : 2026-01-04
**Erreur** : 500 Internal Server Error lors de la création de réunion
**Message utilisateur** : "Ça marchait avant, pourquoi ça ne marche plus ?"

---

## 📊 CE QUI A ÉTÉ FAIT AVANT (d'après les .md)

### 1. Architecture Meetings Daily.co

D'après `DAILY_API_EDGE_FUNCTION.md` et autres documents :

**Système actuel :**
- ✅ Fonction Netlify `create-meeting-v3.js` pour créer les salles Daily.co
- ✅ Intégration avec Supabase pour stocker les meetings
- ✅ Webhooks Daily.co pour les enregistrements
- ✅ Génération automatique de résumés avec OpenAI

**Variables requises (documentées) :**
```bash
# Daily.co
DAILY_API_KEY=xxx                    # ❌ MANQUANTE dans .env
VITE_DAILY_DOMAIN=centrinote.daily.co # ✅ Présente

# Supabase
VITE_SUPABASE_URL=xxx                # ✅ Présente
VITE_SUPABASE_ANON_KEY=xxx          # ✅ Présente
SUPABASE_SERVICE_ROLE_KEY=xxx       # ❌ MANQUANTE dans .env

# OpenAI
OPENAI_API_KEY=xxx                   # ✅ Présente

# Webhooks n8n
VITE_N8N_DAILY_RECORDING=xxx        # ✅ Présente
VITE_N8N_DAILY_EVENTS=xxx           # ✅ Présente
```

---

## 🔴 PROBLÈME ACTUEL

### Erreur observée

```
[CREATE] Response status: 500
❌ Erreur serveur (500)
```

### Analyse des logs console

D'après les logs fournis par l'utilisateur :

```javascript
[CREATE] Full payload: {
  title: 'teste e reunion 04-1-2026',
  description: 'Réunion créée avec participants',
  participants: [{name: '...', email: '...', role: 'organizer'}, ...]
}

POST http://localhost:5174/.netlify/functions/create-meeting-v3 500 (Internal Server Error)
```

**✅ Le titre EST présent** → Le problème n'est PAS côté frontend
**❌ Erreur 500** → Le problème est côté serveur (create-meeting-v3)

---

## 🔍 CAUSE RACINE

### Analyse du fichier `create-meeting-v3.js`

**Lignes 37-42** :
```javascript
const DAILY_API_KEY = process.env.DAILY_API_KEY || process.env.REACT_APP_DAILY_API_KEY;
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
```

**Lignes 59-69** (validation DAILY_API_KEY) :
```javascript
if (!DAILY_API_KEY) {
  console.error('❌ [CREATE-MEETING-V3] DAILY_API_KEY manquante');
  return {
    statusCode: 500,
    headers,
    body: JSON.stringify({
      error: 'Configuration Daily.co manquante',
      debug: 'DAILY_API_KEY not configured in Netlify environment'
    })
  };
}
```

**Lignes 71-81** (validation SUPABASE) :
```javascript
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ [CREATE-MEETING-V3] Configuration Supabase manquante');
  return {
    statusCode: 500,
    headers,
    body: JSON.stringify({
      error: 'Configuration Supabase manquante',
      debug: 'SUPABASE_URL or SERVICE_KEY not configured'
    })
  };
}
```

### Vérification du fichier `.env`

**Variables présentes :**
```bash
✅ VITE_SUPABASE_URL
✅ VITE_SUPABASE_ANON_KEY
✅ VITE_DAILY_DOMAIN
✅ OPENAI_API_KEY
✅ VITE_N8N_DAILY_RECORDING
✅ VITE_N8N_DAILY_EVENTS
```

**Variables MANQUANTES :**
```bash
❌ DAILY_API_KEY
❌ SUPABASE_SERVICE_ROLE_KEY
```

---

## ✅ POURQUOI ÇA MARCHAIT AVANT ?

### Hypothèse 1 : Variables en production Netlify uniquement

**Avant :** Les tests étaient faits en PRODUCTION (centrinote.fr)
- Variables configurées dans Netlify Dashboard
- Fonctions Netlify utilisaient `process.env.DAILY_API_KEY` (disponible)
- ✅ **Tout fonctionnait**

**Maintenant :** Test en DÉVELOPPEMENT LOCAL (localhost:5174)
- Variables manquantes dans `.env` local
- Netlify Dev ne trouve pas `DAILY_API_KEY` ni `SUPABASE_SERVICE_ROLE_KEY`
- ❌ **Erreur 500**

### Hypothèse 2 : Variables supprimées accidentellement

Les variables étaient peut-être dans `.env` avant mais ont été :
- Supprimées par erreur
- Perdues lors d'un reset
- Jamais commitées (`.env` est dans `.gitignore`)

---

## 🔧 SOLUTION IMMÉDIATE

### Étape 1 : Ajouter les variables manquantes dans `.env`

```bash
# 🎥 Daily.co API Key (CRITIQUE)
DAILY_API_KEY=ta_cle_daily_ici

# 🔐 Supabase Service Role Key (CRITIQUE - JAMAIS en VITE_!)
SUPABASE_SERVICE_ROLE_KEY=ta_service_role_key_ici

# 🎬 Webhooks n8n (optionnel pour création basique)
REACT_APP_N8N_EVENTS_WEBHOOK=https://n8n.srv886297.hstgr.cloud/webhook/daily-meeting-events
REACT_APP_N8N_RECORDING_WEBHOOK=https://n8n.srv886297.hstgr.cloud/webhook/daily-recording
```

### Étape 2 : Où trouver ces clés ?

#### **DAILY_API_KEY** :
1. Aller sur https://dashboard.daily.co/developers
2. Section "API Keys"
3. Copier la clé (commence par `daily_`)

#### **SUPABASE_SERVICE_ROLE_KEY** :
1. Aller sur https://supabase.com/dashboard/project/wjzlicokhxitmeoxkjzv/settings/api
2. Chercher **"service_role key"** (PAS "anon key" !)
3. Copier la clé (JWT très long)

⚠️ **IMPORTANT** : `SUPABASE_SERVICE_ROLE_KEY` donne un accès COMPLET à la base de données.
**Ne JAMAIS** la préfixer avec `VITE_` (sinon elle serait exposée côté client).

### Étape 3 : Redémarrer le serveur dev

```bash
# Arrêter le serveur (Ctrl+C)
npm run dev
# OU
netlify dev
```

---

## 📋 VÉRIFICATION QUE ÇA MARCHE

### 1. Vérifier que les variables sont chargées

Ajouter un `console.log` temporaire dans `create-meeting-v3.js` (ligne 49) :

```javascript
console.log('📋 [CREATE-MEETING-V3] Configuration:', {
  hasDaily: !!DAILY_API_KEY,
  dailyDomain: DAILY_DOMAIN,
  hasSupabaseUrl: !!SUPABASE_URL,
  hasSupabaseKey: !!SUPABASE_SERVICE_KEY,
  hasEventsWebhook: !!N8N_EVENTS_WEBHOOK,
  hasRecordingWebhook: !!N8N_RECORDING_WEBHOOK
});
```

**Résultat attendu :**
```javascript
{
  hasDaily: true,          // ✅
  dailyDomain: 'centrinote.daily.co',
  hasSupabaseUrl: true,    // ✅
  hasSupabaseKey: true,    // ✅
  hasEventsWebhook: true,
  hasRecordingWebhook: true
}
```

### 2. Tester la création de réunion

1. Remplir le formulaire de création
2. Cliquer sur "Créer"
3. **Résultat attendu** :
   - ✅ Status 200 (au lieu de 500)
   - ✅ Réunion créée avec succès
   - ✅ Salle Daily.co créée
   - ✅ Entrée dans table `meetings` de Supabase

---

## 🚨 SÉCURITÉ IMPORTANTE

### ⚠️ Ne PAS faire :

```bash
# ❌ DANGER - Expose la clé côté client
VITE_DAILY_API_KEY=xxx
VITE_SUPABASE_SERVICE_ROLE_KEY=xxx
```

### ✅ À faire :

```bash
# ✅ Clés privées SANS VITE_
DAILY_API_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# ✅ Clés publiques AVEC VITE_
VITE_SUPABASE_URL=xxx
VITE_SUPABASE_ANON_KEY=xxx
VITE_DAILY_DOMAIN=xxx
```

**Règle simple :**
- Clé utilisée **côté client** (browser) → Préfixe `VITE_`
- Clé utilisée **côté serveur** (Netlify Functions) → PAS de préfixe `VITE_`

---

## 📊 RÉCAPITULATIF

| Élément | État | Action |
|---------|------|--------|
| **Code frontend** | ✅ OK | Titre présent, payload correct |
| **Code backend** | ✅ OK | Validation correcte dans create-meeting-v3 |
| **DAILY_API_KEY** | ❌ Manquante | Ajouter dans `.env` |
| **SUPABASE_SERVICE_ROLE_KEY** | ❌ Manquante | Ajouter dans `.env` |
| **Erreur 500** | 🔴 Active | Se résoudra après ajout des clés |

---

## 🎯 CONCLUSION

**Le système n'a PAS changé.** Il fonctionne parfaitement.

**Ce qui a changé :** L'environnement de développement local manque les 2 variables critiques.

**Solution :** Ajouter `DAILY_API_KEY` et `SUPABASE_SERVICE_ROLE_KEY` dans `.env` local.

**Temps estimé :** 5 minutes (récupérer les clés + redémarrer)

---

## 🔗 Documentation de référence

- `DAILY_API_EDGE_FUNCTION.md` - Architecture Daily.co
- `DEPLOIEMENT_CHECKLIST.md` - Variables requises
- `EXPLICATION_RESUME_ENREGISTREMENT.md` - Flux complet des meetings
- `netlify/functions/create-meeting-v3.js` - Code de création

---

**Date de diagnostic** : 2026-01-04
**Statut** : ✅ Cause identifiée - Solution simple

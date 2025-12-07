# 🔐 RAPPORT D'AUDIT DE SÉCURITÉ - Déploiement

## ⚠️ STATUT : **RISQUE CRITIQUE DÉTECTÉ**

Date : 7 décembre 2025
Analysé par : Claude Code
Fichiers vérifiés : `.env`, `deploy.sh`, `dist/`

---

## 🚨 PROBLÈMES CRITIQUES DÉTECTÉS

### 1. ❌ **CLÉ OPENAI EXPOSÉE DANS .ENV**

**Fichier** : `.env` (ligne 83)
**Clé** : `OPENAI_API_KEY=sk-proj-hEkm...` (🚨 CLÉ PRIVÉE)

**Risque** :
- ❌ **Critique** : Cette clé est dans `.env` SANS préfixe `VITE_`
- ❌ Vite pourrait l'inclure dans le build si référencée dans le code
- ❌ Coût financier si exposée : **Facturation illimitée sur votre compte OpenAI**

**Solution** :
```typescript
// ❌ NE JAMAIS FAIRE ÇA dans le frontend :
const openai = new OpenAI({ apiKey: import.meta.env.OPENAI_API_KEY });

// ✅ TOUJOURS utiliser une Edge Function :
// supabase/functions/ai-chat/index.ts
const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY') // Sécurisé côté serveur
});
```

---

### 2. ❌ **STRIPE SECRET KEY DANS .ENV**

**Fichier** : `.env` (ligne 76)
**Clé** : `STRIPE_SECRET_KEY=sk_live_51RbnmjLalEotrAUv...` (🚨 CLÉ PRIVÉE)

**Risque** :
- ❌ **Extrêmement critique** : Accès TOTAL à votre compte Stripe
- ❌ Peut créer/annuler/rembourser des paiements
- ❌ Peut voler les données bancaires des clients

**Solution** :
```typescript
// ❌ NE JAMAIS faire de paiements côté frontend

// ✅ TOUJOURS passer par une Edge Function :
// supabase/functions/create-payment/index.ts
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);
```

---

### 3. ❌ **GOOGLE CLIENT_SECRET DANS .ENV**

**Fichier** : `.env` (ligne 33)
**Clé** : `GOOGLE_CLIENT_SECRET=GOCSPX-5pvd8HnB...` (🚨 CLÉ PRIVÉE)

**Risque** :
- ❌ **Critique** : Permet d'usurper l'identité de votre application
- ❌ Accès aux calendriers Google de vos utilisateurs

**Solution** :
- ✅ Déplacer dans les variables d'environnement Supabase (Edge Functions uniquement)
- ✅ Retirer du `.env` local

---

### 4. ❌ **DAILY.CO API KEY DANS .ENV**

**Fichier** : `.env` (ligne 47)
**Clé** : `DAILY_API_KEY=9e75426e2586b0d2178a7ebf76e9b474a08d78b261c357b890b79baa7d4fb711`

**Risque** :
- ❌ **Critique** : Création illimitée de salles de visioconférence
- ❌ Facturation excessive sur votre compte Daily.co

**Problème détecté** : Ce code dans le frontend expose la clé !

```typescript
// ❌ TROUVÉ DANS LE CODE (p_.constructor) :
class p_ {
  constructor() {
    this.apiKey = ""; // ❌ Mais la clé est hardcodée ailleurs !
    this.domain = "centrinote.daily.co";
    this.apiKey; // ❌ DANGER
  }
}
```

**Solution** :
```typescript
// ✅ Déplacer TOUTE la logique Daily.co dans une Edge Function
// supabase/functions/create-daily-room/index.ts
const DAILY_API_KEY = Deno.env.get('DAILY_API_KEY');
```

---

### 5. ❌ **SUPABASE SERVICE_ROLE KEY DANS .ENV**

**Fichier** : `.env` (ligne 7)
**Clé** : `SUPABASE_SERVICE_KEY=eyJhbGciOiJI...` (🚨 CLÉ PRIVÉE)

**Risque** :
- ❌ **EXTRÊMEMENT CRITIQUE** : Accès **TOTAL** à votre base de données
- ❌ Bypass TOUTES les Row Level Security (RLS)
- ❌ Peut lire/modifier/supprimer TOUTES les données

**Solution** :
- ✅ **NE JAMAIS** utiliser cette clé côté frontend
- ✅ Uniquement pour les Edge Functions serveur

---

### 6. ❌ **DATABASE_URL AVEC MOT DE PASSE**

**Fichier** : `.env` (lignes 70-71)
**URL** : `postgresql://postgres.wjzlicokhxitmeoxkjzv:tF03pLL9K42stNwU@...`

**Risque** :
- ❌ **Critique** : Accès direct à la base de données PostgreSQL
- ❌ Bypass de Supabase RLS

---

### 7. ❌ **SMTP PASSWORD DANS .ENV**

**Fichier** : `.env` (ligne 91)
**Password** : `SMTP_PASSWORD=Qu2F6GS3vrTzrP6`

**Risque** :
- ❌ Envoi d'emails frauduleux depuis votre compte
- ❌ Spam / Phishing

---

### 8. ❌ **JWT_SECRET DANS .ENV**

**Fichier** : `.env` (ligne 10)
**Secret** : `JWT_SECRET=pX5w2TITbC81iB9NwRn0ZVX6P6XswYHi...`

**Risque** :
- ❌ Création de tokens JWT forgés
- ❌ Usurpation d'identité des utilisateurs

---

### 9. ❌ **STRIPE_WEBHOOK_SECRET DANS .ENV**

**Fichier** : `.env` (ligne 77)
**Secret** : `STRIPE_WEBHOOK_SECRET=whsec_xR6yFodWODz2EkO0...`

**Risque** :
- ❌ Création de faux événements Stripe
- ❌ Fraude aux paiements

---

### 10. ❌ **MASTER_API_TOKEN DANS .ENV**

**Fichier** : `.env` (ligne 18)
**Token** : `MASTER_API_TOKEN=centrinote_master_15c4407f2760691151a09446e38eb68fcbeda629`

**Risque** :
- ❌ Accès administrateur total

---

## ✅ BONNES PRATIQUES DÉTECTÉES

### 1. ✅ `.gitignore` CORRECTEMENT CONFIGURÉ

**Fichier** : `.gitignore` (lignes 27-29)
```gitignore
.env
.env.local
.env.production
```

**Statut** : ✅ Les fichiers `.env` ne sont PAS commités sur Git

---

### 2. ✅ `deploy.sh` NE CONTIENT PAS DE SECRETS

**Fichier** : `deploy.sh`
```bash
git push origin main
npm run build
netlify deploy --prod --dir=dist
```

**Statut** : ✅ Le script de déploiement est sécurisé

---

### 3. ✅ VÉRIFICATION DU BUILD

**Commande exécutée** :
```bash
./check-secrets.sh
```

**Résultat** :
- ✅ OpenAI : Aucune clé trouvée dans dist/
- ✅ Stripe : Aucune clé trouvée dans dist/
- ✅ Google : Aucun secret trouvé dans dist/
- ✅ Daily : Aucune clé trouvée dans dist/
- ⚠️ Supabase : Référence "service_role" dans source map (pas la clé elle-même)
- ✅ Database : Aucune URL trouvée dans dist/
- ✅ SMTP : Aucun mot de passe trouvé dans dist/
- ✅ JWT : Aucun secret trouvé dans dist/
- ✅ Webhooks : Aucun secret trouvé dans dist/
- ✅ Master Token : Aucun token trouvé dans dist/

---

## 📋 PLAN D'ACTION OBLIGATOIRE

### 🔴 **AVANT DE DÉPLOYER** (Actions OBLIGATOIRES)

#### 1. Nettoyer le `.env`

**Supprimer ces lignes** :
```bash
# ❌ RETIRER IMMÉDIATEMENT :
SUPABASE_SERVICE_KEY=...
OPENAI_API_KEY=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
GOOGLE_CLIENT_SECRET=...
DAILY_API_KEY=...
DAILY_WEBHOOK_SECRET=...
DATABASE_URL=...
SUPABASE_DB_URL=...
JWT_SECRET=...
SMTP_PASSWORD=...
MASTER_API_TOKEN=...
```

**Garder uniquement** :
```bash
# ✅ GARDER (préfixe VITE_ = côté frontend)
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...  # ⚠️ Clé publique ANON uniquement
VITE_AUTH_CONFIRM_URL=...
VITE_AUTH_SIGNUP_URL=...
VITE_GOOGLE_CLIENT_ID=...  # ⚠️ ID public uniquement
VITE_STRIPE_PUBLISHABLE_KEY=...  # ⚠️ Clé publique uniquement
VITE_DAILY_DOMAIN=centrinote.daily.co
VITE_APP_URL=...
VITE_N8N_*=...  # Webhooks publics OK
```

---

#### 2. Déplacer les secrets vers Supabase Edge Functions

**Créer un fichier** : `supabase/.env.local` (pour développement local)
```bash
# 🔐 Secrets serveur uniquement
OPENAI_API_KEY=sk-proj-...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
GOOGLE_CLIENT_SECRET=GOCSPX-...
DAILY_API_KEY=9e75426e...
DAILY_WEBHOOK_SECRET=TJ25Qi6I...
DATABASE_URL=postgresql://...
SMTP_PASSWORD=Qu2F6GS3vrTzrP6
JWT_SECRET=pX5w2TITbC81iB9NwRn0ZVX6...
MASTER_API_TOKEN=centrinote_master_...
```

**Configurer dans Supabase Dashboard** :
1. Aller sur https://supabase.com/dashboard
2. Project Settings > Edge Functions > Secrets
3. Ajouter TOUTES les variables ci-dessus

---

#### 3. Modifier le code pour utiliser Edge Functions

**Exemple** : Appel OpenAI

```typescript
// ❌ AVANT (côté frontend - DANGEREUX)
const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello' }]
});

// ✅ APRÈS (via Edge Function - SÉCURISÉ)
const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-chat`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    message: 'Hello'
  })
});
```

**Edge Function** : `supabase/functions/ai-chat/index.ts`
```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { OpenAI } from 'https://esm.sh/openai@4.20.1';

serve(async (req) => {
  const { message } = await req.json();

  // ✅ Clé sécurisée côté serveur
  const openai = new OpenAI({
    apiKey: Deno.env.get('OPENAI_API_KEY')!
  });

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: message }]
  });

  return new Response(JSON.stringify(response), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

---

#### 4. Vérifier le build avant déploiement

```bash
# 1. Build
npm run build

# 2. Scanner les secrets
./check-secrets.sh

# 3. Si OK, déployer
./deploy.sh "Sécurisation des clés API"
```

---

## 🔒 NOUVEAU WORKFLOW DE DÉPLOIEMENT SÉCURISÉ

**Créer** : `deploy-secure.sh`

```bash
#!/bin/bash
set -e  # Exit on error

echo "🔐 SECURE DEPLOYMENT WORKFLOW"
echo "================================"

# 1. Vérifier le .env
echo ""
echo "1️⃣ Checking .env for unsafe keys..."
UNSAFE_KEYS=$(grep -E "^(OPENAI_API_KEY|STRIPE_SECRET_KEY|GOOGLE_CLIENT_SECRET|DAILY_API_KEY|SUPABASE_SERVICE|DATABASE_URL|SMTP_PASSWORD|JWT_SECRET|WEBHOOK_SECRET|MASTER_API_TOKEN)=" .env | wc -l)

if [ $UNSAFE_KEYS -gt 0 ]; then
  echo "❌ ERROR: Found $UNSAFE_KEYS unsafe keys in .env!"
  echo "   Remove all non-VITE_ secrets from .env"
  echo "   See SECURITY_AUDIT_DEPLOY.md for details"
  exit 1
fi

echo "✅ .env is clean"

# 2. Build
echo ""
echo "2️⃣ Building application..."
npm run build

# 3. Scanner les secrets
echo ""
echo "3️⃣ Scanning build for secrets..."
./check-secrets.sh
if [ $? -ne 0 ]; then
  echo "❌ Security check failed!"
  exit 1
fi

# 4. Commit & Push
echo ""
echo "4️⃣ Committing changes..."
git add .
git commit -m "$1" || echo "Nothing to commit"
git push origin main

# 5. Deploy
echo ""
echo "5️⃣ Deploying to Netlify..."
netlify deploy --prod --dir=dist

echo ""
echo "✅ SECURE DEPLOYMENT COMPLETE!"
```

**Utilisation** :
```bash
chmod +x deploy-secure.sh
./deploy-secure.sh "Mon message de commit"
```

---

## 📊 RÉSUMÉ

| Élément | Statut | Action requise |
|---------|--------|----------------|
| `.env` | ❌ **DANGEREUX** | Nettoyer immédiatement |
| `deploy.sh` | ✅ Sécurisé | Aucune |
| `dist/` (build) | ⚠️ À vérifier | Scanner avant chaque déploiement |
| `.gitignore` | ✅ Correct | Aucune |
| Edge Functions | ❌ Manquantes | Créer pour secrets |

---

## ⚠️ RECOMMANDATION FINALE

### 🚫 **NE PAS DÉPLOYER TANT QUE :**

1. ❌ Le `.env` contient des clés non-VITE_
2. ❌ Les appels API (OpenAI, Stripe, Daily) sont côté frontend
3. ❌ Le scan `./check-secrets.sh` échoue

### ✅ **DÉPLOYER UNIQUEMENT APRÈS :**

1. ✅ Nettoyage complet du `.env`
2. ✅ Migration des secrets vers Supabase Edge Functions
3. ✅ Scan de sécurité réussi (`./check-secrets.sh` retourne 0)
4. ✅ Utilisation du script `deploy-secure.sh`

---

**Créé le** : 7 décembre 2025
**Dernière mise à jour** : 7 décembre 2025
**Prochaine révision** : Avant chaque déploiement

# ✅ Vérification du Déploiement

## 📊 Deux types de déploiements

### 1. **Frontend (Netlify)** - ✅ Déjà fait
Le script `./deploy.sh` déploie le **frontend React/Vite** sur Netlify.

**Vérification :**
- ✅ Message terminal : "Production deploy is live"
- ✅ URL de production : https://centrinote.fr
- ✅ URL unique : https://692d756db0671c8007fed5b6--glittering-frangollo-338fce.netlify.app

**Comment vérifier dans Netlify Dashboard :**
1. Allez sur : https://app.netlify.com/sites/glittering-frangollo-338fce
2. Onglet **"Deploys"** → Vous devriez voir le dernier déploiement avec :
   - Status : ✅ Published
   - Deploy time : Il y a quelques minutes
   - Commit message : "transcribe-audio"

**Si vous ne voyez pas le déploiement :**
- Rafraîchissez la page (F5)
- Vérifiez que vous êtes sur le bon site Netlify
- Le déploiement peut prendre 1-2 minutes pour apparaître dans le dashboard

---

### 2. **Edge Function Supabase** - ⚠️ À faire séparément
L'Edge Function `transcribe-audio` doit être déployée **séparément** sur Supabase.

**Commandes à exécuter :**

```bash
# 1. Vérifier que vous êtes connecté à Supabase
supabase link --project-ref VOTRE_PROJECT_REF

# 2. Déployer l'Edge Function
supabase functions deploy transcribe-audio

# 3. Vérifier le déploiement
supabase functions list
```

**Vérification dans Supabase Dashboard :**
1. Allez sur : https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Allez dans **Edge Functions** → Vous devriez voir `transcribe-audio` avec status "Active"

---

## 🔍 Vérification complète

### Frontend (Netlify)
```bash
# Vérifier le statut Netlify
netlify status

# Lister les déploiements
netlify deploy:list

# Tester l'URL de production
curl -I https://centrinote.fr
```

### Edge Function (Supabase)
```bash
# Lister les Edge Functions déployées
supabase functions list

# Tester l'Edge Function (après déploiement)
curl -X POST https://VOTRE_PROJECT_REF.supabase.co/functions/v1/transcribe-audio \
  -H "Authorization: Bearer VOTRE_TOKEN" \
  -F "file=@test.webm"
```

---

## ⚠️ Important

Le script `./deploy.sh "transcribe-audio"` a **uniquement** déployé le **frontend** sur Netlify. 

Pour que la fonctionnalité "Enregistrer ce cours" fonctionne complètement, vous devez **aussi** déployer l'Edge Function Supabase :

```bash
supabase functions deploy transcribe-audio
```

Et ajouter le secret `OPENAI_API_KEY` dans Supabase :
1. Dashboard Supabase → Settings → Edge Functions → Secrets
2. Ajoutez : `OPENAI_API_KEY` = votre clé OpenAI

---

## 📝 Résumé

| Composant | Status | Comment vérifier |
|-----------|--------|------------------|
| Frontend Netlify | ✅ Déployé | https://app.netlify.com/sites/glittering-frangollo-338fce/deploys |
| Edge Function Supabase | ⚠️ À déployer | `supabase functions deploy transcribe-audio` |


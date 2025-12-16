# 🔐 MASTER_API_TOKEN - Explication

## 📋 Qu'est-ce que `MASTER_API_TOKEN` ?

`MASTER_API_TOKEN` est un **token d'authentification administrateur** utilisé pour sécuriser la fonction Netlify `generate-key.js` qui permet de **créer et gérer des clés API** pour votre application.

---

## 🔍 Où est-il utilisé ?

### ✅ **Fichier unique** : `netlify/functions/generate-key.js`

Cette fonction Netlify permet de :
1. **Créer de nouvelles clés API** (format : `cnt_live_...`)
2. **Lister les clés API existantes** (sans afficher les clés complètes)
3. **Gérer les permissions** et dates d'expiration

### 🔐 Sécurité

Le token master est requis dans l'en-tête `Authorization` :

```javascript
// Validation du master token
function validateMasterToken(token) {
  const expectedToken = process.env.MASTER_API_TOKEN;
  return expectedToken && token === expectedToken;
}
```

**Tous les appels** à cette fonction doivent inclure :
```
Authorization: Bearer <MASTER_API_TOKEN>
```

---

## ❓ Est-il utilisé dans votre système ?

### ✅ **OUI**, mais uniquement pour la gestion administrative des clés API

### 📊 Utilisation actuelle :

| Endpoint | Méthode | Protection | Usage |
|----------|---------|------------|-------|
| `/.netlify/functions/generate-key` | `GET` | `MASTER_API_TOKEN` | Lister les clés API |
| `/.netlify/functions/generate-key` | `POST` | `MASTER_API_TOKEN` | Créer une nouvelle clé API |

### 🔍 Appels depuis le frontend :

**Aucun appel détecté** dans le code frontend (`src/`).

Cette fonction est probablement utilisée :
- ✅ Via un outil administratif externe
- ✅ Via des scripts de déploiement
- ✅ Via des appels manuels (curl, Postman, etc.)
- ❌ **PAS depuis l'interface utilisateur** de l'application

---

## ⚠️ Risques de sécurité

### 1. **Token dans `.env`**

D'après `SECURITY_AUDIT_DEPLOY.md`, le token est présent dans `.env` :
```
MASTER_API_TOKEN=centrinote_master_15c4407f2760691151a09446e38eb68fcbeda629
```

**Risque** : Si le fichier `.env` est commité dans Git ou exposé, le token master est compromis.

### 2. **Accès administrateur total**

Avec ce token, un attaquant peut :
- ❌ Créer des clés API illimitées
- ❌ Lister toutes les clés API existantes
- ❌ Potentiellement accéder aux données protégées par ces clés

---

## ✅ Recommandations de sécurité

### 1. **Vérifier que `.env` est dans `.gitignore`**

```bash
# Vérifier
grep -E "^\.env$" .gitignore

# Si absent, ajouter :
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
```

### 2. **Stockage sécurisé**

Le token doit être stocké **uniquement** dans :
- ✅ Variables d'environnement Netlify (Dashboard)
- ✅ Variables d'environnement locales (`.env.local`, jamais commité)
- ❌ **JAMAIS** dans le code source
- ❌ **JAMAIS** dans `.env` commité

### 3. **Rotation du token**

Si le token a été exposé :
1. Générer un nouveau token
2. Mettre à jour dans Netlify Dashboard
3. Mettre à jour dans `.env.local` (local)
4. Révoquer l'ancien token si possible

### 4. **Limiter l'accès**

- ✅ Utiliser uniquement depuis des scripts sécurisés
- ✅ Ne jamais exposer dans le frontend
- ✅ Logs ne doivent pas afficher le token complet

---

## 🔄 Migration vers Supabase Edge Function (optionnel)

Si vous souhaitez centraliser toutes les fonctions administratives dans Supabase :

### Créer `supabase/functions/generate-api-key/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const MASTER_API_TOKEN = Deno.env.get('MASTER_API_TOKEN');

serve(async (req) => {
  const authHeader = req.headers.get('authorization');
  const masterToken = authHeader?.replace('Bearer ', '');

  if (!masterToken || masterToken !== MASTER_API_TOKEN) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401 }
    );
  }

  // ... logique de génération de clés API
});
```

**Avantages** :
- ✅ Centralisation avec les autres Edge Functions
- ✅ Gestion des secrets via Supabase Dashboard
- ✅ Cohérence avec le reste de l'architecture

---

## 📊 Résumé

| Question | Réponse |
|----------|---------|
| **Est-il utilisé ?** | ✅ Oui, dans `netlify/functions/generate-key.js` |
| **Utilisé côté client ?** | ❌ Non, uniquement côté serveur (Netlify Function) |
| **Risque de sécurité ?** | ⚠️ Oui, si exposé dans `.env` commité |
| **Action requise ?** | ✅ Vérifier que `.env` est dans `.gitignore` |
| **Migration nécessaire ?** | ⚠️ Optionnel (peut rester en Netlify Function) |

---

## ✅ Checklist de sécurité

- [ ] Vérifier que `.env` est dans `.gitignore`
- [ ] Vérifier que `MASTER_API_TOKEN` n'est **pas** dans le code source
- [ ] Vérifier que le token est configuré dans Netlify Dashboard (production)
- [ ] Vérifier que le token est dans `.env.local` (local, jamais commité)
- [ ] Si le token a été exposé → générer un nouveau token
- [ ] Documenter l'usage de ce token pour l'équipe

---

## 🎯 Conclusion

**`MASTER_API_TOKEN` est utilisé** pour sécuriser la génération de clés API, mais **uniquement côté serveur** (Netlify Function). Il n'est **pas utilisé dans le frontend** et ne devrait **jamais** être exposé côté client.

**Action principale** : Vérifier que le token est bien protégé et n'est pas commité dans Git.






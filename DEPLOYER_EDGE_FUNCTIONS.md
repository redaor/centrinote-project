# 🚀 Déployer les Edge Functions Supabase

## ✅ État Actuel

Les fichiers existent déjà localement :
- ✅ `supabase/functions/ghost-autocomplete/index.ts`
- ✅ `supabase/functions/text-correction/index.ts`
- ✅ `supabase/functions/noteo-orchestrator/index.ts` (à modifier)

---

## 📋 Commandes de Déploiement

### 1. Vérifier que vous êtes connecté à Supabase

```bash
# Vérifier le statut
supabase status

# Si pas connecté, lier le projet
supabase link --project-ref votre-project-ref
```

### 2. Déployer `ghost-autocomplete`

```bash
supabase functions deploy ghost-autocomplete
```

### 3. Déployer `text-correction`

```bash
supabase functions deploy text-correction
```

### 4. Déployer `noteo-orchestrator` (modifiée)

```bash
supabase functions deploy noteo-orchestrator
```

---

## 🔐 Configurer les Secrets dans Supabase

### Via CLI (Recommandé)

```bash
# Secret pour ghost-autocomplete
supabase secrets set OPENAI_API_KEY_GHOST=sk-proj-xxx...

# Secret pour text-correction
supabase secrets set OPENAI_API_KEY=sk-proj-xxx...

# Secrets pour noteo-orchestrator
supabase secrets set OPENAI_SEARCH_KEY=sk-proj-xxx...
supabase secrets set OPENAI_CHAT_KEY=sk-proj-xxx...
supabase secrets set OPENAI_AIDE_KEY=sk-proj-xxx...
```

### Via Dashboard Supabase

1. Allez sur [Supabase Dashboard](https://app.supabase.com)
2. Sélectionnez votre projet
3. Allez dans **Project Settings** > **Edge Functions** > **Secrets**
4. Cliquez sur **Add new secret** pour chaque variable

---

## ✅ Vérification

### Vérifier que les fonctions sont déployées :

```bash
supabase functions list
```

Vous devriez voir :
- ✅ `ghost-autocomplete`
- ✅ `text-correction`
- ✅ `noteo-orchestrator`

### Vérifier les secrets :

```bash
supabase secrets list
```

---

## 🧪 Test Rapide

### Tester `ghost-autocomplete` :

```bash
curl -X POST https://VOTRE_PROJECT_REF.supabase.co/functions/v1/ghost-autocomplete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer VOTRE_ANON_KEY" \
  -d '{"context": "je test les", "lastWord": "autocom"}'
```

### Tester `text-correction` :

```bash
curl -X POST https://VOTRE_PROJECT_REF.supabase.co/functions/v1/text-correction \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer VOTRE_ANON_KEY" \
  -d '{"text": "Reformule ce texte", "systemPrompt": "Tu es un assistant..."}'
```

---

## 📝 Checklist

- [ ] `ghost-autocomplete` déployée
- [ ] `text-correction` déployée
- [ ] `noteo-orchestrator` déployée (modifiée)
- [ ] Tous les secrets configurés
- [ ] Tests fonctionnels OK

---

**✅ Une fois déployé, les fonctions seront disponibles dans Supabase !**


# Supabase Edge Function - Ghost Autocomplete

## 🔐 Sécurité

**La clé API OpenAI est stockée UNIQUEMENT dans Supabase**, jamais dans le code client.

## 📋 Configuration

### 1. Déployer la fonction

```bash
supabase functions deploy ghost-autocomplete
```

### 2. Configurer la variable d'environnement dans Supabase

**Via le Dashboard Supabase :**
1. Allez dans **Project Settings** > **Edge Functions** > **Secrets**
2. Ajoutez la variable :
   - **Name**: `OPENAI_API_KEY_GHOST`
   - **Value**: `sk-proj-xxx...` (votre clé API OpenAI)

**Via CLI Supabase :**
```bash
supabase secrets set OPENAI_API_KEY_GHOST=sk-proj-xxx...
```

## ✅ Vérification

```bash
# Tester la fonction localement
supabase functions serve ghost-autocomplete

# Tester avec curl
curl -X POST http://localhost:54321/functions/v1/ghost-autocomplete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"context": "je test les", "lastWord": "autocom"}'
```

## 🚀 Utilisation

La fonction est appelée automatiquement depuis `src/features/ghost-text/services/aiSuggestions.ts` via `supabase.functions.invoke()`.

**Aucune clé API n'est exposée côté client.**






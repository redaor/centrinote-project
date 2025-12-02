# Guide de déploiement de l'Edge Function `index-note`

## Méthode 1 : Via Supabase Dashboard (Recommandé si Docker n'est pas disponible)

### Étape 1 : Accéder au Dashboard Supabase

1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Allez dans **Edge Functions** dans le menu de gauche

### Étape 2 : Créer une nouvelle Edge Function

1. Cliquez sur **"Create a new function"** ou **"New Function"**
2. Nommez-la : `index-note`
3. Cliquez sur **"Create function"**

### Étape 3 : Coller le code

Copiez-collez le contenu du fichier `supabase/functions/index-note/index.ts` dans l'éditeur.

### Étape 4 : Configurer les secrets

1. Allez dans **Settings** > **Edge Functions** > **Secrets**
2. Ajoutez la variable `OPENAI_API_KEY` avec votre clé API OpenAI

### Étape 5 : Déployer

Cliquez sur **"Deploy"** ou **"Save"**

---

## Méthode 2 : Via Supabase CLI (si Docker est disponible)

### Prérequis

1. Docker Desktop doit être en cours d'exécution
2. Supabase CLI installé et connecté

### Commandes

```bash
# 1. Se connecter à Supabase (si pas déjà fait)
supabase login

# 2. Lier votre projet (si pas déjà fait)
supabase link --project-ref YOUR_PROJECT_REF

# 3. Déployer la fonction
supabase functions deploy index-note
```

---

## Vérification après déploiement

### Test manuel

1. Créez une note dans votre application
2. Attendez quelques secondes
3. Vérifiez dans **Edge Functions** > **Logs** que `index-note` a été appelée
4. Vérifiez dans la base de données :

```sql
SELECT COUNT(*) FROM note_chunks_embeddings WHERE note_id = 'ID_DE_VOTRE_NOTE';
```

Si vous voyez des chunks, l'indexation fonctionne ! ✅

### Test via curl

```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/index-note \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "note_id": "uuid-de-la-note",
    "user_id": "uuid-de-l-utilisateur"
  }'
```

---

## Configuration du trigger SQL

Après avoir déployé l'Edge Function, le trigger SQL devrait fonctionner automatiquement.

Si ce n'est pas le cas, configurez l'URL Supabase dans la base de données :

```sql
ALTER DATABASE postgres SET app.settings.supabase_url = 'https://YOUR_PROJECT_REF.supabase.co';
```

Remplacez `YOUR_PROJECT_REF` par votre référence de projet (visible dans l'URL de votre dashboard).


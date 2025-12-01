# 🎤 Déploiement Edge Function transcribe-audio

## ⚠️ Problème identifié

Quand vous arrêtez l'enregistrement, vous êtes redirigé vers Netlify et la note n'enregistre pas l'audio. Cela signifie que **l'Edge Function Supabase n'est pas déployée**.

## ✅ Solution : Déployer l'Edge Function

### 1. Vérifier la connexion Supabase

```bash
# Vérifier que vous êtes connecté
supabase projects list

# Si pas connecté, se connecter
supabase login
```

### 2. Lier votre projet

```bash
# Récupérer votre Project Ref depuis le dashboard Supabase
# Puis lier le projet
supabase link --project-ref VOTRE_PROJECT_REF
```

### 3. Déployer l'Edge Function

```bash
# Depuis la racine du projet
supabase functions deploy transcribe-audio
```

### 4. Ajouter le secret OPENAI_API_KEY

1. Allez sur [Supabase Dashboard](https://supabase.com/dashboard)
2. Sélectionnez votre projet
3. Allez dans **Settings** → **Edge Functions** → **Secrets**
4. Cliquez sur **Add new secret**
5. Ajoutez :
   - **Name** : `OPENAI_API_KEY`
   - **Value** : Votre clé API OpenAI (la même que dans Netlify)

### 5. Vérifier le déploiement

```bash
# Lister les Edge Functions déployées
supabase functions list

# Vous devriez voir "transcribe-audio" avec status "Active"
```

## 🔍 Vérification dans le code

Après le déploiement, quand vous enregistrez un audio :

1. **Ouvrez la console du navigateur** (F12)
2. Vous devriez voir :
   ```
   🎤 Appel Edge Function transcribe-audio...
   📡 Réponse Edge Function: { status: 200, ok: true }
   ✅ Transcription réussie: { textLength: 123, preview: "..." }
   ```

3. Si vous voyez une erreur :
   ```
   ❌ Réponse HTML inattendue (redirection Netlify?)
   ```
   → L'Edge Function n'est pas déployée ou l'URL est incorrecte

## 🐛 Dépannage

### Erreur "Edge Function non trouvée"

**Cause** : L'Edge Function n'est pas déployée sur Supabase.

**Solution** :
```bash
supabase functions deploy transcribe-audio
```

### Erreur "OPENAI_API_KEY non configurée"

**Cause** : Le secret n'est pas configuré dans Supabase.

**Solution** : Ajoutez le secret dans Supabase Dashboard → Settings → Edge Functions → Secrets

### Redirection vers Netlify

**Cause** : L'URL Supabase est incorrecte ou l'Edge Function n'existe pas.

**Solution** :
1. Vérifiez `VITE_SUPABASE_URL` dans votre `.env`
2. Vérifiez que l'URL se termine par `.supabase.co` (pas `.netlify.app`)
3. Déployez l'Edge Function : `supabase functions deploy transcribe-audio`

## 📝 Checklist

- [ ] Supabase CLI installé : `supabase --version`
- [ ] Connecté à Supabase : `supabase login`
- [ ] Projet lié : `supabase link --project-ref XXX`
- [ ] Edge Function déployée : `supabase functions deploy transcribe-audio`
- [ ] Secret `OPENAI_API_KEY` ajouté dans Supabase Dashboard
- [ ] Test : Enregistrer un audio de test et vérifier la console

## 🎯 Test rapide

1. Ouvrez une note dans CentriNote
2. Cliquez sur "🎤 Enregistrer ce cours"
3. Parlez quelques secondes
4. Cliquez sur "Arrêter"
5. **Ouvrez la console** (F12) et vérifiez les logs
6. Le texte transcrit devrait apparaître dans la note

Si ça ne fonctionne pas, vérifiez les logs dans la console pour identifier l'erreur exacte.


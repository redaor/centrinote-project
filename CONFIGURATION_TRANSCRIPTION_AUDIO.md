# 🎤 Configuration de la transcription audio

## ✅ Solution sécurisée avec Edge Function Supabase

Le système utilise maintenant une **Edge Function Supabase** pour transcrire l'audio, ce qui permet d'utiliser votre `OPENAI_API_KEY` existante de Netlify de manière sécurisée.

## 📋 Configuration requise

### 1. Ajouter `OPENAI_API_KEY` dans Supabase

1. Allez sur [Supabase Dashboard](https://supabase.com/dashboard)
2. Sélectionnez votre projet
3. Allez dans **Settings** → **Edge Functions** → **Secrets**
4. Ajoutez un nouveau secret :
   - **Name** : `OPENAI_API_KEY`
   - **Value** : Votre clé API OpenAI (la même que dans Netlify)

### 2. Déployer l'Edge Function

```bash
# Depuis la racine du projet
supabase functions deploy transcribe-audio
```

### 3. Vérifier les variables d'environnement

Assurez-vous que ces variables sont configurées dans votre `.env` local (pour le dev) :

```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre_anon_key
```

Ces variables sont normalement déjà configurées si vous utilisez Supabase.

## 🔒 Sécurité

- ✅ La clé API OpenAI n'est **jamais** exposée au client
- ✅ L'Edge Function vérifie l'authentification de l'utilisateur
- ✅ Seuls les utilisateurs connectés peuvent transcrire
- ✅ La clé est stockée de manière sécurisée dans Supabase Secrets

## 🚀 Utilisation

Une fois configuré, le bouton "🎤 Enregistrer ce cours" fonctionnera automatiquement :
- Dans la modal de création de note
- Dans la barre d'outils d'une note existante

## ⚠️ Dépannage

Si vous voyez "Configuration Supabase manquante" :
- Vérifiez que `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` sont configurées

Si la transcription échoue :
- Vérifiez que `OPENAI_API_KEY` est bien configurée dans Supabase Secrets
- Vérifiez que l'Edge Function est déployée : `supabase functions list`


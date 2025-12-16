# 🎤 Déploiement Transcription Audio - OpenAI Whisper API

## 📋 Vue d'ensemble

Cette Edge Function utilise **OpenAI Whisper API** pour transcrire l'audio de manière illimitée et précise, remplaçant l'ancienne implémentation limitée à 3 minutes.

### ✅ Fonctionnalités

- ✅ **Transcription illimitée** (plus de limite 3 min)
- ✅ **Support multilingue** (détection automatique)
- ✅ **Formats multiples** : m4a, mp3, mp4, mpeg, mpga, wav, webm
- ✅ **Taille max** : 25MB par fichier
- ✅ **Gestion d'erreurs** améliorée avec codes spécifiques
- ✅ **Sécurité** : clé API stockée uniquement dans Supabase

---

## 🔧 Configuration

### 1. Variable d'environnement Supabase

Ajoutez la clé OpenAI dans les secrets Supabase :

```bash
# Via CLI Supabase
supabase secrets set OPENAI_TRANSCRIPTION_AUDIO_KEY=sk-xxx

# Ou via Dashboard Supabase
# Settings → Edge Functions → Secrets → Ajouter OPENAI_TRANSCRIPTION_AUDIO_KEY
```

**⚠️ Important** : Utilisez `OPENAI_TRANSCRIPTION_AUDIO_KEY` (pas `OPENAI_API_KEY`)

---

## 🚀 Déploiement

### 1. Déployer l'Edge Function

```bash
# Depuis la racine du projet
supabase functions deploy transcribe-audio
```

### 2. Vérifier le déploiement

```bash
# Lister les fonctions déployées
supabase functions list

# Vous devriez voir "transcribe-audio" avec status "Active"
```

### 3. Tester l'Edge Function

```bash
# Test avec curl (remplacez YOUR_PROJECT_REF et YOUR_ACCESS_TOKEN)
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/transcribe-audio \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "apikey: YOUR_ANON_KEY" \
  -F "file=@test-audio.webm"
```

---

## 📝 Utilisation côté client

### Hook React : `useLongRecording`

Le hook `src/hooks/useLongRecording.ts` appelle automatiquement l'Edge Function :

```typescript
const {
  isRecording,
  isTranscribing,
  startRecording,
  stopRecording,
  transcribedText,
} = useLongRecording();
```

### Exemple d'utilisation

```typescript
// Dans votre composant
import { useLongRecording } from '../hooks/useLongRecording';

function MyComponent() {
  const { 
    isRecording, 
    startRecording, 
    stopRecording, 
    transcribedText 
  } = useLongRecording();

  return (
    <div>
      <button onClick={isRecording ? stopRecording : startRecording}>
        {isRecording ? 'Arrêter' : 'Démarrer'} l'enregistrement
      </button>
      {transcribedText && <p>{transcribedText}</p>}
    </div>
  );
}
```

---

## 🔍 Gestion des erreurs

### Codes d'erreur OpenAI

| Code | Message | Solution |
|------|---------|----------|
| `invalid_api_key` | Clé API invalide | Vérifier `OPENAI_TRANSCRIPTION_AUDIO_KEY` dans Supabase |
| `insufficient_quota` | Quota dépassé | Contacter l'administrateur ou augmenter le quota |
| `rate_limit_exceeded` | Trop de requêtes | Attendre 1 minute avant de réessayer |
| `invalid_file_format` | Format non supporté | Utiliser m4a, mp3, mp4, mpeg, mpga, wav, webm |
| `file_too_large` | Fichier > 25MB | Réduire la taille du fichier ou diviser en chunks |

### Exemple de réponse d'erreur

```json
{
  "error": "Fichier trop volumineux (max 25MB)",
  "code": "file_too_large",
  "maxSize": 26214400,
  "actualSize": 30000000
}
```

---

## ✅ Tests requis

### 1. Audio court (30 secondes)
```bash
# Doit fonctionner normalement
```

### 2. Audio moyen (5 minutes)
```bash
# Doit fonctionner (vs échec avec ancienne implémentation)
```

### 3. Audio long (10 minutes)
```bash
# Doit fonctionner (illimité)
```

### 4. Fichier corrompu
```bash
# Doit retourner une erreur claire
```

### 5. Pas de connexion
```bash
# Doit gérer le fallback approprié
```

### 6. Format non supporté
```bash
# Doit retourner : "Format audio non supporté"
```

### 7. Fichier trop volumineux (> 25MB)
```bash
# Doit retourner : "Fichier trop volumineux (max 25MB)"
```

---

## 🔐 Sécurité

### ✅ Bonnes pratiques appliquées

- ✅ Clé API stockée uniquement dans Supabase (pas côté client)
- ✅ Authentification requise (Bearer token)
- ✅ Validation des fichiers (taille, format)
- ✅ Gestion d'erreurs sécurisée (pas d'exposition de détails sensibles)

### ⚠️ À ne pas faire

- ❌ Ne jamais exposer `OPENAI_TRANSCRIPTION_AUDIO_KEY` dans le code client
- ❌ Ne jamais stocker la clé dans `.env.local` ou variables Netlify
- ❌ Ne jamais logger la clé API dans les console.log

---

## 📊 Format de réponse

### Succès

```json
{
  "text": "Texte transcrit ici...",
  "language": "fr",
  "isMultilingual": false
}
```

### Erreur

```json
{
  "error": "Message d'erreur utilisateur",
  "code": "error_code",
  "details": "Détails techniques (optionnel)"
}
```

---

## 🔄 Migration depuis l'ancienne implémentation

### Changements

1. **Variable d'environnement** : `OPENAI_API_KEY` → `OPENAI_TRANSCRIPTION_AUDIO_KEY`
2. **Limite supprimée** : Plus de limite 3 minutes
3. **Gestion d'erreurs** : Codes spécifiques ajoutés
4. **Validation** : Taille et format validés côté serveur

### Actions requises

1. ✅ Ajouter `OPENAI_TRANSCRIPTION_AUDIO_KEY` dans Supabase Secrets
2. ✅ Déployer l'Edge Function mise à jour
3. ✅ Tester avec différents formats et durées
4. ⚠️ Supprimer l'ancienne variable `OPENAI_API_KEY` si elle n'est plus utilisée ailleurs

---

## 📚 Documentation OpenAI Whisper

- [Documentation officielle](https://platform.openai.com/docs/guides/speech-to-text)
- [Modèle Whisper-1](https://platform.openai.com/docs/models/whisper)
- [Limites et quotas](https://platform.openai.com/docs/guides/rate-limits)

---

## 🐛 Dépannage

### Erreur : "OPENAI_TRANSCRIPTION_AUDIO_KEY non configurée"

```bash
# Vérifier que la clé est bien définie
supabase secrets list

# Si absente, l'ajouter
supabase secrets set OPENAI_TRANSCRIPTION_AUDIO_KEY=sk-xxx
```

### Erreur : "Edge Function non trouvée"

```bash
# Vérifier que la fonction est déployée
supabase functions list

# Redéployer si nécessaire
supabase functions deploy transcribe-audio
```

### Erreur : "Quota dépassé"

- Vérifier le quota OpenAI dans le dashboard
- Attendre la réinitialisation du quota (mensuel)
- Contacter l'administrateur pour augmenter le quota

---

## ✅ Checklist de déploiement

- [ ] Variable `OPENAI_TRANSCRIPTION_AUDIO_KEY` ajoutée dans Supabase Secrets
- [ ] Edge Function `transcribe-audio` déployée
- [ ] Test avec audio 30 secondes : ✅
- [ ] Test avec audio 5 minutes : ✅
- [ ] Test avec audio 10 minutes : ✅
- [ ] Test avec fichier corrompu : ✅
- [ ] Test avec format non supporté : ✅
- [ ] Test avec fichier > 25MB : ✅
- [ ] Documentation mise à jour : ✅

---

**🎉 La transcription audio est maintenant prête avec Whisper API !**



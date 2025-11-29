# 📊 Explication : Pourquoi l'enregistrement ne se résume pas

**Date:** 2024-11-30  
**Problème:** Les enregistrements ne génèrent pas de résumé automatiquement

---

## 🔄 Flux normal de génération de résumé

### Étape 1 : Enregistrement terminé
1. L'utilisateur arrête l'enregistrement dans Daily.co
2. Daily.co traite l'enregistrement (quelques minutes)
3. Daily.co envoie un webhook `recording.ready-to-download`

### Étape 2 : Webhook Daily.co reçu
**Fichier:** `netlify/edge-functions/daily-recording-ready.ts`

1. ✅ Webhook reçu et vérifié (signature HMAC)
2. ✅ Récupération de l'URL de téléchargement via Daily API
3. ✅ Mise à jour de `meetings` avec `recording_url` et `recording_id`
4. ⚠️ **Appel à `generate-summary-auto`** (ligne 213)

### Étape 3 : Génération du résumé
**Fichier:** `netlify/functions/generate-summary-auto.js`

1. ✅ Télécharge l'audio depuis `recording_url`
2. ✅ Transcription avec OpenAI Whisper
3. ✅ Génération résumé avec GPT-4
4. ❌ **PROBLÈME:** Sauvegarde dans `meeting_summaries` (ligne 315)
5. ❌ **PROBLÈME:** Ne met PAS à jour `meetings.ai_summary`

### Étape 4 : Affichage du résumé
**Fichier:** `src/hooks/useSummary.ts`

1. ✅ Polling toutes les 5 secondes
2. ✅ Lit depuis `meetings.ai_summary` (ligne 109)
3. ❌ **PROBLÈME:** `ai_summary` n'est jamais mis à jour par `generate-summary-auto`

---

## 🔴 Problèmes identifiés

### Problème 1 : Table `meeting_summaries` vs `meetings.ai_summary`

**`generate-summary-auto.js` sauvegarde dans :**
```javascript
.from('meeting_summaries')  // ❌ Table séparée
```

**`useSummary.ts` lit depuis :**
```typescript
.from('meetings')  // ✅ Table meetings
.select('ai_summary')  // ❌ Colonne jamais mise à jour
```

**Résultat:** Le résumé est généré mais jamais visible car stocké dans la mauvaise table.

### Problème 2 : Deux systèmes parallèles

1. **Système 1:** `generate-summary-auto.js` → `meeting_summaries`
2. **Système 2:** `transcribe-audio.ts` → `meetings.ai_summary`

**Résultat:** Incohérence entre les deux systèmes.

### Problème 3 : Variables d'environnement

**`generate-summary-auto.js` nécessite :**
- ✅ `VITE_SUPABASE_URL`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`
- ❌ `OPENAI_API_KEY` ou `VITE_OPENAI_API_KEY` (peut être manquante)

**Si `OPENAI_API_KEY` manque :** La fonction retourne une erreur 500 et le résumé n'est jamais généré.

---

## ✅ Solutions

### Solution 1 : Mettre à jour `meetings.ai_summary` dans `generate-summary-auto.js`

**Fichier:** `netlify/functions/generate-summary-auto.js` (ligne 314)

**Avant :**
```javascript
const { data: savedSummary, error: saveError } = await supabase
  .from('meeting_summaries')
  .upsert(summaryData, { onConflict: 'meeting_id' })
  .select()
  .single();
```

**Après :**
```javascript
// Sauvegarder dans meeting_summaries (pour historique)
const { data: savedSummary, error: saveError } = await supabase
  .from('meeting_summaries')
  .upsert(summaryData, { onConflict: 'meeting_id' })
  .select()
  .single();

// ✅ AUSSI mettre à jour meetings.ai_summary pour l'affichage
if (!saveError && savedSummary) {
  const { error: updateError } = await supabase
    .from('meetings')
    .update({
      ai_summary: summary,
      transcript: {
        text: transcription,
        transcribed_at: new Date().toISOString()
      }
    })
    .eq('id', meetingId);

  if (updateError) {
    console.error('⚠️ Erreur mise à jour meetings.ai_summary:', updateError);
  } else {
    console.log('✅ meetings.ai_summary mis à jour');
  }
}
```

### Solution 2 : Vérifier les variables d'environnement Netlify

**Variables requises dans Netlify Dashboard :**
- ✅ `VITE_SUPABASE_URL`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`
- ✅ `OPENAI_API_KEY` ou `VITE_OPENAI_API_KEY`
- ✅ `DAILY_API_KEY`

**Vérification :**
1. Netlify Dashboard → Site settings → Environment variables
2. Vérifier que `OPENAI_API_KEY` est bien configurée
3. Redéployer si nécessaire

### Solution 3 : Vérifier les logs Netlify

**Dans Netlify Dashboard :**
1. Functions → `generate-summary-auto`
2. Vérifier les logs pour voir les erreurs
3. Chercher :
   - `OPENAI_API_KEY non configurée`
   - `Erreur génération résumé`
   - `Erreur sauvegarde résumé`

---

## 🔍 Diagnostic

### Comment vérifier si le résumé est généré ?

**1. Vérifier dans Supabase :**
```sql
-- Vérifier si meeting_summaries contient le résumé
SELECT * FROM meeting_summaries WHERE meeting_id = 'votre-meeting-id';

-- Vérifier si meetings.ai_summary est rempli
SELECT id, title, ai_summary, transcript FROM meetings WHERE id = 'votre-meeting-id';
```

**2. Vérifier les logs Netlify :**
- Functions → `daily-recording-ready` → Logs
- Functions → `generate-summary-auto` → Logs

**3. Vérifier dans la console navigateur :**
- Ouvrir DevTools → Console
- Chercher les logs `[USE-SUMMARY]` ou `[GENERATE-SUMMARY-AUTO]`

---

## 📋 Checklist de vérification

| Étape | Vérification | Statut |
|-------|--------------|--------|
| 1. Webhook Daily.co configuré | Vérifier dans Daily.co Dashboard | ⏳ |
| 2. `OPENAI_API_KEY` configurée | Netlify → Environment variables | ⏳ |
| 3. `generate-summary-auto` appelé | Logs Netlify Functions | ⏳ |
| 4. Résumé généré | Logs `✅ Résumé généré` | ⏳ |
| 5. `meetings.ai_summary` mis à jour | Requête SQL Supabase | ⏳ |
| 6. `useSummary` détecte le résumé | Console navigateur | ⏳ |

---

## 🎯 Action immédiate

**Corriger `generate-summary-auto.js` pour mettre à jour `meetings.ai_summary`**

C'est le problème principal : le résumé est généré mais stocké dans la mauvaise table, donc jamais visible dans l'UI.


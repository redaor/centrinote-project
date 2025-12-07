# 🔍 AUDIT COMPLET DU SYSTÈME DE GESTION DES ABONNEMENTS

**Date :** 2025-01-XX  
**Statut :** Analyse complète effectuée

---

## 📊 RÉSUMÉ EXÉCUTIF

Le système de gestion des abonnements est **partiellement implémenté**. La structure de base (base de données, fonctions SQL) est solide, mais plusieurs limitations ne sont **pas appliquées dans le frontend**.

---

## ✅ POINTS POSITIFS

### 1. Structure de Base de Données ✅
- ✅ Table `subscription_plans` bien structurée avec toutes les limites
- ✅ Table `user_subscriptions` pour lier utilisateurs et plans
- ✅ Table `user_quotas` pour le suivi mensuel des quotas
- ✅ Fonction `check_quota()` opérationnelle
- ✅ Fonction `get_user_plan()` opérationnelle
- ✅ Fonction `check_meeting_duration_limit()` opérationnelle

### 2. Plans Définis ✅
Les 4 plans sont correctement configurés dans la base de données :

| Plan | Tokens IA | Réunions | Durée max | Participants max | Résumés IA | Vocabulaire | Automations |
|------|-----------|----------|-----------|------------------|-------------|-------------|-------------|
| **Free** | 20k | 1/mois | 45 min | 3 | 1/mois | 50 mots, 3 coll. | 1 active |
| **Starter** | 150k | 10/mois | 45 min | 8 | 8/mois | 100 mots, 10 coll. | 5 actives |
| **Pro** | 600k | 20/mois | 60 min | 15 | Illimité | 500 mots, 50 coll. | Illimité |
| **Teams** | Illimité | 60/mois | 60 min | Illimité | Illimité | 1000 mots, illimité | Illimité |

---

## ❌ PROBLÈMES IDENTIFIÉS

### 1. 🚨 LIMITE DE PARTICIPANTS NON APPLIQUÉE

**Problème :** La limite de participants est **codée en dur à 20** dans tous les composants, au lieu d'être dynamique selon le plan.

**Fichiers concernés :**
- `src/components/meetings/ParticipantsFormV2.tsx` (ligne 30)
- `src/components/meetings/ParticipantsForm.tsx` (ligne 100)
- `src/components/meetings/ParticipantsBlock.tsx` (ligne 48)
- `src/hooks/useParticipantsForm.ts` (ligne 49)

**Code actuel :**
```typescript
const MAX_PARTICIPANTS = 20; // ❌ Codé en dur
```

**Solution requise :**
```typescript
// Récupérer la limite depuis le plan utilisateur
const userPlan = await getUserPlan(userId);
const MAX_PARTICIPANTS = userPlan?.meeting_max_participants || 20;
```

**Impact :** Les utilisateurs Free peuvent inviter jusqu'à 20 participants au lieu de 3, Starter jusqu'à 20 au lieu de 8, etc.

---

### 2. 🚨 BOUTON "GÉNÉRER RÉSUMÉ AUTOMATIQUE" TOUJOURS VISIBLE

**Problème :** Le bouton "Générer résumé automatique" est **toujours visible et activable** pour tous les utilisateurs, sans vérification de quota.

**Fichiers concernés :**
- `src/components/meetings/ModernMeetingForm.tsx` (lignes 228-305)
- `src/components/meetings/MeetingScheduler.tsx` (lignes 198-213)
- `src/components/meetings/MeetingList.tsx` (ligne 81)

**Code actuel :**
```typescript
const [enableAiSummary, setEnableAiSummary] = useState(false);
// ❌ Pas de vérification de quota avant activation
```

**Solution requise :**
1. Vérifier le quota `summary_count` avant d'afficher/activer le toggle
2. Masquer le toggle pour Free si quota épuisé
3. Afficher un message d'upgrade si quota atteint

**Impact :** Les utilisateurs Free peuvent générer des résumés illimités au lieu d'être limités à 1/mois.

---

### 3. ⚠️ TOKENS IA NON VÉRIFIÉS AVANT UTILISATION

**Problème :** Les tokens IA ne sont **pas vérifiés** avant d'envoyer des requêtes à l'IA.

**Fichiers concernés :**
- `src/hooks/useCentrinoteAI.ts`
- `src/hooks/useCentrinoteAI_Edge.ts`
- `src/services/aiConversationService.ts`

**Solution requise :**
```typescript
// Avant chaque requête IA
const quotaCheck = await checkQuota(userId, 'ai_tokens', estimatedTokens);
if (!quotaCheck.allowed) {
  throw new Error('Quota de tokens IA épuisé. Veuillez upgrader votre plan.');
}
// ... puis incrémenter après utilisation
await incrementQuota(userId, 'ai_tokens', actualTokensUsed);
```

**Impact :** Les utilisateurs peuvent dépasser leur quota de tokens IA sans restriction.

---

### 4. ⚠️ LIMITES DE NOTES NON APPLIQUÉES

**Problème :** Aucune vérification de quota pour la création de notes.

**Fichiers concernés :**
- `src/services/notesService.ts`
- `src/hooks/useNotes.ts`

**Solution requise :**
- Ajouter une vérification avant création (si limite définie pour Free)
- Note : Selon `planPrices.ts`, Free a "Notes illimitées (texte brut)", donc peut-être intentionnel

**Impact :** Potentiellement aucun si les notes sont vraiment illimitées pour tous.

---

### 5. ⚠️ LIMITES DE VOCABULAIRE PARTIELLEMENT APPLIQUÉES

**Problème :** Les limites de vocabulaire ne sont **pas vérifiées** avant l'ajout de mots.

**Fichiers concernés :**
- `src/services/vocabularyService.ts`
- `src/hooks/useVocabulary.ts`

**Solution requise :**
```typescript
// Avant d'ajouter un mot
const quotaCheck = await checkQuota(userId, 'vocab_words', 1);
if (!quotaCheck.allowed) {
  throw new Error(`Limite de vocabulaire atteinte (${quotaCheck.usage}/${quotaCheck.limit}).`);
}
// ... puis incrémenter après ajout
await incrementQuota(userId, 'vocab_words', 1);
```

**Impact :** Les utilisateurs Free peuvent ajouter plus de 50 mots, Starter plus de 100, etc.

---

### 6. ⚠️ LIMITES DE RÉUNIONS NON VÉRIFIÉES

**Problème :** Les limites de réunions (nombre et durée) ne sont **pas vérifiées** avant création.

**Fichiers concernés :**
- `src/components/meetings/MeetingList.tsx`
- `src/components/meetings/MeetingScheduler.tsx`
- `netlify/functions/create-meeting-v2.js`

**Solution requise :**
```typescript
// Avant création de réunion
const meetingQuota = await checkQuota(userId, 'meeting_count', 1);
if (!meetingQuota.allowed) {
  throw new Error('Quota de réunions épuisé pour ce mois.');
}

const durationCheck = await checkMeetingDurationLimit(userId, durationMinutes);
if (!durationCheck.allowed) {
  throw new Error(`Durée max : ${durationCheck.max_duration} min pour votre plan.`);
}

// ... puis incrémenter après création
await incrementQuota(userId, 'meeting_count', 1);
await incrementQuota(userId, 'meeting_minutes', durationMinutes);
```

**Impact :** Les utilisateurs peuvent créer plus de réunions que leur quota autorise.

---

## 📋 PLAN D'ACTION RECOMMANDÉ

### Priorité 1 (Critique) 🔴

1. **Appliquer la limite de participants dynamique**
   - Créer un hook `usePlanLimits()` pour récupérer les limites du plan
   - Remplacer tous les `MAX_PARTICIPANTS = 20` par la limite dynamique
   - Afficher un message d'upgrade si limite atteinte

2. **Restreindre le bouton "Générer résumé automatique"**
   - Vérifier le quota `summary_count` avant d'afficher le toggle
   - Masquer/désactiver le toggle si quota épuisé
   - Afficher un message d'upgrade

### Priorité 2 (Important) 🟠

3. **Vérifier les tokens IA avant utilisation**
   - Ajouter `checkQuota()` avant chaque requête IA
   - Estimer les tokens nécessaires
   - Bloquer la requête si quota insuffisant
   - Incrémenter après utilisation réelle

4. **Vérifier les limites de réunions**
   - Vérifier `meeting_count` et `meeting_minutes` avant création
   - Vérifier `meeting_max_duration_minutes` pour la durée
   - Afficher des messages d'erreur clairs

5. **Vérifier les limites de vocabulaire**
   - Vérifier `vocab_words` avant ajout
   - Bloquer l'ajout si limite atteinte
   - Afficher un message d'upgrade

### Priorité 3 (Amélioration) 🟡

6. **Créer un composant réutilisable pour les vérifications de quota**
   - `useQuotaCheck(feature, increment)`
   - Gestion automatique des erreurs
   - Messages d'upgrade standardisés

7. **Ajouter des indicateurs visuels de quota**
   - Afficher la progression des quotas dans l'UI
   - Avertir à 80% et 90% d'utilisation
   - Proposer l'upgrade automatiquement

---

## 🛠️ FICHIERS À MODIFIER

### Composants à modifier :
1. `src/components/meetings/ParticipantsFormV2.tsx`
2. `src/components/meetings/ParticipantsForm.tsx`
3. `src/components/meetings/ParticipantsBlock.tsx`
4. `src/components/meetings/ModernMeetingForm.tsx`
5. `src/components/meetings/MeetingScheduler.tsx`
6. `src/components/meetings/MeetingList.tsx`

### Hooks à modifier :
1. `src/hooks/useParticipantsForm.ts`
2. `src/hooks/useCentrinoteAI.ts`
3. `src/hooks/useCentrinoteAI_Edge.ts`
4. `src/hooks/useVocabulary.ts`
5. `src/hooks/useMeetings.tsx`

### Services à modifier :
1. `src/services/vocabularyService.ts`
2. `src/services/notesService.ts` (si limite nécessaire)
3. `src/services/aiConversationService.ts`

### Hooks à créer :
1. `src/hooks/usePlanLimits.ts` - Récupérer les limites du plan utilisateur
2. `src/hooks/useQuotaCheck.ts` - Vérifier et incrémenter les quotas

---

## 📝 NOTES IMPORTANTES

1. **Base de données :** Le système de quotas en base de données est **parfaitement fonctionnel**. Le problème est uniquement dans l'application frontend des limites.

2. **Migration nécessaire :** Aucune migration SQL supplémentaire n'est nécessaire. Les tables et fonctions existent déjà.

3. **Tests :** Après implémentation, tester avec chaque plan (Free, Starter, Pro, Teams) pour vérifier que les limites sont correctement appliquées.

4. **UX :** Les messages d'erreur doivent être clairs et proposer un upgrade vers un plan supérieur.

---

## ✅ CONCLUSION

Le système de gestion des abonnements a une **excellente base** (base de données, fonctions SQL), mais nécessite une **implémentation frontend complète** pour appliquer les limites définies.

**Statut global :** ⚠️ **Partiellement opérationnel** - Nécessite corrections frontend

**Temps estimé de correction :** 2-3 jours de développement

---

*Rapport généré automatiquement - Date : 2025-01-XX*


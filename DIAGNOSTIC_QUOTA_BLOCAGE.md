# 🔍 DIAGNOSTIC COMPLET : Blocage des Quotas IA

## 📋 RÉSUMÉ DE L'ANALYSE

J'ai analysé ton code et identifié **PLUSIEURS CAUSES POTENTIELLES** pour lesquelles le blocage des quotas pourrait ne pas fonctionner correctement.

---

## ✅ CE QUI EST BIEN IMPLÉMENTÉ

### 1. Architecture du système de quotas

Le code est correctement structuré avec :

- **`quotaService.ts`** : Service de base pour `checkQuota()` et `incrementQuota()`
- **`useQuotaCheck.ts`** : Hook pour vérifier les quotas (retourne `allowed: boolean`)
- **`useQuotaLimit.tsx`** : Hook avec modal automatique (`checkAndShowModal`)
- **Gestion admin** : Les admins ont accès illimité partout (correct ✅)
- **Fail-safe** : En cas d'erreur, `checkQuota()` retourne `allowed: false` (sécurisé ✅)

### 2. Pattern utilisé dans ModernNotesManager.tsx

```typescript
// ✅ Ligne 205-234: Vérification de l'accès au chargement
useEffect(() => {
  if (user?.role === 'admin') {
    setHasAIAccess(true);
    return;
  }

  const result = await checkQuota('ai_help_count', 0); // 0 = pas d'incrémentation
  setHasAIAccess(result.allowed);
}, [user?.id, user?.role, checkQuota]);

// ✅ Ligne 738: Bouton désactivé si pas d'accès
<AIContentHelper disabled={!hasAIAccess} />

// ✅ Ligne 747-753: Double vérification avant utilisation
if (user?.role !== 'admin') {
  const canUse = await checkQuotaWithModal('ai_help', 1);
  if (!canUse) {
    return; // BLOCAGE
  }
}
```

---

## 🚨 CAUSES POSSIBLES DU PROBLÈME

### ⚠️ CAUSE #1 : Incohérence dans les noms de features

**PROBLÈME DÉTECTÉ** : Le code utilise **DEUX noms différents** pour la même fonctionnalité :

| Endroit | Nom de feature utilisé |
|---------|------------------------|
| `useEffect` (vérification accès) ligne 230 | `'ai_help_count'` |
| `checkQuotaWithModal` (utilisation) ligne 748 | `'ai_help'` ❌ |
| `checkQuotaWithModal` (utilisation) ligne 2106 | `'ai_help'` ❌ |

**CONSÉQUENCE** :
- Au chargement, on vérifie `ai_help_count` → `hasAIAccess = true/false`
- Mais à l'utilisation, on vérifie `ai_help` (qui pourrait ne pas exister en BDD)
- Si `ai_help` n'existe pas dans `plan_limits`, la RPC retourne `allowed: true` par défaut

**SOLUTION** :
```typescript
// ❌ MAUVAIS (actuel)
const canUse = await checkQuotaWithModal('ai_help', 1);

// ✅ BON (à corriger)
const canUse = await checkQuotaWithModal('ai_help_count', 1);
```

---

### ⚠️ CAUSE #2 : Le quota `ai_help_count` n'existe peut-être pas dans la BDD

**PROBLÈME POTENTIEL** : La colonne `ai_help_count` pourrait ne pas être définie dans `plan_limits`.

**VÉRIFICATION À FAIRE** :
```sql
-- Exécute dans Supabase SQL Editor :
SELECT name, ai_help_count FROM plan_limits pl
JOIN subscription_plans sp ON sp.id = pl.plan_id;
```

**RÉSULTAT ATTENDU POUR LE PLAN FREE** :
```
name  | ai_help_count
------|---------------
free  | 3
```

Si `ai_help_count` est `NULL` ou n'existe pas :
- La fonction `check_quota()` peut retourner `allowed: true` par défaut
- Le blocage ne fonctionne jamais

---

### ⚠️ CAUSE #3 : La RPC `check_quota` ne gère peut-être pas `ai_help_count`

**PROBLÈME POTENTIEL** : La fonction PostgreSQL `check_quota()` pourrait être codée en dur pour certaines features seulement (comme `ai_tokens`, `meeting_count`, etc.) et ne pas prendre en compte `ai_help_count`.

**VÉRIFICATION À FAIRE** :
```sql
-- Affiche le code de la fonction check_quota
SELECT prosrc FROM pg_proc WHERE proname = 'check_quota';
```

**POINTS À VÉRIFIER** dans le code de la fonction :
- Est-ce que `ai_help_count` est mappé à `pl.ai_help_count` ?
- Ou est-ce qu'il y a un `CASE WHEN` qui ne gère que certaines features ?

---

### ⚠️ CAUSE #4 : Le hook `useQuotaLimit` a un fallback vers `ai_tokens`

**PROBLÈME DÉTECTÉ** dans `useQuotaLimit.tsx` lignes 62-103 :

```typescript
if (feature === 'ai_help') {
  try {
    const quotaCheck = await checkQuota(user.id, 'ai_help_count', increment);
    // ...
  } catch (error) {
    // ❌ FALLBACK DANGEREUX : Si ai_help_count échoue, on utilise ai_tokens
    const quotaCheck = await checkQuota(user.id, 'ai_tokens', safeIncrement);
    // ...
  }
}
```

**CONSÉQUENCE** :
- Si `ai_help_count` lève une erreur (ex: colonne inexistante), le code passe à `ai_tokens`
- Si `ai_tokens` n'est pas épuisé, l'utilisateur peut quand même utiliser l'IA
- Mais `hasAIAccess` est basé sur `ai_help_count` → **INCOHÉRENCE**

---

### ⚠️ CAUSE #5 : Le `disabled={!hasAIAccess}` n'empêche peut-être pas le clic

**PROBLÈME POTENTIEL** : Le composant `AIContentHelper` pourrait :
- Ignorer la prop `disabled`
- Afficher le bouton en grisé mais rester cliquable (bug CSS)
- Ne pas propager correctement le `disabled` au bouton HTML

**VÉRIFICATION À FAIRE** :
1. Inspecte le bouton "Aide IA" dans le navigateur (F12)
2. Vérifie si l'attribut HTML `disabled` est présent :
   ```html
   <!-- ✅ Devrait être : -->
   <button disabled="">Aide IA</button>

   <!-- ❌ Si c'est : -->
   <button class="opacity-50 cursor-not-allowed">Aide IA</button>
   ```

---

## 🎯 PLAN D'ACTION : COMMENT DÉBUGGER

### ÉTAPE 1 : Vérifier l'état des quotas dans Supabase

1. Ouvre Supabase → SQL Editor
2. Exécute le script `supabase/test_quota_debug.sql`
3. **Remplace `'USER_ID_ICI'` par ton vrai ID utilisateur** (récupérable dans la console avec `console.log(user.id)`)
4. Exécute la **SECTION 10** pour avoir un diagnostic complet :
   ```sql
   -- Copie tout depuis "WITH user_info AS" jusqu'à la fin
   -- et remplace USER_ID_ICI par ton ID
   ```

**RÉSULTAT ATTENDU** :
```json
{
  "user_id": "abc123...",
  "email": "ton@email.com",
  "role": "user",
  "plan_name": "free",
  "current_usage": 3,
  "quota_limit": 3,
  "has_access": false,  // ✅ Devrait être FALSE si quota épuisé
  "percentage_used": 100.00
}
```

Si `has_access: true` alors que `current_usage >= quota_limit`, **la BDD ne bloque pas** → problème dans la RPC.

---

### ÉTAPE 2 : Vérifier les logs console dans le navigateur

1. Ouvre ta page de notes (ou vocabulaire)
2. Ouvre la console navigateur (F12 → Console)
3. Regarde les logs au chargement de la page :

**LOGS ATTENDUS** :
```
🔍 DEBUG QUOTA - useEffect démarré
🔍 user.role: "user"
🔍 user.id: "abc123..."
🔍 Vérification quota pour user: abc123...
🔍 Résultat checkQuota: {allowed: false, usage: 3, limit: 3, percentage: 100}
🔍 hasAIAccess vaudra: false
```

Si `hasAIAccess vaudra: true` alors que `usage >= limit`, **le problème est dans `checkQuota()`**.

---

### ÉTAPE 3 : Tester le bouton "Aide IA"

1. Clique sur le bouton "Aide IA" (ou "Générer avec l'IA")
2. Regarde les logs console :

**LOGS ATTENDUS SI QUOTA ÉPUISÉ** :
```
🔍 DEBUG - AIContentHelper onApply appelé
🔍 hasAIAccess: false
🔍 user.role: "user"
🔍 Vérification quota AVANT amélioration (non-admin)
🔍 canUse: false
🔍 BLOCAGE - canUse=false
```

**LOGS SI LE BUG SE PRODUIT** (utilisateur peut quand même utiliser) :
```
🔍 DEBUG - AIContentHelper onApply appelé
🔍 hasAIAccess: true  // ❌ POURQUOI TRUE ??
🔍 user.role: "user"
🔍 Vérification quota AVANT amélioration (non-admin)
🔍 canUse: true  // ❌ POURQUOI TRUE ??
🔍 PAS DE BLOCAGE - continuation
```

---

### ÉTAPE 4 : Vérifier le network (appels réseau)

1. Ouvre F12 → Network
2. Filtre par "check_quota"
3. Clique sur "Aide IA"
4. Regarde la réponse de l'appel RPC `check_quota` :

**RÉPONSE ATTENDUE SI QUOTA ÉPUISÉ** :
```json
{
  "allowed": false,
  "usage": 3,
  "limit": 3,
  "percentage": 100,
  "message": "Quota épuisé pour ai_help_count"
}
```

**SI LE BUG** : `allowed: true` malgré `usage >= limit`

---

## 🛠️ SOLUTIONS SELON LE DIAGNOSTIC

### ✅ SOLUTION 1 : Uniformiser les noms de features

**SI LE PROBLÈME** : `ai_help` vs `ai_help_count`

**FICHIER** : `src/components/documents/ModernNotesManager.tsx`

```typescript
// Ligne 748 et 2106 - AVANT :
const canUse = await checkQuotaWithModal('ai_help', 1);

// APRÈS :
const canUse = await checkQuotaWithModal('ai_help_count', 1);
```

---

### ✅ SOLUTION 2 : Ajouter `ai_help_count` dans `plan_limits`

**SI LE PROBLÈME** : La colonne `ai_help_count` n'existe pas

**FICHIER** : Migration SQL Supabase

```sql
-- 1. Vérifier si la colonne existe
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'plan_limits' AND column_name = 'ai_help_count';

-- 2. Si elle n'existe pas, la créer
ALTER TABLE plan_limits
ADD COLUMN ai_help_count INTEGER DEFAULT 3;

-- 3. Définir les limites par plan
UPDATE plan_limits SET ai_help_count = 3
WHERE plan_id = (SELECT id FROM subscription_plans WHERE name = 'free');

UPDATE plan_limits SET ai_help_count = 50
WHERE plan_id = (SELECT id FROM subscription_plans WHERE name = 'starter');

UPDATE plan_limits SET ai_help_count = -1
WHERE plan_id IN (
  SELECT id FROM subscription_plans WHERE name IN ('pro', 'teams')
);
```

---

### ✅ SOLUTION 3 : Corriger la RPC `check_quota`

**SI LE PROBLÈME** : La fonction PostgreSQL ne gère pas `ai_help_count`

**FICHIER** : Migration SQL Supabase

```sql
CREATE OR REPLACE FUNCTION check_quota(
  p_user_id UUID,
  p_feature TEXT,
  p_increment INT DEFAULT 1
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_limit INTEGER;
  v_usage INTEGER;
  v_allowed BOOLEAN;
  v_plan_name TEXT;
  v_plan_display_name TEXT;
  v_percentage NUMERIC;
BEGIN
  -- Récupérer le plan de l'utilisateur
  SELECT sp.name, sp.display_name
  INTO v_plan_name, v_plan_display_name
  FROM user_subscriptions us
  JOIN subscription_plans sp ON sp.id = us.plan_id
  WHERE us.user_id = p_user_id AND us.status = 'active'
  LIMIT 1;

  -- Si pas d'abonnement, utiliser le plan Free
  IF v_plan_name IS NULL THEN
    v_plan_name := 'free';
    v_plan_display_name := 'Free';
  END IF;

  -- Récupérer la limite selon la feature
  SELECT
    CASE p_feature
      WHEN 'ai_help_count' THEN pl.ai_help_count
      WHEN 'ai_tokens' THEN pl.ai_tokens
      WHEN 'meeting_count' THEN pl.meeting_count
      WHEN 'summary_count' THEN pl.summary_count
      WHEN 'vocab_words' THEN pl.vocab_words
      ELSE 0
    END
  INTO v_limit
  FROM plan_limits pl
  JOIN subscription_plans sp ON sp.id = pl.plan_id
  WHERE sp.name = v_plan_name;

  -- Si limite illimitée (-1), autoriser
  IF v_limit = -1 THEN
    RETURN json_build_object(
      'allowed', true,
      'usage', 0,
      'limit', 'unlimited',
      'percentage', 0,
      'plan_name', v_plan_name,
      'plan_display_name', v_plan_display_name
    );
  END IF;

  -- Récupérer l'usage actuel
  SELECT COALESCE(usage_count, 0)
  INTO v_usage
  FROM user_quotas
  WHERE user_id = p_user_id
    AND feature = p_feature
    AND usage_month = TO_CHAR(CURRENT_DATE, 'YYYY-MM');

  -- Calculer si autorisé
  v_allowed := (v_usage + p_increment) <= v_limit;

  -- Calculer le pourcentage
  IF v_limit > 0 THEN
    v_percentage := ROUND((v_usage::NUMERIC / v_limit::NUMERIC) * 100, 2);
  ELSE
    v_percentage := 0;
  END IF;

  RETURN json_build_object(
    'allowed', v_allowed,
    'usage', v_usage,
    'limit', v_limit,
    'percentage', v_percentage,
    'plan_name', v_plan_name,
    'plan_display_name', v_plan_display_name
  );
END;
$$;
```

---

### ✅ SOLUTION 4 : Retirer le fallback vers `ai_tokens`

**SI LE PROBLÈME** : Le try/catch masque l'erreur

**FICHIER** : `src/hooks/useQuotaLimit.tsx`

```typescript
// Lignes 62-103 - AVANT :
if (feature === 'ai_help') {
  try {
    const quotaCheck = await checkQuota(user.id, 'ai_help_count', increment);
    // ...
  } catch (error) {
    // ❌ Fallback vers ai_tokens
    const quotaCheck = await checkQuota(user.id, 'ai_tokens', safeIncrement);
    // ...
  }
}

// APRÈS :
if (feature === 'ai_help') {
  const quotaCheck = await checkQuota(user.id, 'ai_help_count', increment);
  if (!quotaCheck.allowed) {
    setModalData({...});
    setIsModalOpen(true);
    return false;
  }
  return true;
}
```

---

## 📊 TABLEAU DE DIAGNOSTIC RAPIDE

| Symptôme | Cause probable | Solution |
|----------|----------------|----------|
| Console : `hasAIAccess: true` malgré quota épuisé | `checkQuota('ai_help_count')` retourne `allowed: true` | Vérifier la RPC + BDD (Solutions 2 ou 3) |
| Console : `canUse: true` malgré quota épuisé | `checkQuotaWithModal('ai_help')` au lieu de `'ai_help_count'` | Uniformiser les noms (Solution 1) |
| Network : `check_quota` retourne `allowed: true` | Limite mal configurée en BDD | Ajouter `ai_help_count` (Solution 2) |
| Bouton cliquable malgré `disabled={!hasAIAccess}` | Problème dans `AIContentHelper` | Vérifier le composant |
| Modal ne s'affiche jamais | Erreur silencieuse dans `checkQuotaWithModal` | Vérifier les logs d'erreur |

---

## 🎯 PROCHAINES ÉTAPES

1. **EXÉCUTE** le script SQL `supabase/test_quota_debug.sql` avec ton user ID
2. **COPIE** les résultats de la SECTION 10 et montre-les moi
3. **OUVRE** la console navigateur et **COPIE** tous les logs `🔍 DEBUG`
4. **TESTE** en cliquant sur "Aide IA" et **COPIE** les nouveaux logs
5. **VÉRIFIE** l'onglet Network pour voir la réponse de `check_quota`

Une fois que tu as ces informations, on pourra identifier **LA CAUSE EXACTE** et appliquer **LA BONNE SOLUTION**.

---

## 📝 CHECKLIST DE VÉRIFICATION

- [ ] Script SQL exécuté avec le bon user ID
- [ ] Résultat de la SECTION 10 copié
- [ ] Console navigateur ouverte (F12)
- [ ] Logs au chargement de la page copiés
- [ ] Logs au clic sur "Aide IA" copiés
- [ ] Onglet Network vérifié pour `check_quota`
- [ ] Réponse HTTP de `check_quota` copiée

Fournis-moi ces informations et je pourrai te dire **EXACTEMENT** où est le problème ! 🎯

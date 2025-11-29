# 📚 Guide d'utilisation du système de Quotas

## Vue d'ensemble

Le système de quotas permet de limiter l'utilisation des features selon le plan de l'utilisateur (Free, Starter, Pro, Teams).

## Architecture

```
Frontend (React)
    ↓
quotaService.ts (API client)
    ↓
Supabase RPC Functions
    ↓
PostgreSQL (subscription_plans, user_quotas, user_subscriptions)
```

## Utilisation basique

### 1. Vérifier un quota avant utilisation

```typescript
import { checkQuota, incrementQuota } from '../services/quotaService';

async function sendAIRequest(userId: string, prompt: string) {
  // 1. Estimer les tokens (approx 1 token = 4 caractères)
  const estimatedTokens = Math.ceil(prompt.length / 4);

  // 2. Vérifier le quota AVANT l'appel API
  const quotaCheck = await checkQuota(userId, 'ai_tokens', estimatedTokens);

  if (!quotaCheck.allowed) {
    // Afficher modal upgrade
    showUpgradeModal({
      feature: 'Recherche IA',
      usage: quotaCheck.usage,
      limit: quotaCheck.limit,
      message: quotaCheck.message
    });
    return;
  }

  // 3. Effectuer l'appel API
  const response = await callOpenAI(prompt);

  // 4. Incrémenter avec usage réel
  const actualTokens = response.usage.total_tokens;
  await incrementQuota(userId, 'ai_tokens', actualTokens);

  return response;
}
```

### 2. Vérifier la durée d'une réunion

```typescript
import { checkMeetingDurationLimit, checkQuota, incrementQuota } from '../services/quotaService';

async function createMeeting(userId: string, durationMinutes: number) {
  // 1. Vérifier durée max autorisée
  const durationCheck = await checkMeetingDurationLimit(userId, durationMinutes);

  if (!durationCheck.allowed) {
    alert(`Durée max autorisée : ${durationCheck.max_duration} min. Upgradez vers Pro pour 60 min !`);
    return;
  }

  // 2. Vérifier nombre de réunions restantes
  const countCheck = await checkQuota(userId, 'meeting_count', 1);

  if (!countCheck.allowed) {
    showUpgradeModal({
      feature: 'Réunions',
      usage: countCheck.usage,
      limit: countCheck.limit
    });
    return;
  }

  // 3. Créer la réunion
  const meeting = await createMeetingInDB({ userId, duration: durationMinutes });

  // 4. Incrémenter les compteurs
  await incrementQuota(userId, 'meeting_count', 1);
  await incrementQuota(userId, 'meeting_minutes', durationMinutes);

  return meeting;
}
```

### 3. Ajouter un mot au vocabulaire

```typescript
async function addVocabWord(userId: string, word: string) {
  // Vérifier quota
  const quotaCheck = await checkQuota(userId, 'vocab_words', 1);

  if (!quotaCheck.allowed) {
    // Soft limit : autoriser mais afficher warning
    if (quotaCheck.percentage >= 90) {
      showWarning(`Vous avez atteint ${quotaCheck.usage}/${quotaCheck.limit} mots. Upgradez pour ajouter plus !`);
    }

    // Hard limit : bloquer
    if (quotaCheck.percentage >= 100) {
      showUpgradeModal({ feature: 'Vocabulaire', ...quotaCheck });
      return;
    }
  }

  // Ajouter le mot
  const vocab = await saveWordToDB(word);

  // Incrémenter
  await incrementQuota(userId, 'vocab_words', 1);

  return vocab;
}
```

## Features trackées

| Feature | Clé | Unité | Exemple |
|---------|-----|-------|---------|
| Recherche IA | `ai_tokens` | tokens IN+OUT | 1000 tokens |
| Nombre réunions | `meeting_count` | réunions | 5 réunions |
| Durée réunions | `meeting_minutes` | minutes | 120 minutes |
| Résumés IA | `summary_count` | résumés | 3 résumés |
| Mots vocabulaire | `vocab_words` | mots | 150 mots |
| Collections vocab | `vocab_collections` | collections | 5 collections |
| Notifications | `notifications` | envois | 50 notifications |
| Automations actives | `automations_active` | automations | 3 automations |
| Exécutions automations | `automations_executions` | exécutions | 200 exécutions |

## Récupérer tous les quotas

```typescript
import { getUserQuotas } from '../services/quotaService';

const quotas = await getUserQuotas(userId);

console.log(quotas);
// [
//   { feature: 'ai_tokens', usage: 5000, limit: 20000, percentage: 25, ... },
//   { feature: 'meeting_count', usage: 1, limit: 2, percentage: 50, ... },
//   ...
// ]
```

## Afficher le QuotaBar

```tsx
import { QuotaBar } from '../components/quota/QuotaBar';

function SettingsPage() {
  return (
    <div>
      <h1>Paramètres</h1>

      {/* QuotaBar dans sidebar ou section dédiée */}
      <QuotaBar />

      {/* Reste du contenu */}
    </div>
  );
}
```

## Gestion des alertes

### Seuils recommandés

| Seuil | Action | UX |
|-------|--------|-----|
| **< 60%** | ✅ Rien | Usage normal |
| **60-80%** | 🟡 Warning doux | Badge jaune discret |
| **80-90%** | 🟠 Warning fort | Banner orange "Bientôt atteint" |
| **90-100%** | 🔴 Alert critique | Modal "Upgrade maintenant" |
| **≥ 100%** | 🚫 Blocage | Hard block + modal obligatoire |

### Exemple d'implémentation

```typescript
function showQuotaAlert(quotaCheck: QuotaCheckResult) {
  if (quotaCheck.percentage >= 100) {
    // Hard block
    showModal({
      title: '🚫 Quota dépassé',
      message: `Vous avez utilisé ${quotaCheck.usage}/${quotaCheck.limit}. Upgradez pour continuer.`,
      buttons: [
        { label: 'Upgrade', action: () => window.location.href = '/launch' }
      ],
      closable: false
    });
  } else if (quotaCheck.percentage >= 90) {
    // Critical warning
    showModal({
      title: '⚠️ Quota bientôt atteint',
      message: `Plus que ${quotaCheck.limit - quotaCheck.usage} restants !`,
      buttons: [
        { label: 'Plus tard', action: () => closeModal() },
        { label: 'Voir les offres', action: () => window.location.href = '/launch' }
      ]
    });
  } else if (quotaCheck.percentage >= 80) {
    // Soft warning
    showToast({
      type: 'warning',
      message: `Vous avez utilisé ${quotaCheck.percentage}% de votre quota ${quotaCheck.plan_display_name}`
    });
  }
}
```

## Edge Functions (Backend)

### Exemple : Netlify Function avec quota check

```typescript
// netlify/functions/ai-search.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function handler(event: any) {
  const { userId, prompt } = JSON.parse(event.body);

  // 1. Vérifier quota
  const { data: quotaCheck, error } = await supabase.rpc('check_quota', {
    p_user_id: userId,
    p_feature: 'ai_tokens',
    p_increment: Math.ceil(prompt.length / 4)
  });

  if (!quotaCheck.allowed) {
    return {
      statusCode: 429, // Too Many Requests
      body: JSON.stringify({
        error: 'quota_exceeded',
        ...quotaCheck
      })
    };
  }

  // 2. Appeler OpenAI
  const aiResponse = await callOpenAI(prompt);

  // 3. Incrémenter quota
  await supabase.rpc('increment_quota', {
    p_user_id: userId,
    p_feature: 'ai_tokens',
    p_amount: aiResponse.usage.total_tokens
  });

  return {
    statusCode: 200,
    body: JSON.stringify(aiResponse)
  };
}
```

## Plans disponibles

### Free
- 20k tokens IA
- 1 réunion 45 min
- 1 résumé IA
- 50 mots
- 1 automation

### Starter (9,99€/mois)
- 150k tokens IA
- 10 réunions 45 min
- 5-8 résumés IA
- 100 mots
- 5 automations

### Pro (19,99€/mois)
- 600k tokens IA
- 20 réunions 60 min
- Résumés illimités
- 500 mots
- Automations illimitées

### Teams (39,99€/mois)
- Tokens illimités
- 60 réunions 60 min
- Tout illimité
- 1000 mots
- Admin dashboard

## Fonctions SQL disponibles

### `check_quota(user_id, feature, increment)`
Vérifie si l'utilisateur peut consommer une feature.

**Retour** :
```json
{
  "allowed": true,
  "usage": 5000,
  "limit": 20000,
  "percentage": 25,
  "plan_name": "free",
  "plan_display_name": "Free"
}
```

### `increment_quota(user_id, feature, amount)`
Incrémente le compteur d'usage.

### `check_meeting_duration_limit(user_id, duration_minutes)`
Vérifie si la durée de réunion est autorisée.

**Retour** :
```json
{
  "allowed": true,
  "max_duration": 45,
  "requested_duration": 30
}
```

### `get_user_plan(user_id)`
Retourne le plan actif de l'utilisateur (ou Free par défaut).

### `reset_monthly_quotas()`
Reset tous les quotas le 1er du mois (cron job).

## Best Practices

1. **Toujours vérifier AVANT** de consommer
2. **Incrémenter APRÈS** avec usage réel
3. **Gérer gracefully** les erreurs de quota
4. **Afficher des messages clairs** à l'utilisateur
5. **Proposer upgrade** au bon moment (80-90%)
6. **Ne jamais bloquer brutalement** (grace period)

## Troubleshooting

### Quota non mis à jour
```typescript
// Forcer refresh des quotas
const quotas = await getUserQuotas(userId);
```

### Quota négatif
```sql
-- Reset manuel d'un quota
UPDATE user_quotas
SET ai_tokens_used = 0
WHERE user_id = 'USER_ID' AND period_start = date_trunc('month', now());
```

### Plan non reconnu
```sql
-- Vérifier subscription
SELECT * FROM user_subscriptions WHERE user_id = 'USER_ID';

-- Assigner plan Free par défaut si besoin
INSERT INTO user_subscriptions (user_id, plan_id)
VALUES ('USER_ID', (SELECT id FROM subscription_plans WHERE name = 'free'));
```

## Monitoring

### Métriques à suivre

1. **Taux de dépassement** : % users qui dépassent leur quota
2. **Conversion upgrade** : % users qui upgrade après quota warning
3. **Churn post-blocage** : % users qui partent après hard block
4. **Moyenne d'usage** : usage moyen par plan

```sql
-- Users proches de la limite (≥80%)
SELECT
  u.email,
  q.ai_tokens_used,
  sp.ai_tokens_limit,
  (q.ai_tokens_used::NUMERIC / sp.ai_tokens_limit::NUMERIC * 100) AS percentage
FROM user_quotas q
JOIN auth.users u ON u.id = q.user_id
JOIN user_subscriptions us ON us.user_id = q.user_id
JOIN subscription_plans sp ON sp.id = us.plan_id
WHERE sp.ai_tokens_limit IS NOT NULL
  AND (q.ai_tokens_used::NUMERIC / sp.ai_tokens_limit::NUMERIC) >= 0.8
ORDER BY percentage DESC;
```

---

**Documentation générée le 2024-11-29**

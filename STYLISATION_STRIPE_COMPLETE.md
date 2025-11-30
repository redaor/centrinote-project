# ✅ Stylisation Stripe - Implémentation Complète

**Date:** 2024-11-30  
**Statut:** ✅ Terminé

---

## 📋 Résumé

Système de stylisation complet pour les prix Stripe, sans IDs bruts dans le code. Utilise des variables d'environnement stylisées et un mapping automatique.

---

## 1. ✅ Variables d'environnement (Netlify)

```env
VITE_PRICE_ID_starter_normal=price_xxx
VITE_PRICE_ID_starter_promo=price_xxx
VITE_PRICE_ID_PRO_normal=price_xxx
VITE_PRICE_ID_pro_promo=price_xxx
VITE_PRICE_ID_teams_normal=price_xxx
VITE_PRICE_ID_teams_promo=price_xxx
```

**✅ Déjà configurées dans Netlify**

---

## 2. ✅ Stylisation côté client

**Fichier:** `src/config/stripePrices.ts`

### Fonctionnalités:
- ✅ `STRIPE_PRICES` - Objet stylisé avec normal/promo
- ✅ `getPriceId(plan, usePromo)` - Récupère price_id selon plan et promo
- ✅ `getPriceIdAuto(plan)` - Version sync (utilise cache localStorage)
- ✅ `getPriceIdAutoAsync(plan)` - Version async (vérifie promo_end_date)
- ✅ `isPromoActive(plan?)` - Vérifie si promo active depuis DB
- ✅ `isPromoActiveSync(plan?)` - Version sync avec cache
- ✅ `getPlanNameFromPriceId(priceId)` - Mapping inverse price_id → plan

### Utilisation:
```ts
import { getPriceIdAuto, STRIPE_PRICES } from '@/config/stripePrices';

// Utiliser prix promo si actif
const priceId = getPriceIdAuto('starter');

// Ou forcer promo/normal
const priceIdPromo = getPriceId('starter', true);
const priceIdNormal = getPriceId('starter', false);
```

---

## 3. ✅ Stylisation côté serveur (Edge Function)

**Fichier:** `supabase/functions/stripe-webhook/index.ts`

### Modifications:
- ✅ Utilise `STRIPE_PRICES` (via `Deno.env.get()`) en fallback
- ✅ Mapping stylisé: `Object.entries(STRIPE_PRICES).find(...)`
- ✅ Priorité: metadata → stripe_price_mapping → STRIPE_PRICES

### Code:
```ts
const STRIPE_PRICES = {
  starter: {
    normal: Deno.env.get('VITE_PRICE_ID_starter_normal')!,
    promo: Deno.env.get('VITE_PRICE_ID_starter_promo')!,
  },
  // ...
};

const foundPlan = Object.entries(STRIPE_PRICES)
  .find(([, prices]) => Object.values(prices).includes(priceId))?.[0];
```

---

## 4. ✅ Service de checkout par plan name

**Fichier:** `src/services/planCheckoutService.ts`

### Fonctionnalités:
- ✅ `checkoutPlan(planName, userEmail, userToken)` - Lance checkout depuis plan name
- ✅ `checkoutPlanSync(...)` - Version sync avec cache
- ✅ Convertit automatiquement plan name → price_id (promo si active)

### Utilisation:
```ts
import { planCheckoutService } from '@/services/planCheckoutService';

// Lancer checkout pour starter (utilise promo si active)
const result = await planCheckoutService.checkoutPlan(
  'starter',
  user.email,
  userToken
);

if (result.success && result.url) {
  window.location.href = result.url;
}
```

---

## 5. ✅ Intégration dans les routes

### `/register?plan=starter`
**Fichier:** `src/components/routing/AppRouter.tsx`

- ✅ `RegisterRedirect` redirige vers `/auth?plan=starter`
- ✅ Si utilisateur déjà connecté → redirige vers `/plan?plan=starter`

### `/plan?plan=starter`
**Fichier:** `src/pages/PlanPage.tsx`

- ✅ Détecte paramètre `plan` dans URL
- ✅ Lance automatiquement le checkout si utilisateur connecté
- ✅ Utilise `planCheckoutService` pour conversion plan → price_id

---

## 6. ✅ Vérification promo depuis DB

**Fichier:** `src/config/stripePrices.ts`

### Fonction `isPromoActive()`:
- ✅ Vérifie `promo_end_date` dans `subscription_plans`
- ✅ Compare avec date actuelle
- ✅ Cache dans localStorage (5 minutes) pour version sync
- ✅ Fallback sur `true` si erreur (sécurisé)

### Code:
```ts
const { data } = await supabase
  .from('subscription_plans')
  .select('promo_end_date')
  .eq('name', planName)
  .single();

if (data?.promo_end_date) {
  const promoEnd = new Date(data.promo_end_date);
  return new Date() < promoEnd;
}
```

---

## 7. ✅ Mapping price_id → plan name

### Côté client:
```ts
import { getPlanNameFromPriceId } from '@/config/stripePrices';

const planName = getPlanNameFromPriceId(priceId);
// Retourne: 'starter' | 'pro' | 'teams' | null
```

### Côté serveur (webhook):
```ts
// Option 1: Metadata subscription
if (subscription.metadata?.planName) {
  planName = subscription.metadata.planName;
}

// Option 2: stripe_price_mapping table
const { data } = await supabase
  .from('stripe_price_mapping')
  .select('plan_name')
  .eq('price_id', priceId)
  .single();

// Option 3: STRIPE_PRICES (fallback)
const foundPlan = Object.entries(STRIPE_PRICES)
  .find(([, prices]) => Object.values(prices).includes(priceId))?.[0];
```

---

## 📊 Flux complet

### 1. Utilisateur clique sur `/register?plan=starter`
```
launch.html → /register?plan=starter
```

### 2. Redirection selon état auth
```
Si non connecté → /auth?plan=starter
Si connecté → /plan?plan=starter
```

### 3. Checkout automatique
```
PlanPage détecte ?plan=starter
→ planCheckoutService.checkoutPlanSync('starter', ...)
→ getPriceIdAuto('starter') → price_id (promo si active)
→ stripeCheckoutService.createCheckoutSession(price_id, ...)
→ Redirection Stripe
```

### 4. Webhook post-paiement
```
Stripe webhook → price_id reçu
→ Mapping price_id → plan name (metadata → mapping → STRIPE_PRICES)
→ Création/mise à jour user_subscriptions
→ Activation plan
```

---

## ✅ Checklist finale

| Élément | Statut | Fichier |
|---------|--------|---------|
| Variables env stylisées | ✅ | Netlify |
| `stripePrices.ts` | ✅ | `src/config/stripePrices.ts` |
| Webhook STRIPE_PRICES | ✅ | `supabase/functions/stripe-webhook/index.ts` |
| `planCheckoutService` | ✅ | `src/services/planCheckoutService.ts` |
| Route `/register?plan=` | ✅ | `src/components/routing/AppRouter.tsx` |
| Route `/plan?plan=` | ✅ | `src/pages/PlanPage.tsx` |
| Vérification promo DB | ✅ | `src/config/stripePrices.ts` |
| Mapping price_id → plan | ✅ | Multiples fichiers |

---

## 🎯 Utilisation dans le code

### Exemple 1: Landing page
```html
<a href="/register?plan=starter">Choisir Starter</a>
```

### Exemple 2: Code React
```ts
import { getPriceIdAuto } from '@/config/stripePrices';

const priceId = getPriceIdAuto('starter');
// Utilise promo si active, sinon normal
```

### Exemple 3: Service checkout
```ts
import { planCheckoutService } from '@/services/planCheckoutService';

await planCheckoutService.checkoutPlan('starter', user.email, token);
```

---

## ✅ Résultat

**Système 100% stylisé** - Aucun ID brut dans le code, tout passe par les variables d'environnement et le mapping automatique.

**Bascule prix automatique** - Vérifie `promo_end_date` et utilise promo/normal automatiquement.

**Mapping complet** - price_id → plan name fonctionne dans les deux sens (client + serveur).


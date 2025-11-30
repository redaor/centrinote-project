# ⚠️ Problème identifié avec les Price IDs Stripe

## 🔴 Problème principal

Les variables d'environnement que vous avez fournies commencent par **`prod_`** au lieu de **`price_`** :

```env
VITE_PRICE_ID_PRO_normal=prod_TVrpGF3KlPvxS4  ❌ C'est un Product ID
VITE_PRICE_ID_pro_promo=prod_TVs30Ge9g2xsMQ  ❌ C'est un Product ID
```

**Les Price IDs Stripe commencent par `price_`, pas `prod_` !**

- **Product ID** (`prod_xxx`) : Identifie un produit dans Stripe
- **Price ID** (`price_xxx`) : Identifie un prix spécifique pour un produit

## ✅ Solution

### 1. Trouver les vrais Price IDs

1. Allez sur **Stripe Dashboard** → **Products**
2. Cliquez sur chaque produit (Starter, Pro, Teams)
3. Dans la section **Pricing**, vous verrez les **Price IDs** (commencent par `price_`)
4. Copiez les Price IDs pour :
   - Prix normal
   - Prix promo (si vous avez créé des prix séparés)

### 2. Mettre à jour les variables d'environnement

```env
# ✅ CORRECT - Price IDs (commencent par price_)
VITE_PRICE_ID_starter_normal=price_xxxxxxxxxxxxx
VITE_PRICE_ID_starter_promo=price_xxxxxxxxxxxxx
VITE_PRICE_ID_PRO_normal=price_xxxxxxxxxxxxx
VITE_PRICE_ID_pro_promo=price_xxxxxxxxxxxxx
VITE_PRICE_ID_teams_normal=price_xxxxxxxxxxxxx
VITE_PRICE_ID_teams_promo=price_xxxxxxxxxxxxx
```

### 3. Si vous n'avez qu'un seul prix par plan

Si vous n'avez pas de prix promo séparé, utilisez le même Price ID pour `normal` et `promo` :

```env
VITE_PRICE_ID_starter_normal=price_xxxxxxxxxxxxx
VITE_PRICE_ID_starter_promo=price_xxxxxxxxxxxxx  # Même ID que normal
```

Ou modifiez le code pour utiliser uniquement `normal` si `promo` est vide.

## 📝 Fichiers créés/modifiés

1. ✅ `src/config/stripePrices.ts` - Nouveau système de stylisation
2. ✅ `supabase/functions/stripe-webhook/index.ts` - Utilise STRIPE_PRICES en fallback
3. ⚠️ À faire : Mettre à jour vos variables d'environnement avec les vrais Price IDs

## 🎯 Utilisation

```ts
import { getPriceId, getPriceIdAuto } from '@/config/stripePrices';

// Utiliser le prix promo (si actif)
const priceId = getPriceIdAuto('starter');

// Ou forcer promo/normal
const priceIdPromo = getPriceId('starter', true);
const priceIdNormal = getPriceId('starter', false);
```


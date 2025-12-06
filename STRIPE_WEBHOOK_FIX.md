# 🔧 Correction du webhook Stripe

## Problème identifié

Stripe ne parvient pas à envoyer des événements webhook à votre endpoint. Le message indique :
- **49 tentatives échouées** depuis le 29 novembre 2025
- **Endpoint** : `https://wjzlicokhxitmeoxkjzv.supabase.co/functions/v1/stripe-webhook`
- **Erreur** : "other errors" (erreurs non spécifiées)
- **Résultat** : Stripe ne reçoit pas de code HTTP 200-299

## Causes identifiées

### 1. ❌ Variables d'environnement non vérifiées
- Le code utilisait `!` (non-null assertion) sans vérifier si les variables existent
- Si `STRIPE_SECRET_KEY` ou `STRIPE_WEBHOOK_SECRET` manquent, le code plante au démarrage

### 2. ❌ Traitement asynchrone avec `waitUntil`
- Le code utilisait `EdgeRuntime.waitUntil(handleEvent(event))` qui retourne la réponse AVANT que le traitement soit terminé
- Si `handleEvent` échoue, Stripe ne le sait pas car la réponse a déjà été envoyée
- Stripe considère que le webhook a échoué si la réponse n'est pas 200-299

### 3. ❌ Gestion d'erreurs insuffisante
- Pas de vérification si `subscription.items.data` est vide
- Erreurs silencieuses qui ne sont pas loggées correctement

## Corrections appliquées

### ✅ 1. Vérification des variables d'environnement
```typescript
// AVANT
const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;

// APRÈS
const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');
if (!stripeSecret || !stripeWebhookSecret || !supabaseUrl || !supabaseServiceKey) {
  return new Response(JSON.stringify({ error: 'Missing environment variables' }), { status: 500 });
}
```

### ✅ 2. Traitement synchrone de l'événement
```typescript
// AVANT
EdgeRuntime.waitUntil(handleEvent(event));
return Response.json({ received: true });

// APRÈS
try {
  await handleEvent(event);
  return Response.json({ received: true }, { status: 200 });
} catch (eventError: any) {
  // Log l'erreur mais retourne 200 pour éviter les réessais infinis
  return Response.json({ received: true, error: 'Event processing failed but acknowledged' }, { status: 200 });
}
```

### ✅ 3. Vérifications supplémentaires
- Vérification que `subscription.items.data` n'est pas vide
- Meilleurs logs d'erreur pour le debugging
- Gestion d'erreurs plus robuste

## Étapes pour déployer la correction

### 1. Vérifier les variables d'environnement dans Supabase

Dans Supabase Dashboard → Edge Functions → stripe-webhook → Settings → Secrets, vérifier que ces variables sont définies :

- ✅ `STRIPE_SECRET_KEY` - Votre clé secrète Stripe
- ✅ `STRIPE_WEBHOOK_SECRET` - Le secret du webhook Stripe (commence par `whsec_`)
- ✅ `SUPABASE_URL` - URL de votre projet Supabase
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - Clé de service Supabase

### 2. Redéployer l'Edge Function

```bash
supabase functions deploy stripe-webhook
```

### 3. Vérifier les logs

Dans Supabase Dashboard → Edge Functions → stripe-webhook → Logs, vous devriez voir :
- ✅ `Webhook signature verified: [event_type]`
- ✅ `Webhook event processed successfully: [event_type]`

Si vous voyez des erreurs :
- ❌ `Missing required environment variables` → Vérifier les secrets
- ❌ `Webhook signature verification failed` → Vérifier `STRIPE_WEBHOOK_SECRET`
- ❌ `Invalid subscription data` → Problème avec les données Stripe

### 4. Tester le webhook dans Stripe Dashboard

1. Aller dans Stripe Dashboard → Developers → Webhooks
2. Cliquer sur votre endpoint
3. Cliquer sur "Send test webhook"
4. Vérifier que vous recevez un code 200 dans les logs

## Vérifications supplémentaires

### Vérifier que le webhook est bien configuré dans Stripe

1. Stripe Dashboard → Developers → Webhooks
2. Vérifier que l'URL est : `https://wjzlicokhxitmeoxkjzv.supabase.co/functions/v1/stripe-webhook`
3. Vérifier que les événements suivants sont sélectionnés :
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

### Vérifier les logs Stripe

Dans Stripe Dashboard → Developers → Webhooks → [Votre endpoint] → Recent deliveries :
- Vérifier les dernières tentatives
- Si vous voyez des erreurs 500, vérifier les logs Supabase
- Si vous voyez des erreurs 400, vérifier `STRIPE_WEBHOOK_SECRET`

## Résultat attendu

Après le déploiement :
- ✅ Stripe devrait recevoir des codes HTTP 200
- ✅ Les événements webhook devraient être traités correctement
- ✅ Les abonnements devraient être synchronisés dans votre base de données
- ✅ Les factures devraient être créées automatiquement

## Si le problème persiste

1. **Vérifier les logs Supabase** : Edge Functions → stripe-webhook → Logs
2. **Vérifier les logs Stripe** : Dashboard → Developers → Webhooks → [Endpoint] → Recent deliveries
3. **Tester manuellement** : Utiliser Stripe CLI pour tester localement
4. **Vérifier les tables** : S'assurer que `stripe_subscriptions` et `stripe_orders` existent


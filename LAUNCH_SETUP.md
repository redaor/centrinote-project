# 🚀 CentriNote Launch - Guide de Déploiement

## ✅ Ce qui a été fait automatiquement

- ✅ Landing page `/launch.html` créée dans `public/`
- ✅ Route React `/launch` configurée
- ✅ Service quotas `quotaService.ts` créé
- ✅ Composant `QuotaBar.tsx` créé
- ✅ Migration SQL préparée
- ✅ Code commité et pushé sur GitHub
- ✅ Netlify déploiera automatiquement

## 📋 Actions manuelles requises (Supabase)

### 1. Exécuter la migration SQL

1. **Ouvrir Supabase Dashboard**
   - Va sur https://supabase.com/dashboard
   - Sélectionne ton projet CentriNote

2. **SQL Editor**
   - Menu latéral → "SQL Editor"
   - Cliquer sur "+ New query"

3. **Copier-coller la migration**
   - Ouvrir le fichier `supabase/migrations/20241129_launch_quotas_system.sql`
   - Copier tout le contenu
   - Coller dans l'éditeur SQL Supabase
   - Cliquer sur "Run" (en bas à droite)

4. **Vérifier la création**
   ```sql
   -- Vérifier que les tables sont créées
   SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('subscription_plans', 'user_quotas', 'user_subscriptions');

   -- Vérifier les plans
   SELECT name, display_name, price_cents, promo_price_cents FROM subscription_plans ORDER BY sort_order;
   ```

   Tu devrais voir :
   - `free` (0€)
   - `starter` (12,99€ → 9,99€ promo)
   - `pro` (29,99€ → 19,99€ promo)
   - `teams` (49,99€ → 39,99€ promo)

### 2. Configurer le Cron Job (reset mensuel des quotas)

1. **Activer pg_cron (si pas déjà fait)**
   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_cron;
   ```

2. **Créer le job de reset mensuel**
   ```sql
   SELECT cron.schedule(
     'reset-monthly-quotas',
     '0 0 1 * *',  -- Le 1er de chaque mois à minuit UTC
     $$SELECT reset_monthly_quotas();$$
   );
   ```

3. **Vérifier le job**
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'reset-monthly-quotas';
   ```

### 3. Tester le système de quotas

1. **Créer un quota pour ton user**
   ```sql
   -- Remplace 'TON_USER_ID' par ton vrai user ID
   SELECT increment_quota('TON_USER_ID', 'ai_tokens', 1000);
   SELECT increment_quota('TON_USER_ID', 'meeting_count', 1);
   ```

2. **Vérifier un quota**
   ```sql
   SELECT check_quota('TON_USER_ID', 'ai_tokens', 0);
   ```

   Résultat attendu :
   ```json
   {
     "allowed": true,
     "usage": 1000,
     "limit": 20000,
     "percentage": 5,
     "plan_name": "free",
     "plan_display_name": "Free"
   }
   ```

### 4. Assigner un plan payant (test)

```sql
-- 1. Récupérer l'ID du plan Starter
SELECT id FROM subscription_plans WHERE name = 'starter';

-- 2. Créer une subscription pour ton user
INSERT INTO user_subscriptions (user_id, plan_id, status)
VALUES (
  'TON_USER_ID',
  (SELECT id FROM subscription_plans WHERE name = 'starter'),
  'active'
);
```

## 🌐 URLs à tester

Une fois déployé sur Netlify :

1. **Landing page publique**
   ```
   https://centrinote.fr/launch
   ```

2. **Vérifier QuotaBar** (si connecté)
   - Va sur https://centrinote.fr/dashboard
   - Le QuotaBar devrait apparaître (il faut l'intégrer dans un composant parent)

## 🎨 Intégrer QuotaBar dans l'UI

Pour afficher le QuotaBar dans le dashboard, édite le composant où tu veux l'afficher (ex: Settings, Dashboard) :

```tsx
import { QuotaBar } from '../components/quota/QuotaBar';

// Dans ton composant
<QuotaBar />
```

Suggestion : l'ajouter dans la sidebar ou en haut du dashboard.

## 📊 Vérifier les métriques

1. **Nombre de plans créés**
   ```sql
   SELECT COUNT(*) FROM subscription_plans WHERE is_visible = true;
   -- Devrait retourner 4
   ```

2. **Promo active ?**
   ```sql
   SELECT
     name,
     price_cents / 100 AS prix_normal,
     promo_price_cents / 100 AS prix_promo,
     promo_end_date,
     CASE
       WHEN promo_end_date > now() THEN 'ACTIF'
       ELSE 'EXPIRÉ'
     END AS statut_promo
   FROM subscription_plans
   WHERE promo_price_cents IS NOT NULL;
   ```

3. **Utilisateurs avec quotas**
   ```sql
   SELECT COUNT(DISTINCT user_id) FROM user_quotas;
   ```

## 🐛 Troubleshooting

### La migration échoue avec "already exists"

Si les tables existent déjà :
```sql
-- Supprimer les tables (ATTENTION : perte de données)
DROP TABLE IF EXISTS user_quotas CASCADE;
DROP TABLE IF EXISTS user_subscriptions CASCADE;
DROP TABLE IF EXISTS subscription_plans CASCADE;

-- Puis relancer la migration complète
```

### Les fonctions RPC ne marchent pas

Vérifier les permissions :
```sql
-- Les fonctions doivent être SECURITY DEFINER
SELECT routine_name, security_type
FROM information_schema.routines
WHERE routine_name IN ('check_quota', 'increment_quota', 'reset_monthly_quotas');
```

### La promo n'apparaît pas

Vérifier la date de fin :
```sql
SELECT name, promo_end_date, now(), promo_end_date > now() AS promo_active
FROM subscription_plans;
```

Si besoin d'étendre la promo :
```sql
UPDATE subscription_plans
SET promo_end_date = now() + interval '30 days'
WHERE promo_price_cents IS NOT NULL;
```

## 🚀 Next Steps

1. ✅ Exécuter migration SQL
2. ✅ Configurer cron job
3. ✅ Tester système quotas
4. ⏳ Intégrer QuotaBar dans l'UI
5. ⏳ Tester workflow complet : inscription → usage → quota alert → upgrade
6. ⏳ Configurer paiement (Stripe/PayPal) si nécessaire
7. ⏳ Partager le lien https://centrinote.fr/launch

## 📞 Support

Si problème, vérifier :
- Les logs Supabase (Dashboard → Logs)
- Les logs Netlify (Dashboard → Deploys)
- La console du navigateur (F12)

Bon lancement ! 🎉

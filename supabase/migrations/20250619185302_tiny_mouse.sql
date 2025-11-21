/*
  # Ajout des champs de gestion d'abonnement

  1. Nouvelles colonnes
    - `stripe_customer_id` (text, nullable)
    - `stripe_subscription_id` (text, nullable)
    - `subscription_status` (text, nullable)
    - `subscription_end_date` (timestamptz, nullable)
    - `subscription_cancel_at_period_end` (boolean, default false)
    - `last_payment_date` (timestamptz, nullable)
    - `last_payment_error` (text, nullable)

  2. Sécurité
    - Maintien des politiques RLS existantes
*/

-- Ajout des champs liés à Stripe et aux abonnements
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_status text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_end_date timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_cancel_at_period_end boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_payment_date timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_payment_error text;

-- Création d'index pour améliorer les performances
CREATE INDEX IF NOT EXISTS profiles_stripe_customer_id_idx ON profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS profiles_stripe_subscription_id_idx ON profiles(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS profiles_subscription_status_idx ON profiles(subscription_status);
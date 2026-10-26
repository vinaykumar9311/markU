-- 004_subscription_model.sql
-- Adds subscription tiers (1-week free trial, ₹149 monthly, ₹999 yearly) and merchant social links

ALTER TABLE public.shops 
  ADD COLUMN IF NOT EXISTS google_review_url text DEFAULT '',
  ADD COLUMN IF NOT EXISTS instagram_url text DEFAULT '',
  ADD COLUMN IF NOT EXISTS logo_url text DEFAULT '',
  ADD COLUMN IF NOT EXISTS subscription_plan text DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS subscription_ends_at timestamptz DEFAULT (now() + interval '7 days'),
  ADD COLUMN IF NOT EXISTS payment_reference text DEFAULT '';

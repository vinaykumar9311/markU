-- Run once in Supabase SQL Editor on the EXISTING database.
-- Removes allow-all policies that let any anon-key holder read/write every tenant's data.
DROP POLICY IF EXISTS "Enable backend operations for shops" ON public.shops;
DROP POLICY IF EXISTS "Enable backend operations for customer_cards" ON public.customer_cards;
DROP POLICY IF EXISTS "Enable backend operations for used_tokens" ON public.used_tokens;
DROP POLICY IF EXISTS "Enable backend operations for stamp_history" ON public.stamp_history;

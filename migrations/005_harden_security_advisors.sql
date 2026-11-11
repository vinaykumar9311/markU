-- ====================================================================
-- MIGRATION 005: RESOLVE SUPABASE SECURITY ADVISORS & HARDEN POLICIES
-- ====================================================================

-- 1. Revoke public/anon execution on SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.auto_confirm_user_email() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_loyalty_stamp(p_token text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_redemption_code(p_card_id uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.issue_dynamic_qr_token(p_shop_id uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.owner_manual_stamp(p_shop_id uuid, p_customer_id uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.verify_redemption_code(p_shop_id uuid, p_otp_code text) FROM PUBLIC, anon, authenticated;

-- 2. Restrict execution solely to internal trusted roles (postgres / service_role)
GRANT EXECUTE ON FUNCTION public.auto_confirm_user_email() TO postgres;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres;
GRANT EXECUTE ON FUNCTION public.claim_loyalty_stamp(p_token text) TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_redemption_code(p_card_id uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.issue_dynamic_qr_token(p_shop_id uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.owner_manual_stamp(p_shop_id uuid, p_customer_id uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_redemption_code(p_shop_id uuid, p_otp_code text) TO service_role;

-- 3. Lock search_path to prevent schema hijacking on SECURITY DEFINER functions
ALTER FUNCTION public.auto_confirm_user_email() SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.handle_new_user() SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.claim_loyalty_stamp(p_token text) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.generate_redemption_code(p_card_id uuid) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.issue_dynamic_qr_token(p_shop_id uuid) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.owner_manual_stamp(p_shop_id uuid, p_customer_id uuid) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.verify_redemption_code(p_shop_id uuid, p_otp_code text) SET search_path = public, extensions, pg_temp;

-- 4. Harden RLS on qr_sessions (remove public table dump vulnerability)
ALTER POLICY "Shop owners and scanning customers can read qr_sessions" ON public.qr_sessions
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.shops s 
    WHERE s.id = qr_sessions.shop_id AND s.owner_id = (SELECT auth.uid())
  )
);

-- 5. Harden RLS on profiles (prevent user harvesting)
ALTER POLICY "Profiles are viewable by authenticated users" ON public.profiles
TO authenticated
USING (
  (SELECT auth.uid()) = id
  OR EXISTS (
    SELECT 1 FROM public.loyalty_cards lc
    JOIN public.shops s ON s.id = lc.shop_id
    WHERE lc.customer_id = profiles.id AND s.owner_id = (SELECT auth.uid())
  )
);

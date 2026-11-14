-- ====================================================================
-- MIGRATION 006: HARDEN CLAIM TABLES RLS & REVOKE ANON TABLE GRANTS
-- ====================================================================

REVOKE ALL ON TABLE public.customer_cards FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.used_tokens FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.stamp_history FROM PUBLIC, anon, authenticated;

CREATE POLICY "Owners can view own shop customers" ON public.customer_cards
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shops s
      WHERE s.id = customer_cards.shop_id AND s.owner_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Owners can view own shop history" ON public.stamp_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shops s
      WHERE s.id = stamp_history.shop_id AND s.owner_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Owners can view own shop used tokens" ON public.used_tokens
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shops s
      WHERE s.id = used_tokens.shop_id AND s.owner_id = (SELECT auth.uid())
    )
  );


-- ====================================================================
-- MIGRATION 007: COMPOSITE INDEXES FOR HIGH-THROUGHPUT LOYALTY QUERIES
-- ====================================================================

CREATE INDEX IF NOT EXISTS idx_customer_cards_shop_phone ON public.customer_cards (shop_id, phone);
CREATE INDEX IF NOT EXISTS idx_used_tokens_shop_token ON public.used_tokens (shop_id, token);
CREATE INDEX IF NOT EXISTS idx_stamp_history_shop_created ON public.stamp_history (shop_id, created_at DESC);


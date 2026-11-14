-- Fresh start cleanup + enforce 1 shop per owner (1 Google account = 1 shop)
TRUNCATE TABLE
  public.reward_claims,
  public.stamp_history,
  public.customer_cards,
  public.sessions,
  public.shops,
  public.users
RESTART IDENTITY CASCADE;

DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.profiles';
  END IF;
END $$;

DELETE FROM auth.users;

ALTER TABLE public.shops
  DROP CONSTRAINT IF EXISTS shops_owner_id_fkey;

ALTER TABLE public.shops
  ADD CONSTRAINT shops_owner_id_fkey
  FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.shops
  DROP CONSTRAINT IF EXISTS shops_owner_id_key;

ALTER TABLE public.shops
  ADD CONSTRAINT shops_owner_id_key UNIQUE (owner_id);

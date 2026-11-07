-- ====================================================================
-- ROYALTY REWARDS — MULTI-TENANT SHOP OWNER PRODUCTION SCHEMA
-- Run this in your Supabase Dashboard: SQL Editor -> New Query -> Run
-- ====================================================================

-- 0. USERS TABLE (Unified Google & Apple OAuth accounts for Owners & Customers)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    google_id TEXT UNIQUE,
    apple_id TEXT UNIQUE,
    avatar_url TEXT,
    role TEXT NOT NULL CHECK (role IN ('owner', 'customer')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON public.users (google_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users (role);

-- SESSIONS TABLE (Refresh tokens, device fingerprints)
CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    refresh_token TEXT UNIQUE NOT NULL,
    device_fingerprint TEXT,
    user_agent TEXT,
    ip_address TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token ON public.sessions (refresh_token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions (user_id);

-- 1. SHOPS TABLE (Each Registered Shop Owner has their own shop record)
CREATE TABLE IF NOT EXISTS public.shops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL, -- References users(id)
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL, -- e.g. 'royal-cafe', 'apex-barber'
    cooldown_hours NUMERIC DEFAULT 12 CHECK (cooldown_hours >= 0),
    stamps_target INTEGER DEFAULT 10 CHECK (stamps_target > 0),
    reward_description TEXT DEFAULT '1 Free Item',
    secret_key TEXT NOT NULL, -- Dedicated HMAC secret key per shop for counter QRs
    google_review_url TEXT DEFAULT '',
    instagram_url TEXT DEFAULT '',
    logo_url TEXT DEFAULT '',
    subscription_plan TEXT DEFAULT 'trial',
    subscription_status TEXT DEFAULT 'active',
    subscription_ends_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
    payment_reference TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shops_owner ON public.shops (owner_id);
CREATE INDEX IF NOT EXISTS idx_shops_slug ON public.shops (slug);

-- 2. CUSTOMER CARDS TABLE (Strictly separated per shop!)
-- Customer cards are isolated: a customer has separate stamps at each shop they visit.
CREATE TABLE IF NOT EXISTS public.customer_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    email TEXT,
    google_id TEXT,
    phone TEXT,
    name TEXT DEFAULT 'Customer',
    stamps INTEGER DEFAULT 0 CHECK (stamps >= 0),
    completed_cards INTEGER DEFAULT 0 CHECK (completed_cards >= 0),
    last_stamp_at TIMESTAMPTZ,
    device_fingerprint TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_cards_shop ON public.customer_cards (shop_id);
CREATE INDEX IF NOT EXISTS idx_customer_cards_user ON public.customer_cards (shop_id, user_id);
CREATE INDEX IF NOT EXISTS idx_customer_cards_email ON public.customer_cards (shop_id, email);

-- 3. USED TOKENS TABLE (Single-use QR code burn ledger per shop)
CREATE TABLE IF NOT EXISTS public.used_tokens (
    id BIGSERIAL PRIMARY KEY,
    shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
    phone TEXT NOT NULL,
    token TEXT NOT NULL,
    used_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_shop_phone_token UNIQUE (shop_id, phone, token)
);

CREATE INDEX IF NOT EXISTS idx_used_tokens_lookup ON public.used_tokens (shop_id, phone, token);

-- 4. STAMP HISTORY & AUDIT TRAIL PER SHOP
CREATE TABLE IF NOT EXISTS public.stamp_history (
    id BIGSERIAL PRIMARY KEY,
    shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
    card_id UUID REFERENCES public.customer_cards(id) ON DELETE CASCADE,
    phone TEXT NOT NULL,
    customer_name TEXT,
    action_type TEXT NOT NULL, -- 'STAMP_ADDED' or 'REWARD_REDEEMED'
    stamps_at_point INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stamp_history_shop ON public.stamp_history (shop_id, created_at DESC);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) — CRYPTOGRAPHIC ISOLATION OF DATA
-- ====================================================================
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.used_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stamp_history ENABLE ROW LEVEL SECURITY;

-- Policy 1: Shop Owners can ONLY view & manage their own shop
CREATE POLICY "Owners can view own shop" ON public.shops
    FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Owners can update own shop" ON public.shops
    FOR UPDATE USING (auth.uid() = owner_id);

-- Policy 2: Shop Owners can ONLY view customer cards belonging to their shop
CREATE POLICY "Owners can view own shop customers" ON public.customer_cards
    FOR SELECT USING (
        shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid())
    );

-- Policy 3: Shop Owners can ONLY view stamp history for their own shop
CREATE POLICY "Owners can view own shop history" ON public.stamp_history
    FOR SELECT USING (
        shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid())
    );

-- NOTE: no allow-all policies. The backend uses the Supabase service-role key, which bypasses RLS.
-- With RLS enabled and only the owner-scoped SELECT/UPDATE policies above, anon/authenticated
-- clients can never read or write other tenants' rows. For an existing database, run
-- migrations/002_drop_permissive_policies.sql.

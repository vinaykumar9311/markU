-- 005_users_and_google_sessions.sql
-- 1. Users table for Google & Apple OAuth accounts (Shop Owners and Customers)
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

-- 2. Sessions table for Refresh Tokens & Device Fingerprints
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

-- 3. Enhance customer_cards to link with users and emails
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

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customer_cards' AND column_name='email') THEN
        ALTER TABLE public.customer_cards ADD COLUMN email TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customer_cards' AND column_name='user_id') THEN
        ALTER TABLE public.customer_cards ADD COLUMN user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customer_cards' AND column_name='google_id') THEN
        ALTER TABLE public.customer_cards ADD COLUMN google_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customer_cards' AND column_name='device_fingerprint') THEN
        ALTER TABLE public.customer_cards ADD COLUMN device_fingerprint TEXT;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_customer_cards_user_id ON public.customer_cards (user_id);
CREATE INDEX IF NOT EXISTS idx_customer_cards_email ON public.customer_cards (shop_id, email);


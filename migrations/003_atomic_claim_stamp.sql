-- ====================================================================
-- ATOMIC CLAIM STAMP FUNCTION (PREVENTS RACE CONDITIONS & EXPLOITS)
-- ====================================================================
-- Run this in Supabase SQL Editor: SQL Editor -> New query -> Paste -> Run

CREATE OR REPLACE FUNCTION public.claim_stamp_atomic(
    p_shop_id UUID,
    p_phone TEXT,
    p_token TEXT,
    p_customer_name TEXT,
    p_cooldown_hours NUMERIC,
    p_stamps_target INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_card_id UUID;
    v_current_stamps INTEGER := 0;
    v_completed_cards INTEGER := 0;
    v_last_stamp_at TIMESTAMPTZ;
    v_cooldown_interval INTERVAL;
    v_now TIMESTAMPTZ := now();
    v_reward_unlocked BOOLEAN := false;
    v_new_stamps INTEGER;
    v_new_completed INTEGER;
    v_time_since_last INTERVAL;
    v_seconds_remaining INTEGER;
BEGIN
    -- 1. Check if token has already been burned for this shop & phone
    IF EXISTS (
        SELECT 1 FROM public.used_tokens 
        WHERE shop_id = p_shop_id AND phone = p_phone AND token = p_token
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'QR_ALREADY_USED',
            'message', 'This specific QR code has already been redeemed. Scan the current counter QR.'
        );
    END IF;

    -- 2. Lock customer card row for update (or create if missing)
    SELECT id, stamps, completed_cards, last_stamp_at
    INTO v_card_id, v_current_stamps, v_completed_cards, v_last_stamp_at
    FROM public.customer_cards
    WHERE shop_id = p_shop_id AND phone = p_phone
    FOR UPDATE;

    IF NOT FOUND THEN
        INSERT INTO public.customer_cards (
            shop_id, phone, name, stamps, completed_cards, last_stamp_at, updated_at
        ) VALUES (
            p_shop_id, p_phone, COALESCE(NULLIF(TRIM(p_customer_name), ''), 'Customer ' || RIGHT(p_phone, 4)),
            0, 0, NULL, v_now
        )
        RETURNING id, stamps, completed_cards, last_stamp_at
        INTO v_card_id, v_current_stamps, v_completed_cards, v_last_stamp_at;
    END IF;

    -- 3. Enforce Cooldown atomically
    IF v_last_stamp_at IS NOT NULL THEN
        v_cooldown_interval := (COALESCE(p_cooldown_hours, 12) || ' hours')::INTERVAL;
        v_time_since_last := v_now - v_last_stamp_at;
        
        IF v_time_since_last < v_cooldown_interval THEN
            v_seconds_remaining := EXTRACT(EPOCH FROM (v_cooldown_interval - v_time_since_last))::INTEGER;
            RETURN jsonb_build_object(
                'success', false,
                'code', 'COOLDOWN_ACTIVE',
                'message', 'Cooldown active! Next stamp available later.',
                'remaining_seconds', v_seconds_remaining,
                'current_stamps', v_current_stamps
            );
        END IF;
    END IF;

    -- 4. Increment Stamp
    v_new_stamps := v_current_stamps + 1;
    v_new_completed := v_completed_cards;

    IF v_new_stamps >= COALESCE(p_stamps_target, 10) THEN
        v_new_completed := v_new_completed + 1;
        v_new_stamps := 0;
        v_reward_unlocked := true;
    END IF;

    -- 5. Burn Token
    INSERT INTO public.used_tokens (shop_id, phone, token, used_at)
    VALUES (p_shop_id, p_phone, p_token, v_now);

    -- 6. Update Card
    UPDATE public.customer_cards
    SET stamps = v_new_stamps,
        completed_cards = v_new_completed,
        last_stamp_at = v_now,
        updated_at = v_now,
        name = CASE WHEN TRIM(p_customer_name) != '' THEN p_customer_name ELSE name END
    WHERE id = v_card_id;

    -- 7. Audit Log
    INSERT INTO public.stamp_history (
        shop_id, card_id, phone, customer_name, action_type, stamps_at_point, created_at
    ) VALUES (
        p_shop_id, v_card_id, p_phone, 
        COALESCE(NULLIF(TRIM(p_customer_name), ''), 'Customer ' || RIGHT(p_phone, 4)),
        CASE WHEN v_reward_unlocked THEN 'REWARD_REDEEMED' ELSE 'STAMP_ADDED' END,
        v_new_stamps, v_now
    );

    RETURN jsonb_build_object(
        'success', true,
        'reward_unlocked', v_reward_unlocked,
        'card', jsonb_build_object(
            'id', v_card_id,
            'phone', p_phone,
            'stamps', v_new_stamps,
            'completed_cards', v_new_completed,
            'last_stamp_at', v_now
        )
    );
END;
$$;

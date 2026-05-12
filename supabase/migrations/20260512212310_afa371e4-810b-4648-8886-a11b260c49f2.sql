ALTER TABLE public.business_profiles
  ADD COLUMN IF NOT EXISTS cancellation_window_hours integer NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS cancellation_fee_pct numeric NOT NULL DEFAULT 50
    CHECK (cancellation_fee_pct >= 0 AND cancellation_fee_pct <= 100);
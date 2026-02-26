-- Add stripe_account_id to business_profiles for Stripe Connect
ALTER TABLE public.business_profiles
ADD COLUMN stripe_account_id text;

-- Add payment_intent_id to bookings to track Stripe payments
ALTER TABLE public.bookings
ADD COLUMN payment_intent_id text,
ADD COLUMN platform_fee numeric;
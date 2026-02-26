-- Add stripe_customer_id to profiles for saved payment methods
ALTER TABLE public.profiles ADD COLUMN stripe_customer_id text;

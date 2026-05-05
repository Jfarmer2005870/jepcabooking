ALTER TABLE public.bookings 
  ADD COLUMN IF NOT EXISTS business_signature text,
  ADD COLUMN IF NOT EXISTS business_signature_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS business_signature_name text;
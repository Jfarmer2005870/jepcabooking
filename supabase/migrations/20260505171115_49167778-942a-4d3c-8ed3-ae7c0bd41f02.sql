ALTER TABLE public.business_profiles
  ADD COLUMN IF NOT EXISTS origin_lat double precision,
  ADD COLUMN IF NOT EXISTS origin_lng double precision,
  ADD COLUMN IF NOT EXISTS free_radius_miles numeric NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS per_mile_rate numeric NOT NULL DEFAULT 0;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS travel_distance_miles numeric,
  ADD COLUMN IF NOT EXISTS travel_fee numeric NOT NULL DEFAULT 0;
DROP VIEW IF EXISTS public.public_business_profiles;

CREATE VIEW public.public_business_profiles
WITH (security_invoker = true) AS
SELECT
  id,
  user_id,
  business_name,
  description,
  logo_url,
  website,
  address,
  city,
  state,
  zip_code,
  is_verified,
  rating,
  total_reviews,
  service_area,
  free_radius_miles,
  per_mile_rate,
  created_at,
  updated_at
FROM public.business_profiles;

GRANT SELECT ON public.public_business_profiles TO anon, authenticated;

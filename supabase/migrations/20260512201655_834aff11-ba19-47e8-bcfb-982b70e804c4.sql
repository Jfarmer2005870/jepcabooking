
-- Re-allow public SELECT on business_profiles, but hide stripe_account_id at the column level
DROP POLICY IF EXISTS "Owners can view their full business profile" ON public.business_profiles;

CREATE POLICY "Anyone can view business profiles"
ON public.business_profiles FOR SELECT
USING (true);

-- Column-level: revoke all SELECT, then grant only safe columns to anon/authenticated;
-- owner reads full row through service role / their own UPDATE policies aren't column-bound.
REVOKE SELECT ON public.business_profiles FROM anon, authenticated;
GRANT SELECT (
  id, user_id, business_name, description, logo_url, website,
  address, city, state, zip_code, is_verified, rating, total_reviews,
  service_area, origin_lat, origin_lng, free_radius_miles,
  per_mile_rate, created_at, updated_at
) ON public.business_profiles TO anon, authenticated;

-- Owners need to read stripe_account_id for their own profile — grant on a per-owner basis
-- via a separate policy + dedicated view. Provide a view returning only the owner's row:
CREATE OR REPLACE VIEW public.my_business_profile
WITH (security_invoker = on) AS
SELECT * FROM public.business_profiles WHERE user_id = auth.uid();

GRANT SELECT ON public.my_business_profile TO authenticated;

-- Revoke public/authenticated SELECT on the sensitive columns
REVOKE SELECT (stripe_account_id, origin_lat, origin_lng)
  ON public.business_profiles FROM anon, authenticated;

-- Owner-only read of full row (including sensitive fields)
CREATE OR REPLACE FUNCTION public.get_my_business_profile()
RETURNS SETOF public.business_profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.business_profiles WHERE user_id = auth.uid()
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_business_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_business_profile() TO authenticated;

-- Consumer-safe travel estimate (doesn't reveal coords)
CREATE OR REPLACE FUNCTION public.get_travel_estimate(
  _business_id uuid,
  _dest_lat double precision,
  _dest_lng double precision
)
RETURNS TABLE(
  distance_miles numeric,
  free_radius_miles numeric,
  per_mile_rate numeric,
  travel_fee numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  bp public.business_profiles%ROWTYPE;
  d numeric;
  billable numeric;
BEGIN
  SELECT * INTO bp FROM public.business_profiles WHERE id = _business_id;
  IF NOT FOUND OR bp.origin_lat IS NULL OR bp.origin_lng IS NULL
     OR _dest_lat IS NULL OR _dest_lng IS NULL THEN
    RETURN QUERY SELECT NULL::numeric, bp.free_radius_miles, bp.per_mile_rate, 0::numeric;
    RETURN;
  END IF;

  -- Haversine, miles
  d := 3958.8 * 2 * asin(sqrt(
    pow(sin(radians((_dest_lat - bp.origin_lat) / 2)), 2) +
    cos(radians(bp.origin_lat)) * cos(radians(_dest_lat)) *
    pow(sin(radians((_dest_lng - bp.origin_lng) / 2)), 2)
  ));

  billable := GREATEST(0, d - COALESCE(bp.free_radius_miles, 0));
  RETURN QUERY SELECT
    round(d::numeric, 2),
    bp.free_radius_miles,
    bp.per_mile_rate,
    round((billable * COALESCE(bp.per_mile_rate, 0))::numeric, 2);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_travel_estimate(uuid, double precision, double precision) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_travel_estimate(uuid, double precision, double precision) TO anon, authenticated;

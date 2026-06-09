
-- 1. Restrict sensitive columns on business_profiles from anon/authenticated.
-- Owners read their own row via get_my_business_profile() (SECURITY DEFINER).
-- Edge functions use service_role and are unaffected.
REVOKE SELECT (stripe_account_id, origin_lat, origin_lng) ON public.business_profiles FROM anon, authenticated;

-- 2. Business-owner booking update column restriction.
CREATE OR REPLACE FUNCTION public.restrict_business_booking_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_owner boolean;
  rejected text[] := ARRAY[]::text[];
  attempted jsonb := '{}'::jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Only enforce when the updater owns the business on the row.
  SELECT EXISTS (
    SELECT 1 FROM public.business_profiles bp
    WHERE bp.id = OLD.business_id AND bp.user_id = auth.uid()
  ) INTO is_owner;

  IF NOT is_owner THEN
    RETURN NEW;
  END IF;

  -- If the updater is also the consumer (unlikely), let the consumer trigger handle it.
  IF OLD.consumer_id = auth.uid() THEN
    RETURN NEW;
  END IF;

  -- Allowed columns for business owners:
  --   status, business_signature, business_signature_name, business_signature_at,
  --   invoice_photos, updated_at
  -- Revert everything else.
  IF NEW.consumer_id IS DISTINCT FROM OLD.consumer_id THEN
    rejected := array_append(rejected, 'consumer_id');
    attempted := attempted || jsonb_build_object('consumer_id', NEW.consumer_id);
    NEW.consumer_id := OLD.consumer_id;
  END IF;
  IF NEW.total_price IS DISTINCT FROM OLD.total_price THEN
    rejected := array_append(rejected, 'total_price');
    attempted := attempted || jsonb_build_object('total_price', NEW.total_price);
    NEW.total_price := OLD.total_price;
  END IF;
  IF NEW.platform_fee IS DISTINCT FROM OLD.platform_fee THEN
    rejected := array_append(rejected, 'platform_fee');
    attempted := attempted || jsonb_build_object('platform_fee', NEW.platform_fee);
    NEW.platform_fee := OLD.platform_fee;
  END IF;
  IF NEW.travel_fee IS DISTINCT FROM OLD.travel_fee THEN
    rejected := array_append(rejected, 'travel_fee');
    attempted := attempted || jsonb_build_object('travel_fee', NEW.travel_fee);
    NEW.travel_fee := OLD.travel_fee;
  END IF;
  IF NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
    rejected := array_append(rejected, 'payment_status');
    NEW.payment_status := OLD.payment_status;
  END IF;
  IF NEW.payment_intent_id IS DISTINCT FROM OLD.payment_intent_id THEN
    rejected := array_append(rejected, 'payment_intent_id');
    NEW.payment_intent_id := OLD.payment_intent_id;
  END IF;
  IF NEW.refunded_amount IS DISTINCT FROM OLD.refunded_amount THEN
    rejected := array_append(rejected, 'refunded_amount');
    NEW.refunded_amount := OLD.refunded_amount;
  END IF;
  IF NEW.consumer_signature IS DISTINCT FROM OLD.consumer_signature THEN
    rejected := array_append(rejected, 'consumer_signature');
    NEW.consumer_signature := OLD.consumer_signature;
  END IF;
  IF NEW.consumer_signature_name IS DISTINCT FROM OLD.consumer_signature_name THEN
    rejected := array_append(rejected, 'consumer_signature_name');
    NEW.consumer_signature_name := OLD.consumer_signature_name;
  END IF;
  IF NEW.consumer_signature_at IS DISTINCT FROM OLD.consumer_signature_at THEN
    rejected := array_append(rejected, 'consumer_signature_at');
    NEW.consumer_signature_at := OLD.consumer_signature_at;
  END IF;
  IF NEW.dispute_status IS DISTINCT FROM OLD.dispute_status THEN
    rejected := array_append(rejected, 'dispute_status');
    NEW.dispute_status := OLD.dispute_status;
  END IF;
  IF NEW.dispute_reason IS DISTINCT FROM OLD.dispute_reason THEN
    rejected := array_append(rejected, 'dispute_reason');
    NEW.dispute_reason := OLD.dispute_reason;
  END IF;
  IF NEW.dispute_opened_at IS DISTINCT FROM OLD.dispute_opened_at THEN
    rejected := array_append(rejected, 'dispute_opened_at');
    NEW.dispute_opened_at := OLD.dispute_opened_at;
  END IF;
  IF NEW.dispute_resolved_at IS DISTINCT FROM OLD.dispute_resolved_at THEN
    rejected := array_append(rejected, 'dispute_resolved_at');
    NEW.dispute_resolved_at := OLD.dispute_resolved_at;
  END IF;
  IF NEW.scheduled_date IS DISTINCT FROM OLD.scheduled_date THEN
    rejected := array_append(rejected, 'scheduled_date');
    NEW.scheduled_date := OLD.scheduled_date;
  END IF;
  IF NEW.scheduled_time IS DISTINCT FROM OLD.scheduled_time THEN
    rejected := array_append(rejected, 'scheduled_time');
    NEW.scheduled_time := OLD.scheduled_time;
  END IF;
  IF NEW.service_address IS DISTINCT FROM OLD.service_address THEN
    rejected := array_append(rejected, 'service_address');
    NEW.service_address := OLD.service_address;
  END IF;
  IF NEW.service_lat IS DISTINCT FROM OLD.service_lat THEN
    rejected := array_append(rejected, 'service_lat');
    NEW.service_lat := OLD.service_lat;
  END IF;
  IF NEW.service_lng IS DISTINCT FROM OLD.service_lng THEN
    rejected := array_append(rejected, 'service_lng');
    NEW.service_lng := OLD.service_lng;
  END IF;
  IF NEW.travel_distance_miles IS DISTINCT FROM OLD.travel_distance_miles THEN
    rejected := array_append(rejected, 'travel_distance_miles');
    NEW.travel_distance_miles := OLD.travel_distance_miles;
  END IF;
  IF NEW.auto_cancel_at IS DISTINCT FROM OLD.auto_cancel_at THEN
    rejected := array_append(rejected, 'auto_cancel_at');
    NEW.auto_cancel_at := OLD.auto_cancel_at;
  END IF;
  IF NEW.notes IS DISTINCT FROM OLD.notes THEN
    rejected := array_append(rejected, 'notes');
    NEW.notes := OLD.notes;
  END IF;

  -- Immutable identifiers.
  NEW.id          := OLD.id;
  NEW.service_id  := OLD.service_id;
  NEW.business_id := OLD.business_id;
  NEW.created_at  := OLD.created_at;

  IF array_length(rejected, 1) > 0 THEN
    INSERT INTO public.booking_update_audit (booking_id, consumer_id, rejected_fields, attempted_values)
    VALUES (OLD.id, auth.uid(), rejected, attempted);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_restrict_business_booking_updates ON public.bookings;
CREATE TRIGGER trg_restrict_business_booking_updates
BEFORE UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.restrict_business_booking_updates();

-- 3. Tighten function executability.
REVOKE EXECUTE ON FUNCTION public.get_travel_estimate(uuid, double precision, double precision) FROM anon;

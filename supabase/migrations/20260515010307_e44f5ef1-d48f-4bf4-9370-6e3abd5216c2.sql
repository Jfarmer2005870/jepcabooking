CREATE OR REPLACE FUNCTION public.restrict_consumer_booking_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_provider boolean;
BEGIN
  -- Skip enforcement for service_role / no auth context (backend code, triggers from edge fns)
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Allow provider (business owner) full update access already gated by RLS
  SELECT EXISTS (
    SELECT 1 FROM public.business_profiles bp
    WHERE bp.id = NEW.business_id AND bp.user_id = auth.uid()
  ) INTO is_provider;

  IF is_provider THEN
    RETURN NEW;
  END IF;

  -- Consumer update: enforce allowlist (only listed fields may change)
  IF NEW.consumer_id = auth.uid() THEN
    IF NEW.id                  IS DISTINCT FROM OLD.id
    OR NEW.service_id          IS DISTINCT FROM OLD.service_id
    OR NEW.business_id         IS DISTINCT FROM OLD.business_id
    OR NEW.consumer_id         IS DISTINCT FROM OLD.consumer_id
    OR NEW.status              IS DISTINCT FROM OLD.status
    OR NEW.total_price         IS DISTINCT FROM OLD.total_price
    OR NEW.platform_fee        IS DISTINCT FROM OLD.platform_fee
    OR NEW.travel_fee          IS DISTINCT FROM OLD.travel_fee
    OR NEW.travel_distance_miles IS DISTINCT FROM OLD.travel_distance_miles
    OR NEW.payment_status      IS DISTINCT FROM OLD.payment_status
    OR NEW.payment_intent_id   IS DISTINCT FROM OLD.payment_intent_id
    OR NEW.refunded_amount     IS DISTINCT FROM OLD.refunded_amount
    OR NEW.dispute_status      IS DISTINCT FROM OLD.dispute_status
    OR NEW.dispute_reason      IS DISTINCT FROM OLD.dispute_reason
    OR NEW.dispute_opened_at   IS DISTINCT FROM OLD.dispute_opened_at
    OR NEW.dispute_resolved_at IS DISTINCT FROM OLD.dispute_resolved_at
    OR NEW.business_signature       IS DISTINCT FROM OLD.business_signature
    OR NEW.business_signature_name  IS DISTINCT FROM OLD.business_signature_name
    OR NEW.business_signature_at    IS DISTINCT FROM OLD.business_signature_at
    OR NEW.invoice_photos      IS DISTINCT FROM OLD.invoice_photos
    OR NEW.auto_cancel_at      IS DISTINCT FROM OLD.auto_cancel_at
    OR NEW.created_at          IS DISTINCT FROM OLD.created_at
    THEN
      RAISE EXCEPTION 'Consumers can only update notes, signature, schedule, and service address fields'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_restrict_consumer_booking_updates ON public.bookings;
CREATE TRIGGER trg_restrict_consumer_booking_updates
BEFORE UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.restrict_consumer_booking_updates();

REVOKE EXECUTE ON FUNCTION public.restrict_consumer_booking_updates() FROM PUBLIC, anon, authenticated;

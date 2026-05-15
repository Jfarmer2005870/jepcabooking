-- 1. Audit table for blocked consumer booking update attempts
CREATE TABLE IF NOT EXISTS public.booking_update_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  consumer_id uuid NOT NULL,
  rejected_fields text[] NOT NULL,
  attempted_values jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_update_audit_booking ON public.booking_update_audit (booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_update_audit_consumer ON public.booking_update_audit (consumer_id);
CREATE INDEX IF NOT EXISTS idx_booking_update_audit_created ON public.booking_update_audit (created_at DESC);

ALTER TABLE public.booking_update_audit ENABLE ROW LEVEL SECURITY;

-- Only service role / backend can read or write the audit log directly via the API.
CREATE POLICY "Service role can read audit log"
ON public.booking_update_audit
FOR SELECT
USING (auth.role() = 'service_role');

CREATE POLICY "Service role can insert audit log"
ON public.booking_update_audit
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- 2. Replace trigger function: log + scrub instead of raise
CREATE OR REPLACE FUNCTION public.restrict_consumer_booking_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  is_provider boolean;
  rejected text[] := ARRAY[]::text[];
  attempted jsonb := '{}'::jsonb;
BEGIN
  -- Skip enforcement for service_role / backend (no auth context)
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Providers update via separate RLS policy; not subject to this allowlist
  SELECT EXISTS (
    SELECT 1 FROM public.business_profiles bp
    WHERE bp.id = NEW.business_id AND bp.user_id = auth.uid()
  ) INTO is_provider;

  IF is_provider THEN
    RETURN NEW;
  END IF;

  -- Only enforce for consumer attempting to update their own booking
  IF NEW.consumer_id <> auth.uid() THEN
    RETURN NEW;
  END IF;

  -- For each blocked field: if changed, record the attempt and revert NEW to OLD.
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    rejected := array_append(rejected, 'status');
    attempted := attempted || jsonb_build_object('status', NEW.status);
    NEW.status := OLD.status;
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
  IF NEW.travel_distance_miles IS DISTINCT FROM OLD.travel_distance_miles THEN
    rejected := array_append(rejected, 'travel_distance_miles');
    attempted := attempted || jsonb_build_object('travel_distance_miles', NEW.travel_distance_miles);
    NEW.travel_distance_miles := OLD.travel_distance_miles;
  END IF;
  IF NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
    rejected := array_append(rejected, 'payment_status');
    attempted := attempted || jsonb_build_object('payment_status', NEW.payment_status);
    NEW.payment_status := OLD.payment_status;
  END IF;
  IF NEW.payment_intent_id IS DISTINCT FROM OLD.payment_intent_id THEN
    rejected := array_append(rejected, 'payment_intent_id');
    attempted := attempted || jsonb_build_object('payment_intent_id', NEW.payment_intent_id);
    NEW.payment_intent_id := OLD.payment_intent_id;
  END IF;
  IF NEW.refunded_amount IS DISTINCT FROM OLD.refunded_amount THEN
    rejected := array_append(rejected, 'refunded_amount');
    attempted := attempted || jsonb_build_object('refunded_amount', NEW.refunded_amount);
    NEW.refunded_amount := OLD.refunded_amount;
  END IF;
  IF NEW.dispute_status IS DISTINCT FROM OLD.dispute_status THEN
    rejected := array_append(rejected, 'dispute_status');
    attempted := attempted || jsonb_build_object('dispute_status', NEW.dispute_status);
    NEW.dispute_status := OLD.dispute_status;
  END IF;
  IF NEW.dispute_reason IS DISTINCT FROM OLD.dispute_reason THEN
    rejected := array_append(rejected, 'dispute_reason');
    attempted := attempted || jsonb_build_object('dispute_reason', NEW.dispute_reason);
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
  IF NEW.business_signature IS DISTINCT FROM OLD.business_signature THEN
    rejected := array_append(rejected, 'business_signature');
    NEW.business_signature := OLD.business_signature;
  END IF;
  IF NEW.business_signature_name IS DISTINCT FROM OLD.business_signature_name THEN
    rejected := array_append(rejected, 'business_signature_name');
    NEW.business_signature_name := OLD.business_signature_name;
  END IF;
  IF NEW.business_signature_at IS DISTINCT FROM OLD.business_signature_at THEN
    rejected := array_append(rejected, 'business_signature_at');
    NEW.business_signature_at := OLD.business_signature_at;
  END IF;
  IF NEW.invoice_photos IS DISTINCT FROM OLD.invoice_photos THEN
    rejected := array_append(rejected, 'invoice_photos');
    NEW.invoice_photos := OLD.invoice_photos;
  END IF;
  IF NEW.auto_cancel_at IS DISTINCT FROM OLD.auto_cancel_at THEN
    rejected := array_append(rejected, 'auto_cancel_at');
    NEW.auto_cancel_at := OLD.auto_cancel_at;
  END IF;

  -- Immutable identifiers: keep the hard rollback (these should never change)
  NEW.id          := OLD.id;
  NEW.service_id  := OLD.service_id;
  NEW.business_id := OLD.business_id;
  NEW.consumer_id := OLD.consumer_id;
  NEW.created_at  := OLD.created_at;

  -- Persist audit row if anything was rejected. Insert runs as the function
  -- owner (SECURITY DEFINER) so RLS does not block it.
  IF array_length(rejected, 1) > 0 THEN
    INSERT INTO public.booking_update_audit (booking_id, consumer_id, rejected_fields, attempted_values)
    VALUES (OLD.id, auth.uid(), rejected, attempted);
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.restrict_consumer_booking_updates() FROM PUBLIC, anon, authenticated;
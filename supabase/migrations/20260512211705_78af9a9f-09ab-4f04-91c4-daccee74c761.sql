-- Add dispute_reason and dispute_resolution columns
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS dispute_reason text,
  ADD COLUMN IF NOT EXISTS dispute_opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS dispute_resolved_at timestamptz;

-- Notify business owner when a consumer opens a dispute
CREATE OR REPLACE FUNCTION public.notify_business_on_dispute()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  business_user uuid;
  service_title text;
BEGIN
  IF NEW.dispute_status = 'open' AND (OLD.dispute_status IS DISTINCT FROM 'open') THEN
    SELECT bp.user_id INTO business_user FROM public.business_profiles bp WHERE bp.id = NEW.business_id;
    SELECT s.title INTO service_title FROM public.services s WHERE s.id = NEW.service_id;
    IF business_user IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, message, related_id)
      VALUES (
        business_user,
        'dispute_opened',
        'Customer reported an issue',
        'A customer reported an issue with "' || COALESCE(service_title, 'a booking') || '". Review and resolve in your dashboard.',
        NEW.id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_business_on_dispute ON public.bookings;
CREATE TRIGGER trg_notify_business_on_dispute
AFTER UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.notify_business_on_dispute();

-- Notify consumer when refund issued
CREATE OR REPLACE FUNCTION public.notify_consumer_on_refund()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.refunded_amount IS NOT NULL
     AND NEW.refunded_amount > COALESCE(OLD.refunded_amount, 0) THEN
    INSERT INTO public.notifications (user_id, type, title, message, related_id)
    VALUES (
      NEW.consumer_id,
      'refund_issued',
      'Refund issued',
      'A refund of $' || to_char(NEW.refunded_amount - COALESCE(OLD.refunded_amount, 0), 'FM999990.00') || ' has been issued to your card.',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_consumer_on_refund ON public.bookings;
CREATE TRIGGER trg_notify_consumer_on_refund
AFTER UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.notify_consumer_on_refund();
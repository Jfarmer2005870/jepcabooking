-- Add auto-cancel deadline to bookings
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS auto_cancel_at timestamp with time zone;

-- For new pending bookings, default 24h from creation
CREATE OR REPLACE FUNCTION public.set_booking_auto_cancel()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'pending' AND NEW.auto_cancel_at IS NULL THEN
    NEW.auto_cancel_at := now() + interval '24 hours';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_booking_auto_cancel ON public.bookings;
CREATE TRIGGER trg_set_booking_auto_cancel
BEFORE INSERT ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.set_booking_auto_cancel();

-- Notify business when a new pending booking is created
CREATE OR REPLACE FUNCTION public.notify_business_on_new_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  business_user uuid;
  service_title text;
BEGIN
  SELECT bp.user_id INTO business_user
  FROM public.business_profiles bp
  WHERE bp.id = NEW.business_id;

  SELECT s.title INTO service_title
  FROM public.services s
  WHERE s.id = NEW.service_id;

  IF business_user IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, related_id)
    VALUES (
      business_user,
      'booking_request',
      'New booking request',
      'You have a new pending booking for "' || COALESCE(service_title, 'a service') || '". Accept within 24 hours.',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_business_new_booking ON public.bookings;
CREATE TRIGGER trg_notify_business_new_booking
AFTER INSERT ON public.bookings
FOR EACH ROW
WHEN (NEW.status = 'pending')
EXECUTE FUNCTION public.notify_business_on_new_booking();

-- Enable extensions for cron
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
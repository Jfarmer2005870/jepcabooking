-- Trigger to notify consumer when their booking is completed (so they can leave a review)
CREATE OR REPLACE FUNCTION public.notify_consumer_on_booking_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  service_title text;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    SELECT s.title INTO service_title FROM public.services s WHERE s.id = NEW.service_id;

    INSERT INTO public.notifications (user_id, type, title, message, related_id)
    VALUES (
      NEW.consumer_id,
      'booking_completed',
      'Job complete — leave a review',
      'Your "' || COALESCE(service_title, 'service') || '" booking is marked complete. Tap to leave a review.',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_consumer_on_completed ON public.bookings;
CREATE TRIGGER trg_notify_consumer_on_completed
AFTER UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.notify_consumer_on_booking_completed();

-- Add Stripe-related columns to bookings for webhook tracking
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS refunded_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dispute_status text,
  ADD COLUMN IF NOT EXISTS payment_status text;
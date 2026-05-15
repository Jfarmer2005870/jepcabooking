CREATE TABLE public.stripe_webhook_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  signature_verified boolean NOT NULL DEFAULT false,
  payment_intent_id text,
  related_booking_id uuid,
  processing_status text NOT NULL DEFAULT 'received',
  error_message text,
  payload jsonb NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

CREATE INDEX idx_stripe_webhook_events_received_at ON public.stripe_webhook_events (received_at DESC);
CREATE INDEX idx_stripe_webhook_events_booking ON public.stripe_webhook_events (related_booking_id);
CREATE INDEX idx_stripe_webhook_events_type ON public.stripe_webhook_events (event_type);

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can read webhook events"
  ON public.stripe_webhook_events FOR SELECT
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can insert webhook events"
  ON public.stripe_webhook_events FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update webhook events"
  ON public.stripe_webhook_events FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
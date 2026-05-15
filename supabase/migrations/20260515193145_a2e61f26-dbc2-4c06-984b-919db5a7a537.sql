
-- Add admin role to enum if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'user_role' AND e.enumlabel = 'admin'
  ) THEN
    ALTER TYPE public.user_role ADD VALUE 'admin';
  END IF;
END$$;

-- Monitoring alerts table
CREATE TABLE IF NOT EXISTS public.monitoring_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL,
  severity text NOT NULL DEFAULT 'warning',
  title text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  related_booking_id uuid,
  related_event_id text,
  dedupe_key text NOT NULL,
  resolved boolean NOT NULL DEFAULT false,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS monitoring_alerts_dedupe_key_idx ON public.monitoring_alerts (dedupe_key);
CREATE INDEX IF NOT EXISTS monitoring_alerts_unresolved_idx ON public.monitoring_alerts (resolved, created_at DESC);

ALTER TABLE public.monitoring_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view alerts"
  ON public.monitoring_alerts FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can resolve alerts"
  ON public.monitoring_alerts FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can insert alerts"
  ON public.monitoring_alerts FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can read alerts"
  ON public.monitoring_alerts FOR SELECT
  USING (auth.role() = 'service_role');

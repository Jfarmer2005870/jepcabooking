CREATE TABLE IF NOT EXISTS public.provider_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6), -- 0=Sun .. 6=Sat
  start_time time NOT NULL,
  end_time time NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_provider_availability_business_weekday
  ON public.provider_availability (business_id, weekday);

ALTER TABLE public.provider_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view provider availability"
  ON public.provider_availability FOR SELECT
  USING (true);

CREATE POLICY "Owner can manage their availability"
  ON public.provider_availability FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.business_profiles bp
    WHERE bp.id = provider_availability.business_id
      AND bp.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.business_profiles bp
    WHERE bp.id = provider_availability.business_id
      AND bp.user_id = auth.uid()
  ));

CREATE TRIGGER update_provider_availability_updated_at
  BEFORE UPDATE ON public.provider_availability
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
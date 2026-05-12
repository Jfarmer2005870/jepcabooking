
CREATE POLICY "Providers can view their booking customers' profile"
ON public.profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.bookings b
    JOIN public.business_profiles bp ON bp.id = b.business_id
    WHERE b.consumer_id = profiles.user_id
      AND bp.user_id = auth.uid()
  )
);

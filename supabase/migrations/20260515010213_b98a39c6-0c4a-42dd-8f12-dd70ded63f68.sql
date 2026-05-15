CREATE POLICY "Providers can update their invoice photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'invoice-photos'
  AND EXISTS (
    SELECT 1 FROM public.bookings b
    JOIN public.business_profiles bp ON bp.id = b.business_id
    WHERE bp.user_id = auth.uid()
      AND b.id::text = (storage.foldername(objects.name))[1]
  )
)
WITH CHECK (
  bucket_id = 'invoice-photos'
  AND EXISTS (
    SELECT 1 FROM public.bookings b
    JOIN public.business_profiles bp ON bp.id = b.business_id
    WHERE bp.user_id = auth.uid()
      AND b.id::text = (storage.foldername(objects.name))[1]
  )
);

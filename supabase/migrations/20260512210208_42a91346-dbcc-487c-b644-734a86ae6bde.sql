
-- Make bucket private
UPDATE storage.buckets SET public = false WHERE id = 'invoice-photos';

-- Drop public-read policy
DROP POLICY IF EXISTS "Invoice photos are publicly viewable" ON storage.objects;

-- Provider OR consumer of the booking can view
CREATE POLICY "Booking parties can view invoice photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'invoice-photos'
  AND EXISTS (
    SELECT 1 FROM public.bookings b
    LEFT JOIN public.business_profiles bp ON bp.id = b.business_id
    WHERE (b.id)::text = (storage.foldername(objects.name))[1]
      AND (bp.user_id = auth.uid() OR b.consumer_id = auth.uid())
  )
);

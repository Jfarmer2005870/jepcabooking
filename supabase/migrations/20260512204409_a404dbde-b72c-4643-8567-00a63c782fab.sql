-- Add invoice photos and consumer signature columns
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS invoice_photos text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS consumer_signature text,
  ADD COLUMN IF NOT EXISTS consumer_signature_name text,
  ADD COLUMN IF NOT EXISTS consumer_signature_at timestamptz;

-- Allow consumers to update their own bookings to add signature
-- (existing policy only allows pending status updates; add a separate one for signature)
DROP POLICY IF EXISTS "Consumers can sign their bookings" ON public.bookings;
CREATE POLICY "Consumers can sign their bookings"
ON public.bookings
FOR UPDATE
TO authenticated
USING (consumer_id = auth.uid())
WITH CHECK (consumer_id = auth.uid());

-- Storage bucket for invoice photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoice-photos', 'invoice-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Public read of invoice photos (URLs are unguessable, scoped per booking folder)
DROP POLICY IF EXISTS "Invoice photos are publicly viewable" ON storage.objects;
CREATE POLICY "Invoice photos are publicly viewable"
ON storage.objects FOR SELECT
USING (bucket_id = 'invoice-photos');

-- Providers (business owners) can upload photos for bookings they own
DROP POLICY IF EXISTS "Providers can upload invoice photos" ON storage.objects;
CREATE POLICY "Providers can upload invoice photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'invoice-photos'
  AND EXISTS (
    SELECT 1 FROM public.bookings b
    JOIN public.business_profiles bp ON bp.id = b.business_id
    WHERE bp.user_id = auth.uid()
      AND b.id::text = (storage.foldername(name))[1]
  )
);

DROP POLICY IF EXISTS "Providers can delete their invoice photos" ON storage.objects;
CREATE POLICY "Providers can delete their invoice photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'invoice-photos'
  AND EXISTS (
    SELECT 1 FROM public.bookings b
    JOIN public.business_profiles bp ON bp.id = b.business_id
    WHERE bp.user_id = auth.uid()
      AND b.id::text = (storage.foldername(name))[1]
  )
);
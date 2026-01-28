-- Create service categories enum
CREATE TYPE public.service_category AS ENUM (
  'cleaning',
  'plumbing',
  'electrical',
  'landscaping',
  'painting',
  'moving',
  'handyman',
  'hvac',
  'pest_control',
  'other'
);

-- Create booking status enum
CREATE TYPE public.booking_status AS ENUM (
  'pending',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled'
);

-- Create services table
CREATE TABLE public.services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category service_category NOT NULL DEFAULT 'other',
  price_min NUMERIC(10,2),
  price_max NUMERIC(10,2),
  price_type TEXT DEFAULT 'fixed' CHECK (price_type IN ('fixed', 'hourly', 'quote')),
  duration_minutes INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bookings table
CREATE TABLE public.bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  consumer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  status booking_status NOT NULL DEFAULT 'pending',
  scheduled_date DATE,
  scheduled_time TIME,
  notes TEXT,
  total_price NUMERIC(10,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reviews table
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  consumer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Services policies
CREATE POLICY "Anyone can view active services"
  ON public.services FOR SELECT
  USING (is_active = true);

CREATE POLICY "Business owners can manage their services"
  ON public.services FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.business_profiles bp
      WHERE bp.id = business_id AND bp.user_id = auth.uid()
    )
  );

-- Bookings policies
CREATE POLICY "Consumers can view their bookings"
  ON public.bookings FOR SELECT
  USING (consumer_id = auth.uid());

CREATE POLICY "Business owners can view their bookings"
  ON public.bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.business_profiles bp
      WHERE bp.id = business_id AND bp.user_id = auth.uid()
    )
  );

CREATE POLICY "Consumers can create bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (consumer_id = auth.uid());

CREATE POLICY "Consumers can update their pending bookings"
  ON public.bookings FOR UPDATE
  USING (consumer_id = auth.uid() AND status = 'pending');

CREATE POLICY "Business owners can update booking status"
  ON public.bookings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.business_profiles bp
      WHERE bp.id = business_id AND bp.user_id = auth.uid()
    )
  );

-- Reviews policies
CREATE POLICY "Anyone can view reviews"
  ON public.reviews FOR SELECT
  USING (true);

CREATE POLICY "Consumers can create reviews for their completed bookings"
  ON public.reviews FOR INSERT
  WITH CHECK (
    consumer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND b.consumer_id = auth.uid() AND b.status = 'completed'
    )
  );

-- Create triggers for updated_at
CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
-- Add service_address column to bookings table for where the service will be performed
ALTER TABLE public.bookings 
ADD COLUMN service_address text;
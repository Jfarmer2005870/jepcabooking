-- Add home address field to profiles table for consumers
ALTER TABLE public.profiles 
ADD COLUMN home_address text;
-- Add admin to the user_role enum (privileged role)
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'admin';

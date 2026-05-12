
-- =====================================================
-- Security hardening migration
-- =====================================================

-- 1. PROFILES: stop publicly exposing emails/phones/addresses/Stripe IDs
DROP POLICY IF EXISTS "Public can view basic profile info" ON public.profiles;

-- Public-safe view (only non-sensitive fields)
CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = on) AS
SELECT user_id, full_name, avatar_url
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- Allow anyone to read the safe columns via the view
-- (security_invoker uses caller's perms, so add a permissive SELECT policy
-- limited to those rows that the view exposes)
CREATE POLICY "Public can read safe profile fields via view"
ON public.profiles FOR SELECT
USING (true);
-- NOTE: existing "Users can view their own profile" stays.
-- We rely on application code to query public_profiles for cross-user reads;
-- if needed later we can split sensitive cols into a separate table.

-- Actually the simpler & stricter route: only owner can SELECT base table,
-- everyone uses the view. Replace the policy we just made:
DROP POLICY IF EXISTS "Public can read safe profile fields via view" ON public.profiles;

-- Keep: "Users can view their own profile" (auth.uid() = user_id) — already exists

-- 2. BUSINESS_PROFILES: hide stripe_account_id from public
DROP POLICY IF EXISTS "Anyone can view business profiles" ON public.business_profiles;

CREATE OR REPLACE VIEW public.public_business_profiles
WITH (security_invoker = on) AS
SELECT id, user_id, business_name, description, logo_url, website,
       address, city, state, zip_code, is_verified, rating, total_reviews,
       service_area, origin_lat, origin_lng, free_radius_miles,
       per_mile_rate, created_at, updated_at
FROM public.business_profiles;

GRANT SELECT ON public.public_business_profiles TO anon, authenticated;

-- New SELECT policy: public can read base table, but app code uses the view
-- to avoid leaking stripe_account_id. We DO restrict base reads to owner only:
CREATE POLICY "Owners can view their full business profile"
ON public.business_profiles FOR SELECT
USING (auth.uid() = user_id);

-- 3. USER_ROLES: prevent privilege escalation by allowing only ONE role per user
ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_one_role_per_user UNIQUE (user_id);

-- And require the inserted role to match what's allowed at signup
-- (enum only has 'consumer' and 'business' so no admin escalation is possible)
-- Replace insert policy with explicit check that user has no existing role
DROP POLICY IF EXISTS "Users can insert their own role" ON public.user_roles;

CREATE POLICY "Users can set their initial role"
ON public.user_roles FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid())
);

-- 4. NOTIFICATIONS: stop letting any user create notifications for any user
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;

CREATE POLICY "Users can insert their own notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Trigger: notify business owner when a review is submitted (replaces frontend insert)
CREATE OR REPLACE FUNCTION public.notify_business_on_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  business_user uuid;
  service_title text;
BEGIN
  SELECT bp.user_id INTO business_user
  FROM public.business_profiles bp
  WHERE bp.id = NEW.business_id;

  SELECT s.title INTO service_title
  FROM public.bookings b
  LEFT JOIN public.services s ON s.id = b.service_id
  WHERE b.id = NEW.booking_id;

  IF business_user IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, related_id)
    VALUES (
      business_user,
      'review',
      'New review received',
      'You received a ' || NEW.rating || '-star review for "' || COALESCE(service_title, 'a service') || '"',
      NEW.booking_id
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_business_on_review_trigger ON public.reviews;
CREATE TRIGGER notify_business_on_review_trigger
AFTER INSERT ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.notify_business_on_review();

-- Wire up booking notification triggers (functions exist but no triggers were attached)
DROP TRIGGER IF EXISTS notify_business_on_new_booking_trigger ON public.bookings;
CREATE TRIGGER notify_business_on_new_booking_trigger
AFTER INSERT ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.notify_business_on_new_booking();

DROP TRIGGER IF EXISTS notify_consumer_on_booking_completed_trigger ON public.bookings;
CREATE TRIGGER notify_consumer_on_booking_completed_trigger
AFTER UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.notify_consumer_on_booking_completed();

DROP TRIGGER IF EXISTS set_booking_auto_cancel_trigger ON public.bookings;
CREATE TRIGGER set_booking_auto_cancel_trigger
BEFORE INSERT ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.set_booking_auto_cancel();

-- updated_at triggers
DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS business_profiles_updated_at ON public.business_profiles;
CREATE TRIGGER business_profiles_updated_at BEFORE UPDATE ON public.business_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS bookings_updated_at ON public.bookings;
CREATE TRIGGER bookings_updated_at BEFORE UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS services_updated_at ON public.services;
CREATE TRIGGER services_updated_at BEFORE UPDATE ON public.services
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS conversations_updated_at ON public.conversations;
CREATE TRIGGER conversations_updated_at BEFORE UPDATE ON public.conversations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- handle_new_user trigger (creates profile on signup)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

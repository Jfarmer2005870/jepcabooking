
-- Make my_business_profile read using definer rights so the column grant on stripe_account_id is bypassed,
-- but the WHERE user_id = auth.uid() in the view still scopes it to the owner.
DROP VIEW IF EXISTS public.my_business_profile;

CREATE VIEW public.my_business_profile
WITH (security_invoker = off) AS
SELECT * FROM public.business_profiles WHERE user_id = auth.uid();

GRANT SELECT ON public.my_business_profile TO authenticated;

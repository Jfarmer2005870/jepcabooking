DROP POLICY IF EXISTS "Users can set their initial role" ON public.user_roles;

CREATE POLICY "Users can set their initial non-privileged role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND role IN ('consumer'::public.user_role, 'business'::public.user_role)
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid()
  )
);

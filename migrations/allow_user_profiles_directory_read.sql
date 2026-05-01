-- Allow every authenticated user to see the shared community directory.
-- Keep write restrictions from create_user_profiles_roles.sql unchanged.

DROP POLICY IF EXISTS "profiles_select_own_or_staff" ON public.user_profiles;
CREATE POLICY "profiles_select_authenticated_directory"
ON public.user_profiles
FOR SELECT
USING (auth.uid() IS NOT NULL);

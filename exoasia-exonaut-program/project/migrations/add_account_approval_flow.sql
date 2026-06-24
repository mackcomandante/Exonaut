-- Future-only account approval flow.
-- Existing profile rows are backfilled to active before the future default becomes pending.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS approval_status text,
  ADD COLUMN IF NOT EXISTS approval_reason text,
  ADD COLUMN IF NOT EXISTS requested_role text,
  ADD COLUMN IF NOT EXISTS requested_cohort_id text,
  ADD COLUMN IF NOT EXISTS requested_track_code text,
  ADD COLUMN IF NOT EXISTS email_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_profiles_approval_status_check'
      AND conrelid = 'public.user_profiles'::regclass
  ) THEN
    ALTER TABLE public.user_profiles
      ADD CONSTRAINT user_profiles_approval_status_check
      CHECK (approval_status IN ('pending_approval', 'active', 'rejected', 'suspended'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_profiles_requested_role_check'
      AND conrelid = 'public.user_profiles'::regclass
  ) THEN
    ALTER TABLE public.user_profiles
      ADD CONSTRAINT user_profiles_requested_role_check
      CHECK (requested_role IS NULL OR requested_role IN ('exonaut', 'commander', 'admin'));
  END IF;
END $$;

UPDATE public.user_profiles
SET approval_status = 'active'
WHERE approval_status IS NULL;

ALTER TABLE public.user_profiles
  ALTER COLUMN approval_status SET DEFAULT 'pending_approval',
  ALTER COLUMN approval_status SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_profiles_approval_status
  ON public.user_profiles(approval_status);

CREATE INDEX IF NOT EXISTS idx_user_profiles_requested_cohort_track
  ON public.user_profiles(requested_cohort_id, requested_track_code);

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested_role_value text := COALESCE(NEW.raw_user_meta_data->>'role', 'exonaut');
  requested_cohort_value text := COALESCE(NULLIF(NEW.raw_user_meta_data->>'cohort_id', ''), 'c2627');
  requested_track_value text := COALESCE(NULLIF(NEW.raw_user_meta_data->>'track_code', ''), 'AIS');
BEGIN
  IF requested_role_value NOT IN ('exonaut', 'commander', 'admin') THEN
    requested_role_value := 'exonaut';
  END IF;

  INSERT INTO public.user_profiles (
    id,
    email,
    full_name,
    role,
    cohort_id,
    track_code,
    approval_status,
    requested_role,
    requested_cohort_id,
    requested_track_code,
    email_confirmed_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email, 'Exonaut'),
    'exonaut',
    requested_cohort_value,
    requested_track_value,
    'pending_approval',
    requested_role_value,
    requested_cohort_value,
    requested_track_value,
    NEW.email_confirmed_at
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = COALESCE(public.user_profiles.full_name, EXCLUDED.full_name),
    requested_role = COALESCE(public.user_profiles.requested_role, EXCLUDED.requested_role),
    requested_cohort_id = COALESCE(public.user_profiles.requested_cohort_id, EXCLUDED.requested_cohort_id),
    requested_track_code = COALESCE(public.user_profiles.requested_track_code, EXCLUDED.requested_track_code),
    email_confirmed_at = COALESCE(EXCLUDED.email_confirmed_at, public.user_profiles.email_confirmed_at),
    approval_status = COALESCE(public.user_profiles.approval_status, 'pending_approval');

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_auth_email_confirmation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email_confirmed_at IS DISTINCT FROM OLD.email_confirmed_at THEN
    UPDATE public.user_profiles
    SET email_confirmed_at = NEW.email_confirmed_at
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_auth_email_confirmation_on_auth_users ON auth.users;
CREATE TRIGGER sync_auth_email_confirmation_on_auth_users
AFTER UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.sync_auth_email_confirmation();

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE id = auth.uid()
      AND role = 'admin'
      AND approval_status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.can_update_own_profile_limited(
  target_id uuid,
  next_role text,
  next_status text,
  next_cohort_id text,
  next_track_code text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT target_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.user_profiles
      WHERE id = auth.uid()
        AND role = next_role
        AND approval_status = next_status
        AND COALESCE(cohort_id, '') = COALESCE(next_cohort_id, '')
        AND COALESCE(track_code, '') = COALESCE(next_track_code, '')
    );
$$;

DROP POLICY IF EXISTS profiles_update_own_limited ON public.user_profiles;
CREATE POLICY profiles_update_own_limited ON public.user_profiles
FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (public.can_update_own_profile_limited(id, role, approval_status, cohort_id, track_code));

DROP POLICY IF EXISTS "user_profiles_insert_self" ON public.user_profiles;
CREATE POLICY "user_profiles_insert_self" ON public.user_profiles
FOR INSERT TO authenticated
WITH CHECK (
  id = auth.uid()
  AND role = 'exonaut'
  AND approval_status = 'pending_approval'
);

DROP POLICY IF EXISTS profiles_select_own_approval_status ON public.user_profiles;
CREATE POLICY profiles_select_own_approval_status ON public.user_profiles
FOR SELECT TO authenticated
USING (id = auth.uid());

DROP POLICY IF EXISTS profiles_admin_approval_update ON public.user_profiles;
CREATE POLICY profiles_admin_approval_update ON public.user_profiles
FOR UPDATE TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS profiles_admin_approval_read ON public.user_profiles;
CREATE POLICY profiles_admin_approval_read ON public.user_profiles
FOR SELECT TO authenticated
USING (public.is_admin());

-- Migration: Supabase auth roles for Exonaut platform users
-- Run in Supabase SQL Editor after enabling Supabase Auth.
--
-- Role model:
--   exonaut   - can self-register from the app
--   lead      - temporarily allowed to self-register from the app
--   commander - temporarily allowed to self-register from the app
--   admin     - temporarily allowed to self-register from the app

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  role text NOT NULL DEFAULT 'exonaut'
    CHECK (role IN ('exonaut', 'lead', 'commander', 'admin')),
  cohort_id text DEFAULT 'c2627',
  track_code text,
  bio text,
  linkedin_url text,
  school text,
  expertise text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS linkedin_url text,
  ADD COLUMN IF NOT EXISTS school text,
  ADD COLUMN IF NOT EXISTS expertise text,
  ADD COLUMN IF NOT EXISTS avatar_url text;

CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_cohort ON public.user_profiles(cohort_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_track ON public.user_profiles(track_code);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER trg_user_profiles_updated_at
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Creates a profile whenever a Supabase Auth user is created.
-- Creates a profile whenever a Supabase Auth user is created.
-- Temporary self-registration mode: role is read from Auth metadata when valid.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested_role text;
BEGIN
  requested_role := COALESCE(NEW.raw_user_meta_data->>'role', 'exonaut');
  IF requested_role NOT IN ('exonaut', 'lead', 'commander', 'admin') THEN
    requested_role := 'exonaut';
  END IF;

  INSERT INTO public.user_profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    requested_role
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(public.user_profiles.full_name, EXCLUDED.full_name),
    role = EXCLUDED.role;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_auth_user();

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.has_role(required_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_user_role() = required_role
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(required_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_user_role() = ANY(required_roles)
$$;

DROP POLICY IF EXISTS "profiles_select_own_or_staff" ON public.user_profiles;
CREATE POLICY "profiles_select_own_or_staff"
ON public.user_profiles
FOR SELECT
USING (
  id = auth.uid()
  OR public.has_any_role(ARRAY['lead', 'commander', 'admin'])
);

DROP POLICY IF EXISTS "profiles_update_own_limited" ON public.user_profiles;
CREATE POLICY "profiles_update_own_limited"
ON public.user_profiles
FOR UPDATE
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid()
  AND role = (SELECT role FROM public.user_profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "profiles_admin_all" ON public.user_profiles;
CREATE POLICY "profiles_admin_all"
ON public.user_profiles
FOR ALL
USING (public.has_role('admin'))
WITH CHECK (public.has_role('admin'));

-- Manual staff setup examples:
--
-- 1. Create the staff user in Supabase Dashboard > Authentication > Users.
-- 2. Copy that user's UUID.
-- 3. Upsert their profile:
--
-- INSERT INTO public.user_profiles (id, email, full_name, role, track_code)
-- VALUES ('USER_UUID_HERE', 'lead@example.com', 'Lead Name', 'lead', 'AIS')
-- ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, track_code = EXCLUDED.track_code;
--
-- INSERT INTO public.user_profiles (id, email, full_name, role)
-- VALUES ('USER_UUID_HERE', 'admin@example.com', 'Ops Admin', 'admin')
-- ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;

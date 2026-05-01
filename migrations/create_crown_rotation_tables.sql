-- Crown rotation tables for temporary Track Ops access.
-- Run after migrations/create_user_profiles_roles.sql.

CREATE TABLE IF NOT EXISTS public.crown_assignments (
  id text PRIMARY KEY,
  track_code text NOT NULL,
  cohort_id text NOT NULL DEFAULT 'c2627',
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'replaced', 'revoked')),
  started_at timestamptz NOT NULL DEFAULT now(),
  due_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  previous_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_crown_assignments_one_active_track
ON public.crown_assignments(track_code)
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_crown_assignments_user ON public.crown_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_crown_assignments_track ON public.crown_assignments(track_code);

CREATE TABLE IF NOT EXISTS public.crown_transfer_requests (
  id text PRIMARY KEY,
  type text NOT NULL DEFAULT 'transfer'
    CHECK (type IN ('transfer', 'admin-assign')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'denied')),
  track_code text NOT NULL,
  cohort_id text NOT NULL DEFAULT 'c2627',
  from_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  to_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  approved_at timestamptz,
  denied_at timestamptz,
  note text,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crown_transfer_requests_status ON public.crown_transfer_requests(status);
CREATE INDEX IF NOT EXISTS idx_crown_transfer_requests_track ON public.crown_transfer_requests(track_code);
CREATE INDEX IF NOT EXISTS idx_crown_transfer_requests_requested_by ON public.crown_transfer_requests(requested_by);

DROP TRIGGER IF EXISTS trg_crown_assignments_updated_at ON public.crown_assignments;
CREATE TRIGGER trg_crown_assignments_updated_at
BEFORE UPDATE ON public.crown_assignments
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_crown_transfer_requests_updated_at ON public.crown_transfer_requests;
CREATE TRIGGER trg_crown_transfer_requests_updated_at
BEFORE UPDATE ON public.crown_transfer_requests
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.crown_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crown_transfer_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crowns_select_authenticated" ON public.crown_assignments;
CREATE POLICY "crowns_select_authenticated"
ON public.crown_assignments
FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "crowns_admin_commander_insert" ON public.crown_assignments;
CREATE POLICY "crowns_admin_commander_insert"
ON public.crown_assignments
FOR INSERT
WITH CHECK (public.has_any_role(ARRAY['commander', 'admin']));

DROP POLICY IF EXISTS "crowns_admin_commander_update" ON public.crown_assignments;
CREATE POLICY "crowns_admin_commander_update"
ON public.crown_assignments
FOR UPDATE
USING (public.has_any_role(ARRAY['commander', 'admin']))
WITH CHECK (public.has_any_role(ARRAY['commander', 'admin']));

DROP POLICY IF EXISTS "crown_requests_select_authenticated" ON public.crown_transfer_requests;
CREATE POLICY "crown_requests_select_authenticated"
ON public.crown_transfer_requests
FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "crown_requests_insert_own" ON public.crown_transfer_requests;
CREATE POLICY "crown_requests_insert_own"
ON public.crown_transfer_requests
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND requested_by = auth.uid()
  AND type = 'transfer'
  AND from_user_id = auth.uid()
);

DROP POLICY IF EXISTS "crown_requests_admin_insert" ON public.crown_transfer_requests;
CREATE POLICY "crown_requests_admin_insert"
ON public.crown_transfer_requests
FOR INSERT
WITH CHECK (public.has_role('admin'));

DROP POLICY IF EXISTS "crown_requests_commander_admin_update" ON public.crown_transfer_requests;
CREATE POLICY "crown_requests_commander_admin_update"
ON public.crown_transfer_requests
FOR UPDATE
USING (public.has_any_role(ARRAY['commander', 'admin']))
WITH CHECK (public.has_any_role(ARRAY['commander', 'admin']));

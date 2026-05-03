-- Kudos records and point-award support.
-- Run after:
--   migrations/create_user_profiles_roles.sql
--   migrations/create_work_system_tables.sql

CREATE TABLE IF NOT EXISTS public.kudos (
  id text PRIMARY KEY,
  giver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cohort_id text NOT NULL DEFAULT 'c2627',
  message text,
  pillar text NOT NULL DEFAULT 'culture'
    CHECK (pillar IN ('missions', 'client', 'recruitment', 'culture')),
  week integer NOT NULL,
  giver_points numeric NOT NULL DEFAULT 0,
  receiver_points numeric NOT NULL DEFAULT 0.25,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (giver_id <> receiver_id)
);

CREATE INDEX IF NOT EXISTS idx_kudos_giver ON public.kudos(giver_id);
CREATE INDEX IF NOT EXISTS idx_kudos_receiver ON public.kudos(receiver_id);
CREATE INDEX IF NOT EXISTS idx_kudos_cohort ON public.kudos(cohort_id);
CREATE INDEX IF NOT EXISTS idx_kudos_week ON public.kudos(week);
CREATE INDEX IF NOT EXISTS idx_kudos_giver_week ON public.kudos(giver_id, cohort_id, week);

ALTER TABLE public.kudos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kudos_select_participants_or_cohort" ON public.kudos;
CREATE POLICY "kudos_select_participants_or_cohort"
ON public.kudos
FOR SELECT
USING (
  public.has_role('admin')
  OR giver_id = auth.uid()
  OR receiver_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.cohort_id = kudos.cohort_id
  )
);

DROP POLICY IF EXISTS "kudos_insert_self" ON public.kudos;
CREATE POLICY "kudos_insert_self"
ON public.kudos
FOR INSERT
WITH CHECK (
  giver_id = auth.uid()
  AND receiver_id <> auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.cohort_id = kudos.cohort_id
  )
);

DROP POLICY IF EXISTS "kudos_admin_all" ON public.kudos;
CREATE POLICY "kudos_admin_all"
ON public.kudos
FOR ALL
USING (public.has_role('admin'))
WITH CHECK (public.has_role('admin'));

-- Manual credits for work completed outside the platform.
-- Run after migrations/create_user_profiles_roles.sql and create_work_system_tables.sql.

CREATE TABLE IF NOT EXISTS public.manual_activity_credits (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cohort_id text NOT NULL DEFAULT 'c2627',
  track_code text,
  activity_type text NOT NULL
    CHECK (activity_type IN ('track_task', 'ritual', 'kudos', 'client', 'recruitment', 'project', 'manual')),
  related_id text,
  related_label text,
  grade text NOT NULL DEFAULT 'approved'
    CHECK (grade IN ('approved', 'excellent', 'good', 'completed', 'needs_note', 'manual_override')),
  points numeric NOT NULL DEFAULT 0,
  pillar text NOT NULL DEFAULT 'missions'
    CHECK (pillar IN ('missions', 'project', 'client', 'recruitment', 'culture', 'ritual', 'rituals', 'badge')),
  evidence_note text NOT NULL,
  proof_url text,
  point_ledger_id text UNIQUE,
  credited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  credited_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_manual_activity_credits_user ON public.manual_activity_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_manual_activity_credits_cohort ON public.manual_activity_credits(cohort_id);
CREATE INDEX IF NOT EXISTS idx_manual_activity_credits_related ON public.manual_activity_credits(activity_type, related_id);
CREATE INDEX IF NOT EXISTS idx_manual_activity_credits_credited_by ON public.manual_activity_credits(credited_by);

CREATE UNIQUE INDEX IF NOT EXISTS idx_manual_activity_credits_no_duplicate
ON public.manual_activity_credits(user_id, cohort_id, activity_type, COALESCE(related_id, ''), lower(left(evidence_note, 120)));

ALTER TABLE public.manual_activity_credits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "manual_credits_select_self_or_staff" ON public.manual_activity_credits;
CREATE POLICY "manual_credits_select_self_or_staff"
ON public.manual_activity_credits
FOR SELECT
USING (
  user_id = auth.uid()
  OR public.has_any_role(ARRAY['lead', 'commander', 'admin'])
  OR EXISTS (
    SELECT 1
    FROM public.crown_assignments ca
    LEFT JOIN public.user_profiles up ON up.id = manual_activity_credits.user_id
    WHERE ca.user_id = auth.uid()
      AND ca.status = 'active'
      AND ca.track_code = manual_activity_credits.track_code
      AND COALESCE(up.track_code, ca.track_code) = ca.track_code
      AND COALESCE(up.cohort_id, ca.cohort_id, manual_activity_credits.cohort_id) = manual_activity_credits.cohort_id
  )
);

DROP POLICY IF EXISTS "manual_credits_staff_insert" ON public.manual_activity_credits;
CREATE POLICY "manual_credits_staff_insert"
ON public.manual_activity_credits
FOR INSERT
WITH CHECK (
  public.has_any_role(ARRAY['lead', 'commander', 'admin'])
  OR EXISTS (
    SELECT 1
    FROM public.crown_assignments ca
    LEFT JOIN public.user_profiles up ON up.id = manual_activity_credits.user_id
    WHERE ca.user_id = auth.uid()
      AND ca.status = 'active'
      AND ca.track_code = manual_activity_credits.track_code
      AND COALESCE(up.track_code, ca.track_code) = ca.track_code
      AND COALESCE(up.cohort_id, ca.cohort_id, manual_activity_credits.cohort_id) = manual_activity_credits.cohort_id
  )
);

DROP POLICY IF EXISTS "manual_credits_staff_update" ON public.manual_activity_credits;
CREATE POLICY "manual_credits_staff_update"
ON public.manual_activity_credits
FOR UPDATE
USING (public.has_any_role(ARRAY['lead', 'commander', 'admin']))
WITH CHECK (public.has_any_role(ARRAY['lead', 'commander', 'admin']));

DROP POLICY IF EXISTS "manual_credits_admin_delete" ON public.manual_activity_credits;
CREATE POLICY "manual_credits_admin_delete"
ON public.manual_activity_credits
FOR DELETE
USING (public.has_role('admin'));

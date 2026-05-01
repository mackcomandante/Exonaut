-- Program operations tables for live Supabase-backed missions, submissions,
-- grades, directives, PDF uploads, and commander escalations.
--
-- Run after migrations/create_user_profiles_roles.sql.

CREATE TABLE IF NOT EXISTS public.missions (
  id text PRIMARY KEY,
  title text NOT NULL,
  track_code text,
  cohort_id text NOT NULL DEFAULT 'c2627',
  pillar text NOT NULL DEFAULT 'project'
    CHECK (pillar IN ('project', 'client', 'recruitment')),
  points integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'not-started'
    CHECK (status IN ('not-started', 'in-progress', 'submitted', 'approved', 'archived')),
  due_date text,
  due_time text DEFAULT '23:59 SGT',
  due_in integer DEFAULT 0,
  deliverable text DEFAULT 'document',
  week integer,
  description text,
  criteria jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_missions_cohort ON public.missions(cohort_id);
CREATE INDEX IF NOT EXISTS idx_missions_track ON public.missions(track_code);

CREATE TABLE IF NOT EXISTS public.mission_submissions (
  id text PRIMARY KEY,
  mission_id text NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  exonaut_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mission_title text NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  deliverable text DEFAULT 'document',
  word_count integer DEFAULT 0,
  is_late boolean NOT NULL DEFAULT false,
  file_name text,
  file_size text,
  file_type text,
  file_path text,
  note text,
  state text NOT NULL DEFAULT 'pending'
    CHECK (state IN ('pending', 'needs-revision', 'approved')),
  grade text CHECK (grade IS NULL OR grade IN ('needs-revision', 'good', 'excellent')),
  feedback text,
  points_awarded integer,
  graded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  graded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mission_submissions_exonaut ON public.mission_submissions(exonaut_id);
CREATE INDEX IF NOT EXISTS idx_mission_submissions_mission ON public.mission_submissions(mission_id);
CREATE INDEX IF NOT EXISTS idx_mission_submissions_state ON public.mission_submissions(state);

CREATE TABLE IF NOT EXISTS public.directives (
  id text PRIMARY KEY,
  from_lead_id text NOT NULL,
  from_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  to_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  brief text NOT NULL,
  pillar text NOT NULL DEFAULT 'project'
    CHECK (pillar IN ('project', 'client', 'recruitment')),
  points integer NOT NULL DEFAULT 0,
  due_date text,
  due_time text DEFAULT '23:59 SGT',
  deliverable text DEFAULT 'document',
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'clarification')),
  clarification_note text,
  issued_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_directives_to_user ON public.directives(to_user_id);
CREATE INDEX IF NOT EXISTS idx_directives_from_lead ON public.directives(from_lead_id);
CREATE INDEX IF NOT EXISTS idx_directives_status ON public.directives(status);

CREATE TABLE IF NOT EXISTS public.commander_escalations (
  id text PRIMARY KEY,
  lead_id text NOT NULL,
  cohort_id text NOT NULL DEFAULT 'c2627',
  severity text NOT NULL DEFAULT 'med'
    CHECK (severity IN ('low', 'med', 'high')),
  type text NOT NULL DEFAULT 'ops',
  body text NOT NULL,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'dismissed', 'resolved')),
  flagged_at timestamptz NOT NULL DEFAULT now(),
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_commander_escalations_status ON public.commander_escalations(status);
CREATE INDEX IF NOT EXISTS idx_commander_escalations_cohort ON public.commander_escalations(cohort_id);

DROP TRIGGER IF EXISTS trg_missions_updated_at ON public.missions;
CREATE TRIGGER trg_missions_updated_at
BEFORE UPDATE ON public.missions
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_mission_submissions_updated_at ON public.mission_submissions;
CREATE TRIGGER trg_mission_submissions_updated_at
BEFORE UPDATE ON public.mission_submissions
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_directives_updated_at ON public.directives;
CREATE TRIGGER trg_directives_updated_at
BEFORE UPDATE ON public.directives
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_commander_escalations_updated_at ON public.commander_escalations;
CREATE TRIGGER trg_commander_escalations_updated_at
BEFORE UPDATE ON public.commander_escalations
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.directives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commander_escalations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "missions_select_authenticated" ON public.missions;
CREATE POLICY "missions_select_authenticated"
ON public.missions
FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "missions_admin_all" ON public.missions;
CREATE POLICY "missions_admin_all"
ON public.missions
FOR ALL
USING (public.has_role('admin'))
WITH CHECK (public.has_role('admin'));

DROP POLICY IF EXISTS "submissions_select_participants" ON public.mission_submissions;
CREATE POLICY "submissions_select_participants"
ON public.mission_submissions
FOR SELECT
USING (
  exonaut_id = auth.uid()
  OR public.has_any_role(ARRAY['lead', 'commander', 'admin'])
);

DROP POLICY IF EXISTS "submissions_insert_own" ON public.mission_submissions;
CREATE POLICY "submissions_insert_own"
ON public.mission_submissions
FOR INSERT
WITH CHECK (exonaut_id = auth.uid());

DROP POLICY IF EXISTS "submissions_update_own_or_staff" ON public.mission_submissions;
CREATE POLICY "submissions_update_own_or_staff"
ON public.mission_submissions
FOR UPDATE
USING (
  exonaut_id = auth.uid()
  OR public.has_any_role(ARRAY['lead', 'commander', 'admin'])
)
WITH CHECK (
  exonaut_id = auth.uid()
  OR public.has_any_role(ARRAY['lead', 'commander', 'admin'])
);

DROP POLICY IF EXISTS "directives_select_participants" ON public.directives;
CREATE POLICY "directives_select_participants"
ON public.directives
FOR SELECT
USING (
  to_user_id = auth.uid()
  OR public.has_any_role(ARRAY['lead', 'commander', 'admin'])
);

DROP POLICY IF EXISTS "directives_insert_staff" ON public.directives;
CREATE POLICY "directives_insert_staff"
ON public.directives
FOR INSERT
WITH CHECK (public.has_any_role(ARRAY['lead', 'commander', 'admin']));

DROP POLICY IF EXISTS "directives_update_participants" ON public.directives;
CREATE POLICY "directives_update_participants"
ON public.directives
FOR UPDATE
USING (
  to_user_id = auth.uid()
  OR public.has_any_role(ARRAY['lead', 'commander', 'admin'])
)
WITH CHECK (
  to_user_id = auth.uid()
  OR public.has_any_role(ARRAY['lead', 'commander', 'admin'])
);

DROP POLICY IF EXISTS "escalations_select_staff" ON public.commander_escalations;
CREATE POLICY "escalations_select_staff"
ON public.commander_escalations
FOR SELECT
USING (public.has_any_role(ARRAY['commander', 'admin']));

DROP POLICY IF EXISTS "escalations_admin_insert" ON public.commander_escalations;
CREATE POLICY "escalations_admin_insert"
ON public.commander_escalations
FOR INSERT
WITH CHECK (public.has_role('admin'));

DROP POLICY IF EXISTS "escalations_staff_update" ON public.commander_escalations;
CREATE POLICY "escalations_staff_update"
ON public.commander_escalations
FOR UPDATE
USING (public.has_any_role(ARRAY['commander', 'admin']))
WITH CHECK (public.has_any_role(ARRAY['commander', 'admin']));

INSERT INTO storage.buckets (id, name, public)
VALUES ('mission-submissions', 'mission-submissions', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "submission_files_read_participants" ON storage.objects;
CREATE POLICY "submission_files_read_participants"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'mission-submissions'
  AND auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "submission_files_upload_own" ON storage.objects;
CREATE POLICY "submission_files_upload_own"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'mission-submissions'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "submission_files_update_own" ON storage.objects;
CREATE POLICY "submission_files_update_own"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'mission-submissions'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'mission-submissions'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Optional starter commander escalation rows for testing the Commander flow.
INSERT INTO public.commander_escalations (id, lead_id, cohort_id, severity, type, body)
VALUES
  ('ESC-001', 'lead-ais', 'c2627', 'high', 'sla', 'AI Strategy has a grading SLA risk if new submissions are not cleared today.'),
  ('ESC-002', 'lead-vb', 'c2627', 'med', 'client', 'Venture track has two client discovery calls awaiting commander context before follow-up.'),
  ('ESC-003', 'lead-ld', 'c2627', 'med', 'engagement', 'L&D midpoint pulse shows low ritual completion across three Exonauts.'),
  ('ESC-004', 'lead-cc', 'c2627', 'low', 'ops', 'Social track requested approval for a revised demo-day scoring rubric.')
ON CONFLICT (id) DO NOTHING;

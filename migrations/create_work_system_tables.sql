-- Exonaut work system: reset progress, predefined missions, shared point ledger,
-- badges/certificates support, and projects.
-- Run after:
--   migrations/create_user_profiles_roles.sql
--   migrations/create_program_ops_tables.sql
--   migrations/create_crown_rotation_tables.sql

-- Reset only progress/points-derived state. This preserves auth users,
-- user_profiles, cohorts, tracks, and crown assignments.
DELETE FROM public.mission_submissions;
DELETE FROM public.missions;

ALTER TABLE public.mission_submissions DROP CONSTRAINT IF EXISTS mission_submissions_state_check;
ALTER TABLE public.mission_submissions
  ADD CONSTRAINT mission_submissions_state_check
  CHECK (state IN ('pending', 'needs-revision', 'approved', 'rejected'));

ALTER TABLE public.mission_submissions DROP CONSTRAINT IF EXISTS mission_submissions_grade_check;
ALTER TABLE public.mission_submissions
  ADD CONSTRAINT mission_submissions_grade_check
  CHECK (grade IS NULL OR grade IN ('rejected', 'needs-revision', 'good', 'excellent'));

DROP POLICY IF EXISTS "submissions_select_participants" ON public.mission_submissions;
CREATE POLICY "submissions_select_participants"
ON public.mission_submissions
FOR SELECT
USING (
  exonaut_id = auth.uid()
  OR public.has_any_role(ARRAY['commander', 'admin'])
  OR EXISTS (
    SELECT 1
    FROM public.crown_assignments ca
    JOIN public.user_profiles up ON up.id = mission_submissions.exonaut_id
    WHERE ca.user_id = auth.uid()
      AND ca.status = 'active'
      AND ca.track_code = up.track_code
  )
);

DROP POLICY IF EXISTS "submissions_update_own_or_staff" ON public.mission_submissions;
CREATE POLICY "submissions_update_own_or_staff"
ON public.mission_submissions
FOR UPDATE
USING (
  exonaut_id = auth.uid()
  OR public.has_any_role(ARRAY['commander', 'admin'])
  OR EXISTS (
    SELECT 1
    FROM public.crown_assignments ca
    JOIN public.user_profiles up ON up.id = mission_submissions.exonaut_id
    WHERE ca.user_id = auth.uid()
      AND ca.status = 'active'
      AND ca.track_code = up.track_code
  )
)
WITH CHECK (
  exonaut_id = auth.uid()
  OR public.has_any_role(ARRAY['commander', 'admin'])
  OR EXISTS (
    SELECT 1
    FROM public.crown_assignments ca
    JOIN public.user_profiles up ON up.id = mission_submissions.exonaut_id
    WHERE ca.user_id = auth.uid()
      AND ca.status = 'active'
      AND ca.track_code = up.track_code
  )
);

CREATE TABLE IF NOT EXISTS public.point_ledger (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_type text NOT NULL
    CHECK (source_type IN ('mission', 'project', 'kudos', 'ritual', 'manual', 'badge')),
  source_id text NOT NULL,
  cohort_id text NOT NULL DEFAULT 'c2627',
  track_code text,
  pillar text NOT NULL DEFAULT 'project'
    CHECK (pillar IN ('project', 'client', 'recruitment', 'culture', 'ritual', 'badge')),
  points numeric NOT NULL DEFAULT 0,
  note text,
  awarded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  awarded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_point_ledger_user ON public.point_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_point_ledger_source ON public.point_ledger(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_point_ledger_cohort ON public.point_ledger(cohort_id);

DELETE FROM public.point_ledger;

CREATE UNIQUE INDEX IF NOT EXISTS idx_point_ledger_once_per_project_task_user
ON public.point_ledger(source_type, source_id, user_id)
WHERE source_type = 'project';

CREATE TABLE IF NOT EXISTS public.projects (
  id text PRIMARY KEY,
  title text NOT NULL,
  description text,
  cohort_id text NOT NULL DEFAULT 'c2627',
  track_codes text[] NOT NULL DEFAULT ARRAY[]::text[],
  first_officer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  start_date date,
  due_date date,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_first_officer ON public.projects(first_officer_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);

CREATE TABLE IF NOT EXISTS public.project_tasks (
  id text PRIMARY KEY,
  project_id text NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  brief text,
  track_code text NOT NULL,
  second_officer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'assigned'
    CHECK (status IN ('assigned', 'in_progress', 'submitted', 'approved', 'rejected')),
  points numeric NOT NULL DEFAULT 2,
  due_date date,
  submitted_note text,
  review_note text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.project_tasks
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS deliverable_type text NOT NULL DEFAULT 'file',
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

UPDATE public.project_tasks SET status = 'assigned' WHERE status = 'delegated';

ALTER TABLE public.project_tasks DROP CONSTRAINT IF EXISTS project_tasks_status_check;
ALTER TABLE public.project_tasks
  ADD CONSTRAINT project_tasks_status_check
  CHECK (status IN ('assigned', 'in_progress', 'submitted', 'approved', 'rejected'));

ALTER TABLE public.project_tasks DROP CONSTRAINT IF EXISTS project_tasks_priority_check;
ALTER TABLE public.project_tasks
  ADD CONSTRAINT project_tasks_priority_check
  CHECK (priority IN ('low', 'medium', 'high', 'urgent'));

ALTER TABLE public.project_tasks DROP CONSTRAINT IF EXISTS project_tasks_deliverable_type_check;
ALTER TABLE public.project_tasks
  ADD CONSTRAINT project_tasks_deliverable_type_check
  CHECK (deliverable_type IN ('note', 'link', 'file'));

CREATE INDEX IF NOT EXISTS idx_project_tasks_project ON public.project_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_second_officer ON public.project_tasks(second_officer_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_track ON public.project_tasks(track_code);
CREATE INDEX IF NOT EXISTS idx_project_tasks_status ON public.project_tasks(status);

CREATE TABLE IF NOT EXISTS public.project_task_assignees (
  id text PRIMARY KEY,
  task_id text NOT NULL REFERENCES public.project_tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'assigned'
    CHECK (status IN ('assigned', 'submitted', 'approved')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (task_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.project_task_submissions (
  id text PRIMARY KEY,
  task_id text NOT NULL REFERENCES public.project_tasks(id) ON DELETE CASCADE,
  submitted_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note text,
  link_url text,
  file_url text,
  status text NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'superseded', 'approved', 'needs-revision')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_task_submissions_task ON public.project_task_submissions(task_id);
CREATE INDEX IF NOT EXISTS idx_project_task_submissions_submitter ON public.project_task_submissions(submitted_by);

CREATE TABLE IF NOT EXISTS public.project_task_comments (
  id text PRIMARY KEY,
  task_id text NOT NULL REFERENCES public.project_tasks(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment text NOT NULL,
  kind text NOT NULL DEFAULT 'comment'
    CHECK (kind IN ('comment', 'revision', 'approval')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_task_comments_task ON public.project_task_comments(task_id);

CREATE TABLE IF NOT EXISTS public.project_task_activity (
  id text PRIMARY KEY,
  task_id text NOT NULL REFERENCES public.project_tasks(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_task_activity_task ON public.project_task_activity(task_id);

CREATE TABLE IF NOT EXISTS public.project_delegations (
  id text PRIMARY KEY,
  project_id text NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  track_code text NOT NULL,
  first_officer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  second_officer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title text NOT NULL,
  instructions text,
  expected_output text,
  priority text NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status text NOT NULL DEFAULT 'delegated'
    CHECK (status IN ('draft', 'delegated', 'acknowledged', 'in_progress', 'completed')),
  due_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_delegations_project ON public.project_delegations(project_id);
CREATE INDEX IF NOT EXISTS idx_project_delegations_track ON public.project_delegations(track_code);
CREATE INDEX IF NOT EXISTS idx_project_delegations_first_officer ON public.project_delegations(first_officer_id);
CREATE INDEX IF NOT EXISTS idx_project_delegations_second_officer ON public.project_delegations(second_officer_id);

DROP TRIGGER IF EXISTS trg_projects_updated_at ON public.projects;
CREATE TRIGGER trg_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_project_tasks_updated_at ON public.project_tasks;
CREATE TRIGGER trg_project_tasks_updated_at
BEFORE UPDATE ON public.project_tasks
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_project_task_submissions_updated_at ON public.project_task_submissions;
CREATE TRIGGER trg_project_task_submissions_updated_at
BEFORE UPDATE ON public.project_task_submissions
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_project_delegations_updated_at ON public.project_delegations;
CREATE TRIGGER trg_project_delegations_updated_at
BEFORE UPDATE ON public.project_delegations
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.point_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_task_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_task_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_delegations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "point_ledger_select_authenticated" ON public.point_ledger;
CREATE POLICY "point_ledger_select_authenticated"
ON public.point_ledger
FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "point_ledger_staff_insert" ON public.point_ledger;
CREATE POLICY "point_ledger_staff_insert"
ON public.point_ledger
FOR INSERT
WITH CHECK (public.has_any_role(ARRAY['commander', 'admin']) OR auth.uid() = awarded_by);

DROP POLICY IF EXISTS "projects_select_authenticated" ON public.projects;
CREATE POLICY "projects_select_authenticated"
ON public.projects
FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "projects_admin_all" ON public.projects;
CREATE POLICY "projects_admin_all"
ON public.projects
FOR ALL
USING (public.has_role('admin'))
WITH CHECK (public.has_role('admin'));

DROP POLICY IF EXISTS "project_tasks_select_authenticated" ON public.project_tasks;
CREATE POLICY "project_tasks_select_authenticated"
ON public.project_tasks
FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "project_tasks_officers_insert" ON public.project_tasks;
CREATE POLICY "project_tasks_officers_insert"
ON public.project_tasks
FOR INSERT
WITH CHECK (
  public.has_role('admin')
  OR second_officer_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.crown_assignments ca
    WHERE ca.user_id = auth.uid()
      AND ca.status = 'active'
      AND ca.track_code = project_tasks.track_code
  )
  OR EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_id
      AND p.first_officer_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "project_tasks_officers_update" ON public.project_tasks;
CREATE POLICY "project_tasks_officers_update"
ON public.project_tasks
FOR UPDATE
USING (
  public.has_role('admin')
  OR second_officer_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.project_task_assignees pta
    WHERE pta.task_id = project_tasks.id
      AND pta.user_id = auth.uid()
      AND project_tasks.status IN ('assigned', 'in_progress')
  )
  OR EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_tasks.project_id
      AND p.first_officer_id = auth.uid()
  )
)
WITH CHECK (
  public.has_role('admin')
  OR second_officer_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.project_task_assignees pta
    WHERE pta.task_id = project_tasks.id
      AND pta.user_id = auth.uid()
      AND project_tasks.status IN ('in_progress', 'submitted')
  )
  OR EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_tasks.project_id
      AND p.first_officer_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "project_tasks_officers_delete" ON public.project_tasks;
CREATE POLICY "project_tasks_officers_delete"
ON public.project_tasks
FOR DELETE
USING (
  public.has_role('admin')
  OR second_officer_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_tasks.project_id
      AND p.first_officer_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "project_task_assignees_select_authenticated" ON public.project_task_assignees;
CREATE POLICY "project_task_assignees_select_authenticated"
ON public.project_task_assignees
FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "project_task_assignees_officers_insert" ON public.project_task_assignees;
CREATE POLICY "project_task_assignees_officers_insert"
ON public.project_task_assignees
FOR INSERT
WITH CHECK (
  public.has_role('admin')
  OR assigned_by = auth.uid()
);

DROP POLICY IF EXISTS "project_task_assignees_officers_update" ON public.project_task_assignees;
CREATE POLICY "project_task_assignees_officers_update"
ON public.project_task_assignees
FOR UPDATE
USING (
  public.has_role('admin')
  OR assigned_by = auth.uid()
  OR user_id = auth.uid()
)
WITH CHECK (
  public.has_role('admin')
  OR assigned_by = auth.uid()
  OR user_id = auth.uid()
);

DROP POLICY IF EXISTS "project_task_assignees_officers_delete" ON public.project_task_assignees;
CREATE POLICY "project_task_assignees_officers_delete"
ON public.project_task_assignees
FOR DELETE
USING (
  public.has_role('admin')
  OR assigned_by = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.project_tasks pt
    JOIN public.projects p ON p.id = pt.project_id
    WHERE pt.id = project_task_assignees.task_id
      AND (pt.second_officer_id = auth.uid() OR p.first_officer_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "project_task_submissions_select_authenticated" ON public.project_task_submissions;
CREATE POLICY "project_task_submissions_select_authenticated"
ON public.project_task_submissions
FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "project_task_submissions_insert_assignee" ON public.project_task_submissions;
CREATE POLICY "project_task_submissions_insert_assignee"
ON public.project_task_submissions
FOR INSERT
WITH CHECK (
  submitted_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.project_task_assignees pta
    WHERE pta.task_id = project_task_submissions.task_id
      AND pta.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "project_task_submissions_update_own_or_officer" ON public.project_task_submissions;
CREATE POLICY "project_task_submissions_update_own_or_officer"
ON public.project_task_submissions
FOR UPDATE
USING (
  submitted_by = auth.uid()
  OR public.has_role('admin')
  OR EXISTS (
    SELECT 1
    FROM public.project_tasks pt
    JOIN public.projects p ON p.id = pt.project_id
    WHERE pt.id = project_task_submissions.task_id
      AND (pt.second_officer_id = auth.uid() OR p.first_officer_id = auth.uid())
  )
)
WITH CHECK (
  submitted_by = auth.uid()
  OR public.has_role('admin')
  OR EXISTS (
    SELECT 1
    FROM public.project_tasks pt
    JOIN public.projects p ON p.id = pt.project_id
    WHERE pt.id = project_task_submissions.task_id
      AND (pt.second_officer_id = auth.uid() OR p.first_officer_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "project_task_comments_select_authenticated" ON public.project_task_comments;
CREATE POLICY "project_task_comments_select_authenticated"
ON public.project_task_comments
FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "project_task_comments_insert_participants" ON public.project_task_comments;
CREATE POLICY "project_task_comments_insert_participants"
ON public.project_task_comments
FOR INSERT
WITH CHECK (
  author_id = auth.uid()
  AND (
    public.has_role('admin')
    OR EXISTS (
      SELECT 1
      FROM public.project_tasks pt
      JOIN public.projects p ON p.id = pt.project_id
      WHERE pt.id = project_task_comments.task_id
        AND (pt.second_officer_id = auth.uid() OR p.first_officer_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.project_task_assignees pta
      WHERE pta.task_id = project_task_comments.task_id
        AND pta.user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "project_task_activity_select_authenticated" ON public.project_task_activity;
CREATE POLICY "project_task_activity_select_authenticated"
ON public.project_task_activity
FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "project_task_activity_insert_authenticated" ON public.project_task_activity;
CREATE POLICY "project_task_activity_insert_authenticated"
ON public.project_task_activity
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "project_delegations_select_participants" ON public.project_delegations;
CREATE POLICY "project_delegations_select_participants"
ON public.project_delegations
FOR SELECT
USING (
  public.has_any_role(ARRAY['commander', 'admin'])
  OR first_officer_id = auth.uid()
  OR second_officer_id = auth.uid()
);

DROP POLICY IF EXISTS "project_delegations_first_officer_insert" ON public.project_delegations;
CREATE POLICY "project_delegations_first_officer_insert"
ON public.project_delegations
FOR INSERT
WITH CHECK (
  public.has_role('admin')
  OR EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_id
      AND p.first_officer_id = auth.uid()
      AND first_officer_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "project_delegations_first_or_second_update" ON public.project_delegations;
CREATE POLICY "project_delegations_first_or_second_update"
ON public.project_delegations
FOR UPDATE
USING (
  public.has_role('admin')
  OR first_officer_id = auth.uid()
  OR second_officer_id = auth.uid()
)
WITH CHECK (
  public.has_role('admin')
  OR first_officer_id = auth.uid()
  OR second_officer_id = auth.uid()
);

DROP POLICY IF EXISTS "project_delegations_first_delete" ON public.project_delegations;
CREATE POLICY "project_delegations_first_delete"
ON public.project_delegations
FOR DELETE
USING (
  public.has_role('admin')
  OR first_officer_id = auth.uid()
);

-- Predefined weekly missions from the mission brief. Track-specific missions
-- are expanded per track so each roster can submit and be graded by its crown holder.
INSERT INTO public.missions
  (id, title, track_code, cohort_id, pillar, points, status, due_date, due_time, due_in, deliverable, week, description, criteria)
VALUES
  ('EXO-W01-ONBOARD', 'Week 1 Onboarding & Pledge', NULL, 'c2627', 'project', 50, 'not-started', 'Week 1 Friday', '23:59 SGT', 7, 'document', 1,
   'Complete platform onboarding, sign the Exonaut pledge, and submit your Day 1 proof.',
   '["Profile complete","Pledge proof attached","Submitted within Week 1"]'::jsonb),
  ('EXO-W01-LINKEDIN', 'LinkedIn Announcement', NULL, 'c2627', 'client', 20, 'not-started', 'Week 1 Friday', '23:59 SGT', 7, 'link', 1,
   'Publish the approved Exonaut announcement and submit the public link.',
   '["Uses approved positioning","Public post link works","Posted within 48 hours"]'::jsonb),
  ('EXO-W01-PROSPECTS', '10 Qualified Prospects', NULL, 'c2627', 'client', 40, 'not-started', 'Week 1 Friday', '23:59 SGT', 7, 'spreadsheet', 1,
   'Identify and qualify 10 prospects relevant to your track. Include company, industry, key contact, pain point, and proposed service hook.',
   '["10 complete prospect rows","Track-relevant pain points","Clear service hooks"]'::jsonb),
  ('EXO-W02-CONCEPTS', '10 Concept Papers', NULL, 'c2627', 'client', 300, 'not-started', 'Week 2 Friday', '23:59 SGT', 14, 'document', 2,
   'Write one 1-2 page concept paper for each of your 10 prospects.',
   '["10 papers submitted","Each paper has the required 7 sections","Client-specific problem and solution"]'::jsonb),
  ('EXO-W02-DISCOVERY', 'Discovery Meetings', NULL, 'c2627', 'client', 75, 'not-started', 'Week 2 Friday', '23:59 SGT', 14, 'document', 2,
   'Submit verified discovery meeting notes and outcomes.',
   '["Meeting proof attached","Client pain captured","Next step documented"]'::jsonb)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.missions
  (id, title, track_code, cohort_id, pillar, points, status, due_date, due_time, due_in, deliverable, week, description, criteria)
SELECT
  'EXO-W' || lpad(w.week::text, 2, '0') || '-' || t.code,
  'Week ' || w.week || ' Track Mission - ' || t.short,
  t.code,
  'c2627',
  'project',
  w.points,
  'not-started',
  'Week ' || w.week || ' Friday',
  '23:59 SGT',
  w.week * 7,
  'document',
  w.week,
  w.description || ' This is the predefined track mission for ' || t.name || '.',
  '["Matches the track brief","Uses client-ready structure","Shows clear evidence of work","Ready for lead review"]'::jsonb
FROM (VALUES
  (3, 35, 'Client sign-off and first diagnostic / assessment deliverable.'),
  (4, 35, 'Landscape, architecture, curriculum, event, research, or brand analysis deliverable.'),
  (5, 35, 'Prioritization, build, module, production, prototype, or strategy deliverable.'),
  (6, 40, 'Midpoint fire check and draft roadmap / model / pilot / user test deliverable.'),
  (7, 40, 'Client-ready presentation, release, dry run, campaign, or recruit-linked deliverable.'),
  (8, 40, 'Client delivery, onboarding, iteration, analytics, or feedback integration deliverable.'),
  (9, 50, 'Capstone dossier, business case, curriculum package, impact report, or playbook.'),
  (10, 40, 'Capstone build and refinement sprint.'),
  (11, 30, 'Finalization and peer vote preparation.'),
  (12, 50, 'Demo Day presentation and Corps induction deliverable.')
) AS w(week, points, description)
CROSS JOIN (VALUES
  ('AIS', 'AI-STRAT', 'AI Strategy & Advisory'),
  ('VB', 'VENTURE', 'EBELI Venture Building'),
  ('LD', 'L&D', 'Learning & Development'),
  ('XM', 'EVENTS', 'Events & Experiences'),
  ('AID', 'AI-DEV', 'AI-Native Software'),
  ('POL', 'POLICY', 'Research, Policy & Insight'),
  ('CC', 'SOCIAL', 'Social Media Marketing')
) AS t(code, short, name)
ON CONFLICT (id) DO NOTHING;

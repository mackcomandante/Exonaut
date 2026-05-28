-- Project Action Register redesign.
-- Run after migrations/create_work_system_tables.sql.

ALTER TABLE public.project_tasks
  ADD COLUMN IF NOT EXISTS topic text,
  ADD COLUMN IF NOT EXISTS next_step text,
  ADD COLUMN IF NOT EXISTS blockers text,
  ADD COLUMN IF NOT EXISTS reference_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS progress_note text,
  ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;

ALTER TABLE public.project_tasks DROP CONSTRAINT IF EXISTS project_tasks_status_check;

UPDATE public.project_tasks
SET status = CASE status
  WHEN 'backlog' THEN 'not_started'
  WHEN 'assigned' THEN 'not_started'
  WHEN 'submitted' THEN 'for_review'
  WHEN 'approved' THEN 'done'
  WHEN 'rejected' THEN 'in_progress'
  ELSE status
END;

ALTER TABLE public.project_tasks
  ALTER COLUMN status SET DEFAULT 'not_started',
  ADD CONSTRAINT project_tasks_status_check
    CHECK (status IN ('not_started', 'in_progress', 'for_review', 'done', 'blocked', 'cancelled'));

UPDATE public.project_tasks
SET display_order = sort_order
WHERE display_order = 0;

CREATE INDEX IF NOT EXISTS idx_project_tasks_display_order
ON public.project_tasks(project_id, display_order);

CREATE TABLE IF NOT EXISTS public.project_members (
  project_id text NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_role text NOT NULL DEFAULT 'member'
    CHECK (member_role IN ('lead', 'member', 'reviewer')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  added_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  PRIMARY KEY (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_members_user ON public.project_members(user_id);

INSERT INTO public.project_members (project_id, user_id, member_role, added_by)
SELECT id, first_officer_id, 'lead', created_by
FROM public.projects
ON CONFLICT (project_id, user_id) DO UPDATE SET member_role = 'lead';

INSERT INTO public.project_members (project_id, user_id, member_role, added_by)
SELECT DISTINCT pt.project_id, pta.user_id, 'member', pta.assigned_by
FROM public.project_task_assignees pta
JOIN public.project_tasks pt ON pt.id = pta.task_id
ON CONFLICT (project_id, user_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.project_resources (
  id text PRIMARY KEY,
  project_id text NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  resource_type text NOT NULL DEFAULT 'link'
    CHECK (resource_type IN ('link', 'file', 'brief', 'deliverable')),
  url text NOT NULL,
  added_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_resources_project ON public.project_resources(project_id);

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_resources ENABLE ROW LEVEL SECURITY;

-- Security-definer helpers prevent policy recursion while all project-child
-- policies apply the same project membership rule.
CREATE OR REPLACE FUNCTION public.can_access_project(target_project_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_any_role(ARRAY['admin', 'commander'])
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = target_project_id AND p.first_officer_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = target_project_id AND pm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.project_tasks pt
      JOIN public.project_task_assignees pta ON pta.task_id = pt.id
      WHERE pt.project_id = target_project_id AND pta.user_id = auth.uid()
    )
$$;

CREATE OR REPLACE FUNCTION public.can_manage_project(target_project_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role('admin')
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = target_project_id AND p.first_officer_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = target_project_id
        AND pm.user_id = auth.uid()
        AND pm.member_role = 'lead'
    )
$$;

CREATE OR REPLACE FUNCTION public.can_edit_project_actions(target_project_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.can_manage_project(target_project_id)
    OR EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = target_project_id AND pm.user_id = auth.uid()
    )
$$;

CREATE OR REPLACE FUNCTION public.can_access_project_task(target_task_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_tasks pt
    WHERE pt.id = target_task_id AND public.can_access_project(pt.project_id)
  )
$$;

CREATE OR REPLACE FUNCTION public.can_manage_project_task(target_task_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_tasks pt
    WHERE pt.id = target_task_id AND public.can_manage_project(pt.project_id)
  )
$$;

CREATE OR REPLACE FUNCTION public.can_edit_project_task(target_task_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_tasks pt
    WHERE pt.id = target_task_id AND public.can_edit_project_actions(pt.project_id)
  )
$$;

CREATE OR REPLACE FUNCTION public.is_project_task_assignee(target_task_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_task_assignees pta
    WHERE pta.task_id = target_task_id AND pta.user_id = auth.uid()
  )
$$;

DROP POLICY IF EXISTS "projects_select_authenticated" ON public.projects;
DROP POLICY IF EXISTS "projects_select_participants" ON public.projects;
CREATE POLICY "projects_select_participants"
ON public.projects FOR SELECT
USING (public.can_access_project(id));

DROP POLICY IF EXISTS "project_tasks_select_authenticated" ON public.project_tasks;
DROP POLICY IF EXISTS "project_tasks_officers_insert" ON public.project_tasks;
DROP POLICY IF EXISTS "project_tasks_officers_update" ON public.project_tasks;
DROP POLICY IF EXISTS "project_tasks_officers_delete" ON public.project_tasks;
DROP POLICY IF EXISTS "project_tasks_select_participants" ON public.project_tasks;
DROP POLICY IF EXISTS "project_tasks_insert_managers" ON public.project_tasks;
DROP POLICY IF EXISTS "project_tasks_update_participants" ON public.project_tasks;
DROP POLICY IF EXISTS "project_tasks_delete_managers" ON public.project_tasks;
DROP POLICY IF EXISTS "project_tasks_insert_members" ON public.project_tasks;
DROP POLICY IF EXISTS "project_tasks_delete_members" ON public.project_tasks;
CREATE POLICY "project_tasks_select_participants"
ON public.project_tasks FOR SELECT
USING (public.can_access_project(project_id));
CREATE POLICY "project_tasks_insert_members"
ON public.project_tasks FOR INSERT
WITH CHECK (
  public.can_edit_project_actions(project_id)
  AND (
    public.can_manage_project(project_id)
    OR (status NOT IN ('done', 'cancelled') AND completed_at IS NULL)
  )
);
CREATE POLICY "project_tasks_update_participants"
ON public.project_tasks FOR UPDATE
USING (public.can_edit_project_actions(project_id))
WITH CHECK (
  public.can_edit_project_actions(project_id)
  AND (
    public.can_manage_project(project_id)
    OR (status NOT IN ('done', 'cancelled') AND completed_at IS NULL)
  )
);
CREATE POLICY "project_tasks_delete_members"
ON public.project_tasks FOR DELETE
USING (public.can_edit_project_actions(project_id));

CREATE OR REPLACE FUNCTION public.protect_project_action_management_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.can_manage_project(OLD.project_id) THEN
    RETURN NEW;
  END IF;

  IF NEW.project_id IS DISTINCT FROM OLD.project_id
    OR OLD.status IN ('done', 'cancelled')
    OR NEW.status IN ('done', 'cancelled')
    OR NEW.completed_at IS DISTINCT FROM OLD.completed_at
  THEN
    RAISE EXCEPTION 'Only project leads may move actions between projects or edit completed actions.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_project_action_management_fields ON public.project_tasks;
CREATE TRIGGER trg_protect_project_action_management_fields
BEFORE UPDATE ON public.project_tasks
FOR EACH ROW
EXECUTE FUNCTION public.protect_project_action_management_fields();

DROP POLICY IF EXISTS "project_task_assignees_select_authenticated" ON public.project_task_assignees;
DROP POLICY IF EXISTS "project_task_assignees_officers_insert" ON public.project_task_assignees;
DROP POLICY IF EXISTS "project_task_assignees_officers_update" ON public.project_task_assignees;
DROP POLICY IF EXISTS "project_task_assignees_officers_delete" ON public.project_task_assignees;
DROP POLICY IF EXISTS "project_task_assignees_select_participants" ON public.project_task_assignees;
DROP POLICY IF EXISTS "project_task_assignees_manage_insert" ON public.project_task_assignees;
DROP POLICY IF EXISTS "project_task_assignees_manage_update" ON public.project_task_assignees;
DROP POLICY IF EXISTS "project_task_assignees_manage_delete" ON public.project_task_assignees;
DROP POLICY IF EXISTS "project_task_assignees_members_insert" ON public.project_task_assignees;
DROP POLICY IF EXISTS "project_task_assignees_members_update" ON public.project_task_assignees;
DROP POLICY IF EXISTS "project_task_assignees_members_delete" ON public.project_task_assignees;
CREATE POLICY "project_task_assignees_select_participants"
ON public.project_task_assignees FOR SELECT
USING (public.can_access_project_task(task_id));
CREATE POLICY "project_task_assignees_members_insert"
ON public.project_task_assignees FOR INSERT
WITH CHECK (public.can_edit_project_task(task_id));
CREATE POLICY "project_task_assignees_members_update"
ON public.project_task_assignees FOR UPDATE
USING (public.can_edit_project_task(task_id))
WITH CHECK (public.can_edit_project_task(task_id));
CREATE POLICY "project_task_assignees_members_delete"
ON public.project_task_assignees FOR DELETE
USING (public.can_edit_project_task(task_id));

DROP POLICY IF EXISTS "project_task_submissions_select_authenticated" ON public.project_task_submissions;
DROP POLICY IF EXISTS "project_task_submissions_insert_assignee" ON public.project_task_submissions;
DROP POLICY IF EXISTS "project_task_submissions_update_own_or_officer" ON public.project_task_submissions;
DROP POLICY IF EXISTS "project_task_submissions_select_participants" ON public.project_task_submissions;
DROP POLICY IF EXISTS "project_task_submissions_update_participants" ON public.project_task_submissions;
CREATE POLICY "project_task_submissions_select_participants"
ON public.project_task_submissions FOR SELECT
USING (public.can_access_project_task(task_id));
CREATE POLICY "project_task_submissions_insert_assignee"
ON public.project_task_submissions FOR INSERT
WITH CHECK (submitted_by = auth.uid() AND public.is_project_task_assignee(task_id));
CREATE POLICY "project_task_submissions_update_participants"
ON public.project_task_submissions FOR UPDATE
USING (submitted_by = auth.uid() OR public.can_manage_project_task(task_id))
WITH CHECK (submitted_by = auth.uid() OR public.can_manage_project_task(task_id));

DROP POLICY IF EXISTS "project_task_comments_select_authenticated" ON public.project_task_comments;
DROP POLICY IF EXISTS "project_task_comments_insert_participants" ON public.project_task_comments;
DROP POLICY IF EXISTS "project_task_comments_select_participants" ON public.project_task_comments;
CREATE POLICY "project_task_comments_select_participants"
ON public.project_task_comments FOR SELECT
USING (public.can_access_project_task(task_id));
CREATE POLICY "project_task_comments_insert_participants"
ON public.project_task_comments FOR INSERT
WITH CHECK (author_id = auth.uid() AND public.can_access_project_task(task_id));

DROP POLICY IF EXISTS "project_task_activity_select_authenticated" ON public.project_task_activity;
DROP POLICY IF EXISTS "project_task_activity_insert_authenticated" ON public.project_task_activity;
DROP POLICY IF EXISTS "project_task_activity_select_participants" ON public.project_task_activity;
DROP POLICY IF EXISTS "project_task_activity_insert_participants" ON public.project_task_activity;
CREATE POLICY "project_task_activity_select_participants"
ON public.project_task_activity FOR SELECT
USING (public.can_access_project_task(task_id));
CREATE POLICY "project_task_activity_insert_participants"
ON public.project_task_activity FOR INSERT
WITH CHECK (actor_id = auth.uid() AND public.can_access_project_task(task_id));

DROP POLICY IF EXISTS "project_members_select_participants" ON public.project_members;
DROP POLICY IF EXISTS "project_members_manage_insert" ON public.project_members;
DROP POLICY IF EXISTS "project_members_manage_update" ON public.project_members;
DROP POLICY IF EXISTS "project_members_manage_delete" ON public.project_members;
CREATE POLICY "project_members_select_participants"
ON public.project_members FOR SELECT
USING (public.can_access_project(project_id));
CREATE POLICY "project_members_manage_insert"
ON public.project_members FOR INSERT
WITH CHECK (public.can_manage_project(project_id));
CREATE POLICY "project_members_manage_update"
ON public.project_members FOR UPDATE
USING (public.can_manage_project(project_id))
WITH CHECK (public.can_manage_project(project_id));
CREATE POLICY "project_members_manage_delete"
ON public.project_members FOR DELETE
USING (public.can_manage_project(project_id));

DROP POLICY IF EXISTS "project_resources_select_participants" ON public.project_resources;
DROP POLICY IF EXISTS "project_resources_manage_insert" ON public.project_resources;
DROP POLICY IF EXISTS "project_resources_manage_update" ON public.project_resources;
DROP POLICY IF EXISTS "project_resources_manage_delete" ON public.project_resources;
CREATE POLICY "project_resources_select_participants"
ON public.project_resources FOR SELECT
USING (public.can_access_project(project_id));
CREATE POLICY "project_resources_manage_insert"
ON public.project_resources FOR INSERT
WITH CHECK (public.can_manage_project(project_id));
CREATE POLICY "project_resources_manage_update"
ON public.project_resources FOR UPDATE
USING (public.can_manage_project(project_id))
WITH CHECK (public.can_manage_project(project_id));
CREATE POLICY "project_resources_manage_delete"
ON public.project_resources FOR DELETE
USING (public.can_manage_project(project_id));

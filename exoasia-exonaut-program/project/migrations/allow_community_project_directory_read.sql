-- Allow signed-in users to read project assignment metadata for the Community directory.
-- This does not grant create/update/delete access; management policies remain unchanged.

DROP POLICY IF EXISTS "projects_select_participants" ON public.projects;
DROP POLICY IF EXISTS "projects_select_community_directory" ON public.projects;
CREATE POLICY "projects_select_community_directory"
ON public.projects
FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "project_tasks_select_participants" ON public.project_tasks;
DROP POLICY IF EXISTS "project_tasks_select_community_directory" ON public.project_tasks;
CREATE POLICY "project_tasks_select_community_directory"
ON public.project_tasks
FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "project_members_select_participants" ON public.project_members;
DROP POLICY IF EXISTS "project_members_select_community_directory" ON public.project_members;
CREATE POLICY "project_members_select_community_directory"
ON public.project_members
FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "project_task_assignees_select_participants" ON public.project_task_assignees;
DROP POLICY IF EXISTS "project_task_assignees_select_community_directory" ON public.project_task_assignees;
CREATE POLICY "project_task_assignees_select_community_directory"
ON public.project_task_assignees
FOR SELECT
USING (auth.uid() IS NOT NULL);

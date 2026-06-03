-- Revert the sync_workflow_points_to_point_ledger migration in Supabase.
-- Run this if sync_workflow_points_to_point_ledger.sql was already executed.
--
-- This removes the database-side sync triggers/functions and reverses the
-- project-pillar cleanup. It does not delete ordinary point_ledger rows that
-- may also have been created by the frontend, because those cannot be safely
-- distinguished from legitimate app awards after the fact.

DROP TRIGGER IF EXISTS trg_sync_mission_submission_point_ledger ON public.mission_submissions;
DROP TRIGGER IF EXISTS trg_sync_project_task_point_ledger ON public.project_tasks;
DROP TRIGGER IF EXISTS trg_sync_kudos_point_ledger ON public.kudos;
DROP TRIGGER IF EXISTS trg_sync_ritual_log_point_ledger ON public.ritual_logs;
DROP TRIGGER IF EXISTS trg_sync_manual_credit_point_ledger ON public.manual_activity_credits;
DROP TRIGGER IF EXISTS trg_sync_recruitment_point_ledger ON public.recruitment_referrals;

DROP FUNCTION IF EXISTS public.sync_mission_submission_point_ledger();
DROP FUNCTION IF EXISTS public.sync_project_task_point_ledger();
DROP FUNCTION IF EXISTS public.sync_kudos_point_ledger();
DROP FUNCTION IF EXISTS public.sync_ritual_log_point_ledger();
DROP FUNCTION IF EXISTS public.sync_manual_credit_point_ledger();
DROP FUNCTION IF EXISTS public.sync_recruitment_point_ledger();

DROP INDEX IF EXISTS public.idx_point_ledger_user_source;

-- The sync workflow backfilled action-register/project task rows into
-- point_ledger. Those rows inflate Total Points and the Missions pillar even
-- though project cards should show task counts, not track-task mission points.
DELETE FROM public.point_ledger
WHERE source_type = 'project'
  AND id LIKE 'pts-project-%';

-- Remove only the sync-specific recruitment delta rows created by the sync SQL.
-- Normal frontend recruitment rows use ids like:
--   pts-recruit-{referralId}-{status}
-- and source_id like:
--   {referralId}:{status}
DELETE FROM public.point_ledger
WHERE source_type = 'recruitment'
  AND id LIKE 'pts-recruit-%-sync'
  AND source_id LIKE '%:sync';

-- Keep the recruitment source type allowed. The recruitment feature still needs it.
ALTER TABLE public.point_ledger DROP CONSTRAINT IF EXISTS point_ledger_source_type_check;
ALTER TABLE public.point_ledger
  ADD CONSTRAINT point_ledger_source_type_check
  CHECK (source_type IN ('mission', 'project', 'kudos', 'ritual', 'manual', 'badge', 'recruitment'));

-- Restore the broad pillar constraint used by the app.
ALTER TABLE public.point_ledger DROP CONSTRAINT IF EXISTS point_ledger_pillar_check;
ALTER TABLE public.point_ledger
  ADD CONSTRAINT point_ledger_pillar_check
  CHECK (pillar IN ('missions', 'project', 'client', 'recruitment', 'culture', 'ritual', 'rituals', 'badge'));

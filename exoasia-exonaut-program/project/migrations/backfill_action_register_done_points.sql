-- Backfill 0.25 pts for every project_task that is already 'done'
-- and has at least one assignee, but has no point_ledger entry yet.
--
-- Run AFTER add_pillar_to_project_tasks.sql (so pt.pillar exists).
-- Safe to run multiple times — ON CONFLICT DO NOTHING is idempotent.
--
-- Skips tasks that were already credited via the approveTask flow
-- (those have id pattern 'pts-project-<taskId>-<userId>').

insert into point_ledger (
  id,
  user_id,
  source_type,
  source_id,
  cohort_id,
  track_code,
  pillar,
  points,
  note,
  awarded_by
)
select
  'pts-ar-done-' || pt.id || '-' || pta.user_id,
  pta.user_id,
  'project',
  pt.id,
  'c2627',
  pt.track_code,
  coalesce(pt.pillar, 'missions'),
  0.25,
  pt.title,
  null
from project_tasks pt
join project_task_assignees pta on pta.task_id = pt.id
where pt.status = 'done'
  -- not already backfilled
  and not exists (
    select 1 from point_ledger pl
    where pl.id = 'pts-ar-done-' || pt.id || '-' || pta.user_id
  )
  -- not already credited via the formal approve flow (full points)
  and not exists (
    select 1 from point_ledger pl
    where pl.id = 'pts-project-' || pt.id || '-' || pta.user_id
  )
on conflict (id) do nothing;

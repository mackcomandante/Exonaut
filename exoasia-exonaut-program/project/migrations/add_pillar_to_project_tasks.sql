-- Add pillar column to project_tasks so each action register row
-- can be tagged as 'missions' (build-related) or 'client' (client-facing).
-- Completing a tagged task auto-awards 0.25 pts under the correct pillar.

alter table project_tasks
  add column if not exists pillar text not null default 'missions'
    check (pillar in ('missions', 'client'));

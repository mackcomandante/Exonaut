-- Normalize approved mission submission awards to the mission/task point value.
-- This removes the old Excellent +20 bonus behavior from existing rows.
-- Run after migrations/create_work_system_tables.sql.

UPDATE public.mission_submissions ms
SET points_awarded = m.points
FROM public.missions m
WHERE m.id = ms.mission_id
  AND ms.state = 'approved'
  AND ms.points_awarded IS DISTINCT FROM m.points;

UPDATE public.point_ledger pl
SET
  points = m.points,
  pillar = CASE WHEN m.pillar = 'project' THEN 'missions' ELSE m.pillar END,
  track_code = m.track_code,
  note = COALESCE(NULLIF(pl.note, ''), m.title)
FROM public.mission_submissions ms
JOIN public.missions m ON m.id = ms.mission_id
WHERE pl.source_type = 'mission'
  AND pl.source_id = ms.id
  AND ms.state = 'approved'
  AND pl.points IS DISTINCT FROM m.points;

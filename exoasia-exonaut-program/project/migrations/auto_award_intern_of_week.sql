-- Automatically award Intern of the Week every Saturday at 12:00 AM Manila time.
-- The winner is the active exonaut with the most point_ledger points earned
-- in that cohort week. Exactly one user per cohort/week receives the iotw
-- ritual log and its +25 point ledger entry.

CREATE OR REPLACE FUNCTION public.award_intern_of_week(
  run_at timestamptz DEFAULT now()
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  awards_created integer := 0;
BEGIN
  WITH manila_clock AS (
    SELECT run_at AT TIME ZONE 'Asia/Manila' AS local_now
  ),
  windows AS (
    SELECT
      up.cohort_id,
      COALESCE(
        MIN(c.start_date)::date,
        date_trunc('week', (SELECT local_now FROM manila_clock))::date
      ) AS cohort_start,
      date_trunc('week', (SELECT local_now FROM manila_clock)) AS week_start_local,
      date_trunc('week', (SELECT local_now FROM manila_clock)) + interval '5 days' AS award_cutoff_local
    FROM public.user_profiles up
    LEFT JOIN public.cohorts c ON c.id = up.cohort_id
    WHERE COALESCE(up.role, 'exonaut') = 'exonaut'
      AND COALESCE(up.approval_status, 'active') = 'active'
      AND up.cohort_id IS NOT NULL
    GROUP BY up.cohort_id
  ),
  scored AS (
    SELECT
      up.id AS user_id,
      up.cohort_id,
      GREATEST(
        1,
        CEIL(((w.week_start_local::date - w.cohort_start) + 1)::numeric / 7)
      )::integer AS week,
      COALESCE(SUM(pl.points), 0) AS week_points,
      COALESCE(SUM(pl.points) FILTER (
        WHERE COALESCE(pl.source_type, '') <> 'ritual'
           OR pl.source_id IS DISTINCT FROM (
             'w' || lpad(GREATEST(
               1,
               CEIL(((w.week_start_local::date - w.cohort_start) + 1)::numeric / 7)
             )::integer::text, 2, '0') || ':iotw'
           )
      ), 0) AS eligible_points
    FROM public.user_profiles up
    JOIN windows w ON w.cohort_id = up.cohort_id
    LEFT JOIN public.point_ledger pl
      ON pl.user_id = up.id
     AND (pl.awarded_at AT TIME ZONE 'Asia/Manila') >= w.week_start_local
     AND (pl.awarded_at AT TIME ZONE 'Asia/Manila') < w.award_cutoff_local
    WHERE COALESCE(up.role, 'exonaut') = 'exonaut'
      AND COALESCE(up.approval_status, 'active') = 'active'
    GROUP BY up.id, up.cohort_id, w.cohort_start, w.week_start_local
  ),
  winners AS (
    SELECT DISTINCT ON (cohort_id)
      user_id,
      cohort_id,
      week,
      eligible_points
    FROM scored
    WHERE eligible_points > 0
    ORDER BY cohort_id, eligible_points DESC, week_points DESC, user_id
  ),
  inserted_logs AS (
    INSERT INTO public.ritual_logs (
      id,
      user_id,
      cohort_id,
      ritual_id,
      ritual_name,
      week,
      points,
      state,
      proof,
      logged_at
    )
    SELECT
      'ritual-w' || lpad(w.week::text, 2, '0') || '-iotw-' || w.user_id::text,
      w.user_id,
      w.cohort_id,
      'iotw',
      'Intern of Week',
      w.week,
      25,
      'done',
      jsonb_build_object(
        'source', 'auto-intern-of-week',
        'description', 'Automatically awarded to the weekly points leader.',
        'week_points', w.eligible_points
      ),
      run_at
    FROM winners w
    ON CONFLICT (id) DO NOTHING
    RETURNING id, user_id, cohort_id, week
  ),
  inserted_points AS (
    INSERT INTO public.point_ledger (
      id,
      user_id,
      source_type,
      source_id,
      cohort_id,
      pillar,
      points,
      note,
      awarded_by,
      awarded_at
    )
    SELECT
      'pts-' || il.id,
      il.user_id,
      'ritual',
      'w' || lpad(il.week::text, 2, '0') || ':iotw',
      il.cohort_id,
      'ritual',
      25,
      'Intern of Week',
      NULL,
      run_at
    FROM inserted_logs il
    ON CONFLICT (id) DO NOTHING
    RETURNING id
  )
  SELECT COUNT(*) INTO awards_created FROM inserted_points;

  RETURN awards_created;
END;
$$;

CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.unschedule('auto-award-intern-of-week')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'auto-award-intern-of-week'
);

SELECT cron.schedule(
  'auto-award-intern-of-week',
  '0 16 * * 5',
  $$SELECT public.award_intern_of_week();$$
);

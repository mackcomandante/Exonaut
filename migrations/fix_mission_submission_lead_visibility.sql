-- Fix Track Lead review queue visibility for mission submissions.
-- Run after:
--   migrations/create_program_ops_tables.sql
--   migrations/create_crown_rotation_tables.sql
--   migrations/create_work_system_tables.sql

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
    LEFT JOIN public.user_profiles up ON up.id = mission_submissions.exonaut_id
    LEFT JOIN public.missions m ON m.id = mission_submissions.mission_id
    WHERE ca.user_id = auth.uid()
      AND ca.status = 'active'
      AND (
        ca.track_code = up.track_code
        OR ca.track_code = m.track_code
        OR (
          m.track_code IS NULL
          AND COALESCE(up.cohort_id, 'c2627') = COALESCE(m.cohort_id, 'c2627')
        )
      )
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
    LEFT JOIN public.user_profiles up ON up.id = mission_submissions.exonaut_id
    LEFT JOIN public.missions m ON m.id = mission_submissions.mission_id
    WHERE ca.user_id = auth.uid()
      AND ca.status = 'active'
      AND (
        ca.track_code = up.track_code
        OR ca.track_code = m.track_code
        OR (
          m.track_code IS NULL
          AND COALESCE(up.cohort_id, 'c2627') = COALESCE(m.cohort_id, 'c2627')
        )
      )
  )
)
WITH CHECK (
  exonaut_id = auth.uid()
  OR public.has_any_role(ARRAY['commander', 'admin'])
  OR EXISTS (
    SELECT 1
    FROM public.crown_assignments ca
    LEFT JOIN public.user_profiles up ON up.id = mission_submissions.exonaut_id
    LEFT JOIN public.missions m ON m.id = mission_submissions.mission_id
    WHERE ca.user_id = auth.uid()
      AND ca.status = 'active'
      AND (
        ca.track_code = up.track_code
        OR ca.track_code = m.track_code
        OR (
          m.track_code IS NULL
          AND COALESCE(up.cohort_id, 'c2627') = COALESCE(m.cohort_id, 'c2627')
        )
      )
  )
);

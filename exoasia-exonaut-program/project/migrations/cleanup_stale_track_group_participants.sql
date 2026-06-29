-- Soft-remove deleted or moved exonauts from default track group chats.
-- Staff roles are preserved so admins/commanders/leads can remain manually added.

UPDATE public.message_participants mp
SET removed_at = now()
FROM public.message_threads mt
WHERE mt.id = mp.thread_id
  AND mt.thread_type = 'track_group'
  AND mp.removed_at IS NULL
  AND (
    NOT EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = mp.user_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = mp.user_id
        AND COALESCE(up.role, 'exonaut') = 'exonaut'
        AND (
          COALESCE(up.cohort_id, 'c2627') IS DISTINCT FROM COALESCE(mt.cohort_id, 'c2627')
          OR COALESCE(up.track_code, 'AIS') IS DISTINCT FROM COALESCE(mt.track_code, 'AIS')
        )
      )
    )
  );

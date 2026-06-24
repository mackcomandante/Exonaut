-- Allow active group chat members to add and remove group members.
-- Run after create_messages_tables.sql.

CREATE OR REPLACE FUNCTION public.can_add_message_participant(target_thread_id text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.message_threads mt
    WHERE mt.id = target_thread_id
      AND (
        mt.created_by = auth.uid()
        OR public.is_message_participant(target_thread_id)
        OR (
          mt.thread_type = 'track_group'
          AND EXISTS (
            SELECT 1
            FROM public.user_profiles up
            WHERE up.id = auth.uid()
              AND COALESCE(up.cohort_id, 'c2627') = mt.cohort_id
              AND COALESCE(up.track_code, 'AIS') = mt.track_code
          )
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_message_participants(target_thread_id text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_any_role(ARRAY['admin', 'commander'])
    OR public.is_message_participant(target_thread_id);
$$;

DROP POLICY IF EXISTS "message_participants_insert_thread_creator" ON public.message_participants;
CREATE POLICY "message_participants_insert_thread_creator"
ON public.message_participants
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND public.can_add_message_participant(message_participants.thread_id)
);

DROP POLICY IF EXISTS "message_participants_update_self_or_manager" ON public.message_participants;
CREATE POLICY "message_participants_update_self_or_manager"
ON public.message_participants
FOR UPDATE
USING (
  user_id = auth.uid()
  OR public.can_manage_message_participants(message_participants.thread_id)
)
WITH CHECK (
  user_id = auth.uid()
  OR public.can_manage_message_participants(message_participants.thread_id)
);

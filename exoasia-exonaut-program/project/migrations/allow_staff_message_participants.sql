-- Allow platform accounts, including admins and commanders, to be added to group chats.
-- Run after create_messages_tables.sql.

CREATE OR REPLACE FUNCTION public.can_add_message_participant(
  target_thread_id text,
  target_user_id uuid
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND target_user_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.user_profiles target_profile
      WHERE target_profile.id = target_user_id
        AND target_profile.role IN ('exonaut', 'lead', 'commander', 'admin')
    )
    AND EXISTS (
      SELECT 1
      FROM public.message_threads mt
      WHERE mt.id = target_thread_id
        AND (
          mt.created_by = auth.uid()
          OR public.is_message_participant(target_thread_id)
          OR public.has_any_role(ARRAY['admin', 'commander'])
          OR (
            mt.thread_type = 'track_group'
            AND EXISTS (
              SELECT 1
              FROM public.user_profiles actor_profile
              WHERE actor_profile.id = auth.uid()
                AND COALESCE(actor_profile.cohort_id, 'c2627') = COALESCE(mt.cohort_id, 'c2627')
                AND COALESCE(actor_profile.track_code, 'AIS') = COALESCE(mt.track_code, 'AIS')
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
  public.can_add_message_participant(
    message_participants.thread_id,
    message_participants.user_id
  )
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

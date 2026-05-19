-- Supabase-backed direct messages.
-- Run after migrations/create_user_profiles_roles.sql.

CREATE TABLE IF NOT EXISTS public.message_threads (
  id text PRIMARY KEY,
  title text NOT NULL DEFAULT '',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.message_participants (
  thread_id text NOT NULL REFERENCES public.message_threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (thread_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.messages (
  id text PRIMARY KEY,
  thread_id text NOT NULL REFERENCES public.message_threads(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  body text NOT NULL,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_message_threads_updated ON public.message_threads(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_participants_user ON public.message_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_thread_created ON public.messages(thread_id, created_at);

ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_message_participant(target_thread_id text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.message_participants mp
    WHERE mp.thread_id = target_thread_id
      AND mp.user_id = auth.uid()
  );
$$;

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
      AND mt.created_by = auth.uid()
  );
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'message_threads'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.message_threads;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'message_participants'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.message_participants;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'messages'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    END IF;
  END IF;
END;
$$;

DROP POLICY IF EXISTS "message_threads_select_participants" ON public.message_threads;
CREATE POLICY "message_threads_select_participants"
ON public.message_threads
FOR SELECT
USING (
  public.is_message_participant(message_threads.id)
);

DROP POLICY IF EXISTS "message_threads_insert_authenticated" ON public.message_threads;
CREATE POLICY "message_threads_insert_authenticated"
ON public.message_threads
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

DROP POLICY IF EXISTS "message_threads_update_participants" ON public.message_threads;
CREATE POLICY "message_threads_update_participants"
ON public.message_threads
FOR UPDATE
USING (
  public.is_message_participant(message_threads.id)
)
WITH CHECK (
  public.is_message_participant(message_threads.id)
);

DROP POLICY IF EXISTS "message_participants_select_own_threads" ON public.message_participants;
CREATE POLICY "message_participants_select_own_threads"
ON public.message_participants
FOR SELECT
USING (
  user_id = auth.uid()
  OR public.is_message_participant(message_participants.thread_id)
);

DROP POLICY IF EXISTS "message_participants_insert_authenticated" ON public.message_participants;
DROP POLICY IF EXISTS "message_participants_insert_thread_creator" ON public.message_participants;
CREATE POLICY "message_participants_insert_thread_creator"
ON public.message_participants
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND public.can_add_message_participant(message_participants.thread_id)
);

DROP POLICY IF EXISTS "message_participants_update_self" ON public.message_participants;
CREATE POLICY "message_participants_update_self"
ON public.message_participants
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "messages_select_participants" ON public.messages;
CREATE POLICY "messages_select_participants"
ON public.messages
FOR SELECT
USING (
  public.is_message_participant(messages.thread_id)
);

DROP POLICY IF EXISTS "messages_insert_participants" ON public.messages;
CREATE POLICY "messages_insert_participants"
ON public.messages
FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND public.is_message_participant(messages.thread_id)
);

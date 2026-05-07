-- Supabase-backed real-time notifications.
-- Run after migrations/create_user_profiles_roles.sql.

CREATE TABLE IF NOT EXISTS public.notifications (
  id text PRIMARY KEY,
  to_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  audience jsonb,
  type text NOT NULL DEFAULT 'system',
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT 'fa-bell',
  read boolean NOT NULL DEFAULT false,
  share jsonb,
  link_route text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_to_user ON public.notifications(to_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(to_user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_audience ON public.notifications USING gin(audience);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1
       FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'notifications'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END;
$$;

DROP POLICY IF EXISTS "notifications_select_authenticated" ON public.notifications;
CREATE POLICY "notifications_select_authenticated"
ON public.notifications
FOR SELECT
USING (
  to_user_id = auth.uid()
  OR to_user_id IS NULL
  OR public.has_any_role(ARRAY['lead', 'commander', 'admin'])
);

DROP POLICY IF EXISTS "notifications_insert_authenticated" ON public.notifications;
CREATE POLICY "notifications_insert_authenticated"
ON public.notifications
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "notifications_update_visible" ON public.notifications;
CREATE POLICY "notifications_update_visible"
ON public.notifications
FOR UPDATE
USING (
  to_user_id = auth.uid()
  OR public.has_any_role(ARRAY['lead', 'commander', 'admin'])
)
WITH CHECK (
  to_user_id = auth.uid()
  OR public.has_any_role(ARRAY['lead', 'commander', 'admin'])
);

DROP POLICY IF EXISTS "notifications_admin_delete" ON public.notifications;
CREATE POLICY "notifications_admin_delete"
ON public.notifications
FOR DELETE
USING (public.has_role('admin'));

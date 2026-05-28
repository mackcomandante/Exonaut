-- Supabase-backed removal / resignation workflow.
-- Run after migrations/create_user_profiles_roles.sql.

CREATE TABLE IF NOT EXISTS public.removal_requests (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  lead_id text,
  cohort_id text,
  source text NOT NULL DEFAULT 'lead'
    CHECK (source IN ('lead', 'exonaut')),
  reason text NOT NULL DEFAULT 'other',
  notes text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'endorsed', 'approved', 'denied', 'executed')),
  endorsed_by text,
  endorsed_at timestamptz,
  endorse_note text,
  reviewed_by text,
  reviewed_at timestamptz,
  review_note text,
  deny_note text,
  executed_by text,
  executed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_removal_requests_user ON public.removal_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_removal_requests_lead ON public.removal_requests(lead_id);
CREATE INDEX IF NOT EXISTS idx_removal_requests_status ON public.removal_requests(status);
CREATE INDEX IF NOT EXISTS idx_removal_requests_cohort ON public.removal_requests(cohort_id);

ALTER TABLE public.removal_requests ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_view_removal_request(target_user_id text, target_lead_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid()::text = target_user_id
    OR auth.uid()::text = target_lead_id
    OR public.has_any_role(ARRAY['commander', 'admin'])
$$;

CREATE OR REPLACE FUNCTION public.can_create_removal_request(
  target_user_id text,
  target_lead_id text,
  target_source text,
  target_status text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (
      target_source = 'exonaut'
      AND target_status = 'pending'
      AND auth.uid()::text = target_user_id
    )
    OR (
      target_source = 'lead'
      AND target_status = 'endorsed'
      AND auth.uid()::text = target_lead_id
    )
    OR public.has_any_role(ARRAY['commander', 'admin'])
$$;

CREATE OR REPLACE FUNCTION public.can_update_removal_request(target_user_id text, target_lead_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid()::text = target_lead_id
    OR public.has_any_role(ARRAY['commander', 'admin'])
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'removal_requests'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.removal_requests;
    END IF;
  END IF;
END;
$$;

DROP POLICY IF EXISTS "removal_requests_select_involved" ON public.removal_requests;
CREATE POLICY "removal_requests_select_involved"
ON public.removal_requests
FOR SELECT
USING (public.can_view_removal_request(user_id, lead_id));

DROP POLICY IF EXISTS "removal_requests_insert_allowed" ON public.removal_requests;
CREATE POLICY "removal_requests_insert_allowed"
ON public.removal_requests
FOR INSERT
WITH CHECK (public.can_create_removal_request(user_id, lead_id, source, status));

DROP POLICY IF EXISTS "removal_requests_update_allowed" ON public.removal_requests;
CREATE POLICY "removal_requests_update_allowed"
ON public.removal_requests
FOR UPDATE
USING (public.can_update_removal_request(user_id, lead_id))
WITH CHECK (public.can_update_removal_request(user_id, lead_id));

DROP POLICY IF EXISTS "removal_requests_delete_own_pending" ON public.removal_requests;
CREATE POLICY "removal_requests_delete_own_pending"
ON public.removal_requests
FOR DELETE
USING (
  source = 'exonaut'
  AND status = 'pending'
  AND user_id = auth.uid()::text
);

-- Weekly ritual logs and proof storage.
-- Run after:
--   migrations/create_user_profiles_roles.sql
--   migrations/create_work_system_tables.sql

CREATE TABLE IF NOT EXISTS public.ritual_logs (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cohort_id text NOT NULL DEFAULT 'c2627',
  ritual_id text NOT NULL,
  ritual_name text NOT NULL,
  week integer NOT NULL,
  points numeric NOT NULL DEFAULT 0,
  state text NOT NULL DEFAULT 'done' CHECK (state IN ('done')),
  proof jsonb NOT NULL DEFAULT '{}'::jsonb,
  logged_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, ritual_id, week)
);

CREATE INDEX IF NOT EXISTS idx_ritual_logs_user ON public.ritual_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ritual_logs_cohort_week ON public.ritual_logs(cohort_id, week);

ALTER TABLE public.ritual_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ritual_logs_select_own_or_staff" ON public.ritual_logs;
CREATE POLICY "ritual_logs_select_own_or_staff"
ON public.ritual_logs
FOR SELECT
USING (
  user_id = auth.uid()
  OR public.has_any_role(ARRAY['commander', 'admin'])
);

DROP POLICY IF EXISTS "ritual_logs_insert_own" ON public.ritual_logs;
CREATE POLICY "ritual_logs_insert_own"
ON public.ritual_logs
FOR INSERT
WITH CHECK (user_id = auth.uid());

INSERT INTO storage.buckets (id, name, public)
VALUES ('ritual-proofs', 'ritual-proofs', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "ritual_proofs_read_own_or_staff" ON storage.objects;
CREATE POLICY "ritual_proofs_read_own_or_staff"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'ritual-proofs'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_any_role(ARRAY['commander', 'admin'])
  )
);

DROP POLICY IF EXISTS "ritual_proofs_upload_own" ON storage.objects;
CREATE POLICY "ritual_proofs_upload_own"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'ritual-proofs'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Remove old local/progress-style ritual ledger rows unless they already have
-- a matching synced ritual log. New ritual points are awarded only when a
-- ritual_logs row is created.
DELETE FROM public.point_ledger pl
WHERE pl.source_type = 'ritual'
  AND NOT EXISTS (
    SELECT 1
    FROM public.ritual_logs rl
    WHERE rl.user_id = pl.user_id
      AND pl.source_id = ('w' || lpad(rl.week::text, 2, '0') || ':' || rl.ritual_id)
  );

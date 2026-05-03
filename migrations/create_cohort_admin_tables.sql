-- Cohort admin records for Platform Admin.
-- Run after migrations/create_user_profiles_roles.sql.

CREATE TABLE IF NOT EXISTS public.cohorts (
  id text PRIMARY KEY,
  name text NOT NULL,
  code text,
  status text NOT NULL DEFAULT 'upcoming'
    CHECK (status IN ('active', 'upcoming', 'alumni', 'archived')),
  start_date text,
  end_date text,
  color text NOT NULL DEFAULT '#C9E500',
  custom boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cohorts_status ON public.cohorts(status);

DROP TRIGGER IF EXISTS trg_cohorts_updated_at ON public.cohorts;
CREATE TRIGGER trg_cohorts_updated_at
BEFORE UPDATE ON public.cohorts
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.cohorts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cohorts_select_authenticated" ON public.cohorts;
CREATE POLICY "cohorts_select_authenticated"
ON public.cohorts
FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "cohorts_admin_all" ON public.cohorts;
CREATE POLICY "cohorts_admin_all"
ON public.cohorts
FOR ALL
USING (public.has_role('admin'))
WITH CHECK (public.has_role('admin'));

INSERT INTO public.cohorts (id, name, code, status, start_date, end_date, color, custom)
VALUES
  ('c2627', 'Batch 2026-2027', 'EXO-B-2627', 'active', 'OCT 06 2026', 'JAN 29 2027', '#C9E500', false),
  ('c2526', 'Batch 2025-2026', 'EXO-B-2526', 'alumni', 'OCT 07 2025', 'JAN 30 2026', '#B095C5', false),
  ('c2425', 'Batch 2024-2025', 'EXO-B-2425', 'alumni', 'OCT 08 2024', 'JAN 31 2025', '#B095C5', false)
ON CONFLICT (id) DO NOTHING;

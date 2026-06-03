-- Allow recruitment pipeline reviews to create point_ledger rows.
-- Safe to run on an existing database.

ALTER TABLE public.point_ledger DROP CONSTRAINT IF EXISTS point_ledger_source_type_check;
ALTER TABLE public.point_ledger
  ADD CONSTRAINT point_ledger_source_type_check
  CHECK (source_type IN ('mission', 'project', 'kudos', 'ritual', 'manual', 'badge', 'recruitment'));

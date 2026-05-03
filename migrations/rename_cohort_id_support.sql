-- Cohort ID rename support for Platform Admin.
-- Run after:
--   migrations/create_user_profiles_roles.sql
--   migrations/create_cohort_admin_tables.sql
--   migrations/create_work_system_tables.sql
--   migrations/create_program_ops_tables.sql
--   migrations/create_crown_rotation_tables.sql
--   migrations/create_kudos_tables.sql
--   migrations/create_ritual_logs_tables.sql

CREATE OR REPLACE FUNCTION public.rename_cohort_id(
  old_cohort_id text,
  new_cohort_id text,
  new_name text DEFAULT NULL,
  new_code text DEFAULT NULL,
  new_start_date text DEFAULT NULL,
  new_end_date text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role('admin') THEN
    RAISE EXCEPTION 'Only admins can rename cohort IDs';
  END IF;

  IF old_cohort_id IS NULL OR trim(old_cohort_id) = '' THEN
    RAISE EXCEPTION 'Old cohort ID is required';
  END IF;

  IF new_cohort_id IS NULL OR trim(new_cohort_id) = '' THEN
    RAISE EXCEPTION 'New cohort ID is required';
  END IF;

  old_cohort_id := trim(old_cohort_id);
  new_cohort_id := trim(new_cohort_id);

  IF old_cohort_id <> new_cohort_id
     AND EXISTS (SELECT 1 FROM public.cohorts WHERE id = new_cohort_id) THEN
    RAISE EXCEPTION 'Cohort ID % already exists', new_cohort_id;
  END IF;

  UPDATE public.cohorts
  SET
    id = new_cohort_id,
    name = COALESCE(NULLIF(new_name, ''), name),
    code = COALESCE(NULLIF(new_code, ''), code),
    start_date = COALESCE(NULLIF(new_start_date, ''), start_date),
    end_date = COALESCE(NULLIF(new_end_date, ''), end_date),
    updated_at = now()
  WHERE id = old_cohort_id;

  UPDATE public.user_profiles SET cohort_id = new_cohort_id WHERE cohort_id = old_cohort_id;
  UPDATE public.admin_user_cohort_assignments SET cohort_id = new_cohort_id, updated_at = now() WHERE cohort_id = old_cohort_id;
  UPDATE public.missions SET cohort_id = new_cohort_id WHERE cohort_id = old_cohort_id;
  UPDATE public.commander_escalations SET cohort_id = new_cohort_id WHERE cohort_id = old_cohort_id;
  UPDATE public.crown_assignments SET cohort_id = new_cohort_id WHERE cohort_id = old_cohort_id;
  UPDATE public.crown_transfer_requests SET cohort_id = new_cohort_id WHERE cohort_id = old_cohort_id;
  UPDATE public.point_ledger SET cohort_id = new_cohort_id WHERE cohort_id = old_cohort_id;
  UPDATE public.projects SET cohort_id = new_cohort_id WHERE cohort_id = old_cohort_id;
  UPDATE public.kudos SET cohort_id = new_cohort_id WHERE cohort_id = old_cohort_id;
  UPDATE public.ritual_logs SET cohort_id = new_cohort_id WHERE cohort_id = old_cohort_id;

  IF to_regclass('public.registered_users') IS NOT NULL THEN
    UPDATE public.registered_users SET cohort_id = new_cohort_id WHERE cohort_id = old_cohort_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rename_cohort_id(text, text, text, text, text, text) TO authenticated;

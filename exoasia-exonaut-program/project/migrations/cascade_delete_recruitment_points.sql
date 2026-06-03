-- Keep recruitment point_ledger rows tied to recruitment_referrals.
-- Run after create_recruitment_referrals.sql.

-- One-time cleanup: remove recruitment point rows whose referral no longer exists.
DELETE FROM public.point_ledger pl
WHERE pl.source_type = 'recruitment'
  AND NOT EXISTS (
    SELECT 1
    FROM public.recruitment_referrals rr
    WHERE rr.id = split_part(pl.source_id, ':', 1)
  );

CREATE OR REPLACE FUNCTION public.delete_recruitment_ledger_entries()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.point_ledger
  WHERE source_type = 'recruitment'
    AND (
      source_id LIKE OLD.id || ':%'
      OR id LIKE 'pts-recruit-' || OLD.id || '-%'
    );

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_delete_recruitment_points ON public.recruitment_referrals;
CREATE TRIGGER trg_delete_recruitment_points
AFTER DELETE ON public.recruitment_referrals
FOR EACH ROW EXECUTE FUNCTION public.delete_recruitment_ledger_entries();

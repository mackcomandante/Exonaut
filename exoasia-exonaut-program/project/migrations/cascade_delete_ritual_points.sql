-- When a ritual_log row is deleted, remove the matching point_ledger entry.
-- The ledger id is always 'pts-' || ritual_logs.id (e.g. pts-ritual-w01-mon-ign-<userId>).

CREATE OR REPLACE FUNCTION public.delete_ritual_ledger_entry()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM public.point_ledger WHERE id = 'pts-' || OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_delete_ritual_points ON public.ritual_logs;

CREATE TRIGGER trg_delete_ritual_points
AFTER DELETE ON public.ritual_logs
FOR EACH ROW EXECUTE FUNCTION public.delete_ritual_ledger_entry();

-- One-time cleanup: remove any point_ledger ritual entries with no matching ritual_log.
DELETE FROM public.point_ledger
WHERE source_type = 'ritual'
  AND NOT EXISTS (
    SELECT 1 FROM public.ritual_logs rl
    WHERE 'pts-' || rl.id = public.point_ledger.id
  );

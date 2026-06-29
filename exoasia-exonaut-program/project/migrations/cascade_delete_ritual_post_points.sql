-- When an auto-created ritual Thread post is deleted, delete the source
-- ritual_log too. The existing ritual_logs delete trigger then removes the
-- matching point_ledger entry, deducting the ritual points from totals.

CREATE OR REPLACE FUNCTION public.delete_ritual_log_for_community_post()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.source_type = 'ritual' AND OLD.source_id IS NOT NULL THEN
    DELETE FROM public.ritual_logs
    WHERE id = OLD.source_id;
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_delete_ritual_log_for_community_post ON public.community_posts;

CREATE TRIGGER trg_delete_ritual_log_for_community_post
AFTER DELETE ON public.community_posts
FOR EACH ROW
EXECUTE FUNCTION public.delete_ritual_log_for_community_post();

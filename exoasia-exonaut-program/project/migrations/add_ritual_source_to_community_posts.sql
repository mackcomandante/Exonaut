-- Link auto-created Thread posts back to their source ritual log.
-- Run after migrations/create_community_board_tables.sql.

ALTER TABLE public.community_posts
  ADD COLUMN IF NOT EXISTS source_type text,
  ADD COLUMN IF NOT EXISTS source_id text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_community_posts_source
ON public.community_posts(source_type, source_id)
WHERE source_type IS NOT NULL AND source_id IS NOT NULL;

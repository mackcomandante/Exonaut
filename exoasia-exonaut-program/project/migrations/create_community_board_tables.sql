-- Persistent Community message board with public feed, per-user likes,
-- threaded comments, mentions, and image/video uploads.
-- Run after create_user_profiles_roles.sql.

CREATE TABLE IF NOT EXISTS public.community_posts (
  id text PRIMARY KEY,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name text NOT NULL DEFAULT '',
  author_role text NOT NULL DEFAULT 'exonaut',
  channel text NOT NULL DEFAULT 'general',
  title text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  source_type text,
  source_id text,
  mention_ids uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.community_post_media (
  id text PRIMARY KEY,
  post_id text NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  media_type text NOT NULL CHECK (media_type IN ('image', 'video')),
  public_url text NOT NULL,
  storage_path text NOT NULL,
  file_name text NOT NULL DEFAULT '',
  mime_type text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.community_post_likes (
  post_id text NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.community_comments (
  id text PRIMARY KEY,
  post_id text NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  parent_comment_id text REFERENCES public.community_comments(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name text NOT NULL DEFAULT '',
  author_role text NOT NULL DEFAULT 'exonaut',
  body text NOT NULL CHECK (length(trim(body)) > 0),
  mention_ids uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_community_posts_created ON public.community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_channel ON public.community_posts(channel);
CREATE UNIQUE INDEX IF NOT EXISTS idx_community_posts_source
ON public.community_posts(source_type, source_id)
WHERE source_type IS NOT NULL AND source_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_community_media_post ON public.community_post_media(post_id);
CREATE INDEX IF NOT EXISTS idx_community_likes_post ON public.community_post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_community_comments_post ON public.community_comments(post_id, created_at);

DROP TRIGGER IF EXISTS trg_community_posts_updated_at ON public.community_posts;
CREATE TRIGGER trg_community_posts_updated_at
BEFORE UPDATE ON public.community_posts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_community_comments_updated_at ON public.community_comments;
CREATE TRIGGER trg_community_comments_updated_at
BEFORE UPDATE ON public.community_comments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_post_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "community_posts_read_authenticated" ON public.community_posts;
CREATE POLICY "community_posts_read_authenticated" ON public.community_posts
FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "community_posts_insert_own" ON public.community_posts;
CREATE POLICY "community_posts_insert_own" ON public.community_posts
FOR INSERT WITH CHECK (auth.uid() = author_id);
DROP POLICY IF EXISTS "community_posts_update_own" ON public.community_posts;
CREATE POLICY "community_posts_update_own" ON public.community_posts
FOR UPDATE USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);
DROP POLICY IF EXISTS "community_posts_delete_own" ON public.community_posts;
CREATE POLICY "community_posts_delete_own" ON public.community_posts
FOR DELETE USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "community_media_read_authenticated" ON public.community_post_media;
CREATE POLICY "community_media_read_authenticated" ON public.community_post_media
FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "community_media_insert_post_owner" ON public.community_post_media;
CREATE POLICY "community_media_insert_post_owner" ON public.community_post_media
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.community_posts p WHERE p.id = post_id AND p.author_id = auth.uid())
);
DROP POLICY IF EXISTS "community_media_delete_post_owner" ON public.community_post_media;
CREATE POLICY "community_media_delete_post_owner" ON public.community_post_media
FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.community_posts p WHERE p.id = post_id AND p.author_id = auth.uid())
);

DROP POLICY IF EXISTS "community_likes_read_authenticated" ON public.community_post_likes;
CREATE POLICY "community_likes_read_authenticated" ON public.community_post_likes
FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "community_likes_insert_own" ON public.community_post_likes;
CREATE POLICY "community_likes_insert_own" ON public.community_post_likes
FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "community_likes_delete_own" ON public.community_post_likes;
CREATE POLICY "community_likes_delete_own" ON public.community_post_likes
FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "community_comments_read_authenticated" ON public.community_comments;
CREATE POLICY "community_comments_read_authenticated" ON public.community_comments
FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "community_comments_insert_own" ON public.community_comments;
CREATE POLICY "community_comments_insert_own" ON public.community_comments
FOR INSERT WITH CHECK (auth.uid() = author_id);
DROP POLICY IF EXISTS "community_comments_update_own" ON public.community_comments;
CREATE POLICY "community_comments_update_own" ON public.community_comments
FOR UPDATE USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);
DROP POLICY IF EXISTS "community_comments_delete_own" ON public.community_comments;
CREATE POLICY "community_comments_delete_own" ON public.community_comments
FOR DELETE USING (auth.uid() = author_id);

INSERT INTO storage.buckets (id, name, public)
VALUES ('community-media', 'community-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "community_media_storage_public_read" ON storage.objects;
CREATE POLICY "community_media_storage_public_read" ON storage.objects
FOR SELECT USING (bucket_id = 'community-media');
DROP POLICY IF EXISTS "community_media_storage_upload_own" ON storage.objects;
CREATE POLICY "community_media_storage_upload_own" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'community-media' AND auth.uid()::text = (storage.foldername(name))[1]
);
DROP POLICY IF EXISTS "community_media_storage_delete_own" ON storage.objects;
CREATE POLICY "community_media_storage_delete_own" ON storage.objects
FOR DELETE USING (
  bucket_id = 'community-media' AND auth.uid()::text = (storage.foldername(name))[1]
);

DO $$
DECLARE board_table text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH board_table IN ARRAY ARRAY['community_posts', 'community_post_media', 'community_post_likes', 'community_comments']
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = board_table
      ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', board_table);
      END IF;
    END LOOP;
  END IF;
END;
$$;

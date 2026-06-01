-- Supabase-backed Launchpad resources with public thumbnail storage.
-- Run this manually in the Supabase SQL editor.

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.launchpad_links (
  id text PRIMARY KEY,
  title text NOT NULL CHECK (length(trim(title)) > 0),
  description text NOT NULL CHECK (length(trim(description)) > 0),
  url text NOT NULL CHECK (url ~* '^https?://'),
  label text NOT NULL DEFAULT '',
  thumbnail_url text NOT NULL DEFAULT '',
  project_id text NOT NULL DEFAULT '',
  project_title text NOT NULL DEFAULT '',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_launchpad_links_created
  ON public.launchpad_links(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_launchpad_links_project
  ON public.launchpad_links(project_id);
CREATE INDEX IF NOT EXISTS idx_launchpad_links_created_by
  ON public.launchpad_links(created_by);
CREATE UNIQUE INDEX IF NOT EXISTS idx_launchpad_links_project_unique
  ON public.launchpad_links(project_id)
  WHERE project_id <> '';

DROP TRIGGER IF EXISTS trg_launchpad_links_updated_at ON public.launchpad_links;
CREATE TRIGGER trg_launchpad_links_updated_at
BEFORE UPDATE ON public.launchpad_links
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.launchpad_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "launchpad_links_read_authenticated" ON public.launchpad_links;
CREATE POLICY "launchpad_links_read_authenticated" ON public.launchpad_links
FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "launchpad_links_insert_authenticated" ON public.launchpad_links;
CREATE POLICY "launchpad_links_insert_authenticated" ON public.launchpad_links
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND (created_by IS NULL OR created_by = auth.uid()));

DROP POLICY IF EXISTS "launchpad_links_update_owner_or_ops" ON public.launchpad_links;
CREATE POLICY "launchpad_links_update_owner_or_ops" ON public.launchpad_links
FOR UPDATE USING (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.role IN ('admin', 'commander')
  )
  OR EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = launchpad_links.project_id
      AND p.first_officer_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id = launchpad_links.project_id
      AND pm.user_id = auth.uid()
      AND pm.member_role = 'lead'
  )
) WITH CHECK (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.role IN ('admin', 'commander')
  )
  OR EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = launchpad_links.project_id
      AND p.first_officer_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id = launchpad_links.project_id
      AND pm.user_id = auth.uid()
      AND pm.member_role = 'lead'
  )
);

DROP POLICY IF EXISTS "launchpad_links_delete_owner_or_ops" ON public.launchpad_links;
CREATE POLICY "launchpad_links_delete_owner_or_ops" ON public.launchpad_links
FOR DELETE USING (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.role IN ('admin', 'commander')
  )
  OR EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = launchpad_links.project_id
      AND p.first_officer_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id = launchpad_links.project_id
      AND pm.user_id = auth.uid()
      AND pm.member_role = 'lead'
  )
);

INSERT INTO storage.buckets (id, name, public)
VALUES ('launchpad-thumbnails', 'launchpad-thumbnails', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "launchpad_thumbnails_read_authenticated" ON storage.objects;
CREATE POLICY "launchpad_thumbnails_read_authenticated" ON storage.objects
FOR SELECT USING (bucket_id = 'launchpad-thumbnails' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "launchpad_thumbnails_insert_own_folder" ON storage.objects;
CREATE POLICY "launchpad_thumbnails_insert_own_folder" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'launchpad-thumbnails'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "launchpad_thumbnails_update_own_folder" ON storage.objects;
CREATE POLICY "launchpad_thumbnails_update_own_folder" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'launchpad-thumbnails'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
) WITH CHECK (
  bucket_id = 'launchpad-thumbnails'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "launchpad_thumbnails_delete_own_or_ops" ON storage.objects;
CREATE POLICY "launchpad_thumbnails_delete_own_or_ops" ON storage.objects
FOR DELETE USING (
  bucket_id = 'launchpad-thumbnails'
  AND (
    (auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text)
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('admin', 'commander')
    )
  )
);

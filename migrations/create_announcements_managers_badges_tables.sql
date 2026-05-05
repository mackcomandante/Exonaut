-- Supabase-backed announcements, managers, and earned badges.
-- Run after migrations/create_user_profiles_roles.sql.

CREATE TABLE IF NOT EXISTS public.announcements (
  id text PRIMARY KEY,
  type text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  body text NOT NULL,
  author_name text NOT NULL,
  author_role text NOT NULL DEFAULT 'admin',
  audience jsonb NOT NULL DEFAULT '{"kind":"all"}'::jsonb,
  pinned boolean NOT NULL DEFAULT false,
  link text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON public.announcements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_author_role ON public.announcements(author_role);

CREATE TABLE IF NOT EXISTS public.announcement_reactions (
  id text PRIMARY KEY,
  announcement_id text NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_announcement_reactions_announcement ON public.announcement_reactions(announcement_id);

CREATE TABLE IF NOT EXISTS public.managers (
  id text PRIMARY KEY,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'manager',
  track_code text,
  email text,
  cohorts text[] NOT NULL DEFAULT ARRAY[]::text[],
  reports text[] NOT NULL DEFAULT ARRAY[]::text[],
  review_queue integer NOT NULL DEFAULT 0,
  avg_submit_rate integer NOT NULL DEFAULT 0,
  satisfaction numeric NOT NULL DEFAULT 0,
  custom boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_managers_track_code ON public.managers(track_code);
CREATE INDEX IF NOT EXISTS idx_managers_cohorts ON public.managers USING gin(cohorts);

CREATE TABLE IF NOT EXISTS public.user_badges (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_code text NOT NULL,
  badge_name text NOT NULL,
  category text NOT NULL,
  source text NOT NULL DEFAULT 'system',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  awarded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  earned_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, badge_code)
);

CREATE TABLE IF NOT EXISTS public.badge_catalog (
  code text PRIMARY KEY,
  name text NOT NULL,
  subtitle text,
  category text NOT NULL,
  color text,
  certificate boolean NOT NULL DEFAULT false,
  trigger_type text NOT NULL DEFAULT 'manual',
  threshold integer,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_badges_user ON public.user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_category ON public.user_badges(category);
CREATE INDEX IF NOT EXISTS idx_badge_catalog_category ON public.badge_catalog(category);

DROP TRIGGER IF EXISTS trg_announcements_updated_at ON public.announcements;
CREATE TRIGGER trg_announcements_updated_at
BEFORE UPDATE ON public.announcements
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_managers_updated_at ON public.managers;
CREATE TRIGGER trg_managers_updated_at
BEFORE UPDATE ON public.managers
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_badge_catalog_updated_at ON public.badge_catalog;
CREATE TRIGGER trg_badge_catalog_updated_at
BEFORE UPDATE ON public.badge_catalog
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badge_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "announcements_select_authenticated" ON public.announcements;
CREATE POLICY "announcements_select_authenticated"
ON public.announcements
FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "announcements_staff_insert" ON public.announcements;
CREATE POLICY "announcements_staff_insert"
ON public.announcements
FOR INSERT
WITH CHECK (public.has_any_role(ARRAY['lead', 'commander', 'admin']));

DROP POLICY IF EXISTS "announcements_staff_update_delete" ON public.announcements;
CREATE POLICY "announcements_staff_update_delete"
ON public.announcements
FOR ALL
USING (
  public.has_role('admin')
  OR created_by = auth.uid()
  OR public.has_any_role(ARRAY['commander'])
)
WITH CHECK (
  public.has_role('admin')
  OR created_by = auth.uid()
  OR public.has_any_role(ARRAY['commander'])
);

DROP POLICY IF EXISTS "announcement_reactions_select_authenticated" ON public.announcement_reactions;
CREATE POLICY "announcement_reactions_select_authenticated"
ON public.announcement_reactions
FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "announcement_reactions_insert_authenticated" ON public.announcement_reactions;
CREATE POLICY "announcement_reactions_insert_authenticated"
ON public.announcement_reactions
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "managers_select_authenticated" ON public.managers;
CREATE POLICY "managers_select_authenticated"
ON public.managers
FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "managers_admin_all" ON public.managers;
CREATE POLICY "managers_admin_all"
ON public.managers
FOR ALL
USING (public.has_role('admin'))
WITH CHECK (public.has_role('admin'));

DROP POLICY IF EXISTS "user_badges_select_self_or_staff" ON public.user_badges;
CREATE POLICY "user_badges_select_self_or_staff"
ON public.user_badges
FOR SELECT
USING (
  user_id = auth.uid()
  OR public.has_any_role(ARRAY['lead', 'commander', 'admin'])
);

DROP POLICY IF EXISTS "user_badges_insert_self_milestones_or_staff" ON public.user_badges;
CREATE POLICY "user_badges_insert_self_milestones_or_staff"
ON public.user_badges
FOR INSERT
WITH CHECK (
  public.has_any_role(ARRAY['lead', 'commander', 'admin'])
  OR (
    user_id = auth.uid()
    AND source = 'system'
    AND category = 'milestone'
  )
);

DROP POLICY IF EXISTS "user_badges_staff_update_delete" ON public.user_badges;
CREATE POLICY "user_badges_staff_update_delete"
ON public.user_badges
FOR ALL
USING (public.has_any_role(ARRAY['lead', 'commander', 'admin']))
WITH CHECK (public.has_any_role(ARRAY['lead', 'commander', 'admin']));

DROP POLICY IF EXISTS "badge_catalog_select_authenticated" ON public.badge_catalog;
CREATE POLICY "badge_catalog_select_authenticated"
ON public.badge_catalog
FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "badge_catalog_admin_all" ON public.badge_catalog;
CREATE POLICY "badge_catalog_admin_all"
ON public.badge_catalog
FOR ALL
USING (public.has_role('admin'))
WITH CHECK (public.has_role('admin'));

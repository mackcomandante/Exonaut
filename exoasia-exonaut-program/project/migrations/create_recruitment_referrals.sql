-- Recruitment referral pipeline.
-- Run in Supabase SQL editor after the existing migrations.

ALTER TABLE public.point_ledger DROP CONSTRAINT IF EXISTS point_ledger_source_type_check;
ALTER TABLE public.point_ledger
  ADD CONSTRAINT point_ledger_source_type_check
  CHECK (source_type IN ('mission', 'project', 'kudos', 'ritual', 'manual', 'badge', 'recruitment'));

CREATE TABLE IF NOT EXISTS public.recruitment_referrals (
  id                 text PRIMARY KEY,
  referrer_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  candidate_name     text NOT NULL,
  candidate_email    text,
  candidate_linkedin text,
  track_fit          text,
  relationship       text,
  reason             text NOT NULL DEFAULT '',
  status             text NOT NULL DEFAULT 'submitted'
    CHECK (status IN (
      'submitted',
      'under_review',
      'contacted',
      'interview_scheduled',
      'accepted',
      'joined_program',
      'rejected'
    )),
  admin_notes        text NOT NULL DEFAULT '',
  points_awarded     integer NOT NULL DEFAULT 0,
  reviewed_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at        timestamptz,
  metadata           jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recruitment_referrals_referrer
  ON public.recruitment_referrals(referrer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_recruitment_referrals_status
  ON public.recruitment_referrals(status, updated_at DESC);

ALTER TABLE public.recruitment_referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users create own recruitment referrals" ON public.recruitment_referrals;
CREATE POLICY "Users create own recruitment referrals"
  ON public.recruitment_referrals
  FOR INSERT
  WITH CHECK (auth.uid() = referrer_id);

DROP POLICY IF EXISTS "Users read own recruitment referrals" ON public.recruitment_referrals;
CREATE POLICY "Users read own recruitment referrals"
  ON public.recruitment_referrals
  FOR SELECT
  USING (
    auth.uid() = referrer_id
    OR EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('admin', 'commander')
    )
  );

DROP POLICY IF EXISTS "Admins manage recruitment referrals" ON public.recruitment_referrals;
CREATE POLICY "Admins manage recruitment referrals"
  ON public.recruitment_referrals
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('admin', 'commander')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('admin', 'commander')
    )
  );

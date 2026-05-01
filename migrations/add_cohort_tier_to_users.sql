-- Migration: add cohort_id and tier to registered_users
-- Run once in Supabase SQL Editor > New query

ALTER TABLE registered_users
  ADD COLUMN IF NOT EXISTS cohort_id TEXT NOT NULL DEFAULT 'c2627',
  ADD COLUMN IF NOT EXISTS tier      TEXT NOT NULL DEFAULT 'entry';

-- Backfill any existing rows
UPDATE registered_users SET cohort_id = 'c2627' WHERE cohort_id IS NULL;
UPDATE registered_users SET tier      = 'entry'  WHERE tier IS NULL;

-- Index for fast Admin queries by cohort
CREATE INDEX IF NOT EXISTS idx_reg_users_cohort ON registered_users (cohort_id);

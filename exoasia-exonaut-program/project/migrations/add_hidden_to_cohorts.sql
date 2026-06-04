-- Persist deleted seed cohorts across browsers/deployments.
-- Run after the cohorts table exists.

ALTER TABLE public.cohorts
  ADD COLUMN IF NOT EXISTS hidden boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_cohorts_visible
  ON public.cohorts (hidden, status);

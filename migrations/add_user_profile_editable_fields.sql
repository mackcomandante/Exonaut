-- Migration: editable profile fields for all platform users
-- Run after migrations/create_user_profiles_roles.sql.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS linkedin_url text,
  ADD COLUMN IF NOT EXISTS school text,
  ADD COLUMN IF NOT EXISTS expertise text,
  ADD COLUMN IF NOT EXISTS avatar_url text;

